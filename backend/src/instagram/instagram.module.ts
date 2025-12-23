import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InstagramWebhookController } from './controllers/instagram-webhook.controller';
import { InstagramService } from './services/instagram.service';
import { SessionModule } from '../session/session.module';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../database/database.module';

/**
 * InstagramModule - Multi-Channel Architecture
 * 
 * Routes Instagram DM messages through:
 * Instagram → InstagramWebhookController → AgentOrchestratorService → FlowEngine
 * 
 * Same architecture as WhatsApp, Telegram, and SMS for consistency.
 * 
 * Uses Meta Messenger API (Instagram Messaging API):
 * - Requires Facebook App with Instagram Messaging enabled
 * - Requires Instagram Business/Creator account linked to Facebook Page
 * 
 * Features:
 * - Receive DMs from Instagram users
 * - Send text, images, and quick replies
 * - Handle story mentions and reactions
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
  controllers: [InstagramWebhookController],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class InstagramModule {}
