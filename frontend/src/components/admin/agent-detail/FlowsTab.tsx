'use client';

import { useState, useEffect } from 'react';
import { GitBranch, ToggleLeft, ToggleRight, Loader2, Plus } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import { useToast } from '@/components/shared';

interface Flow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  steps: number;
  usageCount: number;
}

interface FlowsTabProps {
  agentId: string;
  module: string;
}

export function FlowsTab({ agentId, module }: FlowsTabProps) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    loadFlows();
  }, [agentId]);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const data = await mangwaleAIClient.getAgentFlows(agentId);
      setFlows(data);
    } catch (err) {
      console.error('Failed to load flows:', err);
      // Mock data for development
      setFlows([
        {
          id: '1',
          name: 'Food Order Flow',
          description: 'Guides users through ordering food from restaurants',
          enabled: true,
          steps: 8,
          usageCount: 1456,
        },
        {
          id: '2',
          name: 'Restaurant Search Flow',
          description: 'Helps users discover restaurants based on cuisine and location',
          enabled: true,
          steps: 5,
          usageCount: 892,
        },
        {
          id: '3',
          name: 'Order Tracking Flow',
          description: 'Allows users to track their active orders',
          enabled: true,
          steps: 3,
          usageCount: 567,
        },
        {
          id: '4',
          name: 'Order Cancellation Flow',
          description: 'Handles order cancellations and refunds',
          enabled: false,
          steps: 6,
          usageCount: 123,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlow = async (flowId: string, currentState: boolean) => {
    try {
      await mangwaleAIClient.toggleFlow(flowId);
      setFlows(
        flows.map((f) => (f.id === flowId ? { ...f, enabled: !currentState } : f))
      );
      showSuccess(`Flow ${!currentState ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      showError('Failed to toggle flow');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#059211]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Flows</h2>
          <p className="text-gray-600 mt-1">
            Manage conversation flows for the {module} module
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all">
          <Plus size={20} />
          Create Flow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{flows.length}</div>
          <div className="text-sm text-gray-600">Total Flows</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-green-600">
            {flows.filter((f) => f.enabled).length}
          </div>
          <div className="text-sm text-gray-600">Active Flows</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {flows.reduce((sum, f) => sum + f.usageCount, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Usage</div>
        </div>
      </div>

      {/* Flows List */}
      <div className="space-y-4">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <GitBranch className="text-purple-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{flow.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{flow.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">
                      {flow.steps} steps
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">
                      {flow.usageCount.toLocaleString()} times used
                    </span>
                    <span className="text-gray-500">•</span>
                    <span
                      className={`font-medium ${
                        flow.enabled ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {flow.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleFlow(flow.id, flow.enabled)}
                  className={`p-2 rounded-lg transition-all ${
                    flow.enabled
                      ? 'bg-green-100 hover:bg-green-200'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  title={flow.enabled ? 'Disable flow' : 'Enable flow'}
                >
                  {flow.enabled ? (
                    <ToggleRight className="text-green-600" size={32} />
                  ) : (
                    <ToggleLeft className="text-gray-400" size={32} />
                  )}
                </button>
                <button className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-lg transition-colors font-medium">
                  Edit
                </button>
                <button className="px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all font-medium">
                  View Steps
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {flows.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <GitBranch className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No flows configured</h3>
          <p className="text-gray-600 mb-6">
            Create your first flow to guide users through conversations
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all">
            Create Your First Flow
          </button>
        </div>
      )}
    </div>
  );
}
