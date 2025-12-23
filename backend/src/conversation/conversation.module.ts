import { Module, forwardRef } from '@nestjs/common';
import { ConversationService } from './services/conversation.service';
import { AuthFlowBridgeService } from './services/auth-flow-bridge.service';
import { UserTypeRouterService } from './services/user-type-router.service';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { MessagingModule } from '../messaging/messaging.module';
import { OrderFlowModule } from '../order-flow/order-flow.module';
import { SessionModule } from '../session/session.module';
import { ParcelModule } from '../parcel/parcel.module';
import { NluClientService } from '../services/nlu-client.service';
import { ConversationCaptureService } from '../services/conversation-capture.service';
import { HttpModule } from '@nestjs/axios';
import { AgentsModule } from '../agents/agents.module';
import { NluModule } from '../nlu/nlu.module';
import { FlowEngineModule } from '../flow-engine/flow-engine.module';
// import { GamificationModule } from '../gamification/gamification.module'; // ARCHIVED
import { UserModule } from '../user/user.module';
import { TestController } from './controllers/test.controller';
import { VoiceConversationController } from './controllers/voice-conversation.controller';
import { PersonalizationModule } from '../personalization/personalization.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';

/**
 * ConversationModule - MANGWALE CONVERSATION PLATFORM (Core)
 * 
 * This is the channel-agnostic conversation engine that powers:
 * - WhatsApp conversations
 * - Telegram conversations (future)
 * - Web chat (future)
 * - Mobile app chat (future)
 * 
 * The conversation logic is completely independent of any specific channel.
 * Channels only need to:
 * 1. Receive messages from their platform
 * 2. Pass them to ConversationService.processMessage()
 * 3. ConversationService uses MessagingService to send responses (channel-agnostic)
 * 4. MessagingService routes to the correct channel implementation
 * 
 * PHASE 2: Auto-Training
 * - ConversationLoggerService automatically logs all conversations to Admin Backend
 * - AI learns from real customer interactions
 * - Low confidence predictions flagged for human review
 * 
 * PHASE 3: Agent System Integration
 * - AgentOrchestratorService provides LLM-powered agent responses
 * - Function calling for dynamic actions (search, refund, bookings, etc.)
 * - Multi-channel agent support (WhatsApp, Telegram, Web, Mobile, Voice)
 * 
 * PHASE 4: Conversational Auth & Personalization ⭐ NEW ⭐
 * - PersonalizationModule: User preference tracking & context injection
 * - AuthModule: Smart authentication detection & inline OTP
 * - Nashik personality + user preferences = hyper-personalized conversations
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    PhpIntegrationModule,
    MessagingModule,
    OrderFlowModule,
    SessionModule, // Session management for conversation state
    forwardRef(() => ParcelModule), // AI-Powered Parcel Delivery
    forwardRef(() => AgentsModule), // 🤖 Agent System - LLM-powered intelligent responses (forwardRef to prevent circular dependency)
    NluModule, // NLU services for intent classification with LLM fallback
    forwardRef(() => FlowEngineModule), // 🔄 Flow Engine for vendor/driver flows
    // GamificationModule, // 🎮 ARCHIVED - 82 TypeScript errors, needs Prisma schema fixes
    UserModule, // 👤 User Sync - Links PHP users to AI database
    PersonalizationModule, // 🧠 User Preferences - Personalized conversation context
    AuthModule, // 🔐 Smart Auth - Authentication triggers & inline OTP
    DatabaseModule, // 🗄️ Database services for conversation logging
  ],
  controllers: [
    TestController, // 🧪 Test endpoints for conversation flow testing
    VoiceConversationController, // 🎤 Voice API for Mercury integration
  ],
  providers: [
    ConversationService,
    NluClientService,
    ConversationCaptureService,
    AuthFlowBridgeService, // 🔄 Bridge for legacy auth → flow engine migration
    UserTypeRouterService, // 🚦 Routes users to vendor/driver/customer flows
  ],
  exports: [ConversationService, NluClientService, ConversationCaptureService, AuthFlowBridgeService, UserTypeRouterService],
})
export class ConversationModule {}
