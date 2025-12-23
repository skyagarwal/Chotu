import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { FlowDefinition, FlowState, FlowAction } from '../types/flow.types';

/**
 * YAML V2 Flow Loader Service
 * 
 * Loads and converts YAML V2 flow definitions (vendor/driver flows)
 * to the format expected by the Flow Engine.
 * 
 * YAML V2 Format Features:
 * - contextSchema for typed variables
 * - requiresAuth for authentication gates
 * - inputConfig for structured input collection
 * - php_api executor integration
 * - Multi-language message templates
 */
@Injectable()
export class YamlV2FlowLoaderService implements OnModuleInit {
  private readonly logger = new Logger(YamlV2FlowLoaderService.name);
  private readonly flowsDirectory: string;
  private loadedFlows: FlowDefinition[] = [];

  constructor() {
    this.flowsDirectory = path.join(__dirname, '../flows/yaml-v2');
  }

  async onModuleInit() {
    this.logger.log('🔄 Loading YAML V2 flows (vendor/driver)...');
    await this.loadAllV2Flows();
  }

  /**
   * Load all YAML V2 flows
   */
  async loadAllV2Flows(): Promise<FlowDefinition[]> {
    this.loadedFlows = [];

    if (!fs.existsSync(this.flowsDirectory)) {
      this.logger.warn(`YAML V2 flows directory not found: ${this.flowsDirectory}`);
      return [];
    }

    const files = fs.readdirSync(this.flowsDirectory)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    this.logger.log(`📂 Found ${files.length} YAML V2 flow files`);

    for (const file of files) {
      try {
        const flow = await this.loadFlowFromFile(path.join(this.flowsDirectory, file));
        if (flow && flow.enabled !== false) {
          this.loadedFlows.push(flow);
          this.logger.log(`✅ Loaded YAML V2 flow: ${flow.id} (${flow.name})`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to load ${file}: ${error.message}`);
      }
    }

    this.logger.log(`📦 Loaded ${this.loadedFlows.length} YAML V2 flows`);
    return this.loadedFlows;
  }

  /**
   * Get all loaded flows
   */
  getLoadedFlows(): FlowDefinition[] {
    return this.loadedFlows;
  }

  /**
   * Get flow by ID
   */
  getFlowById(flowId: string): FlowDefinition | undefined {
    return this.loadedFlows.find(f => f.id === flowId);
  }

  /**
   * Get flows by trigger
   */
  getFlowsByTrigger(trigger: string): FlowDefinition[] {
    return this.loadedFlows.filter(f => f.trigger === trigger);
  }

  /**
   * Get flows by module (vendor, delivery, customer)
   */
  getFlowsByModule(module: string): FlowDefinition[] {
    return this.loadedFlows.filter(f => f.module === module);
  }

  /**
   * Load a single YAML V2 flow file
   */
  async loadFlowFromFile(filePath: string): Promise<FlowDefinition | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseYamlV2Flow(content, filePath);
    } catch (error) {
      this.logger.error(`Failed to read ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse YAML V2 content into FlowDefinition
   */
  parseYamlV2Flow(yamlContent: string, sourcePath?: string): FlowDefinition {
    const raw = yaml.load(yamlContent) as any;

    // Required fields validation
    if (!raw.id) throw new Error('Flow ID is required');
    if (!raw.name) throw new Error('Flow name is required');
    
    // Support both 'states' and 'nodes' as the state container
    const statesData = raw.states || raw.nodes;
    if (!statesData) throw new Error('Flow states/nodes are required');
    
    // Determine initialState - either explicit or first node
    const initialState = raw.initialState || this.findInitialState(statesData);
    if (!initialState) throw new Error('Initial state is required');

    // Convert YAML V2 format to FlowDefinition
    const flow: FlowDefinition = {
      id: raw.id,
      name: raw.name,
      description: raw.description || '',
      module: raw.module || 'general',
      trigger: raw.trigger,
      version: raw.version || '1.0.0',
      initialState: initialState,
      finalStates: raw.finalStates || ['completed'],
      enabled: raw.enabled !== false,
      states: this.convertV2States(statesData),
      contextSchema: raw.contextSchema,
      constants: raw.constants,
      metadata: {
        source: sourcePath || 'yaml-v2',
        loadedAt: new Date().toISOString(),
        requiresAuth: raw.requiresAuth,
        v2Format: true,
      },
    };

    return flow;
  }

  /**
   * Find initial state from nodes array or states object
   */
  private findInitialState(statesData: any): string | undefined {
    // If array (nodes format), first item is initial
    if (Array.isArray(statesData)) {
      return statesData[0]?.id;
    }
    // If object (states format), look for 'initial' or first key
    if (typeof statesData === 'object') {
      if (statesData.initial) return 'initial';
      return Object.keys(statesData)[0];
    }
    return undefined;
  }

  /**
   * Convert YAML V2 states to FlowState format
   * Handles both array (nodes) and object (states) formats
   */
  private convertV2States(rawStates: Record<string, any> | any[]): Record<string, FlowState> {
    const states: Record<string, FlowState> = {};

    // Handle array format (nodes: [{id: 'node1', ...}])
    if (Array.isArray(rawStates)) {
      for (const node of rawStates) {
        if (node.id) {
          states[node.id] = this.convertV2State(node, node.id);
        }
      }
    } else {
      // Handle object format (states: {state1: {...}})
      for (const [stateName, rawState] of Object.entries(rawStates)) {
        states[stateName] = this.convertV2State(rawState as any, stateName);
      }
    }

    return states;
  }

  /**
   * Convert single YAML V2 state
   */
  private convertV2State(raw: any, stateName: string): FlowState {
    const state: FlowState = {
      type: raw.type || 'action',
      description: raw.description,
      transitions: raw.transitions || {},
    };

    // Handle 'next' property (node format) -> convert to transitions
    if (raw.next && !raw.transitions) {
      state.transitions = { 
        success: raw.next,
        default: raw.next
      };
    }

    // Handle 'action' property (single action format in nodes)
    if (raw.action && !raw.actions) {
      const singleAction: FlowAction = {
        id: raw.action,
        executor: raw.action.includes('_') ? 'php_api' : raw.action,
        config: raw.params || raw.config || {},
        output: raw.outputs,
      };
      state.actions = [singleAction];
    }

    // Handle actions array
    if (raw.actions) {
      state.actions = raw.actions.map((a: any) => this.convertV2Action(a));
    }

    // Handle conditions (for decision/condition states)
    if (raw.conditions) {
      state.conditions = raw.conditions.map((c: any) => ({
        expression: c.condition || c.expression,
        event: c.next || c.event,
      }));
      // Convert conditions to transitions for condition type
      if (raw.type === 'condition') {
        for (const cond of raw.conditions) {
          if (cond.condition && cond.next) {
            state.transitions[cond.condition] = cond.next;
          }
        }
      }
    }

    // Handle inputConfig (for input states)
    if (raw.inputConfig) {
      // Convert inputConfig to an action that collects input
      const inputAction: FlowAction = {
        id: 'collect_input',
        executor: 'response',
        config: {
          collectInput: true,
          variable: raw.inputConfig.variable,
          validation: raw.inputConfig.validation,
          prompt: raw.inputConfig.prompt,
        },
      };
      
      // Prepend to actions or create actions array
      state.actions = state.actions || [];
      state.inputConfig = raw.inputConfig;
    }

    // Handle timeout
    if (raw.timeout) {
      state.timeout = raw.timeout;
    }

    return state;
  }

  /**
   * Convert YAML V2 action to FlowAction
   */
  private convertV2Action(raw: any): FlowAction {
    const action: FlowAction = {
      id: raw.id,
      executor: raw.executor,
      config: raw.config || {},
      output: raw.output,
    };

    // Handle shorthand properties
    if (raw.message && !action.config.message) {
      action.config.message = raw.message;
    }
    if (raw.buttons && !action.config.buttons) {
      action.config.buttons = raw.buttons;
    }
    if (raw.saveToContext && !action.config.saveToContext) {
      action.config.saveToContext = raw.saveToContext;
    }

    // Handle php_api executor specific config
    if (action.executor === 'php_api') {
      // Pass all config directly for php_api
      action.config = { ...raw.config, ...raw };
      delete action.config.id;
      delete action.config.executor;
      delete action.config.output;
    }

    return action;
  }

  /**
   * Get flow for user type
   */
  getFlowForUserType(userType: 'customer' | 'vendor' | 'delivery_man'): FlowDefinition | undefined {
    const moduleMap: Record<string, string> = {
      customer: 'customer',
      vendor: 'vendor',
      delivery_man: 'delivery',
    };

    const module = moduleMap[userType];
    const flows = this.getFlowsByModule(module);
    
    // Return auth flow first, then orders flow
    return flows.find(f => f.trigger?.includes('auth')) || flows[0];
  }

  /**
   * Get vendor flows
   */
  getVendorFlows(): FlowDefinition[] {
    return this.loadedFlows.filter(f => 
      f.module === 'vendor' || f.id.includes('vendor')
    );
  }

  /**
   * Get delivery flows
   */
  getDeliveryFlows(): FlowDefinition[] {
    return this.loadedFlows.filter(f => 
      f.module === 'delivery' || f.id.includes('delivery')
    );
  }
}
