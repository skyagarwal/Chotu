'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  MessageSquare, 
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Brain,
  Download,
} from 'lucide-react';

interface DashboardOverview {
  conversationsToday: number;
  flowRunsToday: number;
  activeUsers: number;
  newUsers: number;
  messagesProcessed: number;
  averageResponseTime: number;
  intentAccuracy: number;
  conversionRate: number;
  topDropOffStage: string;
  psychologyLift: number;
  conversationsTrend: number;
  flowRunsTrend: number;
  responseTrend: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate: number;
}

interface FunnelMetrics {
  stages: FunnelStage[];
  totalUsers: number;
  conversionRate: number;
  averageTimeToConvert: number;
  topDropOffStage: string;
  psychologyEffectiveness: {
    withTriggers: number;
    withoutTriggers: number;
    lift: number;
  };
}

interface TopIntent {
  id: string;
  name: string;
  count: number;
  category: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  p95Latency: number;
  llmProviderCount: number;
  timestamp: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [topIntents, setTopIntents] = useState<TopIntent[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = async () => {
    try {
      const [overviewRes, funnelRes, intentsRes, healthRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/overview`),
        fetch(`${API_BASE}/api/analytics/funnel`),
        fetch(`${API_BASE}/api/analytics/top-intents?limit=10`),
        fetch(`${API_BASE}/api/analytics/health`),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (funnelRes.ok) setFunnel(await funnelRes.json());
      if (intentsRes.ok) setTopIntents(await intentsRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
      
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const exportCSV = async (type: string) => {
    window.open(`${API_BASE}/api/analytics/export?type=${type}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const TrendIndicator = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(value).toFixed(1)}{suffix}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV('overview')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Health Status Bar */}
      {health && (
        <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StatusBadge status={health.status} />
            <span className="text-gray-700">System Status</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>P95 Latency: <strong>{health.p95Latency}ms</strong></span>
            <span>LLM Providers: <strong>{health.llmProviderCount}</strong></span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <MessageSquare className="w-8 h-8 text-blue-500" />
              <TrendIndicator value={overview.conversationsTrend} />
            </div>
            <p className="mt-4 text-2xl font-bold">{overview.conversationsToday}</p>
            <p className="text-sm text-gray-500">Conversations Today</p>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <Activity className="w-8 h-8 text-purple-500" />
              <TrendIndicator value={overview.flowRunsTrend} />
            </div>
            <p className="mt-4 text-2xl font-bold">{overview.flowRunsToday}</p>
            <p className="text-sm text-gray-500">Flow Runs Today</p>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-green-500" />
            </div>
            <p className="mt-4 text-2xl font-bold">{overview.activeUsers}</p>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-xs text-gray-400">+{overview.newUsers} new today</p>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
            <p className="mt-4 text-2xl font-bold">{overview.averageResponseTime}ms</p>
            <p className="text-sm text-gray-500">Avg Response Time</p>
          </div>
        </div>
      )}

      {/* AI Performance Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-6 h-6" />
              <span className="font-medium">Intent Accuracy</span>
            </div>
            <p className="text-4xl font-bold">{overview.intentAccuracy}%</p>
            <p className="text-purple-200 text-sm mt-2">
              {overview.messagesProcessed} messages classified
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-6 h-6" />
              <span className="font-medium">Conversion Rate</span>
            </div>
            <p className="text-4xl font-bold">{overview.conversionRate}%</p>
            <p className="text-green-200 text-sm mt-2">
              Drop-off at: {overview.topDropOffStage}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6" />
              <span className="font-medium">Psychology Lift</span>
            </div>
            <p className="text-4xl font-bold">+{overview.psychologyLift}%</p>
            <p className="text-orange-200 text-sm mt-2">
              Persuasion effectiveness
            </p>
          </div>
        </div>
      )}

      {/* Funnel and Intents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        {funnel && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
            <div className="space-y-3">
              {funnel.stages.map((stage, idx) => (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{stage.stage}</span>
                    <span className="text-sm text-gray-500">
                      {stage.count} ({stage.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 ? 'bg-blue-500' :
                        idx === 1 ? 'bg-purple-500' :
                        idx === 2 ? 'bg-pink-500' :
                        idx === 3 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.max(stage.percentage, 5)}%` }}
                    />
                  </div>
                  {stage.dropOffRate > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      -{stage.dropOffRate.toFixed(1)}% drop-off
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            {/* Psychology Effectiveness */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Psychology Effectiveness</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">With triggers:</span>
                  <span className="ml-2 font-medium">{funnel.psychologyEffectiveness.withTriggers}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Without:</span>
                  <span className="ml-2 font-medium">{funnel.psychologyEffectiveness.withoutTriggers}%</span>
                </div>
              </div>
              {funnel.psychologyEffectiveness.lift > 0 && (
                <p className="text-green-600 font-medium mt-2">
                  +{funnel.psychologyEffectiveness.lift}% lift from psychology triggers
                </p>
              )}
            </div>
          </div>
        )}

        {/* Top Intents */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Top Intents</h2>
          <div className="space-y-2">
            {topIntents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No intent data available</p>
            ) : (
              topIntents.map((intent, idx) => (
                <div 
                  key={intent.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                      idx === 1 ? 'bg-gray-300 text-gray-700' :
                      idx === 2 ? 'bg-orange-300 text-orange-900' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium">{intent.name.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-gray-600">{intent.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-4">
        Analytics powered by Mangwale AI • Real-time data updated every 30 seconds
      </div>
    </div>
  );
}
