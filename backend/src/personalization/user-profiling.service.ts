import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { ConversationAnalyzerService, ConversationAnalysis, MessageInsight } from './conversation-analyzer.service';

/**
 * User Profiling Service
 * 
 * Builds and maintains comprehensive user profiles from:
 * - Conversation history analysis
 * - Search behavior
 * - Order history
 * - Item interactions
 * 
 * Uses this data to personalize search results and recommendations
 */
@Injectable()
export class UserProfilingService {
  private readonly logger = new Logger(UserProfilingService.name);
  private pool: Pool;

  constructor(
    private readonly conversationAnalyzer: ConversationAnalyzerService
  ) {
    this.initializePool();
  }

  private async initializePool() {
    const databaseUrl = process.env.DATABASE_URL || 
      'postgresql://mangwale_config:config_secure_pass_2024@localhost:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.logger.log('✅ User Profiling Service initialized');
  }

  /**
   * Get or create user profile
   */
  async getProfile(userId: number): Promise<UserProfile | null> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM user_profiles WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToProfile(result.rows[0]);
    } catch (error) {
      this.logger.error(`Failed to get profile for user ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Build/update user profile from conversation analysis
   */
  async updateProfileFromConversation(params: {
    userId: number;
    phone: string;
    conversationHistory: Array<{ role: string; content: string }>;
    sessionId?: string;
  }): Promise<void> {
    try {
      // Analyze conversation
      const analysis = await this.conversationAnalyzer.analyzeConversation({
        userId: params.userId,
        phone: params.phone,
        conversationHistory: params.conversationHistory
      });

      // Get existing profile or create new one
      let profile = await this.getProfile(params.userId);

      if (!profile) {
        // Create new profile
        await this.createProfile(params.userId, params.phone);
        profile = await this.getProfile(params.userId);
      }

      // Update profile with analysis results
      await this.mergeAnalysisIntoProfile(params.userId, analysis);

      // Store insights
      await this.storeConversationInsights(params.userId, analysis, params.sessionId);

      // Update conversation memory
      await this.updateConversationMemory(params.userId, analysis, params.sessionId);

      this.logger.log(`✅ Updated profile for user ${params.userId} from conversation`);

    } catch (error) {
      this.logger.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record message insights in real-time
   */
  async recordMessageInsights(params: {
    userId: number;
    messageText: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      const insights = await this.conversationAnalyzer.extractMessageInsights({
        userId: params.userId,
        messageText: params.messageText
      });

      // Store each insight
      for (const insight of insights) {
        await this.pool.query(
          `INSERT INTO conversation_insights 
           (user_id, session_id, insight_type, insight_category, text_excerpt, extracted_value, confidence, analyzed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            params.userId,
            params.sessionId,
            insight.type,
            insight.category,
            insight.textExcerpt,
            JSON.stringify(insight.value),
            insight.confidence,
            'rule_based'
          ]
        );
      }

      // Apply high-confidence insights immediately to profile
      const highConfidenceInsights = insights.filter(i => i.confidence > 0.8);
      if (highConfidenceInsights.length > 0) {
        await this.applyInsightsToProfile(params.userId, highConfidenceInsights);
      }

    } catch (error) {
      this.logger.error(`Failed to record insights: ${error.message}`);
    }
  }

  /**
   * Track user search pattern
   */
  async trackSearch(params: {
    userId: number;
    query: string;
    module: string;
    clickedItemId?: number;
    converted?: boolean;
  }): Promise<void> {
    try {
      const normalized = params.query.trim().toLowerCase();

      // Update or insert search pattern
      await this.pool.query(
        `INSERT INTO user_search_patterns 
         (user_id, query_text, query_normalized, module, search_count, last_searched_at, first_searched_at)
         VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, query_normalized, module) 
         DO UPDATE SET 
           search_count = user_search_patterns.search_count + 1,
           last_searched_at = CURRENT_TIMESTAMP,
           total_clicks = user_search_patterns.total_clicks + CASE WHEN $5 IS NOT NULL THEN 1 ELSE 0 END,
           total_conversions = user_search_patterns.total_conversions + CASE WHEN $6 THEN 1 ELSE 0 END`,
        [params.userId, params.query, normalized, params.module, params.clickedItemId, params.converted || false]
      );

      // Update profile search count
      await this.pool.query(
        `UPDATE user_profiles 
         SET total_searches = total_searches + 1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [params.userId]
      );

    } catch (error) {
      this.logger.error(`Failed to track search: ${error.message}`);
    }
  }

  /**
   * Track item interaction (view, click, order)
   */
  async trackItemInteraction(params: {
    userId: number;
    itemId: number;
    module: string;
    interactionType: 'view' | 'click' | 'order' | 'save';
    searchQuery?: string;
  }): Promise<void> {
    try {
      const columnMap = {
        view: 'viewed_count',
        click: 'clicked_count',
        order: 'ordered_count',
        save: 'saved_count'
      };

      const column = columnMap[params.interactionType];
      const timestampColumn = params.interactionType === 'view' ? 'last_viewed_at' : 
                              params.interactionType === 'order' ? 'last_ordered_at' : null;

      let query = `
        INSERT INTO user_item_interactions 
        (user_id, item_id, module, ${column}, first_viewed_at, last_viewed_at, typical_search_query)
        VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4)
        ON CONFLICT (user_id, item_id, module) 
        DO UPDATE SET 
          ${column} = user_item_interactions.${column} + 1,
          ${timestampColumn ? `${timestampColumn} = CURRENT_TIMESTAMP,` : ''}
          typical_search_query = COALESCE($4, user_item_interactions.typical_search_query),
          updated_at = CURRENT_TIMESTAMP
      `;

      await this.pool.query(query, [params.userId, params.itemId, params.module, params.searchQuery]);

      // Update favorite items list if ordered multiple times
      if (params.interactionType === 'order') {
        await this.updateFavoriteItems(params.userId, params.itemId);
      }

    } catch (error) {
      this.logger.error(`Failed to track item interaction: ${error.message}`);
    }
  }

  /**
   * Get user's favorite items (ordered 3+ times)
   */
  async getFavoriteItems(userId: number, limit: number = 10): Promise<number[]> {
    try {
      const result = await this.pool.query(
        `SELECT item_id FROM user_item_interactions 
         WHERE user_id = $1 AND ordered_count >= 3
         ORDER BY ordered_count DESC, last_ordered_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(r => r.item_id);
    } catch (error) {
      this.logger.error(`Failed to get favorite items: ${error.message}`);
      return [];
    }
  }

  /**
   * Get personalization boosts for search
   */
  async getPersonalizationBoosts(userId: number, module: string): Promise<PersonalizationBoosts> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) {
        return this.getDefaultBoosts();
      }

      const boosts: PersonalizationBoosts = {
        itemBoosts: {},
        categoryBoosts: {},
        storeBoosts: {},
        filters: {},
        sortPreference: null
      };

      // Boost favorite items (3x)
      const favoriteItems = await this.getFavoriteItems(userId);
      favoriteItems.forEach(itemId => {
        boosts.itemBoosts[itemId] = 3.0;
      });

      // Boost favorite categories (2x)
      if (profile.favorite_categories) {
        profile.favorite_categories.forEach(catId => {
          boosts.categoryBoosts[catId] = 2.0;
        });
      }

      // Boost favorite stores (2.5x)
      if (profile.favorite_stores) {
        profile.favorite_stores.forEach(storeId => {
          boosts.storeBoosts[storeId] = 2.5;
        });
      }

      // Apply dietary filters
      if (profile.food_preferences?.dietary_type === 'vegetarian') {
        boosts.filters['veg'] = true;
      }

      if (profile.dietary_restrictions) {
        boosts.filters['dietary_restrictions'] = profile.dietary_restrictions;
      }

      // Sort preference based on behavior
      if (profile.price_sensitivity === 'high') {
        boosts.sortPreference = 'price_asc';
      } else if (profile.profile_completeness > 70) {
        boosts.sortPreference = 'relevance'; // Trust our personalization
      }

      return boosts;

    } catch (error) {
      this.logger.error(`Failed to get personalization boosts: ${error.message}`);
      return this.getDefaultBoosts();
    }
  }

  /**
   * Get conversation memory for context
   */
  async getConversationMemory(userId: number, limit: number = 5): Promise<ConversationMemory[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM conversation_memory 
         WHERE user_id = $1 AND still_valid = TRUE
         ORDER BY importance DESC, recency_score DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        memoryType: row.memory_type,
        category: row.category,
        memoryText: row.memory_text,
        memoryData: row.memory_data,
        importance: row.importance,
        timesReferenced: row.times_referenced
      }));

    } catch (error) {
      this.logger.error(`Failed to get conversation memory: ${error.message}`);
      return [];
    }
  }

  // ===================================
  // Private Helper Methods
  // ===================================

  private async createProfile(userId: number, phone: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_profiles (user_id, phone) VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, phone]
    );
  }

  private async mergeAnalysisIntoProfile(userId: number, analysis: ConversationAnalysis): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (analysis.food_preferences && analysis.food_preferences.confidence > 0.6) {
      updates.push(`food_preferences = $${paramIndex++}`);
      values.push(JSON.stringify(analysis.food_preferences));
    }

    if (analysis.dietary_restrictions && analysis.dietary_restrictions.length > 0) {
      updates.push(`dietary_restrictions = $${paramIndex++}`);
      values.push(analysis.dietary_restrictions);
    }

    if (analysis.shopping_preferences && analysis.shopping_preferences.confidence > 0.6) {
      updates.push(`shopping_preferences = $${paramIndex++}`);
      values.push(JSON.stringify(analysis.shopping_preferences));
    }

    if (analysis.communication_style) {
      if (analysis.communication_style.tone) {
        updates.push(`tone = $${paramIndex++}`);
        values.push(analysis.communication_style.tone);
      }
      if (analysis.communication_style.response_style) {
        updates.push(`response_style = $${paramIndex++}`);
        values.push(analysis.communication_style.response_style);
      }
      if (analysis.communication_style.emoji_usage) {
        updates.push(`emoji_usage = $${paramIndex++}`);
        values.push(analysis.communication_style.emoji_usage);
      }
    }

    if (analysis.personality_traits) {
      updates.push(`personality_traits = $${paramIndex++}`);
      values.push(JSON.stringify(analysis.personality_traits));
    }

    if (analysis.sentiment && analysis.sentiment.satisfaction_score) {
      updates.push(`satisfaction_score = $${paramIndex++}`);
      values.push(analysis.sentiment.satisfaction_score);
    }

    updates.push(`total_conversations = total_conversations + 1`);
    updates.push(`last_analyzed_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length > 0) {
      const query = `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = $1`;
      await this.pool.query(query, values);
    }

    // Calculate and update profile completeness
    await this.updateProfileCompleteness(userId);
  }

  private async storeConversationInsights(userId: number, analysis: ConversationAnalysis, sessionId?: string): Promise<void> {
    if (analysis.extracted_facts && analysis.extracted_facts.length > 0) {
      for (const fact of analysis.extracted_facts) {
        await this.pool.query(
          `INSERT INTO conversation_insights 
           (user_id, session_id, insight_type, insight_category, text_excerpt, extracted_value, confidence, analyzed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            sessionId,
            'fact',
            fact.category,
            fact.fact,
            JSON.stringify({ importance: fact.importance }),
            0.8,
            'llm'
          ]
        );
      }
    }
  }

  private async updateConversationMemory(userId: number, analysis: ConversationAnalysis, sessionId?: string): Promise<void> {
    if (analysis.extracted_facts) {
      for (const fact of analysis.extracted_facts) {
        if (fact.importance > 60) { // Only store important facts
          await this.pool.query(
            `INSERT INTO conversation_memory 
             (user_id, memory_type, category, memory_text, memory_data, importance, recency_score, extracted_from_session)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              userId,
              'fact',
              fact.category,
              fact.fact,
              JSON.stringify(fact),
              fact.importance,
              1.0,
              sessionId
            ]
          );
        }
      }
    }
  }

  private async applyInsightsToProfile(userId: number, insights: MessageInsight[]): Promise<void> {
    for (const insight of insights) {
      if (insight.type === 'food_preference' && insight.value.preference === 'vegetarian') {
        await this.pool.query(
          `UPDATE user_profiles 
           SET food_preferences = jsonb_set(COALESCE(food_preferences, '{}'::jsonb), '{dietary_type}', '"vegetarian"')
           WHERE user_id = $1`,
          [userId]
        );
      }

      if (insight.type === 'food_preference' && insight.value.restriction) {
        await this.pool.query(
          `UPDATE user_profiles 
           SET dietary_restrictions = array_append(COALESCE(dietary_restrictions, ARRAY[]::text[]), $2)
           WHERE user_id = $1 AND NOT ($2 = ANY(COALESCE(dietary_restrictions, ARRAY[]::text[])))`,
          [userId, insight.value.restriction]
        );
      }
    }
  }

  private async updateFavoriteItems(userId: number, itemId: number): Promise<void> {
    // Add to favorites if ordered 3+ times
    const result = await this.pool.query(
      `SELECT ordered_count FROM user_item_interactions 
       WHERE user_id = $1 AND item_id = $2`,
      [userId, itemId]
    );

    if (result.rows.length > 0 && result.rows[0].ordered_count >= 3) {
      await this.pool.query(
        `UPDATE user_profiles 
         SET favorite_items = array_append(COALESCE(favorite_items, ARRAY[]::integer[]), $2)
         WHERE user_id = $1 AND NOT ($2 = ANY(COALESCE(favorite_items, ARRAY[]::integer[])))`,
        [userId, itemId]
      );
    }
  }

  private async updateProfileCompleteness(userId: number): Promise<void> {
    // Calculate completeness based on filled fields (0-100)
    const result = await this.pool.query(
      `SELECT 
         CASE WHEN food_preferences IS NOT NULL AND food_preferences != '{}'::jsonb THEN 15 ELSE 0 END +
         CASE WHEN array_length(dietary_restrictions, 1) > 0 THEN 10 ELSE 0 END +
         CASE WHEN array_length(favorite_items, 1) > 0 THEN 15 ELSE 0 END +
         CASE WHEN tone IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN personality_traits IS NOT NULL AND personality_traits != '{}'::jsonb THEN 15 ELSE 0 END +
         CASE WHEN array_length(favorite_stores, 1) > 0 THEN 10 ELSE 0 END +
         CASE WHEN shopping_preferences IS NOT NULL AND shopping_preferences != '{}'::jsonb THEN 15 ELSE 0 END +
         CASE WHEN total_conversations > 5 THEN 10 ELSE total_conversations * 2 END
         AS completeness
       FROM user_profiles WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      await this.pool.query(
        `UPDATE user_profiles SET profile_completeness = $2 WHERE user_id = $1`,
        [userId, result.rows[0].completeness]
      );
    }
  }

  private mapRowToProfile(row: any): UserProfile {
    return {
      user_id: row.user_id,
      phone: row.phone,
      food_preferences: row.food_preferences,
      dietary_restrictions: row.dietary_restrictions,
      favorite_items: row.favorite_items,
      favorite_categories: row.favorite_categories,
      favorite_stores: row.favorite_stores,
      shopping_preferences: row.shopping_preferences,
      tone: row.tone,
      language: row.language,
      response_style: row.response_style,
      emoji_usage: row.emoji_usage,
      personality_traits: row.personality_traits,
      price_sensitivity: row.price_sensitivity,
      total_conversations: row.total_conversations,
      total_orders: row.total_orders,
      total_searches: row.total_searches,
      satisfaction_score: row.satisfaction_score,
      profile_completeness: row.profile_completeness,
      confidence_score: row.confidence_score,
      last_analyzed_at: row.last_analyzed_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private getDefaultBoosts(): PersonalizationBoosts {
    return {
      itemBoosts: {},
      categoryBoosts: {},
      storeBoosts: {},
      filters: {},
      sortPreference: null
    };
  }
}

// Type Definitions
export interface UserProfile {
  user_id: number;
  phone: string;
  food_preferences?: any;
  dietary_restrictions?: string[];
  favorite_items?: number[];
  favorite_categories?: number[];
  favorite_stores?: number[];
  shopping_preferences?: any;
  tone?: string;
  language?: string;
  response_style?: string;
  emoji_usage?: string;
  personality_traits?: any;
  price_sensitivity?: string;
  total_conversations?: number;
  total_orders?: number;
  total_searches?: number;
  satisfaction_score?: number;
  profile_completeness?: number;
  confidence_score?: number;
  last_analyzed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface PersonalizationBoosts {
  itemBoosts: { [itemId: number]: number };
  categoryBoosts: { [catId: number]: number };
  storeBoosts: { [storeId: number]: number };
  filters: any;
  sortPreference: string | null;
}

export interface ConversationMemory {
  id: number;
  memoryType: string;
  category: string;
  memoryText: string;
  memoryData: any;
  importance: number;
  timesReferenced: number;
}
