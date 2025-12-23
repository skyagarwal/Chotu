import { Controller, Post, Body, Logger, HttpCode, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AgentOrchestratorService } from '../../agents/services/agent-orchestrator.service';
import { ConversationLoggerService } from '../../database/conversation-logger.service';
import { SessionService } from '../../session/session.service';
import { Platform } from '../../common/enums/platform.enum';
import { SmsService } from '../services/sms.service';

/**
 * SMS Webhook Controller
 *
 * Handles inbound SMS from:
 * - MSG91 (India) - POST /webhook/sms/msg91
 * - Twilio (Global) - POST /webhook/sms/twilio
 *
 * Routes messages through AgentOrchestratorService → FlowEngine
 * (Same architecture as WhatsApp, Telegram, and Web Chat)
 * 
 * SMS Limitations:
 * - No buttons (text only)
 * - 160 char limit per segment
 * - No rich media
 * - Reply delay acceptable (async)
 */
@Controller('webhook/sms')
export class SmsWebhookController {
  private readonly logger = new Logger(SmsWebhookController.name);

  constructor(
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly conversationLogger: ConversationLoggerService,
    private readonly sessionService: SessionService,
    private readonly smsService: SmsService,
  ) {
    this.logger.log('✅ SMS Webhook Controller initialized (Multi-Channel Architecture)');
  }

  @Get()
  @HttpCode(200)
  health() {
    return {
      status: 'ok',
      provider: this.smsService.getActiveProvider(),
      enabled: this.smsService.isEnabled(),
    };
  }

  /**
   * MSG91 Inbound SMS Webhook
   * Configure in MSG91 dashboard: https://control.msg91.com/
   */
  @Post('msg91')
  @HttpCode(200)
  async msg91Webhook(@Body() body: any): Promise<{ status: string }> {
    this.logger.log(`📥 MSG91 webhook received: ${JSON.stringify(body).substring(0, 200)}`);
    
    const parsed = this.smsService.parseMsg91Webhook(body);
    if (!parsed) {
      this.logger.warn('Invalid MSG91 webhook payload');
      return { status: 'ignored' };
    }

    return this.processInboundSms(parsed.from, parsed.message, 'msg91');
  }

  /**
   * Twilio Inbound SMS Webhook
   * Configure in Twilio console: https://console.twilio.com/
   */
  @Post('twilio')
  @HttpCode(200)
  async twilioWebhook(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`📥 Twilio webhook received from ${body.From}`);
    
    const parsed = this.smsService.parseTwilioWebhook(body);
    if (!parsed) {
      this.logger.warn('Invalid Twilio webhook payload');
      res.type('text/xml').send('<Response></Response>');
      return;
    }

    const result = await this.processInboundSms(parsed.from, parsed.message, 'twilio');
    
    // Twilio expects TwiML response for immediate reply
    // For async processing, we send empty response and reply separately
    res.type('text/xml').send('<Response></Response>');
  }

  /**
   * Generic SMS webhook (auto-detect provider)
   */
  @Post()
  @HttpCode(200)
  async genericWebhook(@Body() body: any): Promise<{ status: string }> {
    this.logger.log('📥 Generic SMS webhook received');
    
    // Try to detect provider from payload
    if (body.AccountSid || body.From?.startsWith('+')) {
      // Looks like Twilio
      const parsed = this.smsService.parseTwilioWebhook(body);
      if (parsed) {
        return this.processInboundSms(parsed.from, parsed.message, 'twilio');
      }
    }
    
    // Try MSG91 format
    const parsed = this.smsService.parseMsg91Webhook(body);
    if (parsed) {
      return this.processInboundSms(parsed.from, parsed.message, 'msg91');
    }
    
    this.logger.warn('Could not parse SMS webhook payload');
    return { status: 'ignored' };
  }

  /**
   * Process inbound SMS message
   */
  private async processInboundSms(
    from: string,
    message: string,
    provider: 'msg91' | 'twilio',
  ): Promise<{ status: string }> {
    try {
      const recipientId = from;
      this.logger.log(`💬 SMS from ${recipientId} via ${provider}: "${message}"`);

      // Set platform for outbound routing
      await this.sessionService.setData(recipientId, 'platform', Platform.SMS);
      await this.sessionService.setData(recipientId, 'sms_provider', provider);

      // Get session for user info
      const session = await this.sessionService.getSession(recipientId);
      const userId = session?.data?.user_id;

      // Log user message
      await this.conversationLogger.logUserMessage({
        phone: recipientId,
        userId,
        messageText: message,
        platform: 'sms',
        sessionId: recipientId,
      });

      // Handle common SMS commands
      const lowerMessage = message.toLowerCase().trim();
      if (lowerMessage === 'stop' || lowerMessage === 'unsubscribe') {
        await this.handleOptOut(recipientId);
        return { status: 'opt_out' };
      }
      if (lowerMessage === 'start' || lowerMessage === 'subscribe') {
        await this.handleOptIn(recipientId);
        return { status: 'opt_in' };
      }
      if (lowerMessage === 'help') {
        await this.handleHelp(recipientId);
        return { status: 'help' };
      }

      // Process through agent orchestrator
      this.logger.log(`🚀 Processing SMS through Agent Orchestrator`);
      const result = await this.agentOrchestratorService.processMessage(
        recipientId,
        message,
        'general' as any,
      );

      if (result?.response) {
        // Log bot response
        const flowContext = session?.data?.flowContext;
        await this.conversationLogger.logBotMessage({
          phone: recipientId,
          userId,
          messageText: result.response,
          platform: 'sms',
          sessionId: recipientId,
          flowId: flowContext?.flowId || 'unknown',
          stepId: flowContext?.currentState,
          agentId: 'flow-engine',
        });

        // Send reply via SMS
        await this.sendSmsReply(recipientId, result.response);
        this.logger.log(`📤 SMS response sent: ${result.response.substring(0, 50)}...`);
      }

      return { status: 'ok' };
    } catch (error: any) {
      this.logger.error(`SMS processing failed: ${error.message}`, error.stack);
      return { status: 'error' };
    }
  }

  /**
   * Send SMS reply
   */
  private async sendSmsReply(to: string, message: string): Promise<void> {
    // Split long messages into segments
    const maxLength = 160;
    const messages = this.splitMessage(message, maxLength);
    
    for (const msg of messages) {
      await this.smsService.sendSms({
        to,
        message: msg,
      });
      
      // Small delay between segments
      if (messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * Split long message into SMS segments
   */
  private splitMessage(message: string, maxLength: number): string[] {
    if (message.length <= maxLength) {
      return [message];
    }

    const segments: string[] = [];
    let remaining = message;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        segments.push(remaining);
        break;
      }

      // Find last space within limit
      let splitAt = remaining.lastIndexOf(' ', maxLength);
      if (splitAt === -1 || splitAt < maxLength / 2) {
        splitAt = maxLength;
      }

      segments.push(remaining.substring(0, splitAt).trim());
      remaining = remaining.substring(splitAt).trim();
    }

    return segments;
  }

  /**
   * Handle STOP/UNSUBSCRIBE command
   */
  private async handleOptOut(phone: string): Promise<void> {
    await this.sessionService.setData(phone, 'sms_opted_out', true);
    await this.smsService.sendSms({
      to: phone,
      message: 'You have been unsubscribed from Mangwale SMS. Reply START to re-subscribe.',
    });
    this.logger.log(`📴 ${phone} opted out of SMS`);
  }

  /**
   * Handle START/SUBSCRIBE command
   */
  private async handleOptIn(phone: string): Promise<void> {
    await this.sessionService.setData(phone, 'sms_opted_out', false);
    await this.smsService.sendSms({
      to: phone,
      message: 'Welcome back to Mangwale! You will now receive order updates. Reply STOP to unsubscribe.',
    });
    this.logger.log(`📱 ${phone} opted in to SMS`);
  }

  /**
   * Handle HELP command
   */
  private async handleHelp(phone: string): Promise<void> {
    await this.smsService.sendSms({
      to: phone,
      message: 'Mangwale Help:\n- TRACK <order_id> - Track order\n- STATUS - Check latest order\n- STOP - Unsubscribe\n- START - Subscribe\nOr visit mangwale.com',
    });
  }

  /**
   * Status/delivery report webhook (MSG91)
   */
  @Post('msg91/status')
  @HttpCode(200)
  async msg91Status(@Body() body: any): Promise<{ status: string }> {
    this.logger.log(`📊 MSG91 status report: ${JSON.stringify(body)}`);
    // Could update message status in database
    return { status: 'ok' };
  }

  /**
   * Status callback webhook (Twilio)
   */
  @Post('twilio/status')
  @HttpCode(200)
  async twilioStatus(@Body() body: any): Promise<{ status: string }> {
    this.logger.log(`📊 Twilio status: ${body.MessageSid} - ${body.MessageStatus}`);
    // Could update message status in database
    return { status: 'ok' };
  }
}
