import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { NluController } from './controllers/nlu.controller';
import { IntentsController } from './controllers/intents.controller';
import { NluService } from './services/nlu.service';
import { IntentsService } from './services/intents.service';
import { IntentClassifierService } from './services/intent-classifier.service';
import { IntentManagerService } from './services/intent-manager.service';
import { EntityExtractorService } from './services/entity-extractor.service';
import { ToneAnalyzerService } from './services/tone-analyzer.service';
import { IndicBERTService } from './services/indicbert.service';
import { LlmIntentExtractorService } from './services/llm-intent-extractor.service';
import { NluTrainingDataService } from './services/nlu-training-data.service';
import { ConversationCaptureService } from '../services/conversation-capture.service';
import { LlmModule } from '../llm/llm.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ScheduleModule.forRoot(), // For cron job in IntentManagerService
    LlmModule,
    DatabaseModule,
  ],
  controllers: [NluController, IntentsController],
  providers: [
    NluService,
    IntentsService,
    IntentManagerService, // Database-driven intent manager
    IndicBERTService,
    IntentClassifierService,
    EntityExtractorService,
    ToneAnalyzerService,
    LlmIntentExtractorService,
    NluTrainingDataService,
    ConversationCaptureService,
  ],
  exports: [
    NluService, 
    IndicBERTService, 
    LlmIntentExtractorService, // Export for NluClientService
    NluTrainingDataService, // Export for training data capture
    IntentManagerService, // Export for external intent management
  ],
})
export class NluModule {}
