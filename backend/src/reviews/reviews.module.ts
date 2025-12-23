/**
 * Reviews Module
 * 
 * Handles review intelligence and analysis:
 * - AI-powered review sentiment analysis
 * - Aspect extraction (quantity, taste, spiciness)
 * - Google NL API integration
 * - Store review enrichment (Google matching)
 * - Chotu warning generation
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ReviewIntelligenceService } from './services/review-intelligence.service';
import { ReviewSyncService } from './services/review-sync.service';
import { StoreReviewEnrichmentService } from './services/store-review-enrichment.service';
import { DatabaseModule } from '../database/database.module';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    PhpIntegrationModule,
  ],
  providers: [
    ReviewIntelligenceService,
    ReviewSyncService,
    StoreReviewEnrichmentService,
  ],
  exports: [
    ReviewIntelligenceService,
    ReviewSyncService,
    StoreReviewEnrichmentService,
  ],
})
export class ReviewsModule {}
