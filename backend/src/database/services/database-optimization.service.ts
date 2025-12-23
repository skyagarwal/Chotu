import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * 🚀 Database Query Optimization Service
 * 
 * Optimizes database performance through:
 * - Index management
 * - Query analysis
 * - Slow query detection
 * - Connection pooling
 * - Query caching recommendations
 */
@Injectable()
export class DatabaseOptimizationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseOptimizationService.name);
  private pool: Pool;
  
  // Slow query threshold (ms)
  private readonly SLOW_QUERY_THRESHOLD = 1000;
  
  // Index recommendations
  private readonly RECOMMENDED_INDEXES = [
    // Conversation tables
    { table: 'conversations', columns: ['tenant_id', 'created_at'], name: 'idx_conv_tenant_created' },
    { table: 'conversations', columns: ['user_phone'], name: 'idx_conv_user_phone' },
    { table: 'conversations', columns: ['status'], name: 'idx_conv_status' },
    { table: 'messages', columns: ['conversation_id', 'created_at'], name: 'idx_msg_conv_created' },
    { table: 'messages', columns: ['sender_type'], name: 'idx_msg_sender_type' },
    
    // User tables
    { table: 'users', columns: ['phone'], name: 'idx_users_phone' },
    { table: 'users', columns: ['tenant_id'], name: 'idx_users_tenant' },
    { table: 'user_profiles', columns: ['user_id'], name: 'idx_profiles_user' },
    
    // Order tables
    { table: 'orders', columns: ['user_id', 'created_at'], name: 'idx_orders_user_created' },
    { table: 'orders', columns: ['status'], name: 'idx_orders_status' },
    { table: 'orders', columns: ['tenant_id', 'created_at'], name: 'idx_orders_tenant_created' },
    
    // Product tables
    { table: 'products', columns: ['tenant_id', 'category_id'], name: 'idx_products_tenant_cat' },
    { table: 'products', columns: ['is_active'], name: 'idx_products_active' },
    
    // Analytics tables
    { table: 'analytics_events', columns: ['tenant_id', 'event_type', 'created_at'], name: 'idx_events_tenant_type_created' },
    { table: 'analytics_events', columns: ['user_id'], name: 'idx_events_user' },
    
    // AI tables
    { table: 'llm_requests', columns: ['tenant_id', 'created_at'], name: 'idx_llm_tenant_created' },
    { table: 'llm_requests', columns: ['model'], name: 'idx_llm_model' },
    { table: 'intents', columns: ['tenant_id'], name: 'idx_intents_tenant' },
    
    // Search tables  
    { table: 'search_queries', columns: ['tenant_id', 'created_at'], name: 'idx_search_tenant_created' },
    { table: 'search_queries', columns: ['query_text'], name: 'idx_search_query_text', type: 'gin', expression: 'to_tsvector(\'english\', query_text)' },
    
    // Session tables
    { table: 'sessions', columns: ['user_id', 'expires_at'], name: 'idx_sessions_user_expires' },
    { table: 'sessions', columns: ['token'], name: 'idx_sessions_token', unique: true },
  ];

  async onModuleInit() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
    this.logger.log('🚀 Database Optimization Service initialized');
    
    // Create optimization tracking table
    await this.initOptimizationTable();
    
    // Run initial analysis
    await this.analyzeDatabase();
  }

  /**
   * Initialize optimization tracking table
   */
  private async initOptimizationTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS query_performance_log (
        id SERIAL PRIMARY KEY,
        query_hash VARCHAR(64),
        query_text TEXT,
        execution_time_ms FLOAT,
        rows_affected INTEGER,
        table_name VARCHAR(128),
        tenant_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(query_hash, created_at)
      );

      CREATE TABLE IF NOT EXISTS index_recommendations (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(128),
        columns JSONB,
        index_name VARCHAR(128),
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        applied_at TIMESTAMP,
        UNIQUE(index_name)
      );

      CREATE TABLE IF NOT EXISTS db_optimization_stats (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(128),
        total_rows BIGINT,
        dead_tuples BIGINT,
        last_vacuum TIMESTAMP,
        last_analyze TIMESTAMP,
        index_usage_ratio FLOAT,
        seq_scan_count BIGINT,
        idx_scan_count BIGINT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_query_perf_hash ON query_performance_log(query_hash);
      CREATE INDEX IF NOT EXISTS idx_query_perf_time ON query_performance_log(execution_time_ms);
    `);
  }

  /**
   * Analyze database and recommend optimizations
   */
  async analyzeDatabase(): Promise<{
    slowQueries: any[];
    missingIndexes: any[];
    tableStats: any[];
  }> {
    const [slowQueries, missingIndexes, tableStats] = await Promise.all([
      this.findSlowQueries(),
      this.findMissingIndexes(),
      this.getTableStats(),
    ]);

    this.logger.log(`📊 Database Analysis Complete:
      - Slow Queries: ${slowQueries.length}
      - Missing Indexes: ${missingIndexes.length}
      - Tables Analyzed: ${tableStats.length}
    `);

    return { slowQueries, missingIndexes, tableStats };
  }

  /**
   * Find slow queries from pg_stat_statements
   */
  async findSlowQueries(): Promise<any[]> {
    try {
      // Check if pg_stat_statements extension is enabled
      const extCheck = await this.pool.query(`
        SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_stat_statements'
      `);

      if (extCheck.rows[0].count === '0') {
        this.logger.warn('pg_stat_statements extension not enabled');
        
        // Fall back to query log table
        const result = await this.pool.query(`
          SELECT query_hash, query_text, 
                 AVG(execution_time_ms) as avg_time,
                 COUNT(*) as call_count,
                 MAX(execution_time_ms) as max_time
          FROM query_performance_log
          WHERE execution_time_ms > $1
          GROUP BY query_hash, query_text
          ORDER BY avg_time DESC
          LIMIT 20
        `, [this.SLOW_QUERY_THRESHOLD]);

        return result.rows;
      }

      // Use pg_stat_statements
      const result = await this.pool.query(`
        SELECT query, 
               calls,
               mean_exec_time as avg_time_ms,
               max_exec_time as max_time_ms,
               total_exec_time as total_time_ms,
               rows
        FROM pg_stat_statements
        WHERE mean_exec_time > $1
        ORDER BY mean_exec_time DESC
        LIMIT 20
      `, [this.SLOW_QUERY_THRESHOLD]);

      return result.rows;
    } catch (error) {
      this.logger.warn('Could not analyze slow queries:', error);
      return [];
    }
  }

  /**
   * Find missing indexes
   */
  async findMissingIndexes(): Promise<any[]> {
    const missing: any[] = [];

    for (const idx of this.RECOMMENDED_INDEXES) {
      try {
        // Check if index exists
        const result = await this.pool.query(`
          SELECT indexname FROM pg_indexes 
          WHERE tablename = $1 AND indexname = $2
        `, [idx.table, idx.name]);

        if (result.rows.length === 0) {
          // Check if table exists
          const tableExists = await this.pool.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1
          `, [idx.table]);

          if (tableExists.rows.length > 0) {
            missing.push({
              ...idx,
              createStatement: this.generateCreateIndexStatement(idx),
            });
          }
        }
      } catch (error) {
        // Table doesn't exist yet
      }
    }

    // Store recommendations
    for (const idx of missing) {
      await this.pool.query(`
        INSERT INTO index_recommendations (table_name, columns, index_name, priority)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (index_name) DO NOTHING
      `, [idx.table, JSON.stringify(idx.columns), idx.name, 'medium']);
    }

    return missing;
  }

  /**
   * Generate CREATE INDEX statement
   */
  private generateCreateIndexStatement(idx: any): string {
    const uniqueStr = idx.unique ? 'UNIQUE ' : '';
    const typeStr = idx.type || 'btree';
    
    if (idx.expression) {
      return `CREATE ${uniqueStr}INDEX ${idx.name} ON ${idx.table} USING ${typeStr} (${idx.expression})`;
    }
    
    return `CREATE ${uniqueStr}INDEX ${idx.name} ON ${idx.table} USING ${typeStr} (${idx.columns.join(', ')})`;
  }

  /**
   * Get table statistics
   */
  async getTableStats(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          schemaname,
          relname as table_name,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          CASE 
            WHEN seq_scan + idx_scan > 0 
            THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
            ELSE 0 
          END as index_usage_pct
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
        LIMIT 50
      `);

      // Update stats table
      for (const row of result.rows) {
        await this.pool.query(`
          INSERT INTO db_optimization_stats 
            (table_name, total_rows, dead_tuples, last_vacuum, last_analyze, 
             index_usage_ratio, seq_scan_count, idx_scan_count)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            total_rows = EXCLUDED.total_rows,
            dead_tuples = EXCLUDED.dead_tuples,
            last_vacuum = EXCLUDED.last_vacuum,
            last_analyze = EXCLUDED.last_analyze,
            index_usage_ratio = EXCLUDED.index_usage_ratio,
            seq_scan_count = EXCLUDED.seq_scan_count,
            idx_scan_count = EXCLUDED.idx_scan_count,
            updated_at = NOW()
        `, [
          row.table_name, row.live_rows, row.dead_rows,
          row.last_autovacuum || row.last_vacuum, row.last_analyze,
          row.index_usage_pct / 100, row.seq_scan, row.idx_scan,
        ]);
      }

      return result.rows;
    } catch (error) {
      this.logger.warn('Could not get table stats:', error);
      return [];
    }
  }

  /**
   * Apply recommended indexes
   */
  async applyRecommendedIndexes(dryRun = true): Promise<{
    applied: string[];
    failed: string[];
    skipped: string[];
  }> {
    const result = {
      applied: [] as string[],
      failed: [] as string[],
      skipped: [] as string[],
    };

    const recommendations = await this.pool.query(`
      SELECT * FROM index_recommendations 
      WHERE status = 'pending'
      ORDER BY priority ASC
    `);

    for (const rec of recommendations.rows) {
      const createStmt = this.generateCreateIndexStatement({
        table: rec.table_name,
        columns: rec.columns,
        name: rec.index_name,
      });

      if (dryRun) {
        this.logger.log(`[DRY RUN] Would create: ${createStmt}`);
        result.skipped.push(rec.index_name);
        continue;
      }

      try {
        // Create index concurrently to avoid blocking
        await this.pool.query(`${createStmt} CONCURRENTLY`);
        
        await this.pool.query(`
          UPDATE index_recommendations 
          SET status = 'applied', applied_at = NOW()
          WHERE id = $1
        `, [rec.id]);
        
        result.applied.push(rec.index_name);
        this.logger.log(`✅ Created index: ${rec.index_name}`);
      } catch (error) {
        result.failed.push(rec.index_name);
        this.logger.error(`❌ Failed to create index ${rec.index_name}:`, error);
        
        await this.pool.query(`
          UPDATE index_recommendations SET status = 'failed' WHERE id = $1
        `, [rec.id]);
      }
    }

    return result;
  }

  /**
   * Run VACUUM ANALYZE on tables with high dead tuples
   */
  async vacuumTables(threshold = 10000): Promise<string[]> {
    const vacuumed: string[] = [];

    try {
      const result = await this.pool.query(`
        SELECT relname as table_name, n_dead_tup as dead_rows
        FROM pg_stat_user_tables
        WHERE n_dead_tup > $1
        ORDER BY n_dead_tup DESC
      `, [threshold]);

      for (const row of result.rows) {
        try {
          // VACUUM ANALYZE
          await this.pool.query(`VACUUM ANALYZE ${row.table_name}`);
          vacuumed.push(row.table_name);
          this.logger.log(`🧹 Vacuumed ${row.table_name} (${row.dead_rows} dead rows)`);
        } catch (error) {
          this.logger.warn(`Could not vacuum ${row.table_name}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Vacuum operation failed:', error);
    }

    return vacuumed;
  }

  /**
   * Log query performance for analysis
   */
  async logQueryPerformance(
    queryText: string,
    executionTimeMs: number,
    rowsAffected: number,
    tenantId?: number,
  ): Promise<void> {
    // Extract table name from query
    const tableMatch = queryText.match(/(?:FROM|INTO|UPDATE)\s+([a-z_]+)/i);
    const tableName = tableMatch ? tableMatch[1] : 'unknown';
    
    // Generate query hash
    const queryHash = this.hashQuery(queryText);

    await this.pool.query(`
      INSERT INTO query_performance_log 
        (query_hash, query_text, execution_time_ms, rows_affected, table_name, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [queryHash, queryText.substring(0, 1000), executionTimeMs, rowsAffected, tableName, tenantId]);

    // Alert on slow queries
    if (executionTimeMs > this.SLOW_QUERY_THRESHOLD) {
      this.logger.warn(`🐢 Slow query detected (${executionTimeMs}ms): ${queryText.substring(0, 200)}...`);
    }
  }

  /**
   * Hash query for deduplication
   */
  private hashQuery(query: string): string {
    // Normalize query (remove values, keep structure)
    const normalized = query
      .replace(/\s+/g, ' ')
      .replace(/'[^']*'/g, '?')
      .replace(/\d+/g, '?')
      .trim();
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get optimization report
   */
  async getOptimizationReport(): Promise<any> {
    const [analysis, pendingIndexes, recentSlowQueries] = await Promise.all([
      this.analyzeDatabase(),
      this.pool.query(`SELECT * FROM index_recommendations WHERE status = 'pending'`),
      this.pool.query(`
        SELECT query_text, AVG(execution_time_ms) as avg_time, COUNT(*) as occurrences
        FROM query_performance_log
        WHERE created_at > NOW() - INTERVAL '24 hours'
          AND execution_time_ms > $1
        GROUP BY query_text
        ORDER BY avg_time DESC
        LIMIT 10
      `, [this.SLOW_QUERY_THRESHOLD]),
    ]);

    return {
      summary: {
        slowQueriesFound: analysis.slowQueries.length,
        missingIndexes: analysis.missingIndexes.length,
        tablesAnalyzed: analysis.tableStats.length,
        pendingRecommendations: pendingIndexes.rows.length,
      },
      slowQueries: analysis.slowQueries.slice(0, 10),
      missingIndexes: analysis.missingIndexes,
      pendingIndexRecommendations: pendingIndexes.rows,
      recentSlowQueries: recentSlowQueries.rows,
      tableStats: analysis.tableStats.slice(0, 10),
    };
  }

  /**
   * Explain query plan
   */
  async explainQuery(query: string): Promise<any> {
    try {
      const result = await this.pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      return result.rows[0]['QUERY PLAN'];
    } catch (error) {
      return { error: error.message };
    }
  }
}
