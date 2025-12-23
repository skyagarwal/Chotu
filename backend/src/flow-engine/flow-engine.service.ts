import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from '../session/session.service';
import { SessionIdentifierService } from '../session/session-identifier.service';
import { FlowContextService } from './flow-context.service';
import { StateMachineEngine } from './state-machine.engine';
import { ExecutorRegistryService } from './executor-registry.service';
import {
  FlowDefinition,
  FlowExecutionOptions,
  FlowProcessingResult,
  FlowContext,
  FlowRunStatus,
} from './types/flow.types';

/**
 * Flow Engine Service
 * 
 * Main service for flow management and execution
 * 
 * IMPORTANT: Uses SessionIdentifierService to properly resolve phone numbers
 * from session IDs (critical for web chat where sessionId != phoneNumber)
 */
@Injectable()
export class FlowEngineService {
  private readonly logger = new Logger(FlowEngineService.name);
  private flowCache = new Map<string, FlowDefinition>();
  private cacheExpiry = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly sessionIdentifierService: SessionIdentifierService,
    private readonly contextService: FlowContextService,
    private readonly stateMachine: StateMachineEngine,
    private readonly executorRegistry: ExecutorRegistryService,
  ) {
    this.logger.log('🔄 Flow Engine initialized');
  }

  /**
   * Start a new flow execution
   */
  async startFlow(
    flowId: string,
    options: FlowExecutionOptions
  ): Promise<FlowProcessingResult> {
    // 1. Load flow definition
    const flow = await this.getFlowById(flowId);
    if (!flow) {
      throw new NotFoundException(`Flow not found: ${flowId}`);
    }

    // 2. Validate flow
    const validation = this.stateMachine.validateFlow(flow);
    if (!validation.valid) {
      this.logger.error(`Flow validation failed: ${validation.errors.join(', ')}`);
      throw new Error(`Invalid flow: ${validation.errors.join(', ')}`);
    }

    // 2.5. Resolve phone number from session if not provided
    // This handles the web chat case where sessionId != phoneNumber
    let resolvedPhoneNumber = options.phoneNumber;
    if (!resolvedPhoneNumber || resolvedPhoneNumber === options.sessionId) {
      const resolution = await this.sessionIdentifierService.resolve(options.sessionId);
      resolvedPhoneNumber = resolution.phoneNumber || options.sessionId;
      this.logger.log(`🔍 Resolved phone for flow: ${resolvedPhoneNumber} (session: ${options.sessionId})`);
    }

    // 3. Create flow run record
    const flowRunId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const flowRun = await this.prisma.flowRun.create({
      data: {
        id: flowRunId,
        flowId: flowId,
        sessionId: options.sessionId,
        phoneNumber: resolvedPhoneNumber,
        currentState: flow.initialState,
        context: {},
        status: 'active',
      },
    });

    this.logger.log(`🚀 Started flow ${flow.name} (run: ${flowRun.id})`);

    // 4. Create initial context
    const context = this.contextService.createContext(
      flowId,
      flowRun.id,
      options.sessionId,
      options.userId,
      resolvedPhoneNumber,
      options.initialContext
    );

    // 🧠 LOAD SESSION-LEVEL CONVERSATION HISTORY
    // This preserves context across flow completions!
    const session = await this.sessionService.getSession(options.sessionId);
    if (session?.data?._conversation_history && Array.isArray(session.data._conversation_history)) {
      context.data._conversation_history = session.data._conversation_history;
      this.logger.log(`📚 Loaded ${session.data._conversation_history.length} history entries from session`);
    }

    // 📍 INJECT LOCATION DATA FROM SESSION INTO FLOW CONTEXT
    // Critical for geo-distance filtering in search executors
    if (session?.data?.location) {
      context.data.location = session.data.location;
      context.data.lastLocationUpdate = session.data.lastLocationUpdate;
      this.logger.log(`📍 Injected location into flow context: ${JSON.stringify(session.data.location)}`);
    }

    // 🏠 INJECT USER DATA FROM SESSION (INCLUDING AUTH)
    // CRITICAL: Load ALL auth-related data so flows can check authentication properly
    if (session?.data?.user_id) {
      context.data.user_id = session.data.user_id;
      context.data.user_authenticated = true;
      context.data.authenticated = true; // Also set this for flows that check context.authenticated
    }
    if (session?.data?.authenticated) {
      context.data.authenticated = session.data.authenticated;
      context.data.user_authenticated = session.data.authenticated;
    }
    if (session?.data?.auth_token) {
      context.data.auth_token = session.data.auth_token;
      this.logger.log(`🔐 Injected auth_token into flow context`);
    }
    if (session?.data?.user_name || session?.data?.userName) {
      context.data.user_name = session.data.user_name || session.data.userName;
    }
    if (session?.data?.phone_number || session?.data?.user_phone) {
      context.data.phone_number = session.data.phone_number || session.data.user_phone;
    }

    // Ensure _user_message is set (critical for NLU executors)
    // Support both 'message' and 'user_message' as input keys
    if (!context.data._user_message) {
      const userMessage = context.data.user_message || context.data.message;
      if (userMessage) {
        this.contextService.set(context, '_user_message', userMessage);
      }
    }

    context._system.currentState = flow.initialState;

    // 5. Execute initial state
    let result = await this.stateMachine.executeState(flow, context);

    // 6. Auto-execute action states until we reach a state waiting for input
    let maxIterations = 10; // Prevent infinite loops
    let iterations = 0;
    
    while (result.nextState && !result.completed && iterations < maxIterations) {
      iterations++;
      
      this.logger.debug(`🔍 Auto-execution check (iteration ${iterations}): nextState=${result.nextState}, completed=${result.completed}`);
      
      // Check if next state requires user input (waiting states)
      const nextState = flow.states[result.nextState];
      if (!nextState) {
        this.logger.error(`❌ Next state not found: ${result.nextState}`);
        break;
      }

      // Special handling for 'wait' states: Execute them once (to send prompts) then stop
      if (nextState.type === 'wait') {
        this.logger.log(`🔄 Executing wait state actions before stopping: ${result.nextState}`);
        this.contextService.updateState(context, result.nextState);
        
        const nextResult = await this.stateMachine.executeState(flow, context);
        
        // Update result but force stop
        result.nextState = nextResult.nextState; // Likely null unless auto-transition occurs
        result.completed = nextResult.completed;
        result.error = nextResult.error;
        
        this.logger.debug(`⏸️ Stopping auto-execution after wait state: ${result.nextState}`);
        break;
      }
      
      // Auto-execute action, decision, and end states
      // End states need to run to send their onEntry success messages
      if (nextState.type !== 'action' && nextState.type !== 'decision' && nextState.type !== 'end') {
        this.logger.debug(`⏸️ Stopping auto-execution at non-action state: ${result.nextState} (type: ${nextState.type})`);
        break;
      }
      
      this.logger.log(`🔄 Auto-executing next state: ${result.nextState}`);
      this.contextService.updateState(context, result.nextState);
      
      const nextResult = await this.stateMachine.executeState(flow, context);
      
      // Update with next state results
      result.nextState = nextResult.nextState;
      result.completed = nextResult.completed;
      result.error = nextResult.error;
      
      this.logger.debug(`🔍 After auto-execution: nextState=${result.nextState}, completed=${result.completed}`);
    }
    
    if (iterations >= maxIterations) {
      this.logger.error(`❌ Auto-execution loop limit reached! Last state: ${result.nextState}`);
    }

    // 7. Update flow run
    //  Fix: Use current state when nextState is null (flow completed immediately)
    const stateToSave = result.nextState || context._system.currentState;
    await this.updateFlowRun(flowRun.id, stateToSave, context, result.completed ? 'completed' : 'running');

    // 7. Clear flow from session if completed, otherwise save context
    if (result.completed) {
      this.logger.log(`✅ Flow completed on start! Clearing from session.`);
      await this.clearFlowFromSession(options.sessionId);
    } else {
      await this.saveContextToSession(options.sessionId, context);
    }

    // Get the last response from context
    const lastResponse = this.contextService.get(context, '_last_response');
    
    // Extract cards from search_results or other sources in context
    const searchResults = this.contextService.get(context, 'search_results');
    const cards = searchResults?.cards || this.contextService.get(context, '_cards');
    
    return {
      flowRunId: flowRun.id,
      currentState: result.nextState || flow.initialState,
      response: lastResponse || '', // Return empty string instead of "Flow started"
      completed: result.completed,
      collectingData: !result.completed,
      progress: this.contextService.calculateProgress(
        context,
        Object.keys(flow.states).length,
        flow.finalStates
      ),
      metadata: cards ? { cards } : undefined,
    };
  }

  /**
   * Process user message in active flow
   */
  async processMessage(
    sessionId: string,
    message: string,
    event?: string
  ): Promise<FlowProcessingResult> {
    // 1. Get active flow from session
    const session = await this.sessionService.getSession(sessionId);
    const flowContext = session?.data?.flowContext;

    if (!flowContext || !flowContext.flowRunId) {
      throw new Error('No active flow found');
    }

    // 2. Load flow run
    const flowRun = await this.prisma.flowRun.findUnique({
      where: { id: flowContext.flowRunId },
    });

    if (!flowRun) {
      throw new NotFoundException('Flow run not found');
    }

    // 3. Load flow definition
    const flow = await this.getFlowById(flowRun.flowId); // Use camelCase
    if (!flow) {
      throw new NotFoundException('Flow definition not found');
    }

    // 4. Restore context
    const context: FlowContext = flowRun.context as any;
    
    // 🧠 MERGE SESSION-LEVEL CONVERSATION HISTORY
    // This ensures we have the latest conversation context even if flow context is older
    if (session?.data?._conversation_history && Array.isArray(session.data._conversation_history)) {
      if (!context.data._conversation_history) {
        context.data._conversation_history = [];
      }
      // Merge session history with flow context history, keeping unique entries
      const existingMessages = new Set(context.data._conversation_history.map(m => m.content));
      for (const msg of session.data._conversation_history) {
        if (!existingMessages.has(msg.content)) {
          context.data._conversation_history.push(msg);
        }
      }
      // Keep last 40 messages max
      if (context.data._conversation_history.length > 40) {
        context.data._conversation_history = context.data._conversation_history.slice(-40);
      }
    }

    // 📍 REFRESH LOCATION DATA FROM SESSION (may have been updated since flow started)
    if (session?.data?.location) {
      context.data.location = session.data.location;
      context.data.lastLocationUpdate = session.data.lastLocationUpdate;
    }
    
    // 🔐 REFRESH AUTH DATA FROM SESSION (critical for flows that check authentication)
    if (session?.data?.authenticated) {
      context.data.authenticated = session.data.authenticated;
      context.data.user_authenticated = session.data.authenticated;
    }
    if (session?.data?.auth_token) {
      context.data.auth_token = session.data.auth_token;
    }
    if (session?.data?.user_id) {
      context.data.user_id = session.data.user_id;
    }
    if (session?.data?.phone_number || session?.data?.user_phone) {
      context.data.phone_number = session.data.phone_number || session.data.user_phone;
    }
    
    // Store user message in context
    this.contextService.set(context, '_user_message', message);
    this.contextService.set(context, '_last_message_at', new Date());

    // 5. Execute current state with event
    const result = await this.stateMachine.executeState(
      flow,
      context,
      event || 'user_message'
    );

    // 6. Auto-execute action states until we reach a state waiting for input
    let maxIterations = 10; // Prevent infinite loops
    let iterations = 0;
    
    while (result.nextState && !result.completed && iterations < maxIterations) {
      iterations++;
      
      this.logger.debug(`🔍 Auto-execution check (iteration ${iterations}): nextState=${result.nextState}, completed=${result.completed}`);
      
      // Check if next state requires user input (waiting states)
      const nextState = flow.states[result.nextState];
      if (!nextState) {
        this.logger.error(`❌ Next state not found: ${result.nextState}`);
        break;
      }

      // Special handling for 'wait' states: Execute them once (to send prompts) then stop
      if (nextState.type === 'wait') {
        this.logger.log(`🔄 Executing wait state actions before stopping: ${result.nextState}`);
        this.contextService.updateState(context, result.nextState);
        
        const nextResult = await this.stateMachine.executeState(flow, context);
        
        // Update result but force stop
        result.nextState = nextResult.nextState; // Likely null unless auto-transition occurs
        result.completed = nextResult.completed;
        result.error = nextResult.error;
        
        this.logger.debug(`⏸️ Stopping auto-execution after wait state: ${result.nextState}`);
        break;
      }
      
      // Auto-execute action, decision, and end states
      // End states need to run to send their onEntry success messages
      if (nextState.type !== 'action' && nextState.type !== 'decision' && nextState.type !== 'end') {
        this.logger.debug(`⏸️ Stopping auto-execution at non-action state: ${result.nextState} (type: ${nextState.type})`);
        break;
      }
      
      this.logger.log(`🔄 Auto-executing next state: ${result.nextState}`);
      this.contextService.updateState(context, result.nextState);
      
      const nextResult = await this.stateMachine.executeState(flow, context);
      
      // Update with next state results
      result.nextState = nextResult.nextState;
      result.completed = nextResult.completed;
      result.error = nextResult.error;
      
      this.logger.debug(`🔍 After auto-execution: nextState=${result.nextState}, completed=${result.completed}`);
    }
    
    if (iterations >= maxIterations) {
      this.logger.error(`❌ Auto-execution loop limit reached! Last state: ${result.nextState}`);
    }

    // 6b. Execute final state if completed (to show success message)
    if (result.completed && result.nextState) {
      const finalState = flow.states[result.nextState];
      if (finalState && finalState.type === 'end') {
        this.logger.log(`🏁 Executing final state: ${result.nextState}`);
        this.contextService.updateState(context, result.nextState);
        await this.stateMachine.executeState(flow, context);
      }
    }

    // 7. Update flow run
    const status: FlowRunStatus = result.completed 
      ? 'completed' 
      : result.error 
      ? 'failed' 
      : 'running';

    // If nextState is null (error case), keep the current state
    const stateToSave = result.nextState || context._system.currentState;

    await this.updateFlowRun(flowRun.id, stateToSave, context, status, result.error);

    // 8. Clear flow from session if completed (CRITICAL FIX!)
    if (result.completed) {
      this.logger.log(`✅ Flow completed! Clearing from session to allow new flow on next message.`);
      await this.clearFlowFromSession(sessionId);

      // 🔄 RESUME CHECK: If there is a suspended flow, ask user if they want to resume
      const session = await this.sessionService.getSession(sessionId);
      if (session?.data?.suspendedFlow) {
        const suspendedFlowId = session.data.suspendedFlow.flowId;
        const suspendedFlowDef = await this.getFlowById(suspendedFlowId);
        const flowName = suspendedFlowDef?.name || 'previous task';
        
        // Append prompt to response
        const resumePrompt = `\n\n(By the way, we were in the middle of ${flowName}. Do you want to continue that?)`;
        
        // If response is object (with buttons), append to message
        let finalResponse = this.contextService.get(context, '_last_response') || 'I am listening. Please continue.';
        
        if (typeof finalResponse === 'object' && finalResponse.message) {
          finalResponse.message += resumePrompt;
          // Add Resume/No buttons
          if (!finalResponse.buttons) finalResponse.buttons = [];
          finalResponse.buttons.push(
            { id: 'btn_resume_yes', label: 'Yes, Resume', value: 'resume_flow' },
            { id: 'btn_resume_no', label: 'No, Thanks', value: 'cancel_resume' }
          );
        } else if (typeof finalResponse === 'string') {
          finalResponse += resumePrompt;
        }
        
        // Set session flag to expect resume confirmation
        await this.sessionService.saveSession(sessionId, {
          data: {
            ...session.data,
            awaitingResumeConfirmation: true
          }
        });
        
        // Update response in result
        return {
          flowRunId: flowRun.id,
          currentState: result.nextState || context._system.currentState,
          response: finalResponse,
          completed: true,
          collectingData: false,
          progress: 100,
        };
      }
    } else {
      // Save context to session only if flow is still active
      await this.saveContextToSession(sessionId, context);
    }

    // Handle error case explicitly
    if (result.error) {
      return {
        flowRunId: flowRun.id,
        currentState: result.nextState || context._system.currentState,
        response: `I encountered an error: ${result.error}. Please type 'reset' to start over.`,
        completed: false,
        collectingData: false,
        progress: 0,
      };
    }

    // Extract cards from search_results or other sources in context
    const searchResults = this.contextService.get(context, 'search_results');
    const cards = searchResults?.cards || this.contextService.get(context, '_cards');

    return {
      flowRunId: flowRun.id,
      currentState: result.nextState || context._system.currentState,
      response: this.contextService.get(context, '_last_response') || 'I am listening. Please continue.',
      completed: result.completed,
      collectingData: !result.completed,
      progress: this.contextService.calculateProgress(
        context,
        Object.keys(flow.states).length,
        flow.finalStates
      ),
      metadata: cards ? { cards } : undefined,
    };
  }

  /**
   * Get active flow for session
   */
  async getActiveFlow(sessionId: string): Promise<string | null> {
    const session = await this.sessionService.getSession(sessionId);
    return session?.data?.flowContext?.flowRunId || null;
  }

  /**
   * Get current flow context for session (includes currentState)
   */
  async getContext(sessionId: string): Promise<{ flowRunId: string; currentState: string } | null> {
    const session = await this.sessionService.getSession(sessionId);
    const flowContext = session?.data?.flowContext;
    if (!flowContext?.flowRunId) return null;
    return {
      flowRunId: flowContext.flowRunId,
      currentState: flowContext.currentState || '',
    };
  }

  /**
   * Check if flow is in a wait state (collecting user input)
   * This is important to prevent interruptions during data collection
   */
  async isInWaitState(sessionId: string): Promise<boolean> {
    const session = await this.sessionService.getSession(sessionId);
    const flowContext = session?.data?.flowContext;
    if (!flowContext?.flowRunId || !flowContext?.currentState) return false;
    
    // Get flow definition to check state type
    const flow = await this.getFlowById(flowContext.flowId);
    if (!flow) return false;
    
    const currentState = flow.states[flowContext.currentState];
    return currentState?.type === 'wait';
  }

  /**
   * Cancel active flow
   */
  async cancelFlow(sessionId: string): Promise<void> {
    const session = await this.sessionService.getSession(sessionId);
    const flowRunId = session?.data?.flowContext?.flowRunId;

    if (flowRunId) {
      await (this.prisma as any).flowRun.update({
        where: { id: flowRunId },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
        },
      });

      // Clear from session
      await this.sessionService.saveSession(sessionId, {
        data: {
          ...session?.data,
          flowContext: null,
        },
      });

      this.logger.log(`❌ Flow cancelled: ${flowRunId}`);
    }
  }

  /**
   * Suspend active flow (save state for later resumption)
   */
  async suspendFlow(sessionId: string): Promise<void> {
    const session = await this.sessionService.getSession(sessionId);
    const flowContext = session?.data?.flowContext;

    if (flowContext) {
      // Save to suspendedFlow
      await this.sessionService.saveSession(sessionId, {
        data: {
          ...session?.data,
          suspendedFlow: flowContext,
          flowContext: null, // Clear active flow
        },
      });
      this.logger.log(`⏸️ Suspended flow for session ${sessionId}`);
    }
  }

  /**
   * Resume suspended flow
   */
  async resumeSuspendedFlow(sessionId: string): Promise<boolean> {
    const session = await this.sessionService.getSession(sessionId);
    const suspended = session?.data?.suspendedFlow;
    
    if (suspended) {
      this.logger.log(`▶️ Resuming suspended flow: ${suspended.flowId}`);
      
      await this.sessionService.saveSession(sessionId, {
        data: {
          ...session?.data,
          flowContext: suspended,
          suspendedFlow: null,
        },
      });
      return true;
    }
    return false;
  }

  /**
   * Find flow by intent trigger and optional module
   */
  async findFlowByIntent(intent: string, module?: string, message?: string): Promise<FlowDefinition | null> {
    const flows = await this.getAllFlows();
    
    this.logger.log(`🔍 FLOW SEARCH: intent="${intent}", module="${module}", message="${message ? message.substring(0, 20) + '...' : 'none'}"`);
    this.logger.log(`📋 Available flows: ${flows.map(f => `${f.id} (trigger: ${f.trigger}, module: ${f.module})`).join(', ')}`);
    
    let flow: FlowDefinition | undefined;
    
    // CRITICAL: If intent is 'default' or 'unknown', don't try to match it - fall through to keyword matching
    if (intent === 'default' || intent === 'unknown') {
      this.logger.warn(`⚠️ NLU returned ${intent} intent - using keyword/module fallback`);
    } else {
      // Try exact match with intent trigger first
      flow = flows.find(f => f.trigger === intent && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Exact match: ${flow.name} (trigger: ${flow.trigger})`);
        return flow;
      }
    }
    
    // Skip prefix matching for default/unknown
    if (intent !== 'default' && intent !== 'unknown') {
      // Try with "intent." prefix
      flow = flows.find(f => f.trigger === `intent.${intent}` && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Prefix match: ${flow.name} (trigger: ${flow.trigger})`);
        return flow;
      }
    }
    
    // Try partial match (e.g., "parcel.create" matches "intent.parcel.create")
    flow = flows.find(f => {
      const trigger = f.trigger || '';
      return (trigger.endsWith(`.${intent}`) || trigger === intent) && f.enabled !== false;
    });
    if (flow) {
      this.logger.log(`✅ Partial match: ${flow.name} (trigger: ${flow.trigger})`);
      return flow;
    }
    
    // Try trigger pattern matching (e.g., "browse_menu" in "help|browse_menu|what can you do")
    flow = flows.find(f => {
      if (!f.trigger || f.enabled === false) return false;
      
      const triggerPatterns = f.trigger.split('|').map(t => t.trim().toLowerCase());
      const intentLower = intent.toLowerCase();
      
      // Check if intent matches any trigger pattern
      return triggerPatterns.some(pattern => {
        return pattern === intentLower || 
               intentLower.includes(pattern) || 
               pattern.includes(intentLower);
      });
    });
    if (flow) {
      this.logger.log(`✅ Trigger pattern match: ${flow.name} (trigger: ${flow.trigger})`);
      return flow;
    }
    
    // Try keyword-based matching on INTENT
    const lowerIntent = intent.toLowerCase();
    
    // Login/Auth keywords - Check FIRST before greeting fallback
    // This catches "login", "sign in", "otp", etc. even with unknown intent
    if (message) {
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('login') || lowerMsg.includes('sign in') || lowerMsg.includes('signin') || lowerMsg.includes('log in') || lowerMsg.includes('authenticate') || lowerMsg.includes('verify phone') || lowerMsg.includes('otp') || lowerMsg === 'login') {
        // Match EXACT trigger 'login' for customer auth (not vendor_login or delivery_login)
        flow = flows.find(f => f.trigger === 'login' && f.enabled !== false);
        if (flow) {
          this.logger.log(`✅ Login keyword match: ${flow.name}`);
          return flow;
        }
      }
    }
    
    // Greeting keywords - ALWAYS check, especially for default/unknown intents
    if (lowerIntent.includes('greet') || lowerIntent === 'greeting' || lowerIntent === 'hello' || lowerIntent === 'hi' || lowerIntent === 'hey' || intent === 'default' || intent === 'unknown') {
      this.logger.log(`🎯 Checking greeting keywords for intent: ${intent}`);
      flow = flows.find(f => f.trigger?.includes('greeting') && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Keyword match (greeting): ${flow.name} (trigger: ${flow.trigger})`);
        return flow;
      }
    }

    // --- MESSAGE CONTENT FALLBACK ---
    // If intent didn't match, check the raw message content
    if (message) {
      const lowerMsg = message.toLowerCase();

      // Food/Order
      if (lowerMsg.includes('food') || lowerMsg.includes('order') || lowerMsg.includes('eat') || lowerMsg.includes('hungry') || lowerMsg.includes('restaurant') || lowerMsg.includes('paneer') || lowerMsg.includes('pizza') || lowerMsg.includes('biryani')) {
        flow = flows.find(f => f.module === 'food' && f.enabled !== false);
        if (flow) {
          this.logger.log(`✅ Message keyword match (food): ${flow.name}`);
          return flow;
        }
      }

      // Parcel/Coolie
      if (lowerMsg.includes('parcel') || lowerMsg.includes('send') || lowerMsg.includes('courier') || lowerMsg.includes('delivery') || lowerMsg.includes('pickup') || lowerMsg.includes('drop')) {
        flow = flows.find(f => f.module === 'parcel' && f.enabled !== false);
        if (flow) {
          this.logger.log(`✅ Message keyword match (parcel): ${flow.name}`);
          return flow;
        }
      }

      // Shopping/Mart
      if (lowerMsg.includes('shop') || lowerMsg.includes('buy') || lowerMsg.includes('grocery') || lowerMsg.includes('milk') || lowerMsg.includes('mart')) {
        flow = flows.find(f => f.module === 'ecommerce' && f.enabled !== false);
        if (flow) {
          this.logger.log(`✅ Message keyword match (ecommerce): ${flow.name}`);
          return flow;
        }
      }
    }
    // --------------------------------

    // Game/earn keywords - ALWAYS check regardless of module
    if (lowerIntent.includes('game') || lowerIntent.includes('earn') || lowerIntent.includes('reward')) {
      flow = flows.find(f => f.trigger?.includes('game') && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Game keyword match: ${flow.name}`);
        return flow;
      }
    }
    
    // Help keywords - ALWAYS check regardless of module
    if (lowerIntent.includes('help') || lowerIntent === 'support') {
      flow = flows.find(f => f.trigger?.includes('help') && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Help keyword match: ${flow.name}`);
        return flow;
      }
    }
    
    // Fallback to 'general' module flows for common intents
    if (!flow && module && module !== 'general') {
      this.logger.debug(`🔄 No flow found for module ${module}, trying 'general' module...`);
      flow = flows.find(f => f.trigger === intent && f.module === 'general' && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ General module fallback: ${flow.name}`);
        return flow;
      }
      
      flow = flows.find(f => f.trigger === `intent.${intent}` && f.module === 'general' && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ General module fallback (with prefix): ${flow.name}`);
        return flow;
      }
    }
    
    // Parcel/delivery keywords (Intent check)
    if (lowerIntent.includes('parcel') || lowerIntent.includes('courier') || lowerIntent.includes('delivery')) {
      flow = flows.find(f => f.module === 'parcel' && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Parcel keyword match: ${flow.name}`);
        return flow;
      }
    }
    
    // Food keywords (Intent check)
    if (lowerIntent.includes('food') || lowerIntent.includes('restaurant') || lowerIntent.includes('order')) {
      flow = flows.find(f => f.module === 'food' && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Food keyword match: ${flow.name}`);
        return flow;
      }
    }
    
    // Ecommerce keywords (Intent check)
    if (lowerIntent.includes('shop') || lowerIntent.includes('buy') || lowerIntent.includes('ecom')) {
      flow = flows.find(f => f.module === 'ecommerce' && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Ecommerce keyword match: ${flow.name}`);
        return flow;
      }
    }

    // If module provided, try module-based matching with intent keywords
    if (module) {
      // Try exact module match first (LOWEST PRIORITY - only if no trigger match found)
      flow = flows.find(f => f.module === module && f.enabled !== false);
      if (flow) {
        this.logger.log(`✅ Module fallback match: ${flow.name} (module: ${module})`);
        return flow;
      }
    }
    
    this.logger.warn(`❌ No flow found for intent: ${intent}, module: ${module}`);
    return null;
  }

  /**
   * Get flow by ID
   */
  async getFlowById(flowId: string): Promise<FlowDefinition | null> {
    // Check cache first
    if (this.flowCache.has(flowId) && Date.now() < this.cacheExpiry) {
      return this.flowCache.get(flowId)!;
    }

    // Load from database
    const flowRecord = await (this.prisma as any).flow.findUnique({
      where: { id: flowId },
    });

    if (!flowRecord || flowRecord.status !== 'active') {
      return null;
    }

    const flow = this.parseFlowRecord(flowRecord);
    
    // Cache it
    this.flowCache.set(flowId, flow);

    return flow;
  }

  /**
   * Get all active flows
   */
  async getAllFlows(): Promise<FlowDefinition[]> {
    const flowRecords = await this.prisma.flow.findMany({
      where: { status: 'active' },
      orderBy: { updatedAt: 'desc' },
    });

    return flowRecords.map(record => this.parseFlowRecord(record));
  }

  /**
   * Parse flow record from database
   */
  private parseFlowRecord(record: any): FlowDefinition {
    const flow: FlowDefinition = {
      id: record.id,
      name: record.name,
      description: record.description,
      module: record.module,
      trigger: record.trigger,
      version: record.version || '1.0.0',
      states: typeof record.states === 'string' ? JSON.parse(record.states) : record.states,
      initialState: record.initialState,
      finalStates: typeof record.finalStates === 'string' ? JSON.parse(record.finalStates) : record.finalStates,
      contextSchema: record.contextSchema ? (typeof record.contextSchema === 'string' ? JSON.parse(record.contextSchema) : record.contextSchema) : undefined,
      metadata: record.metadata ? (typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata) : undefined,
      enabled: record.enabled,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return flow;
  }

  /**
   * Save flow definition
   */
  async saveFlow(flow: FlowDefinition): Promise<void> {
    // Validate flow
    const validation = this.stateMachine.validateFlow(flow);
    if (!validation.valid) {
      throw new Error(`Invalid flow: ${validation.errors.join(', ')}`);
    }

    await (this.prisma as any).flow.upsert({
      where: { id: flow.id },
      create: {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        module: flow.module || 'general',
        trigger: flow.trigger,
        version: flow.version || '1.0.0',
        states: flow.states,
        initialState: flow.initialState,
        finalStates: flow.finalStates,
        contextSchema: flow.contextSchema,
        metadata: flow.metadata,
        enabled: flow.enabled !== false,
        status: 'active',
      },
      update: {
        name: flow.name,
        description: flow.description,
        module: flow.module || 'general',
        trigger: flow.trigger,
        version: flow.version || '1.0.0',
        states: flow.states,
        initialState: flow.initialState,
        finalStates: flow.finalStates,
        contextSchema: flow.contextSchema,
        metadata: flow.metadata,
        enabled: flow.enabled !== false,
      },
    });

    // Invalidate cache
    this.flowCache.delete(flow.id);
    this.cacheExpiry = 0;

    this.logger.log(`💾 Flow saved: ${flow.name} (${flow.id})`);
  }

  /**
   * Update flow run in database
   */
  private async updateFlowRun(
    flowRunId: string,
    currentState: string | null,
    context: FlowContext,
    status: FlowRunStatus,
    error?: string
  ): Promise<void> {
    await (this.prisma as any).flowRun.update({
      where: { id: flowRunId },
      data: {
        currentState: currentState,
        context: context as any,
        status,
        error,
        completedAt: status === 'completed' || status === 'failed' 
          ? new Date() 
          : undefined,
      },
    });
  }

  /**
   * Save context to session
   */
  private async saveContextToSession(
    sessionId: string,
    context: FlowContext
  ): Promise<void> {
    const session = await this.sessionService.getSession(sessionId);
    
    await this.sessionService.saveSession(sessionId, {
      data: {
        ...session?.data,
        flowContext: {
          flowId: context._system.flowId,
          flowRunId: context._system.flowRunId,
          currentState: context._system.currentState,
          data: context.data,
        },
      },
    });
  }

  /**
   * Clear flow from session (called when flow completes)
   * IMPORTANT: Preserves conversation history for context continuity
   */
  private async clearFlowFromSession(sessionId: string): Promise<void> {
    const session = await this.sessionService.getSession(sessionId);
    
    // 🧠 PRESERVE CONVERSATION HISTORY: Extract it before clearing flowContext
    const existingHistory = session?.data?.flowContext?.data?._conversation_history || [];
    const existingSessionHistory = session?.data?._conversation_history || [];
    
    // Merge histories, keeping most recent entries (last 20 turns max)
    const mergedHistory = [...existingSessionHistory, ...existingHistory].slice(-40);
    
    await this.sessionService.saveSession(sessionId, {
      data: {
        ...session?.data,
        flowContext: null, // Clear flow context
        _conversation_history: mergedHistory, // Preserve conversation history at session level!
      },
    });
    
    this.logger.log(`🧹 Cleared flow from session ${sessionId} (preserved ${mergedHistory.length} history entries)`);
  }

  /**
   * Clear flow cache (useful for development)
   */
  clearCache(): void {
    this.flowCache.clear();
    this.cacheExpiry = 0;
    this.logger.log('🗑️ Flow cache cleared');
  }
}
