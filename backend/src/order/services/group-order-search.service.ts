/**
 * Group Order Search Service
 * 
 * Finds optimal items for group orders based on:
 * - Group size and hunger level
 * - Budget constraints
 * - Delivery time requirements
 * - Dietary preferences
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { SearchService } from '../../search/services/search.service';
import { SearchDto } from '../../search/dto/search.dto';
import { ParsedComplexOrder, GroupRequirements } from './complex-order-parser.service';

export interface GroupOrderItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  servesPersons: number;
  isShareable: boolean;
  dietary: 'veg' | 'non_veg' | 'egg' | 'vegan';
  category: 'main' | 'side' | 'drink' | 'dessert';
  image?: string;
  restaurantId: string;
  restaurantName: string;
  rating?: number;
  preparationTime?: number;
}

export interface GroupOrderRecommendation {
  restaurant: {
    id: string;
    name: string;
    deliveryTime: number;
    rating: number;
    distance?: number;
    address?: string;
  };
  items: GroupOrderItem[];
  summary: {
    totalCost: number;
    perPersonCost: number;
    itemCount: number;
    totalServings: number;
    estimatedCalories: number;
  };
  budgetAnalysis: {
    budgetUsed: number;
    budgetRemaining: number;
    isWithinBudget: boolean;
    valueScore: number;  // 0-1, how good is the value
  };
  reasoning: string;
  savingsNote?: string;
  warnings?: string[];
}

export interface RestaurantGroup {
  restaurantId: string;
  restaurantName: string;
  items: any[];
  avgRating: number;
  deliveryTime: number;
  totalValue: number;
}

@Injectable()
export class GroupOrderSearchService {
  private readonly logger = new Logger(GroupOrderSearchService.name);

  // Average prices for budget planning
  private readonly avgPrices = {
    main: { veg: 180, non_veg: 250 },
    side: { veg: 80, non_veg: 120 },
    drink: { veg: 50, non_veg: 50 },
    dessert: { veg: 100, non_veg: 100 },
  };

  // Serving size indicators
  private readonly servingKeywords = {
    single: ['mini', 'small', 'regular', 'single', '1 pc', '1pc'],
    double: ['medium', 'double', 'for 2', 'serves 2', '2 pcs', 'couple'],
    family: ['large', 'family', 'xl', 'jumbo', 'party', 'for 4', 'serves 4', 'full'],
  };

  constructor(
    @Inject(forwardRef(() => SearchService))
    private readonly searchService: SearchService,
  ) {}

  /**
   * Main entry point: Find optimal group order
   */
  async findGroupOrder(
    parsed: ParsedComplexOrder,
    requirements: GroupRequirements,
    userLocation?: { lat: number; lng: number },
  ): Promise<GroupOrderRecommendation[]> {
    this.logger.log(`Finding group order for ${parsed.groupSize} people, budget: ₹${parsed.budget?.amount}`);

    try {
      // Step 1: Search for items matching criteria
      const searchResults = await this.searchItems(parsed, userLocation);
      
      if (!searchResults.length) {
        this.logger.warn('No items found for group order');
        return [];
      }

      // Step 2: Group by restaurant
      const restaurantGroups = this.groupByRestaurant(searchResults);

      // Step 3: Build optimal combos for each restaurant
      const recommendations: GroupOrderRecommendation[] = [];
      
      for (const group of restaurantGroups) {
        const combo = await this.buildOptimalCombo(
          group,
          parsed,
          requirements,
        );
        
        if (combo && combo.budgetAnalysis.isWithinBudget) {
          recommendations.push(combo);
        }
      }

      // Step 4: Sort by value score
      recommendations.sort((a, b) => b.budgetAnalysis.valueScore - a.budgetAnalysis.valueScore);

      // Return top 3 options
      return recommendations.slice(0, 3);
    } catch (error) {
      this.logger.error(`Group order search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Search for items matching the parsed order
   */
  private async searchItems(
    parsed: ParsedComplexOrder,
    userLocation?: { lat: number; lng: number },
  ): Promise<any[]> {
    // Build search query
    let query = '';
    
    if (parsed.specificItems?.length) {
      query = parsed.specificItems.join(' ');
    } else if (parsed.cuisines?.length) {
      query = parsed.cuisines.join(' ') + ' food';
    } else if (parsed.mealType) {
      query = parsed.mealType === 'breakfast' ? 'breakfast nashta' :
              parsed.mealType === 'lunch' ? 'lunch thali rice roti' :
              parsed.mealType === 'snacks' ? 'snacks samosa pav bhaji' :
              parsed.mealType === 'dinner' ? 'dinner biryani curry' :
              'late night food';
    } else {
      query = 'popular food trending';
    }

    // Build filters
    const filters: any[] = [];
    
    // Dietary filter
    if (parsed.dietary?.includes('veg')) {
      filters.push({ field: 'veg', operator: 'equals', value: 1 });
    }
    if (parsed.dietary?.includes('jain')) {
      filters.push({ field: 'dietary_type', operator: 'equals', value: 'jain' });
    }

    // Restaurant filter
    if (parsed.restaurant?.name) {
      filters.push({ 
        field: 'restaurant_name', 
        operator: 'contains', 
        value: parsed.restaurant.name 
      });
    }

    // Price filter based on budget
    if (parsed.budget) {
      const maxItemPrice = parsed.budget.amount / (parsed.groupSize || 2);
      filters.push({ field: 'mrp', operator: 'lt', value: maxItemPrice });
    }

    const searchDto: SearchDto = {
      query,
      index: 'food_items_v2',
      limit: 50,
      offset: 0,
      searchType: 'hybrid',
      filters: filters.length > 0 ? filters : undefined,
    };

    try {
      const result = await this.searchService.search(searchDto);
      return result.results || [];
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Group search results by restaurant
   */
  private groupByRestaurant(items: any[]): RestaurantGroup[] {
    const groups = new Map<string, RestaurantGroup>();

    for (const item of items) {
      const source = item.source || item;
      const restaurantId = source.store_id || source.restaurant_id || 'unknown';
      const restaurantName = source.store_name || source.restaurant_name || 'Unknown Restaurant';

      if (!groups.has(restaurantId)) {
        groups.set(restaurantId, {
          restaurantId,
          restaurantName,
          items: [],
          avgRating: 0,
          deliveryTime: source.delivery_time || 30,
          totalValue: 0,
        });
      }

      const group = groups.get(restaurantId)!;
      group.items.push(source);
      group.totalValue += source.mrp || source.price || 0;
    }

    // Calculate average ratings
    for (const group of groups.values()) {
      const ratings = group.items
        .map(i => i.rating || i.avg_rating)
        .filter(r => r && r > 0);
      
      if (ratings.length > 0) {
        group.avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }
    }

    // Sort by rating and item variety
    return Array.from(groups.values())
      .filter(g => g.items.length >= 3)  // Need variety
      .sort((a, b) => {
        // Prefer restaurants with higher ratings and more items
        const scoreA = a.avgRating * 0.6 + Math.min(a.items.length / 10, 1) * 0.4;
        const scoreB = b.avgRating * 0.6 + Math.min(b.items.length / 10, 1) * 0.4;
        return scoreB - scoreA;
      });
  }

  /**
   * Build optimal combo from a restaurant's items
   */
  private async buildOptimalCombo(
    group: RestaurantGroup,
    parsed: ParsedComplexOrder,
    requirements: GroupRequirements,
  ): Promise<GroupOrderRecommendation | null> {
    const budget = parsed.budget?.amount || 1000;
    const groupSize = parsed.groupSize || 2;
    
    // Categorize items
    const categorized = this.categorizeItems(group.items);
    
    // Select items for each category
    const selectedItems: GroupOrderItem[] = [];
    let totalCost = 0;
    let totalServings = 0;

    // Select main courses (55% of budget)
    const mainBudget = budget * requirements.budgetAllocation.mains;
    const mains = this.selectBestItems(
      categorized.mains,
      requirements.mainCourses,
      mainBudget,
      groupSize,
      parsed.dietary,
    );
    selectedItems.push(...mains);
    totalCost += mains.reduce((sum, item) => sum + item.price * item.quantity, 0);
    totalServings += mains.reduce((sum, item) => sum + item.servesPersons * item.quantity, 0);

    // Select sides (20% of budget)
    const sideBudget = budget * requirements.budgetAllocation.sides;
    const sides = this.selectBestItems(
      categorized.sides,
      requirements.sides,
      sideBudget,
      groupSize,
      parsed.dietary,
    );
    selectedItems.push(...sides);
    totalCost += sides.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Select drinks (15% of budget)
    const drinkBudget = budget * requirements.budgetAllocation.drinks;
    const drinks = this.selectBestItems(
      categorized.drinks,
      requirements.drinks,
      drinkBudget,
      groupSize,
      parsed.dietary,
    );
    selectedItems.push(...drinks);
    totalCost += drinks.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Select desserts if budget allows (10% of budget)
    if (requirements.desserts > 0 && budget - totalCost > 50) {
      const dessertBudget = Math.min(budget * requirements.budgetAllocation.desserts, budget - totalCost);
      const desserts = this.selectBestItems(
        categorized.desserts,
        requirements.desserts,
        dessertBudget,
        groupSize,
        parsed.dietary,
      );
      selectedItems.push(...desserts);
      totalCost += desserts.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    if (selectedItems.length === 0) {
      return null;
    }

    // Check time constraint
    const deliveryTime = group.deliveryTime;
    const warnings: string[] = [];
    
    if (parsed.timeConstraint && deliveryTime > parsed.timeConstraint.minutes) {
      warnings.push(`Delivery may take ${deliveryTime} mins (you wanted ${parsed.timeConstraint.minutes} mins)`);
    }

    // Calculate value score
    const valueScore = this.calculateValueScore(
      totalCost,
      budget,
      totalServings,
      groupSize,
      group.avgRating,
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      selectedItems,
      groupSize,
      totalCost,
      group.avgRating,
      parsed.hungerLevel,
    );

    return {
      restaurant: {
        id: group.restaurantId,
        name: group.restaurantName,
        deliveryTime: group.deliveryTime,
        rating: group.avgRating,
      },
      items: selectedItems,
      summary: {
        totalCost: Math.round(totalCost),
        perPersonCost: Math.round(totalCost / groupSize),
        itemCount: selectedItems.reduce((sum, i) => sum + i.quantity, 0),
        totalServings,
        estimatedCalories: requirements.calorieEstimate,
      },
      budgetAnalysis: {
        budgetUsed: Math.round((totalCost / budget) * 100),
        budgetRemaining: Math.round(budget - totalCost),
        isWithinBudget: totalCost <= budget,
        valueScore,
      },
      reasoning,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Categorize items into main, side, drink, dessert
   */
  private categorizeItems(items: any[]): {
    mains: any[];
    sides: any[];
    drinks: any[];
    desserts: any[];
  } {
    const result = { mains: [], sides: [], drinks: [], desserts: [] };

    for (const item of items) {
      const category = (item.category || '').toLowerCase();
      const subcategory = (item.subcategory || '').toLowerCase();
      const name = (item.name || item.item_name || '').toLowerCase();

      // Drinks
      if (
        category.includes('drink') || category.includes('beverage') ||
        /\b(juice|shake|lassi|chai|tea|coffee|coke|pepsi|sprite|soda|water)\b/.test(name)
      ) {
        result.drinks.push(item);
      }
      // Desserts
      else if (
        category.includes('dessert') || category.includes('sweet') ||
        /\b(ice\s*cream|kulfi|gulab\s*jamun|rasgulla|cake|brownie|pastry)\b/.test(name)
      ) {
        result.desserts.push(item);
      }
      // Sides
      else if (
        category.includes('side') || category.includes('starter') || category.includes('appetizer') ||
        /\b(roti|naan|paratha|rice|dal|raita|papad|salad|fries|soup)\b/.test(name)
      ) {
        result.sides.push(item);
      }
      // Main courses (default)
      else {
        result.mains.push(item);
      }
    }

    return result;
  }

  /**
   * Select best items from a category within budget
   */
  private selectBestItems(
    items: any[],
    neededCount: number,
    budget: number,
    groupSize: number,
    dietary?: string[],
  ): GroupOrderItem[] {
    if (items.length === 0 || neededCount === 0) return [];

    // Filter by dietary
    let filtered = items;
    if (dietary?.includes('veg')) {
      filtered = items.filter(i => i.veg === 1 || i.dietary_type === 'veg');
    }

    // Sort by value (rating/price ratio)
    filtered.sort((a, b) => {
      const valueA = (a.rating || 4) / (a.mrp || a.price || 100);
      const valueB = (b.rating || 4) / (b.mrp || b.price || 100);
      return valueB - valueA;
    });

    const selected: GroupOrderItem[] = [];
    let spent = 0;

    for (const item of filtered) {
      if (selected.length >= neededCount) break;
      
      const price = item.mrp || item.price || 0;
      if (spent + price > budget) continue;

      const servings = this.estimateServings(item);
      const quantity = Math.ceil(groupSize / servings);
      
      if (spent + price * quantity > budget) {
        // Try single quantity
        if (spent + price <= budget) {
          selected.push(this.formatItem(item, 1));
          spent += price;
        }
      } else {
        selected.push(this.formatItem(item, quantity));
        spent += price * quantity;
      }
    }

    return selected;
  }

  /**
   * Estimate how many people an item serves
   */
  private estimateServings(item: any): number {
    const name = (item.name || item.item_name || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const text = name + ' ' + description;

    // Check for explicit serving info
    const servesMatch = text.match(/serves?\s*(\d+)/i);
    if (servesMatch) {
      return parseInt(servesMatch[1]);
    }

    // Check keywords
    for (const keyword of this.servingKeywords.family) {
      if (text.includes(keyword)) return 4;
    }
    for (const keyword of this.servingKeywords.double) {
      if (text.includes(keyword)) return 2;
    }

    // Default based on price
    const price = item.mrp || item.price || 100;
    if (price > 400) return 3;
    if (price > 250) return 2;
    return 1;
  }

  /**
   * Format raw item to GroupOrderItem
   */
  private formatItem(item: any, quantity: number): GroupOrderItem {
    const dietary = item.veg === 1 ? 'veg' : 
                    item.veg === 0 ? 'non_veg' : 
                    item.dietary_type || 'veg';

    return {
      id: item.id || item._id || String(item.item_id),
      name: item.name || item.item_name,
      description: item.description,
      quantity,
      price: item.mrp || item.price || 0,
      originalPrice: item.original_price,
      servesPersons: this.estimateServings(item),
      isShareable: this.estimateServings(item) >= 2,
      dietary,
      category: this.getCategory(item),
      image: item.image || item.image_full_url,
      restaurantId: item.store_id || item.restaurant_id,
      restaurantName: item.store_name || item.restaurant_name,
      rating: item.rating || item.avg_rating,
      preparationTime: item.preparation_time_min,
    };
  }

  private getCategory(item: any): GroupOrderItem['category'] {
    const category = (item.category || '').toLowerCase();
    if (category.includes('drink') || category.includes('beverage')) return 'drink';
    if (category.includes('dessert') || category.includes('sweet')) return 'dessert';
    if (category.includes('side') || category.includes('starter')) return 'side';
    return 'main';
  }

  /**
   * Calculate value score (0-1)
   */
  private calculateValueScore(
    totalCost: number,
    budget: number,
    totalServings: number,
    groupSize: number,
    rating: number,
  ): number {
    // Budget utilization (closer to 100% is better, but not over)
    const budgetUtilization = totalCost <= budget 
      ? (totalCost / budget) * 0.3
      : 0;

    // Serving adequacy (1 = perfect, >1 = generous)
    const servingScore = Math.min(totalServings / groupSize, 1.5) * 0.3 / 1.5;

    // Rating score
    const ratingScore = (rating / 5) * 0.3;

    // Cost per person score (lower is better, compared to ₹300 baseline)
    const perPerson = totalCost / groupSize;
    const costScore = Math.max(0, (300 - perPerson) / 300) * 0.1;

    return Math.min(budgetUtilization + servingScore + ratingScore + costScore, 1);
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    items: GroupOrderItem[],
    groupSize: number,
    totalCost: number,
    rating: number,
    hungerLevel?: string,
  ): string {
    const perPerson = Math.round(totalCost / groupSize);
    const mainCount = items.filter(i => i.category === 'main').reduce((s, i) => s + i.quantity, 0);
    
    let reasoning = '';

    if (hungerLevel === 'very_hungry' || hungerLevel === 'starving') {
      reasoning = `🍽️ Bahut bhooke ho? Yeh ${mainCount} items ${groupSize} logon ke liye kaafi hai!`;
    } else {
      reasoning = `🍽️ ${groupSize} logon ke liye perfect combo!`;
    }

    reasoning += ` Per person sirf ₹${perPerson}.`;

    if (rating >= 4.5) {
      reasoning += ' ⭐ Top rated restaurant!';
    } else if (rating >= 4) {
      reasoning += ' ⭐ Highly rated!';
    }

    return reasoning;
  }
}
