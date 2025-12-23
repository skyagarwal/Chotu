import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FlowValidationService {
  private readonly logger = new Logger(FlowValidationService.name);

  async validateFlow(flow: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!flow.name) {
      errors.push('Flow name is required');
    }

    if (!flow.nodes || flow.nodes.length === 0) {
      errors.push('Flow must have at least one node');
    }

    // Validate node connections
    if (flow.edges) {
      for (const edge of flow.edges) {
        const sourceExists = flow.nodes.some((n: any) => n.id === edge.source);
        const targetExists = flow.nodes.some((n: any) => n.id === edge.target);
        
        if (!sourceExists) {
          errors.push(`Invalid edge: source node ${edge.source} not found`);
        }
        if (!targetExists) {
          errors.push(`Invalid edge: target node ${edge.target} not found`);
        }
      }
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(flow)) {
      errors.push('Flow contains circular dependency');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private hasCircularDependency(flow: any): boolean {
    // Simple cycle detection using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = flow.edges?.filter((e: any) => e.source === nodeId) || [];
      
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (hasCycle(edge.target)) {
            return true;
          }
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of flow.nodes || []) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          return true;
        }
      }
    }

    return false;
  }
}
