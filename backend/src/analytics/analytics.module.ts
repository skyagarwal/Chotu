import { Module } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';
import { ConversionFunnelService } from './services/conversion-funnel.service';
import { IntentAccuracyService } from './services/intent-accuracy.service';
import { ResponseTimeService } from './services/response-time.service';
import { AlertingService } from './services/alerting.service';
import { AnalyticsDashboardController } from './controllers/analytics-dashboard.controller';
import { TrendingController } from './controllers/trending.controller';
import { DatabaseModule } from '../database/database.module';

/**
 * Analytics Module
 * 
 * Provides real-time analytics and insights:
 * 
 * 1. Conversion Funnel - Track user journey through stages
 *    - Browse → Consider → Decide → Checkout → Purchase
 *    - Drop-off analysis at each stage
 *    - Psychology trigger effectiveness
 * 
 * 2. Intent Classification Accuracy
 *    - NLU model performance metrics
 *    - Confusion matrix by intent
 *    - Low-confidence message analysis
 * 
 * 3. Response Time Monitoring
 *    - End-to-end latency tracking
 *    - LLM provider performance
 *    - Search latency breakdown
 * 
 * 4. Business Metrics
 *    - Orders per day/hour
 *    - Revenue tracking
 *    - Popular items/categories
 *    - User engagement metrics
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    AnalyticsService,
    ConversionFunnelService,
    IntentAccuracyService,
    ResponseTimeService,
    AlertingService,
  ],
  controllers: [AnalyticsDashboardController, TrendingController],
  exports: [
    AnalyticsService,
    ConversionFunnelService,
    IntentAccuracyService,
    ResponseTimeService,
    AlertingService,
  ],
})
export class AnalyticsModule {}
