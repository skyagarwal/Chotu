import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface UsageTrackingData {
  modelId: string;
  modelName?: string;
  provider: string;
  userId?: string;
  sessionId?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  cost: number;
  purpose?: string;
  channel?: string;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  metadata?: any;
}

export interface UsageAnalytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  topModels: Array<{ modelId: string; count: number; cost: number }>;
  topProviders: Array<{ provider: string; count: number; cost: number }>;
}

@Injectable()
export class LlmUsageTrackingService {
  private readonly logger = new Logger(LlmUsageTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track a single LLM usage event
   */
  async trackUsage(data: UsageTrackingData): Promise<void> {
    try {
      await this.prisma.llmModelUsage.create({
        data: {
          modelId: data.modelId,
          modelName: data.modelName,
          provider: data.provider,
          userId: data.userId,
          sessionId: data.sessionId,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          latencyMs: data.latencyMs,
          cost: data.cost,
          purpose: data.purpose,
          channel: data.channel,
          status: data.status,
          errorMessage: data.errorMessage,
          metadata: data.metadata || {},
        },
      });

      this.logger.log(
        `Tracked usage for ${data.modelId} (${data.provider}): ${data.totalTokens} tokens, ${data.latencyMs}ms, $${data.cost}`,
      );
    } catch (error) {
      this.logger.error(`Failed to track usage: ${error.message}`, error.stack);
      // Don't throw - usage tracking should not break the main flow
    }
  }

  /**
   * Get usage statistics for a specific user
   */
  async getUserUsage(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UsageAnalytics> {
    const whereClause: any = { userId };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [stats, topModels, topProviders] = await Promise.all([
      this.prisma.llmModelUsage.aggregate({
        where: whereClause,
        _count: true,
        _sum: {
          totalTokens: true,
          cost: true,
          latencyMs: true,
        },
      }),
      this.prisma.llmModelUsage.groupBy({
        by: ['modelId'],
        where: whereClause,
        _count: true,
        _sum: { cost: true },
        orderBy: { _count: { modelId: 'desc' } },
        take: 10,
      }),
      this.prisma.llmModelUsage.groupBy({
        by: ['provider'],
        where: whereClause,
        _count: true,
        _sum: { cost: true },
        orderBy: { _count: { provider: 'desc' } },
        take: 10,
      }),
    ]);

    const successfulRequests = await this.prisma.llmModelUsage.count({
      where: { ...whereClause, status: 'success' },
    });

    const failedRequests = await this.prisma.llmModelUsage.count({
      where: { ...whereClause, status: { in: ['error', 'timeout'] } },
    });

    return {
      totalRequests: stats._count || 0,
      successfulRequests,
      failedRequests,
      totalTokens: stats._sum.totalTokens || 0,
      totalCost: Number(stats._sum.cost) || 0,
      averageLatency:
        stats._count > 0 ? (stats._sum.latencyMs || 0) / stats._count : 0,
      topModels: topModels.map((m) => ({
        modelId: m.modelId,
        count: m._count,
        cost: Number(m._sum.cost) || 0,
      })),
      topProviders: topProviders.map((p) => ({
        provider: p.provider,
        count: p._count,
        cost: Number(p._sum.cost) || 0,
      })),
    };
  }

  /**
   * Get usage statistics for a specific model
   */
  async getModelUsageStats(
    modelId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRequests: number;
    successRate: number;
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
  }> {
    const whereClause: any = { modelId };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [stats, successCount] = await Promise.all([
      this.prisma.llmModelUsage.aggregate({
        where: whereClause,
        _count: true,
        _sum: {
          totalTokens: true,
          cost: true,
          latencyMs: true,
        },
      }),
      this.prisma.llmModelUsage.count({
        where: { ...whereClause, status: 'success' },
      }),
    ]);

    const totalRequests = stats._count || 0;

    return {
      totalRequests,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
      totalTokens: stats._sum.totalTokens || 0,
      totalCost: Number(stats._sum.cost) || 0,
      averageLatency: totalRequests > 0 ? (stats._sum.latencyMs || 0) / totalRequests : 0,
    };
  }

  /**
   * Get usage statistics for a specific provider
   */
  async getProviderUsageStats(
    provider: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRequests: number;
    successRate: number;
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
    topModels: Array<{ modelId: string; count: number }>;
  }> {
    const whereClause: any = { provider };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [stats, successCount, topModels] = await Promise.all([
      this.prisma.llmModelUsage.aggregate({
        where: whereClause,
        _count: true,
        _sum: {
          totalTokens: true,
          cost: true,
          latencyMs: true,
        },
      }),
      this.prisma.llmModelUsage.count({
        where: { ...whereClause, status: 'success' },
      }),
      this.prisma.llmModelUsage.groupBy({
        by: ['modelId'],
        where: whereClause,
        _count: true,
        orderBy: { _count: { modelId: 'desc' } },
        take: 10,
      }),
    ]);

    const totalRequests = stats._count || 0;

    return {
      totalRequests,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
      totalTokens: stats._sum.totalTokens || 0,
      totalCost: Number(stats._sum.cost) || 0,
      averageLatency: totalRequests > 0 ? (stats._sum.latencyMs || 0) / totalRequests : 0,
      topModels: topModels.map((m) => ({
        modelId: m.modelId,
        count: m._count,
      })),
    };
  }

  /**
   * Get overall cost analytics with grouping
   */
  async getCostAnalytics(
    groupBy: 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    Array<{
      date: string;
      totalCost: number;
      totalRequests: number;
      totalTokens: number;
    }>
  > {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    // PostgreSQL date truncation based on groupBy
    const truncFunction =
      groupBy === 'day'
        ? 'DATE(created_at)'
        : groupBy === 'week'
          ? "DATE_TRUNC('week', created_at)"
          : "DATE_TRUNC('month', created_at)";

    // @ts-ignore - Prisma queryRawUnsafe type inference issue
    const results = await this.prisma.$queryRawUnsafe(`
      SELECT 
        ${truncFunction} as date,
        SUM(cost)::DECIMAL as total_cost,
        COUNT(*)::INT as total_requests,
        SUM(total_tokens)::INT as totalTokens
      FROM llm_model_usage
      ${startDate || endDate ? 'WHERE' : ''}
      ${startDate ? `created_at >= '${startDate.toISOString()}'` : ''}
      ${startDate && endDate ? 'AND' : ''}
      ${endDate ? `created_at <= '${endDate.toISOString()}'` : ''}
      GROUP BY ${truncFunction}
      ORDER BY date DESC
      LIMIT 100
    `) as any;

    return results.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      totalCost: Number(r.total_cost),
      totalRequests: Number(r.total_requests),
      totalTokens: Number(r.totalTokens),
    }));
  }

  /**
   * Get top models by usage count
   */
  async getPopularModels(limit = 10, startDate?: Date, endDate?: Date) {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    // @ts-ignore - Prisma groupBy type inference issue
    const results = await this.prisma.llmModelUsage.groupBy({
      by: ['modelId', 'modelName', 'provider'],
      where: whereClause as any,
      _count: true,
      _sum: {
        cost: true,
        totalTokens: true,
      },
      orderBy: {
        _count: {
          modelId: 'desc',
        },
      },
      take: limit,
    });

    return results.map((r) => ({
      modelId: r.modelId,
      model_name: r.modelName,
      provider: r.provider,
      usageCount: r._count,
      totalCost: Number(r._sum.cost) || 0,
      totalTokens: r._sum.totalTokens || 0,
    }));
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [overall, byProvider] = await Promise.all([
      this.prisma.llmModelUsage.aggregate({
        where: whereClause,
        _count: true,
        _avg: {
          latencyMs: true,
        },
        _min: {
          latencyMs: true,
        },
        _max: {
          latencyMs: true,
        },
      }),
      this.prisma.llmModelUsage.groupBy({
        by: ['provider'],
        where: whereClause,
        _count: true,
        _avg: {
          latencyMs: true,
        },
      }),
    ]);

    const successCount = await this.prisma.llmModelUsage.count({
      where: { ...whereClause, status: 'success' },
    });

    const errorCount = await this.prisma.llmModelUsage.count({
      where: { ...whereClause, status: 'error' },
    });

    const timeoutCount = await this.prisma.llmModelUsage.count({
      where: { ...whereClause, status: 'timeout' },
    });

    return {
      totalRequests: overall._count || 0,
      successCount,
      errorCount,
      timeoutCount,
      successRate:
        overall._count > 0 ? (successCount / overall._count) * 100 : 0,
      averageLatency: overall._avg.latencyMs || 0,
      minLatency: overall._min.latencyMs || 0,
      maxLatency: overall._max.latencyMs || 0,
      providerPerformance: byProvider.map((p) => ({
        provider: p.provider,
        requestCount: p._count,
        averageLatency: p._avg.latencyMs || 0,
      })),
    };
  }

  /**
   * Get recent usage records (for failover status)
   */
  async getRecentUsage(limit: number = 1000): Promise<any[]> {
    try {
      return await this.prisma.llmModelUsage.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get recent usage: ${error.message}`);
      return [];
    }
  }
}
