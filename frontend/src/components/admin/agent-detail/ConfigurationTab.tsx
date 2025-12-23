'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import { useToast } from '@/components/shared';

interface Agent {
  id: string;
  name: string;
  module: string;
  status: string;
  model: string;
  nluProvider: string;
  nluModel: string;
  accuracy: number;
}

interface ConfigurationTabProps {
  agent: Agent;
  onSave: () => void;
}

export function ConfigurationTab({ agent, onSave }: ConfigurationTabProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    status: agent.status,
    llmModel: agent.model,
    nluProvider: agent.nluProvider,
    nluModel: agent.nluModel,
    confidenceThreshold: 0.7,
    maxTokens: 2048,
    temperature: 0.7,
    systemPrompt: `You are a helpful AI assistant for the ${agent.module} module. Help users with their requests in a friendly and efficient manner.`,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await mangwaleAIClient.updateAgent(agent.id, formData);
      showSuccess('Agent configuration updated successfully');
      onSave();
    } catch (err) {
      showError('Failed to update agent configuration');
      console.error('Error updating agent:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Agent Status</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#059211] transition-colors">
            <input
              type="radio"
              name="status"
              value="active"
              checked={formData.status === 'active'}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-4 h-4 text-[#059211]"
            />
            <div>
              <div className="font-medium text-gray-900">Active</div>
              <div className="text-sm text-gray-600">
                Agent is enabled and responding to customer messages
              </div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-yellow-500 transition-colors">
            <input
              type="radio"
              name="status"
              value="training"
              checked={formData.status === 'training'}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-4 h-4 text-yellow-500"
            />
            <div>
              <div className="font-medium text-gray-900">Training</div>
              <div className="text-sm text-gray-600">
                Agent is being retrained and not available for customer interactions
              </div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-red-500 transition-colors">
            <input
              type="radio"
              name="status"
              value="inactive"
              checked={formData.status === 'inactive'}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-4 h-4 text-red-500"
            />
            <div>
              <div className="font-medium text-gray-900">Inactive</div>
              <div className="text-sm text-gray-600">
                Agent is disabled and will not respond to any messages
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Model Configuration */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Model Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LLM Model
            </label>
            <select
              value={formData.llmModel}
              onChange={(e) => handleChange('llmModel', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none text-gray-900"
            >
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="llama-3.1-8b">Llama 3.1 8B</option>
              <option value="mixtral-8x7b">Mixtral 8x7B</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The large language model used for generating responses
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NLU Provider
            </label>
            <select
              value={formData.nluProvider}
              onChange={(e) => handleChange('nluProvider', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none text-gray-900"
            >
              <option value="custom">Custom (Self-hosted)</option>
              <option value="openai">OpenAI</option>
              <option value="huggingface">Hugging Face</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The NLU service used for intent classification
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NLU Model
            </label>
            <select
              value={formData.nluModel}
              onChange={(e) => handleChange('nluModel', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none text-gray-900"
            >
              <option value="food-nlu-v1">Food NLU v1</option>
              <option value="general-nlu-v2">General NLU v2</option>
              <option value="bert-base">BERT Base</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The specific NLU model for intent classification
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confidence Threshold
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formData.confidenceThreshold}
                onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-sm font-medium w-12">
                {formData.confidenceThreshold.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum confidence required for intent classification
            </p>
          </div>
        </div>
      </div>

      {/* LLM Parameters */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">LLM Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              min="256"
              max="8192"
              step="256"
              value={formData.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum length of generated responses (256-8192)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-sm font-medium w-12">
                {formData.temperature.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Creativity level (0 = deterministic, 2 = very creative)
            </p>
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">System Prompt</h3>
        <textarea
          value={formData.systemPrompt}
          onChange={(e) => handleChange('systemPrompt', e.target.value)}
          rows={6}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none font-mono text-sm text-gray-900"
          placeholder="Enter the system prompt that defines the agent's behavior..."
        />
        <p className="text-xs text-gray-500 mt-2">
          This prompt defines the agent's personality, role, and behavior guidelines
        </p>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => setFormData({
            status: agent.status,
            llmModel: agent.model,
            nluProvider: agent.nluProvider,
            nluModel: agent.nluModel,
            confidenceThreshold: 0.7,
            maxTokens: 2048,
            temperature: 0.7,
            systemPrompt: `You are a helpful AI assistant for the ${agent.module} module.`,
          })}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          disabled={saving}
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </form>
  );
}
