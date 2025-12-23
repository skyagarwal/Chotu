import { Controller, Post, Body, Get, Logger, Param } from '@nestjs/common';
import { AgentOrchestratorService } from '../services/agent-orchestrator.service';
import { AgentRegistryService } from '../services/agent-registry.service';
import { ModuleType } from '../types/agent.types';

/**
 * Agent Test Controller
 * 
 * Channel-agnostic testing for the agent system
 */
@Controller('agents')
export class AgentTestController {
  private readonly logger = new Logger(AgentTestController.name);

  constructor(
    private readonly agentOrchestrator: AgentOrchestratorService,
    private readonly agentRegistry: AgentRegistryService,
  ) {}

  /**
   * Test agent system with a message
   */
  @Post('test')
  async testAgent(
    @Body() body: {
      phoneNumber?: string;
      message: string;
      module?: string;
      agentId?: string;
      session?: {
        location?: {
          lat: number;
          lon: number;
        };
        data?: any;
      };
    },
  ) {
    const phoneNumber = body.phoneNumber || 'test-user';
    const module = (body.module || 'food') as ModuleType;

    this.logger.log(`🧪 Testing agent system: "${body.message}" [${module}]`);
    
    // If session with location provided, create a mock session
    if (body.session?.location) {
      this.logger.log(`📍 Test location: ${body.session.location.lat}, ${body.session.location.lon}`);
    }

    try {
      const result = await this.agentOrchestrator.processMessage(
        phoneNumber,
        body.message,
        module,
        body.agentId || null,
        body.session, // Pass session data for testing
      );

      this.logger.log(`✅ Agent response received`);

      return {
        success: true,
        phoneNumber,
        module,
        message: body.message,
        result: {
          response: result.response,
          functionsCalled: result.functionsCalled,
          executionTime: result.executionTime,
          tokensUsed: result.tokensUsed,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Agent test error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  /**
   * Get all registered agents
   */
  @Get('list')
  async listAgents() {
    const agents = this.agentRegistry.getAllAgents();

    return {
      count: agents.length,
      agents: agents.map((agent) => {
        const config = agent.getConfig();
        return {
          id: config.id,
          type: config.type,
          name: config.name,
          description: config.description,
          modules: config.modules,
          enabled: config.enabled,
          functionCount: config.functions.length,
        };
      }),
    };
  }

  /**
   * Get specific agent details
   */
  @Get('details/:agentId')
  async getAgentDetails(@Param('agentId') agentId: string) {
    const agent = this.agentRegistry.getAgent(agentId);

    if (!agent) {
      return {
        success: false,
        error: 'Agent not found',
      };
    }

    const config = agent.getConfig();

    return {
      success: true,
      agent: {
        id: config.id,
        type: config.type,
        name: config.name,
        description: config.description,
        modules: config.modules,
        enabled: config.enabled,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        functions: config.functions.map((f) => ({
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        })),
      },
    };
  }

  /**
   * Health check for agent system
   */
  @Get('health')
  async healthCheck() {
    const agents = this.agentRegistry.getAllAgents();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      agents: {
        total: agents.length,
        enabled: agents.filter((a) => a.getConfig().enabled).length,
        list: agents.map((a) => a.getConfig().id),
      },
    };
  }
}
