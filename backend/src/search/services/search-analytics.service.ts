import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export interface SearchLog {
  query: string;
  searchType: string;
  filters?: Record<string, any>;
  resultsCount: number;
  executionTimeMs: number;
  sessionId?: string;
  userId?: string;
}

@Injectable()
export class SearchAnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchAnalyticsService.name);
  private pool: Pool;

  async onModuleInit() {
    const databaseUrl = process.env.DATABASE_URL || 
      'postgresql://mangwale_config:config_secure_pass_2024@mangwale_postgres:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    try {
      const client = await this.pool.connect();
      
      // Create table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS search_logs (
          id UUID PRIMARY KEY,
          query TEXT NOT NULL,
          search_type VARCHAR(50),
          filters JSONB,
          results_count INTEGER,
          execution_time_ms INTEGER,
          session_id VARCHAR(100),
          user_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);
      `);
      
      client.release();
      this.logger.log('✅ Search Analytics initialized (table: search_logs)');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Search Analytics: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async logSearch(log: SearchLog): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO search_logs 
         (id, query, search_type, filters, results_count, execution_time_ms, session_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          log.query,
          log.searchType,
          log.filters ? JSON.stringify(log.filters) : null,
          log.resultsCount,
          log.executionTimeMs,
          log.sessionId || null,
          log.userId || null,
        ]
      );
    } catch (error) {
      this.logger.error(`Failed to log search: ${error.message}`);
    }
  }

  async getStats(days: number = 7) {
    try {
      // Total searches
      const totalRes = await this.pool.query(
        `SELECT COUNT(*) as count FROM search_logs WHERE created_at >= NOW() - INTERVAL '${days} days'`
      );
      const totalSearches = parseInt(totalRes.rows[0].count);

      // Zero results
      const zeroRes = await this.pool.query(
        `SELECT COUNT(*) as count FROM search_logs 
         WHERE results_count = 0 AND created_at >= NOW() - INTERVAL '${days} days'`
      );
      const zeroResults = parseInt(zeroRes.rows[0].count);

      // Top queries
      const topRes = await this.pool.query(
        `SELECT query, COUNT(*) as count 
         FROM search_logs 
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY query 
         ORDER BY count DESC 
         LIMIT 10`
      );

      // Daily volume
      const volumeRes = await this.pool.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count 
         FROM search_logs 
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at) 
         ORDER BY date ASC`
      );

      // Avg response time
      const timeRes = await this.pool.query(
        `SELECT AVG(execution_time_ms) as avg_time 
         FROM search_logs 
         WHERE created_at >= NOW() - INTERVAL '${days} days'`
      );
      const avgResponseTime = parseFloat(timeRes.rows[0].avg_time) || 0;

      return {
        totalSearches,
        zeroResults,
        zeroResultsRate: totalSearches > 0 ? (zeroResults / totalSearches) : 0,
        avgResponseTime: Math.round(avgResponseTime),
        topQueries: topRes.rows.map(r => ({ query: r.query, count: parseInt(r.count) })),
        dailyVolume: volumeRes.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
      };
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      return {
        totalSearches: 0,
        zeroResults: 0,
        zeroResultsRate: 0,
        topQueries: [],
        dailyVolume: [],
      };
    }
  }
}
