'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Play, AlertTriangle, CheckCircle, Loader2, Power, PowerOff } from 'lucide-react';
import { FlowBuilder } from '@/components/flows/FlowBuilder';
import type { Node, Edge } from '@xyflow/react';
import { useToast } from '@/components/shared';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import { 
  backendToReactFlow, 
  reactFlowToBackend, 
  validateFlow,
  type BackendFlow,
  type ReactFlowData 
} from '@/lib/utils/flowTransformer';

function FlowEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const flowId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  
  const [flowData, setFlowData] = useState<ReactFlowData | null>(null);
  const [originalFlow, setOriginalFlow] = useState<BackendFlow | null>(null);
  
  const [flowName, setFlowName] = useState('New Flow');
  const [flowDescription, setFlowDescription] = useState('');
  const [flowModule, setFlowModule] = useState('general');
  const [flowTrigger, setFlowTrigger] = useState('');
  const [flowEnabled, setFlowEnabled] = useState(true);
  
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Load flow data on mount
  useEffect(() => {
    if (flowId) {
      loadFlow(flowId);
    } else {
      setLoading(false);
    }
  }, [flowId]);

  const loadFlow = async (id: string) => {
    try {
      setLoading(true);
      const response = await mangwaleAIClient.getFlow(id) as { success: boolean; flow: BackendFlow };
      
      if (response.success && response.flow) {
        const flow = response.flow as BackendFlow;
        setOriginalFlow(flow);
        
        // Transform to React Flow format
        const reactFlowData = backendToReactFlow(flow);
        setFlowData(reactFlowData);
        
        // Set metadata
        setFlowName(flow.name);
        setFlowDescription(flow.description);
        setFlowModule(flow.module);
        setFlowTrigger(flow.trigger);
        setFlowEnabled(flow.enabled);
        
        toast.success(`Loaded flow: ${flow.name}`);
      } else {
        toast.error('Failed to load flow');
        router.push('/admin/flows');
      }
    } catch (error) {
      console.error('Failed to load flow:', error);
      toast.error('Failed to load flow');
      router.push('/admin/flows');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    try {
      setSaving(true);
      
      // Validate first
      const validation = validateFlow(nodes, edges);
      setValidationResult(validation);
      
      if (!validation.isValid) {
        toast.error(`Cannot save: ${validation.errors.join(', ')}`);
        return;
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Flow warnings:', validation.warnings);
      }
      
      // Transform to backend format
      const metadata: ReactFlowData['metadata'] = {
        id: flowId || '',
        name: flowName,
        description: flowDescription,
        module: flowModule,
        trigger: flowTrigger,
        version: originalFlow?.version || '1.0.0',
        enabled: flowEnabled,
      };
      
      const backendFlow = reactFlowToBackend(nodes, edges, metadata);
      
      console.log('Saving flow:', backendFlow);
      
      // Save to backend
      if (flowId) {
        await mangwaleAIClient.updateFlow(flowId, backendFlow);
        toast.success('Flow updated successfully!');
      } else {
        await mangwaleAIClient.createFlow({
          ...backendFlow,
          id: flowName.toLowerCase().replace(/\s+/g, '_') + '_v1',
        });
        toast.success('Flow created successfully!');
      }
      
      // Reload flow
      if (flowId) {
        await loadFlow(flowId);
      }
    } catch (error) {
      console.error('Failed to save flow:', error);
      toast.error('Failed to save flow');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!flowId) {
      toast.info('Save the flow first to test it');
      return;
    }
    
    toast.info('Opening flow simulator...');
    // TODO: Open simulator modal
  };

  const handleValidate = async (nodes: Node[], edges: Edge[]) => {
    setValidating(true);
    
    const validation = validateFlow(nodes, edges);
    setValidationResult(validation);
    
    if (validation.isValid) {
      toast.success('Flow validation passed!');
    } else {
      toast.error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    setValidating(false);
    return validation.isValid;
  };

  const handleToggleEnabled = async () => {
    if (!flowId) return;
    
    try {
      await mangwaleAIClient.toggleFlow(flowId);
      setFlowEnabled(!flowEnabled);
      toast.success(flowEnabled ? 'Flow disabled' : 'Flow enabled');
    } catch (error) {
      console.error('Failed to toggle flow:', error);
      toast.error('Failed to toggle flow');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2"
                  placeholder="Flow Name"
                />
                {flowId && (
                  <button
                    onClick={handleToggleEnabled}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      flowEnabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {flowEnabled ? <Power size={16} /> : <PowerOff size={16} />}
                    {flowEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                className="text-sm text-gray-500 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 mt-1 w-full"
                placeholder="Flow description"
              />
            </div>
          </div>
          
          {/* Metadata Inputs */}
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Module</label>
              <select
                value={flowModule}
                onChange={(e) => setFlowModule(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="parcel">Parcel</option>
                <option value="food">Food</option>
                <option value="ecommerce">E-commerce</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 block mb-1">Trigger Pattern</label>
              <input
                type="text"
                value={flowTrigger}
                onChange={(e) => setFlowTrigger(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                placeholder="keyword1|keyword2|..."
              />
            </div>
          </div>
        </div>
        
        {/* Validation Status */}
        {validationResult && (
          <div className="mt-4">
            {validationResult.isValid ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} />
                <span>Flow validation passed</span>
                {validationResult.warnings.length > 0 && (
                  <span className="text-yellow-600">
                    ({validationResult.warnings.length} warning{validationResult.warnings.length > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle size={16} />
                  <span>Validation failed:</span>
                </div>
                <ul className="list-disc list-inside text-sm text-red-600 ml-6">
                  {validationResult.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationResult.warnings.length > 0 && (
              <ul className="list-disc list-inside text-sm text-yellow-600 ml-6 mt-1">
                {validationResult.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Flow Builder */}
      <div className="flex-1">
        <FlowBuilder
          flowId={flowId || 'new-flow'}
          initialNodes={flowData?.nodes || []}
          initialEdges={flowData?.edges || []}
          onSave={handleSave}
          onTest={handleTest}
          onValidate={handleValidate}
        />
      </div>
    </div>
  );
}

export default function FlowEditorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading editor...</div>}>
      <FlowEditorContent />
    </Suspense>
  )
}
