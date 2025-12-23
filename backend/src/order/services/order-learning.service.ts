import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * User interaction event for learning
 */
export interface UserInteractionEvent {
  userId: string;
  sessionId: string;
  timestamp: Date;
  
  // Intent classification
  originalMessage: string;
  classifiedIntent: string;
  intentConfidence: number;
  
  // Recommendations shown
  recommendationsShown: Array<{
    id: string;
    name: string;
    position: number;
    reason: string;
    matchScore: number;
  }>;
  
  // User choice
  selectedOption?: {
    id: string;
    name: string;
    position: number;
  };
  
  // Outcome
  orderPlaced: boolean;
  orderId?: string;
  orderValue?: number;
  
  // Feedback
  userSatisfaction?: 'positive' | 'negative' | 'neutral';
  searchRefinements?: number; // How many times user asked for more/different options
}

/**
 * User preference profile
 */
export interface UserPreferences {
  userId: string;
  
  // Cuisine preferences (learned from orders)
  cuisinePreferences: Record<string, number>; // cuisine -> preference score
  
  // Food type preferences
  foodPreferences: Record<string, number>; // food -> preference score
  
  // Restaurant preferences
  restaurantPreferences: Record<string, number>; // restaurant_id -> preference score
  
  // Behavior patterns
  avgOrderValue: number;
  preferredOrderTimes: string[]; // "lunch", "dinner", etc.
  preferredDeliverySpeed: 'fast' | 'normal' | 'value';
  budgetSensitivity: 'high' | 'medium' | 'low';
  
  // Discovery behavior
  triesNewPlaces: boolean;
  repeatOrderRate: number; // 0-1
  
  // Dietary
  dietaryRestrictions: string[];
  
  // Last updated
  lastUpdated: Date;
  orderCount: number;
}

/**
 * Analytics aggregation for system improvement
 */
export interface IntentAnalytics {
  intent: string;
  totalOccurrences: number;
  successfulConversions: number;
  avgSearchRefinements: number;
  avgTimeToOrder: number;
  topRecommendedItems: string[];
  topSelectedItems: string[];
  
  // Performance
  precision: number; // How often first recommendation was selected
  recall: number; // How often we had what user wanted
}

@Injectable()
export class OrderLearningService {
  private readonly logger = new Logger(OrderLearningService.name);
  private readonly phpBaseUrl: string;

  // In-memory cache for user preferences (would use Redis in production)
  private userPreferencesCache: Map<string, UserPreferences> = new Map();
  
  // Session interactions for learning
  private sessionInteractions: Map<string, UserInteractionEvent[]> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.phpBaseUrl = this.configService.get<string>('PHP_BACKEND_URL', 'http://localhost:8000');
  }

  /**
   * Track a user interaction for learning
   */
  async trackInteraction(event: UserInteractionEvent): Promise<void> {
    try {
      // Store in session
      const sessionEvents = this.sessionInteractions.get(event.sessionId) || [];
      sessionEvents.push(event);
      this.sessionInteractions.set(event.sessionId, sessionEvents);

      // Log for analytics
      this.logger.log(`📊 Tracked: ${event.classifiedIntent} -> ${event.selectedOption?.name || 'no selection'} (order: ${event.orderPlaced})`);

      // Update user preferences asynchronously
      this.updateUserPreferences(event).catch(err => 
        this.logger.warn(`Failed to update preferences: ${err.message}`)
      );

      // Send to analytics backend (non-blocking)
      this.sendToAnalytics(event).catch(err => 
        this.logger.warn(`Failed to send analytics: ${err.message}`)
      );
    } catch (error) {
      this.logger.error(`Failed to track interaction: ${error.message}`);
    }
  }

  /**
   * Update user preferences based on interaction
   */
  private async updateUserPreferences(event: UserInteractionEvent): Promise<void> {
    const prefs = await this.getUserPreferences(event.userId);
    
    if (event.selectedOption) {
      // Update restaurant preference
      const restaurantId = event.selectedOption.id;
      prefs.restaurantPreferences[restaurantId] = 
        (prefs.restaurantPreferences[restaurantId] || 0) + 1;
    }

    if (event.orderPlaced && event.orderValue) {
      // Update avg order value
      prefs.avgOrderValue = 
        (prefs.avgOrderValue * prefs.orderCount + event.orderValue) / (prefs.orderCount + 1);
      prefs.orderCount++;
    }

    // Update time preference
    const hour = event.timestamp.getHours();
    const timeSlot = this.getTimeSlot(hour);
    if (!prefs.preferredOrderTimes.includes(timeSlot)) {
      prefs.preferredOrderTimes.push(timeSlot);
    }

    // Update repeat order rate
    if (event.classifiedIntent === 'repeat_order') {
      prefs.repeatOrderRate = Math.min(1, prefs.repeatOrderRate + 0.1);
    }

    prefs.lastUpdated = new Date();
    this.userPreferencesCache.set(event.userId, prefs);
  }

  /**
   * Get user preferences (from cache or build from history)
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Check cache
    if (this.userPreferencesCache.has(userId)) {
      return this.userPreferencesCache.get(userId)!;
    }

    // Build from order history
    const prefs = await this.buildUserPreferences(userId);
    this.userPreferencesCache.set(userId, prefs);
    return prefs;
  }

  /**
   * Build user preferences from order history
   */
  private async buildUserPreferences(userId: string): Promise<UserPreferences> {
    const prefs: UserPreferences = {
      userId,
      cuisinePreferences: {},
      foodPreferences: {},
      restaurantPreferences: {},
      avgOrderValue: 0,
      preferredOrderTimes: [],
      preferredDeliverySpeed: 'normal',
      budgetSensitivity: 'medium',
      triesNewPlaces: false,
      repeatOrderRate: 0,
      dietaryRestrictions: [],
      lastUpdated: new Date(),
      orderCount: 0,
    };

    try {
      // Fetch order history from PHP
      const response = await firstValueFrom(
        this.httpService.get(`${this.phpBaseUrl}/api/v1/customer/orders`, {
          params: { user_id: userId, limit: 50 },
        })
      );

      const orders = response.data?.data || [];
      if (orders.length === 0) return prefs;

      prefs.orderCount = orders.length;

      // Analyze orders
      let totalValue = 0;
      const restaurants = new Set<string>();
      const cuisines: Record<string, number> = {};
      const foods: Record<string, number> = {};
      const orderHours: number[] = [];

      for (const order of orders) {
        // Track restaurant
        if (order.store_id) {
          const storeId = String(order.store_id);
          prefs.restaurantPreferences[storeId] = 
            (prefs.restaurantPreferences[storeId] || 0) + 1;
          restaurants.add(storeId);
        }

        // Track value
        if (order.total_amount) {
          totalValue += parseFloat(order.total_amount);
        }

        // Track cuisine
        if (order.store_cuisine) {
          cuisines[order.store_cuisine] = (cuisines[order.store_cuisine] || 0) + 1;
        }

        // Track items
        for (const item of order.items || []) {
          if (item.name) {
            foods[item.name] = (foods[item.name] || 0) + 1;
          }
        }

        // Track time
        if (order.created_at) {
          const orderDate = new Date(order.created_at);
          orderHours.push(orderDate.getHours());
        }
      }

      // Calculate preferences
      prefs.avgOrderValue = totalValue / orders.length;
      prefs.cuisinePreferences = cuisines;
      prefs.foodPreferences = foods;

      // Determine time preferences
      const timeSlots = orderHours.map(h => this.getTimeSlot(h));
      prefs.preferredOrderTimes = [...new Set(timeSlots)];

      // Determine if user tries new places
      const uniqueRestaurants = restaurants.size;
      prefs.triesNewPlaces = uniqueRestaurants > orders.length * 0.5;
      prefs.repeatOrderRate = 1 - (uniqueRestaurants / orders.length);

      // Budget sensitivity
      if (prefs.avgOrderValue < 150) {
        prefs.budgetSensitivity = 'high';
      } else if (prefs.avgOrderValue > 400) {
        prefs.budgetSensitivity = 'low';
      }

      return prefs;
    } catch (error) {
      this.logger.error(`Failed to build preferences for ${userId}: ${error.message}`);
      return prefs;
    }
  }

  /**
   * Get personalized boost scores for recommendations
   */
  async getPersonalizedBoosts(
    userId: string,
    recommendations: Array<{ id: string; name: string; cuisine?: string }>,
  ): Promise<Record<string, number>> {
    const prefs = await this.getUserPreferences(userId);
    const boosts: Record<string, number> = {};

    for (const rec of recommendations) {
      let boost = 0;

      // Boost for preferred restaurants
      if (prefs.restaurantPreferences[rec.id]) {
        boost += Math.min(0.3, prefs.restaurantPreferences[rec.id] * 0.05);
      }

      // Boost for preferred cuisines
      if (rec.cuisine && prefs.cuisinePreferences[rec.cuisine]) {
        boost += Math.min(0.2, prefs.cuisinePreferences[rec.cuisine] * 0.05);
      }

      // Negative boost if user tries new places and this is a frequent one
      if (prefs.triesNewPlaces && prefs.restaurantPreferences[rec.id] > 3) {
        boost -= 0.1;
      }

      boosts[rec.id] = boost;
    }

    return boosts;
  }

  /**
   * Learn from session end - what worked and what didn't
   */
  async learnFromSession(sessionId: string): Promise<void> {
    const events = this.sessionInteractions.get(sessionId);
    if (!events || events.length === 0) return;

    // Analyze the session
    const analysis = {
      totalInteractions: events.length,
      intentsUsed: [...new Set(events.map(e => e.classifiedIntent))],
      searchRefinements: events.filter(e => (e.searchRefinements || 0) > 0).length,
      orderPlaced: events.some(e => e.orderPlaced),
      finalSatisfaction: events[events.length - 1].userSatisfaction,
    };

    this.logger.log(`📈 Session ${sessionId} analysis: ${JSON.stringify(analysis)}`);

    // If user didn't order and had many refinements, log for review
    if (!analysis.orderPlaced && analysis.searchRefinements > 2) {
      this.logger.warn(`⚠️ Session ${sessionId} had ${analysis.searchRefinements} refinements without order - review needed`);
      
      // Could trigger: intent classification review, recommendation quality review
    }

    // Clean up session data
    this.sessionInteractions.delete(sessionId);
  }

  /**
   * Get analytics for an intent (for system improvement)
   */
  async getIntentAnalytics(intent: string, days: number = 7): Promise<IntentAnalytics | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.phpBaseUrl}/api/v1/analytics/intents/${intent}`, {
          params: { days },
        })
      );
      return response.data;
    } catch (error) {
      this.logger.warn(`Could not fetch analytics for ${intent}: ${error.message}`);
      return null;
    }
  }

  /**
   * Suggest intent classifier improvements
   */
  async suggestImprovements(): Promise<string[]> {
    const suggestions: string[] = [];

    // Analyze common misclassifications
    const lowConfidenceEvents = Array.from(this.sessionInteractions.values())
      .flat()
      .filter(e => e.intentConfidence < 0.7);

    if (lowConfidenceEvents.length > 10) {
      const intentCounts: Record<string, number> = {};
      for (const event of lowConfidenceEvents) {
        intentCounts[event.classifiedIntent] = (intentCounts[event.classifiedIntent] || 0) + 1;
      }

      const problematicIntents = Object.entries(intentCounts)
        .filter(([_, count]) => count > 3)
        .map(([intent]) => intent);

      if (problematicIntents.length > 0) {
        suggestions.push(
          `Low confidence classifications for: ${problematicIntents.join(', ')}. ` +
          `Consider adding more training examples.`
        );
      }
    }

    // Analyze selection patterns
    const positionAnalysis: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let totalSelections = 0;

    for (const events of this.sessionInteractions.values()) {
      for (const event of events) {
        if (event.selectedOption) {
          positionAnalysis[event.selectedOption.position] = 
            (positionAnalysis[event.selectedOption.position] || 0) + 1;
          totalSelections++;
        }
      }
    }

    if (totalSelections > 20) {
      const firstPositionRate = positionAnalysis[1] / totalSelections;
      if (firstPositionRate < 0.3) {
        suggestions.push(
          `First recommendation selected only ${Math.round(firstPositionRate * 100)}% of time. ` +
          `Consider improving ranking algorithm.`
        );
      }
    }

    return suggestions;
  }

  /**
   * Helper: Get time slot from hour
   */
  private getTimeSlot(hour: number): string {
    if (hour >= 6 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    if (hour >= 18 && hour < 22) return 'dinner';
    return 'late_night';
  }

  /**
   * Send event to analytics backend
   */
  private async sendToAnalytics(event: UserInteractionEvent): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.phpBaseUrl}/api/v1/analytics/events`, {
          type: 'order_interaction',
          data: event,
        })
      );
    } catch (error) {
      // Non-critical, just log
      this.logger.debug(`Analytics send failed: ${error.message}`);
    }
  }
}
