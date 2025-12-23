'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AddModelModal } from '@/components/admin/AddModelModal';
import { useToast } from '@/components/shared';

interface Model {
  id: string;
  name: string;
  modelType: 'llm' | 'nlu' | 'embedding' | 'asr' | 'tts';
  provider: string;
  providerModelId: string;
  status: 'active' | 'inactive';
  endpoint?: string;
  hasApiKey?: boolean;
  maxTokens?: number;
  capabilities?: string[];
  isLocal?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { success, error: showError } = useToast();

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      setModels(data);
    } catch (err) {
      showError('Failed to load models');
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const filteredModels = models.filter((model) => 
    filter === 'all' ? true : model.modelType === filter
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'llm': return 'bg-blue-100 text-blue-700';
      case 'nlu': return 'bg-purple-100 text-purple-700';
      case 'asr': return 'bg-orange-100 text-orange-700';
      case 'tts': return 'bg-pink-100 text-pink-700';
      case 'embedding': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddSuccess = () => {
    success('Model added successfully!');
    loadModels(); // Refresh the list
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/models/${id}/toggle`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Failed to toggle model status');
      success('Model status updated');
      loadModels();
    } catch (err) {
      showError('Failed to update model status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    
    try {
      const response = await fetch(`/api/models/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete model');
      success('Model deleted successfully');
      loadModels();
    } catch (err) {
      showError('Failed to delete model');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Models Registry</h1>
          <p className="text-gray-600 mt-1">
            Manage LLMs, NLU models, ASR, and TTS providers
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus size={20} />
          Add Model
        </button>
      </div>

      {/* Add Model Modal */}
      <AddModelModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', name: 'All Models', count: models.length },
          { id: 'llm', name: 'LLMs', count: models.filter(m => (m.modelType as string) === 'llm').length },
          { id: 'nlu', name: 'NLU', count: models.filter(m => (m.modelType as string) === 'nlu').length },
          { id: 'asr', name: 'ASR', count: models.filter(m => (m.modelType as string) === 'asr').length },
          { id: 'tts', name: 'TTS', count: models.filter(m => (m.modelType as string) === 'tts').length },
          { id: 'embedding', name: 'Embeddings', count: models.filter(m => (m.modelType as string) === 'embedding').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === tab.id
                ? 'bg-[#059211] text-white'
                : 'bg-white border-2 border-gray-200 hover:border-[#059211]'
            }`}
          >
            {tab.name}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              filter === tab.id
                ? 'bg-white/20'
                : 'bg-gray-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-[#059211]" size={48} />
        </div>
      )}

      {/* Models Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {model.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(model.modelType)}`}>
                      {model.modelType.toUpperCase()}
                    </span>
                    {model.isLocal && (
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                        LOCAL
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {model.provider} · {model.providerModelId}
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleStatus(model.id)}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                      {model.status === 'active' ? (
                        <>
                          <CheckCircle size={16} className="text-green-600" />
                          <span className="text-sm font-medium text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-red-600" />
                          <span className="text-sm font-medium text-red-600">Inactive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit size={18} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={() => handleDelete(model.id, model.name)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium text-gray-900">{model.provider}</span>
                </div>
                {model.endpoint && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Endpoint:</span>
                    <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded max-w-[200px] truncate">
                      {model.endpoint}
                    </span>
                  </div>
                )}
                {model.maxTokens && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Max Tokens:</span>
                    <span className="font-medium text-gray-900">{model.maxTokens.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">API Key:</span>
                  <span className="font-medium text-gray-900">
                    {model.hasApiKey ? '✓ Configured' : '✗ Not set'}
                  </span>
                </div>
                {model.capabilities && model.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {model.capabilities.map((cap, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
                  <Activity size={16} />
                  Test Model
                </button>
                <button className="flex-1 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium">
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredModels.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            No models found
          </h3>
          <p className="text-gray-600 mb-4">
            Add your first {filter === 'all' ? 'model' : filter.toUpperCase()} to get started
          </p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={20} />
            Add Your First Model
          </button>
        </div>
      )}
    </div>
  );
}
