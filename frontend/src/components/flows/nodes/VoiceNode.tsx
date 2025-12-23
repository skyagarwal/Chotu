'use client';

import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Mic, Volume2 } from 'lucide-react';

export interface ASRNodeData extends Record<string, unknown> {
  label?: string;
  provider?: string;
  language?: string;
  model?: string;
}

export interface TTSNodeData extends Record<string, unknown> {
  label?: string;
  provider?: string;
  voice?: string;
  language?: string;
}

type ASRNodeType = Node<ASRNodeData>;
type TTSNodeType = Node<TTSNodeData>;

export function ASRNode({ data, selected }: NodeProps<ASRNodeType>) {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-[200px] shadow-md transition-all ${
      selected ? 'border-emerald-500 shadow-lg' : 'border-emerald-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Mic className="h-4 w-4 text-emerald-600" />
        </div>
        <span className="font-semibold text-gray-900">
          {data.label || 'Speech-to-Text'}
        </span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span className="font-medium">Provider:</span>
          <span className="text-gray-900">{data.provider || 'whisper.local'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Language:</span>
          <span className="text-gray-900">{data.language || 'en-IN'}</span>
        </div>
        {data.model && (
          <div className="flex justify-between">
            <span className="font-medium">Model:</span>
            <span className="text-gray-900">{data.model}</span>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
    </div>
  );
}

export function TTSNode({ data, selected }: NodeProps<TTSNodeType>) {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-[200px] shadow-md transition-all ${
      selected ? 'border-orange-500 shadow-lg' : 'border-orange-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Volume2 className="h-4 w-4 text-orange-600" />
        </div>
        <span className="font-semibold text-gray-900">
          {data.label || 'Text-to-Speech'}
        </span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span className="font-medium">Provider:</span>
          <span className="text-gray-900">{data.provider || 'elevenlabs.indian'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Voice:</span>
          <span className="text-gray-900">{data.voice || 'default'}</span>
        </div>
        {data.language && (
          <div className="flex justify-between">
            <span className="font-medium">Language:</span>
            <span className="text-gray-900">{data.language}</span>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
    </div>
  );
}
