/**
 * Complex Order Parser Executor
 * 
 * Flow engine executor that parses complex food orders like:
 * - "We are 3 people, very hungry, under 1000"
 * - "Order veg food for 4, deliver in 45 mins"
 */

import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import { ComplexOrderParserService, ParsedComplexOrder } from '../../order/services/complex-order-parser.service';

/**
 * Result interface for complex order parser
 */
interface ExecutorResult extends ActionExecutionResult {
  data?: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class ComplexOrderParserExecutor implements ActionExecutor {
  readonly name = 'complex_order_parser';
  private readonly logger = new Logger(ComplexOrderParserExecutor.name);

  constructor(
    private readonly parserService: ComplexOrderParserService,
  ) {}

  async execute(config: Record<string, any>, context: FlowContext): Promise<ExecutorResult> {
    const startTime = Date.now();
    
    try {
      // Get user message from context
      const userMessage = context.data?._user_message || context.data?.user_message || '';
      
      if (!userMessage) {
        return {
          success: false,
          error: 'No user message found in context',
        };
      }

      this.logger.log(`Parsing complex order from: "${userMessage.substring(0, 100)}..."`);

      // Parse the complex order
      const parsed = await this.parserService.parseComplexOrder(userMessage);

      // Calculate group requirements if it's a group order
      let requirements = null;
      if (parsed.groupSize && parsed.groupSize > 1) {
        requirements = this.parserService.calculateGroupRequirements(parsed);
      }

      // Determine if we need clarification
      const needsClarification = this.checkNeedsClarification(parsed);

      // Build result
      const result: ExecutorResult = {
        success: true,
        data: {
          ...parsed,
          requirements,
          needsClarification,
          clarificationQuestions: needsClarification 
            ? this.generateClarificationQuestions(parsed) 
            : [],
        },
        metadata: {
          processingTime: Date.now() - startTime,
          confidence: parsed.confidence,
          intent: parsed.intent,
        },
      };

      // Determine transition event
      if (needsClarification) {
        result.event = 'needs_clarification';
      } else if (parsed.intent === 'group_order') {
        result.event = 'group_order';
      } else if (parsed.intent === 'specific_restaurant') {
        result.event = 'specific_restaurant';
      } else if (parsed.intent === 'budget_order') {
        result.event = 'budget_order';
      } else if (parsed.intent === 'time_constrained') {
        result.event = 'time_constrained';
      } else {
        result.event = 'regular_order';
      }

      this.logger.log(`Parsed order: intent=${parsed.intent}, event=${result.event}, confidence=${parsed.confidence}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Complex order parsing failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        event: 'error',
      };
    }
  }

  /**
   * Check if we need to ask for clarification
   */
  private checkNeedsClarification(parsed: ParsedComplexOrder): boolean {
    // For group orders, we need group size and budget
    if (parsed.intent === 'group_order') {
      if (!parsed.groupSize) return true;
      if (!parsed.budget && parsed.confidence < 0.6) return true;
    }

    // For budget orders, we need budget amount
    if (parsed.intent === 'budget_order' && !parsed.budget) {
      return true;
    }

    // Low confidence overall
    if (parsed.confidence < 0.4) {
      return true;
    }

    return false;
  }

  /**
   * Generate clarification questions based on what's missing
   */
  private generateClarificationQuestions(parsed: ParsedComplexOrder): string[] {
    const questions: string[] = [];

    if (parsed.intent === 'group_order') {
      if (!parsed.groupSize) {
        questions.push('Kitne log hain? (How many people?)');
      }
      if (!parsed.budget) {
        questions.push('Budget kitna hai? (What\'s your budget?)');
      }
      if (!parsed.dietary || parsed.dietary.length === 0) {
        questions.push('Veg ya non-veg? (Vegetarian or non-vegetarian?)');
      }
    }

    if (parsed.confidence < 0.4 && questions.length === 0) {
      questions.push('Thoda aur detail mein batao kya chahiye? (Can you tell me more about what you want?)');
    }

    return questions;
  }
}
