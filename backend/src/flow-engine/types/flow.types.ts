/**
 * Flow Engine Type Definitions
 * 
 * Modern state machine-based flow system
 */

/**
 * Action to be executed in a state
 */
export interface FlowAction {
  id?: string; // Optional action ID for tracking
  executor: string; // Name of executor (nlu, llm, search, etc.)
  config: Record<string, any>; // Executor-specific configuration
  output?: string; // Context key to store result
  onError?: 'continue' | 'fail' | 'retry'; // Error handling strategy
  retryCount?: number; // Max retry attempts
  timeout?: number; // Execution timeout in ms
  retryOnError?: boolean; // Alias for compatibility
  maxRetries?: number; // Alias for retryCount
  errorStrategy?: 'fail' | 'skip' | 'retry'; // Alias for onError
}

/**
 * Condition for decision states
 */
export interface FlowCondition {
  expression: string; // JavaScript expression to evaluate
  event: string; // Event to emit if condition is true
}

/**
 * State definition in the flow
 */
export interface FlowState {
  type: 'action' | 'decision' | 'parallel' | 'wait' | 'end' | 'input' | 'final';
  description?: string; // Optional description for documentation
  actions?: FlowAction[]; // Actions to execute in this state
  conditions?: FlowCondition[]; // Conditions to evaluate (for decision states)
  timeout?: number; // State timeout in ms
  onEntry?: FlowAction[]; // Actions to run when entering state
  onExit?: FlowAction[]; // Actions to run when exiting state
  transitions: {
    [event: string]: string; // event name → next state name
  };
  metadata?: Record<string, any>; // Additional state metadata
  
  // Input configuration (for input states from YAML V2)
  inputConfig?: {
    variable: string;
    validation?: {
      pattern?: string;
      errorMessage?: string;
    };
    prompt?: string;
  };
}

/**
 * Complete flow definition
 */
export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  module: 'food' | 'parcel' | 'ecommerce' | 'general' | 'personalization' | 'gamification' | 'vendor' | 'delivery' | 'customer';
  trigger?: string; // Intent that triggers this flow
  version?: string; // Flow version for A/B testing
  
  // State machine configuration
  states: {
    [stateName: string]: FlowState;
  };
  
  initialState: string; // Starting state
  finalStates: string[]; // Terminal states
  
  // Context schema (for validation)
  contextSchema?: Record<string, any>; // Simplified for Prisma JSON storage
  
  // Constants (for YAML V2 flows)
  constants?: Record<string, any>;
  
  // Flow metadata
  metadata?: {
    author?: string;
    tags?: string[];
    priority?: number;
    enabled?: boolean;
    [key: string]: any; // Allow additional custom metadata
  };
  
  // Database fields (populated when loaded from DB)
  enabled?: boolean; // Top-level enabled flag
  status?: string; // Flow status
  createdAt?: Date; // Creation timestamp
  updatedAt?: Date; // Last update timestamp
}

/**
 * Flow execution context (runtime data)
 */
export interface FlowContext {
  // User-collected data
  data: Record<string, any>;
  
  // System data
  _system: {
    flowId: string;
    flowRunId: string;
    sessionId: string;
    userId?: string;
    phoneNumber?: string;
    currentState: string;
    previousStates: string[];
    startedAt: Date;
    lastUpdatedAt: Date;
    attemptCount: number;
    errorHistory: Array<{
      state: string;
      error: string;
      timestamp: Date;
    }>;
  };
}

/**
 * Result of state execution
 */
export interface StateExecutionResult {
  nextState: string | null; // Next state to transition to
  event?: string; // Event that triggered transition
  context: FlowContext; // Updated context
  completed: boolean; // Is flow completed?
  error?: string; // Error message if failed
  output?: any; // State execution output
}

/**
 * Result of action execution
 */
export interface ActionExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  event?: string; // Event to emit after action
  shouldTransition?: boolean; // Should transition immediately
}

/**
 * Base interface for all executors
 */
export interface ActionExecutor {
  /**
   * Unique name of the executor
   */
  name: string;
  
  /**
   * Execute the action
   */
  execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult>;
  
  /**
   * Validate executor configuration
   */
  validate?(config: Record<string, any>): boolean;
}

/**
 * Flow run status
 */
export type FlowRunStatus = 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

/**
 * Flow execution options
 */
export interface FlowExecutionOptions {
  sessionId: string;
  userId?: string;
  phoneNumber?: string;
  initialContext?: Record<string, any>;
  module?: 'food' | 'parcel' | 'ecommerce' | 'general';
  metadata?: Record<string, any>;
}

/**
 * Flow message processing result
 */
export interface FlowProcessingResult {
  flowRunId: string;
  currentState: string;
  response: string;
  completed: boolean;
  collectingData?: boolean;
  progress?: number; // 0-100 percentage
  metadata?: Record<string, any>;
}
