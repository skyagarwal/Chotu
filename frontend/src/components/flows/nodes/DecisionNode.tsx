'use client';

import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export interface DecisionNodeData extends Record<string, unknown> {
  label?: string;
  condition?: string;
  branches?: Array<{ label: string; condition: string }>;
}

type DecisionNodeType = Node<DecisionNodeData>;

export function DecisionNode({ data, selected }: NodeProps<DecisionNodeType>) {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-[200px] shadow-md transition-all ${
      selected ? 'border-yellow-500 shadow-lg' : 'border-yellow-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <GitBranch className="h-4 w-4 text-yellow-600" />
        </div>
        <span className="font-semibold text-gray-900">
          {data.label || 'Decision Node'}
        </span>
      </div>
      
      {data.condition && (
        <div className="text-xs text-gray-600 mb-2">
          <div className="font-medium mb-1">Condition:</div>
          <div className="bg-gray-50 p-2 rounded border border-gray-200 font-mono text-[10px]">
            {data.condition}
          </div>
        </div>
      )}
      
      {data.branches && data.branches.length > 0 && (
        <div className="text-xs text-gray-600">
          <div className="font-medium mb-1">Branches:</div>
          <div className="space-y-1">
            {data.branches.slice(0, 3).map((branch, idx) => (
              <div key={idx} className="text-gray-900">
                • {branch.label}
              </div>
            ))}
            {data.branches.length > 3 && (
              <div className="text-gray-500">
                +{data.branches.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="true" 
        className="!bg-yellow-500"
        style={{ left: '33%' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="false" 
        className="!bg-yellow-500"
        style={{ left: '66%' }}
      />
    </div>
  );
}
