'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Edit2,
  Eye,
  RefreshCw,
  AlertTriangle,
  Filter,
  ArrowUpDown
} from 'lucide-react';

interface TrainingExample {
  id: string;
  text: string;
  intent: string;
  entities: Array<{ entity: string; value: string; start: number; end: number }>;
  confidence: number;
  status: string;
  priority: string;
  conversationId?: string;
  createdAt: string;
}

interface IntentOption {
  name: string;
  count: number;
}

export default function ReviewQueuePage() {
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [intents, setIntents] = useState<IntentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExample, setSelectedExample] = useState<TrainingExample | null>(null);
  const [editedIntent, setEditedIntent] = useState('');
  const [filter, setFilter] = useState<'all' | 'priority' | 'normal'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadExamples();
    loadIntents();
  }, [filter, page]);

  const loadExamples = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/learning/pending?filter=${filter}&page=${page}&limit=20`);
      const data = await response.json();
      setExamples(data.examples);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load examples:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIntents = async () => {
    try {
      const response = await fetch('/api/admin/learning/intents');
      const data = await response.json();
      setIntents(data);
    } catch (error) {
      console.error('Failed to load intents:', error);
    }
  };

  const approveExample = async (id: string, correctedIntent?: string) => {
    try {
      await fetch(`/api/admin/learning/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctedIntent }),
      });
      setExamples(prev => prev.filter(e => e.id !== id));
      setSelectedExample(null);
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const rejectExample = async (id: string, reason?: string) => {
    try {
      await fetch(`/api/admin/learning/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setExamples(prev => prev.filter(e => e.id !== id));
      setSelectedExample(null);
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const bulkApprove = async () => {
    const highConfidence = examples.filter(e => e.confidence >= 0.85);
    for (const example of highConfidence) {
      await approveExample(example.id);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'text-green-600 bg-green-50';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="text-gray-600 mt-1">{total} examples pending review</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={bulkApprove}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Approve High Confidence
          </button>
          <button
            onClick={loadExamples}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <Filter size={18} className="text-gray-400" />
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm ${filter === 'all' ? 'bg-[#059211] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('priority')}
            className={`px-3 py-1 rounded-lg text-sm ${filter === 'priority' ? 'bg-[#059211] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Priority (Low Confidence)
          </button>
          <button
            onClick={() => setFilter('normal')}
            className={`px-3 py-1 rounded-lg text-sm ${filter === 'normal' ? 'bg-[#059211] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Normal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Examples List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin text-[#059211]" size={32} />
            </div>
          ) : examples.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Queue Empty!</h3>
              <p className="text-gray-500">All examples have been reviewed.</p>
            </div>
          ) : (
            examples.map((example) => (
              <div
                key={example.id}
                onClick={() => {
                  setSelectedExample(example);
                  setEditedIntent(example.intent);
                }}
                className={`bg-white p-4 rounded-xl shadow-sm border-2 cursor-pointer transition-all ${
                  selectedExample?.id === example.id 
                    ? 'border-[#059211]' 
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {example.priority === 'priority' && (
                      <AlertTriangle size={16} className="text-amber-500" />
                    )}
                    <span className="font-medium text-gray-900">{example.intent}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(example.confidence)}`}>
                    {(example.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-gray-700 mb-3">"{example.text}"</p>
                {example.entities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {example.entities.map((entity, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                        {entity.entity}: {entity.value}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-gray-400">
                    {new Date(example.createdAt).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); approveExample(example.id); }}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); rejectExample(example.id); }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedExample ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Edit & Review</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Text</label>
                  <p className="p-3 bg-gray-50 rounded-lg text-gray-700">"{selectedExample.text}"</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Predicted Intent</label>
                  <select
                    value={editedIntent}
                    onChange={(e) => setEditedIntent(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    {intents.map((intent) => (
                      <option key={intent.name} value={intent.name}>
                        {intent.name} ({intent.count})
                      </option>
                    ))}
                    <option value="__new__">+ Add New Intent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          selectedExample.confidence >= 0.85 ? 'bg-green-500' :
                          selectedExample.confidence >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedExample.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{(selectedExample.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {selectedExample.entities.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entities</label>
                    <div className="space-y-1">
                      {selectedExample.entities.map((entity, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <span className="text-sm text-blue-800">{entity.entity}</span>
                          <span className="text-sm font-medium text-blue-900">{entity.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t space-y-2">
                  <button
                    onClick={() => approveExample(selectedExample.id, editedIntent !== selectedExample.intent ? editedIntent : undefined)}
                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => rejectExample(selectedExample.id)}
                    className="w-full py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                </div>

                {selectedExample.conversationId && (
                  <div className="pt-2 text-xs text-gray-400">
                    Conversation: {selectedExample.conversationId.substring(0, 8)}...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm border text-center text-gray-500">
              <Eye size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Select an example to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
