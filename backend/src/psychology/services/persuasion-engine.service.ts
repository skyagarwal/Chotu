import { Injectable, Logger } from '@nestjs/common';

/**
 * Persuasion Engine Service
 * 
 * Uses behavioral psychology principles for ethical persuasion:
 * - Social proof
 * - Scarcity signals
 * - Reciprocity triggers
 * - Authority cues
 * - Commitment/consistency
 * - Liking principles
 */

export type UserDecisionStyle = 'fast' | 'analytical' | 'social' | 'price_conscious' | 'unknown' | 'impulsive' | 'cautious' | 'value_seeker' | 'quality_first';

export interface PersuasionContext {
  userId?: number;
  sessionId?: string;
  itemData?: {
    name: string;
    price: number;
    stock?: number;
    rating?: number;
    reviewCount?: number;
    category?: string;
  };
  sessionStage: 'browse' | 'consider' | 'decide' | 'checkout' | 'post_purchase';
  userDecisionStyle?: UserDecisionStyle;
  decisionStyle?: UserDecisionStyle;
  isRepeatCustomer?: boolean;
  productCategory?: string;
  priceRange?: string;
  cartValue?: number;
}

export interface PersuasionMessage {
  type: 'social_proof' | 'scarcity' | 'authority' | 'reciprocity' | 'commitment' | 'liking';
  message: string;
  messageHi?: string;
  confidence: number;
  trigger?: string;
}

@Injectable()
export class PersuasionEngineService {
  private readonly logger = new Logger(PersuasionEngineService.name);

  /**
   * Generate persuasion messages based on context
   */
  async generatePersuasionMessages(context: PersuasionContext): Promise<PersuasionMessage[]> {
    const messages: PersuasionMessage[] = [];

    try {
      // Social proof
      if (context.itemData?.reviewCount && context.itemData.reviewCount > 10) {
        messages.push({
          type: 'social_proof',
          message: `${context.itemData.reviewCount}+ people love this!`,
          messageHi: `${context.itemData.reviewCount}+ लोग इसे पसंद करते हैं!`,
          confidence: 0.8,
        });
      }

      // Scarcity
      if (context.itemData?.stock && context.itemData.stock < 10) {
        messages.push({
          type: 'scarcity',
          message: `Only ${context.itemData.stock} left in stock!`,
          messageHi: `स्टॉक में सिर्फ ${context.itemData.stock} बचे हैं!`,
          confidence: 0.9,
        });
      }

      // Authority (high rating)
      if (context.itemData?.rating && context.itemData.rating >= 4.5) {
        messages.push({
          type: 'authority',
          message: `Top rated with ${context.itemData.rating}★`,
          messageHi: `${context.itemData.rating}★ के साथ टॉप रेटेड`,
          confidence: 0.85,
        });
      }

      // Repeat customer appreciation
      if (context.isRepeatCustomer) {
        messages.push({
          type: 'reciprocity',
          message: 'Special pricing for our valued customer!',
          messageHi: 'हमारे प्रिय ग्राहक के लिए विशेष मूल्य!',
          confidence: 0.7,
        });
      }

    } catch (error) {
      this.logger.error('Error generating persuasion messages:', error);
    }

    return messages;
  }

  /**
   * Alias for generatePersuasionMessages (backward compatibility)
   */
  getPersuasionMessages(context: PersuasionContext): PersuasionMessage[] {
    // Synchronous version - returns empty array, use generatePersuasionMessages for async
    return [];
  }

  /**
   * Analyze user's decision-making style
   */
  analyzeDecisionStyle(userBehavior: any): UserDecisionStyle {
    // Placeholder - would analyze user behavior patterns
    return 'unknown';
  }

  /**
   * Detect decision style from signals
   */
  detectDecisionStyle(signals: any): UserDecisionStyle {
    // Placeholder implementation
    return 'unknown';
  }

  /**
   * Get persuasion message for specific trigger
   */
  getPersuasionByType(type: PersuasionMessage['type'], context: PersuasionContext): PersuasionMessage | null {
    // Placeholder implementation
    return null;
  }
}
