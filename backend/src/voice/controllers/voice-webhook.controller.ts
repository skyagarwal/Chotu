import { Controller, Post, Body, Get, Query, Logger, HttpCode, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { VoiceService } from '../services/voice.service';
import { AgentOrchestratorService } from '../../agents/services/agent-orchestrator.service';
import { ConversationLoggerService } from '../../database/conversation-logger.service';
import { SessionService } from '../../session/session.service';
import { Platform } from '../../common/enums/platform.enum';

/**
 * 📞 Voice IVR Webhook Controller
 * 
 * Handles inbound voice calls via Twilio/Exotel:
 * - Inbound call → Welcome message
 * - Speech input → ASR → AI → TTS → Response
 * - DTMF input → Menu navigation
 * 
 * Routes through AgentOrchestratorService → FlowEngine
 * (Same architecture as WhatsApp, Telegram, SMS)
 * 
 * Endpoints:
 * - POST /webhook/voice (Twilio inbound)
 * - POST /webhook/voice/process (Speech result)
 * - POST /webhook/voice/dtmf (DTMF input)
 * - POST /webhook/voice/exotel (Exotel inbound)
 */
@Controller('webhook/voice')
export class VoiceWebhookController {
  private readonly logger = new Logger(VoiceWebhookController.name);

  constructor(
    private readonly voiceService: VoiceService,
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly conversationLogger: ConversationLoggerService,
    private readonly sessionService: SessionService,
  ) {
    this.logger.log('✅ Voice IVR Webhook Controller initialized');
  }

  /**
   * Health check
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      enabled: this.voiceService.isEnabled(),
      providers: ['twilio', 'exotel'],
    };
  }

  /**
   * Twilio inbound call webhook
   * First webhook when call connects
   */
  @Post()
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async handleInboundCall(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`📞 Inbound call from ${body.From} to ${body.To}`);

    const parsed = this.voiceService.parseTwilioWebhook(body);
    if (!parsed) {
      this.logger.warn('Invalid Twilio webhook');
      res.send(this.voiceService.generateError().xml);
      return;
    }

    try {
      // Store call session
      await this.sessionService.setData(parsed.callSid, 'platform', Platform.VOICE);
      await this.sessionService.setData(parsed.callSid, 'caller', parsed.from);
      
      // Detect language
      const language = this.voiceService.detectLanguageFromPhone(parsed.from);
      await this.sessionService.setData(parsed.callSid, 'language', language);

      // Log call start
      await this.conversationLogger.logUserMessage({
        phone: parsed.from,
        messageText: '[Call Started]',
        platform: 'voice',
        sessionId: parsed.callSid,
      });

      // Generate welcome TwiML
      const response = this.voiceService.generateWelcome(language);
      res.send(response.xml);
    } catch (error: any) {
      this.logger.error(`Call handling failed: ${error.message}`);
      res.send(this.voiceService.generateError().xml);
    }
  }

  /**
   * Process speech input from Gather
   */
  @Post('process')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async processSpeech(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    const parsed = this.voiceService.parseTwilioWebhook(body);
    if (!parsed) {
      res.send(this.voiceService.generateError().xml);
      return;
    }

    // If already escalated to a human, end the IVR flow gracefully.
    try {
      const escalated = await this.sessionService.getData(parsed.callSid, 'escalated_to_human');
      if (escalated === true) {
        const language = (await this.sessionService.getData(parsed.callSid, 'language')) || 'en-IN';
        res.send(this.voiceService.generateSpeechResponse(
          'Your request has been escalated to our support team. A human agent will contact you shortly. Goodbye.',
          false,
          language,
        ).xml);
        return;
      }
    } catch {
      // Ignore and continue normal flow
    }

    this.logger.log(`🎤 Speech from ${parsed.from}: "${parsed.speechResult}"`);

    try {
      const speechText = parsed.speechResult?.trim();
      
      if (!speechText) {
        // No speech detected, ask again
        const language = await this.sessionService.getData(parsed.callSid, 'language') || 'en-IN';
        res.send(this.voiceService.generateSpeechResponse(
          "I didn't catch that. Could you please repeat?",
          true,
          language,
        ).xml);
        return;
      }

      // Check for goodbye/end phrases
      const lowerText = speechText.toLowerCase();
      if (
        lowerText.includes('bye') ||
        lowerText.includes('goodbye') ||
        lowerText.includes('end call') ||
        lowerText.includes('hangup') ||
        lowerText.includes('alvida') || // Hindi
        lowerText.includes('dhanyavaad') // Hindi thanks
      ) {
        const language = await this.sessionService.getData(parsed.callSid, 'language') || 'en-IN';
        res.send(this.voiceService.generateGoodbye(language).xml);
        return;
      }

      // Log user speech
      await this.conversationLogger.logUserMessage({
        phone: parsed.from,
        messageText: speechText,
        platform: 'voice',
        sessionId: parsed.callSid,
      });

      // Process through AI
      const result = await this.agentOrchestratorService.processMessage(
        parsed.callSid,
        speechText,
        'general' as any,
      );

      const language = await this.sessionService.getData(parsed.callSid, 'language') || 'en-IN';

      if (result?.response) {
        // Log bot response
        await this.conversationLogger.logBotMessage({
          phone: parsed.from,
          messageText: result.response,
          platform: 'voice',
          sessionId: parsed.callSid,
          agentId: 'flow-engine',
        });

        // Generate TwiML with response
        // For production, use TTS to generate audio
        res.send(this.voiceService.generateSpeechResponse(
          result.response,
          true, // Continue gathering
          language,
        ).xml);
      } else {
        res.send(this.voiceService.generateSpeechResponse(
          "I'm sorry, I couldn't process that. Could you try again?",
          true,
          language,
        ).xml);
      }
    } catch (error: any) {
      this.logger.error(`Speech processing failed: ${error.message}`);
      res.send(this.voiceService.generateError().xml);
    }
  }

  /**
   * Process DTMF input
   */
  @Post('dtmf')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async processDtmf(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    const parsed = this.voiceService.parseTwilioWebhook(body);
    if (!parsed) {
      res.send(this.voiceService.generateError().xml);
      return;
    }

    this.logger.log(`🔢 DTMF from ${parsed.from}: ${parsed.digits}`);

    try {
      const digits = parsed.digits;
      const language = await this.sessionService.getData(parsed.callSid, 'language') || 'en-IN';

      // Map DTMF to actions
      let response: string;
      switch (digits) {
        case '1':
          response = 'You selected food ordering. What would you like to order?';
          break;
        case '2':
          response = 'You selected order tracking. Please provide your order ID.';
          break;
        case '3':
          response = 'You selected customer support. How can I help you?';
          break;
        case '0':
          res.send(this.voiceService.generateGoodbye(language).xml);
          return;
        default:
          response = 'Invalid selection. Please try again.';
      }

      // Log DTMF action
      await this.conversationLogger.logUserMessage({
        phone: parsed.from,
        messageText: `[DTMF: ${digits}]`,
        platform: 'voice',
        sessionId: parsed.callSid,
      });

      res.send(this.voiceService.generateSpeechResponse(
        response,
        true,
        language,
      ).xml);
    } catch (error: any) {
      this.logger.error(`DTMF processing failed: ${error.message}`);
      res.send(this.voiceService.generateError().xml);
    }
  }

  /**
   * Call status callback
   */
  @Post('status')
  @HttpCode(200)
  async handleStatus(@Body() body: any): Promise<{ status: string }> {
    const parsed = this.voiceService.parseTwilioWebhook(body);
    if (!parsed) {
      return { status: 'ignored' };
    }

    this.logger.log(`📊 Call ${parsed.callSid} status: ${parsed.callStatus}`);

    if (parsed.callStatus === 'completed') {
      // Log call end
      await this.conversationLogger.logBotMessage({
        phone: parsed.from,
        messageText: '[Call Ended]',
        platform: 'voice',
        sessionId: parsed.callSid,
        agentId: 'system',
      });
    }

    return { status: 'ok' };
  }

  /**
   * Exotel inbound call (India)
   */
  @Post('exotel')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async handleExotelCall(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`📞 Exotel call: ${JSON.stringify(body)}`);

    const parsed = this.voiceService.parseExotelWebhook(body);
    if (!parsed) {
      res.send('<Response><Say>Invalid request</Say></Response>');
      return;
    }

    try {
      // Store session
      await this.sessionService.setData(parsed.callSid, 'platform', Platform.VOICE);
      await this.sessionService.setData(parsed.callSid, 'caller', parsed.from);
      await this.sessionService.setData(parsed.callSid, 'language', 'hi-IN');

      // Generate welcome
      const response = this.voiceService.generateWelcome('hi-IN');
      res.send(response.xml);
    } catch (error: any) {
      this.logger.error(`Exotel call failed: ${error.message}`);
      res.send(this.voiceService.generateError('hi-IN').xml);
    }
  }

  /**
   * Recording callback
   */
  @Post('recording')
  @HttpCode(200)
  async handleRecording(@Body() body: any): Promise<{ status: string }> {
    this.logger.log(`🎙️ Recording received: ${body.RecordingUrl}`);

    const parsed = this.voiceService.parseTwilioWebhook(body);
    if (!parsed || !parsed.recordingUrl) {
      return { status: 'ignored' };
    }

    try {
      // Transcribe recording using ASR
      const language = await this.sessionService.getData(parsed.callSid, 'language') || 'hi';
      const langCode = language.split('-')[0]; // hi-IN → hi

      const transcription = await this.voiceService.transcribeAudio(
        parsed.recordingUrl,
        langCode,
      );

      if (transcription?.text) {
        this.logger.log(`📝 Transcription: ${transcription.text}`);
        
        // Could process the transcription through AI here
        // For async processing
      }

      return { status: 'ok' };
    } catch (error: any) {
      this.logger.error(`Recording processing failed: ${error.message}`);
      return { status: 'error' };
    }
  }
}
