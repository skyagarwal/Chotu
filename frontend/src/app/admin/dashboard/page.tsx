'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Brain, Search, MessageSquare, TrendingUp, Activity, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import { InfoTooltip } from '@/components/shared/InfoTooltip';

interface SystemStats {
  totalAgents: number;
  activeModels: number;
  todayMessages: number;
  todaySearches: number;
  avgResponseTime: number;
  successRate: number;
  conversationsToday: number;
  activeFlows: number;
  totalFlows: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  time: string;
  status: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [serviceHealth, setServiceHealth] = useState<{
    asr: { status: string; providers: string[] };
    tts: { status: string };
    nlu: { status: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, health] = await Promise.all([
        mangwaleAIClient.getDashboardStats(),
        mangwaleAIClient.getServiceHealth(),
      ]);
      setStats({
        totalAgents: data.totalAgents,
        activeModels: data.activeModels,
        todayMessages: data.todayMessages,
        todaySearches: data.todaySearches,
        avgResponseTime: data.avgResponseTime,
        successRate: data.successRate,
        conversationsToday: data.conversationsToday,
        activeFlows: data.activeFlows,
        totalFlows: data.totalFlows,
      });
      setRecentActivity(data.recentActivity);
      setServiceHealth(health);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-[#059211]" size={48} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
        <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
        <h3 className="text-xl font-bold text-red-900 mb-2">{error || 'Failed to load dashboard'}</h3>
        <button
          onClick={loadDashboardStats}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Mangwale Admin</h1>
            <p className="text-green-100">
              Manage your AI platform, monitor performance, and configure agents
            </p>
          </div>
          <button
            onClick={loadDashboardStats}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>
      </div>

      {/* AI Services Health */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="text-[#059211]" size={20} />
          AI Services Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ASR Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${serviceHealth?.asr.status === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {serviceHealth?.asr.status === 'ok' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <div>
                <p className="font-medium text-gray-900">Speech Recognition</p>
                <p className="text-sm text-gray-500">{serviceHealth?.asr.providers.length || 0} providers active</p>
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${serviceHealth?.asr.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {serviceHealth?.asr.status === 'ok' ? 'Operational' : 'Degraded'}
            </span>
          </div>

          {/* TTS Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${serviceHealth?.tts.status === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {serviceHealth?.tts.status === 'ok' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <div>
                <p className="font-medium text-gray-900">Text to Speech</p>
                <p className="text-sm text-gray-500">Voice synthesis ready</p>
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${serviceHealth?.tts.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {serviceHealth?.tts.status === 'ok' ? 'Operational' : 'Degraded'}
            </span>
          </div>

          {/* NLU Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${serviceHealth?.nlu.status === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {serviceHealth?.nlu.status === 'ok' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <div>
                <p className="font-medium text-gray-900">NLU Engine</p>
                <p className="text-sm text-gray-500">Intent classification</p>
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${serviceHealth?.nlu.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {serviceHealth?.nlu.status === 'ok' ? 'Operational' : 'Degraded'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Agents */}
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Brain className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-500">Total Agents</span>
              <InfoTooltip content="AI agents that handle different modules like food ordering, parcel delivery, and e-commerce. Each agent is trained for specific tasks." />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.totalAgents}
          </div>
          <p className="text-sm text-gray-600">
            {stats.activeFlows} active flows
          </p>
        </div>

        {/* Active Models */}
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
              <Activity className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-500">Active Models</span>
              <InfoTooltip content="AI models currently in use, including LLMs (Large Language Models) for chat and NLU (Natural Language Understanding) models for intent classification." />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.activeModels}
          </div>
          <p className="text-sm text-gray-600">
            LLMs + NLU models
          </p>
        </div>

        {/* Today's Messages */}
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
              <MessageSquare className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-500">Messages Today</span>
              <InfoTooltip content="Total number of messages received from customers today across all channels (WhatsApp, Telegram, Web). Each conversation can contain multiple messages." />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.todayMessages.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600">
            {stats.conversationsToday} conversations
          </p>
        </div>

        {/* Today's Searches */}
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
              <Search className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-500">Searches Today</span>
              <InfoTooltip content="Product and service searches performed using semantic search. Includes food items, restaurants, parcels, and e-commerce products." />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.todaySearches.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600">
            Search queries processed
          </p>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-500">Avg Response</span>
              <InfoTooltip content="Average time in milliseconds for AI agents to respond to customer messages. Lower is better. p95 shows 95th percentile response time." />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.avgResponseTime}ms
          </div>
          <p className="text-sm text-gray-600">
            p95: 200ms
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
              <CheckCircle className="text-white" size={24} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-500">Success Rate</span>
              <InfoTooltip content="Percentage of conversations successfully completed without errors or fallbacks. >95% is excellent, 80-95% is good, <80% needs improvement." />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {stats.successRate.toFixed(1)}%
          </div>
          <p className={`text-sm ${stats.successRate >= 95 ? 'text-green-600' : stats.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
            {stats.successRate >= 95 ? '✓ Excellent' : stats.successRate >= 80 ? '⚠ Good' : '⚠ Needs improvement'}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className={`p-2 rounded-lg ${
                activity.status === 'success' ? 'bg-green-100 text-green-600' :
                activity.status === 'info' ? 'bg-blue-100 text-blue-600' :
                'bg-red-100 text-red-600'
              }`}>
                {activity.status === 'success' ? <CheckCircle size={20} /> :
                 activity.status === 'info' ? <TrendingUp size={20} /> :
                 <AlertCircle size={20} />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.message}</p>
                <p className="text-sm text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/agents"
          className="block bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] hover:shadow-lg transition-all group"
        >
          <Brain className="text-[#059211] mb-3 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Manage Agents</h3>
          <p className="text-sm text-gray-600">
            Configure and train module-specific agents
          </p>
        </Link>

        <Link
          href="/admin/search-config"
          className="block bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] hover:shadow-lg transition-all group"
        >
          <Search className="text-[#059211] mb-3 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Search Config</h3>
          <p className="text-sm text-gray-600">
            Manage OpenSearch indices and analytics
          </p>
        </Link>

        <Link
          href="/admin/webhooks"
          className="block bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] hover:shadow-lg transition-all group"
        >
          <Activity className="text-[#059211] mb-3 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Integrations</h3>
          <p className="text-sm text-gray-600">
            Configure webhooks and API keys
          </p>
        </Link>
      </div>
    </div>
  );
}
