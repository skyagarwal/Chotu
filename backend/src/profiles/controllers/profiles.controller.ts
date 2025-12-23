/**
 * Profiles Controller
 * 
 * REST API endpoints for store, vendor, and rider profile management
 * 
 * NOTE: User profile endpoints are in PersonalizationModule
 * to avoid duplication with existing user_profiles system
 */

import { Controller, Get, Post, Put, Param, Query, Body, Logger } from '@nestjs/common';
import { StoreSyncService } from '../services/store-sync.service';
import { VendorProfileService } from '../services/vendor-profile.service';
import { RiderProfileService } from '../services/rider-profile.service';

@Controller('profiles')
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(
    private readonly storeSyncService: StoreSyncService,
    private readonly vendorProfileService: VendorProfileService,
    private readonly riderProfileService: RiderProfileService,
  ) {}

  // ==================== STORE ENDPOINTS ====================

  /**
   * Sync a store from PHP to PostgreSQL
   */
  @Post('stores/sync/:phpStoreId')
  async syncStore(@Param('phpStoreId') phpStoreId: string) {
    const store = await this.storeSyncService.syncStoreFromPhp(parseInt(phpStoreId));
    return { success: !!store, store };
  }

  /**
   * Get store profile with competitor data
   */
  @Get('stores/:phpStoreId')
  async getStoreProfile(@Param('phpStoreId') phpStoreId: string) {
    const profile = await this.storeSyncService.getEnrichedStoreProfile(parseInt(phpStoreId));
    return { success: !!profile, profile };
  }

  /**
   * Get store price comparison
   */
  @Get('stores/:phpStoreId/prices')
  async getStorePrices(@Param('phpStoreId') phpStoreId: string) {
    const comparison = await this.storeSyncService.getPriceComparison(parseInt(phpStoreId));
    return { success: true, comparison };
  }

  /**
   * Queue store for scraping
   */
  @Post('stores/:phpStoreId/scrape')
  async queueForScraping(
    @Param('phpStoreId') phpStoreId: string,
    @Body('priority') priority: 'normal' | 'high' = 'normal'
  ) {
    const queued = await this.storeSyncService.queueForScraping(
      parseInt(phpStoreId),
      priority
    );
    return { success: queued };
  }

  /**
   * Match store by FSSAI/GST
   */
  @Get('stores/match')
  async matchStore(
    @Query('fssai') fssaiNumber?: string,
    @Query('gst') gstNumber?: string
  ) {
    const store = await this.storeSyncService.matchStoreByIdentifiers(fssaiNumber, gstNumber);
    return { success: !!store, store };
  }

  /**
   * Batch sync stores
   */
  @Post('stores/batch-sync')
  async batchSyncStores(@Body('phpStoreIds') phpStoreIds: number[]) {
    const stores = await this.storeSyncService.syncStoresFromPhp(phpStoreIds);
    return { 
      success: true, 
      synced: stores.length,
      total: phpStoreIds.length,
      stores 
    };
  }

  // ==================== VENDOR ENDPOINTS ====================

  /**
   * Sync vendor profile from PHP
   */
  @Post('vendors/sync/:phpVendorId')
  async syncVendor(@Param('phpVendorId') phpVendorId: string) {
    const vendor = await this.vendorProfileService.syncVendorFromPhp(parseInt(phpVendorId));
    return { success: !!vendor, vendor };
  }

  /**
   * Get vendor profile
   */
  @Get('vendors/:phpVendorId')
  async getVendorProfile(@Param('phpVendorId') phpVendorId: string) {
    const profile = await this.vendorProfileService.getVendorByPhpId(parseInt(phpVendorId));
    return { success: !!profile, profile };
  }

  /**
   * Get vendor by phone
   */
  @Get('vendors/by-phone/:phone')
  async getVendorByPhone(@Param('phone') phone: string) {
    const profile = await this.vendorProfileService.getVendorByPhone(phone);
    return { success: !!profile, profile };
  }

  /**
   * Get vendors for a store
   */
  @Get('stores/:phpStoreId/vendors')
  async getStoreVendors(@Param('phpStoreId') phpStoreId: string) {
    const vendors = await this.vendorProfileService.getVendorsByStore(parseInt(phpStoreId));
    return { success: true, vendors };
  }

  /**
   * Get vendor performance
   */
  @Get('vendors/:phpVendorId/performance')
  async getVendorPerformance(@Param('phpVendorId') phpVendorId: string) {
    const performance = await this.vendorProfileService.getVendorPerformance(parseInt(phpVendorId));
    return { success: !!performance, performance };
  }

  /**
   * Update vendor performance metrics
   */
  @Put('vendors/:phpVendorId/metrics')
  async updateVendorMetrics(
    @Param('phpVendorId') phpVendorId: string,
    @Body() metrics: any
  ) {
    await this.vendorProfileService.updatePerformanceMetrics(parseInt(phpVendorId), metrics);
    return { success: true };
  }

  // ==================== RIDER ENDPOINTS ====================

  /**
   * Sync rider profile from PHP
   */
  @Post('riders/sync/:phpRiderId')
  async syncRider(@Param('phpRiderId') phpRiderId: string) {
    const rider = await this.riderProfileService.syncRiderFromPhp(parseInt(phpRiderId));
    return { success: !!rider, rider };
  }

  /**
   * Get rider profile
   */
  @Get('riders/:phpRiderId')
  async getRiderProfile(@Param('phpRiderId') phpRiderId: string) {
    const profile = await this.riderProfileService.getRiderByPhpId(parseInt(phpRiderId));
    return { success: !!profile, profile };
  }

  /**
   * Get rider by phone
   */
  @Get('riders/by-phone/:phone')
  async getRiderByPhone(@Param('phone') phone: string) {
    const profile = await this.riderProfileService.getRiderByPhone(phone);
    return { success: !!profile, profile };
  }

  /**
   * Get rider performance
   */
  @Get('riders/:phpRiderId/performance')
  async getRiderPerformance(@Param('phpRiderId') phpRiderId: string) {
    const performance = await this.riderProfileService.getRiderPerformance(parseInt(phpRiderId));
    return { success: !!performance, performance };
  }

  /**
   * Update rider performance metrics
   */
  @Put('riders/:phpRiderId/metrics')
  async updateRiderMetrics(
    @Param('phpRiderId') phpRiderId: string,
    @Body() metrics: any
  ) {
    await this.riderProfileService.updatePerformanceMetrics(parseInt(phpRiderId), metrics);
    return { success: true };
  }

  /**
   * Update rider external platform profile
   */
  @Put('riders/:phpRiderId/external-platform')
  async updateRiderExternalPlatform(
    @Param('phpRiderId') phpRiderId: string,
    @Body() platform: any
  ) {
    await this.riderProfileService.updateExternalPlatform(parseInt(phpRiderId), platform);
    return { success: true };
  }

  /**
   * Get active riders in zone
   */
  @Get('riders/zone/:zoneId')
  async getRidersInZone(@Param('zoneId') zoneId: string) {
    const riders = await this.riderProfileService.getActiveRidersInZone(parseInt(zoneId));
    return { success: true, riders };
  }

  /**
   * Get top performer riders
   */
  @Get('riders/top-performers')
  async getTopPerformers(
    @Query('metric') metric: 'rating' | 'deliveries' | 'speed' = 'rating',
    @Query('limit') limit: string = '10'
  ) {
    const riders = await this.riderProfileService.getTopPerformers(metric, parseInt(limit));
    return { success: true, riders };
  }
}
