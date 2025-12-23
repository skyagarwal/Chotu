import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base-agent.service';
import { AgentType } from '../types/agent.types';

/**
 * Agent Registry
 * 
 * Central registry for all agents
 */
@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly agents = new Map<string, BaseAgent>();
  private readonly agentsByType = new Map<AgentType, BaseAgent[]>();

  /**
   * Register an agent
   */
  register(agent: BaseAgent): void {
    const config = agent.getConfig();
    this.agents.set(config.id, agent);

    // Index by type
    if (!this.agentsByType.has(config.type)) {
      this.agentsByType.set(config.type, []);
    }
    this.agentsByType.get(config.type)!.push(agent);

    this.logger.log(`Registered agent: ${config.id} (${config.type})`);
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): BaseAgent[] {
    return this.agentsByType.get(type) || [];
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent configurations
   */
  getAllConfigs() {
    return this.getAllAgents().map((agent) => agent.getConfig());
  }
}
