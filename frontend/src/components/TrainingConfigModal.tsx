'use client';

import { useState } from 'react';
import { X, Settings, AlertCircle } from 'lucide-react';

interface TrainingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: TrainingConfig) => void;
  datasetId: string;
  datasetName: string;
}

export interface TrainingConfig {
  datasetId: string;
  modelType: 'nlu' | 'asr' | 'tts';
  epochs: number;
  batchSize: number;
  learningRate: number;
  optimizer: 'adam' | 'sgd' | 'rmsprop';
  validationSplit: number;
}

export default function TrainingConfigModal({
  isOpen,
  onClose,
  onSubmit,
  datasetId,
  datasetName,
}: TrainingConfigModalProps) {
  const [config, setConfig] = useState<TrainingConfig>({
    datasetId,
    modelType: 'nlu',
    epochs: 10,
    batchSize: 32,
    learningRate: 0.001,
    optimizer: 'adam',
    validationSplit: 0.2,
  });
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.epochs < 1 || config.epochs > 100) {
      setError('Epochs must be between 1 and 100');
      return;
    }
    if (config.batchSize < 1 || config.batchSize > 512) {
      setError('Batch size must be between 1 and 512');
      return;
    }
    if (config.learningRate <= 0 || config.learningRate > 1) {
      setError('Learning rate must be between 0 and 1');
      return;
    }
    if (config.validationSplit < 0 || config.validationSplit > 0.5) {
      setError('Validation split must be between 0 and 0.5');
      return;
    }
    onSubmit(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Training Configuration
            </h2>
            <p className="text-gray-600 mt-1">{datasetName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Model Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Type
            </label>
            <select
              value={config.modelType}
              onChange={(e) =>
                setConfig({
                  ...config,
                  modelType: e.target.value as 'nlu' | 'asr' | 'tts',
                })
              }
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
            >
              <option value="nlu">NLU (Intent Classification)</option>
              <option value="asr">ASR (Speech Recognition)</option>
              <option value="tts">TTS (Text-to-Speech)</option>
            </select>
          </div>

          {/* Training Parameters */}
          <div className="grid grid-cols-2 gap-4">
            {/* Epochs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Epochs
              </label>
              <input
                type="number"
                value={config.epochs}
                onChange={(e) =>
                  setConfig({ ...config, epochs: parseInt(e.target.value) })
                }
                min={1}
                max={100}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of training iterations (1-100)
              </p>
            </div>

            {/* Batch Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Size
              </label>
              <select
                value={config.batchSize}
                onChange={(e) =>
                  setConfig({ ...config, batchSize: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
              >
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32 (recommended)</option>
                <option value={64}>64</option>
                <option value={128}>128</option>
                <option value={256}>256</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Samples processed per iteration
              </p>
            </div>

            {/* Learning Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learning Rate
              </label>
              <select
                value={config.learningRate}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    learningRate: parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
              >
                <option value={0.0001}>0.0001 (very slow)</option>
                <option value={0.0005}>0.0005 (slow)</option>
                <option value={0.001}>0.001 (recommended)</option>
                <option value={0.005}>0.005 (fast)</option>
                <option value={0.01}>0.01 (very fast)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Step size for weight updates
              </p>
            </div>

            {/* Optimizer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optimizer
              </label>
              <select
                value={config.optimizer}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    optimizer: e.target.value as 'adam' | 'sgd' | 'rmsprop',
                  })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
              >
                <option value="adam">Adam (recommended)</option>
                <option value="sgd">SGD</option>
                <option value="rmsprop">RMSprop</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Algorithm for optimization
              </p>
            </div>
          </div>

          {/* Validation Split */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validation Split: {(config.validationSplit * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              value={config.validationSplit}
              onChange={(e) =>
                setConfig({
                  ...config,
                  validationSplit: parseFloat(e.target.value),
                })
              }
              min={0.1}
              max={0.5}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Percentage of data used for validation (10-50%)
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Settings className="text-[#059211] flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-1">
                  Recommended Settings:
                </p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Epochs: 10-20 for most NLU tasks</li>
                  <li>• Batch Size: 32 for balanced speed/accuracy</li>
                  <li>• Learning Rate: 0.001 as a safe starting point</li>
                  <li>• Optimizer: Adam for most use cases</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] hover:from-[#047a0e] hover:to-[#036809] text-white rounded-lg font-medium transition-all shadow-lg"
            >
              Start Training
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
