import { Controller, Get, Query, Logger } from '@nestjs/common';
import { SearchAnalyticsService } from '../services/search-analytics.service';

@Controller('search/analytics')
export class SearchAnalyticsController {
  private readonly logger = new Logger(SearchAnalyticsController.name);

  constructor(
    private readonly analyticsService: SearchAnalyticsService,
  ) {}

  @Get('stats')
  async getStats(@Query('days') days?: string) {
    const daysNum = parseInt(days || '7');
    const stats = await this.analyticsService.getStats(daysNum);
    return {
      success: true,
      data: stats,
    };
  }
}
