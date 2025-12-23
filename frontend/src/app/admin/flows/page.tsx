'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Workflow, Plus, Play, Pause, Trash2, Edit, Copy, Download, Upload } from 'lucide-react';
import { LoadingSpinner, useToast } from '@/components/shared';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { FlowCreationWizard } from '@/components/admin/flows/FlowCreationWizard';

interface Flow {
  id: string;
  name: string;
  description: string;
  module: string;
  enabled: boolean;
  steps: number;
  lastModified: Date;
  createdAt: Date;
}



export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [showWizard, setShowWizard] = useState(false);
  const toast = useToast();

  const modules = ['all', 'food', 'ecom', 'parcel', 'ride', 'health', 'rooms', 'movies', 'services'];

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const response = await mangwaleAIClient.getFlows();
      const flows = response.flows.map((flow): Flow => ({
        id: flow.id,
        name: flow.name,
        description: flow.description || '',
        module: flow.module,
        enabled: flow.enabled,
        steps: flow.stepsCount,
        lastModified: new Date(flow.updatedAt),
        createdAt: new Date(flow.createdAt),
      }));
      setFlows(flows);
      console.log(`✅ Loaded ${flows.length} flows from backend`);
    } catch (error) {
      console.error('Failed to load flows:', error);
      toast.error('Failed to load flows from backend');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlowStatus = async (flowId: string) => {
    const flow = flows.find(f => f.id === flowId);
    if (!flow) return;

    try {
      await mangwaleAIClient.toggleFlow(flowId);
      setFlows(prev => prev.map(f => 
        f.id === flowId ? { ...f, enabled: !f.enabled } : f
      ));
      toast.success(`Flow ${flow.enabled ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      console.error('Failed to toggle flow status:', error);
      toast.error('Failed to toggle flow status');
      // Revert on error
      setFlows(prev => prev.map(f => 
        f.id === flowId ? { ...f, enabled: flow.enabled } : f
      ));
    }
  };

  const deleteFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;

    try {
      await mangwaleAIClient.deleteFlow(flowId);
      setFlows(prev => prev.filter(f => f.id !== flowId));
      toast.success('Flow deleted successfully');
    } catch (error) {
      console.error('Failed to delete flow:', error);
      toast.error('Failed to delete flow');
    }
  };

  const filteredFlows = selectedModule === 'all' 
    ? flows 
    : flows.filter(f => f.module === selectedModule);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading flows..." fullPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Workflow size={32} />
              <h1 className="text-3xl font-bold">Conversation Flows</h1>
              <InfoTooltip content="Flows are structured conversation paths that guide users through specific tasks. Use flows when you need strict validation (addresses, payment) or step-by-step data collection. For flexible conversations, use AI agents instead." position="right" />
            </div>
            <p className="text-indigo-100">
              Design and manage conversation flows for your AI agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InfoTooltip content="Create a new flow by defining steps (text input, number input, choice selection), adding validation rules, and connecting to backend actions." position="left" />
            <button 
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Create Flow
            </button>
          </div>
        </div>
      </div>

      {/* Module Filter */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-700">Filter by module:</span>
            <InfoTooltip content="Each module represents a business domain: food (restaurants), ecom (shopping), parcel (delivery), ride (transportation), health (appointments), etc." />
          </div>
          {modules.map(module => (
            <button
              key={module}
              onClick={() => setSelectedModule(module)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedModule === module
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {module.charAt(0).toUpperCase() + module.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Flows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFlows.map(flow => (
          <div
            key={flow.id}
            className="bg-white rounded-xl shadow-md border-2 border-gray-100 hover:border-indigo-300 transition-all p-6"
          >
            {/* Flow Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">{flow.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    flow.enabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {flow.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded font-medium">
                  {flow.module}
                </span>
              </div>
              
              <button
                onClick={() => toggleFlowStatus(flow.id)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {flow.enabled ? (
                  <Pause size={18} className="text-orange-600" />
                ) : (
                  <Play size={18} className="text-green-600" />
                )}
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4">
              {flow.description}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-900">{flow.steps}</span> steps
              </div>
              <div className="text-gray-300">•</div>
              <div>
                Modified {flow.lastModified.toLocaleDateString()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <button 
                onClick={() => router.push(`/admin/flows/editor?id=${flow.id}`)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
              >
                <Edit size={16} />
                Edit
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Copy size={16} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Download size={16} className="text-gray-600" />
              </button>
              <button
                onClick={() => deleteFlow(flow.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} className="text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredFlows.length === 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
          <Workflow size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Flows Found</h3>
          <p className="text-gray-600 mb-6">
            {selectedModule === 'all' 
              ? 'Create your first conversation flow to get started'
              : `No flows found for ${selectedModule} module`
            }
          </p>
          <button 
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all mx-auto"
          >
            <Plus size={20} />
            Create Your First Flow
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-4 bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:border-indigo-300 transition-all"
        >
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Plus size={24} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">New Flow</div>
            <div className="text-sm text-gray-600">Create from scratch</div>
          </div>
        </button>

        <button className="flex items-center gap-4 bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:border-indigo-300 transition-all">
          <div className="p-3 bg-green-100 rounded-lg">
            <Upload size={24} className="text-green-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">Import Flow</div>
            <div className="text-sm text-gray-600">Upload JSON file</div>
          </div>
        </button>

        <button 
          onClick={async () => {
            try {
              const templates = await mangwaleAIClient.getFlowTemplates();
              console.log('Available templates:', templates);
              toast.success(`Found ${templates.length} templates: ${templates.map((t: {name: string}) => t.name).join(', ')}`);
            } catch (error) {
              console.error('Failed to load templates:', error);
              toast.error('Failed to load templates');
            }
          }}
          className="flex items-center gap-4 bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:border-indigo-300 transition-all"
        >
          <div className="p-3 bg-purple-100 rounded-lg">
            <Copy size={24} className="text-purple-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">Templates</div>
            <div className="text-sm text-gray-600">Use pre-built flows</div>
          </div>
        </button>
      </div>

      {/* Flow Creation Wizard */}
      <FlowCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={loadFlows}
      />
    </div>
  );
}
