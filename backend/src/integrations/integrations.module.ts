/**
 * Integrations Module
 * 
 * OPTIONAL HTTP clients for external services.
 * Payment and Routing clients are marked optional for graceful degradation.
 * GooglePlacesService for external restaurant discovery and reviews.
 * 
 * NO ADMIN BACKEND - All services are local or optional
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentClient } from './payment.client';
import { RoutingClient } from './routing.client';
import { GooglePlacesService } from './google-places.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
  ],
  // Payment and Routing clients are optional - system works without them
  providers: [
    {
      provide: PaymentClient,
      useClass: PaymentClient,
    },
    {
      provide: RoutingClient,
      useClass: RoutingClient,
    },
    GooglePlacesService, // ✨ Google Places API integration
  ],
  exports: [PaymentClient, RoutingClient, GooglePlacesService],
})
export class IntegrationsModule {}
