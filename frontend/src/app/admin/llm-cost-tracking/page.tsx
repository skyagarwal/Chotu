'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, BarChart3, RefreshCw, AlertCircle, Building2, Cpu, Activity } from 'lucide-react';

interface CostByProvider {
  provider: string;
  totalCost: number;
  totalRequests: number;
  avgCostPerRequest: number;
}

interface CostByModel {
  model: string;
  provider: string;
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
}

interface CostByChannel {
  channel: string;
  totalCost: number;
  totalRequests: number;
}

interface CostAnalytics {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  avgCostPerRequest: number;
  avgCostPer1kTokens: number;
  byProvider: CostByProvider[];
  byModel: CostByModel[];
  byChannel: CostByChannel[];
  dailyCosts: { date: string; cost: number; requests: number }[];
}

export default function LlmCostTrackingPage() {
  const [analytics, setAnalytics] = useState<CostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadCostAnalytics = useCallback(async () => {
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

      // Get LLM usage analytics
      const response = await fetch(
        `http://localhost:3200/api/llm/analytics?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch cost analytics');
      }

      const data = await response.json();

      // Process data
      const costByProvider: Record<string, CostByProvider> = {};
      const costByModel: Record<string, CostByModel> = {};
      const costByChannel: Record<string, CostByChannel> = {};
      const dailyCosts: Record<string, { cost: number; requests: number }> = {};

      let totalCost = 0;
      let totalRequests = 0;
      let totalTokens = 0;

      // If the API returns usage data, process it
      if (data.usageByModel) {
        for (const item of data.usageByModel) {
          const model = item.modelName || item.modelId || 'unknown';
          const provider = item.provider || 'unknown';
          const cost = parseFloat(item.totalCost) || 0;
          const requests = parseInt(item.requestCount) || 0;
          const tokens = parseInt(item.totalTokens) || 0;

          totalCost += cost;
          totalRequests += requests;
          totalTokens += tokens;

          // By provider
          if (!costByProvider[provider]) {
            costByProvider[provider] = { provider, totalCost: 0, totalRequests: 0, avgCostPerRequest: 0 };
          }
          costByProvider[provider].totalCost += cost;
          costByProvider[provider].totalRequests += requests;

          // By model
          const modelKey = `${provider}:${model}`;
          if (!costByModel[modelKey]) {
            costByModel[modelKey] = { model, provider, totalCost: 0, totalRequests: 0, totalTokens: 0 };
          }
          costByModel[modelKey].totalCost += cost;
          costByModel[modelKey].totalRequests += requests;
          costByModel[modelKey].totalTokens += tokens;
        }

        // Calculate averages
        for (const key of Object.keys(costByProvider)) {
          const p = costByProvider[key];
          p.avgCostPerRequest = p.totalRequests > 0 ? p.totalCost / p.totalRequests : 0;
        }
      }

      // Process cost trends if available
      if (data.costTrends) {
        for (const trend of data.costTrends) {
          dailyCosts[trend.date] = {
            cost: parseFloat(trend.totalCost) || 0,
            requests: parseInt(trend.requestCount) || 0,
          };
        }
      }

      // Process by channel if available
      if (data.usageByChannel) {
        for (const item of data.usageByChannel) {
          const channel = item.channel || 'unknown';
          costByChannel[channel] = {
            channel,
            totalCost: parseFloat(item.totalCost) || 0,
            totalRequests: parseInt(item.requestCount) || 0,
          };
        }
      }

      setAnalytics({
        totalCost,
        totalRequests,
        totalTokens,
        avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        avgCostPer1kTokens: totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0,
        byProvider: Object.values(costByProvider).sort((a, b) => b.totalCost - a.totalCost),
        byModel: Object.values(costByModel).sort((a, b) => b.totalCost - a.totalCost),
        byChannel: Object.values(costByChannel).sort((a, b) => b.totalCost - a.totalCost),
        dailyCosts: Object.entries(dailyCosts)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      });

    } catch (err) {
      console.error('Error loading cost analytics:', err);
      setError('Failed to load cost analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadCostAnalytics();
  }, [loadCostAnalytics]);

  const formatCurrency = (amount: number) => {
    if (amount < 0.01) {
      return `$${amount.toFixed(6)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      vllm: 'bg-blue-100 text-blue-800',
      groq: 'bg-orange-100 text-orange-800',
      openai: 'bg-green-100 text-green-800',
      anthropic: 'bg-purple-100 text-purple-800',
      google: 'bg-red-100 text-red-800',
    };
    return colors[provider.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <DollarSign size={32} />
                <h1 className="text-4xl font-bold">LLM Cost Tracking</h1>
              </div>
              <p className="text-green-100 text-lg">
                Track and analyze LLM costs by provider, model, and channel
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="flex gap-2 bg-white/10 rounded-lg p-1">
                {(['7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      dateRange === range
                        ? 'bg-white text-[#059211]'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    {range === '7d' && '7 Days'}
                    {range === '30d' && '30 Days'}
                    {range === '90d' && '90 Days'}
                  </button>
                ))}
              </div>
              <button
                onClick={loadCostAnalytics}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#059211] border-t-transparent rounded-full mx-auto mb-4" />
            Loading cost analytics...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        ) : analytics ? (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-500">Total Cost</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(analytics.totalCost)}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-500">Total Requests</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalRequests)}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Cpu className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-500">Total Tokens</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalTokens)}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-500">Avg Cost/Request</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(analytics.avgCostPerRequest)}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-sm text-gray-500">Cost/1K Tokens</span>
                </div>
                <p className="text-3xl font-bold text-indigo-600">{formatCurrency(analytics.avgCostPer1kTokens)}</p>
              </div>
            </div>

            {/* Cost by Provider and Model */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* By Provider */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-gray-500" />
                  Cost by Provider
                </h3>
                {analytics.byProvider.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No provider data</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.byProvider.map((p) => (
                      <div key={p.provider} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProviderColor(p.provider)}`}>
                            {p.provider}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">{formatNumber(p.totalRequests)} requests</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(p.totalCost)}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(p.avgCostPerRequest)}/req</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By Model */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Cpu className="w-5 h-5 text-gray-500" />
                  Cost by Model
                </h3>
                {analytics.byModel.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No model data</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {analytics.byModel.slice(0, 10).map((m) => (
                      <div key={`${m.provider}:${m.model}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm truncate max-w-[180px]">{m.model}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getProviderColor(m.provider)}`}>
                            {m.provider}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(m.totalCost)}</p>
                          <p className="text-xs text-gray-500">{formatNumber(m.totalTokens)} tokens</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Cost Trend */}
            {analytics.dailyCosts.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  Daily Cost Trend
                </h3>
                <div className="space-y-2">
                  {analytics.dailyCosts.slice(-14).map((day) => {
                    const maxCost = Math.max(...analytics.dailyCosts.map(d => d.cost));
                    const percentage = maxCost > 0 ? (day.cost / maxCost) * 100 : 0;
                    
                    return (
                      <div key={day.date} className="flex items-center gap-4">
                        <span className="w-24 text-sm text-gray-500">{day.date}</span>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-24 text-sm font-medium text-right">{formatCurrency(day.cost)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cost by Channel */}
            {analytics.byChannel.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-gray-500" />
                  Cost by Channel
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analytics.byChannel.map((c) => (
                    <div key={c.channel} className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900 capitalize">{c.channel}</p>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(c.totalCost)}</p>
                      <p className="text-sm text-gray-500">{formatNumber(c.totalRequests)} requests</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Cost Optimization Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use vLLM (self-hosted) for high-volume requests to reduce costs</li>
                <li>• Consider smaller models for simple tasks like intent classification</li>
                <li>• Monitor cost per 1K tokens to identify expensive models</li>
                <li>• Per-tenant cost tracking coming soon (requires schema migration)</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No cost data available
          </div>
        )}
      </div>
    </div>
  );
}
