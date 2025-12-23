import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { DatabaseOptimizationService } from '../services/database-optimization.service';

/**
 * 🚀 Database Optimization Admin Controller
 * 
 * Admin endpoints for database optimization:
 * - Performance analysis
 * - Index management
 * - Query optimization
 */
@Controller('admin/db-optimization')
export class DatabaseOptimizationController {
  constructor(
    private readonly optimizationService: DatabaseOptimizationService,
  ) {}

  /**
   * Get full optimization report
   */
  @Get('report')
  async getReport() {
    const report = await this.optimizationService.getOptimizationReport();
    return { success: true, data: report };
  }

  /**
   * Run database analysis
   */
  @Post('analyze')
  async analyze() {
    const analysis = await this.optimizationService.analyzeDatabase();
    return { success: true, data: analysis };
  }

  /**
   * Apply recommended indexes
   */
  @Post('indexes/apply')
  async applyIndexes(@Query('dryRun') dryRun: string = 'true') {
    const isDryRun = dryRun.toLowerCase() !== 'false';
    const result = await this.optimizationService.applyRecommendedIndexes(isDryRun);
    return { 
      success: true, 
      dryRun: isDryRun,
      data: result,
    };
  }

  /**
   * Vacuum tables with dead tuples
   */
  @Post('vacuum')
  async vacuum(@Query('threshold') threshold: string = '10000') {
    const vacuumed = await this.optimizationService.vacuumTables(parseInt(threshold));
    return { 
      success: true, 
      tablesVacuumed: vacuumed.length,
      tables: vacuumed,
    };
  }

  /**
   * Explain a query
   */
  @Post('explain')
  async explainQuery(@Body() body: { query: string }) {
    const plan = await this.optimizationService.explainQuery(body.query);
    return { success: true, data: plan };
  }
}
