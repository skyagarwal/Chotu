import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { PhpIntegrationModule } from './php-integration/php-integration.module';
import { MessagingModule } from './messaging/messaging.module';
import { OrderFlowModule } from './order-flow/order-flow.module';
import { ConversationModule } from './conversation/conversation.module';
import { ParcelModule } from './parcel/parcel.module';
import { TelegramModule } from './telegram/telegram.module';
import { TestingModule } from './testing/testing.module';
import { AgentsModule } from './agents/agents.module';
import { ZonesModule } from './zones/zones.module'; // Zone-based Delivery Management
import { RoutingModule } from './routing/routing.module'; // OSRM Distance Calculation
import { StoresModule } from './stores/stores.module'; // Store Schedules & Hours
import { IntegrationsModule } from './integrations/integrations.module'; // ✨ Admin Backend Integration Clients
import { NluModule } from './nlu/nlu.module'; // ✨ NLU Intent Classification & Entity Extraction
import { AsrModule } from './asr/asr.module'; // ✨ ASR Speech-to-Text
import { TtsModule } from './tts/tts.module'; // ✨ TTS Text-to-Speech
import { LlmModule } from './llm/llm.module'; // ✨ LLM Orchestration
import { SearchModule } from './search/search.module'; // ✨ Semantic & Keyword Search
// import { VisionModule } from './vision/vision.module'; // ✨ Image AI & Vision (DISABLED - onnxruntime issues)
import { FlowManagementModule } from './flow-management/flow-management.module'; // ✨ Visual Flow Builder
import { TrainingModule } from './training/training.module'; // ✨ ML Training & Label Studio
import { GamificationModule } from './gamification/gamification.module'; // ✨ 🤖 SELF-LEARNING GAMIFICATION (Database-driven)
import { PersonalizationModule } from './personalization/personalization.module'; // ✨ AI-Powered User Profiling & Search Personalization
import { FlowEngineModule } from './flow-engine/flow-engine.module'; // ✨ Modern State Machine Flow Engine
import { ChatModule } from './chat/chat.module'; // ✨ WebSocket Gateway for Real-time Chat
import { StatsModule } from './stats/stats.module'; // ✨ Dashboard Statistics & Analytics
import { VoiceCharactersModule } from './voice-characters/voice-characters.module'; // ✨ Voice Characters & TTS Presets
import { ModelsModule } from './models/models.module'; // ✨ AI Models Registry & Management
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { MonitoringModule } from './monitoring/monitoring.module'; // ✨ System Monitoring & Metrics
import { AnalyticsModule } from './analytics/analytics.module'; // ✨ Analytics & Trending
import { CommonModule } from './common/common.module'; // ✨ Common utilities & Audit Logs
import { UserContextModule } from './user-context/user-context.module'; // ✨ Smart User Context for Personalization
import { LearningModule } from './learning/learning.module'; // ✨ Self-Learning & Mistake Tracking
import { ReviewsModule } from './reviews/reviews.module'; // ✨ Review Intelligence
import { PricingModule } from './pricing/pricing.module'; // ✨ Value Proposition
import { ContextModule } from './context/context.module'; // ✨ User Context (Weather, Preferences, City Knowledge)
import { OrderModule } from './order/order.module'; // ✨ Complex Order Parsing & Group Orders
import { ProfilesModule } from './profiles/profiles.module'; // ✨ Enhanced Profiles (Stores, Vendors, Riders, Users)
import { VoiceModule } from './voice/voice.module'; // ✨ Voice IVR Channel (Twilio/Exotel)

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // 🛡️ Rate Limiting - Prevent abuse
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 second
        limit: 3,     // 3 requests per second per IP
      },
      {
        name: 'medium',
        ttl: 10000,   // 10 seconds
        limit: 20,    // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,   // 1 minute
        limit: 100,   // 100 requests per minute
      },
    ]),

    // Database
    DatabaseModule,

    // HTTP Client
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Core modules (channel-agnostic)
    MessagingModule,
    OrderFlowModule,
    PhpIntegrationModule,
    IntegrationsModule, // ✨ Admin Backend Integration Clients (Payment, Routing)
    ZonesModule, // ✨ Zone Detection & Filtering
    RoutingModule, // ✨ Distance & Delivery Time Calculation
    StoresModule, // ✨ Store Schedules & Opening Hours
    ConversationModule, // MANGWALE CONVERSATION PLATFORM (Core)
    ParcelModule, // AI-Powered Parcel Delivery
    AgentsModule, // ✨ LLM-powered Agent System
    NluModule, // ✨ NLU Intent Classification & Entity Extraction
    AsrModule, // ✨ ASR Speech-to-Text
    TtsModule, // ✨ TTS Text-to-Speech
    LlmModule, // ✨ LLM Orchestration (vLLM + Cloud)
    SearchModule, // ✨ Semantic & Keyword Search
    // VisionModule, // ✨ Image AI & Vision (PPE, Faces, Objects) - DISABLED
    FlowManagementModule, // ✨ Visual Flow Builder & Execution
    TrainingModule, // ✨ ML Training Pipeline & Label Studio
    GamificationModule, // ✨ 🤖 SELF-LEARNING GAMIFICATION (Database-driven)
    PersonalizationModule, // ✨ AI-Powered User Profiling & Search Personalization
    FlowEngineModule, // ✨ Modern State Machine Flow Engine (PROD)
    ChatModule, // ✨ WebSocket Gateway for Real-time Web Chat
    StatsModule, // ✨ Dashboard Statistics & Analytics
    ModelsModule, // ✨ AI Models Registry & Management
    HealthModule, // ✨ Health Checks
    VoiceCharactersModule, // Voice Characters
    SettingsModule, // ✨ System Settings & Connection Tests
    MonitoringModule, // ✨ System Monitoring & Metrics
    AnalyticsModule, // ✨ Analytics & Trending
    CommonModule, // ✨ Common utilities & Audit Logs
    UserContextModule, // ✨ Smart User Context for Personalization
    LearningModule, // ✨ Self-Learning & Mistake Tracking
    ReviewsModule, // ✨ Review Intelligence
    PricingModule, // ✨ Value Proposition
    ContextModule, // ✨ User Context (Weather, Preferences, City Knowledge)
    OrderModule, // ✨ Complex Order Parsing & Group Orders
    ProfilesModule, // ✨ Enhanced Profiles (Stores, Vendors, Riders, Users)
    VoiceModule, // ✨ Voice IVR Channel (Twilio/Exotel)

    // Channel implementation modules
    WhatsAppModule, // WhatsApp channel
    TelegramModule, // Telegram channel (inbound minimal)
    // WebChatModule, // Future: Web chat channel
    TestingModule, // Lightweight chat endpoints for testing AI flows
  ],
  providers: [
    // 🛡️ Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}


