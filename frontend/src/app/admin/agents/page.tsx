'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, TrendingUp, Loader2 } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import { InfoTooltip } from '@/components/shared/InfoTooltip';

interface Agent {
  id: string;
  name: string;
  module: string;
  icon: string;
  color: string;
  status: string;
  model: string;
  nluProvider: string;
  accuracy: number;
  messagesHandled: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mangwaleAIClient.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents:', err);
      setError('Failed to load agents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'training': return 'text-yellow-600 bg-yellow-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#059211] mx-auto mb-4" />
          <p className="text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <h3 className="text-red-800 font-bold mb-2">Error Loading Agents</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadAgents}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Module Agents</h1>
            <InfoTooltip content="Agents are specialized AI assistants for different modules (food, parcel, e-commerce). Each agent uses NLU to understand user intent and LLM to generate responses." />
          </div>
          <p className="text-gray-600 mt-1">
            Configure and manage AI agents for each module
          </p>
        </div>
        <button
          onClick={loadAgents}
          className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-[#059211] transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {agents.filter(a => a.status === 'active').length}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            Active Agents
            <InfoTooltip content="Agents currently enabled and responding to customer messages." />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {agents.reduce((sum, a) => sum + a.messagesHandled, 0).toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            Total Messages
            <InfoTooltip content="Total number of messages handled by all agents since deployment." />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {(agents.reduce((sum, a) => sum + a.accuracy, 0) / agents.length).toFixed(1)}%
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            Avg Accuracy
            <InfoTooltip content="Average success rate across all agents. Calculated as successful conversations ÷ total conversations." />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {agents.filter(a => a.status === 'training').length}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            In Training
            <InfoTooltip content="Agents currently being retrained with new conversation data to improve accuracy." />
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/admin/agents/${agent.id}`}
            className="block bg-white rounded-xl overflow-hidden shadow-md border-2 border-gray-100 hover:border-[#059211] hover:shadow-lg transition-all group"
          >
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${agent.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-5xl">{agent.icon}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>
              <h3 className="text-lg font-bold">{agent.name}</h3>
              <p className="text-sm text-white/80 mt-1">Module: {agent.module}</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Accuracy */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <span className="text-lg font-bold text-gray-900">{agent.accuracy}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#059211] to-[#047a0e]"
                    style={{ width: `${agent.accuracy}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Messages</div>
                  <div className="font-bold text-gray-900">
                    {agent.messagesHandled.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Model</div>
                  <div className="font-mono text-xs text-gray-700">
                    {agent.model}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
                  <TrendingUp size={16} />
                  Train
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium">
                  <Settings size={16} />
                  Configure
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
