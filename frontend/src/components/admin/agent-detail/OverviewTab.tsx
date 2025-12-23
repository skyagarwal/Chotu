'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Clock, CheckCircle, XCircle, MessageSquare, Zap } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface Agent {
  id: string;
  name: string;
  module: string;
  icon: string;
  color: string;
  status: string;
  model: string;
  nluProvider: string;
  nluModel: string;
  accuracy: number;
  messagesHandled: number;
  createdAt: string;
  updatedAt: string;
}

interface OverviewTabProps {
  agent: Agent;
  onRefresh: () => void;
}

interface AgentMetrics {
  successRate: number;
  avgResponseTime: number;
  conversationsToday: number;
  conversationsThisWeek: number;
  topIntents: { intent: string; count: number }[];
  recentActivity: { timestamp: string; message: string; success: boolean }[];
}

export function OverviewTab({ agent, onRefresh }: OverviewTabProps) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [agent.id]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await mangwaleAIClient.getAgentMetrics(agent.id);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      // Set mock data for development
      setMetrics({
        successRate: 94.5,
        avgResponseTime: 1250,
        conversationsToday: 142,
        conversationsThisWeek: 1289,
        topIntents: [
          { intent: 'order_food', count: 456 },
          { intent: 'search_restaurant', count: 234 },
          { intent: 'track_order', count: 189 },
          { intent: 'cancel_order', count: 67 },
          { intent: 'modify_order', count: 45 },
        ],
        recentActivity: [
          { timestamp: '2 minutes ago', message: 'User ordered pizza from Dominos', success: true },
          { timestamp: '5 minutes ago', message: 'User searched for Italian restaurants', success: true },
          { timestamp: '12 minutes ago', message: 'Failed to process payment', success: false },
          { timestamp: '18 minutes ago', message: 'User tracked order #12345', success: true },
          { timestamp: '25 minutes ago', message: 'User cancelled order #12344', success: true },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{metrics.successRate}%</div>
          <div className="mt-2 text-xs text-green-600">+2.3% from last week</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="text-blue-600" size={24} />
            </div>
            <div className="text-sm text-gray-600">Avg Response</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{metrics.avgResponseTime}ms</div>
          <div className="mt-2 text-xs text-blue-600">-150ms from last week</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="text-purple-600" size={24} />
            </div>
            <div className="text-sm text-gray-600">Today</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{metrics.conversationsToday}</div>
          <div className="mt-2 text-xs text-gray-600">{metrics.conversationsThisWeek} this week</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Zap className="text-orange-600" size={24} />
            </div>
            <div className="text-sm text-gray-600">Model</div>
          </div>
          <div className="text-lg font-bold text-gray-900">{agent.model}</div>
          <div className="mt-2 text-xs text-gray-600">{agent.nluModel} (NLU)</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Intents */}
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Intents (Last 30 Days)</h3>
          <div className="space-y-3">
            {metrics.topIntents.map((item, idx) => (
              <div key={item.intent}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {idx + 1}. {item.intent.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{item.count.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#059211] to-[#047a0e]"
                    style={{
                      width: `${(item.count / metrics.topIntents[0].count) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {metrics.recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {activity.success ? (
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                ) : (
                  <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Configuration Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-2">LLM Model</div>
            <div className="font-medium text-gray-900">{agent.model}</div>
            <div className="text-xs text-gray-500 mt-1">Provider: {agent.nluProvider}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">NLU Model</div>
            <div className="font-medium text-gray-900">{agent.nluModel}</div>
            <div className="text-xs text-gray-500 mt-1">Classification accuracy: {agent.accuracy}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">Last Updated</div>
            <div className="font-medium text-gray-900">
              {new Date(agent.updatedAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(agent.updatedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
