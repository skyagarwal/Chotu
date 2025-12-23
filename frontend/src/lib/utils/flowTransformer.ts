/**
 * Flow Transformer Utilities
 * Converts between backend flow format (state machine) and React Flow format (nodes/edges)
 */

import type { Node, Edge } from '@xyflow/react';

export interface BackendFlowState {
  type: 'action' | 'wait' | 'decision' | 'end';
  description?: string;
  actions?: Array<{
    id: string;
    executor: string;
    config?: Record<string, unknown>;
    output?: string;
  }>;
  transitions: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface BackendFlow {
  id: string;
  name: string;
  description: string;
  module: string;
  trigger: string;
  version: string;
  enabled: boolean;
  initialState: string;
  finalStates: string[];
  states: Record<string, BackendFlowState>;
  metadata?: Record<string, unknown>;
}

export interface ReactFlowData {
  nodes: Node[];
  edges: Edge[];
  metadata: {
    id: string;
    name: string;
    description: string;
    module: string;
    trigger: string;
    version: string;
    enabled: boolean;
  };
}

/**
 * Convert backend flow format to React Flow format
 */
export function backendToReactFlow(flow: BackendFlow): ReactFlowData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Track positions for auto-layout
  let yPosition = 100;
  const xSpacing = 300;
  const ySpacing = 150;
  
  // Create a node for each state
  Object.entries(flow.states).forEach(([stateKey, state], index) => {
    const isInitial = stateKey === flow.initialState;
    const isFinal = flow.finalStates.includes(stateKey);
    
    // Determine node type based on state type
    let nodeType = 'default';
    if (state.type === 'action' && state.actions?.some(a => a.executor === 'llm')) {
      nodeType = 'llm';
    } else if (state.type === 'wait') {
      nodeType = 'nlu';
    } else if (state.type === 'decision') {
      nodeType = 'decision';
    } else if (state.type === 'action' && state.actions?.some(a => a.executor === 'tool')) {
      nodeType = 'tool';
    }
    
    // Calculate position in a vertical flow
    const xPosition = 400;
    yPosition = 100 + (index * ySpacing);
    
    nodes.push({
      id: stateKey,
      type: nodeType,
      position: { x: xPosition, y: yPosition },
      data: {
        label: stateKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: state.description || '',
        stateType: state.type,
        actions: state.actions || [],
        isInitial,
        isFinal,
        metadata: state.metadata || {},
      },
    });
    
    // Create edges for transitions
    Object.entries(state.transitions).forEach(([trigger, targetState]) => {
      edges.push({
        id: `${stateKey}-${trigger}-${targetState}`,
        source: stateKey,
        target: targetState,
        label: trigger,
        type: 'smoothstep',
        animated: isInitial,
      });
    });
  });
  
  return {
    nodes,
    edges,
    metadata: {
      id: flow.id,
      name: flow.name,
      description: flow.description,
      module: flow.module,
      trigger: flow.trigger,
      version: flow.version,
      enabled: flow.enabled,
    },
  };
}

/**
 * Convert React Flow format back to backend flow format
 */
export function reactFlowToBackend(
  nodes: Node[],
  edges: Edge[],
  metadata: ReactFlowData['metadata']
): Partial<BackendFlow> {
  const states: Record<string, BackendFlowState> = {};
  
  // Find initial and final states
  const initialNode = nodes.find(n => n.data.isInitial);
  const finalNodes = nodes.filter(n => n.data.isFinal);
  
  // Convert each node to a state
  nodes.forEach(node => {
    const transitions: Record<string, string> = {};
    
    // Find all edges from this node
    const outgoingEdges = edges.filter(e => e.source === node.id);
    outgoingEdges.forEach(edge => {
      const trigger = edge.label as string || 'default';
      transitions[trigger] = edge.target;
    });
    
    states[node.id] = {
      type: node.data.stateType as 'action' | 'wait' | 'decision' | 'end',
      description: node.data.description as string || '',
      actions: node.data.actions as BackendFlowState['actions'] || [],
      transitions,
      metadata: node.data.metadata as Record<string, unknown> || {},
    };
  });
  
  return {
    name: metadata.name,
    description: metadata.description,
    module: metadata.module,
    trigger: metadata.trigger,
    version: metadata.version,
    enabled: metadata.enabled,
    initialState: initialNode?.id || Object.keys(states)[0],
    finalStates: finalNodes.map(n => n.id),
    states,
  };
}

/**
 * Validate flow structure
 */
export function validateFlow(nodes: Node[], edges: Edge[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for at least one node
  if (nodes.length === 0) {
    errors.push('Flow must have at least one state');
  }
  
  // Check for initial state
  const initialNodes = nodes.filter(n => n.data.isInitial);
  if (initialNodes.length === 0) {
    errors.push('Flow must have an initial state');
  } else if (initialNodes.length > 1) {
    errors.push('Flow can only have one initial state');
  }
  
  // Check for final state
  const finalNodes = nodes.filter(n => n.data.isFinal);
  if (finalNodes.length === 0) {
    warnings.push('Flow should have at least one final state');
  }
  
  // Check for unreachable nodes
  const reachableNodes = new Set<string>();
  const initialNode = initialNodes[0];
  
  if (initialNode) {
    const queue = [initialNode.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachableNodes.has(current)) continue;
      
      reachableNodes.add(current);
      const outgoing = edges.filter(e => e.source === current);
      outgoing.forEach(e => queue.push(e.target));
    }
    
    nodes.forEach(node => {
      if (!reachableNodes.has(node.id) && node.id !== initialNode.id) {
        warnings.push(`State "${node.data.label}" is unreachable`);
      }
    });
  }
  
  // Check for nodes without transitions (except final states)
  nodes.forEach(node => {
    if (!node.data.isFinal) {
      const hasOutgoing = edges.some(e => e.source === node.id);
      if (!hasOutgoing) {
        warnings.push(`State "${node.data.label}" has no transitions (should be marked as final)`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
