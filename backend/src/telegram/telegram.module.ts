import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SessionModule } from '../session/session.module';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../database/database.module';
import { AsrModule } from '../asr/asr.module';
import { TelegramWebhookController } from './controllers/telegram-webhook.controller';

/**
 * TelegramModule - Multi-Channel Architecture
 * 
 * Routes Telegram messages through:
 * Telegram → TelegramWebhookController → AgentOrchestratorService → FlowEngine
 * 
 * Same architecture as WhatsApp and Web Chat for consistency.
 * 
 * Voice Support:
 * Voice messages → Download from Telegram → ASR (Whisper) → Text → Same flow
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    SessionModule, 
    AgentsModule, 
    DatabaseModule,
    AsrModule, // For voice message transcription
  ],
  controllers: [TelegramWebhookController],
})
export class TelegramModule {}
