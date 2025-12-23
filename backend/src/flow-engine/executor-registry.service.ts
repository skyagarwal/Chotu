import { Injectable, Logger } from '@nestjs/common';
import {
  ActionExecutor,
  ActionExecutionResult,
  FlowContext,
} from './types/flow.types';

/**
 * Executor Registry Service
 * 
 * Central registry for all action executors
 */
@Injectable()
export class ExecutorRegistryService {
  private readonly logger = new Logger(ExecutorRegistryService.name);
  private readonly executors = new Map<string, ActionExecutor>();

  /**
   * Register an executor
   */
  register(executor: ActionExecutor): void {
    if (this.executors.has(executor.name)) {
      this.logger.warn(`Executor ${executor.name} is being overwritten`);
    }

    this.executors.set(executor.name, executor);
    this.logger.log(`✅ Registered executor: ${executor.name}`);
  }

  /**
   * Get executor by name
   */
  get(name: string): ActionExecutor | undefined {
    return this.executors.get(name);
  }

  /**
   * Check if executor exists
   */
  has(name: string): boolean {
    return this.executors.has(name);
  }

  /**
   * Check if executor exists (alias for API consistency)
   */
  hasExecutor(name: string): boolean {
    return this.has(name);
  }

  /**
   * Get all registered executors
   */
  getAll(): ActionExecutor[] {
    return Array.from(this.executors.values());
  }

  /**
   * List all executors (alias for API consistency)
   */
  listExecutors(): Array<{ name: string; description?: string }> {
    return Array.from(this.executors.values()).map(executor => ({
      name: executor.name,
      description: executor.constructor?.name || executor.name,
    }));
  }

  /**
   * Get executor names
   */
  getNames(): string[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Execute an action
   */
  async execute(
    executorName: string,
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    const executor = this.executors.get(executorName);

    if (!executor) {
      this.logger.error(`Executor not found: ${executorName}`);
      return {
        success: false,
        error: `Executor not found: ${executorName}`,
      };
    }

    try {
      // Validate config if validator exists
      if (executor.validate && !executor.validate(config)) {
        return {
          success: false,
          error: `Invalid configuration for executor: ${executorName}`,
        };
      }

      this.logger.debug(`Executing: ${executorName}`);
      const result = await executor.execute(config, context);

      this.logger.debug(
        `Executor ${executorName} completed: ${result.success ? 'success' : 'failed'}`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Executor ${executorName} threw error: ${error.message}`,
        error.stack
      );

      return {
        success: false,
        error: error.message || 'Unknown executor error',
      };
    }
  }

  /**
   * Unregister an executor
   */
  unregister(name: string): boolean {
    const deleted = this.executors.delete(name);
    if (deleted) {
      this.logger.log(`Unregistered executor: ${name}`);
    }
    return deleted;
  }

  /**
   * Clear all executors (useful for testing)
   */
  clear(): void {
    this.executors.clear();
    this.logger.warn('All executors cleared');
  }
}
