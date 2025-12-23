'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit, Trash2, Download, Upload } from 'lucide-react';
import TrainingConfigModal, {
  TrainingConfig,
} from '@/components/TrainingConfigModal';

interface TrainingExample {
  id: string;
  text: string;
  intent: string;
  entities: Array<{ type: string; value: string }>;
  confidence?: number;
}

export default function DatasetDetailPage({ params }: { params: { id: string } }) {
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const datasetName = 'Food NLU Dataset v2';

  const handleStartTraining = (config: TrainingConfig) => {
    console.log('Starting training with config:', config);
    // TODO: API call to start training job
    // In real implementation, this would POST to /api/training/jobs
  };

  const [examples] = useState<TrainingExample[]>([
    {
      id: '1',
      text: 'I want to order pizza',
      intent: 'order_food',
      entities: [{ type: 'food_item', value: 'pizza' }],
      confidence: 0.95,
    },
    {
      id: '2',
      text: 'Show me veg restaurants near me',
      intent: 'search_restaurant',
      entities: [
        { type: 'dietary', value: 'veg' },
        { type: 'location', value: 'near me' },
      ],
      confidence: 0.92,
    },
    {
      id: '3',
      text: 'Track my order #12345',
      intent: 'track_order',
      entities: [{ type: 'order_id', value: '12345' }],
      confidence: 0.98,
    },
    {
      id: '4',
      text: 'Cancel my food order',
      intent: 'cancel_order',
      entities: [{ type: 'order_type', value: 'food' }],
      confidence: 0.89,
    },
    {
      id: '5',
      text: 'What are today\'s special offers?',
      intent: 'check_offers',
      entities: [{ type: 'time', value: 'today' }],
      confidence: 0.87,
    },
  ]);

  const [filter, setFilter] = useState('all');
  const intents = Array.from(new Set(examples.map((e) => e.intent)));

  const filteredExamples =
    filter === 'all' ? examples : examples.filter((e) => e.intent === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/training"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#059211] mb-4"
        >
          <ArrowLeft size={20} />
          Back to Training
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Food NLU Dataset v2
            </h1>
            <p className="text-gray-600 mt-1">
              {examples.length} training examples • NLU • food module
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-[#059211] transition-all">
              <Upload size={20} />
              Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-[#059211] transition-all">
              <Download size={20} />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all">
              <Plus size={20} />
              Add Example
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {examples.length}
          </div>
          <div className="text-sm text-gray-600">Total Examples</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {intents.length}
          </div>
          <div className="text-sm text-gray-600">Unique Intents</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {(
              examples.reduce((sum, e) => sum + (e.confidence || 0), 0) /
              examples.length
            ).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Avg Confidence</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {examples.reduce((sum, e) => sum + e.entities.length, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Entities</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
            filter === 'all'
              ? 'bg-[#059211] text-white'
              : 'bg-white border-2 border-gray-200 hover:border-[#059211]'
          }`}
        >
          All ({examples.length})
        </button>
        {intents.map((intent) => (
          <button
            key={intent}
            onClick={() => setFilter(intent)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === intent
                ? 'bg-[#059211] text-white'
                : 'bg-white border-2 border-gray-200 hover:border-[#059211]'
            }`}
          >
            {intent} ({examples.filter((e) => e.intent === intent).length})
          </button>
        ))}
      </div>

      {/* Examples List */}
      <div className="space-y-3">
        {filteredExamples.map((example) => (
          <div
            key={example.id}
            className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-lg text-gray-900">&quot;{example.text}&quot;</p>
                  {example.confidence && (
                    <span className="text-xs text-gray-500">
                      {(example.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600">Intent:</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    {example.intent}
                  </span>
                </div>
                {example.entities.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-600">Entities:</span>
                    <div className="flex flex-wrap gap-2">
                      {example.entities.map((entity, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm"
                        >
                          {entity.type}: <strong>{entity.value}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit size={18} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={18} className="text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <Link
          href="/admin/training"
          className="flex-1 px-6 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center font-medium"
        >
          Cancel
        </Link>
        <button
          onClick={() => setIsTrainingModalOpen(true)}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all font-medium"
        >
          Start Training with this Dataset
        </button>
      </div>

      {/* Training Config Modal */}
      <TrainingConfigModal
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
        onSubmit={handleStartTraining}
        datasetId={params.id}
        datasetName={datasetName}
      />
    </div>
  );
}
