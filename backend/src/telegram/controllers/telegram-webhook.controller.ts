import { Controller, Post, Body, Logger, HttpCode, Get } from '@nestjs/common';
import { AgentOrchestratorService } from '../../agents/services/agent-orchestrator.service';
import { ConversationLoggerService } from '../../database/conversation-logger.service';
import { SessionService } from '../../session/session.service';
import { Platform } from '../../common/enums/platform.enum';
import { AsrService } from '../../asr/services/asr.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Multi-Channel Telegram Webhook Controller
 *
 * Routes Telegram messages through AgentOrchestratorService → FlowEngine
 * (Same architecture as WhatsApp and Web Chat)
 * 
 * Voice Support:
 * Voice messages → Download from Telegram → ASR (Whisper) → Text → Same flow
 */
@Controller('webhook/telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);
  private readonly botToken: string;

  constructor(
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly conversationLogger: ConversationLoggerService,
    private readonly sessionService: SessionService,
    private readonly asrService: AsrService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN', '');
    this.logger.log('✅ Telegram Webhook Controller initialized (Multi-Channel Architecture with Voice Support)');
  }

  @Get()
  @HttpCode(200)
  health() {
    return { status: 'ok' };
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() update: any): Promise<{ status: string }> {
    try {
      // Telegram chat/user identifier used as session key
      const chatId = update?.message?.chat?.id
        || update?.callback_query?.message?.chat?.id
        || update?.edited_message?.chat?.id
        || update?.my_chat_member?.chat?.id;
      if (!chatId) {
        this.logger.warn('Telegram update without chat id');
        return { status: 'ignored' };
      }
      const recipientId = String(chatId);

      // Persist platform so outbound uses Telegram provider
      await this.sessionService.setData(recipientId, 'platform', Platform.TELEGRAM);

      // Handle different message types
      let messageText = '';
      let isVoice = false;

      // Check for voice message
      if (update?.message?.voice) {
        this.logger.log(`🎤 Voice message from ${recipientId} - transcribing...`);
        messageText = await this.handleVoiceMessage(update.message.voice);
        isVoice = true;
        if (!messageText) {
          // TODO: Send error message via Telegram provider
          this.logger.warn(`Failed to transcribe voice from ${recipientId}`);
          return { status: 'transcription_failed' };
        }
        this.logger.log(`🎤 Transcribed: "${messageText}"`);
      } else {
        // Extract text from regular messages
        messageText = update?.message?.text
          || update?.callback_query?.data
          || update?.edited_message?.text
          || '';
      }

      if (!messageText) {
        this.logger.warn(`Telegram update without text from ${recipientId}`);
        return { status: 'ignored' };
      }

      this.logger.log(`💬 Telegram message from ${recipientId}: "${messageText}"`);

      // Get session data for user info
      const session = await this.sessionService.getSession(recipientId);
      const userId = session?.data?.user_id;
      
      // Log user message to PostgreSQL (for continuous learning)
      await this.conversationLogger.logUserMessage({
        phone: recipientId,
        userId,
        messageText,
        platform: 'telegram',
        sessionId: recipientId,
        // Voice messages are logged the same way - ASR transcription becomes the message
      });

      // 🧑‍💼 HUMAN TAKEOVER CHECK
      // If escalated, log only (no bot response). Agent Orchestrator will handle the response.
      // But we still route through it so it can append to Issue if configured.
      const escalated = session?.data?.escalated_to_human === true;
      if (escalated) {
        this.logger.log(`⏸️ Telegram conversation ${recipientId} escalated - routing for logging only`);
      }

      // 🎯 MULTI-CHANNEL ARCHITECTURE: Route through Agent Orchestrator
      this.logger.log(`🚀 Processing Telegram message through Agent Orchestrator (module: general)`);
      const result = await this.agentOrchestratorService.processMessage(
        recipientId,
        messageText,
        'general' as any
      );

      this.logger.log(`✅ Orchestrator result: ${result ? 'response received' : 'no response'}`);

      // Log bot response to PostgreSQL
      if (result && result.response) {
        const flowContext = session?.data?.flowContext;
        await this.conversationLogger.logBotMessage({
          phone: recipientId,
          userId,
          messageText: result.response,
          platform: 'telegram',
          sessionId: recipientId,
          flowId: flowContext?.flowId || 'unknown',
          stepId: flowContext?.currentState,
          agentId: 'flow-engine',
        });

        // Note: Telegram response sending handled by MessagingService via platform enum
        this.logger.log(`📤 Telegram response sent: ${result.response.substring(0, 50)}...`);
      }

      return { status: 'ok' };
    } catch (err) {
      this.logger.error('Error processing Telegram webhook', err);
      return { status: 'error' };
    }
  }

  /**
   * Handle voice message from Telegram
   * Downloads audio from Telegram API and transcribes using ASR
   */
  private async handleVoiceMessage(voice: any): Promise<string> {
    try {
      if (!this.botToken) {
        this.logger.error('TELEGRAM_BOT_TOKEN not configured');
        return '';
      }

      const fileId = voice.file_id;
      if (!fileId) {
        this.logger.warn('No file_id in voice message');
        return '';
      }

      // 1. Get file path from Telegram API
      const fileResponse = await firstValueFrom(
        this.httpService.get(
          `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`
        )
      );

      const filePath = fileResponse.data?.result?.file_path;
      if (!filePath) {
        this.logger.error('Failed to get file path from Telegram');
        return '';
      }

      // 2. Download the audio file
      const audioResponse = await firstValueFrom(
        this.httpService.get(
          `https://api.telegram.org/file/bot${this.botToken}/${filePath}`,
          { responseType: 'arraybuffer' }
        )
      );

      const audioBuffer = Buffer.from(audioResponse.data);

      // 3. Transcribe using ASR service
      const transcription = await this.asrService.transcribe({
        audioData: audioBuffer,
        language: 'auto', // Auto-detect Hindi or English
        provider: 'auto',
      });

      this.logger.log(`🎤 Transcription complete: "${transcription.text}" (confidence: ${transcription.confidence})`);
      
      return transcription.text || '';
    } catch (error) {
      this.logger.error(`Voice message handling failed: ${error.message}`, error.stack);
      return '';
    }
  }
}
