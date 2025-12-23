import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { DatabaseModule } from '../database/database.module';
import { SearchModule } from '../search/search.module';
import { NluModule } from '../nlu/nlu.module';
import { OrderOrchestratorService } from './services/order-orchestrator.service';
import { AddressService } from './services/address.service';
import { OrderHistoryService } from './services/order-history.service';
import { PaymentService } from './services/payment.service';
import { WalletService } from './services/wallet.service';
import { LoyaltyService } from './services/loyalty.service';
import { CouponService } from './services/coupon.service';
import { ReviewService } from './services/review.service';
import { SmartOrderService } from '../order/services/smart-order.service';
import { SmartRecommendationService } from '../order/services/smart-recommendation.service';
import { OrderLearningService } from '../order/services/order-learning.service';

@Module({
  imports: [
    PhpIntegrationModule, 
    HttpModule, 
    DatabaseModule, 
    SearchModule,
    forwardRef(() => NluModule), // For SmartRecommendationService
  ],
  providers: [
    OrderOrchestratorService,
    AddressService,
    OrderHistoryService,
    PaymentService,
    WalletService,
    LoyaltyService,
    CouponService,
    ReviewService,
    SmartOrderService,
    SmartRecommendationService,
    OrderLearningService,
  ],
  exports: [
    OrderOrchestratorService,
    AddressService,
    OrderHistoryService,
    PaymentService,
    WalletService,
    LoyaltyService,
    CouponService,
    ReviewService,
    SmartOrderService,
    SmartRecommendationService,
    OrderLearningService,
  ],
})
export class OrderFlowModule {}
