import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UserPreferenceService, UserPreferences } from '../../personalization/user-preference.service';

/**
 * 🎯 Personalized Search Service
 * 
 * Enhances search results based on user preferences:
 * - Filters by dietary type (veg/non-veg)
 * - Excludes allergies and disliked ingredients
 * - Boosts favorite cuisines
 * - Ranks by price sensitivity
 * - Remembers past interactions
 */

export interface PersonalizedSearchOptions {
  query: string;
  userId?: number;
  phone?: string;
  module: 'food' | 'ecom';
  size?: number;
  lat?: string;
  lng?: string;
  filters?: Record<string, any>;
  skipPersonalization?: boolean;
  openNow?: boolean; // Filter items by current availability hours
}

export interface PersonalizedSearchResult {
  items: any[];
  total: number;
  personalized: boolean;
  appliedFilters: string[];
  boosts: string[];
  userPreferenceSummary?: string;
}

@Injectable()
export class PersonalizedSearchService {
  private readonly logger = new Logger(PersonalizedSearchService.name);
  private readonly searchApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly userPreferenceService: UserPreferenceService,
  ) {
    this.searchApiUrl = this.configService.get('SEARCH_API_URL', 'http://search-api:3100');
    this.logger.log('✅ PersonalizedSearchService initialized');
  }

  /**
   * Search with user personalization applied
   */
  async search(options: PersonalizedSearchOptions): Promise<PersonalizedSearchResult> {
    const { query, userId, phone, module, size = 10, lat, lng, filters = {}, skipPersonalization, openNow = true } = options;
    
    let preferences: UserPreferences | null = null;
    const appliedFilters: string[] = [];
    const boosts: string[] = [];

    // Get user preferences if userId provided
    if (userId && !skipPersonalization) {
      try {
        preferences = await this.userPreferenceService.getPreferences(userId);
        this.logger.debug(`User ${userId} preferences: dietary=${preferences.dietaryType}, allergies=${preferences.allergies?.join(',')}`);
      } catch (error) {
        this.logger.warn(`Failed to get preferences for user ${userId}: ${error.message}`);
      }
    }

    // Build search parameters
    const searchParams: Record<string, any> = {
      q: query,
      size,
      ...filters,
    };

    // Add location if provided (enables distance_km and dynamic delivery_time)
    if (lat && lng) {
      searchParams.lat = lat;
      searchParams.lon = lng; // Search API uses 'lon' not 'lng'
    }

    // Filter by item availability hours (open_now uses opening_time/closing_time fields)
    if (openNow) {
      searchParams.open_now = 'true';
      appliedFilters.push('open_now:true (available items only)');
    }

    // Apply personalization filters for food module
    if (module === 'food' && preferences) {
      // 1. Dietary Type Filter (veg/non-veg)
      if (preferences.dietaryType === 'veg' || preferences.dietaryType === 'vegan' || preferences.dietaryType === 'jain') {
        searchParams.veg = 1; // Only veg items
        appliedFilters.push(`veg:1 (dietary_type=${preferences.dietaryType})`);
      } else if (preferences.dietaryType === 'eggetarian') {
        searchParams.veg = 1; // Veg + egg items (will need additional logic)
        appliedFilters.push('veg:1 (eggetarian)');
      }
      // For non-veg users, we don't filter - show everything but boost non-veg

      // 2. Boost favorite cuisines
      if (preferences.favoriteCuisines && preferences.favoriteCuisines.length > 0) {
        searchParams.boost_categories = preferences.favoriteCuisines.join(',');
        boosts.push(`favorite_cuisines: ${preferences.favoriteCuisines.join(', ')}`);
      }

      // 3. Price sensitivity - add sort preference
      if (preferences.priceSensitivity === 'budget') {
        searchParams.sort = 'price:asc';
        boosts.push('sort:price_low_first (budget)');
      } else if (preferences.priceSensitivity === 'premium') {
        searchParams.sort = 'rating:desc,price:desc';
        boosts.push('sort:rating_and_premium (premium)');
      }
    }

    // Execute search
    try {
      const endpoint = module === 'food' 
        ? `${this.searchApiUrl}/search/semantic/food`
        : `${this.searchApiUrl}/v2/search/items`;

      this.logger.debug(`Searching: ${endpoint} with params:`, searchParams);

      const response = await firstValueFrom(
        this.httpService.get(endpoint, { 
          params: searchParams,
          timeout: 10000,
        }),
      );

      let items = response.data;
      
      // Handle different response formats
      if (Array.isArray(items)) {
        // Response is already an array
      } else if (items.items) {
        items = items.items;
      } else if (items.results) {
        items = items.results;
      }

      // Post-process: Filter out allergies and disliked ingredients
      if (preferences && items.length > 0) {
        const originalCount = items.length;
        items = this.postFilterItems(items, preferences);
        
        if (items.length < originalCount) {
          appliedFilters.push(`excluded ${originalCount - items.length} items (allergies/dislikes)`);
        }

        // Re-rank based on user preferences
        items = this.rerankItems(items, preferences, boosts);
      }

      return {
        items,
        total: items.length,
        personalized: !!(preferences && (appliedFilters.length > 0 || boosts.length > 0)),
        appliedFilters,
        boosts,
        userPreferenceSummary: preferences ? this.getSummary(preferences) : undefined,
      };
    } catch (error) {
      this.logger.error(`Personalized search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Post-filter items based on allergies and dislikes
   */
  private postFilterItems(items: any[], preferences: UserPreferences): any[] {
    const allergies = (preferences.allergies || []).map(a => a.toLowerCase());
    const dislikes = (preferences.dislikedIngredients || []).map(d => d.toLowerCase());

    if (allergies.length === 0 && dislikes.length === 0) {
      return items;
    }

    return items.filter(item => {
      const name = (item.name || item.title || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const category = (item.category || item.category_name || '').toLowerCase();
      const searchText = `${name} ${description} ${category}`;

      // Check for allergies (strict exclusion)
      for (const allergy of allergies) {
        if (searchText.includes(allergy)) {
          this.logger.debug(`Excluding "${item.name}" due to allergy: ${allergy}`);
          return false;
        }
      }

      // Check for strong dislikes (soft exclusion - only if prominent)
      for (const dislike of dislikes) {
        if (name.includes(dislike)) {
          this.logger.debug(`Excluding "${item.name}" due to dislike in name: ${dislike}`);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Re-rank items based on user preferences
   */
  private rerankItems(items: any[], preferences: UserPreferences, boosts: string[]): any[] {
    // Calculate personalization score for each item
    const scoredItems = items.map(item => {
      let score = item.score || 1.0;
      const itemCategory = (item.category || item.category_name || '').toLowerCase();
      const itemName = (item.name || item.title || '').toLowerCase();

      // Boost favorite cuisines
      if (preferences.favoriteCuisines) {
        for (const cuisine of preferences.favoriteCuisines) {
          if (itemCategory.includes(cuisine.toLowerCase()) || itemName.includes(cuisine.toLowerCase())) {
            score *= 1.5;
            break;
          }
        }
      }

      // Boost based on dietary preference match
      if (preferences.dietaryType === 'non-veg' && item.veg === 0) {
        score *= 1.2; // Slight boost for non-veg items for non-veg users
      }

      // Boost highly rated items for quality-conscious users
      if (preferences.priceSensitivity === 'premium') {
        const rating = item.avg_rating || item.rating || 0;
        if (rating >= 4.5) {
          score *= 1.3;
        }
      }

      // Boost items within typical price range
      if (preferences.avgOrderValue && item.price) {
        const avgOrder = parseFloat(preferences.avgOrderValue.toString());
        const itemPrice = parseFloat(item.price.toString());
        
        // Boost items within 50% of average order value
        if (itemPrice <= avgOrder * 0.5) {
          score *= 1.1;
        }
      }

      return { ...item, personalizedScore: score };
    });

    // Sort by personalized score
    scoredItems.sort((a, b) => (b.personalizedScore || 0) - (a.personalizedScore || 0));

    if (scoredItems.some(item => item.personalizedScore !== item.score)) {
      boosts.push('reranked by preferences');
    }

    return scoredItems;
  }

  /**
   * Get a short summary of user preferences
   */
  private getSummary(preferences: UserPreferences): string {
    const parts: string[] = [];
    
    if (preferences.dietaryType) parts.push(preferences.dietaryType);
    if (preferences.priceSensitivity) parts.push(preferences.priceSensitivity);
    if (preferences.favoriteCuisines?.length) {
      parts.push(`likes: ${preferences.favoriteCuisines.slice(0, 2).join(', ')}`);
    }
    if (preferences.allergies?.length) {
      parts.push(`allergies: ${preferences.allergies.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'new user';
  }

  /**
   * Quick search without personalization (for browse/explore)
   */
  async quickSearch(query: string, module: 'food' | 'ecom', size: number = 10): Promise<any[]> {
    const result = await this.search({
      query,
      module,
      size,
      skipPersonalization: true,
    });
    return result.items;
  }

  /**
   * Get user preferences for external use (e.g., reranking)
   * Returns preferences in a format suitable for the RerankerService
   */
  async getUserPreferences(userId: number | string): Promise<{
    dietary_type?: string;
    allergies?: string[];
    favorite_cuisines?: string[];
    favorite_brands?: string[];
    price_sensitivity?: 'low' | 'medium' | 'high';
    preferred_categories?: string[];
  } | null> {
    try {
      const prefs = await this.userPreferenceService.getPreferences(Number(userId));
      if (!prefs) return null;

      // Map to reranker format
      return {
        dietary_type: prefs.dietaryType,
        allergies: prefs.allergies,
        favorite_cuisines: prefs.favoriteCuisines,
        favorite_brands: [], // Not in current preferences model
        price_sensitivity: prefs.priceSensitivity === 'budget' ? 'high' 
          : prefs.priceSensitivity === 'premium' ? 'low' : 'medium',
        preferred_categories: prefs.favoriteCuisines, // Use cuisines as categories for food
      };
    } catch (error) {
      this.logger.warn(`Failed to get preferences for reranker (user ${userId}): ${error.message}`);
      return null;
    }
  }
}
