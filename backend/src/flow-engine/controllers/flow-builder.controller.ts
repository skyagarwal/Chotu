import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FlowEngineService } from '../flow-engine.service';
import { ExecutorRegistryService } from '../executor-registry.service';
import { CreateFlowDto, UpdateFlowDto, AddStateDto, ExecuteFlowDto } from '../dto/create-flow.dto';
import { FlowDefinition } from '../types/flow.types';

/**
 * Flow Builder API Controller
 * 
 * Provides REST endpoints for visual flow builder UI:
 * - CRUD operations for flows
 * - State management
 * - Flow validation
 * - Test execution
 * - Executor discovery
 */
@Controller('flows')
export class FlowBuilderController {
  private readonly logger = new Logger(FlowBuilderController.name);

  constructor(
    private readonly flowEngine: FlowEngineService,
    private readonly executorRegistry: ExecutorRegistryService,
  ) {}

  /**
   * List all flows
   * GET /api/flows
   */
  @Get()
  async listFlows(
    @Query('module') module?: string,
    @Query('enabled') enabled?: string,
  ) {
    try {
      const flows = await this.flowEngine.getAllFlows();
      
      let filtered = flows;
      
      if (module) {
        filtered = filtered.filter(f => f.module === module);
      }
      
      if (enabled !== undefined) {
        const isEnabled = enabled === 'true';
        filtered = filtered.filter(f => f.enabled === isEnabled);
      }

      return {
        success: true,
        count: filtered.length,
        flows: filtered.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          module: f.module,
          trigger: f.trigger,
          version: f.version,
          enabled: f.enabled,
          stateCount: Object.keys(f.states || {}).length,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to list flows:', error);
      throw new HttpException(
        'Failed to retrieve flows',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get specific flow by ID
   * GET /api/flows/:id
   */
  @Get(':id')
  async getFlow(@Param('id') id: string) {
    try {
      const flow = await this.flowEngine.getFlowById(id);
      
      if (!flow) {
        throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        flow,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to get flow ${id}:`, error);
      throw new HttpException(
        'Failed to retrieve flow',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create new flow
   * POST /api/flows
   */
  @Post()
  async createFlow(@Body() createDto: CreateFlowDto) {
    try {
      // Validate flow definition
      const flowDef: FlowDefinition = {
        id: createDto.id,
        name: createDto.name,
        description: createDto.description,
        module: createDto.module,
        trigger: createDto.trigger,
        version: createDto.version || '1.0.0',
        states: createDto.states,
        initialState: createDto.initialState,
        finalStates: createDto.finalStates,
        contextSchema: createDto.contextSchema,
        metadata: createDto.metadata,
      };

      // Check if flow already exists
      const existing = await this.flowEngine.getFlowById(createDto.id);
      if (existing) {
        throw new HttpException(
          'Flow with this ID already exists',
          HttpStatus.CONFLICT,
        );
      }

      // Validate flow structure
      const validation = this.validateFlow(flowDef);
      if (!validation.valid) {
        throw new HttpException(
          {
            message: 'Flow validation failed',
            errors: validation.errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Save flow
      await this.flowEngine.saveFlow(flowDef);

      this.logger.log(`✅ Flow created: ${flowDef.name} (${flowDef.id})`);

      return {
        success: true,
        message: 'Flow created successfully',
        flowId: flowDef.id,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Failed to create flow:', error);
      throw new HttpException(
        'Failed to create flow',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update existing flow
   * PUT /api/flows/:id
   */
  @Put(':id')
  async updateFlow(@Param('id') id: string, @Body() updateDto: UpdateFlowDto) {
    try {
      const existingFlow = await this.flowEngine.getFlowById(id);
      
      if (!existingFlow) {
        throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
      }

      // Merge updates
      const updatedFlow: FlowDefinition = {
        ...existingFlow,
        ...updateDto,
      };

      // Validate updated flow
      const validation = this.validateFlow(updatedFlow);
      if (!validation.valid) {
        throw new HttpException(
          {
            message: 'Flow validation failed',
            errors: validation.errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Save updated flow
      await this.flowEngine.saveFlow(updatedFlow);

      this.logger.log(`✅ Flow updated: ${updatedFlow.name} (${id})`);

      return {
        success: true,
        message: 'Flow updated successfully',
        flowId: id,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to update flow ${id}:`, error);
      throw new HttpException(
        'Failed to update flow',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete flow
   * DELETE /api/flows/:id
   */
  @Delete(':id')
  async deleteFlow(@Param('id') id: string) {
    try {
      const flow = await this.flowEngine.getFlowById(id);
      
      if (!flow) {
        throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
      }

      // TODO: Implement soft delete in FlowEngineService
      // For now, we'll disable the flow
      await this.flowEngine.saveFlow({
        ...flow,
        enabled: false,
        metadata: {
          ...flow.metadata,
          deletedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`🗑️ Flow deleted: ${flow.name} (${id})`);

      return {
        success: true,
        message: 'Flow deleted successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to delete flow ${id}:`, error);
      throw new HttpException(
        'Failed to delete flow',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate flow definition
   * POST /api/flows/:id/validate
   */
  @Post(':id/validate')
  async validateFlowById(@Param('id') id: string) {
    try {
      const flow = await this.flowEngine.getFlowById(id);
      
      if (!flow) {
        throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
      }

      const validation = this.validateFlow(flow);

      return {
        success: true,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to validate flow ${id}:`, error);
      throw new HttpException(
        'Failed to validate flow',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test execute flow
   * POST /api/flows/:id/execute
   */
  @Post(':id/execute')
  async executeFlow(@Param('id') id: string, @Body() executeDto: ExecuteFlowDto) {
    try {
      const flow = await this.flowEngine.getFlowById(id);
      
      if (!flow) {
        throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
      }

      const result = await this.flowEngine.startFlow(id, {
        sessionId: executeDto.sessionId || `test-${Date.now()}`,
        phoneNumber: executeDto.phoneNumber || 'test-user',
        module: (executeDto.module || flow.module) as 'food' | 'parcel' | 'ecommerce' | 'general',
        initialContext: executeDto.initialContext || {},
      });

      return {
        success: true,
        result,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to execute flow ${id}:`, error);
      throw new HttpException(
        'Failed to execute flow',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get flow execution history
   * GET /api/flows/:id/runs
   */
  @Get(':id/runs')
  async getFlowRuns(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    try {
      // TODO: Implement in FlowEngineService
      // For now, return empty array
      return {
        success: true,
        runs: [],
        message: 'Flow execution history not yet implemented',
      };
    } catch (error) {
      this.logger.error(`Failed to get flow runs for ${id}:`, error);
      throw new HttpException(
        'Failed to retrieve flow runs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add state to flow
   * POST /api/flows/:id/states
   */
  @Post(':id/states')
  async addState(@Param('id') id: string, @Body() stateDto: AddStateDto) {
    try {
      const flow = await this.flowEngine.getFlowById(id);
      
      if (!flow) {
        throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
      }

      if (flow.states[stateDto.stateName]) {
        throw new HttpException(
          'State already exists',
          HttpStatus.CONFLICT,
        );
      }

      // Add new state
      flow.states[stateDto.stateName] = {
        type: stateDto.type,
        description: stateDto.description,
        actions: stateDto.actions,
        conditions: stateDto.conditions,
        transitions: stateDto.transitions,
        onEntry: stateDto.onEntry,
        onExit: stateDto.onExit,
      };

      // Validate updated flow
      const validation = this.validateFlow(flow);
      if (!validation.valid) {
        throw new HttpException(
          {
            message: 'Flow validation failed after adding state',
            errors: validation.errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Save flow
      await this.flowEngine.saveFlow(flow);

      this.logger.log(`✅ State added to flow ${id}: ${stateDto.stateName}`);

      return {
        success: true,
        message: 'State added successfully',
        stateName: stateDto.stateName,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to add state to flow ${id}:`, error);
      throw new HttpException(
        'Failed to add state',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update state in flow
   * PUT /api/flows/:id/states/:stateName
   */
  @Put(':id/states/:stateName')
  async updateState(
    @Param('id') id: string,
    @Param('stateName') stateName: string,
    @Body() stateDto: Partial<AddStateDto>,
  ) {
    try {
      const flow = await this.flowEngine.getFlowById(id);
      
      if (!flow) {
        throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
      }

      if (!flow.states[stateName]) {
        throw new HttpException('State not found', HttpStatus.NOT_FOUND);
      }

      // Update state
      flow.states[stateName] = {
        ...flow.states[stateName],
        ...stateDto,
      };

      // Validate updated flow
      const validation = this.validateFlow(flow);
      if (!validation.valid) {
        throw new HttpException(
          {
            message: 'Flow validation failed after updating state',
            errors: validation.errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Save flow
      await this.flowEngine.saveFlow(flow);

      this.logger.log(`✅ State updated in flow ${id}: ${stateName}`);

      return {
        success: true,
        message: 'State updated successfully',
        stateName,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to update state ${stateName} in flow ${id}:`, error);
      throw new HttpException(
        'Failed to update state',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete state from flow
   * DELETE /api/flows/:id/states/:stateName
   */
  @Delete(':id/states/:stateName')
  async deleteState(@Param('id') id: string, @Param('stateName') stateName: string) {
    try {
      const flow = await this.flowEngine.getFlowById(id);
      
      if (!flow) {
        throw new HttpException('Flow not found', HttpStatus.NOT_FOUND);
      }

      if (!flow.states[stateName]) {
        throw new HttpException('State not found', HttpStatus.NOT_FOUND);
      }

      // Prevent deleting initial state
      if (flow.initialState === stateName) {
        throw new HttpException(
          'Cannot delete initial state',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Delete state
      delete flow.states[stateName];

      // Validate updated flow
      const validation = this.validateFlow(flow);
      if (!validation.valid) {
        throw new HttpException(
          {
            message: 'Flow validation failed after deleting state',
            errors: validation.errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Save flow
      await this.flowEngine.saveFlow(flow);

      this.logger.log(`🗑️ State deleted from flow ${id}: ${stateName}`);

      return {
        success: true,
        message: 'State deleted successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to delete state ${stateName} from flow ${id}:`, error);
      throw new HttpException(
        'Failed to delete state',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List available executors
   * GET /api/executors
   */
  @Get('/executors/list')
  async listExecutors() {
    try {
      const executors = this.executorRegistry.listExecutors();
      
      return {
        success: true,
        count: executors.length,
        executors: executors.map(name => ({
          name,
          // TODO: Add executor metadata (description, config schema, etc.)
        })),
      };
    } catch (error) {
      this.logger.error('Failed to list executors:', error);
      throw new HttpException(
        'Failed to retrieve executors',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper: Validate flow definition
   */
  private validateFlow(flow: FlowDefinition): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!flow.id) errors.push('Flow ID is required');
    if (!flow.name) errors.push('Flow name is required');
    if (!flow.states || Object.keys(flow.states).length === 0) {
      errors.push('Flow must have at least one state');
    }
    if (!flow.initialState) errors.push('Initial state is required');
    if (!flow.finalStates || flow.finalStates.length === 0) {
      errors.push('Flow must have at least one final state');
    }

    // Check initial state exists
    if (flow.initialState && !flow.states[flow.initialState]) {
      errors.push(`Initial state "${flow.initialState}" does not exist`);
    }

    // Check final states exist
    if (flow.finalStates) {
      flow.finalStates.forEach(finalState => {
        if (!flow.states[finalState]) {
          errors.push(`Final state "${finalState}" does not exist`);
        }
      });
    }

    // Validate each state
    Object.entries(flow.states).forEach(([stateName, state]) => {
      // Check state type
      if (!['action', 'decision', 'end'].includes(state.type)) {
        errors.push(`State "${stateName}" has invalid type: ${state.type}`);
      }

      // Check transitions
      if (!state.transitions) {
        errors.push(`State "${stateName}" is missing transitions`);
      } else {
        Object.values(state.transitions).forEach(nextState => {
          if (nextState && !flow.states[nextState]) {
            errors.push(
              `State "${stateName}" transitions to non-existent state "${nextState}"`,
            );
          }
        });
      }

      // Check actions have valid executors
      const allActions = [
        ...(state.actions || []),
        ...(state.onEntry || []),
        ...(state.onExit || []),
      ];

      allActions.forEach((action, idx) => {
        if (!action.executor) {
          errors.push(`State "${stateName}" action ${idx} is missing executor`);
        } else if (!this.executorRegistry.hasExecutor(action.executor)) {
          warnings.push(
            `State "${stateName}" uses unknown executor: ${action.executor}`,
          );
        }
      });
    });

    // Check for unreachable states
    const reachableStates = new Set<string>([flow.initialState]);
    const queue = [flow.initialState];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const state = flow.states[current];

      if (state && state.transitions) {
        Object.values(state.transitions).forEach(nextState => {
          if (nextState && !reachableStates.has(nextState)) {
            reachableStates.add(nextState);
            queue.push(nextState);
          }
        });
      }
    }

    Object.keys(flow.states).forEach(stateName => {
      if (!reachableStates.has(stateName)) {
        warnings.push(`State "${stateName}" is unreachable`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
