'use client';

import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

export interface LLMNodeData extends Record<string, unknown> {
  label?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

type LLMNodeType = Node<LLMNodeData>;

export function LLMNode({ data, selected }: NodeProps<LLMNodeType>) {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-[200px] shadow-md transition-all ${
      selected ? 'border-blue-500 shadow-lg' : 'border-blue-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MessageSquare className="h-4 w-4 text-blue-600" />
        </div>
        <span className="font-semibold text-gray-900">
          {data.label || 'LLM Generator'}
        </span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span className="font-medium">Model:</span>
          <span className="text-gray-900">{data.modelId || 'local.vllm'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Max Tokens:</span>
          <span className="text-gray-900">{data.maxTokens || 500}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Temperature:</span>
          <span className="text-gray-900">{data.temperature || 0.7}</span>
        </div>
      </div>
      
      {data.systemPrompt && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 line-clamp-2">
            {data.systemPrompt}
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}
