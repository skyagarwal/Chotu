import { Controller, Get, Param } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.statsService.getDashboardStats();
  }

  @Get('agents')
  async getAgentStats() {
    return this.statsService.getAgentStats();
  }

  @Get('flows')
  async getFlowStats() {
    return this.statsService.getFlowStats();
  }

  @Get('modules/:module')
  async getModuleStats(@Param('module') module: string) {
    return this.statsService.getModuleStats(module);
  }
}
