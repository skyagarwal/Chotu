/**
 * Store Sync Service
 * 
 * Syncs store data from PHP backend to PostgreSQL
 * Enriches with competitor data from scraper service
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PhpStoreService } from '../../php-integration/services/php-store.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface StoreProfile {
  id: string;               // PostgreSQL UUID
  phpStoreId: number;       // PHP/MySQL store ID
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  zoneId?: number;
  moduleId?: number;
  moduleType?: string;
  fssaiNumber?: string;
  gstNumber?: string;
  isActive?: boolean;
  avgRating?: number;
  totalReviews?: number;
  competitorData?: Record<string, any>;
  externalRatings?: Record<string, number>;
}

export interface CompetitorData {
  source: 'zomato' | 'swiggy';
  externalId: string;
  rating: number;
  reviewCount: number;
  offers: string[];
  fssaiNumber?: string;
  gstNumber?: string;
  scrapedAt: Date;
}

@Injectable()
export class StoreSyncService implements OnModuleInit {
  private readonly logger = new Logger(StoreSyncService.name);
  private readonly scraperServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly phpStoreService: PhpStoreService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.scraperServiceUrl = this.configService.get('SCRAPER_SERVICE_URL', 'http://localhost:3300');
  }

  async onModuleInit() {
    this.logger.log('🔄 StoreSyncService initialized');
  }

  /**
   * Sync a single store from PHP to PostgreSQL
   */
  async syncStoreFromPhp(phpStoreId: number): Promise<StoreProfile | null> {
    try {
      this.logger.log(`📥 Syncing store from PHP: ${phpStoreId}`);

      // Fetch store details from PHP
      const phpStore = await this.phpStoreService.getStoreDetails(phpStoreId);
      
      if (!phpStore) {
        this.logger.warn(`Store not found in PHP: ${phpStoreId}`);
        return null;
      }

      // Upsert to PostgreSQL
      const store = await this.prisma.$queryRaw<any[]>`
        SELECT sync_store_from_php(
          ${phpStoreId}::INTEGER,
          ${phpStore.name}::VARCHAR,
          ${phpStore.address || ''}::TEXT,
          ${phpStore.latitude || null}::DECIMAL,
          ${phpStore.longitude || null}::DECIMAL,
          ${phpStore.module_id || 1}::INTEGER,
          ${phpStore.zone_id || null}::INTEGER,
          ${phpStore.fssai_number || null}::VARCHAR,
          ${phpStore.gst_number || null}::VARCHAR
        ) as id
      `;

      const storeId = store[0]?.id;
      this.logger.log(`✅ Synced store: ${phpStore.name} (${storeId})`);

      return {
        id: storeId,
        phpStoreId,
        name: phpStore.name,
        address: phpStore.address,
        latitude: phpStore.latitude,
        longitude: phpStore.longitude,
        zoneId: phpStore.zone_id,
        moduleId: phpStore.module_id,
        fssaiNumber: phpStore.fssai_number,
        gstNumber: phpStore.gst_number,
        isActive: phpStore.active === 1,
      };
    } catch (error) {
      this.logger.error(`Failed to sync store ${phpStoreId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Batch sync stores from PHP
   */
  async syncStoresFromPhp(phpStoreIds: number[]): Promise<StoreProfile[]> {
    const synced: StoreProfile[] = [];
    
    for (const phpStoreId of phpStoreIds) {
      const store = await this.syncStoreFromPhp(phpStoreId);
      if (store) {
        synced.push(store);
      }
      // Small delay to avoid overwhelming PHP backend
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.log(`📦 Batch synced ${synced.length}/${phpStoreIds.length} stores`);
    return synced;
  }

  /**
   * Get store profile by PHP ID
   */
  async getStoreByPhpId(phpStoreId: number): Promise<StoreProfile | null> {
    const stores = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM stores WHERE php_store_id = ${phpStoreId}
    `;

    if (stores.length === 0) {
      // Try to sync from PHP first
      return this.syncStoreFromPhp(phpStoreId);
    }

    const store = stores[0];
    return {
      id: store.id,
      phpStoreId: store.php_store_id,
      name: store.name,
      address: store.address,
      latitude: parseFloat(store.latitude),
      longitude: parseFloat(store.longitude),
      zoneId: store.zone_id,
      moduleId: store.module_id,
      moduleType: store.module_type,
      fssaiNumber: store.fssai_number,
      gstNumber: store.gst_number,
      isActive: store.is_active,
      avgRating: parseFloat(store.avg_rating),
      totalReviews: store.total_reviews,
      competitorData: store.competitor_data,
      externalRatings: store.external_ratings,
    };
  }

  /**
   * Update store with competitor data from scraper
   */
  async updateCompetitorData(
    phpStoreId: number,
    competitorData: CompetitorData
  ): Promise<void> {
    // Ensure store exists in PostgreSQL
    const store = await this.getStoreByPhpId(phpStoreId);
    if (!store) {
      this.logger.warn(`Cannot update competitor data - store not found: ${phpStoreId}`);
      return;
    }

    await this.prisma.$queryRaw`
      SELECT update_store_competitor_data(
        ${store.id}::UUID,
        ${competitorData.source}::VARCHAR,
        ${competitorData.rating}::DECIMAL,
        ${competitorData.reviewCount}::INTEGER,
        ${competitorData.offers}::TEXT[],
        ${competitorData.fssaiNumber || null}::VARCHAR,
        ${competitorData.gstNumber || null}::VARCHAR
      )
    `;

    this.logger.log(`📊 Updated competitor data for store ${store.name} (${competitorData.source})`);
  }

  /**
   * Queue store for scraping
   */
  async queueForScraping(phpStoreId: number, priority: 'normal' | 'high' = 'normal'): Promise<boolean> {
    try {
      const store = await this.getStoreByPhpId(phpStoreId);
      if (!store) {
        this.logger.warn(`Cannot queue for scraping - store not found: ${phpStoreId}`);
        return false;
      }

      const response = await firstValueFrom(
        this.httpService.post(`${this.scraperServiceUrl}/api/scrape/bulk`, {
          storeId: store.id,
          storeName: store.name,
          storeAddress: store.address,
          lat: store.latitude,
          lng: store.longitude,
          source: 'both',
          priority,
        })
      );

      this.logger.log(`📤 Queued store for scraping: ${store.name}`);
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Failed to queue store for scraping: ${error.message}`);
      return false;
    }
  }

  /**
   * Get enriched store profile with competitor comparison
   */
  async getEnrichedStoreProfile(phpStoreId: number): Promise<any> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM v_stores_comparison WHERE php_store_id = ${phpStoreId}
    `;

    if (result.length === 0) {
      // Sync first, then query
      await this.syncStoreFromPhp(phpStoreId);
      const retryResult = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM v_stores_comparison WHERE php_store_id = ${phpStoreId}
      `;
      return retryResult[0] || null;
    }

    return result[0];
  }

  /**
   * Get price comparison for store
   */
  async getPriceComparison(phpStoreId: number): Promise<any[]> {
    const store = await this.getStoreByPhpId(phpStoreId);
    if (!store) return [];

    // Call the PostgreSQL function
    const comparison = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM get_competitor_pricing(${store.id}::UUID)
    `;

    return comparison;
  }

  /**
   * Cron: Sync active stores daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async syncActiveStores(): Promise<void> {
    this.logger.log('🔄 Starting daily store sync...');
    
    try {
      // Get list of active stores from PHP (you'd implement this endpoint)
      // For now, we'll just log
      this.logger.log('Daily store sync - implement PHP endpoint for active store list');
    } catch (error) {
      this.logger.error(`Daily store sync failed: ${error.message}`);
    }
  }

  /**
   * Match store by FSSAI/GST number (100% confidence)
   */
  async matchStoreByIdentifiers(
    fssaiNumber?: string,
    gstNumber?: string
  ): Promise<StoreProfile | null> {
    if (!fssaiNumber && !gstNumber) return null;

    let stores: any[];

    if (fssaiNumber) {
      stores = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM stores WHERE fssai_number = ${fssaiNumber}
      `;
      if (stores.length > 0) {
        this.logger.log(`✅ Matched store by FSSAI: ${fssaiNumber}`);
        return this.mapStoreRow(stores[0]);
      }
    }

    if (gstNumber) {
      stores = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM stores WHERE gst_number = ${gstNumber}
      `;
      if (stores.length > 0) {
        this.logger.log(`✅ Matched store by GST: ${gstNumber}`);
        return this.mapStoreRow(stores[0]);
      }
    }

    return null;
  }

  private mapStoreRow(row: any): StoreProfile {
    return {
      id: row.id,
      phpStoreId: row.php_store_id,
      name: row.name,
      address: row.address,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      zoneId: row.zone_id,
      moduleId: row.module_id,
      moduleType: row.module_type,
      fssaiNumber: row.fssai_number,
      gstNumber: row.gst_number,
      isActive: row.is_active,
      avgRating: parseFloat(row.avg_rating),
      totalReviews: row.total_reviews,
      competitorData: row.competitor_data,
      externalRatings: row.external_ratings,
    };
  }
}
