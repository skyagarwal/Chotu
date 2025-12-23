import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

/**
 * 🎯 Product Recommendation Engine
 * 
 * AI-powered recommendations based on:
 * - User purchase history
 * - Browse behavior
 * - Similar users (collaborative filtering)
 * - Product attributes (content-based filtering)
 * - Contextual signals (time, location, weather)
 * 
 * Recommendation Types:
 * - "You might also like" (similar products)
 * - "Frequently bought together" (bundle)
 * - "Based on your history" (personalized)
 * - "Trending now" (popular)
 * - "New arrivals" (recency)
 * - "Best sellers" (top rated)
 */

export interface RecommendationRequest {
  userId?: string;
  sessionId?: string;
  productId?: string;
  categoryId?: string;
  moduleId?: number;
  limit?: number;
  context?: {
    timeOfDay?: string; // breakfast, lunch, dinner, snack
    dayOfWeek?: string;
    weather?: string;
    location?: { lat: number; lng: number };
  };
}

export interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  storeId: number;
  storeName?: string;
  rating?: number;
  category?: string;
  score: number; // Recommendation score
  reason: string; // Why recommended
}

export interface RecommendationResult {
  products: RecommendedProduct[];
  type: string;
  query?: string;
}

@Injectable()
export class RecommendationEngineService implements OnModuleInit {
  private readonly logger = new Logger(RecommendationEngineService.name);
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('🎯 RecommendationEngineService initializing...');
  }

  async onModuleInit() {
    const databaseUrl = this.configService.get('DATABASE_URL') ||
      'postgresql://mangwale_config:config_secure_pass_2024@mangwale_postgres:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    try {
      // Create recommendations tracking tables
      const client = await this.pool.connect();
      
      await client.query(`
        -- User product interactions for collaborative filtering
        CREATE TABLE IF NOT EXISTS user_product_interactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(100) NOT NULL,
          product_id VARCHAR(100) NOT NULL,
          interaction_type VARCHAR(50) NOT NULL, -- view, add_to_cart, purchase, review
          interaction_score FLOAT DEFAULT 1.0,
          session_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, product_id, interaction_type)
        );
        
        CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_product_interactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_interactions_product ON user_product_interactions(product_id);
        CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_product_interactions(interaction_type);

        -- Product similarities for content-based filtering
        CREATE TABLE IF NOT EXISTS product_similarities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id_1 VARCHAR(100) NOT NULL,
          product_id_2 VARCHAR(100) NOT NULL,
          similarity_score FLOAT NOT NULL,
          similarity_type VARCHAR(50) DEFAULT 'content', -- content, collaborative, co-purchase
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(product_id_1, product_id_2, similarity_type)
        );
        
        CREATE INDEX IF NOT EXISTS idx_similarities_product1 ON product_similarities(product_id_1);

        -- Recommendation feedback for improving model
        CREATE TABLE IF NOT EXISTS recommendation_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(100),
          session_id VARCHAR(100),
          product_id VARCHAR(100) NOT NULL,
          recommendation_type VARCHAR(50) NOT NULL,
          action VARCHAR(50) NOT NULL, -- shown, clicked, purchased, dismissed
          position INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_feedback_user ON recommendation_feedback(user_id);
      `);
      
      client.release();
      this.logger.log('✅ RecommendationEngineService initialized');
    } catch (error: any) {
      this.logger.error(`❌ Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResult> {
    const { userId, limit = 10, moduleId } = request;

    if (!userId) {
      return this.getTrendingProducts(request);
    }

    try {
      // Get user's recent interactions
      const interactions = await this.pool.query(
        `SELECT product_id, interaction_type, interaction_score 
         FROM user_product_interactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId],
      );

      if (interactions.rows.length === 0) {
        return this.getTrendingProducts(request);
      }

      // Get products similar to user's interactions
      const productIds = interactions.rows.map(r => r.product_id);
      
      const similar = await this.pool.query(
        `SELECT ps.product_id_2 as product_id, 
                AVG(ps.similarity_score) as avg_score
         FROM product_similarities ps
         WHERE ps.product_id_1 = ANY($1)
           AND ps.product_id_2 NOT IN (SELECT product_id FROM user_product_interactions WHERE user_id = $2)
         GROUP BY ps.product_id_2
         ORDER BY avg_score DESC
         LIMIT $3`,
        [productIds, userId, limit],
      );

      // Would join with products table to get full product info
      // For now, return product IDs with scores
      const products: RecommendedProduct[] = similar.rows.map((row, idx) => ({
        id: row.product_id,
        name: `Product ${row.product_id}`, // Would come from products table
        price: 0,
        storeId: 0,
        score: parseFloat(row.avg_score),
        reason: 'Based on your browsing history',
      }));

      return {
        products,
        type: 'personalized',
      };
    } catch (error: any) {
      this.logger.error(`Personalized recommendations failed: ${error.message}`);
      return this.getTrendingProducts(request);
    }
  }

  /**
   * Get similar products (content-based)
   */
  async getSimilarProducts(
    request: RecommendationRequest,
  ): Promise<RecommendationResult> {
    const { productId, limit = 6 } = request;

    if (!productId) {
      return { products: [], type: 'similar' };
    }

    try {
      const result = await this.pool.query(
        `SELECT product_id_2 as product_id, similarity_score
         FROM product_similarities
         WHERE product_id_1 = $1
         ORDER BY similarity_score DESC
         LIMIT $2`,
        [productId, limit],
      );

      const products: RecommendedProduct[] = result.rows.map(row => ({
        id: row.product_id,
        name: `Product ${row.product_id}`,
        price: 0,
        storeId: 0,
        score: parseFloat(row.similarity_score),
        reason: 'Similar to what you viewed',
      }));

      return {
        products,
        type: 'similar',
      };
    } catch (error: any) {
      this.logger.error(`Similar products failed: ${error.message}`);
      return { products: [], type: 'similar' };
    }
  }

  /**
   * Get frequently bought together products
   */
  async getFrequentlyBoughtTogether(
    request: RecommendationRequest,
  ): Promise<RecommendationResult> {
    const { productId, limit = 4 } = request;

    if (!productId) {
      return { products: [], type: 'bundle' };
    }

    try {
      const result = await this.pool.query(
        `SELECT product_id_2 as product_id, similarity_score
         FROM product_similarities
         WHERE product_id_1 = $1 
           AND similarity_type = 'co-purchase'
         ORDER BY similarity_score DESC
         LIMIT $2`,
        [productId, limit],
      );

      const products: RecommendedProduct[] = result.rows.map(row => ({
        id: row.product_id,
        name: `Product ${row.product_id}`,
        price: 0,
        storeId: 0,
        score: parseFloat(row.similarity_score),
        reason: 'Frequently bought together',
      }));

      return {
        products,
        type: 'bundle',
      };
    } catch (error: any) {
      this.logger.error(`Frequently bought together failed: ${error.message}`);
      return { products: [], type: 'bundle' };
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(
    request: RecommendationRequest,
  ): Promise<RecommendationResult> {
    const { limit = 10, moduleId } = request;

    try {
      // Get products with most interactions in last 24 hours
      const result = await this.pool.query(
        `SELECT product_id, COUNT(*) as interaction_count,
                SUM(CASE WHEN interaction_type = 'purchase' THEN 5 
                         WHEN interaction_type = 'add_to_cart' THEN 3 
                         WHEN interaction_type = 'view' THEN 1 
                         ELSE 1 END) as weighted_score
         FROM user_product_interactions
         WHERE created_at >= NOW() - INTERVAL '24 hours'
         GROUP BY product_id
         ORDER BY weighted_score DESC
         LIMIT $1`,
        [limit],
      );

      const products: RecommendedProduct[] = result.rows.map(row => ({
        id: row.product_id,
        name: `Product ${row.product_id}`,
        price: 0,
        storeId: 0,
        score: parseFloat(row.weighted_score),
        reason: 'Trending now',
      }));

      return {
        products,
        type: 'trending',
      };
    } catch (error: any) {
      this.logger.error(`Trending products failed: ${error.message}`);
      return { products: [], type: 'trending' };
    }
  }

  /**
   * Get contextual recommendations (time, weather, etc.)
   */
  async getContextualRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResult> {
    const { context, limit = 8, moduleId } = request;

    if (!context) {
      return this.getTrendingProducts(request);
    }

    // Map time of day to meal categories (for food module)
    let categories: string[] = [];
    const hour = new Date().getHours();

    if (moduleId === 1) { // Food module
      if (hour >= 6 && hour < 11) {
        categories = ['Breakfast', 'Coffee', 'Tea', 'Paratha', 'Poha'];
      } else if (hour >= 11 && hour < 15) {
        categories = ['Lunch', 'Thali', 'Biryani', 'Rice', 'Dal'];
      } else if (hour >= 15 && hour < 18) {
        categories = ['Snacks', 'Samosa', 'Tea', 'Coffee', 'Sandwich'];
      } else if (hour >= 18 && hour < 22) {
        categories = ['Dinner', 'Biryani', 'Curry', 'Roti', 'Thali'];
      } else {
        categories = ['Late Night', 'Dessert', 'Ice Cream', 'Fast Food'];
      }
    }

    // This would query products with these categories
    // For now, return mock data
    return {
      products: [],
      type: 'contextual',
      query: categories.join(', '),
    };
  }

  /**
   * Track user-product interaction
   */
  async trackInteraction(
    userId: string,
    productId: string,
    interactionType: 'view' | 'add_to_cart' | 'purchase' | 'review',
    sessionId?: string,
  ): Promise<void> {
    // Score different interactions
    const scores: Record<string, number> = {
      view: 1,
      add_to_cart: 3,
      purchase: 5,
      review: 4,
    };

    try {
      await this.pool.query(
        `INSERT INTO user_product_interactions 
         (user_id, product_id, interaction_type, interaction_score, session_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, product_id, interaction_type) 
         DO UPDATE SET interaction_score = user_product_interactions.interaction_score + $4,
                       created_at = NOW()`,
        [userId, productId, interactionType, scores[interactionType] || 1, sessionId],
      );
    } catch (error: any) {
      this.logger.error(`Failed to track interaction: ${error.message}`);
    }
  }

  /**
   * Track recommendation feedback
   */
  async trackRecommendationFeedback(
    userId: string | null,
    sessionId: string | null,
    productId: string,
    recommendationType: string,
    action: 'shown' | 'clicked' | 'purchased' | 'dismissed',
    position?: number,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO recommendation_feedback 
         (user_id, session_id, product_id, recommendation_type, action, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, sessionId, productId, recommendationType, action, position],
      );
    } catch (error: any) {
      this.logger.error(`Failed to track feedback: ${error.message}`);
    }
  }

  /**
   * Update product similarities (should run periodically)
   */
  async updateSimilarities(): Promise<void> {
    try {
      // Calculate co-purchase similarities
      await this.pool.query(`
        INSERT INTO product_similarities (product_id_1, product_id_2, similarity_score, similarity_type)
        SELECT 
          a.product_id as product_id_1,
          b.product_id as product_id_2,
          COUNT(DISTINCT a.user_id)::float / 
            (SQRT(COUNT(DISTINCT CASE WHEN a.product_id = a.product_id THEN a.user_id END)) * 
             SQRT(COUNT(DISTINCT CASE WHEN b.product_id = b.product_id THEN b.user_id END))) as similarity,
          'co-purchase'
        FROM user_product_interactions a
        JOIN user_product_interactions b 
          ON a.user_id = b.user_id 
          AND a.product_id != b.product_id
          AND a.interaction_type = 'purchase'
          AND b.interaction_type = 'purchase'
        GROUP BY a.product_id, b.product_id
        HAVING COUNT(DISTINCT a.user_id) >= 2
        ON CONFLICT (product_id_1, product_id_2, similarity_type) 
        DO UPDATE SET similarity_score = EXCLUDED.similarity_score, updated_at = NOW()
      `);

      this.logger.log('✅ Product similarities updated');
    } catch (error: any) {
      this.logger.error(`Failed to update similarities: ${error.message}`);
    }
  }

  /**
   * Get recommendation stats
   */
  async getStats(): Promise<{
    totalInteractions: number;
    uniqueUsers: number;
    avgClickRate: number;
    topRecommendationTypes: Array<{ type: string; count: number }>;
  }> {
    try {
      const interactions = await this.pool.query(
        `SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as users 
         FROM user_product_interactions`,
      );

      const feedback = await this.pool.query(
        `SELECT recommendation_type, 
                COUNT(*) FILTER (WHERE action = 'clicked') as clicks,
                COUNT(*) FILTER (WHERE action = 'shown') as shown
         FROM recommendation_feedback
         WHERE created_at >= NOW() - INTERVAL '7 days'
         GROUP BY recommendation_type`,
      );

      const avgClickRate = feedback.rows.length > 0
        ? feedback.rows.reduce((sum, r) => sum + (r.clicks / (r.shown || 1)), 0) / feedback.rows.length
        : 0;

      return {
        totalInteractions: parseInt(interactions.rows[0]?.total || '0'),
        uniqueUsers: parseInt(interactions.rows[0]?.users || '0'),
        avgClickRate: parseFloat((avgClickRate * 100).toFixed(2)),
        topRecommendationTypes: feedback.rows.map(r => ({
          type: r.recommendation_type,
          count: parseInt(r.shown),
        })),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      return {
        totalInteractions: 0,
        uniqueUsers: 0,
        avgClickRate: 0,
        topRecommendationTypes: [],
      };
    }
  }
}
