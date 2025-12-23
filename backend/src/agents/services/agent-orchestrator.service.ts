import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AgentContext, AgentResult, ModuleType, RoutingResult, AgentType } from '../types/agent.types';
import { AgentRegistryService } from './agent-registry.service';
import { IntentRouterService } from './intent-router.service';
import { SessionService } from '../../session/session.service';
import { PhpAddressService } from '../../php-integration/services/php-address.service';
import { PhpOrderService } from '../../php-integration/services/php-order.service';
import { PhpParcelService } from '../../php-integration/services/parcel.service';
import { PhpAuthService } from '../../php-integration/services/php-auth.service';
import { PhpPaymentService } from '../../php-integration/services/php-payment.service';
import { PhpStoreService } from '../../php-integration/services/php-store.service';
import { AddressExtractionService } from './address-extraction.service';
import { ConversationLoggerService } from '../../database/conversation-logger.service';
import { FlowEngineService } from '../../flow-engine/flow-engine.service';
import { AuthTriggerService } from '../../auth/auth-trigger.service';
import { GameOrchestratorService } from '../../gamification/services/game-orchestrator.service';
import { UserPreferenceService } from '../../personalization/user-preference.service';
import { UserSyncService } from '../../user/services/user-sync.service';
import { SettingsService } from '../../settings/settings.service';
import { VoiceCharactersService } from '../../voice-characters/voice-characters.service';

/**
 * Flow Interfaces (from Admin Backend)
 */
interface Flow {
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  enabled: boolean;
  trigger?: string;
  module?: string;
}

interface FlowStep {
  id: string;
  type: string;
  config: Record<string, unknown>;
  next?: string;
  conditions?: Array<{ condition: string; nextStepId: string }>;
}

interface FlowExecutionContext {
  phoneNumber: string;
  sessionId: string;
  collectedData: Record<string, unknown>;
  currentStepId: string;
  flowId: string;
  stepAttempts?: Record<string, number>; // Track failed step attempts for loop detection
}

/**
 * Agent Orchestrator Service
 * 
 * Main entry point for agent-based conversation processing.
 * Now includes Flow management integration with Admin Backend.
 */
import { normalizePhoneNumber } from '../../common/utils/helpers';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private adminBackendUrl: string;
  private flowCache: Map<string, Flow> = new Map();
  private flowCacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private sessionService: SessionService,
    private intentRouter: IntentRouterService,
    private agentRegistry: AgentRegistryService,
    private phpAddressService: PhpAddressService,
    private phpOrderService: PhpOrderService,
    private phpParcelService: PhpParcelService,
    private addressExtractionService: AddressExtractionService,
    private conversationLogger: ConversationLoggerService,
    private flowEngineService: FlowEngineService,
    private authTriggerService: AuthTriggerService,
    private phpAuthService: PhpAuthService,
    private phpPaymentService: PhpPaymentService,
    private gameOrchestratorService: GameOrchestratorService,
    private userPreferenceService: UserPreferenceService,
    private userSyncService: UserSyncService,
    private phpStoreService: PhpStoreService,
    private voiceCharactersService: VoiceCharactersService,
    private settingsService: SettingsService,
  ) {
    this.logger = new Logger(AgentOrchestratorService.name);
    this.adminBackendUrl = this.configService.get<string>('ADMIN_BACKEND_URL') || 'http://localhost:3002';
    this.logger.log(`🎯 Agent Orchestrator initialized with FlowEngineService & AuthTriggerService`);
  }

  /**
   * Convert node-based flow (Admin Backend format) to step-based flow (Agent Orchestrator format)
   * This follows industry standards from n8n, Temporal, and other workflow orchestration platforms
   */
  private convertNodeFlowToStepFlow(nodeFlow: any): Flow {
    const steps: FlowStep[] = [];
    const nodeMap = new Map(nodeFlow.nodes.map(n => [n.id, n]));
    const edgeMap = new Map<string, string[]>();
    
    // Build adjacency list from edges
    for (const edge of nodeFlow.edges || []) {
      if (!edgeMap.has(edge.from)) {
        edgeMap.set(edge.from, []);
      }
      edgeMap.get(edge.from)!.push(edge.to);
    }
    
    // Convert nodes to steps (following hyperlocal delivery flow patterns)
    for (const node of nodeFlow.nodes || []) {
      const nextNodes = edgeMap.get(node.id) || [];
      steps.push({
        id: node.id,
        type: this.mapNodeTypeToStepType(node.type),
        config: node.config || {},
        next: nextNodes[0], // Take first edge for linear flow
        conditions: nextNodes.length > 1 ? nextNodes.slice(1).map(n => ({
          condition: 'default',
          nextStepId: n
        })) : undefined
      });
    }
    
    return {
      id: nodeFlow.id,
      name: nodeFlow.name,
      description: nodeFlow.description,
      steps,
      enabled: nodeFlow.status === 'active',
      trigger: nodeFlow.trigger,
      module: nodeFlow.module,
    };
  }

  /**
   * Map node types to step types (industry standard mapping)
   */
  private mapNodeTypeToStepType(nodeType: string): string {
    const mapping = {
      'nlu': 'nlu',
      'decision': 'condition',
      'llm': 'llm',
      'tool': 'tool',  // Keep as tool, not api_call
      'response': 'respond',
      'collect_address': 'collect_data',
      'validate_zone': 'validate',
      'calculate_distance': 'calculate',
      'game': 'game',
      'gamification': 'game'
    };
    return mapping[nodeType] || nodeType;
  }

  /**
   * Detect flow format and convert if necessary
   */
  private normalizeFlow(flow: any): Flow {
    // Check if it's node-based format (has nodes and edges)
    if (flow.nodes && Array.isArray(flow.nodes)) {
      this.logger.log(`Converting node-based flow to step-based: ${flow.id}`);
      return this.convertNodeFlowToStepFlow(flow);
    }
    
    // Already in step-based format
    if (flow.steps && Array.isArray(flow.steps)) {
      return flow as Flow;
    }
    
    this.logger.warn(`Unknown flow format for flow: ${flow.id}`);
    return flow as Flow;
  }

  /**
   * Force reload flows from source (for testing)
   */
  async loadFlows(): Promise<Flow[]> {
    this.flowCache.clear();
    this.flowCacheExpiry = 0;
    return await this.getFlows();
  }

  /**
   * Clear flow cache (for testing)
   */
  clearFlowCache(): void {
    this.flowCache.clear();
    this.flowCacheExpiry = 0;
  }

  /**
   * Process message with agent system
   */
  async processMessage(
    phoneNumber: string,
    message: string,
    module: ModuleType = ModuleType.FOOD,
    imageUrl?: string,
    testSession?: any, // Optional session override for testing
    userPreferenceContext?: string, // 🧠 NEW: User preference context for personalization
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // 1. Get or create session (or use test session)
      const session = testSession || await this.sessionService.getSession(phoneNumber);

      this.logger.log(`🔍 Processing message: "${message}" for ${phoneNumber}`);

      // �‍💼 HUMAN TAKEOVER CHECK
      // If conversation is escalated to human, pause AI responses.
      // Messages are still logged but we return a polite "human will respond" message.
      if (session?.data?.escalated_to_human === true) {
        this.logger.log(`⏸️ Conversation escalated to human - AI paused for ${phoneNumber}`);
        
        const issueId = session?.data?.frappe_issue_id;
        return {
          response: `Your conversation has been escalated to our support team.${issueId ? ` Ticket: ${issueId}.` : ''} A human agent will assist you shortly.`,
          executionTime: Date.now() - startTime,
          metadata: {
            escalated: true,
            ai_paused: true,
            issueId,
          },
        };
      }

      // �🧠 SMART GREETING & LOCATION CHECK - DISABLED
      // User requested to allow small talk first before asking for location.
      // Location will be requested when a transactional intent is detected.
      /*
      const greetingRegex = /^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|namaste)/i;
      const isGreeting = greetingRegex.test(message.trim());
      
      if (isGreeting) {
        const hasLocation = !!session?.data?.location;
        const locationAge = session?.data?.lastLocationUpdate ? Date.now() - session.data.lastLocationUpdate : Infinity;
        const isLocationFresh = locationAge < 1000 * 60 * 60; // 1 hour

        if (!hasLocation || !isLocationFresh) {
          this.logger.log(`👋 Greeting detected without fresh location. Triggering location request.`);
          
          return {
            response: `Hello! 👋 Welcome to Mangwale.\n\nTo show you the best food and delivery options near you, could you please share your location? 📍`,
            executionTime: Date.now() - startTime,
            metadata: {
              request_location: true,
              intent: 'greeting'
            }
          };
        } else {
           this.logger.log(`👋 Greeting detected WITH fresh location. Proceeding with smart defaults.`);
        }
      }
      */

      // 0. Check for restart/reset commands OR Greetings during Auth (clear flow context & auth state)
      const restartWords = /\b(start.?again|restart|reset|cancel|new.?order|begin.?again|start.?over)\b/i;
      const greetingWords = /\b(hi|hello|hey|greetings|namaste)\b/i;
      
      const isRestart = message && restartWords.test(message);
      // Only treat greeting as reset if we are stuck in auth flow
      const isStuckInAuth = session?.currentStep === 'awaiting_otp' || session?.currentStep === 'awaiting_phone_number';
      const isGreetingReset = message && greetingWords.test(message) && isStuckInAuth;

      if (isRestart || isGreetingReset) {
        this.logger.log(`🔄 Reset/Greeting detected: "${message}" - clearing flow context & auth state`);
        
        // Clear flow context
        if (session?.data?.flowContext) {
          await this.sessionService.saveSession(phoneNumber, {
            data: {
              ...session?.data,
              flowContext: null,
            },
          });
          // Update local session object
          if (session.data) session.data.flowContext = null;
        }
        
        // Clear auth state if stuck
        if (session?.currentStep === 'awaiting_otp' || session?.currentStep === 'awaiting_phone_number') {
           await this.sessionService.setStep(phoneNumber, 'idle', {});
           this.logger.log(`✅ Auth state cleared - ready for fresh start`);
           
           // Update local session object to prevent falling into Step 1
           session.currentStep = 'idle';
           if (session.data) session.data.currentStep = 'idle';
           
           if (isRestart) {
             return {
               response: "Cancelled. How can I help you?",
               executionTime: Date.now() - startTime,
             };
           }
           // If greeting, fall through to normal processing
        } else if (isRestart) {
           // If not in auth state but restart requested
           // Clear auth state just in case
           await this.sessionService.setStep(phoneNumber, 'idle', {});
           
           return {
             response: "Cancelled. How can I help you?",
             executionTime: Date.now() - startTime,
           };
        }
      }

      // 🔐 CHECK AUTH FLOW STEPS - Handle OTP authentication steps FIRST
      // Check both session.currentStep (ConversationService) and session.data.currentStep (direct calls)
      const currentStep = session?.currentStep || session?.data?.currentStep;
      
      // 🔄 RESUME CONFIRMATION CHECK
      if (session?.data?.awaitingResumeConfirmation) {
        const lowerMsg = message.toLowerCase();
        const isYes = lowerMsg.includes('yes') || lowerMsg.includes('resume') || lowerMsg.includes('sure') || lowerMsg.includes('ok') || lowerMsg.includes('ha') || lowerMsg.includes('ho');
        
        // Clear confirmation flag
        await this.sessionService.saveSession(phoneNumber, {
          data: { ...session.data, awaitingResumeConfirmation: false }
        });
        
        if (isYes) {
          const resumed = await this.flowEngineService.resumeSuspendedFlow(phoneNumber);
          if (resumed) {
            // Re-process message as part of resumed flow (or just trigger next step)
            // Actually, we should just let the flow engine handle the "resume" event or just continue
            // For now, let's just return a confirmation and let user continue
            return {
              response: "Great! Resuming where we left off. Please continue.",
              executionTime: Date.now() - startTime,
            };
          }
        } else {
          // User said no, clear suspended flow
          await this.sessionService.saveSession(phoneNumber, {
            data: { ...session.data, suspendedFlow: null }
          });
          // Continue to normal processing below
        }
      }
      
      // 🔐 AUTH STEP HANDLING
      let authResult: AgentResult | null = null;
      let prependResponse = '';
      let authMetadata = {};

      if (currentStep === 'awaiting_phone_number') {
        authResult = await this.handlePhoneNumberInput(phoneNumber, message, session, startTime);
      } else if (currentStep === 'awaiting_otp') {
        authResult = await this.handleOtpInput(phoneNumber, message, session, startTime);
      } else if (currentStep === 'awaiting_name') {
        authResult = await this.handleNameInput(phoneNumber, message, session, startTime);
      } else if (currentStep === 'awaiting_email') {
        authResult = await this.handleEmailInput(phoneNumber, message, session, startTime);
      }

      if (authResult) {
        // Check if auth was successful (we have a token) and we have a pending intent
        const isAuthSuccess = !!authResult.metadata?.auth_data?.token;
        
        // We need to check if we should resume immediately.
        // handleOtpInput returns "Resuming..." message if pendingAction exists, 
        // but we need to actually execute it.
        if (isAuthSuccess && session?.data?.pendingIntent) {
             this.logger.log('🔐 Auth successful, immediately resuming pending intent...');
             
             // Refresh session state to ensure we have latest data (authenticated=true)
             const updatedSession = await this.sessionService.getSession(phoneNumber);
             if (updatedSession) {
                Object.assign(session, updatedSession);
             }
             
             // Capture auth output to prepend later
             prependResponse = authResult.response;
             authMetadata = authResult.metadata || {};
             
             // Clear message so it doesn't interfere with the resumed flow (e.g. OTP code)
             message = ''; 
             
             // Fall through to normal processing (which will hit "Resume Pending Intent" block)
        } else {
             // Normal auth step response (e.g. "Please enter OTP" or "Login successful" without pending intent)
             return authResult;
        }
      }

      // Fetch user preferences if authenticated and not provided
      let finalUserPreferenceContext = userPreferenceContext;
      if (!finalUserPreferenceContext && session?.data?.user_id) {
        try {
          // Pass phone number to enable order history lookup from MySQL
          const prefs = await this.userPreferenceService.getPreferenceContext(
            session.data.user_id, 
            phoneNumber // 🧠 Enable order history context
          );
          finalUserPreferenceContext = prefs.fullContext;
        } catch (err) {
          this.logger.warn(`Failed to fetch user preferences: ${err.message}`);
        }
      }
      
      // 🧠 SMART PERSONALIZATION: Try to load user context even without auth
      // This enables personalized greetings for returning users before they log in
      if (!finalUserPreferenceContext && phoneNumber && phoneNumber.length >= 10) {
        try {
          // Try to get order history by phone - works even without authentication
          const prefs = await this.userPreferenceService.getPreferenceContext(
            0, // No user_id yet
            phoneNumber.replace(/^web-/, '').replace(/^whatsapp-/, '') // Clean phone prefix
          );
          if (prefs.fullContext && !prefs.fullContext.includes('NEW USER')) {
            finalUserPreferenceContext = prefs.fullContext;
            this.logger.log(`🧠 Loaded order history context for returning user ${phoneNumber}`);
          }
        } catch (err) {
          // Silently ignore - user may not exist
        }
      }

      // 2. Build agent context (with user preferences)
      const context: AgentContext = {
        phoneNumber,
        module: module || (session?.data?.module as ModuleType) || ModuleType.FOOD,
        language: (session?.data?.language as string) || 'en',
        session,
        message,
        imageUrl,
        // Store preference context in context.session.data for agent access
        ...(finalUserPreferenceContext && {
          session: {
            ...session,
            data: {
              ...session?.data,
              userPreferenceContext: finalUserPreferenceContext, // 🧠 NEW: Inject user preferences
            },
          },
        }),
      };

      // 3. Route to appropriate agent
      let routing: RoutingResult;

      // 🔄 RESUME PENDING INTENT (Post-Auth)
      // If user is authenticated and has a pending intent, resume it instead of processing new message
      if (session?.data?.authenticated && session?.data?.pendingIntent) {
        const pendingIntent = session.data.pendingIntent;
        const pendingEntities = session.data.pendingEntities || {};
        
        this.logger.log(`🔄 Resuming pending intent: ${pendingIntent}`);
        
        // Construct routing result from pending data
        routing = {
          agentId: 'flow-agent', // Default to flow agent for resumed intents
          agentType: AgentType.CUSTOM,
          intent: pendingIntent,
          confidence: 1.0,
          entities: pendingEntities,
        };

        // Clear pending data to prevent loops
        await this.sessionService.saveSession(phoneNumber, {
          data: {
            ...session.data,
            pendingAction: null,
            pendingModule: null,
            pendingIntent: null,
            pendingEntities: null
          }
        });
      } else {
        // Normal routing
        routing = await this.intentRouter.route(context);
      }

      this.logger.log(
        `🎯 Routing to agent: ${routing.agentId} (intent: ${routing.intent}, confidence: ${routing.confidence})`,
      );
      this.logger.debug(`🔍 Full routing result: ${JSON.stringify(routing)}`);

      // Update context with intent and entities
      context.intent = routing.intent;
      context.entities = routing.entities;
      context.confidence = routing.confidence;

      // Log user message with NLU classification to PostgreSQL
      const flowContext = session?.data?.flowContext;
      await this.conversationLogger.logUserMessage({
        phone: phoneNumber,
        userId: session?.data?.user_id,
        messageText: message,
        platform: session?.data?.platform || 'whatsapp',
        sessionId: session?.id || phoneNumber,
        flowId: flowContext?.flowId,
        stepId: flowContext?.currentStepId,
        nluIntent: routing.intent,
        nluConfidence: routing.confidence,
        variables: {
          module,
          entities: routing.entities,
        },
      }).catch(err => this.logger.error(`Failed to log user message: ${err.message}`));

      // 🔐 AUTH CHECK: Determine if this intent requires authentication
      const isAuthenticated = session?.data?.authenticated === true;
      const intentStr = String(routing.intent || 'unknown').toLowerCase();
      
      // Map intent to action AND module (for auth trigger service)
      const intentModuleMap: Record<string, { action: string; module: string }> = {
        'order_food': { action: 'search_food', module: 'food' }, // Changed from place_order to allow product preview first
        'add_to_cart': { action: 'add_to_cart', module: 'food' },
        'checkout': { action: 'checkout', module: 'food' },
        'track_order': { action: 'track_order', module: 'tracking' },
        'cancel_order': { action: 'cancel_order', module: 'tracking' },
        'book_parcel': { action: 'book_delivery', module: 'parcel' },
        'parcel_booking': { action: 'book_delivery', module: 'parcel' },
        'create_parcel_order': { action: 'create_order', module: 'parcel' },
        'refund_request': { action: 'file_complaint', module: 'complaints' },
        'submit_complaint': { action: 'file_complaint', module: 'complaints' },
        'view_profile': { action: 'view_profile', module: 'general' },
        'view_orders': { action: 'view_orders', module: 'tracking' },
        'claim_reward': { action: 'claim_reward', module: 'general' },
        'search_product': { action: 'browse', module: 'ecom' },
      };
      
      const intentMapping = intentModuleMap[intentStr] || { action: 'browse', module: 'general' };
      const action = intentMapping.action;
      const moduleStr = intentMapping.module;
      
      this.logger.log(`🔍 AUTH CHECK: intent="${intentStr}", action="${action}", module="${moduleStr}", isAuth=${isAuthenticated}`);
      
      if (!isAuthenticated && this.authTriggerService.requiresAuth(action, moduleStr)) {
        this.logger.log(`🔒 Auth required for ${action} in ${moduleStr} module`);
        
        const authPrompt = this.authTriggerService.getAuthPrompt(action, moduleStr);
        
        // Set session step to awaiting phone number and store pending action
        // IMPORTANT: Also store the original message to resume correctly after auth
        await this.sessionService.setStep(phoneNumber, 'awaiting_phone_number', {
          pendingAction: action,
          pendingModule: moduleStr,
          pendingIntent: routing.intent,
          pendingEntities: routing.entities, // Save entities to restore context later
          pendingMessage: message, // Store original message to replay after auth
        });
        
        return {
          response: authPrompt,
          executionTime: Date.now() - startTime,
          metadata: { intent: routing.intent }
        };
      }

      // 4. Check for restart/reset commands (clear flow context) - MOVED TO TOP
      // (Logic moved to step 0 to handle auth loops)

      // 5. Check if there's already an ACTIVE flow in progress
      const existingFlowContext = session?.data?.flowContext as any;
      
      if (existingFlowContext && existingFlowContext.flowId && existingFlowContext.currentStepId) {
        // Check if we're stuck on a failed step (same step retried multiple times)
        const lastStepAttempts = (existingFlowContext.stepAttempts || {})[existingFlowContext.currentStepId] || 0;
        
        if (lastStepAttempts >= 3) {
          this.logger.warn(`⚠️ Step ${existingFlowContext.currentStepId} failed ${lastStepAttempts} times - resetting flow`);
          await this.sessionService.saveSession(phoneNumber, {
            data: {
              ...session?.data,
              flowContext: null,
            },
          });
          // Let flow engine handle fallback
        } else {
          // Resume existing flow
          this.logger.log(`🔄 Resuming existing flow: ${existingFlowContext.flowId} at step ${existingFlowContext.currentStepId} (attempt ${lastStepAttempts + 1})`);
          
          const flows = await this.getFlows();
          const existingFlow = flows.find(f => f.id === existingFlowContext.flowId);
          
          if (existingFlow) {
            return await this.executeFlow(existingFlow, context);
          } else {
            this.logger.warn(`⚠️ Flow ${existingFlowContext.flowId} not found, will start new flow`);
          }
        }
      }

      // 6. Check if modern flow engine has a flow for this session
      const activeFlowRun = await this.flowEngineService.getActiveFlow(phoneNumber);
      
      if (activeFlowRun) {
        // 🛑 INTERRUPT CHECK: If user expresses a strong new intent, cancel current flow
        const strongIntents = ['parcel_booking', 'order_food', 'search_product', 'help', 'login', 'greeting'];
        
        // FIX: Don't interrupt for short messages that might be answers to flow questions
        // e.g. "my home" (7 chars) shouldn't trigger order_food interruption
        const isShortMessage = message.length < 20;
        
        // FIX: Don't interrupt if the new intent matches the current flow's module/purpose
        // e.g. If in parcel flow, "send parcel" (parcel_booking) should NOT interrupt
        const currentFlowDef = await this.flowEngineService.getFlowById(activeFlowRun.split('_')[0]); // approximate check
        const isSameIntent = currentFlowDef && (
            (currentFlowDef.module === 'parcel' && routing.intent === 'parcel_booking') ||
            (currentFlowDef.module === 'food' && routing.intent === 'order_food') ||
            (currentFlowDef.module === 'ecommerce' && routing.intent === 'search_product')
        );

        // 🔒 FIX: Never interrupt if flow is in a wait state (collecting user input like location, address, selection)
        const isInWaitState = await this.flowEngineService.isInWaitState(phoneNumber);
        if (isInWaitState) {
          this.logger.log(`🔒 Flow is collecting data (wait state) - NOT interrupting for ${routing.intent}`);
        }

        const isStrongIntent = strongIntents.includes(routing.intent) && 
                               routing.confidence > 0.8 && 
                               !isSameIntent && // Don't interrupt if it's the same intent type
                               !isInWaitState && // 🔒 Never interrupt during data collection
                               (!isShortMessage || ['help', 'cancel', 'stop', 'menu', 'login'].includes(routing.intent));
        
        if (isStrongIntent) {
          this.logger.log(`🛑 Interrupting active flow ${activeFlowRun} for strong intent: ${routing.intent} (${routing.confidence})`);
          // Suspend current flow instead of cancelling
          await this.flowEngineService.suspendFlow(phoneNumber);
          // Fall through to start new flow below
        } else {
          this.logger.log(`🔄 Resuming modern flow: ${activeFlowRun}`);
          const result = await this.flowEngineService.processMessage(phoneNumber, message);
          
          this.logger.log(`🔄 Modern flow result: ${JSON.stringify(result)}`);

          return {
            response: result.response,
            executionTime: Date.now() - startTime,
            metadata: { 
              intent: 'resume_flow',
              cards: result.metadata?.cards  // ✅ FIXED: Pass cards from resumed flow
            }
          };
        }
      }
      
      // 7. Find flow for this intent and module
      this.logger.log(`🔍 Looking for flow: intent="${routing.intent}", module="${module}"`);
      const modernFlow = await this.flowEngineService.findFlowByIntent(routing.intent, module, message);
      
      if (modernFlow) {
        this.logger.log(`🚀 Starting modern flow: ${modernFlow.name} (intent: ${routing.intent})`);
        const result = await this.flowEngineService.startFlow(modernFlow.id, {
          phoneNumber,
          sessionId: session?.phoneNumber || phoneNumber,
          initialContext: {
            message,
            intent: routing.intent,
            ...routing.entities,
            // 🧠 Pass user preference context to flow for personalization
            ...(finalUserPreferenceContext && { userPreferenceContext: finalUserPreferenceContext }),
          }
        });

        this.logger.log(`🚀 Modern flow start result: ${JSON.stringify(result)}`);

        return {
          response: result.response,
          executionTime: Date.now() - startTime,
          metadata: { 
            intent: routing.intent,
            cards: result.metadata?.cards 
          }
        };
      } else {
        this.logger.warn(`⚠️ No flow found for intent: ${routing.intent}, module: ${module}`);
        
        // If intent is unknown and confidence is low, offer clarification menu
        if ((routing.intent === 'unknown' || !routing.intent) && routing.confidence < 0.6) {
          this.logger.log(`🤔 Unknown intent with low confidence - offering clarification menu`);
          return {
            response: this.generateClarificationMenu(message),
            executionTime: Date.now() - startTime,
          };
        }
      }
      
      // 8. Fallback: Try legacy flow system
      // DISABLED LEGACY FLOW EXECUTION - NOW USING MODERN FLOW ENGINE ABOVE
      // const flow = await this.findFlowForIntent(routing.intent, module, message);
      // if (flow && flow.enabled) {
      //   this.logger.log(`🔄 Flow found for intent: ${routing.intent}, executing LEGACY flow: ${flow.name}`);
      //   return await this.executeFlow(flow, context);
      // }

      // No flow found, use traditional agent execution
      this.logger.log(`🤖 No modern flow found, using traditional agent execution`);
      const agent = this.agentRegistry.getAgent(routing.agentId);

      if (!agent) {
        this.logger.error(`Agent not found: ${routing.agentId}`);
        return {
          response:
            'I apologize, but I am having trouble processing your request. Please try again.',
          executionTime: Date.now() - startTime,
        };
      }

      // 6. Execute agent
      this.logger.log(`🤖 Executing agent ${routing.agentId}...`);
      const result = await agent.execute(context);

      // Merge auth result if needed
      if (prependResponse) {
          result.response = `${prependResponse}\n\n${result.response}`;
          result.metadata = { ...authMetadata, ...result.metadata };
      }

      this.logger.log(`✅ Agent execution complete. Response length: ${result.response?.length}`);
      this.logger.debug(`📦 Agent Result: ${JSON.stringify(result)}`);

      // 7. Update session history
      await this.updateSessionHistory(phoneNumber, session, message, result.response, routing);

      // 8. Log analytics
      this.logAnalytics(phoneNumber, routing, result);

      // Inject intent into metadata
      if (!result.metadata) result.metadata = {};
      result.metadata.intent = routing.intent;

      return result;
    } catch (error) {
      this.logger.error('Agent orchestration error:', error);
      this.logger.error('Error stack:', error?.stack);
      this.logger.error(`Error occurred while processing: phoneNumber=${phoneNumber}, message="${message}", module=${module}`);

      return {
        response:
          'I apologize, but I encountered an error. Please try again or contact support.',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Find flow for a given intent and module
   */
  private async findFlowForIntent(intent: string, module: ModuleType, message?: string): Promise<Flow | null> {
    try {
      const flows = await this.getFlows();
      
      // Strategy 1: Exact trigger match
      let flow = flows.find(
        f => f.trigger && f.trigger === intent && f.module === module.toLowerCase()
      );
      
      if (flow) {
        this.logger.log(`✅ Flow matched by trigger: ${flow.name}`);
        return flow;
      }

      // Strategy 2: Keyword matching for unknown intents
      if ((intent === 'unknown' || intent === 'general' || !intent) && message) {
        const lowerMessage = message.toLowerCase();
        
        // Parcel/Courier keywords
        if (lowerMessage.match(/\b(parcel|courier|delivery|package|send|ship|booking)\b/)) {
          flow = flows.find(f => 
            f.name.toLowerCase().includes('parcel') || 
            f.id.includes('parcel')
          );
          if (flow) {
            this.logger.log(`✅ Flow matched by keyword (parcel): ${flow.name}`);
            return flow;
          }
        }

        // Food/Restaurant keywords
        if (lowerMessage.match(/\b(food|restaurant|meal|order|hungry|eat|menu)\b/)) {
          flow = flows.find(f => 
            f.name.toLowerCase().includes('food') || 
            f.name.toLowerCase().includes('restaurant') ||
            f.module === 'food'
          );
          if (flow) {
            this.logger.log(`✅ Flow matched by keyword (food): ${flow.name}`);
            return flow;
          }
        }

        // E-commerce keywords
        if (lowerMessage.match(/\b(shop|buy|product|cart|checkout|purchase)\b/)) {
          flow = flows.find(f => 
            f.name.toLowerCase().includes('commerce') || 
            f.name.toLowerCase().includes('shop')
          );
          if (flow) {
            this.logger.log(`✅ Flow matched by keyword (ecommerce): ${flow.name}`);
            return flow;
          }
        }
      }

      // Strategy 3: Module-based matching
      flow = flows.find(f => f.module === module.toLowerCase());
      if (flow) {
        this.logger.log(`✅ Flow matched by module: ${flow.name}`);
        return flow;
      }

      // Strategy 4: Default to first active flow for this module
      flow = flows.find(f => f.enabled);
      if (flow) {
        this.logger.log(`⚠️ Using default flow: ${flow.name}`);
        return flow;
      }

      return null;
    } catch (error) {
      this.logger.error('Error finding flow for intent:', error);
      return null;
    }
  }

  /**
   * Get all flows from FlowEngineService (with caching)
   */
  private async getFlows(): Promise<Flow[]> {
    try {
      // Check cache
      const now = Date.now();
      if (this.flowCacheExpiry > now && this.flowCache.size > 0) {
        return Array.from(this.flowCache.values());
      }

      // Fetch from LOCAL FlowEngineService (NEW approach - no admin backend needed)
      this.logger.log('📥 Fetching flows from LOCAL Flow Engine...');
      const rawFlows = await this.flowEngineService.getAllFlows();
      this.logger.log(`📦 Received ${rawFlows.length} flows from Flow Engine`);
      
      // Normalize all flows (convert to step-based format)
      const flows = rawFlows
        .map(flow => this.normalizeFlowFromEngine(flow))
        .filter(flow => flow.enabled !== false); // Only include active flows
      
      // Update cache
      this.flowCache.clear();
      flows.forEach(flow => this.flowCache.set(flow.id, flow));
      this.flowCacheExpiry = now + this.CACHE_TTL;

      this.logger.log(`✅ Loaded ${flows.length} flows (${rawFlows.length - flows.length} inactive) from Flow Engine`);
      return flows;
    } catch (error) {
      this.logger.error('Error fetching flows from Flow Engine:', error.message || error);
      this.logger.error('Error details:', error.stack);
      return [];
    }
  }

  /**
   * Normalize flow from FlowEngineService format to AgentOrchestrator format
   */
  private normalizeFlowFromEngine(engineFlow: any): Flow {
    // FlowEngine stores states as an object/dictionary, not an array
    // Convert states object to steps array
    const steps: FlowStep[] = [];
    
    if (engineFlow.states && typeof engineFlow.states === 'object') {
      // Iterate over state keys (init, collect_pickup, etc.)
      for (const [stateId, state] of Object.entries(engineFlow.states)) {
        const stateObj = state as any;
        
        // Extract executor from first action if available
        const executor = stateObj.actions?.[0]?.executor || stateObj.type || 'unknown';
        const config = stateObj.actions?.[0]?.config || {};
        
        // Convert transitions object to conditions array
        const conditions = stateObj.transitions ? 
          Object.entries(stateObj.transitions).map(([condition, target]) => ({
            condition,
            nextStepId: target as string
          })) : [];
        
        steps.push({
          id: stateId,
          type: executor,
          config,
          next: conditions[0]?.nextStepId, // Default transition
          conditions
        });
      }
    }

    return {
      id: engineFlow.id,
      name: engineFlow.name,
      description: engineFlow.description,
      steps,
      enabled: engineFlow.enabled !== false,
      trigger: engineFlow.trigger,
      module: engineFlow.module
    };
  }

  /**
   * Execute a flow
   */
  private async executeFlow(flow: Flow, context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🔄 Executing flow: ${flow.name} (${flow.steps.length} steps)`);

      // Get flow execution context from session
      let flowContext = context.session?.data?.flowContext as FlowExecutionContext;

      if (!flowContext || flowContext.flowId !== flow.id) {
        // Initialize new flow context
        flowContext = {
          phoneNumber: context.phoneNumber,
          sessionId: context.session?.phoneNumber || context.phoneNumber,
          collectedData: {},
          currentStepId: flow.steps[0]?.id || '',
          flowId: flow.id,
        };
      }

      // Execute current step
      const currentStep = flow.steps.find(s => s.id === flowContext.currentStepId);

      if (!currentStep) {
        this.logger.error(`Step not found: ${flowContext.currentStepId}`);
        return {
          response: 'I encountered an error processing your request. Please try again.',
          executionTime: Date.now() - startTime,
        };
      }

      const stepResult = await this.executeFlowStep(currentStep, context, flowContext);

      // Track step attempts for loop detection
      if (!stepResult.complete) {
        // Step failed - increment attempt counter
        if (!flowContext.stepAttempts) {
          flowContext.stepAttempts = {};
        }
        flowContext.stepAttempts[currentStep.id] = (flowContext.stepAttempts[currentStep.id] || 0) + 1;
        
        this.logger.warn(`⚠️ Step ${currentStep.id} failed (attempt ${flowContext.stepAttempts[currentStep.id]})`);
      } else if (stepResult.complete && currentStep.next) {
        // Step succeeded - reset attempt counter for this step
        if (flowContext.stepAttempts) {
          delete flowContext.stepAttempts[currentStep.id];
        }
      }

      // Update flow context
      if (stepResult.data) {
        flowContext.collectedData = {
          ...flowContext.collectedData,
          ...stepResult.data,
        };
      }

      // Move to next step if needed
      if (stepResult.complete && currentStep.next) {
        flowContext.currentStepId = currentStep.next;
        
        // If step returned empty response, auto-continue to next step
        if (!stepResult.response || stepResult.response.trim() === '') {
          this.logger.log(`⏭️ Auto-continuing to next step: ${currentStep.next}`);
          
          // Save intermediate state
          await this.sessionService.saveSession(context.phoneNumber, {
            data: {
              ...context.session?.data,
              flowContext,
            },
          });
          
          // Find next step and execute it (don't restart flow)
          const nextStep = flow.steps.find(s => s.id === currentStep.next);
          if (nextStep) {
            const nextResult = await this.executeFlowStep(nextStep, context, flowContext);
            
            // Update flow context with new data
            if (nextResult.data) {
              flowContext.collectedData = {
                ...flowContext.collectedData,
                ...nextResult.data,
              };
            }
            
            // If next step also has no response, continue the loop
            if (nextResult.complete && nextStep.next && (!nextResult.response || nextResult.response.trim() === '')) {
              flowContext.currentStepId = nextStep.next;
              await this.sessionService.saveSession(context.phoneNumber, {
                data: { ...context.session?.data, flowContext },
              });
              
              // Continue auto-continuing (recursive)
              return this.executeFlow(flow, context);
            }
            
            // Save final state
            await this.sessionService.saveSession(context.phoneNumber, {
              data: { ...context.session?.data, flowContext },
            });
            
            return {
              response: nextResult.response,
              executionTime: Date.now() - startTime,
            };
          }
        }
      } else if (stepResult.complete && !currentStep.next) {
        // Flow complete
        this.logger.log(`✅ Flow completed: ${flow.name}`);
        
        // Clear flow context
        await this.sessionService.saveSession(context.phoneNumber, {
          data: {
            ...context.session?.data,
            flowContext: null,
          },
        });

        return {
          response: stepResult.response || 'Request completed successfully.',
          executionTime: Date.now() - startTime,
        };
      }

      // Save updated flow context
      await this.sessionService.saveSession(context.phoneNumber, {
        data: {
          ...context.session?.data,
          flowContext,
        },
      });

      return {
        response: stepResult.response,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Error executing flow:', error);
      return {
        response: 'I encountered an error processing your request. Please try again.',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a single flow step
   */
  private async executeFlowStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    this.logger.log(`📋 Executing step: ${step.id} (type: ${step.type})`);

    switch (step.type) {
      case 'nlu':
        return this.executeNluStep(step, context, flowContext);
      
      case 'collect_data':
        return this.executeCollectDataStep(step, context, flowContext);
      
      case 'tool':
        return this.executeToolStep(step, context, flowContext);
      
      case 'validate':
      case 'validate_zone':
        return this.executeValidateZoneStep(step, context, flowContext);
      
      case 'calculate':
      case 'calculate_distance':
        return this.executeCalculateDistanceStep(step, context, flowContext);
      
      case 'calculate_charges':
        return this.executeCalculateChargesStep(step, context, flowContext);
      
      case 'llm':
        return this.executeLlmStep(step, context, flowContext);
      
      case 'api_call':
        return this.executeApiCallStep(step, context, flowContext);
      
      case 'respond':
        return this.executeRespondStep(step, context, flowContext);
      
      case 'condition':
      case 'decision':
        return this.executeConditionStep(step, context, flowContext);
      
      case 'game':
      case 'gamification':
        return this.executeGameStep(step, context, flowContext);
      
      case 'pricing':
        return this.executePricingStep(step, context, flowContext);
      
      default:
        this.logger.warn(`Unknown step type: ${step.type}`);
        return {
          response: 'I encountered an unknown step type. Please type "reset" to start over.',
          complete: true,
        };
    }
  }

  /**
   * Execute NLU step - Extract entities and intents
   */
  private async executeNluStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    this.logger.log(`🧠 NLU Step: Analyzing message "${context.message}"`);
    
    // Extract entities from message (locations, dates, times, etc.)
    const entities = context.entities || {};
    
    // Store NLU results in flow context
    return {
      response: '',
      complete: true,
      data: {
        nlu_intent: context.intent || 'unknown',
        nlu_entities: entities,
        nlu_confidence: context.confidence || 0,
      },
    };
  }

  /**
   * Execute Tool step - Call external tools/services
   */
  private async executeToolStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const toolName = step.config.tool as string;
    
    this.logger.log(`🔧 Tool Step: ${toolName}`);
    
    // Handle different tool types
    switch (toolName) {
      case 'collect_address':
        return this.executeCollectAddressStep(step, context, flowContext);
      
      case 'validate_zone':
        return this.executeValidateZoneStep(step, context, flowContext);
      
      case 'calculate_distance':
        return this.executeCalculateDistanceStep(step, context, flowContext);
      
      case 'calculate_charges':
        return this.executeCalculateChargesStep(step, context, flowContext);
      
      case 'collect_data':
        return this.executeCollectDataStep(step, context, flowContext);
      
      case 'create_order_php_backend':
      case 'api_call':
        return this.executeApiCallStep(step, context, flowContext);
      
      default:
        this.logger.warn(`Unknown tool: ${toolName}`);
        return {
          response: 'I encountered an unknown tool. Please type "reset" to start over.',
          complete: true,
        };
    }
  }

  /**
   * Execute LLM step - Generate AI responses
   */
  private async executeLlmStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const prompt = step.config.prompt as string;
    
    this.logger.log(`🤖 LLM Step: Generating response with actual LLM`);
    
    // Replace template variables in prompt
    let processedPrompt = prompt || 'Please provide a helpful response based on the context.';
    for (const [key, value] of Object.entries(flowContext.collectedData)) {
      processedPrompt = processedPrompt.replace(`{{${key}}}`, String(value));
    }

    // 🧠 ENHANCED CONTEXT: Inject User & Business Context
    const userName = context.session?.data?.user_name || 'User';
    const platform = context.session?.data?.platform || 'Web';
    const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const isAuthenticated = !!context.session?.data?.authenticated;
    const authToken = context.session?.data?.auth_token;

    // Fetch Wallet & Orders if authenticated
    let walletBalance = 'Unknown';
    let recentOrders = 'None';

    if (isAuthenticated && authToken) {
      try {
        // Fetch wallet
        const wallet = await this.phpAuthService.getWalletBalance(authToken);
        walletBalance = `₹${wallet}`;

        // Fetch recent orders (last 3)
        const orders = await this.phpOrderService.getOrders(authToken, 3);
        if (orders && orders.length > 0) {
          recentOrders = orders.map(o => 
            `#${o.id} (${o.orderStatus}) - ₹${o.orderAmount}`
          ).join(', ');
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch user details for LLM context: ${err.message}`);
      }
    }

    const defaultSystemPrompt = `You are Mangwale AI, the smart assistant for the Mangwale hyperlocal delivery platform in Nashik.

User Context:
- Name: {{userName}}
- Platform: {{platform}}
- Time: {{time}}
- Authenticated: {{isAuthenticated}}
- Wallet Balance: {{walletBalance}}
- Recent Orders: {{recentOrders}}

Business Context:
- Services: Food Delivery, Parcel/Courier, E-commerce, Local Services.
- Location: Nashik, India.

Guidelines:
- Be concise, direct, and helpful. Avoid long paragraphs.
- If the user is logged in, occasionally address them by name (e.g., "Sure, {{userName}}").
- If the user asks about services, briefly list them.
- Tone: Professional, friendly, and efficient.
- Do not hallucinate services we don't offer.`;

    // Fetch dynamic system prompt from settings (or use default)
    let systemPrompt = await this.settingsService.getSetting('system-prompt', defaultSystemPrompt);
    
    // ===== PERSONA INTEGRATION: Inject character personality =====
    const activePersona = await this.settingsService.getSetting('active_chatbot_persona', 'chotu');
    if (activePersona && activePersona !== 'none') {
      try {
        const personaPrompt = await this.voiceCharactersService.generateSystemPromptForCharacter(activePersona);
        if (personaPrompt) {
          // Prepend persona to system prompt
          systemPrompt = `${personaPrompt}

---

${systemPrompt}`;
          this.logger.log(`✅ Persona "${activePersona}" injected into system prompt`);
        }
      } catch (error) {
        this.logger.warn(`⚠️  Failed to load persona "${activePersona}": ${error.message}`);
      }
    }

    // Replace placeholders
    systemPrompt = systemPrompt
      .replace(/{{userName}}/g, isAuthenticated ? userName : 'Guest')
      .replace(/{{platform}}/g, platform)
      .replace(/{{time}}/g, currentTime)
      .replace(/{{isAuthenticated}}/g, isAuthenticated ? 'Yes' : 'No')
      .replace(/{{walletBalance}}/g, walletBalance)
      .replace(/{{recentOrders}}/g, recentOrders);
    
    try {
      // Call Admin Backend LLM endpoint
      const response = await firstValueFrom(
        this.httpService.post(`${this.adminBackendUrl}/ai/chat`, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context.message },
            { role: 'assistant', content: processedPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        })
      );
      
      const llmResponse = response.data.content || 'I have processed your request.';
      
      this.logger.log(`✅ LLM generated response: ${llmResponse.substring(0, 100)}...`);
      
      return {
        response: llmResponse,
        complete: true,
        data: {
          llm_response: llmResponse,
          llm_usage: response.data.usage,
        },
      };
    } catch (error) {
      this.logger.error(`❌ LLM call failed:`, error.message);
      
      // Fallback to simple response
      return {
        response: 'I have processed your request. Please confirm to proceed.',
        complete: true,
        data: {
          llm_response: 'Fallback response (LLM unavailable)',
        },
      };
    }
  }

  /**
   * Execute collect_address step
   */
  private async executeCollectAddressStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const field = step.config.field as string;
    const message = step.config.message as string;
    
    this.logger.log(`📍 Collect Address Step: ${field}`);

    // Check if we already have this address
    if (flowContext.collectedData[field]) {
      return {
        response: '',
        complete: true,
      };
    }

    // ===== NEW: Check for saved addresses and offer them =====
    const session = await this.sessionService.getSession(context.phoneNumber);
    const userId = session?.data?.user_id;
    const authToken = session?.data?.auth_token;
    
    // If user is NOT authenticated, show normal prompt with inline login button
    if (!userId && !flowContext.collectedData[`${field}_login_offered`]) {
      flowContext.collectedData[`${field}_login_offered`] = true;
      
      const locationLabel = field === 'sender_address' ? 'pickup' : 'delivery';
      
      return {
        response: `📍 *${locationLabel.charAt(0).toUpperCase() + locationLabel.slice(1)} Location*\n\nPlease share your ${locationLabel} location:\n\n[BUTTON:📍 Share Location:__LOCATION__]\n\nOr you can:\n• Type the address\n• Send a Google Maps link\n\n💡 *Want to use saved addresses?*\n\n[BUTTON:🔐 Login to Use Saved Addresses:__LOGIN__]`,
        complete: false,
      };
    }
    
    // If user is authenticated and hasn't been offered saved addresses yet for this field
    if (userId && authToken && !flowContext.collectedData[`${field}_offered_saved`]) {
      try {
        this.logger.log(`👤 Fetching saved addresses for user ${userId}`);
        const savedAddresses = await this.phpAddressService.getAddresses(authToken);
        
        if (savedAddresses && savedAddresses.length > 0) {
          this.logger.log(`📍 Found ${savedAddresses.length} saved addresses`);
          
          const locationLabel = field === 'sender_address' ? 'pickup' : 'delivery';
          
          // Mark that we've offered saved addresses for this field
          flowContext.collectedData[`${field}_offered_saved`] = true;
          
          // Build response with saved addresses
          let response = `I found ${savedAddresses.length} saved address${savedAddresses.length > 1 ? 'es' : ''} for ${locationLabel}:\n\n`;
          
          savedAddresses.forEach((addr, idx) => {
            const emoji = this.phpAddressService.getAddressTypeEmoji(addr.addressType);
            const shortAddr = addr.address?.substring(0, 50) || 'Address';
            response += `${idx + 1}. ${emoji} ${addr.addressType || 'Address'}: ${shortAddr}${addr.address && addr.address.length > 50 ? '...' : ''}\n`;
          });
          
          response += `\nReply with the number (1, 2, etc.) to use a saved address, or:\n`;
          response += `• Share your current location 📍\n`;
          response += `• Type a new address\n`;
          response += `• Send a Google Maps link`;
          
          // Store saved addresses temporarily in flow context for selection
          flowContext.collectedData[`${field}_saved_options`] = savedAddresses;
          
          return {
            response,
            complete: false,
          };
        } else {
          this.logger.log(`📍 No saved addresses found for user ${userId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to fetch saved addresses: ${error.message}`);
        // Continue with normal address collection
      }
    }
    
    // ===== Check if user selected a saved address by number =====
    const savedOptions = flowContext.collectedData[`${field}_saved_options`] as any[];
    if (savedOptions && savedOptions.length > 0) {
      const selectionMatch = context.message.match(/^(\d+)$/);
      if (selectionMatch) {
        const selection = parseInt(selectionMatch[1]);
        if (selection >= 1 && selection <= savedOptions.length) {
          const selectedAddr = savedOptions[selection - 1];
          this.logger.log(`✅ User selected saved address #${selection}: ${selectedAddr.addressType}`);
          
          const locationLabel = field === 'sender_address' ? 'Pickup' : 'Delivery';
          const emoji = this.phpAddressService.getAddressTypeEmoji(selectedAddr.addressType);
          
          // Extract and validate coordinates
          const latitude = selectedAddr.latitude 
            ? parseFloat(String(selectedAddr.latitude)) 
            : null;
          const longitude = selectedAddr.longitude 
            ? parseFloat(String(selectedAddr.longitude)) 
            : null;
          
          this.logger.debug(`🔍 Selected address: ID=${selectedAddr.id}, lat=${latitude}, lng=${longitude}`);
          
          // Validate coordinates exist
          if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            this.logger.error(`❌ Address ${selectedAddr.id} missing valid coordinates! lat=${selectedAddr.latitude}, lng=${selectedAddr.longitude}`);
            return {
              response: `⚠️ The selected address doesn't have valid location coordinates.\n\nPlease:\n• Share a new location 📍\n• Send a Google Maps link\n• Type a complete address`,
              complete: false,
            };
          }
          
          // Clear the saved options since user made a selection
          delete flowContext.collectedData[`${field}_saved_options`];
          delete flowContext.collectedData[`${field}_offered_saved`];
          
          // Determine zone field name
          const zoneField = field === 'sender_address' ? 'sender_zone_id' : 'receiver_zone_id';

          return {
            response: `✅ ${emoji} Using your ${selectedAddr.addressType} address for ${locationLabel.toLowerCase()}:\n${selectedAddr.address}\n📍 Location confirmed`,
            complete: true,
            data: {
              [field]: {
                address: selectedAddr.address,
                latitude: latitude,
                longitude: longitude,
                contact_person_name: selectedAddr.contactPersonName || '',
                contact_person_number: selectedAddr.contactPersonNumber || '',
                address_id: selectedAddr.id,
                address_type: selectedAddr.addressType,
                landmark: selectedAddr.landmark || '',
                road: selectedAddr.road || '',
                house: selectedAddr.house || '',
                floor: selectedAddr.floor || '',
                source: 'saved_address',
              },
              [zoneField]: selectedAddr.zoneId || 4, // Capture zone ID from saved address
            },
          };
        }
      }
    }
    // ===== END SAVED ADDRESS LOGIC =====

    // ===== SMART DEFAULT: Check if user shared location recently (e.g. at greeting) =====
    if (session?.data?.location && session.data.lastLocationUpdate) {
      const locationAge = Date.now() - session.data.lastLocationUpdate;
      
      // If location was shared in last 1 hour, use it as smart default
      // But ONLY if we haven't already offered it or used it
      // And ONLY for Pickup (sender) or Food Delivery (delivery), NOT for Parcel Receiver
      const isPickupOrFood = field === 'sender_address' || field === 'delivery_address';
      
      if (locationAge < 3600000 && isPickupOrFood && !flowContext.collectedData[`${field}_smart_default_used`]) {
        const { lat, lng } = session.data.location;
        
        this.logger.log(`📍 Using SMART DEFAULT location for ${field}: (${lat}, ${lng})`);
        
        const locationLabel = field === 'sender_address' ? 'Pickup' : 'Delivery';
        
        // Mark as used so we don't loop if user rejects it later (though we'd need a way to reject)
        flowContext.collectedData[`${field}_smart_default_used`] = true;
        
        const addressData = {
          address: "Current Location (Smart Default)",
          latitude: lat,
          longitude: lng,
          source: 'smart_default',
        };
        
        // Save address asynchronously
        this.saveNewAddressAsync(session, field, addressData, flowContext).catch(err => {
          this.logger.error(`Background address save failed: ${err.message}`);
        });
        
        // Determine zone field name
        const zoneField = field === 'sender_address' ? 'sender_zone_id' : 'receiver_zone_id';
        
        // We need to validate zone for this smart default
        try {
           const zoneInfo = await this.phpParcelService.getZoneByLocation(lat, lng);
           if (zoneInfo && zoneInfo.primaryZoneId) {
             return {
                response: `✅ Using your current location for ${locationLabel}.\n📍 ${zoneInfo.zoneData?.[0]?.name || 'Nashik'}\n\n(Type "change" to use a different address)`,
                complete: true,
                data: {
                  [field]: addressData,
                  [zoneField]: zoneInfo.primaryZoneId,
                },
             };
           }
        } catch (e) {
           // If zone check fails, fall through to normal collection
           this.logger.warn(`Smart default zone check failed: ${e.message}`);
        }
      }
    }
    // ===== END SMART DEFAULT =====

    // ===== FIX: Check if user just shared their location (Real-time update) =====
    if (session?.data?.location && session.data.lastLocationUpdate) {
      const locationAge = Date.now() - session.data.lastLocationUpdate;
      
      // If location was shared in last 60 seconds (Real-time), use it
      if (locationAge < 60000) {
        const { lat, lng } = session.data.location;
        
        this.logger.log(`📍 Using shared location for ${field}: (${lat}, ${lng})`);
        
        const locationLabel = field === 'sender_address' ? 'Pickup' : 'Delivery';
        
        // Extract address text from message if it contains location info
        let addressText = context.message;
        if (context.message.includes('📍 Location shared:')) {
          addressText = context.message.replace('📍 Location shared:', '').trim();
        }
        
        const addressData = {
          address: addressText,
          latitude: lat,
          longitude: lng,
          source: 'location_share',
        };
        
        // Save address asynchronously (non-blocking)
        this.saveNewAddressAsync(session, field, addressData, flowContext).catch(err => {
          this.logger.error(`Background address save failed: ${err.message}`);
        });
        
        return {
          response: `✅ Got it! ${locationLabel} location received at:\n${addressText}`,
          complete: true,
          data: {
            [field]: addressData,
          },
        };
      }
    }
    // ===== END FIX =====

    // ===== NEW: Use AddressExtractionService for intelligent address extraction =====
    this.logger.log(`🔍 Attempting to extract address from user message`);
    
    // Skip extraction for intent/instruction messages
    const intentWords = /\b(want|send|parcel|package|courier|deliver|need|please|can you|help me|i am|let me|reset|hi|hello|hey)\b/i;
    if (!context.message || context.message.length < 5 || intentWords.test(context.message.toLowerCase())) {
      const locationLabel = field === 'sender_address' ? 'pickup' : 'delivery';
      return {
        response: `Please share your ${locationLabel} address:\n\n[BUTTON:📍 Share Location:__LOCATION__]\n\nOr:\n• Type complete address\n• Send Google Maps link\n• Enter coordinates (lat, lng)`,
        complete: false
      };
    }

    // Try to extract address using the service
    const extractionResult = await this.addressExtractionService.extractAddress(
      context.message,
      {
        city: 'Nashik', // Could be extracted from session/user profile
        userLocation: session?.data?.location,
      }
    );

    if (extractionResult.success && extractionResult.address) {
      const addr = extractionResult.address;
      const locationLabel = field === 'sender_address' ? 'Pickup' : 'Delivery';
      
      this.logger.log(`✅ Address extracted via ${addr.source}: lat=${addr.latitude}, lng=${addr.longitude}`);
      
      // Validate coordinates if present
      if (addr.latitude && addr.longitude) {
        // Validate service area
        const zoneValidation = await this.addressExtractionService.validateServiceableArea(
          addr.latitude,
          addr.longitude
        );
        
        if (!zoneValidation.valid) {
          return {
            response: `❌ ${zoneValidation.error}\n\nWe currently serve only in specific areas. Please provide a different address.`,
            complete: false
          };
        }
        
        // Save address asynchronously (non-blocking)
        const addressData = {
          address: addr.address,
          latitude: addr.latitude,
          longitude: addr.longitude,
          source: addr.source,
          ...addr.metadata,
        };
        
        this.saveNewAddressAsync(session, field, addressData, flowContext).catch(err => {
          this.logger.error(`Background address save failed: ${err.message}`);
        });
        
        // Determine zone field name
        const zoneField = field === 'sender_address' ? 'sender_zone_id' : 'receiver_zone_id';

        return {
          response: `✅ ${locationLabel} location confirmed:\n📍 ${addr.address}\n${zoneValidation.zoneName ? `Zone: ${zoneValidation.zoneName}` : ''}`,
          complete: true,
          data: {
            [field]: addressData,
            [zoneField]: zoneValidation.zoneId || 4, // Capture zone ID from validation
          }
        };
      } else {
        // Address extracted but no coordinates - needs geocoding
        this.logger.warn(`⚠️ Address extracted but missing coordinates: ${addr.address}`);
        return {
          response: `Got the address: "${addr.address}"\n\nBut I need the exact location. Please:\n• Share your location 📍\n• Send a Google Maps link`,
          complete: false
        };
      }
    }

    // Extraction failed - check if LLM needs clarification
    if (extractionResult.needsMoreInfo && extractionResult.clarificationPrompt) {
      return {
        response: extractionResult.clarificationPrompt,
        complete: false
      };
    }

    // All extraction methods failed
    const locationLabel = field === 'sender_address' ? 'pickup' : 'delivery';
    return {
      response: `I couldn't understand that address. Please share your ${locationLabel} location:\n\n[BUTTON:📍 Share Location:__LOCATION__]\n\nOr:\n• Type complete address (e.g., "123 MG Road, Nashik")\n• Send Google Maps link\n• Enter coordinates (19.0760, 72.8777)`,
      complete: false
    };
  }

  /**
   * Execute collect_data step
   */
  private async executeCollectDataStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const field = step.config.field as string;
    const fields = step.config.fields as string[];
    const message = step.config.message as string;

    // Handle multiple fields case (for steps like parcel details)
    if (fields && fields.length > 0) {
      // Check if all fields are already collected
      const allCollected = fields.every(f => flowContext.collectedData[f]);
      
      if (allCollected) {
        return {
          response: '',
          complete: true,
        };
      }

      // Special handling for parcel details step with category selection
      if (fields.includes('parcel_category') && !flowContext.collectedData['parcel_category_id']) {
        const trimmedMsg = context.message.trim();
        const categoryNum = parseInt(trimmedMsg);
        const availableCategories = flowContext.collectedData['_available_categories'] as any[];

        // Check if user is selecting from already-shown categories
        if (availableCategories && !isNaN(categoryNum) && categoryNum > 0 && categoryNum <= availableCategories.length) {
          const selectedCategory = availableCategories[categoryNum - 1];
          
          this.logger.log(`✅ User selected category: ${selectedCategory.name} (ID: ${selectedCategory.id})`);
          
          return {
            response: `Great! You've selected *${selectedCategory.name}*.\n\n💰 Charges: ₹${selectedCategory.parcel_per_km_shipping_charge}/km (Minimum: ₹${selectedCategory.parcel_minimum_shipping_charge})\n\nNow please tell me about your parcel:\n1. Type (documents/electronics/food/etc)\n2. Approximate weight`,
            complete: false,
            data: {
              parcel_category_id: selectedCategory.id,
              parcel_category_name: selectedCategory.name,
              per_km_charge: parseFloat(selectedCategory.parcel_per_km_shipping_charge),
              minimum_charge: parseFloat(selectedCategory.parcel_minimum_shipping_charge),
            },
          };
        }

        // First time showing categories (no categories in context yet)
        if (!availableCategories) {
          const { response: categoryResponse, categories } = await this.showParcelCategories(flowContext);
          
          if (categories.length === 0) {
            return { response: categoryResponse, complete: false };
          }

          // Store categories in flow context for later reference
          flowContext.collectedData['_available_categories'] = categories;
          
          return {
            response: categoryResponse,
            complete: false,
          };
        }

        // Categories shown but invalid selection - ask again
        return {
          response: `Please select a category by typing the number (1-${availableCategories.length})`,
          complete: false,
        };
      }

      // If category already selected, collect other details
      if (flowContext.collectedData['parcel_category_id']) {
        // Try to extract parcel type and weight from message
        const lowerMsg = context.message.toLowerCase();
        const userInput = context.message.trim();
        
        // Simple extraction patterns (can be improved with LLM later)
        let parcelType = flowContext.collectedData['parcel_type'] as string;
        let parcelWeight = flowContext.collectedData['parcel_weight'] as string;

        if (!parcelType) {
          // Check for common parcel types
          if (lowerMsg.includes('document') || lowerMsg.includes('paper')) parcelType = 'documents';
          else if (lowerMsg.includes('electronic') || lowerMsg.includes('phone') || lowerMsg.includes('laptop')) parcelType = 'electronics';
          else if (lowerMsg.includes('food') || lowerMsg.includes('meal')) parcelType = 'food';
          else if (lowerMsg.includes('cloth') || lowerMsg.includes('dress')) parcelType = 'clothing';
          else if (lowerMsg.includes('cake') || lowerMsg.includes('gift')) parcelType = 'gift';
          else parcelType = userInput; // Use raw input as fallback
        }

        if (!parcelWeight) {
          // Extract weight patterns: "5kg", "2 kg", "500g", etc.
          const weightMatch = lowerMsg.match(/(\d+(?:\.\d+)?)\s*(kg|grams?|g)/i);
          if (weightMatch) {
            parcelWeight = weightMatch[0];
          }
        }

        // If we have both, complete the step
        if (parcelType && parcelWeight) {
          return {
            response: `Perfect! 📦\n\n*Parcel Details:*\n• Type: ${parcelType}\n• Weight: ${parcelWeight}\n• Category: ${flowContext.collectedData['parcel_category_name']}`,
            complete: true,
            data: {
              parcel_type: parcelType,
              parcel_weight: parcelWeight,
            },
          };
        }

        // Still need more info
        const needed = [];
        if (!parcelType) needed.push('type (documents/electronics/food/etc)');
        if (!parcelWeight) needed.push('weight (e.g., 2kg, 500g)');

        return {
          response: `Please provide:\n${needed.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
          complete: false,
        };
      }

      // For other multi-field collections, just show the message
      return {
        response: message || `Please provide: ${fields.join(', ')}`,
        complete: false,
      };
    }

    // Special handling for payment method selection
    if (field === 'payment_method') {
      const availableMethods = flowContext.collectedData['_available_payment_methods'] as any[];
      const userInput = context.message.trim();
      const selectionNum = parseInt(userInput);

      // Check if user is selecting from already-shown methods
      if (availableMethods && !isNaN(selectionNum) && selectionNum > 0 && selectionNum <= availableMethods.length) {
        const selectedMethod = availableMethods[selectionNum - 1];
        
        this.logger.log(`✅ User selected payment method: ${selectedMethod.name} (${selectedMethod.id})`);
        
        return {
          response: `Payment method set to *${selectedMethod.name}*.`,
          complete: true,
          data: {
            payment_method: selectedMethod.id,
            payment_method_name: selectedMethod.name,
          },
        };
      }

      // First time showing methods (no methods in context yet)
      if (!availableMethods) {
        // Get zone ID if available (prefer sender zone)
        const senderZoneId = Number(flowContext.collectedData.sender_zone_id);
        const zoneId = !isNaN(senderZoneId) && senderZoneId > 0 ? senderZoneId : undefined;
        
        // Get module ID (default to 3 for parcel)
        const moduleId = 3; 

        this.logger.log(`💳 Fetching payment methods (Module: ${moduleId}, Zone: ${zoneId || 'Default'})...`);
        const result = await this.phpPaymentService.getPaymentMethods(moduleId, zoneId);
        
        const methods = result.methods || [];
        const activeMethods = methods.filter(m => m.enabled);
        
        if (activeMethods.length === 0) {
           // Fallback
           return {
             response: '⚠️ No payment methods available. Defaulting to Cash on Delivery.',
             complete: true,
             data: { payment_method: 'cash_on_delivery' }
           };
        }

        // Store methods in flow context
        flowContext.collectedData['_available_payment_methods'] = activeMethods;
        
        // Build response
        let response = message || '💳 *Select Payment Method*\n\n';
        activeMethods.forEach((m, i) => {
          response += `${i + 1}. ${m.name}\n`;
        });
        response += '\nReply with the number of your choice.';
        
        return {
          response,
          complete: false,
        };
      }

      // Methods shown but invalid selection
      return {
        response: `Please select a payment method by typing the number (1-${availableMethods.length})`,
        complete: false,
      };
    }

    // Single field handling
    if (!field) {
      this.logger.error('❌ collect_data step missing both field and fields config');
      return {
        response: 'Configuration error: missing field specification',
        complete: false,
      };
    }

    // Check if we already have this field
    if (flowContext.collectedData[field]) {
      return {
        response: '',
        complete: true,
      };
    }

    // Check if user provided data in current message
    const extractedData = this.extractDataFromMessage(context.message, field);

    if (extractedData) {
      return {
        response: `Got it! ${field} saved.`,
        complete: true,
        data: { [field]: extractedData },
      };
    }

    // Ask user for data
    return {
      response: message || `Please provide ${field}`,
      complete: false,
    };
  }

  /**
   * Execute validate_zone step
   */
  private async executeValidateZoneStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const addressField = step.config.addressField as string;
    const errorMessage = step.config.errorMessage as string;

    const address = flowContext.collectedData[addressField] as any;

    if (!address) {
      return {
        response: `I need a valid ${addressField === 'sender_address' ? 'pickup' : 'delivery'} address. You can:\n• Share your current location 📍\n• Type the address\n• Send a Google Maps link`,
        complete: false,
      };
    }

    // Skip coordinate validation for Google Maps links
    if (address.source === 'google_maps_link') {
      this.logger.log(`✅ Zone validation skipped for Google Maps link (${addressField})`);
      return {
        response: '',
        complete: true,
      };
    }

    // For regular addresses, validate coordinates exist
    if (!address.latitude || !address.longitude) {
      const locationLabel = addressField === 'sender_address' ? 'pickup' : 'delivery';
      return {
        response: `I couldn't validate the ${locationLabel} address. Please share:\n• Your current location 📍\n• A complete address with area/landmark\n• A Google Maps link\n\nType "hello" to start over.`,
        complete: false,
      };
    }

    // Perform actual zone validation via PHP backend
    try {
      this.logger.log(`🔍 Validating zone for ${addressField} at (${address.latitude}, ${address.longitude})`);
      
      const zoneInfo = await this.phpParcelService.getZoneByLocation(
        parseFloat(address.latitude), 
        parseFloat(address.longitude)
      );

      if (!zoneInfo || !zoneInfo.zoneIds || zoneInfo.zoneIds.length === 0) {
        return {
          response: `⚠️ Sorry, we don't serve this area yet.\n\nPlease provide a location within Nashik city limits.`,
          complete: false,
        };
      }

      const primaryZoneId = zoneInfo.primaryZoneId;
      const zoneName = zoneInfo.zoneData?.[0]?.name || 'Nashik';
      
      this.logger.log(`✅ Zone validated: ${zoneName} (ID: ${primaryZoneId})`);

      // Determine zone field name
      const zoneField = addressField === 'sender_address' ? 'sender_zone_id' : 'receiver_zone_id';

      return {
        response: '',
        complete: true,
        data: {
          [zoneField]: primaryZoneId,
          [`${addressField}_zone_name`]: zoneName
        }
      };
    } catch (error) {
      this.logger.error(`❌ Zone validation failed: ${error.message}`);
      // If validation fails (API error), we might want to allow it but warn, or block.
      // For now, blocking to ensure pricing accuracy.
      return {
        response: `⚠️ Unable to verify service availability for this location. Please try again or share a different location.`,
        complete: false,
      };
    }
  }

  /**
   * Execute calculate_distance step
   */
  private async executeCalculateDistanceStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const fromField = step.config.from as string;
    const toField = step.config.to as string;

    const fromAddress = flowContext.collectedData[fromField] as any;
    const toAddress = flowContext.collectedData[toField] as any;

    if (!fromAddress || !toAddress) {
      return {
        response: 'Missing address data for distance calculation.',
        complete: false,
      };
    }

    try {
      // Extract coordinates
      const fromLat = fromAddress.latitude;
      const fromLng = fromAddress.longitude;
      const toLat = toAddress.latitude;
      const toLng = toAddress.longitude;

      // DEBUG: Log address data
      this.logger.debug(`🔍 Distance calc - From: ${JSON.stringify(fromAddress)}`);
      this.logger.debug(`🔍 Distance calc - To: ${JSON.stringify(toAddress)}`);
      this.logger.debug(`🔍 Coords - From: (${fromLat}, ${fromLng}), To: (${toLat}, ${toLng})`);

      if (!fromLat || !fromLng || !toLat || !toLng) {
        this.logger.error('❌ Missing coordinates for distance calculation');
        return {
          response: 'Unable to calculate distance. Missing location coordinates.',
          complete: false,
        };
      }

      // Use PhpParcelService which integrates OSRM for real distance calculation
      this.logger.log(`📏 Calculating distance via OSRM: (${fromLat}, ${fromLng}) → (${toLat}, ${toLng})`);
      const distance = await this.phpParcelService.calculateDistance(fromLat, fromLng, toLat, toLng);
      
      this.logger.log(`✅ Distance calculated: ${distance} km`);

      return {
        response: '',
        complete: true,
        data: { distance },
      };
    } catch (error) {
      this.logger.error(`❌ Distance calculation failed: ${error.message}`);
      // Fallback to approximate distance
      return {
        response: '',
        complete: true,
        data: { distance: 5.0 }, // Fallback
      };
    }
  }

  /**
   * Fetch and show parcel categories for selection
   */
  private async showParcelCategories(
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; categories: any[] }> {
    try {
      // Get zone ID if available (prefer sender zone)
      const senderZoneId = Number(flowContext.collectedData.sender_zone_id);
      const zoneId = !isNaN(senderZoneId) && senderZoneId > 0 ? senderZoneId : undefined;

      this.logger.log(`📦 Fetching parcel categories from PHP backend (Zone: ${zoneId || 'Default'})...`);
      
      const categories = await this.phpParcelService.getParcelCategories(undefined, zoneId);
      
      // Filter only active categories
      const activeCategories = categories.filter(cat => cat.status === 1);
      
      if (activeCategories.length === 0) {
        return {
          response: '⚠️ No parcel categories available at the moment. Please try again later.',
          categories: [],
        };
      }

      // Build response with category options
      let response = '📦 *Select Parcel Category*\n\nPlease choose the delivery type:\n\n';
      
      activeCategories.forEach((cat, index) => {
        const perKm = parseFloat(cat.parcel_per_km_shipping_charge || 0);
        const minCharge = parseFloat(cat.parcel_minimum_shipping_charge || 0);
        
        response += `${index + 1}. *${cat.name}*\n`;
        response += `   💰 ₹${perKm}/km (Minimum: ₹${minCharge})\n\n`;
      });

      this.logger.log(`✅ Showing ${activeCategories.length} active categories`);
      
      return {
        response,
        categories: activeCategories,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to fetch categories: ${error.message}`);
      return {
        response: '⚠️ Failed to load parcel categories. Please try again.',
        categories: [],
      };
    }
  }

  /**
   * Execute calculate_charges step
   */
  private async executeCalculateChargesStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const distance = flowContext.collectedData.distance as number;

    if (distance === undefined || distance === null) {
      return {
        response: 'Distance not calculated yet.',
        complete: false,
      };
    }

    // Get parcel category and zone info
    const parcelCategoryId = Number(flowContext.collectedData.parcel_category_id);
    const senderZoneId = Number(flowContext.collectedData.sender_zone_id);
    const receiverZoneId = Number(flowContext.collectedData.receiver_zone_id);
    
    // Construct zone IDs array for pricing
    const zoneIds: number[] = [];
    if (!isNaN(senderZoneId) && senderZoneId > 0) zoneIds.push(senderZoneId);
    if (!isNaN(receiverZoneId) && receiverZoneId > 0 && receiverZoneId !== senderZoneId) zoneIds.push(receiverZoneId);

    try {
      this.logger.log(`💰 Calculating charges via PHP: Distance=${distance}, Category=${parcelCategoryId}, Zones=[${zoneIds.join(',')}]`);
      
      // Call PHP backend for pricing
      const pricing = await this.phpParcelService.calculateShippingCharge(
        distance,
        parcelCategoryId,
        zoneIds
      );

      const total = pricing.total_charge;
      const subtotal = pricing.delivery_charge;
      const tax = pricing.tax;

      this.logger.log(`💰 Charges calculated: Subtotal=₹${subtotal}, Tax=₹${tax}, Total=₹${total}`);

      return {
        response: `💰 *Delivery Charges*\n\n` +
                  `Distance: ${distance} km\n` +
                  `Subtotal: ₹${subtotal}\n` +
                  `Tax: ₹${tax}\n` +
                  `*Total: ₹${total}*`,
        complete: true,
        data: { 
          deliveryCharge: total,
          subtotal,
          tax,
          distance,
          pricing_details: pricing
        },
      };
    } catch (error) {
      this.logger.error(`❌ Pricing calculation failed: ${error.message}`);
      return {
        response: '⚠️ Unable to calculate delivery charges. Please try again later.',
        complete: false,
      };
    }
  }

  /**
   * Execute pricing step
   */
  private async executePricingStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const type = step.config.type as string; // 'food', 'ecommerce', 'parcel'
    const itemsPath = step.config.itemsPath as string;
    
    this.logger.log(`💰 Pricing Step: ${type}`);

    // Handle Food/Ecommerce pricing via PhpStoreService
    if (type === 'food' || type === 'ecommerce') {
      const items = this.getValueFromPath(flowContext.collectedData, itemsPath) as any[];
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return {
          response: 'Your cart is empty.',
          complete: false,
        };
      }

      // Get zone ID
      const deliveryAddress = flowContext.collectedData['delivery_address'] as any;
      const zoneId = (flowContext.collectedData['delivery_zone'] as any)?.id || 
                     flowContext.collectedData['receiver_zone_id'] || 
                     context.session?.data?.zone_id;

      try {
        this.logger.log(`🛒 Validating cart with PHP backend (Zone: ${zoneId || 'Default'})`);
        
        // Use PhpStoreService to validate cart and get real pricing
        const validationResult = await this.phpStoreService.validateCart(items, zoneId);
        
        if (validationResult.valid) {
          return {
            response: '',
            complete: true,
            data: {
              pricing: {
                itemsTotal: validationResult.subtotal,
                deliveryFee: validationResult.delivery_charge,
                tax: validationResult.tax,
                total: validationResult.total_amount,
                currency: 'INR',
                breakdown: validationResult.breakdown
              },
              // Update items with latest prices/availability if needed
              [itemsPath]: validationResult.items
            }
          };
        } else {
          // Handle invalid items (e.g. out of stock, price change)
          const issues = validationResult.issues || [];
          const issueText = issues.map(i => `• ${i.message}`).join('\n');
          
          return {
            response: `⚠️ Some items in your cart need attention:\n${issueText}\n\nWould you like to update your cart?`,
            complete: false
          };
        }
      } catch (error) {
        this.logger.error(`❌ Cart validation failed: ${error.message}`);
        
        // // Fallback to local calculation if service fails (graceful degradation)
        let itemsTotal = 0;
        items.forEach(item => {
          itemsTotal += (item.price || 0) * (item.quantity || 1);
        });
        
        const deliveryFee = step.config.shippingFee as number || 40;
        const taxRate = step.config.taxRate as number || 0.05;
        const tax = Math.round(itemsTotal * taxRate);
        const total = itemsTotal + deliveryFee + tax;
        
        return {
          response: '',
          complete: true,
          data: {
            pricing: {
              itemsTotal,
              deliveryFee,
              tax,
              total,
              currency: 'INR',
              isEstimate: true
            }
          }
        };
      }
    }
    
    // Handle Parcel pricing (reuse existing logic if needed, or delegate)
    if (type === 'parcel') {
       // ... existing parcel logic is in calculate_charges step, but could be moved here
       return this.executeCalculateChargesStep(step, context, flowContext);
    }

    return {
      response: 'Pricing calculation not supported for this type.',
      complete: false
    };
  }

  /**
   * Helper to get value from nested path
   */
  private getValueFromPath(obj: any, path: string): any {
    if (!path) return undefined;
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
  }

  /**
   * Execute api_call step
   */
  private async executeApiCallStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const endpoint = step.config.endpoint as string;
    const method = (step.config.method as string) || 'POST';
    const dataTemplate = step.config.data as Record<string, unknown>;

    // Replace template variables with actual data
    const requestData = this.interpolateObject(dataTemplate, flowContext.collectedData);

    this.logger.log(`🌐 API Call: ${method} ${endpoint}`);
    this.logger.log(`📦 Data:`, requestData);

    // Get session data for authentication
    const sessionData = context.session?.data || {};
    const authToken = sessionData.auth_token;
    const userId = sessionData.user_id;

    if (!authToken && !flowContext.collectedData['is_guest']) {
      this.logger.error('❌ No auth token found and not a guest user');
      return {
        response: '⚠️ Authentication required. Please login to place an order.',
        complete: false,
      };
    }

    try {
      // Check if this is a parcel order creation
      if (endpoint.includes('/order/place') || endpoint.includes('create-order-php-backend')) {
        // Extract collected data
        const senderAddress = flowContext.collectedData['sender_address'] as any;
        const receiverAddress = flowContext.collectedData['receiver_address'] as any;
        const distance = flowContext.collectedData['distance'] as number;
        const parcelType = flowContext.collectedData['parcel_type'] as string;
        const parcelWeight = flowContext.collectedData['parcel_weight'];
        const parcelCategoryId = flowContext.collectedData['parcel_category_id'] as number;
        const paymentMethod = flowContext.collectedData['payment_method'] as string || 'cash_on_delivery';
        const orderNote = flowContext.collectedData['order_note'] as string;
        const deliveryCharge = flowContext.collectedData['deliveryCharge'] as number;

        if (!senderAddress || !receiverAddress) {
          return {
            response: '⚠️ Missing address information. Please restart the order process.',
            complete: false,
          };
        }

        // Call PhpOrderService to create the order
        this.logger.log('📦 Creating parcel order via PhpOrderService...');
        
        // Get zone IDs from collected data (from validate_zone steps)
        const senderZoneId = flowContext.collectedData['sender_zone_id'] as number || 4;  // Default to zone 4 (Nashik New)
        const receiverZoneId = flowContext.collectedData['receiver_zone_id'] as number || 4;
        
        const result = await this.phpOrderService.createOrder(authToken, {
          pickupAddress: {
            address: senderAddress.address || senderAddress.formatted_address,
            latitude: senderAddress.latitude,
            longitude: senderAddress.longitude,
            landmark: senderAddress.landmark,
          },
          deliveryAddress: {
            address: receiverAddress.address || receiverAddress.formatted_address,
            latitude: receiverAddress.latitude,
            longitude: receiverAddress.longitude,
            landmark: receiverAddress.landmark,
          },
          receiverName: receiverAddress.contact_person_name,
          receiverPhone: receiverAddress.contact_person_number,
          paymentMethod,
          orderNote,
          distance,
          parcelCategoryId: parcelCategoryId || 5, // Use category ID from selection, default to 5 (Bike Delivery)
          senderZoneId,  // Zone ID for sender
          deliveryZoneId: receiverZoneId,  // Zone ID for receiver
          orderAmount: deliveryCharge, // Pass calculated charge
        });

        if (result.success) {
          this.logger.log(`✅ Order created successfully: ID ${result.orderId}`);
          return {
            response: `✅ *Order Placed Successfully!*\n\n📦 Order ID: *#${result.orderId}*\n\n🚚 Your parcel will be picked up shortly.\n💰 Payment: ${paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Digital Payment'}\n\nYou can track your order anytime!`,
            complete: true,
            data: { 
              apiResponse: { 
                success: true, 
                orderId: result.orderId 
              } 
            },
          };
        } else {
          this.logger.error(`❌ Order creation failed: ${result.message}`);
          return {
            response: `⚠️ Sorry, we couldn't place your order.\n\nReason: ${result.message || 'Unknown error'}\n\nPlease try again or contact support.`,
            complete: false,
          };
        }
      }

      // For other API calls, use generic HTTP call (fallback)
      return {
        response: 'Request processed successfully.',
        complete: true,
        data: { apiResponse: { success: true } },
      };
    } catch (error) {
      this.logger.error(`❌ API call failed: ${error.message}`);
      
      // Check if this is a user-friendly error message from PHP backend
      const isUserFriendlyError = error.message && 
        !error.message.includes('Request failed') && 
        !error.message.includes('status code') &&
        !error.message.includes('ECONNREFUSED');
      
      if (isUserFriendlyError) {
        // Use the clean error message directly
        return {
          response: `⚠️ ${error.message}\n\nPlease try again or contact support if the issue persists.`,
          complete: false,
        };
      }
      
      // For technical errors, use generic message
      return {
        response: `⚠️ Something went wrong while processing your request.\n\nPlease try again or contact support.`,
        complete: false,
      };
    }
  }

  /**
   * Execute respond step
   */
  private async executeRespondStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const template = step.config.message as string;
    const response = this.interpolateTemplate(template, flowContext.collectedData);

    return {
      response,
      complete: true,
    };
  }

  /**
   * Execute condition step
   */
  private async executeConditionStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    // Implement conditional logic
    // For now, just pass through
    return {
      response: '',
      complete: true,
    };
  }

  /**
   * Execute game step - Handle gamification interactions
   */
  private async executeGameStep(
    step: FlowStep,
    context: AgentContext,
    flowContext: FlowExecutionContext,
  ): Promise<{ response: any; complete: boolean; data?: Record<string, unknown> }> {
    const gameTypeRaw = (step.config.gameType as string) || 'intent_quest';
    const gameType = this.interpolateTemplate(gameTypeRaw, flowContext.collectedData);
    const action = (step.config.action as string) || 'start'; // start, answer
    
    this.logger.log(`🎮 Game Step: ${action} ${gameType}`);
    
    const userId = context.session?.data?.user_id;
    if (!userId) {
      return {
        response: 'Please login to play games and earn rewards!',
        complete: false, // Should trigger auth flow if configured properly
      };
    }

    try {
      // Handle 'start' action
      if (action === 'start') {
        // Check if we already started this game in this flow run
        if (flowContext.collectedData[`game_${gameType}_started`]) {
          // Game already started, check if we have an answer to process
          // If user sent a message, treat it as an answer
          if (context.message && context.message.length > 0) {
             const authToken = context.session?.data?.auth_token;
             return this.processGameAnswer(userId, context.message, flowContext, authToken);
          }
          
          // If no message (e.g. just returned to this step), show current question
          // We need to fetch current state from game service
          // For now, just fall through to start which handles resume
        }

        const result = await this.gameOrchestratorService.startGame(userId, gameType);
        
        if (result.success) {
          flowContext.collectedData[`game_${gameType}_started`] = true;
          flowContext.collectedData['current_game_session_id'] = result.sessionId;
          
          // Format question for display
          let responseText = `${result.message}\n\n`;
          let buttons = [];
          
          if (result.question) {
            responseText += result.question.text + '\n\n';
            
            if (result.question.options && Array.isArray(result.question.options)) {
              // Create buttons for options
              buttons = result.question.options.map((opt, idx) => ({
                id: `option_${idx + 1}`,
                label: opt,
                value: String(idx + 1)
              }));

              result.question.options.forEach((opt, idx) => {
                responseText += `${idx + 1}. ${opt}\n`;
              });
            }
          }
          
          return {
            response: responseText,
            complete: false,
            data: {
              game_session_id: result.sessionId,
              current_question_id: result.question?.id
            }
          };
        }
      }
      
      return {
        response: 'Game interaction failed.',
        complete: true
      };
    } catch (error) {
      this.logger.error(`Game step error: ${error.message}`);
      return {
        response: 'Sorry, I could not start the game right now.',
        complete: true
      };
    }
  }

  /**
   * Interpolate template string with data
   */
  private interpolateTemplate(template: string, data: Record<string, unknown>): string {
    if (!template) return '';
    return template.replace(/{{([^}]+)}}/g, (match, key) => {
      const value = this.getValueFromPath(data, key.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Interpolate object values with data
   */
  private interpolateObject(obj: any, data: Record<string, unknown>): any {
    if (typeof obj === 'string') {
      return this.interpolateTemplate(obj, data);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, data));
    }
    if (typeof obj === 'object' && obj !== null) {
      const result = {};
      for (const key in obj) {
        result[key] = this.interpolateObject(obj[key], data);
      }
      return result;
    }
    return obj;
  }

  /**
   * Process game answer
   */
  private async processGameAnswer(
    userId: string, 
    answer: string, 
    flowContext: FlowExecutionContext, 
    authToken: string
  ): Promise<{ response: string; complete: boolean; data?: Record<string, unknown> }> {
    const sessionId = flowContext.collectedData['current_game_session_id'] as string;
    if (!sessionId) {
      return { response: 'Game session not found.', complete: true };
    }
    
    try {
      const result = await this.gameOrchestratorService.processAnswer(sessionId, answer, authToken);
      
      let responseText = result.feedback + '\n\n';
      
      if (result.nextQuestion) {
         responseText += result.nextQuestion.text + '\n\n';
         if (result.nextQuestion.options) {
           result.nextQuestion.options.forEach((opt, idx) => {
             responseText += `${idx + 1}. ${opt}\n`;
           });
         }
         return { response: responseText, complete: false };
      }
      
      // Game over
      return { response: responseText, complete: true };
    } catch (error) {
      this.logger.error(`Game answer processing failed: ${error.message}`);
      return { response: 'Error processing answer.', complete: true };
    }
  }

  /**
   * Save new address asynchronously
   */
  private async saveNewAddressAsync(session: any, field: string, addressData: any, flowContext: FlowExecutionContext): Promise<void> {
    if (session?.data?.auth_token) {
      try {
        await this.phpAddressService.addAddress(session.data.auth_token, {
          address: addressData.address,
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          addressType: 'other', // Default type
          contactPersonName: session.data.user_name || 'User',
          contactPersonNumber: session.data.phone || session.id,
        });
      } catch (error) {
        this.logger.warn(`Failed to save address async: ${error.message}`);
      }
    }
  }

  /**
   * Extract data from message
   */
  private extractDataFromMessage(message: string, field: string): any {
    // Basic extraction - can be enhanced
    return null;
  }

  /**
   * Handle phone number input
   */
  private async handlePhoneNumberInput(phoneNumber: string, message: string, session: any, startTime: number): Promise<AgentResult> {
    // Validate phone number
    const cleanPhone = message.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      // Send OTP
      await this.phpAuthService.sendOtp(cleanPhone);
      
      // Update session
      await this.sessionService.setStep(phoneNumber, 'awaiting_otp', {
        ...session.data,
        tempPhone: cleanPhone,
      });
      
      return {
        response: 'Please enter the OTP sent to your mobile number.',
        executionTime: Date.now() - startTime
      };
    }
    
    return {
      response: 'Please enter a valid 10-digit mobile number.',
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Handle OTP input
   */
  private async handleOtpInput(phoneNumber: string, message: string, session: any, startTime: number): Promise<AgentResult> {
    const otp = message.trim();
    const tempPhone = session.data.tempPhone;
    
    // Check if user wants to cancel (redundant if handled in step 0, but good safety)
    if (message.toLowerCase() === 'cancel') {
        await this.sessionService.setStep(phoneNumber, 'idle', {});
        return { response: 'Login cancelled.', executionTime: Date.now() - startTime };
    }
    
    if (otp.length === 4 || otp.length === 6) {
      try {
        const authResult = await this.phpAuthService.verifyOtp(tempPhone, otp);
        
        if (authResult.success && authResult.data?.token) {
          // Fetch user profile
          const userProfile = await this.phpAuthService.getUserProfile(authResult.data.token);
          this.logger.log(`✅ OTP Verified. User: ${userProfile?.id} (${userProfile?.firstName}). Token: ${authResult.data.token.substring(0, 10)}...`);
          
          // Update session with auth token and user info
          await this.sessionService.saveSession(phoneNumber, {
            currentStep: null, // Explicitly clear top-level step
            data: {
              ...session.data,
              auth_token: authResult.data.token,
              user_id: userProfile?.id,
              user_name: userProfile?.firstName,
              authenticated: true,
              currentStep: null // Clear data-level step
            }
          });
          
          this.logger.log(`💾 Session updated: authenticated=true, user_id=${userProfile?.id}`);

          // Prepare auth data for frontend
          const authData = {
            token: authResult.data.token,
            user: userProfile
          };

          // Check if personal info is missing (is_personal_info === 0)
          if (authResult.data.is_personal_info === 0) {
            this.logger.log(`👤 User profile incomplete. Asking for name.`);
            
            // Set step to awaiting_name
            await this.sessionService.setStep(phoneNumber, 'awaiting_name', {
              ...session.data,
              auth_token: authResult.data.token, // Ensure token is available for update
              authenticated: true
            });

            return {
              response: 'Login successful! To complete your profile, how should I address you? (Please enter your name)',
              executionTime: Date.now() - startTime,
              metadata: {
                auth_data: authData // Send token so frontend updates UI immediately
              }
            };
          }

          // Resume pending action if any
          if (session.data.pendingAction) {
             // ... logic to resume action
             return {
               response: `Login successful! Resuming your request to ${session.data.pendingAction.replace('_', ' ')}.`,
               executionTime: Date.now() - startTime,
               metadata: {
                 auth_data: authData
               }
             };
          }
          
          return {
            response: 'Login successful! How can I help you today?',
            executionTime: Date.now() - startTime,
            metadata: {
              auth_data: authData
            }
          };
        } else {
          // Handle explicit failure from backend (e.g. "OTP does not match")
          return {
            response: authResult.message || 'Invalid OTP. Please try again.',
            executionTime: Date.now() - startTime
          };
        }
      } catch (error) {
        return {
          response: error.message || 'Invalid OTP. Please try again.',
          executionTime: Date.now() - startTime
        };
      }
    }
    
    // If input is not numeric, hint at cancellation
    if (!/^\d+$/.test(otp)) {
         return {
            response: 'That doesn\'t look like a valid OTP. Please enter the 6-digit code sent to your phone, or type "cancel" to stop.',
            executionTime: Date.now() - startTime
         };
    }
    
    return {
      response: 'Please enter a valid OTP.',
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Handle Name input
   */
  private async handleNameInput(phoneNumber: string, message: string, session: any, startTime: number): Promise<AgentResult> {
    const name = message.trim();
    
    if (name.length < 2) {
      return {
        response: 'Please enter a valid name (at least 2 characters).',
        executionTime: Date.now() - startTime
      };
    }

    // Save name to session and ask for email
    // Note: PHP backend requires email for updateUserInfo. 
    // We'll ask for it next.
    await this.sessionService.setStep(phoneNumber, 'awaiting_email', {
      ...session.data,
      tempName: name
    });

    return {
      response: `Nice to meet you, ${name}! And what is your email address?`,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Handle Email input
   */
  private async handleEmailInput(phoneNumber: string, message: string, session: any, startTime: number): Promise<AgentResult> {
    const email = message.trim();
    const name = session.data.tempName;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        response: 'Please enter a valid email address.',
        executionTime: Date.now() - startTime
      };
    }

    try {
      this.logger.log(`📝 Updating profile for ${phoneNumber}: Name=${name}, Email=${email}`);
      
      // Call PHP service to update info
      const result = await this.phpAuthService.updateUserInfo(phoneNumber, name, email);
      
      if (result.success) {
        // Update session with new token if provided, and clear temp data
        const newToken = result.token || session.data.auth_token;
        
        // Fetch updated profile to be sure
        const userProfile = await this.phpAuthService.getUserProfile(newToken);
        
        await this.sessionService.saveSession(phoneNumber, {
          currentStep: null,
          data: {
            ...session.data,
            auth_token: newToken,
            user_id: userProfile?.id,
            user_name: userProfile?.firstName,
            tempName: null,
            currentStep: null
          }
        });

        // Prepare auth data for frontend update
        const authData = {
          token: newToken,
          user: userProfile
        };

        // Resume pending action if any
        if (session.data.pendingAction) {
           return {
             response: `Profile updated! Resuming your request to ${session.data.pendingAction.replace('_', ' ')}.`,
             executionTime: Date.now() - startTime,
             metadata: {
               auth_data: authData
             }
           };
        }

        return {
          response: 'Profile updated successfully! How can I help you?',
          executionTime: Date.now() - startTime,
          metadata: {
            auth_data: authData
          }
        };
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      this.logger.error(`Failed to update profile: ${error.message}`);
      return {
        response: 'Sorry, I couldn\'t save your profile details. You can try again later. How can I help you with your order?',
        executionTime: Date.now() - startTime,
        // Clear step so user isn't stuck
        metadata: {
           // Still send auth data if we have it from previous step
           auth_data: {
             token: session.data.auth_token,
             user: { id: session.data.user_id, firstName: name } // Optimistic update
           }
        }
      };
    }
  }

  /**
   * Generate clarification menu
   */
  private generateClarificationMenu(message: string): string {
    return 'I am not sure what you mean. Can you please clarify? You can ask to order food, book a parcel, or search for products.';
  }

  /**
   * Update session history
   */
  private async updateSessionHistory(phoneNumber: string, session: any, message: string, response: string, routing: any): Promise<void> {
    // ... implementation
  }

  /**
   * Log analytics
   */
  private logAnalytics(phoneNumber: string, routing: any, result: any): void {
    // ... implementation
  }
}