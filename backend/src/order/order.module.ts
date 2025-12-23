/**
 * Order Module
 * 
 * Handles order intelligence:
 * - Complex order parsing (group orders, budget constraints)
 * - Group order optimization
 * - Smart recommendations
 * - Order learning from patterns
 */

import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ComplexOrderParserService } from './services/complex-order-parser.service';
import { GroupOrderSearchService } from './services/group-order-search.service';
import { SmartOrderService } from './services/smart-order.service';
import { SmartRecommendationService } from './services/smart-recommendation.service';
import { OrderLearningService } from './services/order-learning.service';
import { DatabaseModule } from '../database/database.module';
import { SearchModule } from '../search/search.module';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { NluModule } from '../nlu/nlu.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ConfigModule,
    DatabaseModule,
    SearchModule,
    PhpIntegrationModule,
    forwardRef(() => NluModule),
  ],
  providers: [
    ComplexOrderParserService,
    GroupOrderSearchService,
    SmartOrderService,
    SmartRecommendationService,
    OrderLearningService,
  ],
  exports: [
    ComplexOrderParserService,
    GroupOrderSearchService,
    SmartOrderService,
    SmartRecommendationService,
    OrderLearningService,
  ],
})
export class OrderModule {}
