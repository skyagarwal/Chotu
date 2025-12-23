import { Controller, Get, Post, Body, Query, Logger, HttpCode, Param, Delete } from '@nestjs/common';
import { SessionService } from '../../session/session.service';
import { MessageService } from '../services/message.service';
import { AgentOrchestratorService } from '../../agents/services/agent-orchestrator.service';
import { ConversationLoggerService } from '../../database/conversation-logger.service';
import { ConfigService } from '@nestjs/config';
import { Platform } from '../../common/enums/platform.enum';
import { AsrService } from '../../asr/services/asr.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('webhook/whatsapp')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly verifyToken: string;
  private readonly accessToken: string;
  private readonly graphApiVersion: string = 'v18.0';

  constructor(
    private sessionService: SessionService,
    private messageService: MessageService,
    private agentOrchestratorService: AgentOrchestratorService,
    private conversationLogger: ConversationLoggerService,
    private configService: ConfigService,
    private asrService: AsrService,
    private httpService: HttpService,
  ) {
    this.verifyToken = this.configService.get('whatsapp.verifyToken');
    this.accessToken = this.configService.get('whatsapp.accessToken');
    this.logger.log('✅ Webhook Controller initialized (Multi-Channel Architecture with Voice Support)');
  }

  @Get('session/:phoneNumber')
  async getSession(@Param('phoneNumber') phoneNumber: string): Promise<any> {
    const session = await this.sessionService.getSession(phoneNumber);
    return session || { message: 'No session found' };
  }

  @Delete('session/:phoneNumber')
  async deleteSession(@Param('phoneNumber') phoneNumber: string): Promise<any> {
    await this.sessionService.deleteSession(phoneNumber);
    this.logger.log(`🗑️ Session deleted for ${phoneNumber}`);
    return { status: 'ok', message: 'Session deleted', phoneNumber };
  }

  @Get('messages/:phoneNumber')
  async getBotMessages(@Param('phoneNumber') phoneNumber: string): Promise<any> {
    const messages = await this.sessionService.getBotMessages(phoneNumber);
    return { phoneNumber, messages, count: messages.length };
  }

  @Get('sessions')
  async getAllSessions(): Promise<any> {
    const sessions = await this.sessionService.getAllSessions();
    return { total: sessions.length, sessions };
  }

  @Get()
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    this.logger.log(`🔐 Webhook verification: mode=${mode}`);

    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('✅ Webhook verified successfully');
      return challenge;
    }

    this.logger.warn('❌ Webhook verification failed');
    throw new Error('Forbidden');
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() payload: any): Promise<{ status: string }> {
    try {
      this.logger.debug('📨 Webhook received');
      this.logger.debug(`📋 Payload structure: ${JSON.stringify(payload, null, 2)}`);

      if (!payload.entry?.[0]?.changes?.[0]?.value) {
        this.logger.warn('Invalid webhook payload structure');
        return { status: 'ignored' };
      }

      const value = payload.entry[0].changes[0].value;
      this.logger.debug(`📋 Value: ${JSON.stringify(value, null, 2)}`);

      if (value.messages) {
        this.logger.log(`📩 Found ${value.messages.length} messages`);
        for (const message of value.messages) {
          await this.handleIncomingMessage(message);
        }
      } else {
        this.logger.warn('No messages found in webhook payload');
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return { status: 'error' };
    }
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      const messageId = message.id;
      const from = message.from;
      const type = message.type;

      this.logger.log(`📩 Message from ${from}: ${type}`);

      await this.messageService.markAsRead(messageId);

      let session = await this.sessionService.getSession(from);
      if (!session) {
        session = await this.sessionService.createSession(from);
      }

      // Set platform for this session to WhatsApp for channel-aware replies
      await this.sessionService.setData(from, 'platform', Platform.WHATSAPP);

      await this.routeMessage(from, type, message, session.currentStep);
    } catch (error) {
      this.logger.error(`Error handling message:`, error);
    }
  }

  private async routeMessage(from: string, type: string, message: any, currentStep: string): Promise<void> {
    try {
      let messageText = '';
      
      // Handle different message types
      if (type === 'audio') {
        // 🎤 VOICE MESSAGE - Transcribe using ASR
        this.logger.log(`🎤 Voice message from ${from} - transcribing...`);
        messageText = await this.handleVoiceMessage(message, from);
        if (!messageText) {
          await this.messageService.sendTextMessage(from, "🎤 Sorry, I couldn't understand your voice message. Please try again or type your message.");
          return;
        }
        this.logger.log(`🎤 Transcribed: "${messageText}"`);
      } else {
        // Extract text from other message types
        messageText = message.text?.body || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
      }
      
      this.logger.log(`💬 WhatsApp message from ${from}: "${messageText}"`);

      // Get session data for user info
      const session = await this.sessionService.getSession(from);
      const userId = session?.data?.user_id;
      
      // Log user message to PostgreSQL (for continuous learning)
      await this.conversationLogger.logUserMessage({
        phone: from,
        userId,
        messageText,
        platform: 'whatsapp',
        sessionId: from,
        // Voice messages are logged the same way - ASR transcription becomes the message
      });
      
      this.logger.log(`✅ User message logged to database`);

      // 🎯 MULTI-CHANNEL ARCHITECTURE: Route through Agent Orchestrator (same as web chat!)
      this.logger.log(`🚀 Processing WhatsApp message through Agent Orchestrator (module: general)`);
      const result = await this.agentOrchestratorService.processMessage(
        from,
        messageText,
        'general' as any // Use 'general' module for greeting/help flows
      );
      
      this.logger.log(`✅ Orchestrator result: ${result ? JSON.stringify({ hasResponse: !!result.response, length: result.response?.length }) : 'null'}`);

      // Send response back via WhatsApp
      if (result && result.response) {
        this.logger.log(`📤 Sending WhatsApp response: ${result.response.substring(0, 50)}...`);
        
        // Log bot response to PostgreSQL
        const flowContext = session?.data?.flowContext;
        await this.conversationLogger.logBotMessage({
          phone: from,
          userId,
          messageText: result.response,
          platform: 'whatsapp',
          sessionId: from,
          flowId: flowContext?.flowId || 'unknown',
          stepId: flowContext?.currentState,
          agentId: 'flow-engine',
        });

        await this.messageService.sendTextMessage(from, result.response);
      } else {
        this.logger.warn(`❌ No response from orchestrator`);
        await this.messageService.sendTextMessage(
          from,
          "👋 Hello! How can I help you today?",
        );
      }
    } catch (error) {
      this.logger.error(`Error routing message:`, error);
      await this.messageService.sendTextMessage(
        from,
        "❌ Something went wrong. Please try again.",
      );
    }
  }

  /**
   * Handle voice message from WhatsApp
   * Downloads audio from Meta API and transcribes using ASR
   */
  private async handleVoiceMessage(message: any, from: string): Promise<string> {
    try {
      const audioId = message.audio?.id;
      if (!audioId) {
        this.logger.warn(`No audio ID in voice message`);
        return '';
      }

      // 1. Get media URL from Meta API
      const mediaUrl = await this.getWhatsAppMediaUrl(audioId);
      if (!mediaUrl) {
        this.logger.error(`Failed to get media URL for audio: ${audioId}`);
        return '';
      }

      // 2. Download audio from Meta (requires auth header)
      const audioBuffer = await this.downloadWhatsAppMedia(mediaUrl);
      if (!audioBuffer) {
        this.logger.error(`Failed to download audio: ${audioId}`);
        return '';
      }

      // 3. Transcribe using ASR service
      const transcription = await this.asrService.transcribe({
        audioData: audioBuffer,
        language: 'auto', // Auto-detect Hindi or English
        provider: 'auto',
      });

      this.logger.log(`🎤 Transcription complete: "${transcription.text}" (confidence: ${transcription.confidence}, language: ${transcription.language})`);
      
      return transcription.text || '';
    } catch (error) {
      this.logger.error(`Voice message handling failed: ${error.message}`, error.stack);
      return '';
    }
  }

  /**
   * Get media URL from WhatsApp Media API
   */
  private async getWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://graph.facebook.com/${this.graphApiVersion}/${mediaId}`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          },
        ),
      );
      return response.data?.url || null;
    } catch (error) {
      this.logger.error(`Failed to get media URL: ${error.message}`);
      return null;
    }
  }

  /**
   * Download media from WhatsApp CDN (requires auth)
   */
  private async downloadWhatsAppMedia(url: string): Promise<Buffer | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          responseType: 'arraybuffer',
        }),
      );
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download media: ${error.message}`);
      return null;
    }
  }
}

