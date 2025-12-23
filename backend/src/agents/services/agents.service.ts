import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateAgentDto } from '../dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  async getAgents() {
    // Get all flows grouped by module (each module = one agent)
    const flows = await this.prisma.flow.findMany({
      select: {
        id: true,
        name: true,
        module: true,
        enabled: true,
        status: true,
        flowRuns: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Group by module to create agents
    const agentMap = new Map<string, {
      module: string;
      flows: typeof flows;
      totalRuns: number;
      successfulRuns: number;
    }>();

    flows.forEach((flow) => {
      if (!agentMap.has(flow.module)) {
        agentMap.set(flow.module, {
          module: flow.module,
          flows: [],
          totalRuns: 0,
          successfulRuns: 0,
        });
      }

      const agent = agentMap.get(flow.module)!;
      agent.flows.push(flow);
      agent.totalRuns += flow.flowRuns.length;
      agent.successfulRuns += flow.flowRuns.filter(r => r.status === 'completed').length;
    });

    // Convert to agent array
    const agents = Array.from(agentMap.values()).map((agent) => {
      const accuracy = agent.totalRuns > 0 
        ? (agent.successfulRuns / agent.totalRuns) * 100 
        : 0;

      const icon = this.getModuleIcon(agent.module);
      const color = this.getModuleColor(agent.module);

      return {
        id: `agent_${agent.module}`,
        name: `${agent.module.charAt(0).toUpperCase() + agent.module.slice(1)} Agent`,
        module: agent.module,
        icon,
        color,
        status: agent.flows.some(f => f.enabled) ? 'active' : 'inactive',
        model: 'Llama 3 8B', // Could be dynamic based on config
        nluProvider: `nlu_${agent.module}_v1`,
        accuracy: parseFloat(accuracy.toFixed(1)),
        messagesHandled: agent.totalRuns,
        flowCount: agent.flows.length,
      };
    });

    return agents;
  }

  async getAgent(id: string) {
    const module = id.replace('agent_', '');
    
    const flows = await this.prisma.flow.findMany({
      where: { module },
      include: {
        flowRuns: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (flows.length === 0) {
      return null;
    }

    const totalRuns = flows.reduce((sum, f) => sum + f.flowRuns.length, 0);
    const successfulRuns = flows.reduce(
      (sum, f) => sum + f.flowRuns.filter(r => r.status === 'completed').length,
      0,
    );
    const accuracy = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    return {
      id,
      name: `${module.charAt(0).toUpperCase() + module.slice(1)} Agent`,
      module,
      icon: this.getModuleIcon(module),
      color: this.getModuleColor(module),
      status: flows.some(f => f.enabled) ? 'active' : 'inactive',
      model: 'Llama 3 8B',
      nluProvider: `nlu_${module}_v1`,
      nluModel: `nlu_${module}_v1`, // Added for frontend
      accuracy: parseFloat(accuracy.toFixed(1)),
      messagesHandled: totalRuns,
      confidenceThreshold: 0.7, // Default config
      maxTokens: 2048,
      temperature: 0.7,
      systemPrompt: `You are a helpful ${module} assistant for Mangwale AI.`,
      createdAt: flows[0]?.createdAt || new Date(),
      updatedAt: flows[0]?.updatedAt || new Date(),
      flows: flows.map(f => ({
        id: f.id,
        name: f.name,
        enabled: f.enabled,
        runs: f.flowRuns.length,
      })),
      recentRuns: flows.flatMap(f => f.flowRuns).slice(0, 10).map(r => ({
        id: r.id,
        flowId: r.flowId,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      })),
    };
  }

  async updateAgent(id: string, updateDto: UpdateAgentDto) {
    const module = id.replace('agent_', '');
    
    // Check if agent (module) exists
    const flows = await this.prisma.flow.findMany({
      where: { module },
    });

    if (flows.length === 0) {
      throw new NotFoundException(`Agent with id ${id} not found`);
    }

    // For now, we'll update the flows' status based on agent status
    if (updateDto.status) {
      const enabled = updateDto.status === 'active';
      await this.prisma.flow.updateMany({
        where: { module },
        data: { enabled },
      });
    }

    // Return updated agent
    return this.getAgent(id);
  }

  async getAgentMetrics(id: string, timeRange: string = '7d') {
    const module = id.replace('agent_', '');
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    if (timeRange === '24h') {
      startDate.setHours(now.getHours() - 24);
    } else if (timeRange === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(now.getDate() - 30);
    }

    const flows = await this.prisma.flow.findMany({
      where: { module },
      include: {
        flowRuns: {
          where: {
            startedAt: {
              gte: startDate,
            },
          },
        },
      },
    });

    if (flows.length === 0) {
      throw new NotFoundException(`Agent with id ${id} not found`);
    }

    // Calculate metrics
    const allRuns = flows.flatMap(f => f.flowRuns);
    const totalRuns = allRuns.length;
    const successfulRuns = allRuns.filter(r => r.status === 'completed').length;
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    // Calculate average response time
    const completedRuns = allRuns.filter(r => r.completedAt);
    const avgResponseTime = completedRuns.length > 0
      ? completedRuns.reduce((sum, r) => {
          const duration = r.completedAt!.getTime() - r.startedAt.getTime();
          return sum + duration;
        }, 0) / completedRuns.length
      : 0;

    // Today's conversations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const conversationsToday = allRuns.filter(r => r.startedAt >= todayStart).length;

    // Mock top intents for now (in production, would query conversation_messages table)
    const topIntents = [
      { intent: 'book_order', count: 145 },
      { intent: 'check_status', count: 89 },
      { intent: 'cancel_order', count: 34 },
      { intent: 'help', count: 28 },
      { intent: 'greeting', count: 156 },
    ];

    // Recent activity
    const recentActivity = allRuns.slice(0, 5).map(run => ({
      timestamp: run.startedAt.toISOString(),
      message: `Flow ${run.flowId} ${run.status}`,
      success: run.status === 'completed',
    }));

    return {
      successRate: parseFloat(successRate.toFixed(1)),
      avgResponseTime: Math.round(avgResponseTime),
      conversationsToday,
      conversationsThisWeek: totalRuns,
      topIntents,
      recentActivity,
    };
  }

  async getAgentConversations(id: string, limit: number = 50) {
    const module = id.replace('agent_', '');
    
    // Get flow runs for this module
    const flowRuns = await this.prisma.flowRun.findMany({
      where: {
        flow: {
          module,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });

    if (flowRuns.length === 0) {
      return [];
    }

    // Create conversation objects from flow runs
    // In production, would fetch actual conversation messages from conversation_messages table
    const conversations = flowRuns.map(run => {
      const duration = run.completedAt 
        ? run.completedAt.getTime() - run.startedAt.getTime()
        : 0;

      return {
        id: run.sessionId,
        userId: run.phoneNumber,
        userMessage: `User message for ${run.flowId}`,
        agentResponse: run.status === 'completed' 
          ? 'Order processed successfully!' 
          : 'Processing your request...',
        intent: 'book_order', // Would come from NLU in production
        confidence: 0.85,
        success: run.status === 'completed',
        timestamp: run.startedAt.toISOString(),
        duration,
      };
    });

    return conversations;
  }

  async getAgentFlows(id: string) {
    const module = id.replace('agent_', '');
    
    const flows = await this.prisma.flow.findMany({
      where: { module },
      include: {
        flowRuns: {
          select: {
            id: true,
          },
        },
      },
    });

    if (flows.length === 0) {
      throw new NotFoundException(`Agent with id ${id} not found`);
    }

    return flows.map(flow => ({
      id: flow.id,
      name: flow.name,
      description: flow.description || '',
      enabled: flow.enabled,
      steps: Array.isArray(flow.states) ? flow.states.length : Object.keys(flow.states || {}).length,
      usageCount: flow.flowRuns.length,
      createdAt: flow.createdAt.toISOString(),
      updatedAt: flow.updatedAt.toISOString(),
    }));
  }

  async testAgent(id: string, message: string) {
    const module = id.replace('agent_', '');
    
    // Verify agent exists
    const flows = await this.prisma.flow.findMany({
      where: { module },
    });

    if (flows.length === 0) {
      throw new NotFoundException(`Agent with id ${id} not found`);
    }

    // Simple mock response for testing
    // In production, this would call the actual NLU and LLM services
    const mockIntents = ['greeting', 'book_order', 'check_status', 'help', 'cancel_order'];
    const randomIntent = mockIntents[Math.floor(Math.random() * mockIntents.length)];
    const confidence = 0.7 + Math.random() * 0.25; // 0.7 to 0.95

    return {
      message: `This is a test response from the ${module} agent. You said: "${message}"`,
      intent: randomIntent,
      confidence: parseFloat(confidence.toFixed(2)),
    };
  }

  private getModuleIcon(module: string): string {
    const icons: Record<string, string> = {
      food: '🍕',
      ecommerce: '🛍️',
      ecom: '🛍️',
      parcel: '📦',
      ride: '🚗',
      health: '🏥',
      rooms: '🏨',
      movies: '🎬',
      services: '💼',
      payment: '💳',
      game: '🎮',
      greeting: '👋',
      help: '❓',
    };
    return icons[module.toLowerCase()] || '🤖';
  }

  private getModuleColor(module: string): string {
    const colors: Record<string, string> = {
      food: 'from-orange-500 to-red-500',
      ecommerce: 'from-blue-500 to-purple-500',
      ecom: 'from-blue-500 to-purple-500',
      parcel: 'from-green-500 to-teal-500',
      ride: 'from-yellow-500 to-orange-500',
      health: 'from-red-500 to-pink-500',
      rooms: 'from-pink-500 to-rose-500',
      movies: 'from-purple-500 to-indigo-500',
      services: 'from-indigo-500 to-blue-500',
      payment: 'from-emerald-500 to-green-500',
      game: 'from-cyan-500 to-blue-500',
      greeting: 'from-green-500 to-emerald-500',
      help: 'from-gray-500 to-slate-500',
    };
    return colors[module.toLowerCase()] || 'from-gray-500 to-gray-600';
  }
}
