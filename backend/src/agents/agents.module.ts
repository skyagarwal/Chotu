import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SessionModule } from '../session/session.module';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { AuthModule } from '../auth/auth.module'; // ✨ Auth trigger for transaction intents
import { ZonesModule } from '../zones/zones.module'; // ✨ Zone detection for function executor
import { IntegrationsModule } from '../integrations/integrations.module'; // ✨ Optional integration clients + GooglePlaces
import { OrchestratorModule } from '../orchestrator/orchestrator.module'; // ✨ SearchOrchestrator for OpenSearch/PHP routing
import { ConversationModule } from '../conversation/conversation.module'; // ✨ For ChatWebController integration
import { LearningModule } from '../learning/learning.module'; // ✨ Self-learning mistake tracker
import { ReviewsModule } from '../reviews/reviews.module'; // ✨ Review intelligence
import { PricingModule } from '../pricing/pricing.module'; // ✨ Value proposition
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { AgentRegistryService } from './services/agent-registry.service';
import { IntentRouterService } from './services/intent-router.service';
import { FunctionExecutorService } from './services/function-executor.service';
import { QueryParserService } from './services/query-parser.service';
import { FlowTestController } from './controllers/flow-test.controller';
import { ChatWebController } from './controllers/chat-web.controller';
import { VoiceController } from './controllers/voice.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { AgentsController } from './controllers/agents.controller';
import { NluClientService } from '../services/nlu-client.service';
import { AddressExtractionService } from './services/address-extraction.service';
import { AgentHandoffService } from './services/agent-handoff.service';
import { ConversationLoggerService } from '../database/conversation-logger.service';
import { NluModule } from '../nlu/nlu.module';
import { LlmModule } from '../llm/llm.module'; // ✨ Uses local vLLM service
import { SearchModule } from '../search/search.module';
import { FlowEngineModule } from '../flow-engine/flow-engine.module';
import { DatabaseModule } from '../database/database.module';
import { GamificationModule } from '../gamification/gamification.module'; // ✨ Gamification integration
import { PersonalizationModule } from '../personalization/personalization.module'; // ✨ Personalization integration
import { UserModule } from '../user/user.module'; // ✨ User sync service
import { SettingsModule } from '../settings/settings.module';
import { VoiceCharactersModule } from '../voice-characters/voice-characters.module'; // ✨ Voice character personas for chatbot // ✨ Settings service
// Import agent implementations
import { FAQAgent } from './agents/faq.agent';
import { SearchAgent } from './agents/search.agent';
import { OrderAgent } from './agents/order.agent';
import { ComplaintsAgent } from './agents/complaints.agent';
import { BookingAgent } from './agents/booking.agent';
import { AgentsService } from './services/agents.service';
import { EnhancedAgentToolsService } from './services/enhanced-agent-tools.service'; // ✨ Enhanced tools

/**
 * Agents Module
 * 
 * Provides intelligent agent system with:
 * - Flow management integration
 * - Intent classification and routing
 * - LLM-powered conversation handling (local vLLM)
 * - Function calling capabilities
 * - Web chat interface (via ConversationService)
 * - Voice transcription and synthesis (ASR/TTS proxy)
 * - Address extraction from multiple formats (Google Maps, coordinates, text, LLM)
 * - PostgreSQL conversation logging for training & analytics
 * - SearchOrchestrator for OpenSearch/PHP routing
 * 
 * NO ADMIN BACKEND - All services are local!
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5, // Increased for Google Maps short link resolution
    }),
    SessionModule,
    PhpIntegrationModule,
    AuthModule, // ✨ Auth trigger for transaction intents
    ZonesModule, // ✨ Zone detection for search functions
    IntegrationsModule, // ✨ Optional Payment & Routing clients
    OrchestratorModule, // ✨ SearchOrchestrator for intelligent routing
    forwardRef(() => ConversationModule), // ✨ For ChatWebController - use forwardRef to avoid circular dependency
    NluModule, // ✨ Local IndicBERT NLU
    LlmModule, // ✨ Local vLLM service
    SearchModule, // ✨ Search for product queries
    forwardRef(() => FlowEngineModule), // ✨ Modern State Machine Flow Engine (use forwardRef to avoid circular dependency)
    DatabaseModule, // ✨ For AgentsService to access Prisma
    GamificationModule, // ✨ Gamification integration
    PersonalizationModule, // ✨ Personalization integration
    UserModule, // ✨ User sync service
    SettingsModule, // ✨ Settings service
    VoiceCharactersModule, // ✨ Voice character personas for Mercury TTS
    LearningModule, // ✨ Self-learning mistake tracker
    ReviewsModule, // ✨ Review intelligence
    PricingModule, // ✨ Value proposition
  ],
  controllers: [
    FlowTestController,
    ChatWebController,
    VoiceController,
    AnalyticsController, // ✨ Conversation analytics & training data export
    AgentsController, // ✨ REST API for agent management
  ],
  providers: [
    AgentOrchestratorService,
    AgentRegistryService,
    IntentRouterService,
    QueryParserService,
    NluClientService,
    AddressExtractionService,
    FunctionExecutorService, // ✨ Re-enabled with proper dependencies
    ConversationLoggerService, // ✨ PostgreSQL conversation logging
    AgentsService, // ✨ Agent statistics and management
    AgentHandoffService, // ✨ Agent-to-agent handoff mechanism
    EnhancedAgentToolsService, // ✨ Google Places, Reviews, Self-learning tools
    // Agent implementations
    FAQAgent,
    SearchAgent,
    OrderAgent,
    ComplaintsAgent,
    BookingAgent,
  ],
  exports: [
    AgentOrchestratorService,
    AgentRegistryService,
    IntentRouterService,
    ConversationLoggerService, // ✨ Export for use in ChatGateway
    AddressExtractionService, // ✨ Export for use in FlowEngine
    AgentHandoffService, // ✨ Export for agent handoff capability
    EnhancedAgentToolsService, // ✨ Export enhanced tools
  ],
})
export class AgentsModule {}
