import { Controller, Get, Post, Query, Param, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService, DashboardOverview, FullAnalyticsReport } from '../services/analytics.service';
import { ConversionFunnelService, FunnelMetrics } from '../services/conversion-funnel.service';
import { IntentAccuracyService, IntentAccuracyReport } from '../services/intent-accuracy.service';
import { ResponseTimeService, ResponseTimeReport } from '../services/response-time.service';
import { AlertingService } from '../services/alerting.service';

/**
 * Analytics Dashboard Controller
 * 
 * Provides REST endpoints for the analytics dashboard:
 * - Real-time overview
 * - Funnel metrics
 * - Intent accuracy
 * - Response time monitoring
 * - Alerting
 * - Export to CSV
 */
@Controller('analytics')
export class AnalyticsDashboardController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly funnelService: ConversionFunnelService,
    private readonly intentService: IntentAccuracyService,
    private readonly responseTimeService: ResponseTimeService,
    private readonly alertingService: AlertingService,
  ) {}

  /**
   * Get dashboard overview for quick glance
   */
  @Get('overview')
  async getOverview(): Promise<DashboardOverview> {
    return this.analyticsService.getDashboardOverview();
  }

  /**
   * Get full analytics report
   */
  @Get('report')
  async getFullReport(): Promise<FullAnalyticsReport> {
    return this.analyticsService.getFullReport();
  }

  /**
   * Get conversion funnel metrics
   */
  @Get('funnel')
  async getFunnel(
    @Query('range') range: 'day' | 'week' | 'month' = 'day',
  ): Promise<FunnelMetrics> {
    return this.funnelService.getFunnelMetrics(range);
  }

  /**
   * Get real-time funnel data for live dashboard
   */
  @Get('funnel/realtime')
  async getRealTimeFunnel() {
    return this.funnelService.getRealTimeFunnel();
  }

  /**
   * Get intent accuracy report
   */
  @Get('intent-accuracy')
  async getIntentAccuracy(): Promise<IntentAccuracyReport> {
    return this.intentService.getAccuracyReport();
  }

  /**
   * Get response time metrics
   */
  @Get('response-time')
  async getResponseTime(): Promise<ResponseTimeReport> {
    return this.responseTimeService.getResponseTimeReport();
  }

  /**
   * Get real-time latency for monitoring
   */
  @Get('response-time/realtime')
  async getRealTimeLatency() {
    return this.responseTimeService.getRealTimeLatency();
  }

  /**
   * Get top intents from conversation logs
   */
  @Get('top-intents')
  async getTopIntents(@Query('limit') limit: number = 10) {
    return this.analyticsService.getTopIntents(limit);
  }

  /**
   * Get hourly conversations for today
   */
  @Get('hourly-conversations')
  async getHourlyConversations() {
    return this.analyticsService.getHourlyConversations();
  }

  /**
   * Export analytics to CSV
   */
  @Get('export')
  @Header('Content-Type', 'text/csv')
  async exportCSV(
    @Query('type') type: 'overview' | 'funnel' | 'intent' | 'response_time',
    @Res() res: Response,
  ) {
    const csv = await this.analyticsService.exportToCSV(type);
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${type}-${Date.now()}.csv`);
    res.send(csv);
  }

  /**
   * Health check for monitoring systems
   */
  @Get('health')
  async getHealth() {
    const responseTime = await this.responseTimeService.getResponseTimeReport();
    const alertSummary = await this.alertingService.getAlertSummary();
    
    return {
      status: responseTime.healthStatus,
      p95Latency: responseTime.endToEnd.p95,
      llmProviderCount: responseTime.llmProviders.length,
      alerts: alertSummary,
      timestamp: new Date(),
    };
  }

  /**
   * Get all active alerts
   */
  @Get('alerts')
  async getAlerts() {
    return this.alertingService.getActiveAlerts();
  }

  /**
   * Get alert summary
   */
  @Get('alerts/summary')
  async getAlertSummary() {
    return this.alertingService.getAlertSummary();
  }

  /**
   * Acknowledge an alert
   */
  @Post('alerts/:id/acknowledge')
  async acknowledgeAlert(@Param('id') id: string) {
    const success = await this.alertingService.acknowledgeAlert(id);
    return { success, alertId: id };
  }

  /**
   * Clear an alert
   */
  @Post('alerts/:id/clear')
  async clearAlert(@Param('id') id: string) {
    const success = await this.alertingService.clearAlert(id);
    return { success, alertId: id };
  }
}
