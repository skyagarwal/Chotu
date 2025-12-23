'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, DollarSign, Zap, CheckCircle, XCircle,
  Clock, BarChart3, PieChart, Activity, RefreshCw,
  Calendar
} from 'lucide-react';
import { llmApi, UsageAnalytics } from '@/lib/api/llm';

export default function LlmAnalyticsPage() {
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const data = await llmApi.getUsageAnalytics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LLM Analytics</h1>
          <p className="text-gray-600 mt-1">
            Monitor usage, costs, and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex gap-2 bg-white border-2 border-gray-200 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-[#059211] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range === '7d' && 'Last 7 Days'}
                {range === '30d' && 'Last 30 Days'}
                {range === '90d' && 'Last 90 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="animate-spin mx-auto mb-4 text-[#059211]" size={48} />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && analytics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Requests */}
            <div className="bg-white rounded-lg p-6 border-2 border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="text-blue-600" size={24} />
                </div>
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatNumber(analytics.performance.totalRequests)}
              </div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </div>

            {/* Success Rate */}
            <div className="bg-white rounded-lg p-6 border-2 border-green-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {analytics.performance.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="mt-2 text-xs text-gray-500">
                {formatNumber(analytics.performance.successCount)} successful
              </div>
            </div>

            {/* Total Cost */}
            <div className="bg-white rounded-lg p-6 border-2 border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="text-purple-600" size={24} />
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {formatCurrency(
                  analytics.costTrends.reduce((sum, day) => sum + day.totalCost, 0)
                )}
              </div>
              <div className="text-sm text-gray-600">Total Cost</div>
            </div>

            {/* Average Latency */}
            <div className="bg-white rounded-lg p-6 border-2 border-orange-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="text-orange-600" size={24} />
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {analytics.performance.averageLatency.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">Avg Latency</div>
              <div className="mt-2 text-xs text-gray-500">
                Min: {analytics.performance.minLatency}ms, 
                Max: {analytics.performance.maxLatency}ms
              </div>
            </div>
          </div>

          {/* Error Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(analytics.performance.successCount)}
                  </div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <CheckCircle className="text-green-600" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatNumber(analytics.performance.errorCount)}
                  </div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
                <XCircle className="text-red-600" size={32} />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatNumber(analytics.performance.timeoutCount)}
                  </div>
                  <div className="text-sm text-gray-600">Timeouts</div>
                </div>
                <Clock className="text-yellow-600" size={32} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Trends */}
            <div className="bg-white rounded-lg p-6 border-2 border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-gray-400" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Cost Trends</h2>
                </div>
                <DollarSign className="text-purple-600" size={20} />
              </div>

              {analytics.costTrends.length > 0 ? (
                <div className="space-y-2">
                  {analytics.costTrends.slice(0, 10).map((day) => {
                    const maxCost = Math.max(...analytics.costTrends.map(d => d.totalCost));
                    const percentage = maxCost > 0 ? (day.totalCost / maxCost) * 100 : 0;
                    
                    return (
                      <div key={day.date} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(day.totalCost)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatNumber(day.totalRequests)} requests</span>
                          <span>{formatNumber(day.totalTokens)} tokens</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No cost data available
                </div>
              )}
            </div>

            {/* Popular Models */}
            <div className="bg-white rounded-lg p-6 border-2 border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <PieChart className="text-gray-400" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Popular Models</h2>
                </div>
                <Activity className="text-blue-600" size={20} />
              </div>

              {analytics.popularModels.length > 0 ? (
                <div className="space-y-3">
                  {analytics.popularModels.slice(0, 8).map((model) => {
                    const maxUsage = analytics.popularModels[0]?.usageCount || 1;
                    const percentage = (model.usageCount / maxUsage) * 100;
                    
                    return (
                      <div key={model.modelId} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate">
                              {model.modelName || model.modelId}
                            </div>
                            <div className="text-xs text-gray-500">
                              {model.provider}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-bold text-gray-900">
                              {formatNumber(model.usageCount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(model.totalCost)}
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No usage data available
                </div>
              )}
            </div>
          </div>

          {/* Provider Performance */}
          <div className="bg-white rounded-lg p-6 border-2 border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="text-gray-400" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Provider Performance</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-3 px-4 font-bold text-gray-700">Provider</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Requests</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Avg Latency</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.performance.providerPerformance
                    .sort((a, b) => b.requestCount - a.requestCount)
                    .map((provider) => {
                      const totalRequests = analytics.performance.providerPerformance
                        .reduce((sum, p) => sum + p.requestCount, 0);
                      const sharePercentage = totalRequests > 0
                        ? ((provider.requestCount / totalRequests) * 100).toFixed(1)
                        : '0';

                      return (
                        <tr key={provider.provider} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900 capitalize">
                              {provider.provider}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4 font-medium text-gray-900">
                            {formatNumber(provider.requestCount)}
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                              provider.averageLatency < 1000
                                ? 'bg-green-100 text-green-700'
                                : provider.averageLatency < 2000
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {provider.averageLatency.toFixed(0)}ms
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-[#059211] to-[#047a0e] h-2 rounded-full"
                                  style={{ width: `${sharePercentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700 w-12">
                                {sharePercentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && !analytics && (
        <div className="text-center py-12">
          <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            No analytics data available
          </h3>
          <p className="text-gray-600">
            Start using LLM models to see analytics data here
          </p>
        </div>
      )}
    </div>
  );
}
