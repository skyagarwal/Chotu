import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationModule } from '../conversation/conversation.module';
import { SessionModule } from '../session/session.module';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { FlowEngineModule } from '../flow-engine/flow-engine.module';
import { ModuleRef } from '@nestjs/core';
import { Logger } from '@nestjs/common';

/**
 * Chat Module
 * 
 * Provides WebSocket gateway for real-time web chat
 * Integrates with ConversationService for full AI processing
 * 
 * CRITICAL: ChatGateway must be explicitly instantiated via onModuleInit
 * because NestJS doesn't auto-load gateways unless they're injected
 */
@Module({
  imports: [
    DatabaseModule, // ✅ Required for ConversationLoggerService
    SessionModule,
    forwardRef(() => ConversationModule),
    AgentsModule, // No circular dependency, remove forwardRef
    AuthModule, // ✅ Required for CentralizedAuthService
    forwardRef(() => FlowEngineModule), // ✨ For flow-based location handling
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule implements OnModuleInit {
  private readonly logger = new Logger(ChatModule.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    // ✅ Force instantiation of ChatGateway
    this.logger.log('🔥 ChatModule initializing - forcing ChatGateway instantiation...');
    const gateway = this.moduleRef.get(ChatGateway, { strict: false });
    this.logger.log(`✅ ChatGateway instance retrieved: ${!!gateway}`);
  }
}
