'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Activity,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Clock,
  DollarSign,
  Cpu,
  BarChart3,
  Layers,
  Settings,
} from 'lucide-react';

interface DashboardMetrics {
  timestamp: string;
  totalRequests: number;
  requestsLast24h: number;
  requestsLastHour: number;
  avgRequestsPerMinute: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
  errorRate: number;
  totalErrors: number;
  featureBreakdown: Record<string, number>;
  providerUsage: Record<string, number>;
  cacheHitRate: number;
  cacheSize: number;
  estimatedCost24h: number;
  costByProvider: Record<string, number>;
}

interface ModelStats {
  totalModels: number;
  totalInferences: number;
  totalErrors: number;
  errorRate: number;
  avgLatencyMs: number;
  modelsLoaded: number;
  modelsWarmedUp: number;
  batchingEnabled: boolean;
  maxBatchSize: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  redisConnected: boolean;
  embeddingCacheSize: number;
  vlmCacheSize: number;
  searchCacheSize: number;
  genericCacheSize: number;
}

interface ExperimentStats {
  total: number;
  running: number;
  completed: number;
  withWinner: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

interface DashboardData {
  metrics: DashboardMetrics;
  models: ModelStats;
  cache: CacheStats;
  experiments: ExperimentStats;
  alerts: Alert[];
  timeSeries: {
    requests: TimeSeriesPoint[];
    latency: TimeSeriesPoint[];
    errors: TimeSeriesPoint[];
  };
}

interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  errorRate: number;
  requestCount: number;
}

export default function VisionAIDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashboardRes, providersRes] = await Promise.all([
        fetch('/api/vision/dashboard'),
        fetch('/api/vision/dashboard/providers'),
      ]);

      if (!dashboardRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await dashboardRes.json();
      setDashboardData(data);

      if (providersRes.ok) {
        const providers = await providersRes.json();
        setProviderHealth(providers.providers || []);
      }

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Vision AI');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchDashboard]);

  const handleClearCache = async () => {
    try {
      const res = await fetch('/api/vision/dashboard/cache', { method: 'DELETE' });
      if (res.ok) {
        fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/vision/dashboard/alerts/${alertId}/acknowledge`, { method: 'POST' });
      fetchDashboard();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <XCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-500 text-lg">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const metrics = dashboardData?.metrics;
  const models = dashboardData?.models;
  const cache = dashboardData?.cache;
  const experiments = dashboardData?.experiments;
  const alerts = dashboardData?.alerts || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mangwale Eyes - Vision AI Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time monitoring and analytics for the Vision AI platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="text-sm border rounded px-2 py-1"
              disabled={!autoRefresh}
            >
              <option value="10">10s</option>
              <option value="30">30s</option>
              <option value="60">1m</option>
              <option value="300">5m</option>
            </select>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{alert.message}</span>
                <span className="text-xs opacity-70">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <button
                onClick={() => handleAcknowledgeAlert(alert.id)}
                className="text-sm underline hover:no-underline"
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(metrics?.totalRequests || 0)}
              </p>
              <p className="text-xs text-gray-400">
                {formatNumber(metrics?.requestsLast24h || 0)} last 24h
              </p>
            </div>
            <Activity className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
              <p className={`text-2xl font-bold ${
                (metrics?.successRate || 0) >= 0.99 ? 'text-green-500' :
                (metrics?.successRate || 0) >= 0.95 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {((metrics?.successRate || 0) * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-400">
                {metrics?.totalErrors || 0} errors
              </p>
            </div>
            {(metrics?.successRate || 0) >= 0.95 ? (
              <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-red-500 opacity-50" />
            )}
          </div>
        </div>

        {/* Avg Latency */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Latency</p>
              <p className={`text-2xl font-bold ${
                (metrics?.avgLatencyMs || 0) <= 500 ? 'text-green-500' :
                (metrics?.avgLatencyMs || 0) <= 1000 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {formatLatency(metrics?.avgLatencyMs || 0)}
              </p>
              <p className="text-xs text-gray-400">
                P95: {formatLatency(metrics?.p95LatencyMs || 0)} | P99: {formatLatency(metrics?.p99LatencyMs || 0)}
              </p>
            </div>
            <Clock className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>

        {/* Cost */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Est. Cost (24h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCost(metrics?.estimatedCost24h || 0)}
              </p>
              <p className="text-xs text-gray-400">
                {metrics?.avgRequestsPerMinute?.toFixed(1) || 0} req/min
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Second Row - Models, Cache, Experiments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Model Performance</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Models</span>
              <span className="font-medium">{models?.totalModels || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Models Loaded</span>
              <span className="font-medium text-green-500">{models?.modelsLoaded || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Inferences</span>
              <span className="font-medium">{formatNumber(models?.totalInferences || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg Latency</span>
              <span className="font-medium">{formatLatency(models?.avgLatencyMs || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Batching</span>
              <span className={`font-medium ${models?.batchingEnabled ? 'text-green-500' : 'text-gray-400'}`}>
                {models?.batchingEnabled ? `Enabled (${models.maxBatchSize})` : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Cache Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Cache Statistics</h3>
            </div>
            <button
              onClick={handleClearCache}
              className="text-xs text-red-500 hover:underline"
            >
              Clear Cache
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Hit Rate</span>
              <span className={`font-medium ${
                (cache?.hitRate || 0) >= 0.8 ? 'text-green-500' :
                (cache?.hitRate || 0) >= 0.5 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {((cache?.hitRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Requests</span>
              <span className="font-medium">{formatNumber(cache?.totalRequests || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Hits / Misses</span>
              <span className="font-medium">
                <span className="text-green-500">{formatNumber(cache?.hits || 0)}</span>
                {' / '}
                <span className="text-red-500">{formatNumber(cache?.misses || 0)}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Redis</span>
              <span className={cache?.redisConnected ? 'text-green-500' : 'text-red-500'}>
                {cache?.redisConnected ? '● Connected' : '○ Disconnected'}
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Embeddings</span>
                <span>{formatNumber(cache?.embeddingCacheSize || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>VLM</span>
                <span>{formatNumber(cache?.vlmCacheSize || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Search</span>
                <span>{formatNumber(cache?.searchCacheSize || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* A/B Experiments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">A/B Experiments</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Experiments</span>
              <span className="font-medium">{experiments?.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Running</span>
              <span className="font-medium text-blue-500">{experiments?.running || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
              <span className="font-medium text-green-500">{experiments?.completed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">With Winner</span>
              <span className="font-medium text-purple-500">{experiments?.withWinner || 0}</span>
            </div>
          </div>
          <a 
            href="/admin/vision/ab-testing"
            className="mt-4 block text-center text-sm text-blue-500 hover:underline"
          >
            Manage Experiments →
          </a>
        </div>
      </div>

      {/* Provider Health */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">VLM Provider Health</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {providerHealth.length > 0 ? providerHealth.map((provider) => (
            <div
              key={provider.name}
              className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {provider.name}
                </span>
                <span className={`text-sm font-medium ${getStatusColor(provider.status)}`}>
                  ● {provider.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Latency</span>
                  <span>{formatLatency(provider.latency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate</span>
                  <span>{(provider.errorRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Requests</span>
                  <span>{formatNumber(provider.requestCount)}</span>
                </div>
              </div>
            </div>
          )) : (
            ['OpenRouter', 'Groq', 'Gemini', 'OpenAI'].map((name) => (
              <div
                key={name}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {name}
                  </span>
                  <span className="text-sm font-medium text-green-500">
                    ● Ready
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Latency</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate</span>
                    <span>0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Requests</span>
                    <span>0</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Feature Breakdown & Cost by Provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Feature Usage</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(metrics?.featureBreakdown || {}).length > 0 ? (
              Object.entries(metrics?.featureBreakdown || {}).map(([feature, count]) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {feature.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium">{formatNumber(count as number)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, ((count as number) / (metrics?.totalRequests || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                No feature usage data yet
              </div>
            )}
          </div>
        </div>

        {/* Cost by Provider */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Cost by Provider</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(metrics?.costByProvider || {}).map(([provider, cost]) => (
              <div key={provider} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {provider.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{formatCost(cost as number)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((cost as number) / (metrics?.estimatedCost24h || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <a
            href="/admin/vision"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Eye className="w-6 h-6 text-blue-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Compliance Check</span>
          </a>
          <a
            href="/admin/vision/employees"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Activity className="w-6 h-6 text-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Employees</span>
          </a>
          <a
            href="/admin/vision/cameras"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Server className="w-6 h-6 text-purple-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Cameras</span>
          </a>
          <a
            href="/admin/vision/counting"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <BarChart3 className="w-6 h-6 text-orange-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Object Counting</span>
          </a>
          <a
            href="/admin/vision/ab-testing"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Zap className="w-6 h-6 text-yellow-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">A/B Testing</span>
          </a>
          <a
            href="/admin/vision/playground"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Settings className="w-6 h-6 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Playground</span>
          </a>
        </div>
      </div>
    </div>
  );
}
