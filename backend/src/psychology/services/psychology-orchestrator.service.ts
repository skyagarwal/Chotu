import { Injectable, Logger } from '@nestjs/common';
import { PersuasionEngineService, PersuasionContext, PersuasionMessage, UserDecisionStyle } from './persuasion-engine.service';
import { UrgencyTriggerService, UrgencySignal } from './urgency-trigger.service';
import { SocialProofService, SocialProofSignal } from './social-proof.service';
import { BehavioralAnalyticsService } from '../../personalization/services/behavioral-analytics.service';

/**
 * Psychology Orchestrator Service
 * 
 * Combines all psychology signals intelligently:
 * 1. Analyzes user's decision style from behavior
 * 2. Selects appropriate persuasion techniques
 * 3. Adds urgency triggers (if appropriate)
 * 4. Includes social proof
 * 5. Prevents over-triggering (fatigue management)
 * 
 * Output: Ready-to-use psychology-enhanced message components
 */

export interface PsychologyContext {
  userId?: number;
  sessionId?: string;
  itemId?: number;
  itemData?: {
    name: string;
    price: number;
    originalPrice?: number;
    stock?: number;
    rating?: number;
    reviewCount?: number;
    category?: string;
    isVeg?: boolean;
  };
  userCity?: string;
  userDietaryType?: string;
  sessionStage: 'browse' | 'consider' | 'decide' | 'checkout' | 'post_purchase';
  cartValue?: number;
  isRepeatCustomer?: boolean;
  triggersShownThisSession?: number;
}

export interface PsychologyOutput {
  persuasionMessages: PersuasionMessage[];
  urgencySignals: UrgencySignal[];
  socialProof: SocialProofSignal[];
  recommendedMessage: string;    // Best combined message
  recommendedMessageHi: string;  // Hindi version
  decisionStyle: UserDecisionStyle;
  shouldShowTriggers: boolean;   // Fatigue management
  confidence: number;            // How confident we are in recommendations
}

@Injectable()
export class PsychologyOrchestratorService {
  private readonly logger = new Logger(PsychologyOrchestratorService.name);
  
  // Fatigue prevention: Max triggers per session
  private readonly MAX_TRIGGERS_PER_SESSION = 5;
  
  // Cooldown between major triggers (minutes)
  private readonly TRIGGER_COOLDOWN_MINUTES = 10;
  
  // Session trigger tracking
  private sessionTriggers: Map<string, { count: number; lastTrigger: Date }> = new Map();

  constructor(
    private readonly persuasionEngine: PersuasionEngineService,
    private readonly urgencyTrigger: UrgencyTriggerService,
    private readonly socialProof: SocialProofService,
    private readonly behavioralAnalytics: BehavioralAnalyticsService,
  ) {}

  /**
   * Get comprehensive psychology output for a context
   */
  async orchestrate(context: PsychologyContext): Promise<PsychologyOutput> {
    const startTime = Date.now();

    // 1. Determine user's decision style
    const decisionStyle = await this.determineDecisionStyle(context);

    // 2. Check fatigue (should we show triggers at all?)
    const shouldShowTriggers = this.checkFatigue(context.sessionId);

    // 3. Get persuasion messages based on stage and style
    const persuasionContext: PersuasionContext = {
      userId: context.userId,
      decisionStyle,
      sessionStage: context.sessionStage,
      productCategory: context.itemData?.category,
      priceRange: this.getPriceRange(context.itemData?.price),
      isRepeatCustomer: context.isRepeatCustomer || false,
      cartValue: context.cartValue,
    };
    
    const persuasionMessages = this.persuasionEngine.getPersuasionMessages(persuasionContext);

    // 4. Get urgency signals (if item data provided)
    let urgencySignals: UrgencySignal[] = [];
    if (context.itemId && context.itemData && shouldShowTriggers) {
      urgencySignals = this.urgencyTrigger.getUrgencySignals({
        itemId: context.itemId,
        stock: context.itemData.stock ? {
          available: context.itemData.stock,
          reserved: 0,
          reorderLevel: 10,
          avgDailySales: 5,
        } : undefined,
        originalPrice: context.itemData.originalPrice,
        currentPrice: context.itemData.price,
        recentOrders: context.itemData.reviewCount ? Math.floor(context.itemData.reviewCount / 10) : undefined,
      });
    }

    // 5. Get social proof
    let socialProofSignals: SocialProofSignal[] = [];
    if (context.itemId) {
      socialProofSignals = await this.socialProof.getSocialProofSignals({
        itemId: context.itemId,
        userCity: context.userCity,
        userDietaryType: context.userDietaryType,
      });
    }

    // 6. Build recommended message
    const { message, messageHi, confidence } = this.buildRecommendedMessage(
      decisionStyle,
      context.sessionStage,
      persuasionMessages,
      urgencySignals,
      socialProofSignals,
      context.itemData
    );

    // 7. Track trigger usage
    if (shouldShowTriggers && (urgencySignals.length > 0 || persuasionMessages.length > 0)) {
      this.recordTriggerUsage(context.sessionId);
    }

    const processingTime = Date.now() - startTime;
    this.logger.debug(`Psychology orchestration completed in ${processingTime}ms (style: ${decisionStyle})`);

    return {
      persuasionMessages,
      urgencySignals,
      socialProof: socialProofSignals,
      recommendedMessage: message,
      recommendedMessageHi: messageHi,
      decisionStyle,
      shouldShowTriggers,
      confidence,
    };
  }

  /**
   * Get a quick psychology boost for a product card
   */
  async getQuickBoost(params: {
    itemId: number;
    stock?: number;
    rating?: number;
    reviewCount?: number;
    price?: number;
    originalPrice?: number;
    userDecisionStyle?: UserDecisionStyle;
  }): Promise<{ badge: string; badgeHi: string; type: string } | null> {
    const style = params.userDecisionStyle || 'unknown';
    
    // Priority order based on style
    const priorityOrder = this.getBoostPriority(style);

    for (const boostType of priorityOrder) {
      const boost = this.generateBoost(boostType, params);
      if (boost) return boost;
    }

    return null;
  }

  /**
   * Determine user's decision style from behavioral data
   */
  private async determineDecisionStyle(context: PsychologyContext): Promise<UserDecisionStyle> {
    if (!context.userId) {
      return 'unknown';
    }

    try {
      // Get behavioral profile
      const behavioral = await this.behavioralAnalytics.getFullBehavioralProfile(context.userId);
      
      if (!behavioral.engagement) {
        return 'unknown';
      }

      // Analyze signals
      const signals = {
        timeSpentBrowsing: 5, // Would come from session tracking
        itemsViewed: 3,
        comparisonsCount: behavioral.engagement.searchToClickRatio > 0.5 ? 3 : 1,
        readReviews: true,
        checkedSpecs: false,
        priceFiltersUsed: behavioral.rfm?.monetaryScore ? behavioral.rfm.monetaryScore < 3 : false,
        impulseAdds: behavioral.engagement.repeatItemRate > 0.5 ? 2 : 0,
        questionsAsked: 0,
        previousPurchaseSpeed: behavioral.patterns?.orderFrequencyDays 
          ? (behavioral.patterns.orderFrequencyDays < 7 ? 'fast' : 'medium')
          : 'medium',
      } as const;

      return this.persuasionEngine.detectDecisionStyle(signals);
    } catch (error) {
      this.logger.warn(`Failed to determine decision style: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Check if we should show triggers (fatigue prevention)
   */
  private checkFatigue(sessionId?: string): boolean {
    if (!sessionId) return true;

    const tracking = this.sessionTriggers.get(sessionId);
    if (!tracking) return true;

    // Check count limit
    if (tracking.count >= this.MAX_TRIGGERS_PER_SESSION) {
      return false;
    }

    // Check cooldown
    const minutesSinceLastTrigger = 
      (Date.now() - tracking.lastTrigger.getTime()) / (1000 * 60);
    
    if (minutesSinceLastTrigger < this.TRIGGER_COOLDOWN_MINUTES) {
      return false;
    }

    return true;
  }

  /**
   * Record trigger usage
   */
  private recordTriggerUsage(sessionId?: string): void {
    if (!sessionId) return;

    const existing = this.sessionTriggers.get(sessionId);
    this.sessionTriggers.set(sessionId, {
      count: (existing?.count || 0) + 1,
      lastTrigger: new Date(),
    });

    // Cleanup old sessions (simple memory management)
    if (this.sessionTriggers.size > 1000) {
      const oldestKey = this.sessionTriggers.keys().next().value;
      if (oldestKey) this.sessionTriggers.delete(oldestKey);
    }
  }

  /**
   * Build the recommended message combining all signals
   */
  private buildRecommendedMessage(
    style: UserDecisionStyle,
    stage: string,
    persuasion: PersuasionMessage[],
    urgency: UrgencySignal[],
    social: SocialProofSignal[],
    itemData?: PsychologyContext['itemData']
  ): { message: string; messageHi: string; confidence: number } {
    const parts: string[] = [];
    const partsHi: string[] = [];
    let confidence = 50;

    // Add social proof first (builds credibility)
    if (social.length > 0 && social[0].strength >= 60) {
      parts.push(social[0].message);
      partsHi.push(social[0].messageHi);
      confidence += 15;
    }

    // Add persuasion message based on style fit
    if (persuasion.length > 0) {
      parts.push(persuasion[0].message);
      partsHi.push(persuasion[0].message); // Already in Hindi
      confidence += 10;
    }

    // Add urgency for decide/checkout stages only
    if ((stage === 'decide' || stage === 'checkout') && urgency.length > 0) {
      const primaryUrgency = urgency[0];
      if (primaryUrgency.level !== 'low') {
        parts.push(primaryUrgency.message);
        partsHi.push(primaryUrgency.messageHi);
        confidence += primaryUrgency.level === 'critical' ? 20 : 10;
      }
    }

    // Default message if nothing applicable
    if (parts.length === 0) {
      return {
        message: itemData?.name ? `${itemData.name} - Quality assured ✓` : 'Great choice!',
        messageHi: itemData?.name ? `${itemData.name} - Quality assured ✓` : 'बढ़िया choice!',
        confidence: 30,
      };
    }

    return {
      message: parts.join(' • '),
      messageHi: partsHi.join(' • '),
      confidence: Math.min(confidence, 100),
    };
  }

  /**
   * Get boost priority order based on decision style
   */
  private getBoostPriority(style: UserDecisionStyle): string[] {
    const priorities: Record<UserDecisionStyle, string[]> = {
      analytical: ['rating', 'authority', 'social_proof', 'price'],
      impulsive: ['scarcity', 'price', 'trending', 'social_proof'],
      social: ['social_proof', 'trending', 'rating', 'community'],
      cautious: ['rating', 'authority', 'social_proof', 'guarantee'],
      value_seeker: ['price', 'scarcity', 'trending', 'rating'],
      quality_first: ['rating', 'authority', 'premium', 'social_proof'],
      fast: ['scarcity', 'trending', 'social_proof', 'price'],
      price_conscious: ['price', 'scarcity', 'rating', 'trending'],
      unknown: ['rating', 'social_proof', 'price', 'trending'],
    };
    return priorities[style];
  }

  /**
   * Generate a specific boost badge
   */
  private generateBoost(
    type: string,
    params: Parameters<typeof this.getQuickBoost>[0]
  ): { badge: string; badgeHi: string; type: string } | null {
    switch (type) {
      case 'rating':
        if (params.rating && params.rating >= 4.0) {
          return {
            badge: `⭐ ${params.rating.toFixed(1)}`,
            badgeHi: `⭐ ${params.rating.toFixed(1)}`,
            type: 'rating',
          };
        }
        break;

      case 'scarcity':
        if (params.stock && params.stock < 10) {
          return {
            badge: `Only ${params.stock} left!`,
            badgeHi: `सिर्फ ${params.stock} बचे!`,
            type: 'scarcity',
          };
        }
        break;

      case 'price':
        if (params.originalPrice && params.price && params.price < params.originalPrice) {
          const discount = Math.round(((params.originalPrice - params.price) / params.originalPrice) * 100);
          if (discount >= 10) {
            return {
              badge: `${discount}% OFF`,
              badgeHi: `${discount}% छूट`,
              type: 'price',
            };
          }
        }
        break;

      case 'trending':
        if (params.reviewCount && params.reviewCount > 100) {
          return {
            badge: '🔥 Trending',
            badgeHi: '🔥 Trending',
            type: 'trending',
          };
        }
        break;

      case 'social_proof':
        if (params.reviewCount && params.reviewCount >= 50) {
          return {
            badge: `${params.reviewCount}+ reviews`,
            badgeHi: `${params.reviewCount}+ reviews`,
            type: 'social_proof',
          };
        }
        break;

      case 'authority':
        if (params.rating && params.rating >= 4.5) {
          return {
            badge: '✓ Top Rated',
            badgeHi: '✓ Top Rated',
            type: 'authority',
          };
        }
        break;
    }

    return null;
  }

  /**
   * Get price range category
   */
  private getPriceRange(price?: number): 'low' | 'medium' | 'high' | undefined {
    if (!price) return undefined;
    if (price < 100) return 'low';
    if (price < 500) return 'medium';
    return 'high';
  }

  /**
   * Clear session tracking (for cleanup)
   */
  clearSessionTracking(sessionId: string): void {
    this.sessionTriggers.delete(sessionId);
  }
}
