import { Controller, Get, Patch, Post, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { AgentsService } from '../services/agents.service';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { TestAgentDto } from '../dto/test-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  async getAgents() {
    return this.agentsService.getAgents();
  }

  @Get(':id')
  async getAgent(@Param('id') id: string) {
    const agent = await this.agentsService.getAgent(id);
    if (!agent) {
      throw new NotFoundException(`Agent with id ${id} not found`);
    }
    return agent;
  }

  @Patch(':id')
  async updateAgent(
    @Param('id') id: string,
    @Body() updateDto: UpdateAgentDto,
  ) {
    return this.agentsService.updateAgent(id, updateDto);
  }

  @Get(':id/metrics')
  async getAgentMetrics(
    @Param('id') id: string,
    @Query('timeRange') timeRange?: string,
  ) {
    return this.agentsService.getAgentMetrics(id, timeRange || '7d');
  }

  @Get(':id/conversations')
  async getAgentConversations(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.agentsService.getAgentConversations(id, limitNum);
  }

  @Get(':id/flows')
  async getAgentFlows(@Param('id') id: string) {
    return this.agentsService.getAgentFlows(id);
  }

  @Post(':id/test')
  async testAgent(
    @Param('id') id: string,
    @Body() testDto: TestAgentDto,
  ) {
    return this.agentsService.testAgent(id, testDto.message);
  }
}
