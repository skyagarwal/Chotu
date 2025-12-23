'use client';

import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Wrench } from 'lucide-react';

export interface ToolNodeData extends Record<string, unknown> {
  label?: string;
  toolName?: string;
  endpoint?: string;
  method?: string;
  parameters?: Record<string, unknown>;
}

type ToolNodeType = Node<ToolNodeData>;

export function ToolNode({ data, selected }: NodeProps<ToolNodeType>) {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-[200px] shadow-md transition-all ${
      selected ? 'border-green-500 shadow-lg' : 'border-green-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-green-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Wrench className="h-4 w-4 text-green-600" />
        </div>
        <span className="font-semibold text-gray-900">
          {data.label || 'Tool Call'}
        </span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        {data.toolName && (
          <div className="flex justify-between">
            <span className="font-medium">Tool:</span>
            <span className="text-gray-900">{data.toolName}</span>
          </div>
        )}
        {data.endpoint && (
          <div className="flex justify-between">
            <span className="font-medium">Endpoint:</span>
            <span className="text-gray-900 truncate max-w-[100px]" title={data.endpoint}>
              {data.endpoint}
            </span>
          </div>
        )}
        {data.method && (
          <div className="flex justify-between">
            <span className="font-medium">Method:</span>
            <span className="text-gray-900 uppercase">{data.method}</span>
          </div>
        )}
      </div>
      
      {data.parameters && Object.keys(data.parameters).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {Object.keys(data.parameters).length} parameter(s)
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}
