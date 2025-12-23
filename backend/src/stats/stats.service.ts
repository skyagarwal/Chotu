import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count flows
    const totalFlows = await this.prisma.flow.count();
    const activeFlows = await this.prisma.flow.count({
      where: { enabled: true },
    });

    // Count flow runs today
    const todayRuns = await this.prisma.flowRun.count({
      where: {
        startedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Calculate success rate (status = 'completed')
    const successfulRuns = await this.prisma.flowRun.count({
      where: {
        startedAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'completed',
      },
    });

    const successRate = todayRuns > 0 ? (successfulRuns / todayRuns) * 100 : 0;

    // Calculate average response time from successful runs
    const runs = await this.prisma.flowRun.findMany({
      where: {
        startedAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'completed',
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    let avgResponseTime = 0;
    if (runs.length > 0) {
      const totalTime = runs.reduce((sum, run) => {
        if (run.completedAt) {
          const duration = run.completedAt.getTime() - run.startedAt.getTime();
          return sum + duration;
        }
        return sum;
      }, 0);
      avgResponseTime = Math.round(totalTime / runs.length);
    }

    // Count messages from sessions (estimate based on flow runs)
    const messagesProcessed = todayRuns;

    return {
      totalAgents: 9, // Static for now - could count unique flow modules
      activeModels: 5, // Static for now
      todayMessages: messagesProcessed,
      todaySearches: Math.round(todayRuns * 1.5), // Estimate: 1.5 searches per conversation
      avgResponseTime,
      successRate: parseFloat(successRate.toFixed(1)),
      conversationsToday: todayRuns,
      activeFlows,
      totalFlows,
      recentActivity: await this.getRecentActivity(),
    };
  }

  async getAgentStats() {
    // Group flows by module
    const flows = await this.prisma.flow.findMany({
      select: {
        id: true,
        name: true,
        module: true,
        enabled: true,
        flowRuns: {
          select: {
            id: true,
          },
        },
      },
    });

    const agentStats = flows.map((flow) => ({
      id: `agent_${flow.module}`,
      name: `${flow.module.charAt(0).toUpperCase() + flow.module.slice(1)} Agent`,
      module: flow.module,
      status: flow.enabled ? 'active' : 'inactive',
      messagesHandled: flow.flowRuns.length,
      accuracy: Math.random() * 10 + 90, // Mock accuracy for now
    }));

    return {
      agents: agentStats,
      totalAgents: agentStats.length,
      activeAgents: agentStats.filter((a) => a.status === 'active').length,
    };
  }

  async getFlowStats() {
    const flows = await this.prisma.flow.findMany({
      include: {
        flowRuns: {
          select: {
            id: true,
          },
        },
      },
    });

    return flows.map((flow) => ({
      id: flow.id,
      name: flow.name,
      module: flow.module,
      enabled: flow.enabled,
      status: flow.status,
      totalRuns: flow.flowRuns.length,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    }));
  }

  private async getRecentActivity() {
    const recentRuns = await this.prisma.flowRun.findMany({
      take: 5,
      orderBy: {
        startedAt: 'desc',
      },
      include: {
        flow: {
          select: {
            name: true,
            module: true,
          },
        },
      },
    });

    return recentRuns.map((run) => ({
      id: run.id,
      type: run.status === 'completed' ? 'success' : 'error',
      message: `${run.flow.name} - ${run.status}`,
      time: this.getRelativeTime(run.startedAt),
      status: run.status === 'completed' ? 'success' : run.status === 'active' ? 'info' : 'error',
    }));
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  async getModuleStats(module: string) {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find flows for this module
    const flows = await this.prisma.flow.findMany({
      where: { module },
      include: {
        flowRuns: {
          select: {
            id: true,
            status: true,
            startedAt: true,
          },
        },
      },
    });

    // Calculate stats
    const totalRuns = flows.reduce((sum, flow) => sum + flow.flowRuns.length, 0);
    const completedRuns = flows.reduce(
      (sum, flow) => sum + flow.flowRuns.filter((r) => r.status === 'completed').length,
      0,
    );
    
    const todayRuns = flows.reduce(
      (sum, flow) =>
        sum +
        flow.flowRuns.filter((r) => r.startedAt >= today && r.startedAt < tomorrow).length,
      0,
    );

    const successRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

    return {
      module,
      totalConversations: totalRuns,
      conversationsToday: todayRuns,
      completedOrders: completedRuns,
      successRate: parseFloat(successRate.toFixed(1)),
      averageSatisfaction: 4.2, // Mock for now - would come from customer ratings
      activeFlows: flows.filter((f) => f.enabled).length,
      totalFlows: flows.length,
      supportedIntents: this.getModuleIntents(module),
    };
  }

  private getModuleIntents(module: string): string[] {
    const intentMap: Record<string, string[]> = {
      food: ['order_food', 'search_restaurant', 'track_order', 'cancel_order', 'get_menu'],
      parcel: ['book_delivery', 'track_parcel', 'calculate_cost', 'cancel_delivery'],
      ecom: ['search_product', 'add_to_cart', 'checkout', 'track_order', 'return_item'],
      health: ['book_appointment', 'find_doctor', 'view_prescriptions', 'cancel_appointment'],
      ride: ['book_ride', 'track_driver', 'cancel_ride', 'view_fare'],
      rooms: ['search_hotels', 'book_room', 'check_availability', 'cancel_booking'],
      movies: ['search_movies', 'book_tickets', 'view_shows', 'cancel_tickets'],
      services: ['book_service', 'find_provider', 'track_request', 'cancel_service'],
    };
    return intentMap[module] || ['general_query'];
  }
}
