/**
 * Learning Module
 * 
 * Handles self-learning capabilities:
 * - Mistake tracking and pattern detection
 * - Training data generation
 * - Model performance monitoring
 * - Confidence-based auto-approval
 * - Label Studio integration
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MistakeTrackerService } from './services/mistake-tracker.service';
import { SelfLearningService } from './services/self-learning.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    MistakeTrackerService,
    SelfLearningService,
  ],
  exports: [
    MistakeTrackerService,
    SelfLearningService,
  ],
})
export class LearningModule {}
