import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserContextService, UserOrderHistory } from '../user-context/user-context.service';

/**
 * Order item from UserOrderHistory.recentOrders
 */
interface RecentOrderItem {
  orderId: number;
  status: string;
  amount: number;
  storeName: string;
  moduleType: string;
  createdAt: Date;
  items: string[];
}

/**
 * Smart defaults for a specific flow/action
 */
export interface SmartDefaults {
  // Address defaults
  defaultAddress?: {
    id: number;
    fullAddress: string;
    lat: number;
    lng: number;
    zoneId?: number;
    label?: string; // Home, Work, etc.
    confidence: number; // 0-1 how confident we are this is the right choice
  };

  // Payment defaults
  defaultPayment?: {
    method: string; // 'cod', 'wallet', 'upi', 'card'
    walletBalance?: number;
    confidence: number;
  };

  // Food preferences defaults
  defaultQuantity?: number;
  defaultSpiceLevel?: string;
  suggestedItems?: Array<{
    itemId: number;
    itemName: string;
    reason: string; // "You ordered this 5 times before"
    lastOrderDate?: Date;
    frequency: number;
  }>;

  // Time defaults
  suggestedDeliveryTime?: string; // 'ASAP' or specific time
  usualOrderTime?: string; // "You usually order around 7 PM"

  // Store defaults
  preferredStores?: Array<{
    storeId: number;
    storeName: string;
    orderCount: number;
    avgRating?: number;
  }>;
}

/**
 * Context for making smart default decisions
 */
interface UserOrderContext {
  orderHistory: UserOrderHistory | null;
  frequentItems: Map<string, number>;
  frequentStores: Map<number, { name: string; count: number }>;
  typicalOrderTime: number; // hour of day
  typicalOrderValue: number;
}

/**
 * 🎯 Smart Defaults Service
 * 
 * Provides intelligent defaults based on user's order history and behavior.
 * This reduces friction by pre-filling common choices.
 * 
 * Key Features:
 * 1. Suggest most-used address
 * 2. Remember preferred payment method
 * 3. Suggest frequently ordered items
 * 4. Remember typical order quantities
 * 5. Suggest preferred stores
 * 6. Time-aware suggestions
 */
@Injectable()
export class SmartDefaultsService {
  private readonly logger = new Logger(SmartDefaultsService.name);
  
  // Cache for quick access
  private defaultsCache = new Map<number, { defaults: SmartDefaults; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    private prisma: PrismaService,
    @Optional() private userContextService?: UserContextService,
  ) {}

  /**
   * Get smart defaults for a user in a specific context
   */
  async getSmartDefaults(
    userId: number,
    context?: { 
      flowType?: string; // 'food_order', 'grocery', 'pharmacy'
      currentTime?: Date;
      searchQuery?: string;
    }
  ): Promise<SmartDefaults> {
    try {
      // Check cache
      const cached = this.defaultsCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return this.adjustForContext(cached.defaults, context);
      }

      const orderContext = await this.buildUserOrderContext(userId);
      const defaults = await this.computeSmartDefaults(userId, orderContext);
      
      // Cache it
      this.defaultsCache.set(userId, { defaults, timestamp: Date.now() });
      
      return this.adjustForContext(defaults, context);
    } catch (error) {
      this.logger.error(`Failed to get smart defaults for user ${userId}: ${error.message}`);
      return this.getEmptyDefaults();
    }
  }

  /**
   * Build user's order context from history
   * Uses getUserContext which gets full order history via phone lookup
   */
  private async buildUserOrderContext(userId: number): Promise<UserOrderContext> {
    // Default empty context
    let orderHistory: UserOrderHistory | null = null;
    const frequentItems = new Map<string, number>();
    const frequentStores = new Map<number, { name: string; count: number }>();
    let typicalOrderTime = 19; // Default 7 PM
    let typicalOrderValue = 300;

    // Try to get phone from profile to fetch order history
    if (this.userContextService) {
      try {
        const profile = await this.prisma.user_profiles.findUnique({
          where: { user_id: userId },
        });
        
        if (profile?.phone) {
          // Use public getOrderHistoryByPhone method
          orderHistory = await this.userContextService.getOrderHistoryByPhone(profile.phone);
        }
        
        if (orderHistory) {
          // Process favorite items from history
          for (const item of orderHistory.favoriteItems || []) {
            frequentItems.set(item.itemName.toLowerCase(), item.orderCount);
          }
          
          // Process favorite stores from history
          for (const store of orderHistory.favoriteStores || []) {
            frequentStores.set(store.storeId, { 
              name: store.storeName, 
              count: store.orderCount 
            });
          }
          
          // Calculate typical order time from recent orders
          const orderHours: number[] = [];
          for (const order of orderHistory.recentOrders || []) {
            if (order.createdAt) {
              const hour = new Date(order.createdAt).getHours();
              orderHours.push(hour);
            }
          }
          if (orderHours.length > 0) {
            typicalOrderTime = Math.round(orderHours.reduce((a, b) => a + b, 0) / orderHours.length);
          }
          
          // Use average order value from history
          if (orderHistory.avgOrderValue > 0) {
            typicalOrderValue = orderHistory.avgOrderValue;
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch order history: ${error.message}`);
      }
    }

    return {
      orderHistory,
      frequentItems,
      frequentStores,
      typicalOrderTime,
      typicalOrderValue,
    };
  }

  /**
   * Compute smart defaults from order context
   */
  private async computeSmartDefaults(
    userId: number,
    context: UserOrderContext
  ): Promise<SmartDefaults> {
    const defaults: SmartDefaults = {};
    const orderHistory = context.orderHistory;

    // 2. Suggested items - from favoriteItems in history
    const sortedItems = Array.from(context.frequentItems.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (sortedItems.length > 0) {
      defaults.suggestedItems = sortedItems.map(([name, count], index) => {
        // Get matching favorite item from history if available
        const favoriteItem = orderHistory?.favoriteItems?.find(
          i => i.itemName.toLowerCase() === name
        );
        
        return {
          itemId: favoriteItem?.itemId || index,
          itemName: this.capitalizeWords(name),
          reason: count >= 5 ? `Ordered ${count} times` : 
                  count >= 3 ? 'One of your favorites' : 
                  'Recently ordered',
          lastOrderDate: orderHistory?.lastOrderDate || undefined,
          frequency: count,
        };
      });
    }

    // 3. Preferred stores - from favoriteStores in history
    const sortedStores = Array.from(context.frequentStores.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

    if (sortedStores.length > 0) {
      defaults.preferredStores = sortedStores.map(([storeId, data]) => ({
        storeId,
        storeName: data.name,
        orderCount: data.count,
      }));
    }

    // 4. Typical order time
    defaults.usualOrderTime = this.formatTypicalTime(context.typicalOrderTime);

    // 5. Default quantity - use 1 as default (can't easily get from history)
    defaults.defaultQuantity = 1;

    // 6. Suggested delivery time based on current time
    const currentHour = new Date().getHours();
    if (Math.abs(currentHour - context.typicalOrderTime) < 2) {
      defaults.suggestedDeliveryTime = 'ASAP';
    }

    return defaults;
  }

  /**
   * Adjust defaults based on current context
   */
  private adjustForContext(
    defaults: SmartDefaults,
    context?: { flowType?: string; currentTime?: Date; searchQuery?: string }
  ): SmartDefaults {
    if (!context) return defaults;

    const adjusted = { ...defaults };
    const currentTime = context.currentTime || new Date();
    const currentHour = currentTime.getHours();

    // Time-based adjustments
    if (currentHour >= 6 && currentHour < 11) {
      // Morning - breakfast items
      adjusted.suggestedItems = defaults.suggestedItems?.filter(item => 
        this.isBreakfastItem(item.itemName)
      ) || adjusted.suggestedItems;
    } else if (currentHour >= 11 && currentHour < 15) {
      // Lunch time
      adjusted.suggestedItems = defaults.suggestedItems?.filter(item => 
        !this.isBreakfastItem(item.itemName)
      ) || adjusted.suggestedItems;
    }

    // Search query context - boost relevant items
    if (context.searchQuery) {
      const query = context.searchQuery.toLowerCase();
      adjusted.suggestedItems = defaults.suggestedItems?.sort((a, b) => {
        const aMatch = a.itemName.toLowerCase().includes(query) ? 1 : 0;
        const bMatch = b.itemName.toLowerCase().includes(query) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    return adjusted;
  }

  /**
   * Check if item is a breakfast item
   */
  private isBreakfastItem(name: string): boolean {
    const breakfastKeywords = ['poha', 'upma', 'idli', 'dosa', 'paratha', 'breakfast', 
                               'omelette', 'toast', 'tea', 'coffee', 'chai', 'sandwich'];
    const lowerName = name.toLowerCase();
    return breakfastKeywords.some(k => lowerName.includes(k));
  }

  /**
   * Format typical order time for user message
   */
  private formatTypicalTime(hour: number): string {
    if (hour < 12) {
      return `${hour} AM`;
    } else if (hour === 12) {
      return '12 PM (noon)';
    } else {
      return `${hour - 12} PM`;
    }
  }

  /**
   * Capitalize words in item name
   */
  private capitalizeWords(str: string): string {
    return str.split(' ').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }

  /**
   * Get empty defaults for new users
   */
  private getEmptyDefaults(): SmartDefaults {
    return {
      defaultQuantity: 1,
      suggestedDeliveryTime: 'ASAP',
    };
  }

  /**
   * Get quick reorder suggestions
   */
  async getQuickReorderSuggestions(userId: number): Promise<{
    canQuickReorder: boolean;
    lastOrder?: {
      orderId: string;
      storeName: string;
      items: string[];
      totalAmount: number;
      orderDate: Date;
    };
    frequentOrders?: Array<{
      items: string[];
      storeName: string;
      frequency: number;
    }>;
  }> {
    if (!this.userContextService) {
      return { canQuickReorder: false };
    }

    try {
      // Get phone from profile
      const profile = await this.prisma.user_profiles.findUnique({
        where: { user_id: userId },
      });
      
      if (!profile?.phone) {
        return { canQuickReorder: false };
      }

      const orderHistory = await this.userContextService.getOrderHistoryByPhone(profile.phone);
      
      if (!orderHistory || orderHistory.recentOrders.length === 0) {
        return { canQuickReorder: false };
      }

      const lastOrder = orderHistory.recentOrders[0];
      
      // Group by items to find frequent order combinations
      const orderCombinations = new Map<string, { storeName: string; count: number }>();
      for (const order of orderHistory.recentOrders) {
        if (order.items && order.items.length > 0) {
          const key = order.items.sort().join('|');
          const existing = orderCombinations.get(key);
          if (existing) {
            existing.count++;
          } else {
            orderCombinations.set(key, { 
              storeName: order.storeName || 'Unknown Store',
              count: 1 
            });
          }
        }
      }

      // Find frequent combinations (ordered 2+ times)
      const frequentOrders = Array.from(orderCombinations.entries())
        .filter(([_, v]) => v.count >= 2)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([items, data]) => ({
          items: items.split('|'),
          storeName: data.storeName,
          frequency: data.count,
        }));

      return {
        canQuickReorder: true,
        lastOrder: {
          orderId: String(lastOrder.orderId),
          storeName: lastOrder.storeName || 'Unknown Store',
          items: lastOrder.items || [],
          totalAmount: lastOrder.amount,
          orderDate: lastOrder.createdAt,
        },
        frequentOrders,
      };
    } catch (error) {
      this.logger.error(`Failed to get quick reorder suggestions: ${error.message}`);
      return { canQuickReorder: false };
    }
  }

  /**
   * Invalidate cache for a user (call after order completion)
   */
  invalidateCache(userId: number): void {
    this.defaultsCache.delete(userId);
  }
}
