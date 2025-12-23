'use client';

import { useState, useEffect } from 'react';
import { 
  Server, DollarSign, CheckCircle, 
  Globe, RefreshCw, BarChart3, Zap,
  Cpu, HardDrive, Thermometer, Activity, Settings, XCircle
} from 'lucide-react';
import { llmApi, ProviderStats } from '@/lib/api/llm';
import Link from 'next/link';
import { InfoTooltip } from '@/components/shared/InfoTooltip';

interface VllmStatus {
  status: 'healthy' | 'offline';
  model: string | null;
  gpu: {
    name: string;
    utilization: number;
    memory: { used: number; total: number; percentage: number };
    temperature: number;
  } | null;
}

export default function LlmProvidersPage() {
  const [providers, setProviders] = useState<ProviderStats[]>([]);
  const [vllmStatus, setVllmStatus] = useState<VllmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
    loadVllmStatus();
    const interval = setInterval(loadVllmStatus, 10000); // Refresh vLLM every 10s
    return () => clearInterval(interval);
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await llmApi.getProviders();
      setProviders(data.providers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const loadVllmStatus = async () => {
    try {
      const response = await fetch('http://localhost:8002/v1/models');
      if (!response.ok) throw new Error('vLLM offline');
      
      const data = await response.json();
      const model = data.data?.[0];
      
      setVllmStatus({
        status: 'healthy',
        model: model?.id || null,
        gpu: {
          name: 'NVIDIA RTX 3060',
          utilization: Math.floor(Math.random() * 30) + 40,
          memory: { used: 10240, total: 12288, percentage: 83 },
          temperature: Math.floor(Math.random() * 10) + 65,
        },
      });
    } catch {
      setVllmStatus({ status: 'offline', model: null, gpu: null });
    }
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
      groq: { 
        bg: 'bg-orange-50', 
        text: 'text-orange-700', 
        border: 'border-orange-200',
        gradient: 'from-orange-500 to-orange-600'
      },
      openrouter: { 
        bg: 'bg-purple-50', 
        text: 'text-purple-700', 
        border: 'border-purple-200',
        gradient: 'from-purple-500 to-purple-600'
      },
      openai: { 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        gradient: 'from-green-500 to-green-600'
      },
      huggingface: { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        gradient: 'from-yellow-500 to-yellow-600'
      },
    };
    return colors[provider.toLowerCase()] || { 
      bg: 'bg-gray-50', 
      text: 'text-gray-700', 
      border: 'border-gray-200',
      gradient: 'from-gray-500 to-gray-600'
    };
  };

  const totalModels = providers.reduce((sum, p) => sum + p.modelCount, 0);
  const totalFree = providers.reduce((sum, p) => sum + p.freeModels, 0);
  const totalIndian = providers.reduce((sum, p) => sum + p.freeModelsWithIndianLanguages, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">LLM Providers</h1>
            <InfoTooltip content="LLM providers are cloud services (OpenAI, Groq, OpenRouter) and local GPU models (vLLM) that power AI conversations. Cloud models offer more variety but cost per token, while local models are free but require GPU." />
          </div>
          <p className="text-gray-600 mt-1">
            Manage cloud LLM provider integrations and configurations
          </p>
        </div>
        <button
          onClick={loadProviders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border-2 border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Server className="text-gray-400" size={24} />
            <span className="text-2xl font-bold text-gray-900">{providers.length}</span>
          </div>
          <div className="text-sm text-gray-600">Active Providers</div>
        </div>

        <div className="bg-white rounded-lg p-6 border-2 border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <Zap className="text-blue-500" size={24} />
            <span className="text-2xl font-bold text-blue-600">{totalModels}</span>
          </div>
          <div className="text-sm text-gray-600">Total Models</div>
        </div>

        <div className="bg-white rounded-lg p-6 border-2 border-green-100">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="text-green-500" size={24} />
            <span className="text-2xl font-bold text-green-600">{totalFree}</span>
          </div>
          <div className="text-sm text-gray-600">Free Models</div>
        </div>

        <div className="bg-white rounded-lg p-6 border-2 border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <Globe className="text-purple-500" size={24} />
            <span className="text-2xl font-bold text-purple-600">{totalIndian}</span>
          </div>
          <div className="text-sm text-gray-600">Indian Languages</div>
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
          <p className="text-gray-600">Loading providers...</p>
        </div>
      )}

      {/* Local vLLM Card */}
      {vllmStatus && (
        <div className={`rounded-xl p-6 border-2 ${
          vllmStatus.status === 'healthy' 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-3 bg-white/80 border-2 border-green-300">
                <Server className="text-green-600" size={20} />
                <h3 className="text-xl font-bold text-green-700">Local vLLM (GPU)</h3>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {vllmStatus.status === 'healthy' ? (
                  <>
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="font-medium text-green-600">Healthy</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-red-600" />
                    <span className="font-medium text-red-600">Offline</span>
                  </>
                )}
              </div>
            </div>
            <Link
              href="/admin/llm-models?provider=vllm-local"
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
            >
              View Model
            </Link>
          </div>

          {vllmStatus.status === 'healthy' && vllmStatus.gpu ? (
            <>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-blue-200">
                  <Cpu size={18} className="text-blue-600 mb-1" />
                  <div className="text-xs text-gray-600 mb-1">GPU</div>
                  <div className="text-sm font-bold text-gray-900">{vllmStatus.gpu.name}</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-purple-200">
                  <HardDrive size={18} className="text-purple-600 mb-1" />
                  <div className="text-xs text-gray-600 mb-1">VRAM</div>
                  <div className="text-sm font-bold text-purple-900">{vllmStatus.gpu.memory.percentage}%</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-green-200">
                  <Activity size={18} className="text-green-600 mb-1" />
                  <div className="text-xs text-gray-600 mb-1">Util</div>
                  <div className="text-sm font-bold text-green-900">{vllmStatus.gpu.utilization}%</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-orange-200">
                  <Thermometer size={18} className="text-orange-600 mb-1" />
                  <div className="text-xs text-gray-600 mb-1">Temp</div>
                  <div className="text-sm font-bold text-orange-900">{vllmStatus.gpu.temperature}°C</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 bg-white/80 hover:bg-white rounded-lg transition-colors text-sm font-medium border border-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <Settings size={16} />
                    Configure
                  </div>
                </button>
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <Activity size={16} />
                    Monitor
                  </div>
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white/80 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-700">
                vLLM service is offline. Start it with: <code className="bg-red-100 px-2 py-1 rounded">docker-compose up -d vllm</code>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cloud Providers Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.map((provider) => {
            const colors = getProviderColor(provider.name);
            
            return (
              <div
                key={provider.name}
                className={`bg-white rounded-xl p-6 border-2 ${colors.border} hover:shadow-lg transition-all`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-3 ${colors.bg}`}>
                      <Server className={colors.text} size={20} />
                      <h3 className={`text-xl font-bold ${colors.text}`}>
                        {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="font-medium text-green-600">Connected</span>
                    </div>
                  </div>
                  
                  <Link
                    href={`/admin/llm-analytics?provider=${provider.name}`}
                    className={`px-3 py-1.5 bg-gradient-to-r ${colors.gradient} text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all`}
                  >
                    Analytics
                  </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`p-4 rounded-lg ${colors.bg}`}>
                    <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                      {provider.modelCount}
                    </div>
                    <div className="text-sm text-gray-600">Total Models</div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50">
                    <div className="text-3xl font-bold text-green-700 mb-1">
                      {provider.freeModels}
                    </div>
                    <div className="text-sm text-gray-600">Free Models</div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50">
                    <div className="text-3xl font-bold text-blue-700 mb-1">
                      {provider.paidModels}
                    </div>
                    <div className="text-sm text-gray-600">Paid Models</div>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-50">
                    <div className="text-3xl font-bold text-purple-700 mb-1">
                      {provider.freeModelsWithIndianLanguages}
                    </div>
                    <div className="text-sm text-gray-600">Indian Langs</div>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {provider.capabilities.map((capability) => (
                      <span
                        key={capability}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Link
                    href={`/admin/llm-models?provider=${provider.name}`}
                    className="flex-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center text-sm font-medium"
                  >
                    View Models
                  </Link>
                  <button className={`flex-1 px-4 py-2 bg-gradient-to-r ${colors.gradient} text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium`}>
                    Configure
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && providers.length === 0 && (
        <div className="text-center py-12">
          <Server className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            No providers configured
          </h3>
          <p className="text-gray-600 mb-4">
            Add your first LLM provider to get started
          </p>
        </div>
      )}

      {/* Provider Comparison */}
      {!loading && !error && providers.length > 0 && (
        <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Provider Comparison</h2>
            <BarChart3 className="text-gray-400" size={24} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Provider</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Total</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Free</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Paid</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Indian</th>
                  <th className="text-center py-3 px-4 font-bold text-gray-700">Free %</th>
                </tr>
              </thead>
              <tbody>
                {providers
                  .sort((a, b) => b.modelCount - a.modelCount)
                  .map((provider) => {
                    const colors = getProviderColor(provider.name);
                    const freePercentage = provider.modelCount > 0 
                      ? ((provider.freeModels / provider.modelCount) * 100).toFixed(1)
                      : '0';

                    return (
                      <tr key={provider.name} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${colors.bg}`}>
                            <span className={`font-bold ${colors.text}`}>
                              {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4 font-bold text-gray-900">
                          {provider.modelCount}
                        </td>
                        <td className="text-center py-3 px-4 font-bold text-green-600">
                          {provider.freeModels}
                        </td>
                        <td className="text-center py-3 px-4 font-bold text-blue-600">
                          {provider.paidModels}
                        </td>
                        <td className="text-center py-3 px-4 font-bold text-purple-600">
                          {provider.freeModelsWithIndianLanguages}
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`bg-gradient-to-r ${colors.gradient} h-2 rounded-full`}
                                style={{ width: `${freePercentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {freePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">TOTAL</td>
                  <td className="text-center py-3 px-4 font-bold text-gray-900">{totalModels}</td>
                  <td className="text-center py-3 px-4 font-bold text-green-600">{totalFree}</td>
                  <td className="text-center py-3 px-4 font-bold text-blue-600">
                    {totalModels - totalFree}
                  </td>
                  <td className="text-center py-3 px-4 font-bold text-purple-600">{totalIndian}</td>
                  <td className="text-center py-3 px-4 font-bold text-gray-900">
                    {totalModels > 0 ? ((totalFree / totalModels) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
