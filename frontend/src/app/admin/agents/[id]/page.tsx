'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Activity, MessageSquare, GitBranch, TestTube, Settings, Loader2 } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import { useToast } from '@/components/shared';

// Tab components
import { OverviewTab } from '@/components/admin/agent-detail/OverviewTab';
import { ConversationsTab } from '@/components/admin/agent-detail/ConversationsTab';
import { FlowsTab } from '@/components/admin/agent-detail/FlowsTab';
import { TestAgentTab } from '@/components/admin/agent-detail/TestAgentTab';
import { ConfigurationTab } from '@/components/admin/agent-detail/ConfigurationTab';

interface Agent {
  id: string;
  name: string;
  module: string;
  icon: string;
  color: string;
  status: 'active' | 'training' | 'inactive';
  model: string;
  nluProvider: string;
  nluModel: string;
  accuracy: number;
  messagesHandled: number;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'overview' | 'conversations' | 'flows' | 'test' | 'config';

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    loadAgent();
  }, [resolvedParams.id]);

  const loadAgent = async () => {
    try {
      setLoading(true);
      const data = await mangwaleAIClient.getAgent(resolvedParams.id);
      setAgent(data as Agent);
    } catch (err) {
      showError('Failed to load agent details');
      console.error('Error loading agent:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: Activity },
    { id: 'conversations' as TabType, name: 'Conversations', icon: MessageSquare },
    { id: 'flows' as TabType, name: 'Flows', icon: GitBranch },
    { id: 'test' as TabType, name: 'Test Agent', icon: TestTube },
    { id: 'config' as TabType, name: 'Configuration', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#059211] mx-auto mb-4" />
          <p className="text-gray-600">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Agent Not Found</h2>
          <p className="text-red-600 mb-6">
            The agent you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/admin/agents')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Agents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/admin/agents')}
            className="mt-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{agent.icon}</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
                <p className="text-gray-600">Module: {agent.module}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : agent.status === 'training'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                {agent.messagesHandled.toLocaleString()} messages handled
              </span>
              <span className="text-sm text-gray-500">
                {agent.accuracy}% accuracy
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'border-[#059211] text-[#059211]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab agent={agent} onRefresh={loadAgent} />}
        {activeTab === 'conversations' && <ConversationsTab agentId={agent.id} />}
        {activeTab === 'flows' && <FlowsTab agentId={agent.id} module={agent.module} />}
        {activeTab === 'test' && <TestAgentTab agent={agent} />}
        {activeTab === 'config' && <ConfigurationTab agent={agent} onSave={loadAgent} />}
      </div>
    </div>
  );
}
