import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookController } from './controllers/webhook.controller';
import { MessageService } from './services/message.service';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { MessagingModule } from '../messaging/messaging.module';
import { SessionModule } from '../session/session.module';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../database/database.module';
import { AsrModule } from '../asr/asr.module';

/**
 * WhatsAppModule - Multi-Channel Architecture
 * 
 * Routes WhatsApp messages through:
 * WhatsApp → WebhookController → AgentOrchestratorService → FlowEngine
 * 
 * Same architecture as Web Chat and Telegram for consistency.
 * 
 * Voice Support:
 * Audio messages → Download from Meta → ASR (Whisper) → Text → Same flow
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    PhpIntegrationModule,
    MessagingModule,
    SessionModule,
    AgentsModule,
    DatabaseModule,
    AsrModule, // For voice message transcription
  ],
  controllers: [WebhookController],
  providers: [MessageService],
  exports: [MessageService],
})
export class WhatsAppModule {}


