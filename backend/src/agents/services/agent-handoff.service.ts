import { Injectable, Logger } from '@nestjs/common';
import { AgentContext, AgentResult, AgentType } from '../types/agent.types';
import { AgentRegistryService } from './agent-registry.service';
import { SessionService } from '../../session/session.service';
import { ConfigService } from '@nestjs/config';

// Extended agent type including human escalation
type ExtendedAgentType = AgentType | 'human';

/**
 * Handoff Request - Passed between agents during handoff
 */
export interface HandoffRequest {
  // Source agent making the handoff
  sourceAgent: AgentType;
  
  // Target agent to receive the handoff
  targetAgent: ExtendedAgentType;
  
  // Reason for handoff
  reason: string;
  
  // Context to pass to target agent
  context: {
    // Original user message
    userMessage: string;
    
    // Extracted entities/data from source agent
    extractedData: Record<string, any>;
    
    // Conversation history summary (to avoid passing full history)
    conversationSummary?: string;
    
    // Priority level (higher = more urgent)
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // Options for handoff behavior
  options?: {
    // Should source agent send a transition message?
    sendTransitionMessage?: boolean;
    
    // Custom transition message
    transitionMessage?: string;
    
    // Should target agent acknowledge handoff?
    requireAcknowledgment?: boolean;
    
    // Max time for handoff (ms)
    timeout?: number;
    
    // Allow handoff back to source?
    allowBounceback?: boolean;
  };
}

/**
 * Handoff Result - Returned after handoff completes
 */
export interface HandoffResult {
  success: boolean;
  targetResponse?: AgentResult;
  handoffChain: Array<{
    agent: ExtendedAgentType;
    action: 'received' | 'processed' | 'handed_off' | 'bounced_back';
    timestamp: Date;
  }>;
  error?: string;
}

/**
 * Agent Handoff Service
 * 
 * Enables agents to delegate work to each other via function calling.
 * This allows for:
 * - Multi-agent collaboration
 * - Specialized task handling
 * - Graceful escalation
 * 
 * Example flow:
 * 1. SearchAgent finds products
 * 2. User wants to book → SearchAgent hands off to BookingAgent
 * 3. BookingAgent completes booking
 * 4. Optionally hands back to SearchAgent or ends
 * 
 * Handoff Functions (available to all agents):
 * - handoff_to_search: Route to SearchAgent
 * - handoff_to_booking: Route to BookingAgent
 * - handoff_to_order: Route to OrderAgent
 * - handoff_to_complaints: Route to ComplaintsAgent
 * - handoff_to_faq: Route to FAQAgent
 * - handoff_to_human: Escalate to human support
 */
@Injectable()
export class AgentHandoffService {
  private readonly logger = new Logger(AgentHandoffService.name);

  private readonly frappeBaseUrl: string;
  private readonly frappeApiKey: string;
  private readonly frappeApiSecret: string;
  private readonly frappeIssueDoctype: string;
  private readonly frappeExternalIdField: string;
  private readonly frappeEnabled: boolean;
  
  // Handoff statistics
  private handoffStats: Map<string, {
    count: number;
    successRate: number;
    avgDuration: number;
  }> = new Map();
  
  // Active handoffs (for tracking/debugging)
  private activeHandoffs: Map<string, {
    request: HandoffRequest;
    startTime: Date;
    sessionId: string;
  }> = new Map();
  
  // Handoff limits (prevent infinite loops)
  private readonly MAX_HANDOFF_DEPTH = 3;
  
  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('🤝 Agent Handoff Service initialized');

    this.frappeBaseUrl = (this.configService.get<string>('FRAPPE_BASE_URL') || '').replace(/\/+$/, '');
    this.frappeApiKey = this.configService.get<string>('FRAPPE_API_KEY') || '';
    this.frappeApiSecret = this.configService.get<string>('FRAPPE_API_SECRET') || '';
    this.frappeIssueDoctype = this.configService.get<string>('FRAPPE_ISSUE_DOCTYPE') || 'Issue';
    this.frappeExternalIdField = this.configService.get<string>('FRAPPE_EXTERNAL_ID_FIELD') || 'custom_external_conversation_id';
    this.frappeEnabled = !!(this.frappeBaseUrl && this.frappeApiKey && this.frappeApiSecret);
  }

  private getFrappeAuthHeader(): string | null {
    if (!this.frappeEnabled) return null;
    return `token ${this.frappeApiKey}:${this.frappeApiSecret}`;
  }

  private async frappeRequest<T>(opts: {
    method: 'GET' | 'POST' | 'PUT';
    path: string;
    query?: Record<string, string>;
    body?: any;
    timeoutMs?: number;
  }): Promise<T> {
    if (!this.frappeEnabled) {
      throw new Error('Frappe integration not configured (missing FRAPPE_BASE_URL/FRAPPE_API_KEY/FRAPPE_API_SECRET)');
    }

    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) {
      throw new Error('Global fetch() not available in this runtime');
    }

    const base = this.frappeBaseUrl;
    const url = new URL(`${base}${opts.path.startsWith('/') ? '' : '/'}${opts.path}`);
    for (const [k, v] of Object.entries(opts.query || {})) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const authHeader = this.getFrappeAuthHeader();
    if (authHeader) headers['Authorization'] = authHeader;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);

    try {
      const resp = await fetchFn(url.toString(), {
        method: opts.method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });

      const text = await resp.text();
      let json: any;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text };
      }

      if (!resp.ok) {
        const msg = json?.exception || json?.message || json?._server_messages || text || `HTTP ${resp.status}`;
        throw new Error(`Frappe API ${opts.method} ${opts.path} failed: ${msg}`);
      }

      return json as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async findExistingIssueByExternalId(externalConversationId: string): Promise<string | null> {
    if (!this.frappeEnabled) return null;

    // If the custom field doesn't exist in ERPNext yet, this call will error; we treat it as "not found".
    try {
      const fields = JSON.stringify(['name']);
      const filters = JSON.stringify([[this.frappeIssueDoctype, this.frappeExternalIdField, '=', externalConversationId]]);

      const result = await this.frappeRequest<{ data?: Array<{ name: string }> }>({
        method: 'GET',
        path: `/api/resource/${encodeURIComponent(this.frappeIssueDoctype)}`,
        query: {
          fields,
          filters,
          limit_page_length: '1',
        },
      });

      const name = result?.data?.[0]?.name;
      return name || null;
    } catch (err: any) {
      this.logger.warn(`Frappe Issue lookup skipped/failed (will create new): ${err?.message || err}`);
      return null;
    }
  }

  private mapPriority(p?: string): string {
    const normalized = (p || '').toLowerCase();
    if (normalized === 'critical') return 'Urgent';
    if (normalized === 'high') return 'High';
    if (normalized === 'low') return 'Low';
    return 'Medium';
  }

  private async createIssueOnFrappe(params: {
    externalConversationId: string;
    channel: string;
    userRef: string;
    reason: string;
    priority?: string;
    userMessage?: string;
    conversationSummary?: string;
  }): Promise<string> {
    const subject = `Mangwale AI escalation: ${params.channel} ${params.userRef}`;
    const descriptionLines = [
      `Escalation reason: ${params.reason}`,
      `Priority: ${params.priority || 'medium'}`,
      `Channel: ${params.channel}`,
      `External conversation ID: ${params.externalConversationId}`,
      params.userMessage ? `Last user message: ${params.userMessage}` : undefined,
      params.conversationSummary ? `Summary: ${params.conversationSummary}` : undefined,
    ].filter(Boolean);

    const payload: Record<string, any> = {
      subject,
      status: 'Open',
      priority: this.mapPriority(params.priority),
      description: descriptionLines.join('\n\n'),
    };

    // Best-effort attach external ID field if it exists
    payload[this.frappeExternalIdField] = params.externalConversationId;
    payload['custom_channel'] = params.channel;

    const created = await this.frappeRequest<{ data: { name: string } }>({
      method: 'POST',
      path: `/api/resource/${encodeURIComponent(this.frappeIssueDoctype)}`,
      body: payload,
    });

    const issueName = created?.data?.name;
    if (!issueName) throw new Error('Frappe Issue create returned no Issue name');
    return issueName;
  }
  
  /**
   * Get available handoff function definitions
   * These can be added to any agent's function list
   */
  getHandoffFunctions(): any[] {
    return [
      {
        name: 'handoff_to_search',
        description: 'Transfer conversation to Search Agent for product/service discovery. Use when user wants to find products, explore catalog, or search for specific items.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for handoff (e.g., "User wants to search for products")',
            },
            searchQuery: {
              type: 'string',
              description: 'Initial search query to pass to Search Agent',
            },
            context: {
              type: 'object',
              description: 'Additional context data',
            },
          },
          required: ['reason'],
        },
      },
      {
        name: 'handoff_to_booking',
        description: 'Transfer conversation to Booking Agent for service bookings. Use when user wants to book parcel delivery, schedule pickup, or create new orders.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for handoff',
            },
            bookingType: {
              type: 'string',
              enum: ['parcel', 'food', 'service'],
              description: 'Type of booking',
            },
            collectedData: {
              type: 'object',
              description: 'Data already collected (addresses, items, etc.)',
            },
          },
          required: ['reason'],
        },
      },
      {
        name: 'handoff_to_order',
        description: 'Transfer conversation to Order Agent for order management. Use when user wants to track, modify, cancel, or check status of existing orders.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for handoff',
            },
            orderId: {
              type: 'string',
              description: 'Order ID if known',
            },
            action: {
              type: 'string',
              enum: ['track', 'cancel', 'modify', 'status'],
              description: 'Requested action on order',
            },
          },
          required: ['reason'],
        },
      },
      {
        name: 'handoff_to_complaints',
        description: 'Transfer conversation to Complaints Agent for issue resolution. Use when user has problems, refund requests, or quality issues.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for handoff',
            },
            issueType: {
              type: 'string',
              enum: ['refund', 'quality', 'delay', 'missing', 'other'],
              description: 'Type of issue',
            },
            orderId: {
              type: 'string',
              description: 'Related order ID if applicable',
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Issue severity',
            },
          },
          required: ['reason'],
        },
      },
      {
        name: 'handoff_to_faq',
        description: 'Transfer conversation to FAQ Agent for general questions. Use when user has questions about policies, procedures, or general information.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for handoff',
            },
            topic: {
              type: 'string',
              description: 'FAQ topic/category',
            },
            question: {
              type: 'string',
              description: 'User\'s question',
            },
          },
          required: ['reason'],
        },
      },
      {
        name: 'handoff_to_human',
        description: 'Escalate conversation to human support. Use when issue is too complex, user specifically requests human support, or critical situation.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for escalation',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Escalation priority',
            },
            summary: {
              type: 'string',
              description: 'Conversation summary for human agent',
            },
          },
          required: ['reason', 'priority'],
        },
      },
    ];
  }
  
  /**
   * Execute a handoff from one agent to another
   */
  async executeHandoff(
    request: HandoffRequest,
    context: AgentContext,
  ): Promise<HandoffResult> {
    const handoffId = `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    
    this.logger.log(`🤝 Handoff initiated: ${request.sourceAgent} → ${request.targetAgent}`);
    this.logger.log(`   Reason: ${request.reason}`);
    
    // Track active handoff
    this.activeHandoffs.set(handoffId, {
      request,
      startTime,
      sessionId: context.phoneNumber,
    });
    
    const handoffChain: HandoffResult['handoffChain'] = [
      { agent: request.sourceAgent, action: 'handed_off', timestamp: startTime },
    ];
    
    try {
      // Check handoff depth (prevent infinite loops)
      const sessionData = await this.sessionService.getData(context.phoneNumber);
      const currentDepth = (sessionData?.handoff_depth || 0) + 1;
      
      if (currentDepth > this.MAX_HANDOFF_DEPTH) {
        this.logger.warn(`⚠️ Max handoff depth (${this.MAX_HANDOFF_DEPTH}) reached, aborting`);
        return {
          success: false,
          handoffChain,
          error: 'Maximum handoff depth exceeded',
        };
      }
      
      // Store handoff depth in session
      await this.sessionService.setData(context.phoneNumber, 'handoff_depth', currentDepth);
      await this.sessionService.setData(context.phoneNumber, 'last_handoff', {
        from: request.sourceAgent,
        to: request.targetAgent,
        reason: request.reason,
        timestamp: startTime.toISOString(),
      });
      
      // Handle human escalation specially
      if (request.targetAgent === 'human') {
        return this.handleHumanEscalation(request, context, handoffChain);
      }
      
      // Get target agent (only for non-human targets)
      const targetAgent = this.agentRegistry.getAgent(request.targetAgent as AgentType);
      if (!targetAgent) {
        this.logger.error(`❌ Target agent not found: ${request.targetAgent}`);
        return {
          success: false,
          handoffChain,
          error: `Agent ${String(request.targetAgent)} not found`,
        };
      }
      
      handoffChain.push({
        agent: request.targetAgent,
        action: 'received',
        timestamp: new Date(),
      });
      
      // Build enhanced context for target agent
      const enhancedContext: AgentContext = {
        ...context,
        message: request.context.userMessage,
        // Store handoff info in session for target agent to access
        session: {
          ...context.session,
          handoff: {
            from: request.sourceAgent,
            reason: request.reason,
            extractedData: request.context.extractedData,
            priority: request.context.priority || 'medium',
          },
        },
      };
      
      // Add transition message if requested
      if (request.options?.sendTransitionMessage) {
        const transitionMsg = request.options.transitionMessage || 
          `I'm connecting you with our ${request.targetAgent} specialist to help with ${request.reason}.`;
        
        // This could be sent via messaging service if needed
        this.logger.log(`📤 Transition message: ${transitionMsg}`);
      }
      
      // Execute target agent
      this.logger.log(`🚀 Executing target agent: ${request.targetAgent}`);
      const targetResult = await targetAgent.execute(enhancedContext);
      
      handoffChain.push({
        agent: request.targetAgent,
        action: 'processed',
        timestamp: new Date(),
      });
      
      // Update stats
      this.updateStats(request.sourceAgent, request.targetAgent, true, Date.now() - startTime.getTime());
      
      // Reset handoff depth on successful completion
      await this.sessionService.setData(context.phoneNumber, 'handoff_depth', 0);
      
      return {
        success: true,
        targetResponse: targetResult,
        handoffChain,
      };
      
    } catch (error) {
      this.logger.error(`❌ Handoff failed: ${error.message}`);
      
      // Update stats
      this.updateStats(request.sourceAgent, request.targetAgent, false, Date.now() - startTime.getTime());
      
      return {
        success: false,
        handoffChain,
        error: error.message,
      };
      
    } finally {
      // Clean up active handoff
      this.activeHandoffs.delete(handoffId);
    }
  }
  
  /**
   * Handle escalation to human support
   */
  private async handleHumanEscalation(
    request: HandoffRequest,
    context: AgentContext,
    handoffChain: HandoffResult['handoffChain'],
  ): Promise<HandoffResult> {
    this.logger.log(`👤 Escalating to human support: ${request.reason}`);
    
    // Store escalation in session
    await this.sessionService.setData(context.phoneNumber, 'escalated_to_human', true);
    await this.sessionService.setData(context.phoneNumber, 'escalation_reason', request.reason);
    await this.sessionService.setData(context.phoneNumber, 'escalation_priority', request.context.priority);
    await this.sessionService.setData(context.phoneNumber, 'escalation_time', new Date().toISOString());

    // Phase 1: Create ERPNext Issue (best-effort; do not block escalation response)
    let issueId: string | null = null;
    try {
      // Idempotency: reuse previously created Issue for this conversation/session
      const existingFromSession = await this.sessionService.getData(context.phoneNumber, 'frappe_issue_id');
      if (existingFromSession && typeof existingFromSession === 'string') {
        issueId = existingFromSession;
      } else if (this.frappeEnabled) {
        const platform = (await this.sessionService.getData(context.phoneNumber, 'platform')) || 'unknown';
        const channel = typeof platform === 'string' ? platform : 'unknown';
        const externalConversationId = String(context.phoneNumber);

        // Optional lookup by externalConversationId (requires custom field present)
        issueId = await this.findExistingIssueByExternalId(externalConversationId);
        if (!issueId) {
          issueId = await this.createIssueOnFrappe({
            externalConversationId,
            channel,
            userRef: externalConversationId,
            reason: request.reason,
            priority: request.context.priority,
            userMessage: request.context.userMessage,
            conversationSummary: request.context.conversationSummary,
          });
        }

        await this.sessionService.setData(context.phoneNumber, 'frappe_issue_id', issueId);
      } else {
        this.logger.warn('Frappe Issue creation skipped: FRAPPE_* env vars not configured');
      }
    } catch (err: any) {
      this.logger.error(`Frappe Issue creation failed (continuing): ${err?.message || err}`);
    }
    
    // In production, this would:
    // 1. Create a support ticket
    // 2. Notify human agents
    // 3. Queue the conversation
    
    handoffChain.push({
      agent: 'human' as AgentType,
      action: 'received',
      timestamp: new Date(),
    });
    
    return {
      success: true,
      targetResponse: {
        response: `I've escalated your concern to our support team. ` +
          `Priority: ${request.context.priority || 'medium'}. ` +
          `A human agent will contact you shortly.` +
          (issueId ? ` Ticket: ${issueId}.` : '') +
          ` Reference: ${context.phoneNumber.slice(-4)}`,
        functionsCalled: ['handoff_to_human'],
        executionTime: 0,
        metadata: {
          escalated: true,
          priority: request.context.priority,
          issueId,
        },
      },
      handoffChain,
    };
  }
  
  /**
   * Update handoff statistics
   */
  private updateStats(from: AgentType, to: ExtendedAgentType, success: boolean, duration: number): void {
    const key = `${from}_to_${to}`;
    const existing = this.handoffStats.get(key) || { count: 0, successRate: 0, avgDuration: 0 };
    
    const newCount = existing.count + 1;
    const newSuccessRate = ((existing.successRate * existing.count) + (success ? 1 : 0)) / newCount;
    const newAvgDuration = ((existing.avgDuration * existing.count) + duration) / newCount;
    
    this.handoffStats.set(key, {
      count: newCount,
      successRate: newSuccessRate,
      avgDuration: newAvgDuration,
    });
  }
  
  /**
   * Process a handoff function call from an agent
   */
  async processHandoffFunction(
    functionName: string,
    args: Record<string, any>,
    context: AgentContext,
    sourceAgent: AgentType,
  ): Promise<HandoffResult> {
    // Map function name to target agent
    const targetMap: Record<string, ExtendedAgentType> = {
      'handoff_to_search': AgentType.SEARCH,
      'handoff_to_booking': AgentType.BOOKING,
      'handoff_to_order': AgentType.ORDER,
      'handoff_to_complaints': AgentType.COMPLAINTS,
      'handoff_to_faq': AgentType.FAQ,
      'handoff_to_human': 'human',
    };
    
    const targetAgent = targetMap[functionName];
    if (!targetAgent) {
      return {
        success: false,
        handoffChain: [],
        error: `Unknown handoff function: ${functionName}`,
      };
    }
    
    const request: HandoffRequest = {
      sourceAgent,
      targetAgent: targetAgent as AgentType,
      reason: args.reason,
      context: {
        userMessage: context.message,
        extractedData: {
          ...(args.searchQuery && { searchQuery: args.searchQuery }),
          ...(args.bookingType && { bookingType: args.bookingType }),
          ...(args.collectedData && { collectedData: args.collectedData }),
          ...(args.orderId && { orderId: args.orderId }),
          ...(args.action && { action: args.action }),
          ...(args.issueType && { issueType: args.issueType }),
          ...(args.severity && { severity: args.severity }),
          ...(args.topic && { topic: args.topic }),
          ...(args.question && { question: args.question }),
          ...(args.summary && { summary: args.summary }),
        },
        priority: args.severity || args.priority || 'medium',
      },
      options: {
        sendTransitionMessage: true,
      },
    };
    
    return this.executeHandoff(request, context);
  }
  
  /**
   * Get handoff statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key, value] of this.handoffStats) {
      stats[key] = {
        ...value,
        successRate: (value.successRate * 100).toFixed(1) + '%',
        avgDuration: Math.round(value.avgDuration) + 'ms',
      };
    }
    
    return {
      handoffPaths: stats,
      activeHandoffs: this.activeHandoffs.size,
      totalHandoffs: Array.from(this.handoffStats.values()).reduce((sum, s) => sum + s.count, 0),
    };
  }
  
  /**
   * Resolve human escalation and hand conversation back to AI
   * Called when human agent marks Issue as resolved/closed
   */
  async resolveHumanEscalation(phoneNumber: string): Promise<void> {
    this.logger.log(`✅ Resolving human escalation for ${phoneNumber} - handing back to AI`);
    
    await this.sessionService.setData(phoneNumber, 'escalated_to_human', false);
    await this.sessionService.setData(phoneNumber, 'escalation_resolved_at', new Date().toISOString());
    
    // Keep frappe_issue_id in session for reference/history
    // but conversation will now resume with AI
  }

  /**
   * Clear handoff state for a session (e.g., on conversation reset)
   */
  async clearHandoffState(phoneNumber: string): Promise<void> {
    await this.sessionService.setData(phoneNumber, 'handoff_depth', 0);
    await this.sessionService.setData(phoneNumber, 'last_handoff', null);
    await this.sessionService.setData(phoneNumber, 'escalated_to_human', false);
  }
}
