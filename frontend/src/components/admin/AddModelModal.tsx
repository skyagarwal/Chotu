'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const providers = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'groq', label: 'Groq' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'huggingface', label: 'Hugging Face' },
  { value: 'vllm-local', label: 'vLLM (Local)' },
  { value: 'custom', label: 'Custom' },
];

const modelTypes = [
  { value: 'llm', label: 'LLM (Large Language Model)' },
  { value: 'nlu', label: 'NLU (Natural Language Understanding)' },
  { value: 'asr', label: 'ASR (Automatic Speech Recognition)' },
  { value: 'tts', label: 'TTS (Text-to-Speech)' },
  { value: 'embedding', label: 'Embedding' },
];

export function AddModelModal({ isOpen, onClose, onSuccess }: AddModelModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    providerModelId: '',
    modelType: 'llm',
    endpoint: '',
    apiKey: '',
    deploymentName: '',
    maxTokens: '',
    costPerToken: '',
    capabilities: '',
    isLocal: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        provider: formData.provider,
        providerModelId: formData.providerModelId,
        modelType: formData.modelType,
        isLocal: formData.isLocal || formData.provider === 'vllm-local',
      };

      if (formData.endpoint) payload.endpoint = formData.endpoint;
      if (formData.apiKey) payload.apiKey = formData.apiKey;
      if (formData.deploymentName) payload.deploymentName = formData.deploymentName;
      if (formData.maxTokens) payload.maxTokens = parseInt(formData.maxTokens);
      if (formData.costPerToken) payload.costPerToken = parseFloat(formData.costPerToken);
      if (formData.capabilities) {
        payload.capabilities = formData.capabilities.split(',').map(c => c.trim());
      }

      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add model');
      }

      // Reset form
      setFormData({
        name: '',
        provider: 'openai',
        providerModelId: '',
        modelType: 'llm',
        endpoint: '',
        apiKey: '',
        deploymentName: '',
        maxTokens: '',
        costPerToken: '',
        capabilities: '',
        isLocal: false,
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add model');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Model</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., GPT-4 Turbo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Provider & Model Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                {providers.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.modelType}
                onChange={(e) => setFormData({ ...formData, modelType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                {modelTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Provider Model ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider Model ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.providerModelId}
              onChange={(e) => setFormData({ ...formData, providerModelId: e.target.value })}
              placeholder="e.g., gpt-4-turbo-preview"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          {/* Endpoint (for local/custom) */}
          {(formData.provider === 'vllm-local' || formData.provider === 'custom') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint URL
              </label>
              <input
                type="url"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                placeholder="http://localhost:8002/v1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          )}

          {/* API Key (for cloud providers) */}
          {formData.provider !== 'vllm-local' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key {formData.provider !== 'custom' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          )}

          {/* Deployment Name (for Azure) */}
          {formData.provider === 'openai' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deployment Name (Azure)
              </label>
              <input
                type="text"
                value={formData.deploymentName}
                onChange={(e) => setFormData({ ...formData, deploymentName: e.target.value })}
                placeholder="Optional for Azure deployments"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          )}

          {/* Max Tokens & Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
                placeholder="e.g., 8192"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost per Token ($)
              </label>
              <input
                type="number"
                step="0.00000001"
                value={formData.costPerToken}
                onChange={(e) => setFormData({ ...formData, costPerToken: e.target.value })}
                placeholder="e.g., 0.00001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capabilities (comma-separated)
            </label>
            <input
              type="text"
              value={formData.capabilities}
              onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
              placeholder="e.g., chat, completion, function-calling, vision"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          {/* Is Local Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLocal"
              checked={formData.isLocal}
              onChange={(e) => setFormData({ ...formData, isLocal: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isLocal" className="text-sm font-medium text-gray-700">
              This is a local model (no API calls)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? 'Adding...' : 'Add Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
