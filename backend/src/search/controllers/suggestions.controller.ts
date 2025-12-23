import { Controller, Get, Query, Logger, Post, Body } from '@nestjs/common';
import { SearchSuggestionsService } from '../services/search-suggestions.service';

/**
 * 🔮 Search Suggestions Controller
 * 
 * Provides autocomplete API for search boxes:
 * - GET /api/search/suggest?q=piz&module=1 - Autocomplete suggestions
 * - GET /api/search/trending - Trending searches
 * - GET /api/search/categories - Popular categories
 * - POST /api/search/suggest/click - Track suggestion clicks
 */
@Controller('search')
export class SearchSuggestionsController {
  private readonly logger = new Logger(SearchSuggestionsController.name);

  constructor(
    private readonly suggestionsService: SearchSuggestionsService,
  ) {
    this.logger.log('✅ SearchSuggestionsController initialized');
  }

  /**
   * Get autocomplete suggestions for a search prefix
   * 
   * Example: GET /api/search/suggest?q=piz&module=1&limit=10
   * 
   * Response:
   * {
   *   suggestions: ["pizza", "pizza margherita", "pizza hut"],
   *   categories: ["Pizza", "Italian"],
   *   products: [{ id: "1", name: "Pizza Margherita", price: 299 }],
   *   corrections: [] // If typo detected: ["pizza"]
   * }
   */
  @Get('suggest')
  async getSuggestions(
    @Query('q') query: string,
    @Query('module') moduleId?: string,
    @Query('limit') limit?: string,
    @Query('products') includeProducts?: string,
    @Query('stores') includeStores?: string,
    @Query('categories') includeCategories?: string,
    @Query('userId') userId?: string,
  ) {
    const suggestions = await this.suggestionsService.getSuggestions(query || '', {
      limit: parseInt(limit || '10'),
      moduleId: moduleId ? parseInt(moduleId) : undefined,
      includeProducts: includeProducts !== 'false',
      includeStores: includeStores === 'true',
      includeCategories: includeCategories !== 'false',
      userId,
    });

    return {
      success: true,
      query,
      data: suggestions,
    };
  }

  /**
   * Get trending searches (last 24 hours)
   * 
   * Example: GET /api/search/trending?limit=10&module=1
   */
  @Get('trending')
  async getTrending(
    @Query('limit') limit?: string,
    @Query('module') moduleId?: string,
  ) {
    const trending = await this.suggestionsService.getTrendingSearches(
      parseInt(limit || '10'),
      moduleId ? parseInt(moduleId) : undefined,
    );

    return {
      success: true,
      data: {
        trending,
        period: '24h',
      },
    };
  }

  /**
   * Get popular categories
   * 
   * Example: GET /api/search/categories?limit=8&module=1
   */
  @Get('categories')
  async getCategories(
    @Query('limit') limit?: string,
    @Query('module') moduleId?: string,
  ) {
    const categories = await this.suggestionsService.getPopularCategories(
      parseInt(limit || '8'),
      moduleId ? parseInt(moduleId) : undefined,
    );

    return {
      success: true,
      data: {
        categories,
      },
    };
  }

  /**
   * Get personalized suggestions for a user
   * 
   * Example: GET /api/search/personalized?userId=123&q=piz&limit=10
   */
  @Get('personalized')
  async getPersonalized(
    @Query('userId') userId: string,
    @Query('q') prefix?: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId) {
      return {
        success: false,
        error: 'userId is required',
      };
    }

    const suggestions = await this.suggestionsService.getPersonalizedSuggestions(
      userId,
      prefix,
      parseInt(limit || '10'),
    );

    return {
      success: true,
      userId,
      data: {
        suggestions,
      },
    };
  }

  /**
   * Track suggestion click (for improving ranking)
   * 
   * POST /api/search/suggest/click
   * Body: { prefix: "piz", suggestion: "pizza", converted: true }
   */
  @Post('suggest/click')
  async trackClick(
    @Body() body: { prefix: string; suggestion: string; converted?: boolean },
  ) {
    await this.suggestionsService.trackSuggestionClick(
      body.prefix,
      body.suggestion,
      body.converted || false,
    );

    return {
      success: true,
      message: 'Click tracked',
    };
  }

  /**
   * Instant search - combines suggestions with quick results
   * 
   * GET /api/search/instant?q=pizza&module=1
   * 
   * Returns suggestions + top 3 products in single request
   */
  @Get('instant')
  async instantSearch(
    @Query('q') query: string,
    @Query('module') moduleId?: string,
    @Query('userId') userId?: string,
  ) {
    if (!query || query.length < 2) {
      // Return trending instead of suggestions for empty query
      const trending = await this.suggestionsService.getTrendingSearches(5);
      const categories = await this.suggestionsService.getPopularCategories(6);
      
      return {
        success: true,
        query: '',
        data: {
          suggestions: trending,
          categories,
          products: [],
          showTrending: true,
        },
      };
    }

    const suggestions = await this.suggestionsService.getSuggestions(query, {
      limit: 5,
      moduleId: moduleId ? parseInt(moduleId) : undefined,
      includeProducts: true,
      includeStores: false,
      includeCategories: true,
      userId,
    });

    return {
      success: true,
      query,
      data: {
        ...suggestions,
        showTrending: false,
      },
    };
  }
}
