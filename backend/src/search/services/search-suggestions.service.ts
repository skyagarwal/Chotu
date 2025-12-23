import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { OpenSearchService } from './opensearch.service';

/**
 * 🔮 Search Suggestions Service
 * 
 * Provides autocomplete and search suggestions:
 * - Real-time prefix-based suggestions
 * - Popular searches (trending)
 * - Recent searches (user-specific)
 * - Category suggestions
 * - Product name completions
 * - Spelling corrections
 * 
 * Data Sources:
 * - OpenSearch completion suggester
 * - PostgreSQL search_logs table
 * - Redis for caching (optional)
 */

export interface SuggestionResult {
  suggestions: string[];
  categories?: string[];
  products?: ProductSuggestion[];
  stores?: StoreSuggestion[];
  corrections?: string[];
}

export interface ProductSuggestion {
  id: string;
  name: string;
  price?: number;
  image?: string;
  storeId?: number;
  storeName?: string;
}

export interface StoreSuggestion {
  id: number;
  name: string;
  logo?: string;
  rating?: number;
}

@Injectable()
export class SearchSuggestionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchSuggestionsService.name);
  private pool: Pool;

  constructor(
    private readonly configService: ConfigService,
    private readonly openSearchService: OpenSearchService,
  ) {
    this.logger.log('✅ SearchSuggestionsService initializing...');
  }

  async onModuleInit() {
    const databaseUrl = this.configService.get('DATABASE_URL') ||
      'postgresql://mangwale_config:config_secure_pass_2024@mangwale_postgres:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    try {
      const client = await this.pool.connect();
      
      // Create suggestions tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS search_suggestions_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          prefix VARCHAR(100) NOT NULL,
          suggestion VARCHAR(255) NOT NULL,
          suggestion_type VARCHAR(50) DEFAULT 'query',
          score FLOAT DEFAULT 1.0,
          click_count INTEGER DEFAULT 0,
          conversion_count INTEGER DEFAULT 0,
          last_used TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(prefix, suggestion)
        );
        
        CREATE INDEX IF NOT EXISTS idx_suggestions_prefix ON search_suggestions_cache(prefix);
        CREATE INDEX IF NOT EXISTS idx_suggestions_score ON search_suggestions_cache(score DESC);
      `);
      
      client.release();
      this.logger.log('✅ SearchSuggestionsService initialized');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize SearchSuggestionsService: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  /**
   * Get autocomplete suggestions for a prefix
   */
  async getSuggestions(
    prefix: string,
    options: {
      limit?: number;
      moduleId?: number;
      includeProducts?: boolean;
      includeStores?: boolean;
      includeCategories?: boolean;
      userId?: string;
    } = {},
  ): Promise<SuggestionResult> {
    const {
      limit = 10,
      moduleId,
      includeProducts = true,
      includeStores = false,
      includeCategories = true,
      userId,
    } = options;

    const normalizedPrefix = prefix.toLowerCase().trim();
    
    if (!normalizedPrefix || normalizedPrefix.length < 2) {
      return { suggestions: [] };
    }

    const result: SuggestionResult = {
      suggestions: [],
      categories: [],
      products: [],
      stores: [],
      corrections: [],
    };

    try {
      // 1. Get popular query suggestions from database
      const popularSuggestions = await this.getPopularQuerySuggestions(normalizedPrefix, limit);
      result.suggestions = popularSuggestions;

      // 2. Get user's recent searches if userId provided
      if (userId) {
        const recentSearches = await this.getUserRecentSearches(userId, normalizedPrefix, 5);
        // Merge with popular, prioritizing recent
        result.suggestions = [...new Set([...recentSearches, ...result.suggestions])].slice(0, limit);
      }

      // 3. Get category suggestions from OpenSearch
      if (includeCategories) {
        result.categories = await this.getCategorySuggestions(normalizedPrefix, moduleId, 5);
      }

      // 4. Get product name suggestions from OpenSearch
      if (includeProducts) {
        result.products = await this.getProductSuggestions(normalizedPrefix, moduleId, 6);
      }

      // 5. Get store suggestions
      if (includeStores) {
        result.stores = await this.getStoreSuggestions(normalizedPrefix, moduleId, 4);
      }

      // 6. Get spelling corrections if few results
      if (result.suggestions.length < 3 && result.products.length < 3) {
        result.corrections = await this.getSpellingCorrections(normalizedPrefix);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get suggestions: ${error.message}`);
      return result;
    }
  }

  /**
   * Get popular query suggestions from search_logs
   */
  private async getPopularQuerySuggestions(prefix: string, limit: number): Promise<string[]> {
    try {
      const result = await this.pool.query(
        `SELECT query, COUNT(*) as count 
         FROM search_logs 
         WHERE LOWER(query) LIKE $1 
           AND results_count > 0
           AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY query 
         ORDER BY count DESC 
         LIMIT $2`,
        [`${prefix}%`, limit],
      );
      
      return result.rows.map(r => r.query);
    } catch (error) {
      this.logger.error(`Failed to get popular suggestions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user's recent searches
   */
  private async getUserRecentSearches(
    userId: string,
    prefix: string,
    limit: number,
  ): Promise<string[]> {
    try {
      const result = await this.pool.query(
        `SELECT DISTINCT query 
         FROM search_logs 
         WHERE user_id = $1 
           AND LOWER(query) LIKE $2
         ORDER BY MAX(created_at) DESC
         LIMIT $3`,
        [userId, `${prefix}%`, limit],
      );
      
      return result.rows.map(r => r.query);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get category suggestions from OpenSearch
   */
  private async getCategorySuggestions(
    prefix: string,
    moduleId?: number,
    limit: number = 5,
  ): Promise<string[]> {
    try {
      const body: any = {
        size: 0,
        query: {
          bool: {
            must: [
              {
                prefix: {
                  'category.keyword': {
                    value: prefix,
                    case_insensitive: true,
                  },
                },
              },
            ],
            // CRITICAL: Only count categories from active items (status=1)
            filter: [{ term: { status: 1 } }],
          },
        },
        aggs: {
          categories: {
            terms: {
              field: 'category.keyword',
              size: limit,
            },
          },
        },
      };

      if (moduleId) {
        body.query.bool.filter.push({ term: { module_id: moduleId } });
      }

      const result = await this.openSearchService.rawSearch('food_items_v4', body);
      
      if (result.aggregations?.categories?.buckets) {
        return result.aggregations.categories.buckets.map((b: any) => b.key);
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Category suggestions failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get product name suggestions from OpenSearch
   */
  private async getProductSuggestions(
    prefix: string,
    moduleId?: number,
    limit: number = 6,
  ): Promise<ProductSuggestion[]> {
    try {
      const body: any = {
        size: limit,
        _source: ['name', 'price', 'image', 'store_id', 'store_name'],
        query: {
          bool: {
            should: [
              {
                match_phrase_prefix: {
                  name: {
                    query: prefix,
                    max_expansions: 50,
                    boost: 2.0,
                  },
                },
              },
              {
                prefix: {
                  'name.keyword': {
                    value: prefix,
                    case_insensitive: true,
                  },
                },
              },
            ],
            minimum_should_match: 1,
            // CRITICAL: Only show active items (status=1) that can be ordered
            filter: [{ term: { status: 1 } }],
          },
        },
        sort: [
          { _score: 'desc' },
          { rating: 'desc' },
        ],
      };

      if (moduleId) {
        body.query.bool.filter.push({ term: { module_id: moduleId } });
      }

      const result = await this.openSearchService.rawSearch('food_items_v4', body);
      
      return (result.hits?.hits || []).map((hit: any) => ({
        id: hit._id,
        name: hit._source.name,
        price: hit._source.price,
        image: hit._source.image,
        storeId: hit._source.store_id,
        storeName: hit._source.store_name,
      }));
    } catch (error) {
      this.logger.error(`Product suggestions failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get store suggestions from OpenSearch
   */
  private async getStoreSuggestions(
    prefix: string,
    moduleId?: number,
    limit: number = 4,
  ): Promise<StoreSuggestion[]> {
    try {
      const body: any = {
        size: limit,
        _source: ['name', 'logo', 'rating'],
        query: {
          bool: {
            should: [
              {
                match_phrase_prefix: {
                  name: {
                    query: prefix,
                    max_expansions: 50,
                  },
                },
              },
              {
                prefix: {
                  'name.keyword': {
                    value: prefix,
                    case_insensitive: true,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [
          { _score: 'desc' },
          { rating: 'desc' },
        ],
      };

      if (moduleId) {
        body.query.bool.filter = [{ term: { module_id: moduleId } }];
      }

      const result = await this.openSearchService.rawSearch('stores', body);
      
      return (result.hits?.hits || []).map((hit: any) => ({
        id: parseInt(hit._id),
        name: hit._source.name,
        logo: hit._source.logo,
        rating: hit._source.rating,
      }));
    } catch (error) {
      this.logger.error(`Store suggestions failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get spelling corrections using fuzzy matching
   */
  private async getSpellingCorrections(query: string): Promise<string[]> {
    try {
      // Use OpenSearch fuzzy suggest
      const body = {
        suggest: {
          spelling: {
            text: query,
            term: {
              field: 'name',
              suggest_mode: 'popular',
              min_word_length: 3,
              max_edits: 2,
            },
          },
        },
      };

      const result = await this.openSearchService.rawSearch('food_items_v4', body);
      
      if (result.suggest?.spelling) {
        const corrections: string[] = [];
        for (const suggestion of result.suggest.spelling) {
          for (const option of suggestion.options || []) {
            corrections.push(option.text);
          }
        }
        return [...new Set(corrections)].slice(0, 3);
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get trending searches (last 24 hours)
   */
  async getTrendingSearches(limit: number = 10, moduleId?: number): Promise<string[]> {
    try {
      let query = `
        SELECT query, COUNT(*) as count 
        FROM search_logs 
        WHERE results_count > 0
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY query 
        HAVING COUNT(*) >= 2
        ORDER BY count DESC 
        LIMIT $1
      `;
      
      const result = await this.pool.query(query, [limit]);
      return result.rows.map(r => r.query);
    } catch (error) {
      this.logger.error(`Failed to get trending searches: ${error.message}`);
      return [];
    }
  }

  /**
   * Get popular categories
   */
  async getPopularCategories(limit: number = 8, moduleId?: number): Promise<string[]> {
    try {
      const body: any = {
        size: 0,
        aggs: {
          popular_categories: {
            terms: {
              field: 'category.keyword',
              size: limit,
            },
          },
        },
      };

      if (moduleId) {
        body.query = { term: { module_id: moduleId } };
      }

      const result = await this.openSearchService.rawSearch('food_items_v4', body);
      
      if (result.aggregations?.popular_categories?.buckets) {
        return result.aggregations.popular_categories.buckets.map((b: any) => b.key);
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Failed to get popular categories: ${error.message}`);
      return [];
    }
  }

  /**
   * Track suggestion click (for ranking improvement)
   */
  async trackSuggestionClick(
    prefix: string,
    suggestion: string,
    converted: boolean = false,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO search_suggestions_cache (prefix, suggestion, click_count, conversion_count)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (prefix, suggestion) 
         DO UPDATE SET 
           click_count = search_suggestions_cache.click_count + 1,
           conversion_count = search_suggestions_cache.conversion_count + $3,
           last_used = NOW()`,
        [prefix.toLowerCase(), suggestion, converted ? 1 : 0],
      );
    } catch (error) {
      this.logger.error(`Failed to track suggestion click: ${error.message}`);
    }
  }

  /**
   * Get personalized suggestions based on user history
   */
  async getPersonalizedSuggestions(
    userId: string,
    prefix?: string,
    limit: number = 10,
  ): Promise<string[]> {
    try {
      let query: string;
      let params: any[];

      if (prefix) {
        query = `
          SELECT query, 
                 COUNT(*) as search_count,
                 MAX(created_at) as last_search
          FROM search_logs 
          WHERE user_id = $1 
            AND LOWER(query) LIKE $2
            AND results_count > 0
          GROUP BY query 
          ORDER BY search_count DESC, last_search DESC
          LIMIT $3
        `;
        params = [userId, `${prefix.toLowerCase()}%`, limit];
      } else {
        query = `
          SELECT query, 
                 COUNT(*) as search_count,
                 MAX(created_at) as last_search
          FROM search_logs 
          WHERE user_id = $1 
            AND results_count > 0
            AND created_at >= NOW() - INTERVAL '30 days'
          GROUP BY query 
          ORDER BY search_count DESC, last_search DESC
          LIMIT $3
        `;
        params = [userId, limit];
      }

      const result = await this.pool.query(query, params);
      return result.rows.map(r => r.query);
    } catch (error) {
      this.logger.error(`Failed to get personalized suggestions: ${error.message}`);
      return [];
    }
  }
}
