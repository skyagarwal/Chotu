import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { FlowContext } from './types/flow.types';

/**
 * Flow Context Service
 * 
 * Manages flow execution context (collected data, state, etc.)
 */
@Injectable()
export class FlowContextService {
  private readonly logger = new Logger(FlowContextService.name);

  /**
   * Create a new flow context
   */
  createContext(
    flowId: string,
    flowRunId: string,
    sessionId: string,
    userId?: string,
    phoneNumber?: string,
    initialData?: Record<string, any>
  ): FlowContext {
    return {
      data: initialData || {},
      _system: {
        flowId,
        flowRunId,
        sessionId,
        userId,
        phoneNumber,
        currentState: '',
        previousStates: [],
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        attemptCount: 0,
        errorHistory: [],
      },
    };
  }

  /**
   * Set value in context
   */
  set(context: FlowContext, key: string, value: any): void {
    context.data[key] = value;
    context._system.lastUpdatedAt = new Date();
  }

  /**
   * Get value from context
   */
  get<T = any>(context: FlowContext, key: string): T | undefined {
    return context.data[key];
  }

  /**
   * Get value by path (supports dot notation)
   */
  getByPath<T = any>(context: FlowContext, path: string): T | undefined {
    const keys = path.split('.');
    let current: any = context.data;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Set value by path (supports dot notation)
   */
  setByPath(context: FlowContext, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current: any = context.data;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
    context._system.lastUpdatedAt = new Date();
  }

  /**
   * Interpolate template string with context values
   * 
   * Supports: {{key}}, {{nested.key}}, {{array[0]}}
   * Now uses Handlebars for advanced templating (conditionals, loops)
   */
  interpolate(context: FlowContext, template: string): string {
    if (!template) return '';

    try {
      // Create a combined data object with user data and system data
      const data = {
        ...context.data,
        _system: context._system
      };

      // Compile and execute the template
      const compiled = Handlebars.compile(template, { noEscape: true });
      return compiled(data);
    } catch (error) {
      this.logger.warn(`Interpolation failed: ${error.message}`);
      return template;
    }
  }

  /**
   * Resolve a simple {{path.to.value}} reference and return the raw value
   * If the template is not a simple reference, returns undefined
   */
  private resolveSimpleReference(context: FlowContext, template: string): any {
    // Check if this is a simple Handlebars reference like {{path.to.value}}
    const match = template.match(/^\{\{([^}]+)\}\}$/);
    if (!match) return undefined;

    const path = match[1].trim();
    // Use getByPath to support nested paths like selection_result.selectedItems
    const value = this.getByPath(context, path);
    this.logger.debug(`resolveSimpleReference: path=${path}, valueType=${typeof value}, isArray=${Array.isArray(value)}`);
    return value;
  }

  /**
   * Interpolate object recursively
   */
  interpolateObject(
    context: FlowContext,
    obj: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Try to resolve as a simple reference first (to preserve arrays/objects)
        const resolved = this.resolveSimpleReference(context, value);
        this.logger.debug(`interpolateObject key=${key}, value=${value?.slice(0, 50)}, resolved type=${typeof resolved}, isArray=${Array.isArray(resolved)}`);
        if (resolved !== undefined && (Array.isArray(resolved) || typeof resolved === 'object')) {
          // Preserve arrays and objects directly
          result[key] = resolved;
          this.logger.debug(`interpolateObject: preserved ${key} as ${Array.isArray(resolved) ? 'array' : 'object'}`);
        } else {
          // Fall back to string interpolation
          result[key] = this.interpolate(context, value);
        }
      } else if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'string'
            ? this.interpolate(context, item)
            : typeof item === 'object'
            ? this.interpolateObject(context, item)
            : item
        );
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(context, value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Evaluate JavaScript expression in context
   * 
   * IMPORTANT: This uses Function() which can be a security risk
   * Only use with trusted expressions from flow definitions
   */
  evaluateExpression(context: FlowContext, expression: string): boolean {
    try {
      // Create a safe evaluation context
      // Filter keys to only valid JavaScript identifiers (letters, digits, underscores, $, not starting with digit)
      const isValidIdentifier = (key: string): boolean => {
        return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
      };

      const rawContext = {
        ...context.data,
        _system: context._system,
        context: context.data, // Expose data as 'context' variable for expressions
      };

      // Filter to only valid identifier keys
      const safeKeys: string[] = [];
      const safeValues: any[] = [];
      
      for (const [key, value] of Object.entries(rawContext)) {
        if (isValidIdentifier(key)) {
          safeKeys.push(key);
          safeValues.push(value);
        }
      }

      // Create function that evaluates expression
      const fn = new Function(...safeKeys, `return (${expression});`);
      
      // Execute with context values
      const result = fn(...safeValues);
      
      return Boolean(result);
    } catch (error) {
      this.logger.error(`Expression evaluation failed: ${expression}`, error);
      return false;
    }
  }

  /**
   * Update state in context
   */
  updateState(context: FlowContext, newState: string): void {
    if (context._system.currentState) {
      context._system.previousStates.push(context._system.currentState);
    }
    context._system.currentState = newState;
    context._system.lastUpdatedAt = new Date();
  }

  /**
   * Record error in context
   */
  recordError(context: FlowContext, error: string): void {
    context._system.errorHistory.push({
      state: context._system.currentState,
      error,
      timestamp: new Date(),
    });
    context._system.attemptCount++;
    context._system.lastUpdatedAt = new Date();
  }

  /**
   * Get all context data (for serialization)
   */
  getAll(context: FlowContext): Record<string, any> {
    return {
      ...context.data,
      _system: context._system,
    };
  }

  /**
   * Merge external data into context
   */
  merge(context: FlowContext, data: Record<string, any>): void {
    Object.assign(context.data, data);
    context._system.lastUpdatedAt = new Date();
  }

  /**
   * Check if context has required fields
   */
  hasRequiredFields(
    context: FlowContext,
    requiredFields: string[]
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of requiredFields) {
      const value = this.getByPath(context, field);
      if (value === null || value === undefined) {
        missing.push(field);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Calculate flow progress (0-100)
   */
  calculateProgress(
    context: FlowContext,
    totalStates: number,
    finalStates: string[]
  ): number {
    if (finalStates.includes(context._system.currentState)) {
      return 100;
    }

    const statesVisited = context._system.previousStates.length + 1; // +1 for current
    return Math.min(Math.round((statesVisited / totalStates) * 100), 95); // Cap at 95% until complete
  }
}
