import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * Behavioral Analytics Service
 * 
 * Analyzes implicit user behavior signals to build richer profiles:
 * - Purchase patterns (time, frequency, basket size)
 * - RFM (Recency-Frequency-Monetary) scoring
 * - Browse vs Buy ratio
 * - Category affinity scores
 * - Session engagement metrics
 */

export interface RFMScore {
  recency: number;      // Days since last purchase (lower is better)
  frequency: number;    // Purchase count in period
  monetary: number;     // Average order value
  recencyScore: number; // 1-5 score
  frequencyScore: number; // 1-5 score
  monetaryScore: number; // 1-5 score
  segment: CustomerSegment;
}

export type CustomerSegment = 
  | 'champion'        // 555 - Best customers
  | 'loyal'           // High frequency
  | 'potential_loyalist' // Recent with growing frequency
  | 'new_customer'    // Very recent, low frequency
  | 'promising'       // Recent, medium value
  | 'need_attention'  // Above average but slipping
  | 'about_to_sleep'  // Below average, haven't purchased recently
  | 'at_risk'         // Were good, now inactive
  | 'hibernating'     // Low scores across board
  | 'lost';           // Haven't purchased in very long time

export interface PurchasePattern {
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'mixed';
  preferredDayOfWeek: string; // e.g., 'weekend', 'weekday', 'monday'
  averageBasketSize: number;
  averageOrderValue: number;
  orderFrequencyDays: number; // Average days between orders
  lastOrderDaysAgo: number;
  peakOrderHour: number;
  categoryBreakdown: { [category: string]: number }; // % of orders per category
}

export interface EngagementMetrics {
  searchToClickRatio: number;     // How often searches lead to clicks
  clickToCartRatio: number;       // How often clicks lead to cart adds
  cartToOrderRatio: number;       // Cart abandonment inverse
  averageSessionDuration: number; // Minutes
  sessionsPerWeek: number;
  browseOnlyRate: number;         // Sessions with no purchase
  repeatItemRate: number;         // How often they reorder same items
}

export interface CategoryAffinity {
  categoryId: number;
  categoryName: string;
  affinityScore: number;     // 0-100
  purchaseCount: number;
  viewCount: number;
  conversionRate: number;    // view to purchase ratio
  averageSpend: number;
  lastPurchased: Date | null;
}

@Injectable()
export class BehavioralAnalyticsService {
  private readonly logger = new Logger(BehavioralAnalyticsService.name);
  private pool: Pool;

  constructor() {
    this.initializePool();
  }

  private async initializePool() {
    const databaseUrl = process.env.DATABASE_URL || 
      'postgresql://mangwale_config:config_secure_pass_2024@localhost:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.logger.log('✅ BehavioralAnalyticsService initialized');
  }

  /**
   * Calculate RFM score for a user
   */
  async calculateRFMScore(userId: number, periodDays: number = 90): Promise<RFMScore | null> {
    try {
      // Get order history from PHP backend data
      const orderStats = await this.pool.query(`
        SELECT 
          COUNT(*) as order_count,
          SUM(COALESCE((order_data->>'total')::numeric, 0)) as total_spent,
          MAX(created_at) as last_order_date,
          AVG(COALESCE((order_data->>'total')::numeric, 0)) as avg_order_value
        FROM user_orders
        WHERE user_id = $1 
          AND created_at >= NOW() - INTERVAL '${periodDays} days'
          AND status NOT IN ('cancelled', 'failed')
      `, [userId]);

      if (!orderStats.rows[0] || orderStats.rows[0].order_count === 0) {
        // Check if user has any orders at all
        const anyOrders = await this.pool.query(
          `SELECT MAX(created_at) as last_order FROM user_orders WHERE user_id = $1`,
          [userId]
        );
        
        if (!anyOrders.rows[0]?.last_order) {
          return null; // Never ordered
        }

        const daysSinceLast = Math.floor(
          (Date.now() - new Date(anyOrders.rows[0].last_order).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          recency: daysSinceLast,
          frequency: 0,
          monetary: 0,
          recencyScore: this.scoreRecency(daysSinceLast),
          frequencyScore: 1,
          monetaryScore: 1,
          segment: daysSinceLast > 180 ? 'lost' : 'hibernating'
        };
      }

      const stats = orderStats.rows[0];
      const recency = stats.last_order_date 
        ? Math.floor((Date.now() - new Date(stats.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const frequency = parseInt(stats.order_count) || 0;
      const monetary = parseFloat(stats.avg_order_value) || 0;

      const rfm: RFMScore = {
        recency,
        frequency,
        monetary,
        recencyScore: this.scoreRecency(recency),
        frequencyScore: this.scoreFrequency(frequency, periodDays),
        monetaryScore: this.scoreMonetary(monetary),
        segment: 'new_customer' // Will be calculated below
      };

      rfm.segment = this.determineSegment(rfm);

      return rfm;
    } catch (error) {
      this.logger.error(`Failed to calculate RFM for user ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get purchase patterns for a user
   */
  async getPurchasePatterns(userId: number): Promise<PurchasePattern | null> {
    try {
      // Time of day analysis
      const timeAnalysis = await this.pool.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          EXTRACT(DOW FROM created_at) as day_of_week,
          COUNT(*) as order_count,
          AVG(COALESCE((order_data->>'item_count')::numeric, 1)) as avg_items,
          AVG(COALESCE((order_data->>'total')::numeric, 0)) as avg_value
        FROM user_orders
        WHERE user_id = $1 AND status NOT IN ('cancelled', 'failed')
        GROUP BY EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at)
        ORDER BY order_count DESC
      `, [userId]);

      if (timeAnalysis.rows.length === 0) {
        return null;
      }

      // Calculate preferred times
      const hourCounts: { [hour: number]: number } = {};
      const dayCounts: { [day: number]: number } = {};
      let totalOrders = 0;
      let totalItems = 0;
      let totalValue = 0;

      for (const row of timeAnalysis.rows) {
        const hour = parseInt(row.hour);
        const day = parseInt(row.day_of_week);
        const count = parseInt(row.order_count);
        
        hourCounts[hour] = (hourCounts[hour] || 0) + count;
        dayCounts[day] = (dayCounts[day] || 0) + count;
        totalOrders += count;
        totalItems += parseFloat(row.avg_items) * count;
        totalValue += parseFloat(row.avg_value) * count;
      }

      const peakHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)[0];
      const peakDay = Object.entries(dayCounts)
        .sort(([,a], [,b]) => b - a)[0];

      // Get order frequency
      const frequencyResult = await this.pool.query(`
        SELECT 
          AVG(days_between) as avg_days_between,
          COUNT(*) as total_orders,
          MAX(created_at) as last_order
        FROM (
          SELECT 
            created_at,
            EXTRACT(DAY FROM created_at - LAG(created_at) OVER (ORDER BY created_at)) as days_between
          FROM user_orders
          WHERE user_id = $1 AND status NOT IN ('cancelled', 'failed')
        ) sub
      `, [userId]);

      // Get category breakdown
      const categoryResult = await this.pool.query(`
        SELECT 
          COALESCE(order_data->>'category', 'unknown') as category,
          COUNT(*) as order_count
        FROM user_orders
        WHERE user_id = $1 AND status NOT IN ('cancelled', 'failed')
        GROUP BY order_data->>'category'
        ORDER BY order_count DESC
      `, [userId]);

      const categoryBreakdown: { [category: string]: number } = {};
      for (const row of categoryResult.rows) {
        categoryBreakdown[row.category] = (parseInt(row.order_count) / totalOrders) * 100;
      }

      const peakHourNum = parseInt(peakHour?.[0] || '12');
      const preferredTimeOfDay = 
        peakHourNum >= 5 && peakHourNum < 12 ? 'morning' :
        peakHourNum >= 12 && peakHourNum < 17 ? 'afternoon' :
        peakHourNum >= 17 && peakHourNum < 21 ? 'evening' : 'night';

      const preferredDayNum = parseInt(peakDay?.[0] || '0');
      const preferredDayOfWeek = 
        preferredDayNum === 0 || preferredDayNum === 6 ? 'weekend' :
        ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][preferredDayNum];

      const freq = frequencyResult.rows[0];
      const lastOrderDays = freq?.last_order 
        ? Math.floor((Date.now() - new Date(freq.last_order).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        preferredTimeOfDay,
        preferredDayOfWeek,
        averageBasketSize: totalItems / totalOrders,
        averageOrderValue: totalValue / totalOrders,
        orderFrequencyDays: parseFloat(freq?.avg_days_between) || 30,
        lastOrderDaysAgo: lastOrderDays,
        peakOrderHour: peakHourNum,
        categoryBreakdown
      };
    } catch (error) {
      this.logger.error(`Failed to get purchase patterns: ${error.message}`);
      return null;
    }
  }

  /**
   * Get engagement metrics for a user
   */
  async getEngagementMetrics(userId: number): Promise<EngagementMetrics | null> {
    try {
      // Get search to click stats
      const searchStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_searches,
          SUM(total_clicks) as total_clicks,
          SUM(total_conversions) as total_conversions
        FROM user_search_patterns
        WHERE user_id = $1
      `, [userId]);

      // Get item interaction stats
      const interactionStats = await this.pool.query(`
        SELECT 
          SUM(viewed_count) as total_views,
          SUM(clicked_count) as total_clicks,
          SUM(ordered_count) as total_orders,
          COUNT(DISTINCT item_id) as unique_items,
          COUNT(DISTINCT CASE WHEN ordered_count > 1 THEN item_id END) as repeat_items
        FROM user_item_interactions
        WHERE user_id = $1
      `, [userId]);

      // Get session stats from profile
      const profileStats = await this.pool.query(`
        SELECT 
          total_conversations,
          total_searches,
          total_orders
        FROM user_profiles
        WHERE user_id = $1
      `, [userId]);

      const search = searchStats.rows[0] || {};
      const interact = interactionStats.rows[0] || {};
      const profile = profileStats.rows[0] || {};

      const totalSearches = parseInt(search.total_searches) || 1;
      const totalClicks = parseInt(search.total_clicks) || 0;
      const totalViews = parseInt(interact.total_views) || 1;
      const totalOrders = parseInt(interact.total_orders) || 0;
      const uniqueItems = parseInt(interact.unique_items) || 1;
      const repeatItems = parseInt(interact.repeat_items) || 0;
      const totalConversations = parseInt(profile.total_conversations) || 1;

      return {
        searchToClickRatio: totalClicks / totalSearches,
        clickToCartRatio: 0.5, // Would need cart data
        cartToOrderRatio: 0.7, // Would need cart abandonment data
        averageSessionDuration: 5, // Would need session tracking
        sessionsPerWeek: totalConversations / 4,
        browseOnlyRate: Math.max(0, 1 - (totalOrders / totalConversations)),
        repeatItemRate: repeatItems / uniqueItems
      };
    } catch (error) {
      this.logger.error(`Failed to get engagement metrics: ${error.message}`);
      return null;
    }
  }

  /**
   * Get category affinity scores
   */
  async getCategoryAffinities(userId: number, limit: number = 10): Promise<CategoryAffinity[]> {
    try {
      const result = await this.pool.query(`
        WITH category_stats AS (
          SELECT 
            COALESCE(order_data->>'category_id', '0')::int as category_id,
            COALESCE(order_data->>'category', 'unknown') as category_name,
            COUNT(*) as purchase_count,
            AVG(COALESCE((order_data->>'total')::numeric, 0)) as avg_spend,
            MAX(created_at) as last_purchased
          FROM user_orders
          WHERE user_id = $1 AND status NOT IN ('cancelled', 'failed')
          GROUP BY order_data->>'category_id', order_data->>'category'
        ),
        view_stats AS (
          SELECT 
            COALESCE((item_data->>'category_id')::int, 0) as category_id,
            SUM(viewed_count) as view_count
          FROM user_item_interactions uii
          LEFT JOIN LATERAL (
            SELECT item_data FROM item_cache WHERE item_id = uii.item_id LIMIT 1
          ) ic ON true
          WHERE user_id = $1
          GROUP BY (item_data->>'category_id')::int
        )
        SELECT 
          cs.category_id,
          cs.category_name,
          cs.purchase_count,
          cs.avg_spend,
          cs.last_purchased,
          COALESCE(vs.view_count, 0) as view_count,
          CASE 
            WHEN COALESCE(vs.view_count, 0) > 0 
            THEN cs.purchase_count::float / vs.view_count * 100
            ELSE 0 
          END as conversion_rate,
          -- Affinity score: weighted combination of purchase frequency, spend, and recency
          (
            cs.purchase_count * 10 +
            (cs.avg_spend / 100) * 5 +
            CASE 
              WHEN cs.last_purchased > NOW() - INTERVAL '7 days' THEN 30
              WHEN cs.last_purchased > NOW() - INTERVAL '30 days' THEN 20
              WHEN cs.last_purchased > NOW() - INTERVAL '90 days' THEN 10
              ELSE 0
            END
          ) as affinity_score
        FROM category_stats cs
        LEFT JOIN view_stats vs ON cs.category_id = vs.category_id
        ORDER BY affinity_score DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows.map(row => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        affinityScore: Math.min(100, row.affinity_score),
        purchaseCount: row.purchase_count,
        viewCount: row.view_count,
        conversionRate: row.conversion_rate,
        averageSpend: row.avg_spend,
        lastPurchased: row.last_purchased
      }));
    } catch (error) {
      this.logger.error(`Failed to get category affinities: ${error.message}`);
      return [];
    }
  }

  /**
   * Update user profile with behavioral analytics
   */
  async updateProfileWithBehavior(userId: number): Promise<void> {
    try {
      const [rfm, patterns, engagement] = await Promise.all([
        this.calculateRFMScore(userId),
        this.getPurchasePatterns(userId),
        this.getEngagementMetrics(userId)
      ]);

      const updates: any = {
        behavioral_updated_at: new Date()
      };

      if (rfm) {
        updates.rfm_segment = rfm.segment;
        updates.rfm_score = `${rfm.recencyScore}${rfm.frequencyScore}${rfm.monetaryScore}`;
      }

      if (patterns) {
        updates.preferred_order_time = patterns.preferredTimeOfDay;
        updates.avg_basket_size = patterns.averageBasketSize;
        updates.avg_order_value = patterns.averageOrderValue;
        updates.order_frequency_days = patterns.orderFrequencyDays;
      }

      if (engagement) {
        updates.search_to_click_ratio = engagement.searchToClickRatio;
        updates.repeat_item_rate = engagement.repeatItemRate;
        updates.browse_only_rate = engagement.browseOnlyRate;
      }

      // Build update query
      const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`);
      const values = [userId, ...Object.values(updates)];

      await this.pool.query(
        `UPDATE user_profiles SET ${setClauses.join(', ')} WHERE user_id = $1`,
        values
      );

      this.logger.debug(`Updated behavioral analytics for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update behavioral profile: ${error.message}`);
    }
  }

  /**
   * Get full behavioral profile for personalization
   */
  async getFullBehavioralProfile(userId: number): Promise<{
    rfm: RFMScore | null;
    patterns: PurchasePattern | null;
    engagement: EngagementMetrics | null;
    affinities: CategoryAffinity[];
  }> {
    const [rfm, patterns, engagement, affinities] = await Promise.all([
      this.calculateRFMScore(userId),
      this.getPurchasePatterns(userId),
      this.getEngagementMetrics(userId),
      this.getCategoryAffinities(userId)
    ]);

    return { rfm, patterns, engagement, affinities };
  }

  // ===================================
  // Private Scoring Methods
  // ===================================

  private scoreRecency(days: number): number {
    if (days <= 7) return 5;
    if (days <= 14) return 4;
    if (days <= 30) return 3;
    if (days <= 60) return 2;
    return 1;
  }

  private scoreFrequency(count: number, periodDays: number): number {
    const ordersPerMonth = (count / periodDays) * 30;
    if (ordersPerMonth >= 8) return 5;  // 2+ orders/week
    if (ordersPerMonth >= 4) return 4;  // 1 order/week
    if (ordersPerMonth >= 2) return 3;  // 2 orders/month
    if (ordersPerMonth >= 1) return 2;  // 1 order/month
    return 1;
  }

  private scoreMonetary(avgValue: number): number {
    if (avgValue >= 500) return 5;
    if (avgValue >= 300) return 4;
    if (avgValue >= 200) return 3;
    if (avgValue >= 100) return 2;
    return 1;
  }

  private determineSegment(rfm: RFMScore): CustomerSegment {
    const { recencyScore: r, frequencyScore: f, monetaryScore: m } = rfm;
    const score = r * 100 + f * 10 + m;

    // Champion: Recent, frequent, high spenders
    if (r >= 4 && f >= 4 && m >= 4) return 'champion';
    
    // Loyal: Frequent buyers
    if (f >= 4) return 'loyal';
    
    // Potential Loyalist: Recent with decent frequency
    if (r >= 4 && f >= 2 && f < 4) return 'potential_loyalist';
    
    // New Customer: Very recent, single purchase
    if (r >= 4 && f <= 2) return 'new_customer';
    
    // Promising: Recent, medium value
    if (r >= 3 && m >= 3) return 'promising';
    
    // Need Attention: Were good, slipping
    if (r >= 2 && r < 4 && f >= 3) return 'need_attention';
    
    // About to Sleep: Below average across board
    if (r >= 2 && r < 4 && f >= 2 && f < 4) return 'about_to_sleep';
    
    // At Risk: Were champions/loyal, now inactive
    if (r < 2 && (f >= 4 || m >= 4)) return 'at_risk';
    
    // Hibernating: Low engagement
    if (r < 3 && f < 3) return 'hibernating';
    
    // Lost: Very old, no engagement
    return 'lost';
  }

  /**
   * Get recommended actions based on segment
   */
  getSegmentActions(segment: CustomerSegment): string[] {
    const actions: { [key in CustomerSegment]: string[] } = {
      champion: [
        'Offer exclusive early access to new products',
        'Invite to loyalty program VIP tier',
        'Ask for reviews and referrals'
      ],
      loyal: [
        'Upsell premium products',
        'Offer bundle deals',
        'Send personalized recommendations'
      ],
      potential_loyalist: [
        'Offer membership benefits',
        'Send targeted promotions',
        'Encourage frequent purchases with rewards'
      ],
      new_customer: [
        'Welcome with first-order discount',
        'Showcase best sellers',
        'Educational content about products'
      ],
      promising: [
        'Create brand awareness',
        'Offer free trial of premium features',
        'Category-specific promotions'
      ],
      need_attention: [
        'Send re-engagement campaign',
        'Offer special "we miss you" discount',
        'Survey for feedback'
      ],
      about_to_sleep: [
        'Time-limited offers',
        'Share popular products',
        'Recommend based on past purchases'
      ],
      at_risk: [
        'Win-back campaign with strong incentive',
        'Personal outreach',
        'Exclusive comeback offer'
      ],
      hibernating: [
        'Reactivation campaign',
        'Show what\'s new since last visit',
        'Deep discount to re-engage'
      ],
      lost: [
        'Survey to understand why they left',
        'Aggressive win-back offer',
        'Consider removing from active campaigns'
      ]
    };

    return actions[segment] || [];
  }
}
