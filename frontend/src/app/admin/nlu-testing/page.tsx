'use client';

import { useState } from 'react';
import { Brain, Send, Sparkles, Loader2 } from 'lucide-react';
import { adminBackendClient } from '@/lib/api/admin-backend';
import { useToast } from '@/components/shared';

interface ClassificationResult {
  intent: string;
  confidence: number;
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  metadata?: {
    model: string;
    processingTime: number;
  };
}

export default function NLUTestingPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [history, setHistory] = useState<Array<{ text: string; result: ClassificationResult; timestamp: Date }>>([]);
  const toast = useToast();

  const handleTest = async () => {
    if (!text.trim()) {
      toast.warning('Please enter some text to test');
      return;
    }

    setLoading(true);
    try {
      const response = await adminBackendClient.classifyIntent(text);
      
      const entitiesArray = response.entities 
        ? Object.entries(response.entities).map(([key, value]) => ({
            type: key,
            value: String(value),
            confidence: 1.0
          }))
        : [];

      const classificationResult: ClassificationResult = {
        intent: response.intent,
        confidence: response.confidence,
        entities: entitiesArray,
        metadata: {
          model: 'nlu_v1',
          processingTime: 45
        }
      };

      setResult(classificationResult);
      setHistory(prev => [{
        text,
        result: classificationResult,
        timestamp: new Date()
      }, ...prev].slice(0, 10)); // Keep last 10
      
      toast.success('Classification completed!');
    } catch (error) {
      console.error('Classification error:', error);
      toast.error('Failed to classify text');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Brain size={32} />
          <h1 className="text-3xl font-bold">NLU Testing</h1>
        </div>
        <p className="text-purple-100">
          Test your Natural Language Understanding models in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Test Input */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Input</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter text to classify
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g., I want to order pizza from nearby restaurant"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleTest();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Press Cmd/Ctrl + Enter to test
                </p>
              </div>

              <button
                onClick={handleTest}
                disabled={loading || !text.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Classifying...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Test Classification
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Example Queries */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Example Queries</h2>
            <div className="space-y-2">
              {[
                'I want to order pizza',
                'Track my parcel delivery',
                'Book a cab to airport',
                'Find nearby restaurants',
                'Check my wallet balance'
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setText(example)}
                  className="w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Current Result */}
          {result && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-purple-600" />
                Classification Result
              </h2>

              <div className="space-y-4">
                {/* Intent */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Intent</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                      {getConfidenceLabel(result.confidence)} Confidence
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-purple-900">{result.intent}</span>
                    <span className="text-3xl font-bold text-purple-600">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Confidence Score</span>
                    <span>{(result.confidence * 100).toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${result.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Entities */}
                {result.entities && result.entities.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Extracted Entities</h3>
                    <div className="space-y-2">
                      {result.entities.map((entity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="text-xs text-gray-500">{entity.type}</span>
                            <div className="font-medium text-gray-900">{entity.value}</div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {(entity.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {result.metadata && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Model</span>
                        <div className="font-medium text-gray-900">{result.metadata.model}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Processing Time</span>
                        <div className="font-medium text-gray-900">{result.metadata.processingTime}ms</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tests</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setText(item.text);
                      setResult(item.result);
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm text-gray-900 font-medium line-clamp-1">
                        {item.text}
                      </span>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        {item.result.intent}
                      </span>
                      <span className="text-xs text-gray-600">
                        {(item.result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!result && history.length === 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
              <Brain size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Yet</h3>
              <p className="text-gray-600">
                Enter some text and click &quot;Test Classification&quot; to see results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
