import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SmsWebhookController } from './controllers/sms-webhook.controller';
import { SmsService } from './services/sms.service';
import { SessionModule } from '../session/session.module';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../database/database.module';

/**
 * SmsModule - Multi-Channel Architecture
 * 
 * Routes SMS messages through:
 * SMS → SmsWebhookController → AgentOrchestratorService → FlowEngine
 * 
 * Same architecture as WhatsApp, Telegram, and Web Chat for consistency.
 * 
 * Supported Providers:
 * - MSG91 (India) - Primary
 * - Twilio (Global) - Fallback
 * 
 * Features:
 * - Inbound SMS webhook handling
 * - Outbound SMS via notification system
 * - Reply tracking via session
 * - DLT compliance (India)
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
  ],
  controllers: [SmsWebhookController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
