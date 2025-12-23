import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { FlowDefinition, FlowState, FlowAction, FlowCondition } from '../types/flow.types';

/**
 * YAML Flow Loader Service
 * 
 * Loads flow definitions from YAML files for less verbose flow definitions.
 * This is an alternative to TypeScript flow files like parcel-delivery.flow.ts
 * 
 * Benefits:
 * - More readable (YAML is cleaner than TypeScript objects)
 * - Non-developers can edit flows
 * - Hot-reloadable without recompilation
 * - Easy to version control
 * 
 * Example YAML flow:
 * ```yaml
 * id: simple_greeting_v1
 * name: Simple Greeting
 * module: general
 * trigger: greeting
 * initialState: welcome
 * finalStates: [completed]
 * 
 * states:
 *   welcome:
 *     type: action
 *     actions:
 *       - executor: response
 *         message: "Hello! How can I help?"
 *     transitions:
 *       default: completed
 * ```
 */
@Injectable()
export class YamlFlowLoaderService {
  private readonly logger = new Logger(YamlFlowLoaderService.name);
  private readonly flowsDirectory: string;

  constructor() {
    // Default flows directory
    this.flowsDirectory = process.env.FLOWS_YAML_DIR || 
      path.join(__dirname, '../flows/yaml');
  }

  /**
   * Load all YAML flows from the flows directory
   */
  async loadAllFlows(): Promise<FlowDefinition[]> {
    const flows: FlowDefinition[] = [];

    if (!fs.existsSync(this.flowsDirectory)) {
      this.logger.warn(`YAML flows directory not found: ${this.flowsDirectory}`);
      return flows;
    }

    const files = fs.readdirSync(this.flowsDirectory)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of files) {
      try {
        const flow = await this.loadFlowFromFile(path.join(this.flowsDirectory, file));
        if (flow) {
          flows.push(flow);
          this.logger.log(`✅ Loaded YAML flow: ${flow.id} from ${file}`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to load flow from ${file}: ${error.message}`);
      }
    }

    return flows;
  }

  /**
   * Load a single flow from a YAML file
   */
  async loadFlowFromFile(filePath: string): Promise<FlowDefinition | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseYamlFlow(content, filePath);
    } catch (error) {
      this.logger.error(`Failed to load YAML flow: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse YAML content into a FlowDefinition
   */
  parseYamlFlow(yamlContent: string, sourcePath?: string): FlowDefinition {
    const raw = yaml.load(yamlContent) as any;

    // Validate required fields
    if (!raw.id) throw new Error('Flow ID is required');
    if (!raw.name) throw new Error('Flow name is required');
    if (!raw.states) throw new Error('Flow states are required');
    if (!raw.initialState) throw new Error('Initial state is required');

    // Convert shorthand YAML to full FlowDefinition
    const flow: FlowDefinition = {
      id: raw.id,
      name: raw.name,
      description: raw.description || '',
      module: raw.module || 'general',
      trigger: raw.trigger,
      version: raw.version || '1.0.0',
      initialState: raw.initialState,
      finalStates: raw.finalStates || ['completed'],
      enabled: raw.enabled !== false,
      states: this.convertStates(raw.states),
      metadata: {
        ...raw.metadata,
        source: sourcePath || 'yaml',
        loadedAt: new Date().toISOString(),
      },
    };

    return flow;
  }

  /**
   * Convert YAML states shorthand to FlowState objects
   */
  private convertStates(rawStates: Record<string, any>): Record<string, FlowState> {
    const states: Record<string, FlowState> = {};

    for (const [stateName, rawState] of Object.entries(rawStates)) {
      states[stateName] = this.convertState(rawState as any);
    }

    return states;
  }

  /**
   * Convert a single YAML state to FlowState
   */
  private convertState(raw: any): FlowState {
    const state: FlowState = {
      type: raw.type || 'action',
      description: raw.description,
      transitions: raw.transitions || {},
      metadata: raw.metadata,
    };

    // Convert actions (support shorthand)
    if (raw.actions) {
      state.actions = raw.actions.map((a: any) => this.convertAction(a));
    }

    // Convert onEntry actions
    if (raw.onEntry) {
      state.onEntry = raw.onEntry.map((a: any) => this.convertAction(a));
    }

    // Convert onExit actions
    if (raw.onExit) {
      state.onExit = raw.onExit.map((a: any) => this.convertAction(a));
    }

    // Convert conditions (for decision states)
    if (raw.conditions) {
      state.conditions = raw.conditions.map((c: any) => this.convertCondition(c));
    }

    // Timeout
    if (raw.timeout) {
      state.timeout = raw.timeout;
    }

    return state;
  }

  /**
   * Convert YAML action shorthand to FlowAction
   * 
   * Supports multiple formats:
   * 1. Full format: { executor: 'response', config: { message: '...' } }
   * 2. Shorthand: { executor: 'response', message: '...' }
   * 3. String: 'response: Hello!' → { executor: 'response', config: { message: 'Hello!' } }
   */
  private convertAction(raw: any): FlowAction {
    // Handle string shorthand: 'response: Hello!'
    if (typeof raw === 'string') {
      const match = raw.match(/^(\w+):\s*(.+)$/);
      if (match) {
        return {
          executor: match[1],
          config: { message: match[2] },
        };
      }
      throw new Error(`Invalid action string format: ${raw}`);
    }

    // Extract executor
    const executor = raw.executor;
    if (!executor) {
      throw new Error('Action executor is required');
    }

    // Build config from remaining properties
    const config: Record<string, any> = raw.config || {};
    
    // Support shorthand properties (message, prompt, etc.)
    const shorthandProps = [
      'message', 'prompt', 'systemPrompt', 'temperature', 'maxTokens',
      'query', 'field', 'action', 'input', 'phone', 'otp',
      'buttons', 'cards', 'metadata'
    ];
    
    for (const prop of shorthandProps) {
      if (raw[prop] !== undefined && config[prop] === undefined) {
        config[prop] = raw[prop];
      }
    }

    const action: FlowAction = {
      executor,
      config,
    };

    // Optional properties
    if (raw.id) action.id = raw.id;
    if (raw.output) action.output = raw.output;
    if (raw.onError) action.onError = raw.onError;
    if (raw.retryCount) action.retryCount = raw.retryCount;
    if (raw.timeout) action.timeout = raw.timeout;

    return action;
  }

  /**
   * Convert YAML condition to FlowCondition
   * 
   * Supports:
   * 1. Full format: { expression: '...', event: '...' }
   * 2. Shorthand: { if: '...', then: '...' }
   * 3. String: 'authenticated === true -> auth_complete'
   */
  private convertCondition(raw: any): FlowCondition {
    // Handle string shorthand: 'authenticated === true -> auth_complete'
    if (typeof raw === 'string') {
      const match = raw.match(/^(.+?)\s*->\s*(\w+)$/);
      if (match) {
        return {
          expression: match[1].trim(),
          event: match[2],
        };
      }
      throw new Error(`Invalid condition string format: ${raw}`);
    }

    // Handle shorthand { if: '...', then: '...' }
    if (raw.if) {
      return {
        expression: raw.if,
        event: raw.then || raw.event,
      };
    }

    // Full format
    return {
      expression: raw.expression,
      event: raw.event,
    };
  }

  /**
   * Validate a YAML flow definition
   */
  validateFlow(flow: FlowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!flow.id) errors.push('Flow ID is required');
    if (!flow.name) errors.push('Flow name is required');
    if (!flow.states || Object.keys(flow.states).length === 0) {
      errors.push('Flow must have at least one state');
    }
    if (!flow.initialState) errors.push('Initial state is required');
    if (!flow.states?.[flow.initialState]) {
      errors.push(`Initial state '${flow.initialState}' not found`);
    }

    // Check final states exist
    for (const finalState of flow.finalStates || []) {
      if (!flow.states?.[finalState]) {
        errors.push(`Final state '${finalState}' not found`);
      }
    }

    // Check transitions point to valid states
    for (const [stateName, state] of Object.entries(flow.states || {})) {
      for (const [event, nextState] of Object.entries(state.transitions || {})) {
        if (nextState && !flow.states[nextState]) {
          errors.push(`State '${stateName}' transition '${event}' → '${nextState}' not found`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Watch for changes in YAML flow files (for development hot-reload)
   */
  watchFlows(onChange: (flows: FlowDefinition[]) => void): void {
    if (!fs.existsSync(this.flowsDirectory)) {
      this.logger.warn('Cannot watch YAML flows: directory not found');
      return;
    }

    this.logger.log(`👀 Watching for YAML flow changes in ${this.flowsDirectory}`);

    fs.watch(this.flowsDirectory, async (eventType, filename) => {
      if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
        this.logger.log(`🔄 YAML flow changed: ${filename}`);
        const flows = await this.loadAllFlows();
        onChange(flows);
      }
    });
  }
}
