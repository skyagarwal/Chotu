import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FlowContextService } from './flow-context.service';
import { ExecutorRegistryService } from './executor-registry.service';
import {
  FlowDefinition,
  FlowContext,
  FlowState,
  StateExecutionResult,
  FlowAction,
  ActionExecutionResult,
} from './types/flow.types';

/**
 * Executor Error for structured error handling
 */
export interface ExecutorError {
  executor: string;
  action?: string;
  state: string;
  message: string;
  code?: string;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;
}

/**
 * State Machine Engine
 * 
 * Core engine that executes state transitions and actions
 * 
 * ENHANCED: Improved error handling with:
 * - Structured error types
 * - Error recovery strategies
 * - Retry with exponential backoff
 * - Error context preservation
 */
@Injectable()
export class StateMachineEngine {
  private readonly logger = new Logger(StateMachineEngine.name);
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000; // Base delay for exponential backoff

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextService: FlowContextService,
    private readonly executorRegistry: ExecutorRegistryService,
  ) {}

  /**
   * Execute a single state
   */
  async executeState(
    flow: FlowDefinition,
    context: FlowContext,
    event?: string
  ): Promise<StateExecutionResult> {
    const currentStateName = context._system.currentState;
    const state = flow.states[currentStateName];

    if (!state) {
      return {
        nextState: null,
        context,
        completed: true,
        error: `State not found: ${currentStateName}`,
      };
    }

    this.logger.log(
      `📋 Executing state: ${currentStateName} (type: ${state.type})`
    );

    try {
      // 1. Execute onEntry actions - ONLY when first entering (no event)
      // When resuming with user input (event='user_message'), skip onEntry
      if (state.onEntry && state.onEntry.length > 0 && !event) {
        this.logger.debug(`Running ${state.onEntry.length} onEntry actions`);
        await this.executeActions(state.onEntry, context, currentStateName);
      }

      // 2. Execute main actions based on state type
      let triggeredEvent: string | undefined = event;

      // For 'wait' states:
      // - When first entering (no event): DON'T run actions (only onEntry prompts)
      // - When resuming with user input (event='user_message'): Run actions for validation
      // For 'action' states: ALWAYS run actions
      const shouldExecuteActions = 
        state.type === 'action' || 
        (state.type === 'wait' && event); // Wait states ONLY execute actions when resuming with event

      if (shouldExecuteActions && state.actions) {
        const results = await this.executeActions(state.actions, context, currentStateName);
        // Check if any action explicitly triggered an event
        // Pass state.type to allow different behavior for action vs wait states
        const actionEvent = this.findTriggeredEvent(results, state.type);
        this.logger.debug(`Action results events: ${JSON.stringify(results.map(r => ({ event: r.event, success: r.success })))}`);
        this.logger.debug(`actionEvent from findTriggeredEvent: ${actionEvent}, state.type: ${state.type}, incoming event: ${event}`);
        // For wait states resuming with user input: preserve user_message event
        // unless action returns a meaningful event (not 'default' or 'success')
        if (state.type === 'wait' && event) {
          // Keep the incoming event (e.g., 'user_message') unless action explicitly triggers different
          // Note: 'success' is no longer inferred for wait states
          triggeredEvent = (actionEvent && actionEvent !== 'default') ? actionEvent : event;
        } else {
          triggeredEvent = actionEvent || event;
        }
        this.logger.debug(`Final triggeredEvent: ${triggeredEvent}`);
      } else if (state.type === 'decision' && state.conditions) {
        triggeredEvent = await this.evaluateConditions(state.conditions, context);
      } else if (state.type === 'end') {
        // End state - no actions needed
        triggeredEvent = 'completed';
      }

      // 3. Determine next state from transitions
      const nextState = state.transitions[triggeredEvent || 'default'];

      // 4. Execute onExit actions
      if (state.onExit && state.onExit.length > 0 && nextState) {
        this.logger.debug(`Running ${state.onExit.length} onExit actions`);
        await this.executeActions(state.onExit, context, currentStateName);
      }

      // 5. Check if flow is complete
      // If nextState is found, check if it's a final state
      // If nextState is NOT found, check if we are waiting for an event (has transitions) or truly done
      const hasTransitions = state.transitions && Object.keys(state.transitions).length > 0;
      const completed = (nextState && flow.finalStates.includes(nextState)) || (!nextState && !hasTransitions);

      this.logger.log(
        `✅ State complete: ${currentStateName} → ${nextState || 'STAY'} (event: ${triggeredEvent || 'none'}, completed: ${completed})`
      );

      return {
        nextState: nextState || null,
        event: triggeredEvent,
        context,
        completed,
      };
    } catch (error) {
      this.logger.error(
        `Error executing state ${currentStateName}: ${error.message}`,
        error.stack
      );

      this.contextService.recordError(context, error.message);

      return {
        nextState: null,
        context,
        completed: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute multiple actions sequentially with enhanced error handling
   */
  private async executeActions(
    actions: FlowAction[],
    context: FlowContext,
    stateName?: string
  ): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (const action of actions) {
      try {
        // Interpolate config values
        const interpolatedConfig = this.contextService.interpolateObject(
          context,
          action.config
        );

        // Execute action with retry support
        const result = await this.executeActionWithRetry(
          action,
          interpolatedConfig,
          context,
          stateName
        );

        results.push(result);

        // Store output if specified
        if (action.output && result.output !== undefined) {
          this.contextService.set(context, action.output, result.output);
        }

        // Handle errors based on strategy
        if (!result.success) {
          const errorHandled = await this.handleExecutorError(
            action,
            result,
            context,
            stateName || 'unknown'
          );

          if (!errorHandled.continue) {
            throw new Error(errorHandled.message);
          }
        }
      } catch (error) {
        this.logger.error(
          `Action ${action.executor} threw error: ${error.message}`
        );

        // Record error in context
        this.recordExecutorError(context, {
          executor: action.executor,
          action: action.id,
          state: stateName || 'unknown',
          message: error.message,
          recoverable: action.onError === 'continue',
          retryable: action.onError === 'retry',
          timestamp: new Date(),
        });

        results.push({
          success: false,
          error: error.message,
        });

        // Re-throw if error strategy is 'fail'
        if (action.onError !== 'continue') {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Execute action with retry support and exponential backoff
   */
  private async executeActionWithRetry(
    action: FlowAction,
    config: Record<string, any>,
    context: FlowContext,
    stateName?: string
  ): Promise<ActionExecutionResult> {
    const maxRetries = action.retryCount || action.maxRetries || 0;
    const shouldRetry = action.onError === 'retry' || action.retryOnError;
    
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= maxRetries) {
      attempts++;
      
      try {
        const result = await this.executorRegistry.execute(
          action.executor,
          config,
          context
        );

        // If successful or not retrying on failure, return immediately
        if (result.success || !shouldRetry) {
          return result;
        }

        // Store error for potential retry
        lastError = new Error(result.error || 'Unknown error');
        
        if (attempts <= maxRetries) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempts - 1);
          this.logger.warn(
            `Action ${action.executor} failed (attempt ${attempts}/${maxRetries + 1}), ` +
            `retrying in ${delay}ms: ${result.error}`
          );
          await this.sleep(delay);
        }
      } catch (error) {
        lastError = error;
        
        if (shouldRetry && attempts <= maxRetries) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempts - 1);
          this.logger.warn(
            `Action ${action.executor} threw error (attempt ${attempts}/${maxRetries + 1}), ` +
            `retrying in ${delay}ms: ${error.message}`
          );
          await this.sleep(delay);
        } else {
          throw error;
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError?.message || 'Max retries exceeded',
    };
  }

  /**
   * Handle executor error with structured response
   */
  private async handleExecutorError(
    action: FlowAction,
    result: ActionExecutionResult,
    context: FlowContext,
    stateName: string
  ): Promise<{ continue: boolean; message: string }> {
    const errorStrategy = action.onError || action.errorStrategy || 'fail';
    const errorMessage = result.error || 'Unknown executor error';

    // Record error
    this.recordExecutorError(context, {
      executor: action.executor,
      action: action.id,
      state: stateName,
      message: errorMessage,
      recoverable: errorStrategy === 'continue' || errorStrategy === 'skip',
      retryable: errorStrategy === 'retry',
      timestamp: new Date(),
    });

    switch (errorStrategy) {
      case 'continue':
      case 'skip':
        this.logger.warn(
          `Executor ${action.executor} failed but continuing: ${errorMessage}`
        );
        return { continue: true, message: errorMessage };

      case 'retry':
        // Retry was already handled in executeActionWithRetry
        this.logger.error(
          `Executor ${action.executor} failed after retries: ${errorMessage}`
        );
        return { continue: false, message: `Max retries exceeded: ${errorMessage}` };

      case 'fail':
      default:
        this.logger.error(
          `Executor ${action.executor} failed (strategy: fail): ${errorMessage}`
        );
        return { continue: false, message: errorMessage };
    }
  }

  /**
   * Record executor error in context for debugging and analytics
   */
  private recordExecutorError(context: FlowContext, error: ExecutorError): void {
    if (!context._system.errorHistory) {
      context._system.errorHistory = [];
    }

    context._system.errorHistory.push({
      state: error.state,
      error: `[${error.executor}] ${error.message}`,
      timestamp: error.timestamp,
    });

    // Also store last error for quick access
    context.data._lastError = {
      executor: error.executor,
      message: error.message,
      recoverable: error.recoverable,
      timestamp: error.timestamp.toISOString(),
    };
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute multiple actions sequentially
   * @deprecated Use executeActions with stateName parameter instead
   */

  /**
   * Evaluate conditions and return triggered event
   */
  private async evaluateConditions(
    conditions: Array<{ expression: string; event: string }>,
    context: FlowContext
  ): Promise<string | undefined> {
    for (const condition of conditions) {
      try {
        const result = this.contextService.evaluateExpression(
          context,
          condition.expression
        );

        if (result) {
          this.logger.debug(
            `Condition matched: ${condition.expression} → ${condition.event}`
          );
          return condition.event;
        }
      } catch (error) {
        this.logger.error(
          `Error evaluating condition: ${condition.expression}`,
          error
        );
      }
    }

    return undefined;
  }

  /**
   * Find if any action result triggered an event
   * For action states, infer 'success' if all actions succeed without explicit events
   * For wait states, only return explicit events (not inferred)
   */
  private findTriggeredEvent(results: ActionExecutionResult[], stateType?: string): string | undefined {
    // First, check for explicit events
    for (const result of results) {
      if (result.event) {
        return result.event;
      }
    }
    
    // Only infer 'success' for action states (not wait states)
    // Wait states should preserve the incoming user_message event
    if (stateType === 'action') {
      const allSucceeded = results.length > 0 && results.every(r => r.success);
      if (allSucceeded) {
        return 'success';
      }
    }
    
    // Check if any action failed - always return 'error' for failures
    const anyFailed = results.some(r => r.success === false);
    if (anyFailed) {
      return 'error';
    }
    
    return undefined;
  }

  /**
   * Validate flow definition
   */
  validateFlow(flow: FlowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check flow.states exists
    if (!flow.states || typeof flow.states !== 'object') {
      errors.push(`Flow states is missing or invalid (got: ${typeof flow.states})`);
      return { valid: false, errors };
    }

    // Check initial state exists
    if (!flow.states[flow.initialState]) {
      errors.push(`Initial state '${flow.initialState}' not found`);
    }

    // Check final states exist
    for (const finalState of flow.finalStates) {
      if (!flow.states[finalState]) {
        errors.push(`Final state '${finalState}' not found`);
      }
    }

    // Validate each state
    for (const [stateName, state] of Object.entries(flow.states)) {
      if (!state || typeof state !== 'object') {
        errors.push(`State '${stateName}' is invalid`);
        continue;
      }

      // Check transitions point to existing states
      if (state.transitions && typeof state.transitions === 'object') {
        for (const [event, nextState] of Object.entries(state.transitions)) {
          if (nextState && !flow.states[nextState]) {
            errors.push(
              `State '${stateName}' transition '${event}' points to non-existent state '${nextState}'`
            );
          }
        }
      }

      // Check executors exist
      const allActions = [
        ...(state.actions || []),
        ...(state.onEntry || []),
        ...(state.onExit || []),
      ];

      for (const action of allActions) {
        if (!this.executorRegistry.has(action.executor)) {
          errors.push(
            `State '${stateName}' uses unknown executor '${action.executor}'`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
