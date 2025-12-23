import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserContextService } from '../user-context/user-context.service';

/**
 * 🧠 User Preference Service
 * 
 * Manages user preference data for personalized AI conversations
 * 
 * Data Sources:
 * 1. user_profiles - Explicit preferences (dietary, communication style)
 * 2. user_insights - AI-extracted insights from conversations
 * 3. user_interactions - Behavioral data (clicks, orders, searches)
 * 4. user_search_patterns - Search behavior analysis
 * 5. MySQL orders - Real order history from PHP backend (via UserContextService)
 */

export interface UserPreferences {
  // Identity
  userId: number;
  profileCompleteness: number; // 0-100%
  
  // Dietary Preferences (Food Module)
  dietaryType?: 'veg' | 'non-veg' | 'vegan' | 'jain' | 'eggetarian';
  dietaryRestrictions?: string[]; // ['no-onion', 'halal', 'gluten-free']
  allergies?: string[];
  spiceLevel?: 'mild' | 'medium' | 'hot' | 'extra-hot';
  favoriteCuisines?: string[]; // ['chinese', 'italian', 'indian']
  dislikedIngredients?: string[];
  
  // Shopping Behavior (E-commerce Module)
  avgOrderValue?: number;
  orderFrequency?: 'daily' | 'weekly' | 'monthly' | 'occasional';
  priceSensitivity?: 'budget' | 'value' | 'premium';
  preferredMealTimes?: Record<string, string>; // { breakfast: '8-10am' }
  
  // Communication Style (AI Personality)
  communicationTone?: 'formal' | 'casual' | 'friendly' | 'direct';
  language?: 'en' | 'hi' | 'hinglish' | 'mr' | 'marathlish';
  messageLength?: 'short' | 'medium' | 'long';
  emojiUsage?: 'love' | 'moderate' | 'minimal' | 'hate';
  
  // Personality Traits (Psychographic)
  personalityTraits?: {
    decisive?: boolean; // knows what they want vs exploratory
    priceConscious?: boolean;
    healthConscious?: boolean;
    impatient?: boolean;
    techSavvy?: boolean;
    polite?: boolean;
  };
  
  // Recent Insights
  recentInsights?: Array<{
    type: string;
    key: string;
    value: string;
    confidence: number;
    detectedAt: Date;
  }>;
  
  // Last updated
  lastConversationAnalyzed?: Date;
}

/**
 * Preference context string for agent prompts
 */
export interface PreferenceContext {
  summary: string; // "Veg, medium spice, budget-conscious, casual tone"
  fullContext: string; // Detailed prompt section
  confidenceLevel: 'high' | 'medium' | 'low'; // Based on profile completeness
  suggestionsEnabled: boolean; // Can we make proactive suggestions?
}

@Injectable()
export class UserPreferenceService {
  private readonly logger = new Logger(UserPreferenceService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private userContextService?: UserContextService, // 🧠 Order history from MySQL
  ) {}

  /**
   * Get comprehensive user preferences from all sources
   */
  async getPreferences(userId: number): Promise<UserPreferences> {
    this.logger.log(`Fetching preferences for user ${userId}`);

    // Fetch from user_profiles
    const profile = await this.prisma.user_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      this.logger.warn(`No profile found for user ${userId}`);
      return this.getDefaultPreferences(userId);
    }

    // Fetch recent insights
    const insights = await this.prisma.user_insights.findMany({
      where: { user_id: userId },
      orderBy: { extracted_at: 'desc' }, // Fix: use correct field name
      take: 10,
    });

    // Parse personality traits (stored as JSON)
    const personalityTraits = profile.personality_traits
      ? (typeof profile.personality_traits === 'string'
          ? JSON.parse(profile.personality_traits)
          : profile.personality_traits)
      : {};

    // Parse preferred meal times
    const preferredMealTimes = profile.preferred_meal_times
      ? (typeof profile.preferred_meal_times === 'string'
          ? JSON.parse(profile.preferred_meal_times)
          : profile.preferred_meal_times)
      : {};

    return {
      userId,
      profileCompleteness: profile.profile_completeness || 0,
      
      // Dietary
      dietaryType: profile.dietary_type as any,
      dietaryRestrictions: profile.dietary_restrictions || [],
      allergies: profile.allergies || [],
      spiceLevel: undefined, // TODO: Add to schema
      favoriteCuisines: profile.favorite_cuisines 
        ? (typeof profile.favorite_cuisines === 'string' 
            ? JSON.parse(profile.favorite_cuisines) 
            : profile.favorite_cuisines)
        : [],
      dislikedIngredients: profile.disliked_ingredients || [],
      
      // Shopping
      avgOrderValue: profile.avg_order_value ? parseFloat(profile.avg_order_value.toString()) : undefined,
      orderFrequency: profile.order_frequency as any,
      priceSensitivity: profile.price_sensitivity as any,
      preferredMealTimes,
      
      // Communication
      communicationTone: profile.communication_tone as any,
      language: 'hinglish', // TODO: Add to schema
      messageLength: undefined, // TODO: Infer from conversation history
      emojiUsage: undefined,
      
      // Personality
      personalityTraits,
      
      // Insights
      recentInsights: insights.map(insight => ({
        type: insight.insight_type,
        key: insight.insight_key,
        value: insight.insight_value,
        confidence: parseFloat(insight.confidence?.toString() || '0'),
        detectedAt: insight.extracted_at, // Fix: use correct field name
      })),
      
      lastConversationAnalyzed: profile.last_conversation_analyzed,
    };
  }

  /**
   * Get default preferences for new users
   */
  private getDefaultPreferences(userId: number): UserPreferences {
    return {
      userId,
      profileCompleteness: 0,
      communicationTone: 'friendly', // Default Nashik style
      language: 'hinglish',
    };
  }

  /**
   * Get formatted context for agent prompts
   */
  async getPreferenceContext(userId: number, phone?: string): Promise<PreferenceContext> {
    const prefs = await this.getPreferences(userId);

    // 🧠 Fetch order history from MySQL if UserContextService is available
    let orderHistory: any = null;
    let walletInfo: any = null;
    let favoriteStores: string[] = [];
    let favoriteItems: string[] = [];
    
    if (this.userContextService && phone) {
      try {
        const normalizedPhone = phone.replace(/^\+91/, '').replace(/^\+/, '');
        const orderData = await this.userContextService.getOrderHistoryByPhone(normalizedPhone);
        if (orderData && orderData.totalOrders > 0) {
          orderHistory = orderData;
          favoriteStores = orderData.favoriteStores?.slice(0, 3).map((s: any) => s.storeName) || [];
          favoriteItems = orderData.favoriteItems?.slice(0, 5).map((i: any) => i.itemName) || [];
        }
        const walletData = await this.userContextService.getWalletInfoByPhone(normalizedPhone);
        if (walletData) {
          walletInfo = walletData;
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch order history from MySQL: ${err.message}`);
      }
    }

    // Check if we have enough data
    const hasBasicData = prefs.profileCompleteness > 20 || (orderHistory?.totalOrders > 0);
    const hasGoodData = prefs.profileCompleteness > 50 || (orderHistory?.totalOrders > 5);
    const hasExcellentData = prefs.profileCompleteness > 80 || (orderHistory?.totalOrders > 20);

    // Build summary
    const summaryParts: string[] = [];
    
    if (prefs.dietaryType) summaryParts.push(prefs.dietaryType);
    if (prefs.spiceLevel) summaryParts.push(`${prefs.spiceLevel} spice`);
    if (prefs.priceSensitivity) summaryParts.push(`${prefs.priceSensitivity}-conscious`);
    if (prefs.communicationTone) summaryParts.push(`${prefs.communicationTone} tone`);
    if (orderHistory?.totalOrders > 0) summaryParts.push(`${orderHistory.totalOrders} orders`);

    const summary = summaryParts.length > 0 
      ? summaryParts.join(', ') 
      : 'New user - build rapport first';

    // Build detailed context
    let fullContext = '';

    if (!hasBasicData) {
      fullContext = `
🆕 NEW USER (Profile: ${prefs.profileCompleteness}%)
- No preferences or order history yet
- Build rapport through conversation
- Ask preferences casually (don't interrogate)
- Focus on providing helpful service first

STRATEGY:
- Use professional "Amazon Support" personality (polite, efficient, English)
- Show diverse options (veg + non-veg)
- Ask dietary preference after first order attempt
- Don't assume anything - ask if needed
`;
    } else {
      fullContext = `
👤 USER PROFILE (${prefs.profileCompleteness}% complete)

${orderHistory?.totalOrders > 0 ? `📦 ORDER HISTORY (from MySQL):
- Total Orders: ${orderHistory.totalOrders} (${orderHistory.deliveredOrders} delivered, ${orderHistory.canceledOrders} canceled)
- Total Spent: ₹${orderHistory.totalSpent?.toFixed(0) || 0}
- Average Order: ₹${orderHistory.avgOrderValue?.toFixed(0) || 0}
${orderHistory.lastOrderDate ? `- Last Order: ${new Date(orderHistory.lastOrderDate).toLocaleDateString()}` : ''}
${favoriteStores.length > 0 ? `- Favorite Stores: ${favoriteStores.join(', ')}` : ''}
${favoriteItems.length > 0 ? `- Favorite Items: ${favoriteItems.join(', ')}` : ''}
` : ''}
${walletInfo ? `💰 WALLET:
- Balance: ₹${walletInfo.balance}
- Loyalty Points: ${walletInfo.loyaltyPoints} pts
${walletInfo.loyaltyPoints > 100 ? '⭐ Can suggest redeeming loyalty points!' : ''}
` : ''}
${prefs.dietaryType ? `🥗 DIETARY PREFERENCES:
- Type: ${prefs.dietaryType.toUpperCase()}
${prefs.dietaryRestrictions?.length ? `- Restrictions: ${prefs.dietaryRestrictions.join(', ')}` : ''}
${prefs.allergies?.length ? `- Allergies: ${prefs.allergies.join(', ')} ⚠️` : ''}
${prefs.dislikedIngredients?.length ? `- Dislikes: ${prefs.dislikedIngredients.join(', ')}` : ''}
${prefs.favoriteCuisines?.length ? `- Favorite Cuisines: ${prefs.favoriteCuisines.join(', ')}` : ''}
` : ''}
${prefs.priceSensitivity ? `💰 SHOPPING BEHAVIOR:
- Price Sensitivity: ${prefs.priceSensitivity.toUpperCase()}
${prefs.avgOrderValue ? `- Typical Order Value: ₹${prefs.avgOrderValue}` : ''}
${prefs.orderFrequency ? `- Order Frequency: ${prefs.orderFrequency}` : ''}
` : ''}
${prefs.communicationTone ? `💬 COMMUNICATION STYLE:
- Tone: ${prefs.communicationTone.toUpperCase()}
- Language: ${prefs.language || 'en'}
${prefs.personalityTraits?.polite ? '- Very polite user - be respectful' : ''}
${prefs.personalityTraits?.impatient ? '- Impatient - be quick and concise' : ''}
${prefs.personalityTraits?.priceConscious ? '- Always mentions discounts/offers first' : ''}
` : ''}
🎯 PERSONALIZATION RULES:
${orderHistory?.totalOrders > 0 ? `✅ RETURNING CUSTOMER - greet warmly, mention their favorite store/item if relevant` : ''}
${favoriteStores.length > 0 ? `💡 Can suggest: "Would you like to order from ${favoriteStores[0]} again?"` : ''}
${favoriteItems.length > 0 ? `💡 Can suggest: "Your usual ${favoriteItems[0]}?"` : ''}
${walletInfo?.loyaltyPoints > 100 ? `💡 Can suggest: "You have ${walletInfo.loyaltyPoints} loyalty points to redeem!"` : ''}
${prefs.dietaryType === 'veg' ? '✅ ONLY show vegetarian options' : ''}
${prefs.dietaryType === 'non-veg' ? '✅ Show both veg + non-veg, prioritize non-veg' : ''}
${prefs.allergies?.length ? `❌ NEVER suggest items with: ${prefs.allergies.join(', ')}` : ''}
${prefs.dislikedIngredients?.length ? `⚠️ Avoid (but can suggest if asked): ${prefs.dislikedIngredients.join(', ')}` : ''}
${prefs.priceSensitivity === 'budget' ? '💡 Highlight budget options, discounts, combo deals' : ''}
${prefs.priceSensitivity === 'premium' ? '💡 Suggest premium options, emphasize quality' : ''}
${prefs.communicationTone === 'formal' ? '🗣️ Use formal language, avoid casual slang' : ''}
${prefs.communicationTone === 'casual' ? '🗣️ Use professional but friendly tone' : ''}
${prefs.personalityTraits?.decisive ? '⚡ User knows what they want - be direct' : ''}
${prefs.personalityTraits?.decisive === false ? '🔍 User needs exploration - show options with details' : ''}

${prefs.recentInsights?.length ? `📊 RECENT INSIGHTS:
${prefs.recentInsights.slice(0, 3).map(i => 
  `- ${i.key}: ${i.value} (confidence: ${(i.confidence * 100).toFixed(0)}%)`
).join('\n')}
` : ''}
`;
    }

    return {
      summary,
      fullContext,
      confidenceLevel: hasExcellentData ? 'high' : hasGoodData ? 'medium' : 'low',
      suggestionsEnabled: hasGoodData, // Only make proactive suggestions if confidence is medium+
    };
  }

  /**
   * Update a single preference
   */
  async updatePreference(
    userId: number,
    key: string,
    value: any,
    source: 'explicit' | 'inferred' = 'explicit',
    confidence: number = 1.0,
  ): Promise<void> {
    this.logger.log(`Updating preference for user ${userId}: ${key} = ${value} (source: ${source}, confidence: ${confidence})`);

    // Check if user_profiles exists
    const profile = await this.prisma.user_profiles.findUnique({
      where: { user_id: userId },
    });

    // Map of preference keys to database columns
    const columnMap: Record<string, string> = {
      dietary_type: 'dietary_type',
      dietary_restrictions: 'dietary_restrictions',
      allergies: 'allergies',
      favorite_cuisines: 'favorite_cuisines',
      disliked_ingredients: 'disliked_ingredients',
      avg_order_value: 'avg_order_value',
      order_frequency: 'order_frequency',
      price_sensitivity: 'price_sensitivity',
      communication_tone: 'communication_tone',
      preferred_meal_times: 'preferred_meal_times',
      personality_traits: 'personality_traits',
    };

    const dbColumn = columnMap[key];

    if (dbColumn) {
      // Update user_profiles
      if (profile) {
        await this.prisma.user_profiles.update({
          where: { user_id: userId },
          data: {
            [dbColumn]: value,
            last_conversation_analyzed: new Date(),
          },
        });
      } else {
        // Create new profile - need phone number (required field)
        // In production, phone should be passed or fetched from user table
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { phone: true },
        });
        
        if (user?.phone) {
          await this.prisma.user_profiles.create({
            data: {
              user_id: userId,
              phone: user.phone, // Required field
              [dbColumn]: value,
              profile_completeness: this.calculateCompleteness({ [key]: value }),
            },
          });
        } else {
          this.logger.warn(`Cannot create profile for user ${userId}: phone not found`);
        }
      }

      // Also create insight for tracking
      if (source === 'inferred') {
        await this.createInsight(userId, key, value, confidence);
      }

      // Recalculate profile completeness
      await this.updateProfileCompleteness(userId);
    } else {
      // Store as insight only
      await this.createInsight(userId, key, value, confidence);
    }
  }

  /**
   * Create an insight record
   */
  private async createInsight(
    userId: number,
    key: string,
    value: any,
    confidence: number,
  ): Promise<void> {
    const insightType = this.getInsightType(key);
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

    await this.prisma.user_insights.create({
      data: {
        user_id: userId,
        insight_type: insightType,
        insight_key: key,
        insight_value: valueStr,
        confidence,
        source: 'ai_conversation',
      },
    });
  }

  /**
   * Get insight type from key
   */
  private getInsightType(key: string): string {
    if (key.includes('dietary') || key.includes('spice') || key.includes('cuisine')) {
      return 'food_preference';
    }
    if (key.includes('price') || key.includes('order') || key.includes('shopping')) {
      return 'shopping_behavior';
    }
    if (key.includes('communication') || key.includes('tone') || key.includes('personality')) {
      return 'communication_style';
    }
    return 'general';
  }

  /**
   * Calculate profile completeness percentage
   */
  private calculateCompleteness(data: Record<string, any>): number {
    const requiredFields = [
      'dietary_type',
      'communication_tone',
      'price_sensitivity',
      'favorite_cuisines',
      'order_frequency',
    ];

    const optionalFields = [
      'dietary_restrictions',
      'allergies',
      'disliked_ingredients',
      'avg_order_value',
      'preferred_meal_times',
      'personality_traits',
    ];

    let score = 0;
    const requiredWeight = 15; // Each required field = 15%
    const optionalWeight = 5; // Each optional field = 5%

    // Check required fields (75% total)
    requiredFields.forEach(field => {
      if (data[field] && this.hasValue(data[field])) {
        score += requiredWeight;
      }
    });

    // Check optional fields (30% total, capped at 25%)
    let optionalScore = 0;
    optionalFields.forEach(field => {
      if (data[field] && this.hasValue(data[field])) {
        optionalScore += optionalWeight;
      }
    });
    score += Math.min(optionalScore, 25);

    return Math.min(score, 100);
  }

  /**
   * Check if value is meaningful (not empty)
   */
  private hasValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  }

  /**
   * Update profile completeness based on current data
   */
  async updateProfileCompleteness(userId: number): Promise<void> {
    const profile = await this.prisma.user_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!profile) return;

    const completeness = this.calculateCompleteness({
      dietary_type: profile.dietary_type,
      dietary_restrictions: profile.dietary_restrictions,
      allergies: profile.allergies,
      favorite_cuisines: profile.favorite_cuisines,
      disliked_ingredients: profile.disliked_ingredients,
      avg_order_value: profile.avg_order_value,
      order_frequency: profile.order_frequency,
      price_sensitivity: profile.price_sensitivity,
      communication_tone: profile.communication_tone,
      preferred_meal_times: profile.preferred_meal_times,
      personality_traits: profile.personality_traits,
    });

    await this.prisma.user_profiles.update({
      where: { user_id: userId },
      data: { profile_completeness: completeness },
    });

    this.logger.log(`Profile completeness for user ${userId}: ${completeness}%`);
  }

  /**
   * Record user interaction (for behavioral analysis)
   */
  async recordInteraction(
    userId: number,
    type: 'search' | 'click' | 'order' | 'view',
    itemId: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.prisma.user_interactions.create({
      data: {
        user_id: userId,
        item_id: itemId,
        interaction_type: type,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  /**
   * Infer preferences from user behavior (AI analysis)
   * This runs periodically or after significant interactions
   */
  async inferPreferences(userId: number): Promise<void> {
    this.logger.log(`Inferring preferences for user ${userId}`);

    // Get last 30 days of interactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const interactions = await this.prisma.user_interactions.findMany({
      where: {
        user_id: userId,
        created_at: { gte: thirtyDaysAgo },
      },
      orderBy: { created_at: 'desc' },
    });

    if (interactions.length === 0) {
      this.logger.warn(`No interactions found for user ${userId}`);
      return;
    }

    // Analyze order patterns
    const orders = interactions.filter(i => i.interaction_type === 'order');
    
    if (orders.length >= 3) {
      // Infer order frequency
      const daysBetweenOrders = this.calculateAverageDaysBetween(orders.map(o => o.created_at));
      let frequency: string;
      
      if (daysBetweenOrders <= 1.5) frequency = 'daily';
      else if (daysBetweenOrders <= 7) frequency = 'weekly';
      else if (daysBetweenOrders <= 30) frequency = 'monthly';
      else frequency = 'occasional';

      await this.updatePreference(userId, 'order_frequency', frequency, 'inferred', 0.8);

      // Calculate average order value
      const orderValues: number[] = orders
        .map(o => {
          try {
            const meta = typeof o.metadata === 'string' ? JSON.parse(o.metadata) : o.metadata;
            return meta?.total || 0;
          } catch {
            return 0;
          }
        })
        .filter(v => v > 0);

      if (orderValues.length > 0) {
        const avgValue = orderValues.reduce((a, b) => a + b, 0) / orderValues.length;
        await this.updatePreference(userId, 'avg_order_value', avgValue, 'inferred', 0.9);

        // Infer price sensitivity
        let priceSensitivity: string;
        if (avgValue < 200) priceSensitivity = 'budget';
        else if (avgValue < 500) priceSensitivity = 'value';
        else priceSensitivity = 'premium';

        await this.updatePreference(userId, 'price_sensitivity', priceSensitivity, 'inferred', 0.7);
      }
    }

    // TODO: Add more inference logic
    // - Dietary type from ordered items
    // - Favorite cuisines from patterns
    // - Preferred meal times from order timestamps

    this.logger.log(`Preference inference complete for user ${userId}`);
  }

  /**
   * Calculate average days between dates
   */
  private calculateAverageDaysBetween(dates: Date[]): number {
    if (dates.length < 2) return 0;

    const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const daysDiff = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(daysDiff);
    }

    return gaps.reduce((a, b) => a + b, 0) / gaps.length;
  }
}
