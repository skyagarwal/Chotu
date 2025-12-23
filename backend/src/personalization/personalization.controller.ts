import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { UserProfilingService } from './user-profiling.service';
import { ConversationAnalyzerService } from './conversation-analyzer.service';

/**
 * Personalization API Controller
 * 
 * Exposes endpoints for Search API and admin dashboard to:
 * 1. Get personalization boosts for search results
 * 2. Track user interactions (clicks, orders, favorites)
 * 3. Manually trigger profile analysis
 * 4. Get user profile summary
 */
@Controller('personalization')
export class PersonalizationController {
  private readonly logger = new Logger(PersonalizationController.name);

  constructor(
    private readonly userProfilingService: UserProfilingService,
    private readonly conversationAnalyzerService: ConversationAnalyzerService,
  ) {}

  /**
   * Get Personalization Boosts
   * 
   * Called by Search API to get user-specific boosting rules
   * 
   * GET /personalization/boosts?userId=123&module=food
   * 
   * Returns:
   * {
   *   userId: 123,
   *   module: 'food',
   *   filters: {
   *     veg: true,
   *     dietary_restrictions: ['no_onion', 'no_garlic']
   *   },
   *   boosts: {
   *     favoriteItems: [101, 202], // 3x boost
   *     favoriteCategories: [5], // 2x boost
   *     favoriteStores: [42] // 2.5x boost
   *   }
   * }
   */
  @Get('boosts')
  async getPersonalizationBoosts(
    @Query('userId') userId: string,
    @Query('module') module: string = 'food',
  ) {
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return { error: 'Invalid userId' };
    }

    try {
      const boosts = await this.userProfilingService.getPersonalizationBoosts(
        parsedUserId,
        module,
      );

      return {
        userId: parsedUserId,
        module,
        ...boosts,
      };
    } catch (error) {
      this.logger.error(`Failed to get boosts for user ${userId}:`, error);
      
      // Return empty boosts on error (graceful degradation)
      return {
        userId: parsedUserId,
        module,
        filters: {},
        boosts: {
          favoriteItems: [],
          favoriteCategories: [],
          favoriteStores: [],
        },
      };
    }
  }

  /**
   * Track Search Pattern
   * 
   * Called by Search API after each search to track behavior
   * 
   * POST /personalization/track/search
   * {
   *   "userId": 123,
   *   "query": "biryani",
   *   "filters": {"veg": true},
   *   "results": [101, 202, 303]
   * }
   */
  @Post('track/search')
  async trackSearch(
    @Body() body: {
      userId: number;
      query: string;
      filters?: any;
      results?: any[];
    },
  ) {
    try {
      await this.userProfilingService.trackSearch({
        userId: body.userId,
        query: body.query,
        module: 'search',
        converted: body.results && body.results.length > 0,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to track search:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track User Interaction
   * 
   * Called when user clicks, views, orders, or favorites an item
   * 
   * POST /personalization/track/interaction
   * {
   *   "userId": 123,
   *   "itemId": 101,
   *   "type": "order",
   *   "metadata": {"amount": 250}
   * }
   */
  @Post('track/interaction')
  async trackInteraction(
    @Body() body: {
      userId: number;
      itemId: number;
      type: 'click' | 'view' | 'order' | 'favorite' | 'dislike';
      metadata?: any;
    },
  ) {
    try {
      await this.userProfilingService.trackItemInteraction({
        userId: body.userId,
        itemId: body.itemId,
        module: 'search',
        interactionType: body.type === 'click' ? 'click' : body.type === 'order' ? 'order' : body.type === 'favorite' ? 'save' : 'view',
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to track interaction:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze User Profile
   * 
   * Manually trigger profile analysis for a user
   * (Normally happens automatically after conversations)
   * 
   * POST /personalization/profile/analyze?userId=123
   */
  @Post('profile/analyze')
  async analyzeProfile(@Query('userId') userId: string) {
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return { error: 'Invalid userId' };
    }

    try {
      // Get user's phone from user_tokens
      const userToken = await this.userProfilingService['prisma'].userToken.findFirst({
        where: { userId: parsedUserId },
      });

      if (!userToken) {
        return { error: 'User not found' };
      }

      // Get user profile
      const profile = await this.userProfilingService.getProfile(parsedUserId);

      if (!profile) {
        return { error: 'Profile not found' };
      }

      return {
        success: true,
        profile: {
          userId: profile.user_id,
          phone: profile.phone,
          food_preferences: profile.food_preferences,
          dietary_restrictions: profile.dietary_restrictions,
          favorite_items: profile.favorite_items,
          favorite_categories: profile.favorite_categories,
          tone: profile.tone,
          response_style: profile.response_style,
          profile_completeness: profile.profile_completeness,
          confidence_score: profile.confidence_score,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to analyze profile for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get User Profile Summary
   * 
   * Get user's current profile data
   * 
   * GET /personalization/profile?userId=123
   */
  @Get('profile')
  async getProfile(@Query('userId') userId: string) {
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return { error: 'Invalid userId' };
    }

    try {
      const profile = await this.userProfilingService['prisma'].userProfile.findUnique({
        where: { user_id: parsedUserId },
      });

      if (!profile) {
        return { error: 'Profile not found' };
      }

      return {
        userId: profile.user_id,
        phone: profile.phone,
        dietary_type: profile.dietary_type,
        dietary_restrictions: profile.dietary_restrictions,
        favorite_cuisines: profile.favorite_cuisines,
        disliked_ingredients: profile.disliked_ingredients,
        allergies: profile.allergies,
        price_sensitivity: profile.price_sensitivity,
        communication_tone: profile.communication_tone,
        personality_traits: profile.personality_traits,
        profile_completeness: profile.profile_completeness,
        last_updated: profile.updated_at,
      };
    } catch (error) {
      this.logger.error(`Failed to get profile for user ${userId}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Get Recent Insights
   * 
   * Get recently extracted insights for a user
   * 
   * GET /personalization/insights?userId=123&limit=10
   */
  @Get('insights')
  async getInsights(
    @Query('userId') userId: string,
    @Query('limit') limit: string = '10',
  ) {
    const parsedUserId = parseInt(userId, 10);
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedUserId)) {
      return { error: 'Invalid userId' };
    }

    try {
      const insights = await this.userProfilingService['prisma'].userInsight.findMany({
        where: { user_id: parsedUserId },
        orderBy: { extracted_at: 'desc' },
        take: parsedLimit,
      });

      return {
        userId: parsedUserId,
        count: insights.length,
        insights: insights.map((i) => ({
          type: i.insight_type,
          key: i.insight_key,
          value: i.insight_value,
          confidence: i.confidence,
          source: i.source,
          timestamp: i.extracted_at,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get insights for user ${userId}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Health Check
   * 
   * Verify personalization service is operational
   */
  @Get('health')
  async health() {
    try {
      // Check database connection
      await this.userProfilingService['prisma'].$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          analyzer: 'ready',
          profiling: 'ready',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}
