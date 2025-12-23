import { Controller, Get, Post, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { SemanticCacheService, CacheStats } from './semantic-cache.service';

/**
 * Semantic Cache Controller
 * 
 * Admin API for managing and monitoring the LLM response cache.
 */
@Controller('ai/cache')
export class SemanticCacheController {
  private readonly logger = new Logger(SemanticCacheController.name);

  constructor(private readonly cacheService: SemanticCacheService) {}

  /**
   * Get cache statistics
   */
  @Get('stats')
  async getStats(@Query('tenantId') tenantId?: string): Promise<{ success: boolean; stats: CacheStats; available: boolean }> {
    const stats = await this.cacheService.getStats(tenantId);
    return {
      success: true,
      stats,
      available: this.cacheService.isAvailable(),
    };
  }

  /**
   * Get top cached queries for a tenant
   */
  @Get('top-queries')
  async getTopQueries(
    @Query('tenantId') tenantId: string = 'mangwale',
    @Query('limit') limit: string = '10',
  ) {
    const queries = await this.cacheService.getTopCachedQueries(
      tenantId,
      parseInt(limit, 10),
    );
    return {
      success: true,
      queries,
    };
  }

  /**
   * Clear cache for a specific tenant
   */
  @Delete('tenant/:tenantId')
  async clearTenantCache(@Param('tenantId') tenantId: string) {
    const cleared = await this.cacheService.clearTenantCache(tenantId);
    this.logger.log(`🗑️ Cleared cache for tenant ${tenantId}: ${cleared} entries`);
    return {
      success: true,
      cleared,
      message: `Cleared ${cleared} cache entries for tenant ${tenantId}`,
    };
  }

  /**
   * Invalidate a specific cache entry
   */
  @Delete('entry')
  async invalidateEntry(
    @Body() body: { query: string; model: string; tenantId?: string },
  ) {
    await this.cacheService.invalidate(
      body.query,
      body.model,
      body.tenantId || 'default',
    );
    return {
      success: true,
      message: 'Cache entry invalidated',
    };
  }

  /**
   * Update cache configuration
   */
  @Post('config')
  async updateConfig(
    @Body() config: {
      enabled?: boolean;
      ttlSeconds?: number;
      maxEntries?: number;
      similarityThreshold?: number;
    },
  ) {
    this.cacheService.updateConfig(config);
    return {
      success: true,
      message: 'Cache configuration updated',
      config,
    };
  }

  /**
   * Warm up cache with common queries (for initial population)
   */
  @Post('warmup')
  async warmupCache(
    @Body() body: {
      tenantId: string;
      queries: Array<{
        query: string;
        response: string;
        model: string;
        tokens?: { prompt: number; completion: number };
      }>;
    },
  ) {
    let added = 0;
    for (const item of body.queries) {
      await this.cacheService.set(
        item.query,
        item.response,
        item.model,
        body.tenantId,
        item.tokens || { prompt: 50, completion: 100 },
        500, // Estimated latency
      );
      added++;
    }
    
    this.logger.log(`🔥 Warmed up cache with ${added} entries for tenant ${body.tenantId}`);
    return {
      success: true,
      added,
      message: `Added ${added} entries to cache warmup`,
    };
  }
}
