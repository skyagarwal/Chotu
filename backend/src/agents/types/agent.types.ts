/**
 * Agent System Types
 * 
 * Core type definitions for LLM-powered agent system
 */

export enum AgentType {
  SEARCH = 'search',
  ORDER = 'order',
  COMPLAINTS = 'complaints',
  BOOKING = 'booking',
  FAQ = 'faq',
  CUSTOM = 'custom',
}

/**
 * Module Types (aligned with MySQL database module_type column)
 * These map to multiple module IDs via module-id-mapping.ts
 */
export enum ModuleType {
  GROCERY = 'grocery',   // Module IDs: 1, 2, 17, 18
  FOOD = 'food',         // Module IDs: 4, 6, 11, 15
  PHARMACY = 'pharmacy', // Module ID: 8
  ECOM = 'ecom',         // Module IDs: 5, 7, 9, 12, 13, 16
  PARCEL = 'parcel',     // Module IDs: 3, 10, 14, 20
}

/**
 * Function definition in OpenAI format
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, FunctionParameter>;
    required?: string[];
  };
}

export interface FunctionParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: FunctionParameter;
  properties?: Record<string, FunctionParameter>;
}

/**
 * Function call from LLM
 */
export interface FunctionCall {
  name: string;
  arguments: string; // JSON string
}

/**
 * LLM Message format
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | null;
  name?: string; // For function messages
  function_call?: FunctionCall;
}

/**
 * Agent execution context
 */
export interface AgentContext {
  phoneNumber: string;
  module: ModuleType;
  moduleId?: number; // Database module ID (1-20) for precise module targeting
  zoneId?: number; // Zone ID for zone-specific filtering
  language: string;
  session: any;
  message: string;
  imageUrl?: string;
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  response: string;
  functionsCalled?: string[];
  executionTime: number;
  tokensUsed?: number;
  cached?: boolean;
  metadata?: Record<string, any>; // Additional metadata (e.g., flow info)
}

/**
 * Tool/Function executor interface
 */
export interface FunctionExecutor {
  name: string;
  execute(args: Record<string, any>, context: AgentContext): Promise<any>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  modules: ModuleType[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  functions: FunctionDefinition[];
  enabled: boolean;
}

/**
 * Intent routing result
 */
export interface RoutingResult {
  agentId: string;
  agentType: AgentType;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  cached?: boolean;
  moduleId?: number; // Database module ID for precise targeting
  zoneId?: number; // Zone ID for zone-specific filtering
}
