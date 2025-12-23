import { Module } from '@nestjs/common';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { DatabaseModule } from '../database/database.module';

// 🎯 Database-driven gamification services
import { GamificationSettingsService } from './services/gamification-settings.service';
import { GameRewardService } from './services/game-reward.service';
import { ConversationLoggingService } from './services/conversation-logging.service';
import { TrainingSampleService } from './services/training-sample.service';

// 🎮 Game logic services
import { IntentQuestService } from './services/intent-quest.service';
import { LanguageMasterService } from './services/language-master.service';
import { ToneDetectiveService } from './services/tone-detective.service';
import { ProfileBuilderService } from './services/profile-builder.service';
import { GameSessionService } from './services/game-session.service';
import { GameOrchestratorService } from './services/game-orchestrator.service';

// 🎯 API Controllers
import { GamificationSettingsController } from './controllers/gamification-settings.controller';
import { TrainingSamplesController } from './controllers/training-samples.controller';
import { GamificationStatsController } from './controllers/gamification-stats.controller';
import { GameController } from './controllers/game.controller';
import { QuestionsController } from './controllers/questions.controller';

@Module({
  imports: [
    PhpIntegrationModule,
    DatabaseModule,
  ],
  controllers: [
    // 🎯 REST API endpoints for admin dashboard
    GamificationSettingsController,
    TrainingSamplesController,
    GamificationStatsController,
    QuestionsController,
    // 🎮 Game play endpoints
    GameController,
  ],
  providers: [
    // 🎯 Database-driven gamification services
    GamificationSettingsService,
    GameRewardService,
    ConversationLoggingService,
    TrainingSampleService,
    
    // 🎮 Game logic services
    IntentQuestService,
    LanguageMasterService,
    ToneDetectiveService,
    ProfileBuilderService,
    GameSessionService,
    GameOrchestratorService,
  ],
  exports: [
    // 🎯 Export database-driven services for use in other modules
    GamificationSettingsService,
    GameRewardService,
    ConversationLoggingService,
    TrainingSampleService,
    
    // 🎮 Export game services for conversation module
    IntentQuestService,
    LanguageMasterService,
    ToneDetectiveService,
    ProfileBuilderService,
    GameSessionService,
    GameOrchestratorService,
  ],
})
export class GamificationModule {}
