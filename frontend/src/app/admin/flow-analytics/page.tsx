'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Activity, RefreshCw, ArrowRight } from 'lucide-react';

interface FlowStats {
  id: string;
  name: string;
  module: string;
  executionCount: number;
  completedCount: number;
  failedCount: number;
  runningCount: number;
  successRate: number;
  avgCompletionTime: number;
}

interface OverallStats {
  totalExecutions: number;
  totalCompleted: number;
  totalFailed: number;
  overallSuccessRate: number;
  avgCompletionTime: number;
  topPerformingFlows: FlowStats[];
  lowPerformingFlows: FlowStats[];
}

export default function FlowAnalyticsPage() {
  const [flowStats, setFlowStats] = useState<FlowStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'executions' | 'success' | 'time'>('executions');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all flows with stats
      const response = await fetch('http://localhost:3200/api/flows');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load flows');
      }

      const flows = data.flows || [];
      
      // Transform to stats format
      const stats: FlowStats[] = flows.map((flow: { id: string; name: string; module: string; stats?: { executionCount?: number; completedCount?: number; failedCount?: number; runningCount?: number; successRate?: number; avgCompletionTime?: number } }) => ({
        id: flow.id,
        name: flow.name,
        module: flow.module,
        executionCount: flow.stats?.executionCount || 0,
        completedCount: flow.stats?.completedCount || 0,
        failedCount: flow.stats?.failedCount || 0,
        runningCount: flow.stats?.runningCount || 0,
        successRate: flow.stats?.successRate || 0,
        avgCompletionTime: flow.stats?.avgCompletionTime || 0,
      }));

      setFlowStats(stats);

      // Calculate overall stats
      const totalExecutions = stats.reduce((sum, s) => sum + s.executionCount, 0);
      const totalCompleted = stats.reduce((sum, s) => sum + s.completedCount, 0);
      const totalFailed = stats.reduce((sum, s) => sum + s.failedCount, 0);
      const overallSuccessRate = totalExecutions > 0 ? (totalCompleted / totalExecutions) * 100 : 0;
      const avgCompletionTime = stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.avgCompletionTime, 0) / stats.length 
        : 0;

      // Get top and low performing flows (by success rate with min 10 executions)
      const activeFlows = stats.filter(s => s.executionCount >= 10);
      const sortedBySuccess = [...activeFlows].sort((a, b) => b.successRate - a.successRate);
      
      setOverallStats({
        totalExecutions,
        totalCompleted,
        totalFailed,
        overallSuccessRate: Math.round(overallSuccessRate * 10) / 10,
        avgCompletionTime: Math.round(avgCompletionTime),
        topPerformingFlows: sortedBySuccess.slice(0, 3),
        lowPerformingFlows: sortedBySuccess.slice(-3).reverse(),
      });

    } catch (err) {
      console.error('Error loading flow stats:', err);
      setError('Failed to load flow analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const sortedStats = [...flowStats].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'executions':
        comparison = a.executionCount - b.executionCount;
        break;
      case 'success':
        comparison = a.successRate - b.successRate;
        break;
      case 'time':
        comparison = a.avgCompletionTime - b.avgCompletionTime;
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateBg = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      food: 'bg-orange-100 text-orange-800',
      ecom: 'bg-blue-100 text-blue-800',
      parcel: 'bg-purple-100 text-purple-800',
      ride: 'bg-green-100 text-green-800',
      health: 'bg-red-100 text-red-800',
      rooms: 'bg-indigo-100 text-indigo-800',
      movies: 'bg-pink-100 text-pink-800',
      services: 'bg-gray-100 text-gray-800',
    };
    return colors[module] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 size={32} />
                <h1 className="text-4xl font-bold">Flow Analytics</h1>
              </div>
              <p className="text-green-100 text-lg">
                Monitor flow performance, completion rates, and identify drop-off points
              </p>
            </div>
            <button
              onClick={loadStats}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#059211] border-t-transparent rounded-full mx-auto mb-4" />
            Loading analytics...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            {overallStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-500">Total Executions</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{overallStats.totalExecutions.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-500">Completed</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{overallStats.totalCompleted.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-sm text-gray-500">Failed</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{overallStats.totalFailed.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-500">Success Rate</span>
                  </div>
                  <p className={`text-3xl font-bold ${getSuccessRateColor(overallStats.overallSuccessRate)}`}>
                    {overallStats.overallSuccessRate}%
                  </p>
                </div>
              </div>
            )}

            {/* Performance Highlights */}
            {overallStats && (overallStats.topPerformingFlows.length > 0 || overallStats.lowPerformingFlows.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Top Performing */}
                {overallStats.topPerformingFlows.length > 0 && (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Top Performing Flows
                    </h3>
                    <div className="space-y-3">
                      {overallStats.topPerformingFlows.map((flow) => (
                        <div key={flow.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{flow.name}</p>
                            <p className="text-sm text-gray-500">{flow.executionCount} executions</p>
                          </div>
                          <span className="text-lg font-bold text-green-600">{flow.successRate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Low Performing (Needs Attention) */}
                {overallStats.lowPerformingFlows.length > 0 && (
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                      Needs Attention
                    </h3>
                    <div className="space-y-3">
                      {overallStats.lowPerformingFlows.map((flow) => (
                        <div key={flow.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{flow.name}</p>
                            <p className="text-sm text-gray-500">{flow.executionCount} executions</p>
                          </div>
                          <span className={`text-lg font-bold ${getSuccessRateColor(flow.successRate)}`}>{flow.successRate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flow Stats Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">All Flows</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'executions' | 'success' | 'time')}
                    className="text-sm border rounded-lg px-2 py-1"
                  >
                    <option value="executions">Executions</option>
                    <option value="success">Success Rate</option>
                    <option value="time">Completion Time</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ArrowRight className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-90' : '-rotate-90'}`} />
                  </button>
                </div>
              </div>

              {sortedStats.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No flow execution data available yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Flow</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Module</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Executions</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Completed</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Failed</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Success Rate</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedStats.map((flow) => (
                      <tr key={flow.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{flow.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModuleColor(flow.module)}`}>
                            {flow.module}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-900">
                          {flow.executionCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-green-600 font-medium">
                          {flow.completedCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-red-600 font-medium">
                          {flow.failedCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${getSuccessRateBg(flow.successRate)}`}
                                style={{ width: `${flow.successRate}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium ${getSuccessRateColor(flow.successRate)}`}>
                              {flow.successRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(flow.avgCompletionTime)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Help Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📊 Understanding Flow Analytics</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Success Rate</strong>: Percentage of flows that completed without errors</li>
                <li>• <strong>Avg Time</strong>: Average time from flow start to completion</li>
                <li>• Flows with &lt;70% success rate are highlighted for attention</li>
                <li>• Use these metrics to identify problematic flows and optimize user experience</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
