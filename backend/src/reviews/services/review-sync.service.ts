/**
 * Review Sync Service
 * 
 * Syncs reviews from PHP backend to PostgreSQL and triggers analysis.
 * This creates a data warehouse of all reviews for analytics and AI insights.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PhpReviewService, Review } from '../../php-integration/services/php-review.service';
import { ReviewIntelligenceService } from './review-intelligence.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface SyncStats {
  totalSynced: number;
  newReviews: number;
  analyzedCount: number;
  errors: string[];
}

@Injectable()
export class ReviewSyncService {
  private readonly logger = new Logger(ReviewSyncService.name);
  private isSyncing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly phpReviewService: PhpReviewService,
    private readonly reviewIntelligenceService: ReviewIntelligenceService,
  ) {}

  /**
   * Sync reviews for a specific item from PHP to PostgreSQL
   */
  async syncItemReviews(itemId: string, storeId: string): Promise<SyncStats> {
    const stats: SyncStats = {
      totalSynced: 0,
      newReviews: 0,
      analyzedCount: 0,
      errors: [],
    };

    try {
      // Fetch all reviews from PHP
      const result = await this.phpReviewService.getItemReviews(parseInt(itemId), 200, 1);
      
      if (!result.success || !result.reviews) {
        this.logger.warn(`No reviews found for item ${itemId}`);
        return stats;
      }

      const reviews = result.reviews;
      stats.totalSynced = reviews.length;

      // Sync each review to PostgreSQL
      for (const review of reviews) {
        try {
          const isNew = await this.upsertReview(review, itemId, storeId);
          if (isNew) stats.newReviews++;
        } catch (error) {
          stats.errors.push(`Review ${review.id}: ${error.message}`);
        }
      }

      // If we have new reviews, trigger analysis
      if (stats.newReviews > 0) {
        const intelligence = await this.reviewIntelligenceService.analyzeItemReviews(itemId, storeId);
        await this.reviewIntelligenceService.storeIntelligence(intelligence);
        stats.analyzedCount = intelligence.totalReviewsAnalyzed;
      }

      this.logger.log(`Synced ${stats.totalSynced} reviews for item ${itemId}, ${stats.newReviews} new`);
    } catch (error) {
      stats.errors.push(error.message);
      this.logger.error(`Failed to sync reviews for item ${itemId}: ${error.message}`);
    }

    return stats;
  }

  /**
   * Upsert a single review to PostgreSQL
   */
  private async upsertReview(review: Review, itemId: string, storeId: string): Promise<boolean> {
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT php_review_id FROM review_sync_log WHERE php_review_id = ${review.id}
    `;

    if (existing.length > 0) {
      return false; // Already synced
    }

    await this.prisma.$executeRaw`
      INSERT INTO review_sync_log (
        php_review_id, item_id, store_id,
        customer_name, rating, comment, review_date,
        is_analyzed, synced_at
      ) VALUES (
        ${review.id}, ${itemId}, ${storeId},
        ${review.customer_name}, ${review.rating}, ${review.comment},
        ${review.created_at}::timestamp,
        false, NOW()
      )
    `;

    return true;
  }

  /**
   * Sync reviews for a store (all items)
   */
  async syncStoreReviews(storeId: string, itemIds: string[]): Promise<SyncStats> {
    const totalStats: SyncStats = {
      totalSynced: 0,
      newReviews: 0,
      analyzedCount: 0,
      errors: [],
    };

    for (const itemId of itemIds) {
      try {
        const itemStats = await this.syncItemReviews(itemId, storeId);
        totalStats.totalSynced += itemStats.totalSynced;
        totalStats.newReviews += itemStats.newReviews;
        totalStats.analyzedCount += itemStats.analyzedCount;
        totalStats.errors.push(...itemStats.errors);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        totalStats.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    // Update store-level intelligence
    await this.updateStoreIntelligence(storeId);

    return totalStats;
  }

  /**
   * Update store-level aggregated intelligence
   */
  private async updateStoreIntelligence(storeId: string): Promise<void> {
    try {
      // Aggregate from all items in the store
      const itemStats = await this.prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as total_items,
          AVG((overall_sentiment->>'score')::decimal) as avg_sentiment,
          SUM(total_reviews_analyzed) as total_reviews,
          array_agg(item_id) FILTER (WHERE (overall_sentiment->>'score')::decimal > 0.5) as top_items,
          array_agg(item_id) FILTER (WHERE warnings->>'quantityIssue' = 'true') as problem_items
        FROM item_review_intelligence
        WHERE store_id = ${storeId}
      `;

      if (itemStats.length === 0) return;

      const stats = itemStats[0];
      const sentimentLabel = stats.avg_sentiment > 0.2 ? 'positive' : 
                            stats.avg_sentiment < -0.2 ? 'negative' : 'neutral';

      await this.prisma.$executeRaw`
        INSERT INTO store_review_intelligence (
          store_id, overall_sentiment, total_reviews, avg_rating,
          top_rated_items, problem_items, last_analyzed_at
        ) VALUES (
          ${storeId},
          ${JSON.stringify({ score: stats.avg_sentiment || 0, label: sentimentLabel })}::jsonb,
          ${stats.total_reviews || 0},
          ${(stats.avg_sentiment || 0) * 2.5 + 2.5}, -- Convert -1 to 1 → 0 to 5
          ${JSON.stringify(stats.top_items || [])}::jsonb,
          ${JSON.stringify(stats.problem_items || [])}::jsonb,
          NOW()
        )
        ON CONFLICT (store_id) DO UPDATE SET
          overall_sentiment = EXCLUDED.overall_sentiment,
          total_reviews = EXCLUDED.total_reviews,
          avg_rating = EXCLUDED.avg_rating,
          top_rated_items = EXCLUDED.top_rated_items,
          problem_items = EXCLUDED.problem_items,
          last_analyzed_at = NOW()
      `;

      this.logger.log(`Updated store intelligence for ${storeId}`);
    } catch (error) {
      this.logger.error(`Failed to update store intelligence: ${error.message}`);
    }
  }

  /**
   * Analyze unanalyzed reviews in the sync log
   */
  async analyzeUnanalyzedReviews(): Promise<number> {
    try {
      const unanalyzed = await this.prisma.$queryRaw<any[]>`
        SELECT DISTINCT item_id, store_id 
        FROM review_sync_log 
        WHERE is_analyzed = false
        LIMIT 50
      `;

      let analyzed = 0;
      for (const item of unanalyzed) {
        try {
          const intelligence = await this.reviewIntelligenceService.analyzeItemReviews(
            item.item_id, 
            item.store_id
          );
          await this.reviewIntelligenceService.storeIntelligence(intelligence);

          // Mark reviews as analyzed
          await this.prisma.$executeRaw`
            UPDATE review_sync_log 
            SET is_analyzed = true, analyzed_at = NOW()
            WHERE item_id = ${item.item_id}
          `;

          analyzed++;
        } catch (error) {
          this.logger.error(`Failed to analyze item ${item.item_id}: ${error.message}`);
        }
      }

      return analyzed;
    } catch (error) {
      this.logger.error(`Failed to analyze unanalyzed reviews: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get sync status for an item
   */
  async getSyncStatus(itemId: string): Promise<{
    totalReviews: number;
    lastSyncedAt: Date | null;
    isAnalyzed: boolean;
    intelligence: any | null;
  }> {
    try {
      const syncInfo = await this.prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as total,
          MAX(synced_at) as last_synced,
          bool_and(is_analyzed) as all_analyzed
        FROM review_sync_log
        WHERE item_id = ${itemId}
      `;

      const intelligence = await this.reviewIntelligenceService.getIntelligence(itemId);

      return {
        totalReviews: syncInfo[0]?.total || 0,
        lastSyncedAt: syncInfo[0]?.last_synced || null,
        isAnalyzed: syncInfo[0]?.all_analyzed || false,
        intelligence,
      };
    } catch (error) {
      return {
        totalReviews: 0,
        lastSyncedAt: null,
        isAnalyzed: false,
        intelligence: null,
      };
    }
  }

  /**
   * Daily cron job to sync popular items
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailySync() {
    if (this.isSyncing) {
      this.logger.warn('Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    this.logger.log('Starting daily review sync...');

    try {
      // Get items from recent orders (would connect to order service)
      // For now, analyze unanalyzed reviews
      const analyzed = await this.analyzeUnanalyzedReviews();
      this.logger.log(`Daily sync complete. Analyzed ${analyzed} items.`);
    } catch (error) {
      this.logger.error(`Daily sync failed: ${error.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Manual trigger for full sync (admin use)
   */
  async fullSync(storeIds?: string[]): Promise<{
    storesSynced: number;
    totalReviews: number;
    errors: string[];
  }> {
    const result = {
      storesSynced: 0,
      totalReviews: 0,
      errors: [] as string[],
    };

    // If no store IDs provided, get from recent activity
    if (!storeIds || storeIds.length === 0) {
      // Would fetch from order history
      this.logger.warn('No store IDs provided for full sync');
      return result;
    }

    for (const storeId of storeIds) {
      try {
        // Would need to get item IDs for each store
        // For now, just log
        this.logger.log(`Would sync store ${storeId}`);
        result.storesSynced++;
      } catch (error) {
        result.errors.push(`Store ${storeId}: ${error.message}`);
      }
    }

    return result;
  }
}
