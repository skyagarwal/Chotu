import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserPreferenceService, UserPreferences } from './user-preference.service';

/**
 * User Interaction Pattern - tracks how user behaves in flows
 */
export interface UserInteractionPattern {
  userId: number;
  
  // Flow behavior
  averageStepsToCheckout: number;
  skipsBrowsingForReorder: boolean;
  prefersQuickReorder: boolean;
  usesVoiceCommands: boolean;
  
  // Decision patterns
  decisiveUser: boolean;  // Knows what they want quickly
  exploratoryUser: boolean;  // Likes to browse options
  priceComparator: boolean;  // Often compares prices
  
  // Abandonment signals
  abandonmentRate: number; // 0-1
  commonAbandonmentStates: string[];
  
  // Time patterns
  avgTimeOnDecision: number; // seconds
  peakOrderingHours: number[]; // [12, 13, 19, 20]
  
  // Content preferences  
  prefersDetailedInfo: boolean;
  prefersMinimalUI: boolean;
  clicksOnSuggestions: boolean;
}

/**
 * Flow Adaptation - how to modify flow for this user
 */
export interface FlowAdaptation {
  // Skip steps
  skipBrowsing: boolean;
  skipConfirmation: boolean;
  skipUpsells: boolean;
  
  // Show/hide features
  showQuickReorder: boolean;
  showPriceComparisons: boolean;
  showDetailedDescriptions: boolean;
  showSuggestions: boolean;
  
  // Modify prompts
  useShortPrompts: boolean;
  useCasualTone: boolean;
  includeEmojis: boolean;
  
  // Auto-actions
  autoSelectLastAddress: boolean;
  autoSelectLastPayment: boolean;
  prefillQuantities: boolean;
  
  // Upsell strategy
  upsellAggressiveness: 'none' | 'subtle' | 'moderate' | 'aggressive';
  
  // Special flows
  suggestReorder: boolean;
  offerSubscription: boolean;
}

/**
 * 🔄 Adaptive Flow Service
 * 
 * Provides dynamic flow adaptations based on user behavior patterns.
 * This enables "smart" flows that learn and adapt to each user.
 * 
 * Key Features:
 * 1. Track user interaction patterns across sessions
 * 2. Identify decisive vs exploratory users
 * 3. Detect abandonment signals and intervene
 * 4. Personalize flow steps and prompts
 * 5. Auto-skip unnecessary steps for power users
 */
@Injectable()
export class AdaptiveFlowService {
  private readonly logger = new Logger(AdaptiveFlowService.name);
  
  // Cache patterns for quick access
  private patternCache = new Map<number, { pattern: UserInteractionPattern; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private userPreferenceService: UserPreferenceService,
  ) {}

  /**
   * Get flow adaptations for a user
   */
  async getFlowAdaptations(userId: number): Promise<FlowAdaptation> {
    try {
      const [pattern, preferences] = await Promise.all([
        this.getUserInteractionPattern(userId),
        this.userPreferenceService.getPreferences(userId),
      ]);

      return this.computeAdaptations(pattern, preferences);
    } catch (error) {
      this.logger.error(`Failed to get adaptations for user ${userId}: ${error.message}`);
      return this.getDefaultAdaptations();
    }
  }

  /**
   * Get user interaction pattern from database/cache
   */
  async getUserInteractionPattern(userId: number): Promise<UserInteractionPattern> {
    // Check cache
    const cached = this.patternCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.pattern;
    }

    try {
      // Fetch interaction data
      const interactions = await this.prisma.user_interactions.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 100, // Last 100 interactions
      });

      const pattern = this.analyzeInteractionPattern(userId, interactions);
      
      // Cache it
      this.patternCache.set(userId, { pattern, timestamp: Date.now() });
      
      return pattern;
    } catch (error) {
      this.logger.warn(`Error fetching patterns for user ${userId}: ${error.message}`);
      return this.getDefaultPattern(userId);
    }
  }

  /**
   * Analyze raw interaction data to build pattern
   */
  private analyzeInteractionPattern(
    userId: number,
    interactions: any[]
  ): UserInteractionPattern {
    // Analyze interactions
    const clicks = interactions.filter(i => i.interaction_type === 'click');
    const selections = interactions.filter(i => i.interaction_type === 'selection');
    const searches = interactions.filter(i => i.interaction_type === 'search');
    const reorders = interactions.filter(i => i.interaction_type === 'reorder');

    // Calculate click-through on suggestions
    const suggestionClicks = clicks.filter(c => 
      c.metadata && (c.metadata as any).source === 'suggestion'
    );
    const clicksOnSuggestions = suggestionClicks.length / Math.max(clicks.length, 1) > 0.3;

    // Analyze interaction-based patterns (without session data)
    const completedInteractions = interactions.filter(i => i.interaction_type === 'checkout');
    const abandonedInteractions = interactions.filter(i => i.interaction_type === 'abandon');
    
    const totalInteractions = interactions.length;
    const completedCount = completedInteractions.length;
    const abandonedCount = abandonedInteractions.length;
    
    const avgSteps = completedCount > 0 ? 8 : 10; // Estimate based on completion
    const abandonmentRate = totalInteractions > 0 ? abandonedCount / totalInteractions : 0;

    // Determine user type based on interactions
    const avgDecisionTime = 30; // Default estimate
    const decisive = completedCount > abandonedCount && searches.length < selections.length * 2;
    const exploratory = searches.length > selections.length * 2;
    const priceComparator = interactions.filter(i => 
      i.interaction_type === 'view' && (i.metadata as any)?.view === 'price_comparison'
    ).length > 2;

    // Time analysis from interactions
    const orderHours: number[] = [];
    for (const interaction of interactions.filter(i => i.created_at)) {
      const hour = new Date(interaction.created_at).getHours();
      orderHours.push(hour);
    }
    const peakHours = this.findPeakHours(orderHours);

    // Get common abandonment states from metadata
    const abandonmentStates = abandonedInteractions
      .map(i => (i.metadata as any)?.state)
      .filter(Boolean);

    return {
      userId,
      averageStepsToCheckout: avgSteps,
      skipsBrowsingForReorder: reorders.length > completedCount * 0.3,
      prefersQuickReorder: reorders.length > 5,
      usesVoiceCommands: false,
      decisiveUser: decisive,
      exploratoryUser: exploratory,
      priceComparator,
      abandonmentRate,
      commonAbandonmentStates: [...new Set(abandonmentStates)].slice(0, 3),
      avgTimeOnDecision: avgDecisionTime,
      peakOrderingHours: peakHours,
      prefersDetailedInfo: exploratory || priceComparator,
      prefersMinimalUI: decisive && avgSteps < 6,
      clicksOnSuggestions,
    };
  }

  /**
   * Find peak ordering hours
   */
  private findPeakHours(hours: number[]): number[] {
    const counts = new Map<number, number>();
    for (const h of hours) {
      counts.set(h, (counts.get(h) || 0) + 1);
    }
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([hour]) => hour);
  }

  /**
   * Compute adaptations based on pattern and preferences
   */
  private computeAdaptations(
    pattern: UserInteractionPattern,
    preferences: UserPreferences
  ): FlowAdaptation {
    const { decisiveUser, exploratoryUser, priceComparator, abandonmentRate, 
            prefersQuickReorder, clicksOnSuggestions, prefersMinimalUI } = pattern;
    
    const tone = preferences.communicationTone || 'friendly';
    const emojiUsage = preferences.emojiUsage || 'moderate';
    const messageLength = preferences.messageLength || 'medium';

    return {
      // Skip steps for decisive/power users
      skipBrowsing: decisiveUser && prefersQuickReorder,
      skipConfirmation: decisiveUser && pattern.averageStepsToCheckout < 6,
      skipUpsells: decisiveUser || abandonmentRate > 0.5,

      // Show features based on behavior
      showQuickReorder: prefersQuickReorder,
      showPriceComparisons: priceComparator || exploratoryUser,
      showDetailedDescriptions: exploratoryUser || pattern.prefersDetailedInfo,
      showSuggestions: clicksOnSuggestions || exploratoryUser,

      // Prompt modifications
      useShortPrompts: messageLength === 'short' || prefersMinimalUI || decisiveUser,
      useCasualTone: tone === 'casual' || tone === 'friendly',
      includeEmojis: emojiUsage === 'love' || emojiUsage === 'moderate',

      // Auto-actions for power users
      autoSelectLastAddress: decisiveUser || prefersQuickReorder,
      autoSelectLastPayment: decisiveUser,
      prefillQuantities: prefersQuickReorder,

      // Upsell strategy based on abandonment and behavior
      upsellAggressiveness: abandonmentRate > 0.4 ? 'none' : 
                           decisiveUser ? 'subtle' :
                           exploratoryUser ? 'moderate' : 'subtle',

      // Special flows
      suggestReorder: prefersQuickReorder,
      offerSubscription: pattern.averageStepsToCheckout < 8 && abandonmentRate < 0.2,
    };
  }

  /**
   * Record a user interaction for future analysis
   */
  async recordInteraction(
    userId: number,
    type: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.prisma.user_interactions.create({
        data: {
          user_id: userId,
          item_id: metadata.itemId || 0,  // Required field
          interaction_type: type,
          metadata: metadata as any,
          created_at: new Date(),
        },
      });

      // Invalidate cache
      this.patternCache.delete(userId);
    } catch (error) {
      this.logger.warn(`Failed to record interaction: ${error.message}`);
    }
  }

  /**
   * Check if we should intervene to prevent abandonment
   */
  async shouldIntervenePrevention(
    userId: number,
    currentState: string,
    timeInState: number // seconds
  ): Promise<{ shouldIntervene: boolean; intervention?: string }> {
    const pattern = await this.getUserInteractionPattern(userId);
    
    // Check if current state is a common abandonment point
    if (pattern.commonAbandonmentStates.includes(currentState)) {
      if (timeInState > pattern.avgTimeOnDecision * 2) {
        return {
          shouldIntervene: true,
          intervention: this.getInterventionMessage(currentState),
        };
      }
    }

    // Check for general stalling
    if (timeInState > 120 && pattern.abandonmentRate > 0.3) {
      return {
        shouldIntervene: true,
        intervention: "Need any help? I'm here to assist! 🙋",
      };
    }

    return { shouldIntervene: false };
  }

  /**
   * Get context-specific intervention message
   */
  private getInterventionMessage(state: string): string {
    const interventions: Record<string, string> = {
      'show_results': "Can't find what you're looking for? Try describing it differently, or I can show you popular items! 🍕",
      'confirm_address': "If your address looks correct, just say 'yes' to continue! Or tell me a different address.",
      'payment_selection': "Any payment method works! You can also pay cash on delivery if you prefer.",
      'cart_review': "Ready to order? Just say 'checkout' when you're ready! 🛒",
      'quantity_selection': "Just tell me the quantity you'd like, or select from the buttons above!",
    };
    
    return interventions[state] || "Still there? Let me know if you need any help! 😊";
  }

  /**
   * Get default adaptations for new users
   */
  private getDefaultAdaptations(): FlowAdaptation {
    return {
      skipBrowsing: false,
      skipConfirmation: false,
      skipUpsells: false,
      showQuickReorder: false,
      showPriceComparisons: false,
      showDetailedDescriptions: true,
      showSuggestions: true,
      useShortPrompts: false,
      useCasualTone: true,
      includeEmojis: true,
      autoSelectLastAddress: false,
      autoSelectLastPayment: false,
      prefillQuantities: false,
      upsellAggressiveness: 'subtle',
      suggestReorder: false,
      offerSubscription: false,
    };
  }

  /**
   * Get default pattern for users without history
   */
  private getDefaultPattern(userId: number): UserInteractionPattern {
    return {
      userId,
      averageStepsToCheckout: 10,
      skipsBrowsingForReorder: false,
      prefersQuickReorder: false,
      usesVoiceCommands: false,
      decisiveUser: false,
      exploratoryUser: true,
      priceComparator: false,
      abandonmentRate: 0,
      commonAbandonmentStates: [],
      avgTimeOnDecision: 30,
      peakOrderingHours: [12, 13, 19, 20],
      prefersDetailedInfo: true,
      prefersMinimalUI: false,
      clicksOnSuggestions: true,
    };
  }
}
