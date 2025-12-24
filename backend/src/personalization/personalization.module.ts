import { Module } from '@nestjs/common';
import { ConversationAnalyzerService } from './conversation-analyzer.service';
import { UserProfilingService } from './user-profiling.service';
import { UserPreferenceService } from './user-preference.service';
import { PreferenceExtractorService } from './preference-extractor.service';
import { ConversationEnrichmentService } from './conversation-enrichment.service';
import { UserProfileEnrichmentService } from './user-profile-enrichment.service';
import { AdaptiveFlowService } from './adaptive-flow.service';
import { SmartDefaultsService } from './smart-defaults.service';
import { PersonalizationController } from './personalization.controller';
import { LlmModule } from '../llm/llm.module';
import { DatabaseModule } from '../database/database.module';
import { UserContextModule } from '../user-context/user-context.module'; // 🧠 Order history & wallet context

/**
 * Personalization Module
 * 
 * Provides AI-powered user profiling and search personalization
 * by analyzing conversations to extract preferences, dietary restrictions,
 * tone, and personality traits.
 * 
 * Architecture:
 * 1. ConversationAnalyzerService → Extracts insights using LLM (Qwen 32B)
 * 2. UserProfilingService → Builds/updates user profiles in PostgreSQL
 * 3. UserPreferenceService → Provides preference context for agent prompts (Phase 4)
 * 4. PersonalizationController → Exposes APIs for Search API integration
 * 
 * Data Flow:
 * conversation_messages → analyze → user_profiles → opensearch boosts
 * user_profiles → preference context → agent prompts (Phase 4)
 */
@Module({
  imports: [
    LlmModule,
    DatabaseModule,
    UserContextModule, // 🧠 Order history & wallet context from MySQL
  ],
  controllers: [PersonalizationController],
  providers: [
    ConversationAnalyzerService,
    UserProfilingService,
    UserPreferenceService, // 🧠 Phase 4: User preference context for agents
    PreferenceExtractorService, // 🔍 Phase 4.1: Extract preferences from messages
    ConversationEnrichmentService, // 🎯 Phase 4.1: Orchestrate profile enrichment
    UserProfileEnrichmentService, // 📊 Sync MySQL order history to PostgreSQL profiles
    AdaptiveFlowService, // 🔄 Phase 3: Adaptive flow behavior
    SmartDefaultsService, // 🎯 Phase 3: Smart defaults from history
  ],
  exports: [
    ConversationAnalyzerService,
    UserProfilingService,
    UserPreferenceService, // 🧠 Phase 4: Export for ConversationService
    PreferenceExtractorService, // 🔍 Phase 4.1: Export for other services
    ConversationEnrichmentService, // 🎯 Phase 4.1: Export for ConversationService
    UserProfileEnrichmentService, // 📊 Export for auth service
    AdaptiveFlowService, // 🔄 Phase 3: Export for flow engine
    SmartDefaultsService, // 🎯 Phase 3: Export for flow engine
  ],
})
export class PersonalizationModule {}
