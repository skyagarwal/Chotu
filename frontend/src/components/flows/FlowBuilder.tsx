'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus,
  Save,
  Play,
  Download,
  Upload,
  History,
  Settings,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

import { NLUNode, LLMNode, ToolNode, DecisionNode, ASRNode, TTSNode } from './nodes';

export type FlowNodeData = Record<string, unknown> & {
  label?: string;
  description?: string;
};

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

const nodeTypes = {
  nlu: NLUNode,
  llm: LLMNode,
  tool: ToolNode,
  decision: DecisionNode,
  asr: ASRNode,
  tts: TTSNode,
} as unknown as NodeTypes;

export interface FlowVersionSummary {
  id: string;
  label: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  author?: string;
  notes?: string;
}

export interface TestScenario {
  id: string;
  label: string;
  description: string;
  context?: Record<string, unknown>;
}

interface FlowBuilderProps {
  flowId?: string;
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];
  versions?: FlowVersionSummary[];
  activeVersionId?: string;
  onSave?: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  onTest?: (scenarioId?: string, nodes?: FlowNode[], edges?: FlowEdge[]) => void;
  onImport?: (payload: { nodes: FlowNode[]; edges: FlowEdge[] }) => void;
  onVersionSelect?: (versionId: string) => void;
  onValidate?: (nodes: FlowNode[], edges: FlowEdge[]) => Promise<boolean> | boolean;
  scenarios?: TestScenario[];
}

type NodePaletteKey =
  | 'nlu'
  | 'llm'
  | 'tool'
  | 'decision'
  | 'asr'
  | 'tts';

const paletteMetadata: Record<
  NodePaletteKey,
  { label: string; dotClass: string; hoverClass: string; badgeClass: string }
> = {
  nlu: {
    label: 'NLU Classifier',
    dotClass: 'bg-purple-500',
    hoverClass: 'hover:bg-purple-50',
    badgeClass: 'text-purple-600',
  },
  llm: {
    label: 'LLM Generator',
    dotClass: 'bg-blue-500',
    hoverClass: 'hover:bg-blue-50',
    badgeClass: 'text-blue-600',
  },
  tool: {
    label: 'Tool Call',
    dotClass: 'bg-green-500',
    hoverClass: 'hover:bg-green-50',
    badgeClass: 'text-green-600',
  },
  decision: {
    label: 'Decision',
    dotClass: 'bg-amber-400',
    hoverClass: 'hover:bg-amber-50',
    badgeClass: 'text-amber-600',
  },
  asr: {
    label: 'Speech-to-Text',
    dotClass: 'bg-emerald-500',
    hoverClass: 'hover:bg-emerald-50',
    badgeClass: 'text-emerald-600',
  },
  tts: {
    label: 'Text-to-Speech',
    dotClass: 'bg-orange-500',
    hoverClass: 'hover:bg-orange-50',
    badgeClass: 'text-orange-600',
  },
};

const defaultScenarios: TestScenario[] = [
  {
    id: 'new_guest',
    label: 'New Guest',
    description: 'No prior session – runs onboarding intent path',
  },
  {
    id: 'returning_customer',
    label: 'Returning Customer',
    description: 'Pre-authenticated user with past orders',
  },
  {
    id: 'parcel_booking',
    label: 'Parcel Booking',
    description: 'Parcel flow test with distance + payment nodes',
  },
];

export function FlowBuilder({
  flowId,
  initialNodes = [],
  initialEdges = [],
  versions = [],
  activeVersionId,
  onSave,
  onTest,
  onImport,
  onVersionSelect,
  onValidate,
  scenarios = defaultScenarios,
}: FlowBuilderProps) {
  const [nodes, setNodes, internalOnNodesChange] = useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initialEdges);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>(
    scenarios[0]?.id
  );
  const [validationStatus, setValidationStatus] = useState<'idle' | 'pass' | 'fail'>('idle');

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const versionsWithActiveFlag = useMemo(
    () =>
      versions.map((version) => ({
        ...version,
        isActive: version.id === activeVersionId,
      })),
    [versions, activeVersionId]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof internalOnNodesChange>[0]) => {
      internalOnNodesChange(changes);
      if (Array.isArray(changes)) {
        const removedSelectedNode = changes.some(
          (change) => change.type === 'remove' && change.id === selectedNodeId
        );
        if (removedSelectedNode) {
          setSelectedNodeId(null);
        }
      }
    },
    [internalOnNodesChange, selectedNodeId]
  );

  const addNode = useCallback(
    (type: NodePaletteKey) => {
      const newNode: FlowNode = {
        id: `${type}-${Date.now()}`,
        type,
        position: {
          x: Math.random() * 400 + 120,
          y: Math.random() * 260 + 80,
        },
        data: {
          label: paletteMetadata[type].label,
          description: '',
        },
      };

      setNodes((existing) => {
        const next = existing.map((node) => ({ ...node, selected: false }));
        next.push({ ...newNode, selected: true });
        return next;
      });
      setSelectedNodeId(newNode.id);
    },
    [setNodes]
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
    setNodes((existing) => existing.map((item) => ({ ...item, selected: item.id === node.id })));
  }, [setNodes]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setNodes((existing) => existing.map((item) => ({ ...item, selected: false })));
  }, [setNodes]);

  const handleNodeLabelChange = useCallback(
    (label: string) => {
      if (!selectedNodeId) return;
      setNodes((existing) =>
        existing.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  label,
                },
              }
            : node
        )
      );
    },
    [selectedNodeId, setNodes]
  );

  const handleNodeDescriptionChange = useCallback(
    (description: string) => {
      if (!selectedNodeId) return;
      setNodes((existing) =>
        existing.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  description,
                },
              }
            : node
        )
      );
    },
    [selectedNodeId, setNodes]
  );

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    if (onValidate) {
      const isValid = await onValidate(nodes, edges);
      setValidationStatus(isValid ? 'pass' : 'fail');
      if (!isValid) return;
    }

    onSave(nodes, edges);
  }, [onSave, onValidate, nodes, edges]);

  const handleExport = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      flowId,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(flowData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `flow-${flowId || 'export'}-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, flowId]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as { nodes: Node[]; edges: Edge[] };
        setNodes(parsed.nodes ?? []);
        setEdges(parsed.edges ?? []);
        onImport?.({ nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] });
      } catch (error) {
        console.error('Failed to import flow definition', error);
      } finally {
        event.target.value = '';
      }
    },
    [onImport, setNodes, setEdges]
  );

  const handleRunScenario = useCallback(() => {
    if (!onTest || !selectedScenarioId) return;
    onTest(selectedScenarioId, nodes, edges);
  }, [onTest, selectedScenarioId, nodes, edges]);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLibraryOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            {isLibraryOpen ? 'Hide Library' : 'Show Library'}
          </button>

          <button
            onClick={() => setIsTimelineOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors text-sm font-medium"
          >
            <History size={16} />
            Versions
          </button>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Flow ID:</span>
            <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
              {flowId || 'unsaved'}
            </span>
            {validationStatus === 'pass' && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle size={14} /> Validated
              </span>
            )}
            {validationStatus === 'fail' && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle size={14} /> Validation Failed
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:border-indigo-300 transition-colors text-sm font-medium cursor-pointer">
            <Upload size={16} />
            Import
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>

          <button
            onClick={handleRunScenario}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Play size={16} />
            Run Scenario
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Save size={16} />
            Save
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Node Library Sidebar */}
        {isLibraryOpen && (
          <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Node Library
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Drag or click to add nodes. Each node maps to a tool or prompt primitive.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {(
                Object.keys(paletteMetadata) as NodePaletteKey[]
              ).map((type) => {
                const metadata = paletteMetadata[type];
                return (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className={`w-full text-left px-3 py-2 rounded-lg border border-slate-200 ${metadata.hoverClass} transition-colors text-sm flex items-center gap-3`}
                  >
                    <span className={`w-2 h-2 rounded-full ${metadata.dotClass}`} />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700">{metadata.label}</span>
                      <span className="text-xs text-slate-500">Type: {type}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Canvas + Panels */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              className="bg-slate-50"
            >
              <Background color="#e2e8f0" gap={18} />
              <Controls position="top-right" />
              <MiniMap
                nodeColor={(node) => {
                  const map: Record<string, string> = {
                    nlu: '#a855f7',
                    llm: '#3b82f6',
                    tool: '#22c55e',
                    decision: '#f59e0b',
                    asr: '#10b981',
                    tts: '#f97316',
                  };
                  return map[node.type || 'default'] || '#6b7280';
                }}
                className="!bg-white !border-2 !border-slate-300"
              />

              <Panel position="top-left" className="bg-white/95 backdrop-blur rounded-lg p-3 shadow border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700">Nodes: {nodes.length}</div>
                <div>Connections: {edges.length}</div>
              </Panel>

              <Panel position="top-right" className="bg-white/95 backdrop-blur rounded-lg p-3 shadow border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <Settings size={14} className="text-slate-500" />
                Autolayout coming soon
              </Panel>
            </ReactFlow>
          </div>

          {/* Test Runner */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="uppercase font-semibold tracking-wide text-slate-600">
                Test Runner
              </span>
              <span>Validate flows against real scenarios before publishing.</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedScenarioId}
                onChange={(event) => setSelectedScenarioId(event.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRunScenario}
                className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Play size={16} />
                Run Scenario
              </button>
              {selectedScenarioId && (
                <span className="text-xs text-slate-500">
                  {scenarios.find((scenario) => scenario.id === selectedScenarioId)?.description}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <aside className="w-72 border-l border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Node Inspector
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure the selected node. Add input/output schemas and metadata for validation.
            </p>
          </div>

          {selectedNode ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-slate-600">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Node Label
                </label>
                <input
                  value={selectedNode.data?.label ?? ''}
                  onChange={(event) => handleNodeLabelChange(event.target.value)}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Friendly label"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Description
                </label>
                <textarea
                  value={selectedNode.data?.description ?? ''}
                  onChange={(event) => handleNodeDescriptionChange(event.target.value)}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Document the node purpose for reviewers"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Node ID
                </label>
                <div className="px-3 py-2 bg-slate-100 rounded text-xs font-mono text-slate-600 break-all">
                  {selectedNode.id}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Node Type
                </label>
                <div className="px-3 py-2 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                  {selectedNode.type}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                Input/output schema configuration will surface here once the orchestration APIs are wired.
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 px-4 text-center">
              Select a node to configure metadata, schema bindings, and validation rules.
            </div>
          )}
        </aside>
      </div>

      {/* Version Timeline Drawer */}
      {isTimelineOpen && (
        <div className="absolute inset-y-20 left-1/2 -translate-x-1/2 z-20 w-[480px] max-w-[calc(100%-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-700">Version Timeline</div>
              <p className="text-xs text-slate-500">
                Track drafts, active deployments, and archived revisions.
              </p>
            </div>
            <button
              onClick={() => setIsTimelineOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {versionsWithActiveFlag.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-500 text-center">
                No versions recorded yet. Save drafts and publish to populate the timeline.
              </div>
            )}
            {versionsWithActiveFlag.map((version) => (
              <button
                key={version.id}
                onClick={() => onVersionSelect?.(version.id)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  version.isActive
                    ? 'bg-indigo-50 border-l-4 border-indigo-500'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-slate-700">{version.label}</div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      version.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : version.status === 'draft'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {version.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(version.createdAt).toLocaleString()} · Author: {version.author ?? 'unknown'}
                </div>
                {version.notes && (
                  <div className="mt-2 text-xs text-slate-500">{version.notes}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
