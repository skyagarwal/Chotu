'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Zap, 
  TrendingUp, 
  DollarSign,
  RefreshCw,
  Trash2,
  Settings,
  BarChart3,
  Clock,
  Target
} from 'lucide-react';

interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgLatencySaved: number;
  tokensSaved: number;
  estimatedCostSaved: number;
}

interface TopQuery {
  query: string;
  hitCount: number;
  model: string;
  tokensSaved: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3200';

export default function SemanticCachePage() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState('mangwale');
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    ttlSeconds: 3600,
    maxEntries: 10000,
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/cache/stats?tenantId=${selectedTenant}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setAvailable(data.available);
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    }
  }, [selectedTenant]);

  const fetchTopQueries = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/cache/top-queries?tenantId=${selectedTenant}&limit=10`);
      const data = await response.json();
      if (data.success) {
        setTopQueries(data.queries || []);
      }
    } catch (error) {
      console.error('Failed to fetch top queries:', error);
    }
  }, [selectedTenant]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTopQueries()]);
    setLoading(false);
  }, [fetchStats, fetchTopQueries]);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const clearCache = async () => {
    if (!confirm(`Clear all cache entries for tenant "${selectedTenant}"?`)) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/cache/tenant/${selectedTenant}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        alert(`Cleared ${data.cleared} cache entries`);
        loadData();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  };

  const updateConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/cache/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.success) {
        alert('Configuration updated');
        setShowConfig(false);
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to update configuration');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-7 h-7 text-purple-600" />
            Semantic Cache
          </h1>
          <p className="text-gray-600 mt-1">
            LLM response caching for cost optimization and faster responses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="mangwale">Mangwale</option>
            <option value="default">Default</option>
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {!available && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <div className="bg-yellow-100 p-2 rounded-full">
            <Database className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-medium text-yellow-800">Cache Not Available</h3>
            <p className="text-sm text-yellow-700">
              Redis connection not established. Ensure Redis is running and REDIS_HOST is configured.
            </p>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Cache Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cache Enabled
              </label>
              <select
                value={config.enabled ? 'true' : 'false'}
                onChange={(e) => setConfig({...config, enabled: e.target.value === 'true'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TTL (seconds)
              </label>
              <input
                type="number"
                value={config.ttlSeconds}
                onChange={(e) => setConfig({...config, ttlSeconds: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Entries
              </label>
              <input
                type="number"
                value={config.maxEntries}
                onChange={(e) => setConfig({...config, maxEntries: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={updateConfig}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Save Configuration
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Entries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cached Entries</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? formatNumber(stats.totalEntries) : '-'}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Hit Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? `${(stats.hitRate * 100).toFixed(1)}%` : '-'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats ? `${formatNumber(stats.hits)} hits / ${formatNumber(stats.hits + stats.misses)} total` : ''}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Latency Saved */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Latency Saved</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? `${stats.avgLatencySaved.toFixed(0)}ms` : '-'}
              </p>
              <p className="text-xs text-gray-400 mt-1">per cached response</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Cost Saved */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Estimated Savings</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? formatCurrency(stats.estimatedCostSaved) : '-'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats ? `${formatNumber(stats.tokensSaved)} tokens saved` : ''}
              </p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Queries */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Top Cached Queries</h2>
          </div>
          <button
            onClick={clearCache}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear Cache
          </button>
        </div>
        
        {topQueries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Query
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens Saved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topQueries.map((query, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 truncate max-w-md" title={query.query}>
                        {query.query}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {query.model}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-green-600">
                        {formatNumber(query.hitCount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatNumber(query.tokensSaved)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No cached queries yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Queries with temperature=0 will be automatically cached
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
        <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          How Semantic Caching Works
        </h3>
        <ul className="text-sm text-purple-800 space-y-1.5">
          <li>• <strong>Exact Match:</strong> Identical queries (same text, model, tenant) return cached responses instantly</li>
          <li>• <strong>Cache Conditions:</strong> Only deterministic requests (temperature=0) are cached</li>
          <li>• <strong>TTL:</strong> Entries expire after {config.ttlSeconds / 3600} hours to ensure freshness</li>
          <li>• <strong>Cost Savings:</strong> Each cache hit saves ~{formatCurrency(0.002)} in API costs</li>
          <li>• <strong>Future:</strong> Semantic similarity matching coming soon (using embeddings)</li>
        </ul>
      </div>
    </div>
  );
}
