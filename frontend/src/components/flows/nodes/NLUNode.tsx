'use client';

import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Brain } from 'lucide-react';

export interface NLUNodeData extends Record<string, unknown> {
  label?: string;
  pipeline?: string;
  model?: string;
  threshold?: number;
}

type NLUNodeType = Node<NLUNodeData>;

export function NLUNode({ data, selected }: NodeProps<NLUNodeType>) {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-[200px] shadow-md transition-all ${
      selected ? 'border-purple-500 shadow-lg' : 'border-purple-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain className="h-4 w-4 text-purple-600" />
        </div>
        <span className="font-semibold text-gray-900">
          {data.label || 'NLU Classifier'}
        </span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span className="font-medium">Pipeline:</span>
          <span className="text-gray-900">{data.pipeline || 'default'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Model:</span>
          <span className="text-gray-900">{data.model || 'sklearn-intent'}</span>
        </div>
        {data.threshold && (
          <div className="flex justify-between">
            <span className="font-medium">Threshold:</span>
            <span className="text-gray-900">{data.threshold}</span>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  );
}
