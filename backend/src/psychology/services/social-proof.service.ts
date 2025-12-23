import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * Social Proof Service
 * 
 * Provides social validation signals to build trust and influence decisions:
 * - Recent purchases ("Rahul from Indore just ordered this")
 * - Rating aggregations ("4.8★ from 234 reviews")
 * - Trending items ("Trending in your area")
 * - Community signals ("Popular with vegetarians")
 * - Repeat purchase indicators ("60% of buyers reorder this")
 * 
 * All data is real - no fake reviews or inflated numbers.
 */

export interface SocialProofSignal {
  type: 'recent_order' | 'rating' | 'trending' | 'community' | 'repeat_purchase' | 'expert_pick';
  message: string;
  messageHi: string;
  strength: number; // 0-100
  data?: Record<string, any>;
}

export interface RecentOrder {
  buyerName: string;
  city: string;
  itemName: string;
  timeAgo: string;
  quantity?: number;
}

export interface RatingData {
  avgRating: number;
  totalReviews: number;
  fiveStarPercent: number;
  recentPositiveReview?: string;
}

@Injectable()
export class SocialProofService {
  private readonly logger = new Logger(SocialProofService.name);
  private pool: Pool;

  constructor() {
    this.initializePool();
  }

  private async initializePool() {
    const databaseUrl = process.env.DATABASE_URL || 
      'postgresql://mangwale_config:config_secure_pass_2024@localhost:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Get all social proof signals for an item
   */
  async getSocialProofSignals(params: {
    itemId: number;
    categoryId?: number;
    storeId?: number;
    userCity?: string;
    userDietaryType?: string;
  }): Promise<SocialProofSignal[]> {
    const signals: SocialProofSignal[] = [];

    try {
      // Get recent orders
      const recentOrders = await this.getRecentOrders(params.itemId, 5);
      if (recentOrders.length > 0) {
        signals.push(this.formatRecentOrderSignal(recentOrders[0]));
      }

      // Get rating data
      const rating = await this.getRatingData(params.itemId);
      if (rating && rating.totalReviews >= 5) {
        signals.push(this.formatRatingSignal(rating));
      }

      // Check if trending
      const trendingSignal = await this.getTrendingSignal(params.itemId, params.userCity);
      if (trendingSignal) {
        signals.push(trendingSignal);
      }

      // Community signals (dietary preference match)
      if (params.userDietaryType) {
        const communitySignal = await this.getCommunitySignal(
          params.itemId, 
          params.userDietaryType
        );
        if (communitySignal) {
          signals.push(communitySignal);
        }
      }

      // Repeat purchase rate
      const repeatSignal = await this.getRepeatPurchaseSignal(params.itemId);
      if (repeatSignal) {
        signals.push(repeatSignal);
      }

    } catch (error) {
      this.logger.error(`Failed to get social proof: ${error.message}`);
    }

    return signals.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get recent orders for an item
   */
  private async getRecentOrders(itemId: number, limit: number): Promise<RecentOrder[]> {
    try {
      // This would query actual order data
      // For now, return mock structure
      const result = await this.pool.query(`
        SELECT 
          u.name as buyer_name,
          u.city,
          o.created_at,
          o.order_data->>'item_name' as item_name,
          o.order_data->>'quantity' as quantity
        FROM user_orders o
        JOIN user_profiles u ON o.user_id = u.user_id
        WHERE o.order_data->>'item_id' = $1
          AND o.status = 'delivered'
          AND o.created_at > NOW() - INTERVAL '24 hours'
        ORDER BY o.created_at DESC
        LIMIT $2
      `, [String(itemId), limit]);

      return result.rows.map(row => ({
        buyerName: this.anonymizeName(row.buyer_name || 'Customer'),
        city: row.city || 'your area',
        itemName: row.item_name || 'this item',
        timeAgo: this.formatTimeAgo(row.created_at),
        quantity: parseInt(row.quantity) || 1,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get rating data for an item
   */
  private async getRatingData(itemId: number): Promise<RatingData | null> {
    try {
      // Would query actual review data
      const result = await this.pool.query(`
        SELECT 
          AVG(rating) as avg_rating,
          COUNT(*) as total_reviews,
          COUNT(*) FILTER (WHERE rating = 5) * 100.0 / NULLIF(COUNT(*), 0) as five_star_percent,
          (SELECT review_text FROM item_reviews 
           WHERE item_id = $1 AND rating >= 4 
           ORDER BY created_at DESC LIMIT 1) as recent_positive
        FROM item_reviews
        WHERE item_id = $1
      `, [itemId]);

      if (!result.rows[0] || !result.rows[0].total_reviews) {
        return null;
      }

      const row = result.rows[0];
      return {
        avgRating: parseFloat(row.avg_rating) || 0,
        totalReviews: parseInt(row.total_reviews) || 0,
        fiveStarPercent: parseFloat(row.five_star_percent) || 0,
        recentPositiveReview: row.recent_positive,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if item is trending
   */
  private async getTrendingSignal(itemId: number, userCity?: string): Promise<SocialProofSignal | null> {
    try {
      // Check order velocity
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as order_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour
        FROM user_orders
        WHERE order_data->>'item_id' = $1
          AND created_at > NOW() - INTERVAL '24 hours'
          AND status NOT IN ('cancelled', 'failed')
      `, [String(itemId)]);

      const { order_count, last_hour } = result.rows[0] || {};
      const orderCount = parseInt(order_count) || 0;
      const lastHour = parseInt(last_hour) || 0;

      if (lastHour >= 10) {
        return {
          type: 'trending',
          message: `🔥 Trending now! ${lastHour} orders in the last hour`,
          messageHi: `🔥 अभी Trending! पिछले 1 घंटे में ${lastHour} orders`,
          strength: 90,
          data: { lastHourOrders: lastHour },
        };
      }

      if (orderCount >= 20) {
        return {
          type: 'trending',
          message: `📈 Popular today - ${orderCount} orders`,
          messageHi: `📈 आज Popular - ${orderCount} orders`,
          strength: 75,
          data: { todayOrders: orderCount },
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get community-based signal (dietary preference match)
   */
  private async getCommunitySignal(
    itemId: number, 
    dietaryType: string
  ): Promise<SocialProofSignal | null> {
    try {
      // Check how many users with same dietary preference ordered this
      const result = await this.pool.query(`
        SELECT COUNT(DISTINCT o.user_id) as buyer_count
        FROM user_orders o
        JOIN user_profiles p ON o.user_id = p.user_id
        WHERE o.order_data->>'item_id' = $1
          AND p.food_preferences->>'dietary_type' = $2
          AND o.status = 'delivered'
      `, [String(itemId), dietaryType]);

      const buyerCount = parseInt(result.rows[0]?.buyer_count) || 0;

      if (buyerCount >= 50) {
        const dietLabel = this.getDietaryLabel(dietaryType);
        return {
          type: 'community',
          message: `❤️ Loved by ${dietLabel} - ${buyerCount}+ happy customers`,
          messageHi: `❤️ ${dietLabel} की पसंद - ${buyerCount}+ खुश customers`,
          strength: 80,
          data: { dietaryType, buyerCount },
        };
      }

      if (buyerCount >= 20) {
        const dietLabel = this.getDietaryLabel(dietaryType);
        return {
          type: 'community',
          message: `Popular with ${dietLabel}`,
          messageHi: `${dietLabel} में Popular`,
          strength: 60,
          data: { dietaryType, buyerCount },
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get repeat purchase signal
   */
  private async getRepeatPurchaseSignal(itemId: number): Promise<SocialProofSignal | null> {
    try {
      const result = await this.pool.query(`
        WITH item_buyers AS (
          SELECT user_id, COUNT(*) as order_count
          FROM user_orders
          WHERE order_data->>'item_id' = $1
            AND status = 'delivered'
          GROUP BY user_id
        )
        SELECT 
          COUNT(*) FILTER (WHERE order_count > 1) * 100.0 / NULLIF(COUNT(*), 0) as repeat_rate,
          COUNT(*) as total_buyers
        FROM item_buyers
      `, [String(itemId)]);

      const { repeat_rate, total_buyers } = result.rows[0] || {};
      const repeatRate = parseFloat(repeat_rate) || 0;
      const totalBuyers = parseInt(total_buyers) || 0;

      if (repeatRate >= 50 && totalBuyers >= 20) {
        return {
          type: 'repeat_purchase',
          message: `🔄 ${Math.round(repeatRate)}% of buyers reorder this!`,
          messageHi: `🔄 ${Math.round(repeatRate)}% buyers इसे दोबारा order करते हैं!`,
          strength: 85,
          data: { repeatRate, totalBuyers },
        };
      }

      if (repeatRate >= 30 && totalBuyers >= 10) {
        return {
          type: 'repeat_purchase',
          message: `Customers love it - high reorder rate`,
          messageHi: `Customers को पसंद है - high reorder rate`,
          strength: 65,
          data: { repeatRate, totalBuyers },
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // ===================================
  // Formatting Helpers
  // ===================================

  private formatRecentOrderSignal(order: RecentOrder): SocialProofSignal {
    return {
      type: 'recent_order',
      message: `${order.buyerName} from ${order.city} ordered ${order.timeAgo}`,
      messageHi: `${order.buyerName} ने ${order.city} से ${order.timeAgo} order किया`,
      strength: 70,
      data: order,
    };
  }

  private formatRatingSignal(rating: RatingData): SocialProofSignal {
    const stars = '⭐'.repeat(Math.round(rating.avgRating));
    return {
      type: 'rating',
      message: `${rating.avgRating.toFixed(1)}${stars} from ${rating.totalReviews} reviews`,
      messageHi: `${rating.avgRating.toFixed(1)}${stars} - ${rating.totalReviews} reviews से`,
      strength: Math.min(rating.avgRating * 20, 100),
      data: rating,
    };
  }

  private anonymizeName(fullName: string): string {
    const parts = fullName.split(' ');
    if (parts.length === 0) return 'Customer';
    
    const firstName = parts[0];
    if (firstName.length <= 2) return firstName;
    
    return `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 5) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return 'recently';
  }

  private getDietaryLabel(dietaryType: string): string {
    const labels: Record<string, string> = {
      vegetarian: 'vegetarians',
      vegan: 'vegans',
      eggetarian: 'eggetarians',
      'non-vegetarian': 'non-veg lovers',
      jain: 'Jain food lovers',
    };
    return labels[dietaryType] || 'food lovers';
  }

  /**
   * Get primary social proof for display
   */
  async getPrimarySocialProof(params: Parameters<typeof this.getSocialProofSignals>[0]): Promise<SocialProofSignal | null> {
    const signals = await this.getSocialProofSignals(params);
    return signals.length > 0 ? signals[0] : null;
  }

  /**
   * Format for conversation display
   */
  formatForConversation(signal: SocialProofSignal, language: 'en' | 'hi' = 'hi'): string {
    return language === 'hi' ? signal.messageHi : signal.message;
  }
}
