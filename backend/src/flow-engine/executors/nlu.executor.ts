import { Injectable, Logger } from '@nestjs/common';
import { NluService } from '../../nlu/services/nlu.service';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

/**
 * NLU Executor
 * 
 * Extracts intent and entities from user message
 */
@Injectable()
export class NluExecutor implements ActionExecutor {
  readonly name = 'nlu';
  private readonly logger = new Logger(NluExecutor.name);

  constructor(private readonly nluService: NluService) {}

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const userMessage = (context.data._user_message || context.data.user_message) as string;

      if (!userMessage) {
        return {
          success: false,
          error: 'No user message to analyze',
        };
      }

      this.logger.debug(`Analyzing message: "${userMessage}"`);

      // Call NLU service
      const result = await this.nluService.classify({
        text: userMessage,
        sessionId: context._system.sessionId,
        userId: context._system.userId,
        phoneNumber: context._system.phoneNumber,
      });

      const output = {
        intent: result.intent,
        confidence: result.confidence,
        entities: result.entities || {},
        language: result.language,
        tone: result.tone,
        sentiment: result.sentiment,
      };

      this.logger.debug(
        `NLU result: intent=${result.intent}, confidence=${result.confidence.toFixed(2)}`
      );

      return {
        success: true,
        output,
        event: 'success', // Use generic success event, intent is stored in output
      };
    } catch (error) {
      this.logger.error(`NLU execution failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
