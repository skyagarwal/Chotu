/**
 * Profiles Module
 * 
 * Manages enhanced profiles for stores, vendors, and riders
 * Syncs data from PHP backend and enriches with scraper data
 * 
 * NOTE: User profiles/preferences are handled by PersonalizationModule
 * to avoid duplication (user_profiles table, UserProfilingService)
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';

// Services
import { StoreSyncService } from './services/store-sync.service';
import { VendorProfileService } from './services/vendor-profile.service';
import { RiderProfileService } from './services/rider-profile.service';

// Controllers
import { ProfilesController } from './controllers/profiles.controller';

@Module({
  imports: [
    DatabaseModule,
    PhpIntegrationModule,
    HttpModule,
    ConfigModule,
  ],
  controllers: [
    ProfilesController,
  ],
  providers: [
    StoreSyncService,
    VendorProfileService,
    RiderProfileService,
  ],
  exports: [
    StoreSyncService,
    VendorProfileService,
    RiderProfileService,
  ],
})
export class ProfilesModule {}
