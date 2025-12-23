import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ZoneService } from './services/zone.service';
import { ZonesController } from './zones.controller';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';

/**
 * Zones Module
 * Handles zone detection, validation, and store/item filtering based on delivery zones
 */
@Module({
  imports: [HttpModule, ConfigModule, PhpIntegrationModule],
  controllers: [ZonesController],
  providers: [ZoneService],
  exports: [ZoneService],
})
export class ZonesModule {}
