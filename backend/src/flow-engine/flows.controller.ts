import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FlowEngineService } from './flow-engine.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Flows REST API Controller
 * 
 * Provides HTTP endpoints for the dashboard to manage conversation flows
 */
@Controller('flows')
export class FlowsController {
  private readonly logger = new Logger(FlowsController.name);

  constructor(
    private readonly flowEngineService: FlowEngineService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /flows
   * List all flows with optional filtering
   */
  @Get()
  async getFlows(
    @Query('module') module?: string,
    @Query('enabled') enabled?: string,
  ) {
    this.logger.log(`🔍 GET /flows called - module: ${module}, enabled: ${enabled}`);
    try {
      const flows = await this.flowEngineService.getAllFlows();
      this.logger.log(`📦 Found ${flows.length} flows from database`);
      
      let filtered = flows;
      
      // Filter by module if provided
      if (module && module !== 'all') {
        filtered = filtered.filter(f => f.module === module);
      }
      
      // Filter by enabled status if provided
      if (enabled !== undefined) {
        const isEnabled = enabled === 'true';
        filtered = filtered.filter(f => f.enabled === isEnabled);
      }
      
      // Add statistics to each flow
      const flowsWithStats = await Promise.all(
        filtered.map(async (flow) => {
          const stats = await this.getFlowStats(flow.id);
          return {
            id: flow.id,
            name: flow.name,
            description: flow.description || '',
            module: flow.module || 'general',
            trigger: flow.trigger,
            enabled: flow.enabled !== false,
            systemCritical: (flow as any).systemCritical || false,
            createdAt: flow.createdAt || new Date(),
            updatedAt: flow.updatedAt || flow.createdAt || new Date(),
            stepsCount: Object.keys(flow.states || {}).length,
            ...stats,
          };
        })
      );
      
      return {
        flows: flowsWithStats,
        total: flowsWithStats.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get flows: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * GET /flows/:id
   * Get single flow by ID with full definition
   */
  @Get(':id')
  async getFlow(@Param('id') id: string) {
    try {
      const flow = await this.flowEngineService.getFlowById(id);
      
      if (!flow) {
        throw new NotFoundException(`Flow not found: ${id}`);
      }
      
      const stats = await this.getFlowStats(id);
      
      return {
        ...flow,
        ...stats,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get flow ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * POST /flows
   * Create a new flow
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFlow(@Body() data: any) {
    try {
      const flow = await (this.prisma as any).flow.create({
        data: {
          id: data.id || `flow_${Date.now()}`,
          name: data.name,
          description: data.description || null,
          module: data.module || 'general',
          trigger: data.trigger,
          states: data.states || {},
          initialState: data.initialState || 'START',
          finalStates: data.finalStates || ['END'],
          enabled: data.enabled !== false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      this.logger.log(`✅ Created flow: ${flow.id}`);
      
      return flow;
    } catch (error) {
      this.logger.error(`Failed to create flow: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create flow');
    }
  }

  /**
   * PUT /flows/:id
   * Update existing flow
   */
  @Put(':id')
  async updateFlow(@Param('id') id: string, @Body() data: any) {
    try {
      const existing = await this.flowEngineService.getFlowById(id);
      if (!existing) {
        throw new NotFoundException(`Flow not found: ${id}`);
      }
      
      const updated = await (this.prisma as any).flow.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          description: data.description ?? existing.description,
          module: data.module ?? existing.module,
          trigger: data.trigger ?? existing.trigger,
          states: data.states ?? existing.states,
          initialState: data.initialState ?? existing.initialState,
          finalStates: data.finalStates ?? existing.finalStates,
          enabled: data.enabled ?? existing.enabled,
          updatedAt: new Date(),
        },
      });
      
      this.logger.log(`✅ Updated flow: ${id}`);
      
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update flow ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update flow');
    }
  }

  /**
   * DELETE /flows/:id
   * Delete a flow (soft delete - just disable it)
   * 🔒 PROTECTED: Cannot delete critical flows
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFlow(@Param('id') id: string) {
    try {
      const existing = await this.flowEngineService.getFlowById(id);
      if (!existing) {
        throw new NotFoundException(`Flow not found: ${id}`);
      }
      
      // 🔒 CRITICAL FLOW PROTECTION
      if ((existing as any).systemCritical) {
        this.logger.warn(`🚫 Attempted to delete critical flow: ${id}`);
        throw new BadRequestException({
          error: 'CANNOT_DELETE_CRITICAL_FLOW',
          message: `Cannot delete flow "${existing.name}" - it is marked as system critical`,
          flowId: id,
          flowName: existing.name,
          hint: 'Critical flows are essential for platform operation and cannot be deleted',
        });
      }
      
      // Soft delete: disable instead of deleting
      await (this.prisma as any).flow.update({
        where: { id },
        data: {
          enabled: false,
          updatedAt: new Date(),
        },
      });
      
      this.logger.log(`✅ Deleted (disabled) flow: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to delete flow ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete flow');
    }
  }

  /**
   * PATCH /flows/:id/toggle
   * Toggle flow enabled/disabled status
   * 🔒 PROTECTED: Cannot disable critical flows
   */
  @Patch(':id/toggle')
  async toggleFlow(@Param('id') id: string) {
    try {
      const existing = await this.flowEngineService.getFlowById(id);
      if (!existing) {
        throw new NotFoundException(`Flow not found: ${id}`);
      }
      
      // 🔒 CRITICAL FLOW PROTECTION
      // Check if flow is marked as system critical
      if ((existing as any).systemCritical && existing.enabled) {
        this.logger.warn(`🚫 Attempted to disable critical flow: ${id}`);
        throw new BadRequestException({
          error: 'CANNOT_DISABLE_CRITICAL_FLOW',
          message: `Cannot disable flow "${existing.name}" - it is marked as system critical`,
          flowId: id,
          flowName: existing.name,
          hint: 'Critical flows are essential for platform operation (greeting, help, farewell)',
        });
      }
      
      const updated = await (this.prisma as any).flow.update({
        where: { id },
        data: {
          enabled: !existing.enabled,
          updatedAt: new Date(),
        },
      });
      
      this.logger.log(`✅ Toggled flow ${id}: ${updated.enabled ? 'enabled' : 'disabled'}`);
      
      return {
        id: updated.id,
        enabled: updated.enabled,
        systemCritical: (updated as any).systemCritical || false,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to toggle flow ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to toggle flow');
    }
  }

  /**
   * GET /flows/:id/stats
   * Get flow execution statistics
   */
  @Get(':id/stats')
  async getFlowStatistics(@Param('id') id: string) {
    try {
      const stats = await this.getFlowStats(id);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get stats for flow ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * GET /flows/templates
   * Get available flow templates
   */
  @Get('templates')
  async getFlowTemplates() {
    const templates = [
      {
        id: 'template_food_order',
        name: 'Food Order Flow',
        description: 'Standard flow for ordering food from a restaurant',
        module: 'food',
        steps: 5,
        states: {
          START: {
            type: 'input',
            message: 'What would you like to order?',
            next: 'CONFIRM_ORDER',
          },
          CONFIRM_ORDER: {
            type: 'choice',
            message: 'Do you want to confirm this order?',
            options: ['Yes', 'No'],
            next: {
              Yes: 'GET_ADDRESS',
              No: 'START',
            },
          },
          GET_ADDRESS: {
            type: 'location',
            message: 'Where should we deliver this?',
            next: 'PAYMENT',
          },
          PAYMENT: {
            type: 'payment',
            message: 'Please pay for your order',
            next: 'END',
          },
          END: {
            type: 'end',
            message: 'Thank you for your order!',
          },
        },
      },
      {
        id: 'template_parcel_delivery',
        name: 'Parcel Delivery Flow',
        description: 'Flow for sending a parcel from A to B',
        module: 'parcel',
        steps: 6,
        states: {
          START: {
            type: 'location',
            message: 'Where should we pick up the parcel?',
            next: 'GET_DROPOFF',
          },
          GET_DROPOFF: {
            type: 'location',
            message: 'Where should we deliver the parcel?',
            next: 'GET_SIZE',
          },
          GET_SIZE: {
            type: 'choice',
            message: 'What size is the parcel?',
            options: ['Small', 'Medium', 'Large'],
            next: 'GET_PRICE',
          },
          GET_PRICE: {
            type: 'action',
            action: 'calculate_price',
            next: 'CONFIRM_PAYMENT',
          },
          CONFIRM_PAYMENT: {
            type: 'payment',
            message: 'Please confirm payment',
            next: 'END',
          },
          END: {
            type: 'end',
            message: 'Driver is on the way!',
          },
        },
      },
      {
        id: 'template_ride_booking',
        name: 'Ride Booking Flow',
        description: 'Flow for booking a taxi or ride',
        module: 'ride',
        steps: 4,
        states: {
          START: {
            type: 'location',
            message: 'Where do you want to go?',
            next: 'CONFIRM_RIDE',
          },
          CONFIRM_RIDE: {
            type: 'choice',
            message: 'Confirm ride for $10?',
            options: ['Yes', 'No'],
            next: {
              Yes: 'FIND_DRIVER',
              No: 'START',
            },
          },
          FIND_DRIVER: {
            type: 'action',
            action: 'find_driver',
            next: 'END',
          },
          END: {
            type: 'end',
            message: 'Driver found! Arriving in 5 mins.',
          },
        },
      },
    ];

    return templates;
  }

  /**
   * Helper: Get flow statistics
   */
  private async getFlowStats(flowId: string) {
    try {
      const flowRuns = await (this.prisma as any).flowRun.findMany({
        where: { flowId },
        select: {
          status: true,
          startedAt: true,
          completedAt: true,
        },
      });

      const total = flowRuns.length;
      const completed = flowRuns.filter((r: any) => r.status === 'completed').length;
      const failed = flowRuns.filter((r: any) => r.status === 'failed').length;
      const running = flowRuns.filter((r: any) => r.status === 'running').length;
      
      // Calculate average completion time
      const completedRuns = flowRuns.filter((r: any) => r.status === 'completed' && r.completedAt);
      const avgCompletionTime = completedRuns.length > 0
        ? completedRuns.reduce((acc: number, r: any) => {
            const duration = new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime();
            return acc + duration;
          }, 0) / completedRuns.length
        : 0;
      
      const successRate = total > 0 ? (completed / total) * 100 : 0;
      
      return {
        executionCount: total,
        completedCount: completed,
        failedCount: failed,
        runningCount: running,
        successRate: Math.round(successRate * 10) / 10,
        avgCompletionTime: Math.round(avgCompletionTime),
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for ${flowId}: ${error.message}`);
      return {
        executionCount: 0,
        completedCount: 0,
        failedCount: 0,
        runningCount: 0,
        successRate: 0,
        avgCompletionTime: 0,
      };
    }
  }
}
