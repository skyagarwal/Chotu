import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { FlowManagementService } from '../services/flow-management.service';
import { FlowBuilderService } from '../services/flow-builder.service';
import { FlowExecutorService } from '../services/flow-executor.service';
import { FlowValidationService } from '../services/flow-validation.service';
import { CreateFlowDto, UpdateFlowDto, AddNodeDto, ExecuteFlowDto } from '../dto';

@Controller('flows')
export class FlowManagementController {
  private readonly logger = new Logger(FlowManagementController.name);

  constructor(
    private readonly flowManagementService: FlowManagementService,
    private readonly flowBuilderService: FlowBuilderService,
    private readonly flowExecutorService: FlowExecutorService,
    private readonly flowValidationService: FlowValidationService,
  ) {}

  @Get()
  async getFlows(@Query('module') module?: string): Promise<any> {
    return this.flowManagementService.getFlows(module);
  }

  @Get(':id')
  async getFlow(@Param('id') id: string): Promise<any> {
    return this.flowManagementService.getFlow(id);
  }

  @Post()
  async createFlow(@Body() flowData: CreateFlowDto): Promise<any> {
    this.logger.log(`Create flow: ${flowData.name}`);
    
    // Validate flow structure
    const validation = await this.flowValidationService.validateFlow(flowData);
    if (!validation.valid) {
      throw new Error(`Invalid flow: ${validation.errors.join(', ')}`);
    }

    return this.flowManagementService.createFlow(flowData);
  }

  @Put(':id')
  async updateFlow(@Param('id') id: string, @Body() flowData: UpdateFlowDto): Promise<any> {
    this.logger.log(`Update flow: ${id}`);
    
    // Validate flow structure
    const validation = await this.flowValidationService.validateFlow(flowData);
    if (!validation.valid) {
      throw new Error(`Invalid flow: ${validation.errors.join(', ')}`);
    }

    return this.flowManagementService.updateFlow(id, flowData);
  }

  @Delete(':id')
  async deleteFlow(@Param('id') id: string): Promise<any> {
    return this.flowManagementService.deleteFlow(id);
  }

  @Post(':id/execute')
  async executeFlow(
    @Param('id') id: string,
    @Body() executeDto: ExecuteFlowDto,
  ): Promise<any> {
    this.logger.log(`Execute flow: ${id}`);
    return this.flowExecutorService.executeFlow(id, executeDto.initialContext || {});
  }

  @Post(':id/validate')
  async validateFlow(@Param('id') id: string): Promise<any> {
    const flow = await this.flowManagementService.getFlow(id);
    return this.flowValidationService.validateFlow(flow);
  }

  @Get(':id/nodes')
  async getFlowNodes(@Param('id') id: string): Promise<any> {
    const flow = await this.flowManagementService.getFlow(id);
    return { nodes: flow.nodes || [] };
  }

  @Post(':id/nodes')
  async addFlowNode(
    @Param('id') id: string,
    @Body() nodeData: AddNodeDto,
  ): Promise<any> {
    return this.flowBuilderService.addNode(id, nodeData);
  }

  @Put(':id/nodes/:nodeId')
  async updateFlowNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() nodeData: any,
  ): Promise<any> {
    return this.flowBuilderService.updateNode(id, nodeId, nodeData);
  }

  @Delete(':id/nodes/:nodeId')
  async deleteFlowNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
  ): Promise<any> {
    return this.flowBuilderService.deleteNode(id, nodeId);
  }

  @Get('templates/list')
  async getFlowTemplates(): Promise<any> {
    return this.flowBuilderService.getTemplates();
  }

  @Post('templates/:templateId/instantiate')
  async instantiateTemplate(
    @Param('templateId') templateId: string,
    @Body() config: any,
  ): Promise<any> {
    return this.flowBuilderService.instantiateTemplate(templateId, config);
  }
}
