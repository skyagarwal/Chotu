/**
 * Group Order Search Executor
 * 
 * Flow engine executor that finds optimal items for group orders
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import { GroupOrderSearchService, GroupOrderRecommendation } from '../../order/services/group-order-search.service';
import { ComplexOrderParserService, ParsedComplexOrder, GroupRequirements } from '../../order/services/complex-order-parser.service';

/**
 * Result interface for group order search
 */
interface ExecutorResult extends ActionExecutionResult {
  data?: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class GroupOrderSearchExecutor implements ActionExecutor {
  readonly name = 'group_order_search';
  private readonly logger = new Logger(GroupOrderSearchExecutor.name);

  constructor(
    @Inject(forwardRef(() => GroupOrderSearchService))
    private readonly groupOrderService: GroupOrderSearchService,
    @Inject(forwardRef(() => ComplexOrderParserService))
    private readonly parserService: ComplexOrderParserService,
  ) {}

  async execute(config: Record<string, any>, context: FlowContext): Promise<ExecutorResult> {
    const startTime = Date.now();
    
    try {
      // Get parsed order from context
      const parsedOrder: ParsedComplexOrder = this.resolveValue(config.parsedOrderPath || 'group_context', context);
      const requirements: GroupRequirements = this.resolveValue(config.requirementsPath || 'group_context.requirements', context);
      
      if (!parsedOrder) {
        return {
          success: false,
          error: 'No parsed order found in context',
          event: 'error',
        };
      }

      // Get user location if available
      const userLocation = context.data?.location ? {
        lat: context.data.location.lat,
        lng: context.data.location.lng,
      } : undefined;

      // Calculate requirements if not provided
      const finalRequirements = requirements || this.parserService.calculateGroupRequirements(parsedOrder);

      this.logger.log(`Searching group order: ${parsedOrder.groupSize} people, budget: ₹${parsedOrder.budget?.amount}`);

      // Find optimal group orders
      const recommendations = await this.groupOrderService.findGroupOrder(
        parsedOrder,
        finalRequirements,
        userLocation,
      );

      if (recommendations.length === 0) {
        return {
          success: true,
          data: {
            recommendations: [],
            message: 'No matching restaurants found for your requirements',
          },
          event: 'no_match',
        };
      }

      // Format recommendations for UI cards
      const cards = this.formatRecommendationsAsCards(recommendations, parsedOrder);

      // Build response
      const result: ExecutorResult = {
        success: true,
        data: {
          recommendations,
          topRecommendation: recommendations[0],
          cards,
          summary: {
            optionsFound: recommendations.length,
            bestValue: recommendations[0].budgetAnalysis.valueScore,
            lowestPrice: Math.min(...recommendations.map(r => r.summary.totalCost)),
            fastestDelivery: Math.min(...recommendations.map(r => r.restaurant.deliveryTime)),
          },
          chatMessage: this.generateChatMessage(recommendations[0], parsedOrder),
        },
        metadata: {
          processingTime: Date.now() - startTime,
          groupSize: parsedOrder.groupSize,
          budget: parsedOrder.budget?.amount,
        },
        event: recommendations.length > 0 ? 'found' : 'no_match',
      };

      this.logger.log(`Found ${recommendations.length} group order options in ${Date.now() - startTime}ms`);
      
      return result;
    } catch (error) {
      this.logger.error(`Group order search failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        event: 'error',
      };
    }
  }

  /**
   * Format recommendations as UI cards
   */
  private formatRecommendationsAsCards(
    recommendations: GroupOrderRecommendation[],
    parsed: ParsedComplexOrder,
  ): any[] {
    return recommendations.map((rec, index) => ({
      id: `group_order_${index}`,
      type: 'group_order_card',
      restaurant: {
        id: rec.restaurant.id,
        name: rec.restaurant.name,
        rating: rec.restaurant.rating,
        deliveryTime: `${rec.restaurant.deliveryTime} mins`,
      },
      items: rec.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        dietary: item.dietary,
        serves: item.servesPersons,
      })),
      summary: {
        totalCost: `₹${rec.summary.totalCost}`,
        perPerson: `₹${rec.summary.perPersonCost}`,
        itemCount: rec.summary.itemCount,
        servings: rec.summary.totalServings,
      },
      budgetAnalysis: {
        used: `${rec.budgetAnalysis.budgetUsed}%`,
        remaining: `₹${rec.budgetAnalysis.budgetRemaining}`,
        isWithinBudget: rec.budgetAnalysis.isWithinBudget,
        valueScore: Math.round(rec.budgetAnalysis.valueScore * 100),
      },
      reasoning: rec.reasoning,
      warnings: rec.warnings,
      action: {
        label: 'Order This',
        value: `select_group_order_${index}`,
      },
    }));
  }

  /**
   * Generate chat message for the recommendation
   */
  private generateChatMessage(rec: GroupOrderRecommendation, parsed: ParsedComplexOrder): string {
    const groupSize = parsed.groupSize || 2;
    const hungerLevel = parsed.hungerLevel || 'normal';
    
    let message = '';
    
    // Personalized intro based on hunger level
    if (hungerLevel === 'very_hungry' || hungerLevel === 'starving') {
      message += `🔥 ${groupSize} bhookhe log? Main samajh gaya! `;
    } else {
      message += `👍 ${groupSize} logon ke liye perfect combo mila! `;
    }

    // Restaurant info
    message += `\n\n🏪 **${rec.restaurant.name}**`;
    if (rec.restaurant.rating >= 4.5) {
      message += ` ⭐ ${rec.restaurant.rating} (Top Rated!)`;
    } else if (rec.restaurant.rating >= 4) {
      message += ` ⭐ ${rec.restaurant.rating}`;
    }
    
    // Delivery time
    message += `\n⏱️ ${rec.restaurant.deliveryTime} mins mein delivery`;

    // Items summary
    message += '\n\n📦 **Items:**\n';
    for (const item of rec.items.slice(0, 5)) {  // Show max 5 items
      const dietaryIcon = item.dietary === 'veg' ? '🟢' : '🔴';
      message += `${dietaryIcon} ${item.quantity}x ${item.name}`;
      if (item.servesPersons > 1) {
        message += ` (serves ${item.servesPersons})`;
      }
      message += '\n';
    }
    if (rec.items.length > 5) {
      message += `+${rec.items.length - 5} more items\n`;
    }

    // Pricing
    message += `\n💰 **Total: ₹${rec.summary.totalCost}**`;
    message += `\n👥 Per person: ₹${rec.summary.perPersonCost}`;
    
    // Budget status
    if (parsed.budget) {
      if (rec.budgetAnalysis.budgetRemaining > 50) {
        message += `\n✅ Budget mein! ₹${rec.budgetAnalysis.budgetRemaining} bach gaye`;
      } else if (rec.budgetAnalysis.isWithinBudget) {
        message += `\n✅ Budget mein fit!`;
      }
    }

    // Reasoning
    message += `\n\n${rec.reasoning}`;

    // Warnings
    if (rec.warnings && rec.warnings.length > 0) {
      message += '\n\n⚠️ ' + rec.warnings.join('\n⚠️ ');
    }

    message += '\n\n"Order" bolo ya items change karna ho toh batao!';

    return message;
  }

  /**
   * Resolve value from context using dot notation path
   */
  private resolveValue(path: string, context: FlowContext): any {
    if (!path) return undefined;
    
    const parts = path.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  }
}
