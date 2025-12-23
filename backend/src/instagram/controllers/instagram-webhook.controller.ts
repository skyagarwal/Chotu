import { Controller, Post, Body, Get, Query, Logger, HttpCode, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { InstagramService } from '../services/instagram.service';
import { AgentOrchestratorService } from '../../agents/services/agent-orchestrator.service';
import { ConversationLoggerService } from '../../database/conversation-logger.service';
import { SessionService } from '../../session/session.service';
import { Platform } from '../../common/enums/platform.enum';

/**
 * 📸 Instagram DM Webhook Controller
 * 
 * Handles incoming messages from Instagram via Meta Messenger Platform:
 * - Webhook verification (GET)
 * - Message events (POST)
 * - Quick reply callbacks
 * - Story mentions
 * 
 * Routes messages through AgentOrchestratorService → FlowEngine
 * (Same architecture as WhatsApp, Telegram, and SMS)
 * 
 * Setup:
 * 1. Create Facebook App at developers.facebook.com
 * 2. Add Instagram Messaging product
 * 3. Link Instagram Business/Creator account
 * 4. Configure webhook URL: https://api.mangwale.com/webhook/instagram
 * 5. Subscribe to messages, messaging_postbacks events
 */
@Controller('webhook/instagram')
export class InstagramWebhookController {
  private readonly logger = new Logger(InstagramWebhookController.name);
  private readonly verifyToken: string;

  constructor(
    private readonly instagramService: InstagramService,
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly conversationLogger: ConversationLoggerService,
    private readonly sessionService: SessionService,
  ) {
    this.verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || 'mangwale_instagram_verify_token';
    this.logger.log('✅ Instagram Webhook Controller initialized (Multi-Channel Architecture)');
  }

  /**
   * Webhook verification endpoint
   * Facebook calls this to verify webhook ownership
   */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log(`📝 Instagram webhook verification: mode=${mode}`);

    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('✅ Instagram webhook verified successfully');
      return parseInt(challenge);
    }

    this.logger.warn('❌ Instagram webhook verification failed');
    return 'Verification failed';
  }

  /**
   * Webhook event handler
   * Receives all messaging events from Instagram
   */
  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<string> {
    this.logger.log(`📥 Instagram webhook received: ${JSON.stringify(body).substring(0, 200)}`);

    // Verify signature (optional but recommended)
    if (signature && req.rawBody) {
      const isValid = this.instagramService.verifySignature(
        req.rawBody.toString(),
        signature,
      );
      if (!isValid) {
        this.logger.warn('❌ Invalid Instagram webhook signature');
        return 'EVENT_RECEIVED';
      }
    }

    // Acknowledge immediately (Instagram expects fast response)
    this.processWebhookAsync(body);
    return 'EVENT_RECEIVED';
  }

  /**
   * Process webhook asynchronously to avoid timeout
   */
  private async processWebhookAsync(body: any): Promise<void> {
    try {
      // Check if this is an Instagram event
      if (body.object !== 'instagram') {
        return;
      }

      const parsed = this.instagramService.parseWebhookEvent(body);
      if (!parsed) {
        this.logger.warn('Could not parse Instagram webhook event');
        return;
      }

      // Skip echo messages
      if (parsed.isEcho) {
        return;
      }

      const senderId = parsed.senderId;

      // Mark as seen
      await this.instagramService.markSeen(senderId);

      // Handle text message
      if (parsed.messageText) {
        await this.handleTextMessage(senderId, parsed.messageText);
        return;
      }

      // Handle quick reply
      if (parsed.quickReplyPayload) {
        await this.handleQuickReply(senderId, parsed.quickReplyPayload);
        return;
      }

      // Handle attachments (images, etc.)
      if (parsed.attachments && parsed.attachments.length > 0) {
        await this.handleAttachment(senderId, parsed.attachments[0]);
        return;
      }

      // Handle story mention
      if (parsed.storyMention) {
        await this.handleStoryMention(senderId, parsed.storyMention);
        return;
      }

      this.logger.log(`Unknown Instagram event from ${senderId}`);
    } catch (error: any) {
      this.logger.error(`Instagram webhook processing failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle text message from Instagram DM
   */
  private async handleTextMessage(senderId: string, messageText: string): Promise<void> {
    this.logger.log(`💬 Instagram DM from ${senderId}: "${messageText}"`);

    // Set platform for routing
    await this.sessionService.setData(senderId, 'platform', Platform.INSTAGRAM);

    // Get session for user info
    const session = await this.sessionService.getSession(senderId);
    const userId = session?.data?.user_id;

    // Log user message
    await this.conversationLogger.logUserMessage({
      phone: senderId,
      userId,
      messageText,
      platform: 'instagram',
      sessionId: senderId,
    });

    // Show typing indicator
    await this.instagramService.sendTypingIndicator(senderId, true);

    try {
      // Process through agent orchestrator
      this.logger.log(`🚀 Processing Instagram DM through Agent Orchestrator`);
      const result = await this.agentOrchestratorService.processMessage(
        senderId,
        messageText,
        'general' as any,
      );

      // Stop typing indicator
      await this.instagramService.sendTypingIndicator(senderId, false);

      if (result?.response) {
        // Log bot response
        const flowContext = session?.data?.flowContext;
        await this.conversationLogger.logBotMessage({
          phone: senderId,
          userId,
          messageText: result.response,
          platform: 'instagram',
          sessionId: senderId,
          flowId: flowContext?.flowId || 'unknown',
          stepId: flowContext?.currentState,
          agentId: 'flow-engine',
        });

        // Send response via Instagram
        await this.sendResponse(senderId, result);
        this.logger.log(`📤 Instagram response sent: ${result.response.substring(0, 50)}...`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process Instagram message: ${error.message}`);
      await this.instagramService.sendTypingIndicator(senderId, false);
      await this.instagramService.sendTextMessage({
        recipientId: senderId,
        message: 'Sorry, something went wrong. Please try again.',
      });
    }
  }

  /**
   * Handle quick reply button press
   */
  private async handleQuickReply(senderId: string, payload: string): Promise<void> {
    this.logger.log(`🔘 Instagram quick reply from ${senderId}: ${payload}`);

    // Treat quick reply payload as message text
    await this.handleTextMessage(senderId, payload);
  }

  /**
   * Handle image/media attachment
   */
  private async handleAttachment(
    senderId: string,
    attachment: { type: string; url: string },
  ): Promise<void> {
    this.logger.log(`📎 Instagram attachment from ${senderId}: ${attachment.type}`);

    if (attachment.type === 'image') {
      // Could process image with Vision AI
      await this.instagramService.sendTextMessage({
        recipientId: senderId,
        message: 'Thanks for the image! What would you like to know about it?',
        quickReplies: [
          { title: 'Find similar', payload: 'find_similar_products' },
          { title: 'Get info', payload: 'analyze_image' },
        ],
      });
    } else {
      await this.instagramService.sendTextMessage({
        recipientId: senderId,
        message: `I received your ${attachment.type}. How can I help you?`,
      });
    }
  }

  /**
   * Handle story mention
   */
  private async handleStoryMention(senderId: string, storyUrl: string): Promise<void> {
    this.logger.log(`📖 Story mention from ${senderId}`);

    await this.instagramService.sendTextMessage({
      recipientId: senderId,
      message: 'Thanks for mentioning us in your story! 🙏 How can we help you today?',
      quickReplies: [
        { title: 'Browse menu', payload: 'browse_menu' },
        { title: 'Track order', payload: 'track_order' },
        { title: 'Contact support', payload: 'contact_support' },
      ],
    });
  }

  /**
   * Send response based on agent result
   */
  private async sendResponse(
    recipientId: string,
    result: { response: string; buttons?: any[]; cards?: any[] },
  ): Promise<void> {
    // If there are cards, send first card
    if (result.cards && result.cards.length > 0) {
      const card = result.cards[0];
      await this.instagramService.sendCard(recipientId, {
        title: card.title || card.name,
        subtitle: card.description || card.subtitle,
        imageUrl: card.image || card.imageUrl,
        buttons: card.buttons?.map((b: any) => ({
          title: b.title || b.text,
          url: b.url,
          payload: b.payload || b.id,
        })),
      });

      // Send remaining cards as separate messages (Instagram limitation)
      for (let i = 1; i < Math.min(result.cards.length, 3); i++) {
        const nextCard = result.cards[i];
        await this.instagramService.sendCard(recipientId, {
          title: nextCard.title || nextCard.name,
          subtitle: nextCard.description,
          imageUrl: nextCard.image,
        });
      }
      return;
    }

    // If there are buttons, send as quick replies
    if (result.buttons && result.buttons.length > 0) {
      await this.instagramService.sendTextMessage({
        recipientId,
        message: result.response,
        quickReplies: result.buttons.slice(0, 13).map((b: any) => ({ // Max 13 quick replies
          title: (b.title || b.text).substring(0, 20),
          payload: b.payload || b.id || b.title,
        })),
      });
      return;
    }

    // Plain text message
    // Split long messages (Instagram has character limits)
    const messages = this.splitMessage(result.response, 1000);
    for (const msg of messages) {
      await this.instagramService.sendTextMessage({
        recipientId,
        message: msg,
      });
    }
  }

  /**
   * Split long message into chunks
   */
  private splitMessage(message: string, maxLength: number): string[] {
    if (message.length <= maxLength) {
      return [message];
    }

    const chunks: string[] = [];
    let remaining = message;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      let splitAt = remaining.lastIndexOf('\n', maxLength);
      if (splitAt === -1 || splitAt < maxLength / 2) {
        splitAt = remaining.lastIndexOf(' ', maxLength);
      }
      if (splitAt === -1 || splitAt < maxLength / 2) {
        splitAt = maxLength;
      }

      chunks.push(remaining.substring(0, splitAt).trim());
      remaining = remaining.substring(splitAt).trim();
    }

    return chunks;
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      enabled: this.instagramService.isEnabled(),
      provider: 'meta-messenger-api',
    };
  }
}
