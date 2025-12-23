import { Injectable, Logger } from '@nestjs/common';

interface FlowNode {
  id: string;
  type: string;
  label: string;
  config: any;
  position?: { x: number; y: number };
}

interface Flow {
  id: string;
  name: string;
  module: string;
  nodes: FlowNode[];
  edges: Array<{ source: string; target: string; condition?: any }>;
  metadata?: any;
}

@Injectable()
export class FlowManagementService {
  private readonly logger = new Logger(FlowManagementService.name);
  private flows: Map<string, Flow> = new Map();

  async getFlows(module?: string): Promise<Flow[]> {
    const allFlows = Array.from(this.flows.values());
    
    if (module) {
      return allFlows.filter(flow => flow.module === module);
    }
    
    return allFlows;
  }

  async getFlow(id: string): Promise<Flow | null> {
    return this.flows.get(id) || null;
  }

  async createFlow(flowData: any): Promise<Flow> {
    const id = `flow-${Date.now()}`;
    
    const flow: Flow = {
      id,
      name: flowData.name,
      module: flowData.module || 'general',
      nodes: flowData.nodes || [],
      edges: flowData.edges || [],
      metadata: flowData.metadata || {},
    };

    this.flows.set(id, flow);
    this.logger.log(`Created flow: ${flow.name} (${id})`);

    return flow;
  }

  async updateFlow(id: string, flowData: any): Promise<Flow | null> {
    const existing = this.flows.get(id);
    if (!existing) {
      return null;
    }

    const updated: Flow = {
      ...existing,
      name: flowData.name || existing.name,
      module: flowData.module || existing.module,
      nodes: flowData.nodes || existing.nodes,
      edges: flowData.edges || existing.edges,
      metadata: { ...existing.metadata, ...flowData.metadata },
    };

    this.flows.set(id, updated);
    return updated;
  }

  async deleteFlow(id: string): Promise<boolean> {
    return this.flows.delete(id);
  }
}
