'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Filter, Sparkles, DollarSign, 
  Globe, Code, MessageSquare, Eye, Zap,
  RefreshCw, X
} from 'lucide-react';
import { llmApi, ModelInfo } from '@/lib/api/llm';

export default function LlmModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedCost, setSelectedCost] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [showIndianOnly, setShowIndianOnly] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);

  const providers = ['all', ...new Set(models.map(m => m.provider))];
  const purposes = ['all', 'chat', 'code', 'reasoning', 'vision', 'translation'];

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch cloud models
      const data = await llmApi.getModels({ refresh });
      let allModels = data.models;
      
      // Fetch local vLLM model
      const vllmModel = await llmApi.getLocalVllmInfo();
      if (vllmModel) {
        // Add local vLLM to the beginning of the list
        allModels = [vllmModel, ...allModels];
      }
      
      setModels(allModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = models.filter(model => {
    // Search filter
    if (searchTerm && !model.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !model.id.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Provider filter
    if (selectedProvider !== 'all' && model.provider !== selectedProvider) {
      return false;
    }

    // Cost filter
    if (selectedCost !== 'all' && model.cost !== selectedCost) {
      return false;
    }

    // Purpose filter
    if (selectedPurpose !== 'all' && !model.purpose.includes(selectedPurpose)) {
      return false;
    }

    // Indian languages filter
    if (showIndianOnly) {
      const indianLanguages = ['hindi', 'tamil', 'telugu', 'bengali', 'marathi', 
                               'gujarati', 'kannada', 'malayalam', 'punjabi', 'urdu'];
      if (!model.languages?.some(lang => 
        indianLanguages.includes(lang.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      'vllm-local': 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 ring-2 ring-green-200',
      groq: 'bg-orange-100 text-orange-700 border-orange-200',
      openrouter: 'bg-purple-100 text-purple-700 border-purple-200',
      openai: 'bg-green-100 text-green-700 border-green-200',
      huggingface: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return colors[provider.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'chat': return <MessageSquare size={16} />;
      case 'code': return <Code size={16} />;
      case 'vision': return <Eye size={16} />;
      case 'functions': return <Zap size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LLM Models</h1>
          <p className="text-gray-600 mt-1">
            Browse and manage {models.length} available language models
          </p>
        </div>
        <button
          onClick={() => loadModels(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border-2 border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Total Models</div>
          <div className="text-2xl font-bold text-gray-900">{models.length}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border-2 border-green-100">
          <div className="text-sm text-gray-600 mb-1">Free Models</div>
          <div className="text-2xl font-bold text-green-600">
            {models.filter(m => m.cost === 'free').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border-2 border-blue-100">
          <div className="text-sm text-gray-600 mb-1">Providers</div>
          <div className="text-2xl font-bold text-blue-600">{providers.length - 1}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border-2 border-purple-100">
          <div className="text-sm text-gray-600 mb-1">With Vision</div>
          <div className="text-2xl font-bold text-purple-600">
            {models.filter(m => m.capabilities.vision).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 border-2 border-gray-100 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search models by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Provider Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
            >
              {providers.map(p => (
                <option key={p} value={p}>
                  {p === 'all' ? 'All Providers' : p}
                </option>
              ))}
            </select>
          </div>

          {/* Cost Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost
            </label>
            <select
              value={selectedCost}
              onChange={(e) => setSelectedCost(e.target.value as 'all' | 'free' | 'paid')}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
            >
              <option value="all">All Models</option>
              <option value="free">Free Only</option>
              <option value="paid">Paid Only</option>
            </select>
          </div>

          {/* Purpose Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purpose
            </label>
            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
            >
              {purposes.map(p => (
                <option key={p} value={p}>
                  {p === 'all' ? 'All Purposes' : p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Indian Languages Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Languages
            </label>
            <button
              onClick={() => setShowIndianOnly(!showIndianOnly)}
              className={`w-full px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                showIndianOnly
                  ? 'bg-[#059211] text-white border-[#059211]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#059211]'
              }`}
            >
              <Globe size={16} />
              Indian Languages
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {(searchTerm || selectedProvider !== 'all' || selectedCost !== 'all' || 
          selectedPurpose !== 'all' || showIndianOnly) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchTerm && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                Search: &ldquo;{searchTerm}&rdquo;
                <button onClick={() => setSearchTerm('')}>
                  <X size={14} />
                </button>
              </span>
            )}
            {selectedProvider !== 'all' && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                {selectedProvider}
                <button onClick={() => setSelectedProvider('all')}>
                  <X size={14} />
                </button>
              </span>
            )}
            {selectedCost !== 'all' && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                {selectedCost === 'free' ? 'Free' : 'Paid'}
                <button onClick={() => setSelectedCost('all')}>
                  <X size={14} />
                </button>
              </span>
            )}
            {selectedPurpose !== 'all' && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                {selectedPurpose}
                <button onClick={() => setSelectedPurpose('all')}>
                  <X size={14} />
                </button>
              </span>
            )}
            {showIndianOnly && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                Indian Languages
                <button onClick={() => setShowIndianOnly(false)}>
                  <X size={14} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredModels.length} of {models.length} models
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
          <p className="text-gray-600">Loading models...</p>
        </div>
      )}

      {/* Models Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model)}
              className="bg-white rounded-lg p-6 border-2 border-gray-100 hover:border-[#059211] hover:shadow-lg transition-all cursor-pointer"
            >
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 flex-1 mr-2">
                    {model.name}
                  </h3>
                  {model.cost === 'free' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-medium whitespace-nowrap">
                      FREE
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1">
                      <DollarSign size={12} />
                      PAID
                    </span>
                  )}
                </div>
                
                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium border ${getProviderColor(model.provider)}`}>
                  {model.provider}
                </span>
              </div>

              {/* Description */}
              {model.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {model.description}
                </p>
              )}

              {/* Capabilities */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(model.capabilities)
                  .filter(([, enabled]) => enabled)
                  .map(([capability]) => (
                    <div
                      key={capability}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-700"
                    >
                      {getCapabilityIcon(capability)}
                      {capability}
                    </div>
                  ))}
              </div>

              {/* Details */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                {model.contextLength && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Context:</span>
                    <span className="font-medium text-gray-900">
                      {model.contextLength.toLocaleString()} tokens
                    </span>
                  </div>
                )}
                {model.pricing && !model.pricing.free && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Pricing:</span>
                    <span className="font-mono text-xs text-gray-700">
                      ${model.pricing.input}/${model.pricing.output} per 1M
                    </span>
                  </div>
                )}
                {model.languages && model.languages.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Languages:</span>
                    <span className="text-xs text-gray-700">
                      {model.languages.length} supported
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredModels.length === 0 && (
        <div className="text-center py-12">
          <Filter className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            No models found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters or search terms
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedProvider('all');
              setSelectedCost('all');
              setSelectedPurpose('all');
              setShowIndianOnly(false);
            }}
            className="px-4 py-2 bg-[#059211] text-white rounded-lg hover:shadow-lg transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Model Details Modal */}
      {selectedModel && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedModel(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedModel.name}
                </h2>
                <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getProviderColor(selectedModel.provider)}`}>
                  {selectedModel.provider}
                </span>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedModel.description && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{selectedModel.description}</p>
                </div>
              )}

              {/* Capabilities */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Capabilities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(selectedModel.capabilities).map(([capability, enabled]) => (
                    <div
                      key={capability}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        enabled
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      {getCapabilityIcon(capability)}
                      <span className="capitalize">{capability}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specifications */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Specifications</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Model ID</span>
                    <span className="font-mono text-sm text-gray-900">{selectedModel.id}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Cost Model</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {selectedModel.cost}
                    </span>
                  </div>
                  {selectedModel.contextLength && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Context Length</span>
                      <span className="font-medium text-gray-900">
                        {selectedModel.contextLength.toLocaleString()} tokens
                      </span>
                    </div>
                  )}
                  {selectedModel.pricing && !selectedModel.pricing.free && (
                    <>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Input Price</span>
                        <span className="font-mono text-sm text-gray-900">
                          ${selectedModel.pricing.input} per 1M tokens
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Output Price</span>
                        <span className="font-mono text-sm text-gray-900">
                          ${selectedModel.pricing.output} per 1M tokens
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Languages */}
              {selectedModel.languages && selectedModel.languages.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">
                    Supported Languages ({selectedModel.languages.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Purpose */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Use Cases</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedModel.purpose.map((purpose) => (
                    <span
                      key={purpose}
                      className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700"
                    >
                      {purpose}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
