import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { AgentOrchestratorService } from '../services/agent-orchestrator.service';

/**
 * Flow Test Controller
 * 
 * Endpoints for testing Flow integration (moved to /test/flows to avoid conflict)
 */
@Controller('test/flows')
export class FlowTestController {
  private readonly logger = new Logger(FlowTestController.name);

  constructor(
    private readonly agentOrchestratorService: AgentOrchestratorService,
  ) {}

  /**
   * Test endpoint: Load flows from Admin Backend
   * 
   * GET /flows/load
   */
  @Get('load')
  async loadFlows() {
    this.logger.log('📥 Loading flows from Admin Backend...');
    
    try {
      const flows = await this.agentOrchestratorService.loadFlows();
      
      return {
        success: true,
        count: flows.length,
        flows: flows.map(f => ({
          id: f.id,
          name: f.name,
          module: f.module,
          trigger: f.trigger,
          enabled: f.enabled,
          stepCount: f.steps?.length || 0,
        })),
      };
    } catch (error) {
      this.logger.error('Error loading flows:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test endpoint: Clear flow cache
   * 
   * POST /flows/cache/clear
   */
  @Post('cache/clear')
  async clearCache() {
    this.logger.log('🗑️ Clearing flow cache...');
    
    this.agentOrchestratorService.clearFlowCache();
    
    return {
      success: true,
      message: 'Flow cache cleared successfully',
    };
  }

  /**
   * Test endpoint: Process message with flow
   * 
   * POST /flows/test
   * Body: { phoneNumber, message, module }
   */
  @Post('test')
  async testFlow(@Body() body: { phoneNumber: string; message: string; module?: string }) {
    this.logger.log(`🧪 Testing flow for message: "${body.message}" from ${body.phoneNumber}`);
    
    try {
      const result = await this.agentOrchestratorService.processMessage(
        body.phoneNumber,
        body.message,
        body.module as any,
      );
      
      this.logger.log(`✅ Flow test result: ${JSON.stringify(result).substring(0, 200)}`);
      
      return {
        success: true,
        result,
      };
    } catch (error) {
      this.logger.error(`❌ Error testing flow: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }
}
