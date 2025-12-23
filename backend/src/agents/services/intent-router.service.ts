import { Injectable, Logger } from '@nestjs/common';
import { AgentContext, RoutingResult, AgentType } from '../types/agent.types';
import { NluClientService } from '../../services/nlu-client.service';
import {
  getAgentForIntent,
  getPrimaryAgent,
  isAgentAvailableForModule,
} from '../config/module-agents.config';
import { getModuleTypeById } from '../config/module-id-mapping';

/**
 * Intent Router
 * 
 * Fast intent classification and agent routing using module configuration
 */
@Injectable()
export class IntentRouterService {
  private readonly logger = new Logger(IntentRouterService.name);

  constructor(private readonly nluService: NluClientService) {}

  /**
   * Route message to appropriate agent
   * Now supports module_id for precise module targeting
   * Enhanced with compound intent detection
   */
  async route(context: AgentContext): Promise<RoutingResult> {
    try {
      // 1. Check for gamification keywords FIRST (Bypass NLU for game triggers)
      const gameIntent = this.checkGamificationIntent(context.message);
      if (gameIntent) {
        this.logger.log(`🎮 Gamification intent detected via keywords: ${gameIntent}`);
        return {
          agentId: 'game-agent', // Virtual agent ID
          agentType: AgentType.CUSTOM,
          intent: gameIntent,
          entities: {},
          confidence: 1.0,
          moduleId: context.moduleId,
          zoneId: context.zoneId,
        };
      }

      // 2. Check for direct action payloads (e.g. from button clicks)
      if (context.message.startsWith('order_item:') || context.message.startsWith('add_to_cart:')) {
        this.logger.log(`🛒 Direct order action detected: ${context.message}`);
        return {
          agentId: 'order-agent',
          agentType: AgentType.ORDER,
          intent: 'add_to_cart',
          entities: { item_id: context.message.split(':')[1] },
          confidence: 1.0,
          moduleId: context.moduleId,
          zoneId: context.zoneId,
        };
      }

      // If moduleId is provided, convert to module type
      let moduleType = context.module;
      if (context.moduleId) {
        moduleType = getModuleTypeById(context.moduleId) as any;
        this.logger.debug(`Module ID ${context.moduleId} mapped to type: ${moduleType}`);
      }

      // Use existing NLU service for classification
      const classification = await this.nluService.classify(
        context.message,
        { module: moduleType, language: context.language },
      );

      // Check for compound intents (e.g., "Hello, I want to order food")
      // Prioritize action intents over greeting/chitchat
      const actionIntents = [
        'order_food', 'search_product', 'book_parcel', 'parcel_booking',
        'track_order', 'cancel_order', 'refund_request', 'schedule_delivery'
      ];
      
      let finalIntent = classification.intent;
      
      // FALLBACK: If NLU returns unknown or low confidence, try pattern matching
      const shouldTryPatterns = 
        finalIntent === 'unknown' || 
        classification.confidence < 0.6 || 
        this.hasMultipleIntents(context.message);
      
      if (shouldTryPatterns) {
        this.logger.debug(`🔍 Pattern matching fallback (intent: ${finalIntent}, confidence: ${classification.confidence})`);
        
        // Check if we have an action intent embedded in the message
        for (const actionIntent of actionIntents) {
          if (this.messageMatchesIntent(context.message, actionIntent)) {
            this.logger.log(`✨ Pattern matched intent "${actionIntent}" over "${finalIntent}" (NLU confidence: ${classification.confidence})`);
            finalIntent = actionIntent;
            break;
          }
        }
      }

      // Map intent to agent type
      const agentType = this.mapIntentToAgent(finalIntent);

      return {
        agentId: this.getAgentIdForType(agentType, moduleType),
        agentType,
        intent: finalIntent,
        entities: classification.entities || {},
        confidence: classification.confidence,
        moduleId: context.moduleId, // Pass through for downstream use
        zoneId: context.zoneId, // Pass through zone ID
      };
    } catch (error) {
      this.logger.error('Intent routing error:', error);

      // Fallback to FAQ agent
      return {
        agentId: 'faq-agent',
        agentType: AgentType.FAQ,
        intent: 'unknown',
        entities: {},
        confidence: 0,
        moduleId: context.moduleId,
        zoneId: context.zoneId,
      };
    }
  }

  /**
   * Check for gamification keywords to bypass NLU
   */
  private checkGamificationIntent(message: string): string | null {
    if (!message) return null;
    
    const lowerMsg = message.toLowerCase().trim();
    
    // Direct game triggers
    if (
      lowerMsg === 'play game' || 
      lowerMsg === 'play' || 
      lowerMsg === 'game' ||
      lowerMsg === 'start game' ||
      lowerMsg === 'earn money' ||
      lowerMsg === 'earn rewards' ||
      lowerMsg === 'rewards' ||
      lowerMsg === 'win prizes'
    ) {
      return 'play_game';
    }
    
    // Pattern matching
    if (lowerMsg.includes('play game') || lowerMsg.includes('start game')) {
      return 'play_game';
    }
    
    return null;
  }

  /**
   * Check if message contains multiple intents
   */
  private hasMultipleIntents(message: string): boolean {
    // Look for punctuation or conjunctions that separate intents
    const multiIntentPatterns = [
      /\b(hello|hi|hey),\s+(?:i|we|can|please)/i, // "Hello, I want..."
      /\b(thanks|thank you),?\s+(?:i|we|can|please)/i, // "Thanks, I need..."
      /\b(goodbye|bye),?\s+but\s+/i, // "Goodbye, but..."
      /\.\s+(?:i|we|can|also|please)/i, // Sentence break with new intent
    ];
    
    return multiIntentPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if message matches a specific intent pattern
   */
  private messageMatchesIntent(message: string, intent: string): boolean {
    const intentPatterns: Record<string, RegExp[]> = {
      order_food: [/\border\b/i, /\bfood\b/i, /\bpizza\b/i, /\burger\b/i, /\bmenu\b/i, /\bhungry\b/i, /\beat\b/i],
      search_product: [/\bsearch\b/i, /\bfind\b/i, /\bproduct\b/i, /\bitem\b/i, /\bbuy\b/i, /\bshopping\b/i, /\bshop\b/i, /\bdukan\b/i, /\bstore\b/i, /\bgrocery\b/i, /\bkirana\b/i],
      book_parcel: [/\bparcel\b/i, /\bpackage\b/i, /\bdeliver\b/i, /\bsend\b/i, /\bship\b/i, /\bcourier\b/i, /\bpick\s*up\b/i, /\bdrop\b/i, /\bbike\b/i, /\bcoolie\b/i],
      parcel_booking: [/\bparcel\b/i, /\bpackage\b/i, /\bdeliver\b/i, /\bsend\b/i, /\bship\b/i, /\bcourier\b/i, /\bpick\s*up\b/i, /\bdrop\b/i, /\bbike\b/i, /\bcoolie\b/i],
      track_order: [/\btrack\b/i, /\bstatus\b/i, /\bwhere.*order\b/i],
      cancel_order: [/\bcancel\b/i, /\bstop.*order\b/i],
      refund_request: [/\brefund\b/i, /\bmoney.*back\b/i],
      schedule_delivery: [/\bschedule\b/i, /\bbook.*time\b/i],
    };
    
    const patterns = intentPatterns[intent];
    if (!patterns) return false;
    
    // Message must match at least 2 patterns for strong confidence
    const matchCount = patterns.filter(pattern => pattern.test(message)).length;
    return matchCount >= Math.min(2, patterns.length);
  }

  /**
   * Map intent to agent type using configuration
   */
  private mapIntentToAgent(intent: string): AgentType {
    // Try to get agent from configuration first
    const configuredAgent = getAgentForIntent(intent);
    if (configuredAgent) {
      return configuredAgent;
    }

    // Fallback mappings for backward compatibility
    const fallbackMap: Record<string, AgentType> = {
      // Search intents
      search_product: AgentType.SEARCH,
      search_restaurant: AgentType.SEARCH,
      find_food: AgentType.SEARCH,
      browse_menu: AgentType.SEARCH,
      show_options: AgentType.SEARCH,

      // Order intents
      add_to_cart: AgentType.ORDER,
      check_order: AgentType.ORDER,

      // Complaint intents
      quality_complaint: AgentType.COMPLAINTS,
      delivery_complaint: AgentType.COMPLAINTS,
      wrong_item: AgentType.COMPLAINTS,
      damaged_item: AgentType.COMPLAINTS,
      refund_request: AgentType.COMPLAINTS,

      // Booking intents
      book_parcel: AgentType.BOOKING,
      parcel_booking: AgentType.BOOKING, // Explicit mapping
      schedule_delivery: AgentType.BOOKING,
      repeat_order: AgentType.BOOKING, // Handle repeat order in booking agent
      manage_address: AgentType.BOOKING, // Handle address management in booking agent

      // FAQ intents
      information: AgentType.FAQ,
      thank_you: AgentType.FAQ,
      service_inquiry: AgentType.FAQ, // Handle general service questions
    };

    return fallbackMap[intent] || AgentType.FAQ;
  }

  /**
   * Get specific agent ID for module + type
   */
  private getAgentIdForType(type: AgentType, module: string): string {
    // For now, simple mapping
    // In future, can have module-specific agents
    const agentIds: Record<AgentType, string> = {
      [AgentType.SEARCH]: 'search-agent',
      [AgentType.ORDER]: 'order-agent',
      [AgentType.COMPLAINTS]: 'complaints-agent',
      [AgentType.BOOKING]: 'booking-agent',
      [AgentType.FAQ]: 'faq-agent',
      [AgentType.CUSTOM]: 'custom-agent',
    };

    return agentIds[type];
  }
}
