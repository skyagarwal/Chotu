import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OSRMService } from './services/osrm.service';
import { RoutingConfigController } from './controllers/routing-config.controller';
import { RoutingController } from './routing.controller';
import { StoresModule } from '../stores/stores.module'; // Import StoresModule for schedule integration

/**
 * Routing Module
 * 
 * Handles distance calculation, routing, and delivery time estimation
 * using OSRM (Open Source Routing Machine)
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ConfigModule,
    StoresModule, // Import for store schedule access
  ],
  controllers: [RoutingConfigController, RoutingController],
  providers: [OSRMService],
  exports: [OSRMService],
})
export class RoutingModule {}
