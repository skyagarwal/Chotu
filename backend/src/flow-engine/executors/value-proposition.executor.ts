/**
 * Value Proposition Executor
 * 
 * Flow engine executor that calculates and displays pricing value proposition
 */

import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import { ValuePropositionService, ValueProposition } from '../../pricing/services/value-proposition.service';

/**
 * Result interface for value proposition
 */
interface ExecutorResult extends ActionExecutionResult {
  data?: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class ValuePropositionExecutor implements ActionExecutor {
  readonly name = 'value_proposition';
  private readonly logger = new Logger(ValuePropositionExecutor.name);

  constructor(
    private readonly valueService: ValuePropositionService,
  ) {}

  async execute(config: Record<string, any>, context: FlowContext): Promise<ExecutorResult> {
    try {
      // Get pricing info from context
      const itemsTotal = this.resolveValue(config.itemTotalPath || 'pricing.itemsTotal', context) || 0;
      const distance = this.resolveValue(config.distancePath || 'distance', context) || 2;
      const itemCount = this.resolveValue(config.itemCountPath || 'selected_items.length', context) || 1;

      // Check current conditions
      const isPeakHour = this.valueService.isPeakHour();
      
      // Calculate value proposition
      const proposition = this.valueService.calculateValueProposition(
        itemsTotal,
        distance,
        itemCount,
        {
          isPeakHour,
          isBadWeather: false,  // Could integrate weather API
          isSmallOrder: itemsTotal < 149,
        },
      );

      // Only show savings message if meaningful
      const showSavings = proposition.savings >= 20;

      return {
        success: true,
        data: {
          ...proposition,
          showSavings,
          savingsMessage: showSavings 
            ? proposition.displayMessageHindi 
            : null,
          comparisonTable: showSavings 
            ? this.valueService.generateComparisonTable(proposition) 
            : null,
        },
        event: 'success',
      };
    } catch (error) {
      this.logger.error(`Value proposition calculation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        event: 'error',
      };
    }
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

/**
 * Why Mangwale Executor
 * 
 * Handles "Why Mangwale?" type questions
 */
@Injectable()
export class WhyMangwaleExecutor implements ActionExecutor {
  readonly name = 'why_mangwale';

  constructor(
    private readonly valueService: ValuePropositionService,
  ) {}

  async execute(config: Record<string, any>, context: FlowContext): Promise<ExecutorResult> {
    return {
      success: true,
      output: {
        response: this.valueService.getWhyMangwaleResponse(),
      },
      event: 'success',
    };
  }
}
