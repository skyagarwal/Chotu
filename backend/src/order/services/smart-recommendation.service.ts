import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SearchService } from '../../search/services/search.service';
import { SearchDto } from '../../search/dto/search.dto';
import { SearchHit } from '../../search/dto/search-result.dto';
import { NluService } from '../../nlu/services/nlu.service';
import { firstValueFrom } from 'rxjs';

/**
 * User intent categories for food ordering
 */
export enum OrderIntent {
  // Urgency based
  URGENT_HUNGRY = 'urgent_hungry',           // "very hungry", "starving", "ASAP"
  QUICK_DELIVERY = 'quick_delivery',         // "fast", "quick", "in a hurry"
  
  // Craving based
  SPECIFIC_CRAVING = 'specific_craving',     // "craving pizza", "want biryani"
  CUISINE_PREFERENCE = 'cuisine_preference', // "chinese food", "indian"
  TASTE_PREFERENCE = 'taste_preference',     // "something spicy", "sweet"
  
  // Context based
  WEATHER_BASED = 'weather_based',           // "hot soup", "cold drink"
  OCCASION_BASED = 'occasion_based',         // "party food", "birthday cake"
  TIME_BASED = 'time_based',                 // "breakfast", "late night"
  HEALTH_BASED = 'health_based',             // "healthy", "low calorie"
  
  // Budget based
  BUDGET_CONSCIOUS = 'budget_conscious',     // "cheap", "affordable", "under X"
  VALUE_SEEKING = 'value_seeking',           // "best value", "deals"
  
  // Discovery based
  POPULAR_NEARBY = 'popular_nearby',         // "popular", "trending"
  NEW_DISCOVERY = 'new_discovery',           // "new restaurants", "try something new"
  RECOMMENDATION = 'recommendation',         // "recommend", "suggest"
  SURPRISE_ME = 'surprise_me',               // "surprise me", "dealer's choice"
  
  // Memory based
  REPEAT_ORDER = 'repeat_order',             // "usual", "same as last time"
  PREVIOUS_RESTAURANT = 'previous_restaurant', // "that place from yesterday"
  FAVORITE = 'favorite',                     // "my favorite", "saved"
  
  // Specific order
  SPECIFIC_RESTAURANT = 'specific_restaurant', // Named restaurant
  SPECIFIC_ITEM = 'specific_item',             // Named item
  
  // Unknown - needs clarification
  UNCLEAR = 'unclear'
}

/**
 * Extracted user context from their message
 */
export interface UserOrderContext {
  intent: OrderIntent;
  confidence: number;
  
  // Extracted entities
  cuisine?: string;
  foodType?: string;
  taste?: string[];           // spicy, sweet, sour, etc.
  dietary?: string[];         // veg, vegan, halal, etc.
  
  // Constraints
  maxDeliveryTime?: number;   // minutes
  maxBudget?: number;
  minRating?: number;
  quantity?: number;          // for party orders
  
  // Context
  timeOfDay?: 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'late_night';
  weather?: 'hot' | 'cold' | 'rainy';
  occasion?: string;
  
  // Specific references
  restaurantName?: string;
  itemName?: string;
  
  // Original input
  originalMessage: string;
}

/**
 * Recommendation result
 */
export interface Recommendation {
  type: 'restaurant' | 'item' | 'category';
  id: string;
  name: string;
  description?: string;
  reason: string;              // Why we're recommending this
  estimatedTime?: number;      // Delivery time in minutes
  rating?: number;
  priceRange?: string;
  distance?: number;
  matchScore: number;          // How well it matches the request (0-1)
  imageUrl?: string;
}

@Injectable()
export class SmartRecommendationService {
  private readonly logger = new Logger(SmartRecommendationService.name);
  private readonly phpBaseUrl: string;

  /**
   * Mapping from NLU intents to OrderIntent
   * This centralizes the intent taxonomy and uses NluService as single source of truth
   */
  private readonly nluToOrderIntentMap: Record<string, OrderIntent> = {
    // Urgency intents
    'order.urgent': OrderIntent.URGENT_HUNGRY,
    'order.quick_food': OrderIntent.QUICK_DELIVERY,
    'order.fast_delivery': OrderIntent.QUICK_DELIVERY,
    
    // Craving intents
    'order.craving': OrderIntent.SPECIFIC_CRAVING,
    'order.specific_craving': OrderIntent.SPECIFIC_CRAVING,
    'search.food': OrderIntent.SPECIFIC_CRAVING,
    'order.food': OrderIntent.SPECIFIC_CRAVING,
    
    // Cuisine intents
    'search.cuisine': OrderIntent.CUISINE_PREFERENCE,
    'order.cuisine': OrderIntent.CUISINE_PREFERENCE,
    
    // Taste intents
    'order.taste': OrderIntent.TASTE_PREFERENCE,
    'search.taste': OrderIntent.TASTE_PREFERENCE,
    
    // Health intents
    'order.healthy': OrderIntent.HEALTH_BASED,
    'order.dietary': OrderIntent.HEALTH_BASED,
    'search.healthy': OrderIntent.HEALTH_BASED,
    
    // Budget intents
    'order.cheap': OrderIntent.BUDGET_CONSCIOUS,
    'order.budget': OrderIntent.BUDGET_CONSCIOUS,
    'search.cheap_options': OrderIntent.BUDGET_CONSCIOUS,
    'order.deals': OrderIntent.VALUE_SEEKING,
    
    // Discovery intents
    'order.popular': OrderIntent.POPULAR_NEARBY,
    'search.popular': OrderIntent.POPULAR_NEARBY,
    'order.new': OrderIntent.NEW_DISCOVERY,
    'order.recommend': OrderIntent.RECOMMENDATION,
    'order.suggestion': OrderIntent.RECOMMENDATION,
    'order.surprise': OrderIntent.SURPRISE_ME,
    
    // Repeat intents
    'order.repeat': OrderIntent.REPEAT_ORDER,
    'order.usual': OrderIntent.REPEAT_ORDER,
    'order.reorder': OrderIntent.REPEAT_ORDER,
    'order.last_order': OrderIntent.REPEAT_ORDER,
    'order.favorite': OrderIntent.FAVORITE,
    
    // Time-based intents
    'order.breakfast': OrderIntent.TIME_BASED,
    'order.lunch': OrderIntent.TIME_BASED,
    'order.dinner': OrderIntent.TIME_BASED,
    'order.snack': OrderIntent.TIME_BASED,
    'order.late_night': OrderIntent.TIME_BASED,
    
    // Occasion intents
    'order.party': OrderIntent.OCCASION_BASED,
    'order.occasion': OrderIntent.OCCASION_BASED,
    
    // Specific intents
    'order.restaurant': OrderIntent.SPECIFIC_RESTAURANT,
    'order.item': OrderIntent.SPECIFIC_ITEM,
  };

  constructor(
    private readonly searchService: SearchService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => NluService))
    private readonly nluService: NluService,
  ) {
    this.phpBaseUrl = this.configService.get<string>('PHP_BACKEND_URL', 'http://localhost:8000');
  }

  /**
   * Helper: Execute search with proper DTO and extract results
   */
  private async executeSearch(query: string, options: Partial<SearchDto> = {}): Promise<SearchHit[]> {
    try {
      const searchDto: SearchDto = {
        query,
        index: options.index || 'all',
        limit: options.limit || 10,
        offset: options.offset || 0,
        searchType: options.searchType || 'hybrid',
        filters: options.filters,
      };

      const result = await this.searchService.search(searchDto);
      return result.results || [];
    } catch (error) {
      this.logger.error(`Search failed for "${query}": ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze user message and extract order context
   * REFACTORED: Now uses NluService as single source of truth for intent classification
   * This eliminates duplicate pattern matching and ensures consistency across the system
   */
  async analyzeUserIntent(message: string, userId?: string): Promise<UserOrderContext> {
    this.logger.log(`Analyzing user intent via NluService: "${message}"`);
    
    try {
      // Use NluService for intent classification (single source of truth)
      const nluResult = await this.nluService.classify({
        text: message,
        sessionId: userId,
      });
      
      // Map NLU intent to OrderIntent
      const orderIntent = this.mapNluIntentToOrderIntent(nluResult.intent, nluResult.confidence);
      
      // Build context from NLU entities
      const context: UserOrderContext = {
        intent: orderIntent,
        confidence: nluResult.confidence,
        originalMessage: message,
      };
      
      // Extract entities from NLU result (entities is Record<string, any>)
      if (nluResult.entities) {
        const entities = nluResult.entities;
        
        // Handle cuisine entity
        if (entities.cuisine) {
          context.cuisine = String(entities.cuisine);
        }
        
        // Handle food/item entity
        if (entities.food || entities.food_item || entities.item) {
          context.foodType = String(entities.food || entities.food_item || entities.item);
        }
        
        // Handle taste entities
        if (entities.taste) {
          context.taste = Array.isArray(entities.taste) 
            ? entities.taste.map(String) 
            : [String(entities.taste)];
        }
        
        // Handle dietary entities
        if (entities.dietary || entities.diet) {
          const dietValue = entities.dietary || entities.diet;
          context.dietary = Array.isArray(dietValue) 
            ? dietValue.map(String) 
            : [String(dietValue)];
        }
        
        // Handle budget entity
        if (entities.budget || entities.price || entities.amount) {
          const budgetValue = entities.budget || entities.price || entities.amount;
          context.maxBudget = parseInt(String(budgetValue));
        }
        
        // Handle quantity entity
        if (entities.quantity || entities.people) {
          const quantityValue = entities.quantity || entities.people;
          context.quantity = parseInt(String(quantityValue));
        }
        
        // Handle time entity
        if (entities.time || entities.meal_time) {
          context.timeOfDay = this.parseTimeOfDay(String(entities.time || entities.meal_time));
        }
        
        // Handle restaurant entity
        if (entities.restaurant || entities.store) {
          context.restaurantName = String(entities.restaurant || entities.store);
        }
        
        // Handle occasion entity
        if (entities.occasion) {
          context.occasion = String(entities.occasion);
        }
      }
      
      // Fallback entity extraction if NLU didn't find some entities
      if (!context.foodType) {
        context.foodType = this.extractFoodFromMessage(message);
      }
      if (!context.cuisine) {
        context.cuisine = this.extractCuisineFromMessage(message);
      }
      if (!context.maxBudget) {
        context.maxBudget = this.extractBudgetFromMessage(message);
      }
      if (!context.timeOfDay) {
        context.timeOfDay = this.getTimeOfDay();
      }
      
      this.logger.log(`NLU Analysis Result: intent=${orderIntent} (confidence=${context.confidence}), ` +
        `cuisine=${context.cuisine || 'none'}, food=${context.foodType || 'none'}`);
      
      return context;
      
    } catch (error) {
      this.logger.warn(`NluService analysis failed, using fallback: ${error.message}`);
      
      // Fallback to basic pattern matching if NLU fails
      return this.fallbackAnalyzeIntent(message, userId);
    }
  }
  
  /**
   * Map NLU service intent to OrderIntent enum
   */
  private mapNluIntentToOrderIntent(nluIntent: string, confidence: number): OrderIntent {
    // Direct mapping from NLU intent
    const mapped = this.nluToOrderIntentMap[nluIntent];
    if (mapped) {
      return mapped;
    }
    
    // Handle hierarchical intents (e.g., "order.food.quick" -> check "order.food")
    const parts = nluIntent.split('.');
    for (let i = parts.length; i > 0; i--) {
      const partialIntent = parts.slice(0, i).join('.');
      const partialMapped = this.nluToOrderIntentMap[partialIntent];
      if (partialMapped) {
        return partialMapped;
      }
    }
    
    // Low confidence or unmapped intent
    if (confidence < 0.5) {
      return OrderIntent.UNCLEAR;
    }
    
    // Default to recommendation for general intents
    return OrderIntent.RECOMMENDATION;
  }
  
  /**
   * Parse time of day from entity value
   */
  private parseTimeOfDay(value: string): 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'late_night' {
    const lower = value.toLowerCase();
    if (lower.includes('breakfast') || lower.includes('morning')) return 'breakfast';
    if (lower.includes('lunch') || lower.includes('afternoon')) return 'lunch';
    if (lower.includes('snack')) return 'snack';
    if (lower.includes('dinner') || lower.includes('evening')) return 'dinner';
    if (lower.includes('late') || lower.includes('night') || lower.includes('midnight')) return 'late_night';
    return 'lunch'; // default
  }
  
  /**
   * Extract food type from message (fallback)
   */
  private extractFoodFromMessage(message: string): string | undefined {
    const lower = message.toLowerCase();
    const match = lower.match(/(?:craving|want|good|order|get)\s+(?:some\s+)?(\w+)/);
    if (match && !['food', 'something', 'anything', 'to'].includes(match[1])) {
      return match[1];
    }
    return undefined;
  }
  
  /**
   * Extract cuisine from message (fallback)
   */
  private extractCuisineFromMessage(message: string): string | undefined {
    const cuisines = ['chinese', 'indian', 'italian', 'mexican', 'thai', 'japanese', 'korean', 
      'continental', 'mughlai', 'south indian', 'north indian', 'punjabi', 'gujarati', 'maharashtrian'];
    const lower = message.toLowerCase();
    for (const cuisine of cuisines) {
      if (lower.includes(cuisine)) {
        return cuisine;
      }
    }
    return undefined;
  }
  
  /**
   * Extract budget from message (fallback)
   */
  private extractBudgetFromMessage(message: string): number | undefined {
    const match = message.match(/under\s*₹?\s*(\d+)|(\d+)\s*(?:rs|rupees|₹)/i);
    if (match) {
      return parseInt(match[1] || match[2]);
    }
    return undefined;
  }
  
  /**
   * Fallback intent analysis when NLU service is unavailable
   * This preserves backward compatibility but should rarely be used
   */
  private fallbackAnalyzeIntent(message: string, userId?: string): UserOrderContext {
    this.logger.warn('Using fallback pattern matching (NLU unavailable)');
    
    const normalizedMessage = message.toLowerCase().trim();
    
    // Simple pattern matching as fallback
    const fallbackPatterns: { pattern: RegExp; intent: OrderIntent }[] = [
      { pattern: /\b(very hungry|starving)\b/i, intent: OrderIntent.URGENT_HUNGRY },
      { pattern: /\b(quick|fast|asap|hurry)\b/i, intent: OrderIntent.QUICK_DELIVERY },
      { pattern: /\b(craving|feel like having)\b/i, intent: OrderIntent.SPECIFIC_CRAVING },
      { pattern: /\b(cheap|affordable|budget|under \d+)\b/i, intent: OrderIntent.BUDGET_CONSCIOUS },
      { pattern: /\b(recommend|suggest|what should)\b/i, intent: OrderIntent.RECOMMENDATION },
      { pattern: /\b(usual|same as last|regular)\b/i, intent: OrderIntent.REPEAT_ORDER },
      { pattern: /\b(healthy|diet|low calorie)\b/i, intent: OrderIntent.HEALTH_BASED },
      { pattern: /\b(popular|trending|famous)\b/i, intent: OrderIntent.POPULAR_NEARBY },
    ];
    
    let intent = OrderIntent.UNCLEAR;
    let confidence = 0.3;
    
    for (const { pattern, intent: matchIntent } of fallbackPatterns) {
      if (pattern.test(normalizedMessage)) {
        intent = matchIntent;
        confidence = 0.7;
        break;
      }
    }
    
    return {
      intent,
      confidence,
      originalMessage: message,
      cuisine: this.extractCuisineFromMessage(message),
      foodType: this.extractFoodFromMessage(message),
      maxBudget: this.extractBudgetFromMessage(message),
      timeOfDay: this.getTimeOfDay(),
    };
  }

  /**
   * Get recommendations based on user context
   */
  async getRecommendations(
    context: UserOrderContext,
    userId: string,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    switch (context.intent) {
      case OrderIntent.URGENT_HUNGRY:
      case OrderIntent.QUICK_DELIVERY:
        return this.getQuickDeliveryOptions(context, userLocation);

      case OrderIntent.SPECIFIC_CRAVING:
        return this.searchForCraving(context, userLocation);

      case OrderIntent.CUISINE_PREFERENCE:
        return this.searchByCuisine(context, userLocation);

      case OrderIntent.TASTE_PREFERENCE:
        return this.searchByTaste(context, userLocation);

      case OrderIntent.BUDGET_CONSCIOUS:
      case OrderIntent.VALUE_SEEKING:
        return this.searchByBudget(context, userLocation);

      case OrderIntent.POPULAR_NEARBY:
        return this.getPopularNearby(context, userLocation);

      case OrderIntent.RECOMMENDATION:
      case OrderIntent.SURPRISE_ME:
        return this.getSmartRecommendations(context, userId, userLocation);

      case OrderIntent.REPEAT_ORDER:
        return this.getLastOrder(userId);

      case OrderIntent.PREVIOUS_RESTAURANT:
      case OrderIntent.FAVORITE:
        return this.getFavorites(userId);

      case OrderIntent.TIME_BASED:
        return this.getTimeBasedRecommendations(context, userLocation);

      case OrderIntent.OCCASION_BASED:
        return this.getOccasionBasedRecommendations(context, userLocation);

      case OrderIntent.HEALTH_BASED:
        return this.getHealthyOptions(context, userLocation);

      default:
        return this.getSmartRecommendations(context, userId, userLocation);
    }
  }

  /**
   * Quick delivery options - fastest restaurants
   */
  private async getQuickDeliveryOptions(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    try {
      // Search for nearby restaurants sorted by delivery time
      const searchQuery = context.foodType || 'food';
      
      const results = await this.executeSearch(searchQuery, {
        index: 'stores',
        limit: 10,
      });

      if (!results?.length) {
        // Fallback to PHP API
        return this.getQuickOptionsFromPHP(userLocation);
      }

      return results.slice(0, 5).map((hit, index) => ({
        type: 'restaurant' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: `🚀 Delivers in ~${hit.source.delivery_time || 20 + index * 5} mins`,
        estimatedTime: hit.source.delivery_time || 20 + index * 5,
        rating: hit.source.rating,
        priceRange: hit.source.price_range,
        distance: hit.source.distance,
        matchScore: 1 - (index * 0.1),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Quick delivery search failed: ${error.message}`);
      return [];
    }
  }

  private async getQuickOptionsFromPHP(userLocation?: { lat: number; lng: number }): Promise<Recommendation[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.phpBaseUrl}/api/v1/stores`, {
          params: {
            sort_by: 'delivery_time',
            limit: 5,
            lat: userLocation?.lat,
            lng: userLocation?.lng,
          },
        })
      );

      return (response.data?.data || []).map((store: any, index: number) => ({
        type: 'restaurant' as const,
        id: String(store.id),
        name: store.name,
        description: store.description,
        reason: `🚀 Quick delivery nearby`,
        estimatedTime: store.delivery_time || 25,
        rating: store.rating,
        matchScore: 0.9 - (index * 0.1),
        imageUrl: store.logo,
      }));
    } catch (error) {
      this.logger.error(`PHP quick options failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Search for specific craving
   */
  private async searchForCraving(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    const searchTerm = context.foodType || context.originalMessage;
    
    try {
      const results = await this.executeSearch(searchTerm, {
        index: 'food_items_v2',
        limit: 10,
      });

      if (!results?.length) {
        // Try restaurant search
        const restaurantResults = await this.executeSearch(searchTerm, {
          index: 'stores',
          limit: 5,
        });

        return restaurantResults.map((hit, i) => ({
          type: 'restaurant' as const,
          id: hit.id,
          name: hit.source.name,
          description: hit.source.description,
          reason: `🍽️ Known for ${context.foodType || 'this dish'}`,
          rating: hit.source.rating,
          matchScore: 0.85 - (i * 0.1),
        }));
      }

      return results.slice(0, 5).map((hit, index) => ({
        type: 'item' as const,
        id: hit.id,
        name: hit.source.name,
        description: `From ${hit.source.store_name || 'Partner Restaurant'}`,
        reason: `🎯 Matches your craving for ${context.foodType}`,
        rating: hit.source.rating,
        priceRange: `₹${hit.source.price}`,
        matchScore: 0.95 - (index * 0.05),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Craving search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Search by cuisine type
   */
  private async searchByCuisine(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    try {
      const results = await this.executeSearch(context.cuisine || '', {
        index: 'stores',
        limit: 10,
      });

      return results.slice(0, 5).map((hit, index) => ({
        type: 'restaurant' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: `🍴 Specializes in ${context.cuisine} cuisine`,
        rating: hit.source.rating,
        priceRange: hit.source.price_range,
        matchScore: 0.9 - (index * 0.1),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Cuisine search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Search by taste preference
   */
  private async searchByTaste(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    const tasteQuery = context.taste?.join(' ') || 'food';
    
    try {
      const results = await this.executeSearch(tasteQuery, { limit: 10 });

      return results.slice(0, 5).map((hit, index) => ({
        type: hit.index.includes('item') ? 'item' as const : 'restaurant' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: `🌶️ Perfect for ${context.taste?.join(', ')} lovers`,
        rating: hit.source.rating,
        matchScore: 0.85 - (index * 0.1),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Taste search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Budget-conscious search
   */
  private async searchByBudget(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    try {
      const results = await this.executeSearch('affordable meals', {
        index: 'food_items_v2',
        limit: 10,
      });

      return results.slice(0, 5).map((hit, index) => ({
        type: 'item' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: context.maxBudget 
          ? `💰 Under ₹${context.maxBudget}` 
          : `💰 Great value for money`,
        priceRange: `₹${hit.source.price}`,
        rating: hit.source.rating,
        matchScore: 0.9 - (index * 0.1),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Budget search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Popular restaurants nearby
   */
  private async getPopularNearby(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    try {
      const results = await this.executeSearch('popular restaurant', {
        index: 'stores',
        limit: 10,
      });

      return results.slice(0, 5).map((hit, index) => ({
        type: 'restaurant' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: `⭐ Highly rated & popular in your area`,
        rating: hit.source.rating,
        distance: hit.source.distance,
        matchScore: 0.95 - (index * 0.05),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Popular search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Smart recommendations based on user history, time, and preferences
   */
  private async getSmartRecommendations(
    context: UserOrderContext,
    userId: string,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Get user's order history from PHP
      const historyResponse = await firstValueFrom(
        this.httpService.get(`${this.phpBaseUrl}/api/v1/customer/orders`, {
          params: { user_id: userId, limit: 10 },
        })
      ).catch(() => ({ data: { data: [] } }));

      const orderHistory = historyResponse.data?.data || [];

      // Analyze patterns
      const frequentRestaurants = this.analyzeFrequency(orderHistory, 'store_name');
      const frequentItems = this.analyzeFrequency(orderHistory, 'items');

      // Add from frequent restaurants
      if (frequentRestaurants.length > 0) {
        recommendations.push({
          type: 'restaurant',
          id: frequentRestaurants[0].id,
          name: frequentRestaurants[0].name,
          reason: `💝 You've ordered from here ${frequentRestaurants[0].count} times`,
          matchScore: 0.9,
        });
      }

      // Get time-appropriate suggestions
      const timeRecs = await this.getTimeBasedRecommendations(context, userLocation);
      recommendations.push(...timeRecs.slice(0, 2));

      // Add something new
      const newRecs = await this.getNewRestaurants(userLocation, orderHistory);
      if (newRecs.length > 0) {
        recommendations.push({
          ...newRecs[0],
          reason: `✨ Try something new you haven't ordered before`,
        });
      }

      return recommendations.slice(0, 5);
    } catch (error) {
      this.logger.error(`Smart recommendations failed: ${error.message}`);
      return this.getPopularNearby(context, userLocation);
    }
  }

  /**
   * Get user's last order for repeat
   */
  private async getLastOrder(userId: string): Promise<Recommendation[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.phpBaseUrl}/api/v1/customer/orders`, {
          params: { user_id: userId, limit: 1 },
        })
      );

      const lastOrder = response.data?.data?.[0];
      if (!lastOrder) {
        return [];
      }

      return [{
        type: 'restaurant',
        id: String(lastOrder.store_id),
        name: lastOrder.store_name,
        description: `Your last order: ${lastOrder.items?.map((i: any) => i.name).join(', ') || 'items'}`,
        reason: `🔄 Reorder from your last order`,
        matchScore: 1.0,
      }];
    } catch (error) {
      this.logger.error(`Last order fetch failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user's favorite restaurants
   */
  private async getFavorites(userId: string): Promise<Recommendation[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.phpBaseUrl}/api/v1/customer/favorites`, {
          params: { user_id: userId },
        })
      );

      const favorites = response.data?.data || [];
      
      return favorites.slice(0, 5).map((fav: any, index: number) => ({
        type: 'restaurant' as const,
        id: String(fav.store_id || fav.id),
        name: fav.store_name || fav.name,
        reason: `❤️ One of your favorites`,
        rating: fav.rating,
        matchScore: 0.95 - (index * 0.05),
        imageUrl: fav.logo,
      }));
    } catch (error) {
      this.logger.error(`Favorites fetch failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Time-based recommendations
   */
  private async getTimeBasedRecommendations(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    const timeOfDay = context.timeOfDay || this.getTimeOfDay();
    
    const timeCategories: Record<string, string[]> = {
      breakfast: ['breakfast', 'idli', 'dosa', 'poha', 'paratha', 'sandwich', 'omelette', 'tea', 'coffee'],
      lunch: ['thali', 'biryani', 'rice', 'roti', 'curry', 'meal'],
      snack: ['samosa', 'vada pav', 'bhel', 'chat', 'sandwich', 'burger', 'pizza'],
      dinner: ['biryani', 'paneer', 'chicken', 'roti', 'dal', 'curry'],
      late_night: ['pizza', 'burger', 'sandwich', 'maggi', 'rolls', 'kebab'],
    };

    const searchTerms = timeCategories[timeOfDay] || timeCategories.lunch;
    const searchQuery = searchTerms.slice(0, 3).join(' ');

    try {
      const results = await this.executeSearch(searchQuery, { limit: 10 });

      return results.slice(0, 5).map((hit, index) => ({
        type: hit.index.includes('item') ? 'item' as const : 'restaurant' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: `🕐 Perfect for ${timeOfDay.replace('_', ' ')}`,
        rating: hit.source.rating,
        matchScore: 0.85 - (index * 0.1),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Time-based search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Occasion-based recommendations
   */
  private async getOccasionBasedRecommendations(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    const occasionKeywords = context.occasion || 'party';
    const quantity = context.quantity || 1;

    try {
      const results = await this.executeSearch(`${occasionKeywords} food bulk`, {
        index: 'stores',
        limit: 10,
      });

      return results.slice(0, 5).map((hit, index) => ({
        type: 'restaurant' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: quantity > 1 
          ? `🎉 Great for groups of ${quantity}` 
          : `🎉 Perfect for ${occasionKeywords}`,
        rating: hit.source.rating,
        matchScore: 0.85 - (index * 0.1),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Occasion search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Healthy options
   */
  private async getHealthyOptions(
    context: UserOrderContext,
    userLocation?: { lat: number; lng: number },
  ): Promise<Recommendation[]> {
    const dietaryTerms = context.dietary?.join(' ') || 'healthy';
    
    try {
      const results = await this.executeSearch(`${dietaryTerms} healthy low calorie`, {
        limit: 10,
      });

      return results.slice(0, 5).map((hit, index) => ({
        type: hit.index.includes('item') ? 'item' as const : 'restaurant' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: `🥗 Healthy & ${context.dietary?.join(', ') || 'nutritious'}`,
        rating: hit.source.rating,
        matchScore: 0.85 - (index * 0.1),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`Healthy search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get new restaurants user hasn't tried
   */
  private async getNewRestaurants(
    userLocation?: { lat: number; lng: number },
    orderHistory?: any[],
  ): Promise<Recommendation[]> {
    const orderedRestaurants = new Set(orderHistory?.map(o => String(o.store_id)) || []);

    try {
      const results = await this.executeSearch('restaurant', {
        index: 'stores',
        limit: 20,
      });

      const newRestaurants = results.filter((hit) => !orderedRestaurants.has(hit.id));

      return newRestaurants.slice(0, 3).map((hit, index) => ({
        type: 'restaurant' as const,
        id: hit.id,
        name: hit.source.name,
        description: hit.source.description,
        reason: `✨ New to you - try something different!`,
        rating: hit.source.rating,
        matchScore: 0.8 - (index * 0.1),
        imageUrl: hit.source.image,
      }));
    } catch (error) {
      this.logger.error(`New restaurants search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate conversational response for recommendations
   */
  generateResponse(
    context: UserOrderContext,
    recommendations: Recommendation[],
  ): string {
    if (recommendations.length === 0) {
      return "I couldn't find exact matches, but let me search more broadly for you...";
    }

    const intros: Record<OrderIntent, string> = {
      [OrderIntent.URGENT_HUNGRY]: "I understand you're hungry! Here are the fastest options:",
      [OrderIntent.QUICK_DELIVERY]: "Looking for quick delivery? These can reach you fastest:",
      [OrderIntent.SPECIFIC_CRAVING]: `Found some great ${context.foodType || 'options'} for you:`,
      [OrderIntent.CUISINE_PREFERENCE]: `Here are the best ${context.cuisine} options nearby:`,
      [OrderIntent.TASTE_PREFERENCE]: `For something ${context.taste?.join(' and ') || 'delicious'}:`,
      [OrderIntent.BUDGET_CONSCIOUS]: "Great value options within your budget:",
      [OrderIntent.VALUE_SEEKING]: "Best deals and value meals for you:",
      [OrderIntent.POPULAR_NEARBY]: "Here's what's popular in your area:",
      [OrderIntent.NEW_DISCOVERY]: "Try something new! Here are places you haven't ordered from:",
      [OrderIntent.RECOMMENDATION]: "Based on your preferences, I recommend:",
      [OrderIntent.SURPRISE_ME]: "Let me surprise you with these picks:",
      [OrderIntent.REPEAT_ORDER]: "Ready to reorder your usual?",
      [OrderIntent.PREVIOUS_RESTAURANT]: "From your recent orders:",
      [OrderIntent.FAVORITE]: "Your favorite spots:",
      [OrderIntent.TIME_BASED]: `Perfect for ${context.timeOfDay?.replace('_', ' ') || 'now'}:`,
      [OrderIntent.OCCASION_BASED]: `Great for your ${context.occasion || 'occasion'}:`,
      [OrderIntent.WEATHER_BASED]: "Perfect for this weather:",
      [OrderIntent.HEALTH_BASED]: "Healthy options for you:",
      [OrderIntent.SPECIFIC_RESTAURANT]: "Here's what I found:",
      [OrderIntent.SPECIFIC_ITEM]: "Here's that item:",
      [OrderIntent.UNCLEAR]: "Here are some suggestions:",
    };

    const intro = intros[context.intent] || "Here's what I found:";
    
    const recList = recommendations
      .slice(0, 3)
      .map((r, i) => `${i + 1}. **${r.name}** - ${r.reason}`)
      .join('\n');

    return `${intro}\n\n${recList}\n\nWhich one would you like to order from?`;
  }

  /**
   * Helper: Get current time of day
   */
  private getTimeOfDay(): 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'late_night' {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    if (hour >= 18 && hour < 22) return 'dinner';
    return 'late_night';
  }

  /**
   * Helper: Analyze frequency in order history
   */
  private analyzeFrequency(orders: any[], field: string): Array<{ id: string; name: string; count: number }> {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    
    for (const order of orders) {
      const key = order[field] || order.store_name;
      const id = String(order.store_id);
      
      if (!counts.has(key)) {
        counts.set(key, { id, name: key, count: 0 });
      }
      counts.get(key)!.count++;
    }

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count);
  }
}
