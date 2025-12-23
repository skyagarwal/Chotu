'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wand2,
  Upload,
  Send,
  RefreshCw,
  Image as ImageIcon,
  Camera,
  Search,
  Hash,
  CheckCircle,
  Receipt,
  Truck,
  Package,
  ShoppingCart,
  FileText,
  Eye,
  Clock,
  AlertTriangle,
  ChevronRight,
  Copy,
  Check,
  Trash2,
  Settings,
  Zap,
} from 'lucide-react';
import Image from 'next/image';

interface VisionCapability {
  intent: string;
  description: string;
  examples: string[];
}

interface VisionResult {
  intent: string;
  result: Record<string, unknown>;
  confidence: number;
  processingTime: number;
  suggestedActions?: Array<{
    action: string;
    label: string;
    data?: Record<string, unknown>;
  }>;
  provider?: string;
  model?: string;
}

interface HistoryItem {
  id: string;
  timestamp: Date;
  imageUrl: string;
  context: string;
  intent: string;
  result: VisionResult;
}

const INTENT_ICONS: Record<string, typeof Wand2> = {
  count: Hash,
  search: Search,
  quality: CheckCircle,
  parcel: Package,
  receipt: Receipt,
  vehicle: Truck,
  shelf: ShoppingCart,
  analyze: FileText,
  auto: Wand2,
};

const INTENT_COLORS: Record<string, string> = {
  count: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  search: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  quality: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  parcel: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
  receipt: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30',
  vehicle: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  shelf: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
  analyze: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30',
  auto: 'text-gray-500 bg-gray-100 dark:bg-gray-900/30',
};

export default function VisionPlaygroundPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [context, setContext] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<{
    capabilities: VisionCapability[];
    examples: Array<{ context: string; expectedIntent: string }>;
  } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCapabilities = useCallback(async () => {
    try {
      const response = await fetch('/api/vision/agent/capabilities');
      if (response.ok) {
        const data = await response.json();
        setCapabilities(data);
      }
    } catch (err) {
      console.error('Failed to fetch capabilities:', err);
    }
  }, []);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('context', context);
      formData.append('intent', selectedIntent);
      formData.append('sessionId', `playground_${Date.now()}`);

      const response = await fetch('/api/vision/agent/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }

      const data = await response.json();
      setResult(data);

      // Add to history
      const historyItem: HistoryItem = {
        id: `${Date.now()}`,
        timestamp: new Date(),
        imageUrl: previewUrl,
        context,
        intent: data.intent,
        result: data,
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setContext('');
    setSelectedIntent('auto');
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadFromHistory = (item: HistoryItem) => {
    setPreviewUrl(item.imageUrl);
    setContext(item.context);
    setSelectedIntent(item.intent);
    setResult(item.result);
  };

  const IntentIcon = INTENT_ICONS[selectedIntent] || Wand2;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wand2 className="w-8 h-8 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Vision Agent Playground
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Test and explore Vision AI capabilities with any image
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Input Image
            </h3>
            
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition ${
                previewUrl
                  ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Selected"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setPreviewUrl('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Drag and drop an image here, or
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-500 hover:underline"
                    >
                      browse to upload
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports JPG, PNG, WebP (max 10MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Context & Intent */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration
            </h3>

            <div className="space-y-4">
              {/* Intent Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Intent (what to analyze)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['auto', 'count', 'search', 'quality', 'parcel', 'receipt', 'vehicle', 'shelf', 'analyze'].map(
                    (intent) => {
                      const Icon = INTENT_ICONS[intent] || Wand2;
                      return (
                        <button
                          key={intent}
                          onClick={() => setSelectedIntent(intent)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                            selectedIntent === intent
                              ? `${INTENT_COLORS[intent]} border-current`
                              : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm capitalize">{intent}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Context (optional message)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g., &quot;How many items are in this photo?&quot; or &quot;Is this food fresh?&quot;"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Example Prompts */}
              {capabilities?.examples && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Quick examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.examples.slice(0, 5).map((example, i) => (
                      <button
                        key={i}
                        onClick={() => setContext(example.context)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {example.context}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={handleProcess}
                disabled={!selectedImage || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Process Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result */}
          {(result || error) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Result
                </h3>
                {result && (
                  <button
                    onClick={handleCopyResult}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy JSON
                      </>
                    )}
                  </button>
                )}
              </div>

              {error ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className={`p-3 rounded-lg ${INTENT_COLORS[result.intent]}`}>
                      <p className="text-xs opacity-70">Intent</p>
                      <p className="font-semibold capitalize">{result.intent}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <p className="text-xs text-green-600 dark:text-green-400">Confidence</p>
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        {(result.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <p className="text-xs text-blue-600 dark:text-blue-400">Processing</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        {result.processingTime.toFixed(0)}ms
                      </p>
                    </div>
                  </div>

                  {/* Provider Info */}
                  {(result.provider || result.model) && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {result.provider && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Provider:</span> {result.provider}
                        </span>
                      )}
                      {result.model && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Model:</span> {result.model}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Result Data */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Analysis Result:
                    </p>
                    <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>

                  {/* Suggested Actions */}
                  {result.suggestedActions && result.suggestedActions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Suggested Actions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.suggestedActions.map((action, i) => (
                          <button
                            key={i}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/30"
                          >
                            <ChevronRight className="w-4 h-4" />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Capabilities */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Available Capabilities
            </h3>
            <div className="space-y-3">
              {[
                { intent: 'count', desc: 'Count objects in image' },
                { intent: 'search', desc: 'Visual product search' },
                { intent: 'quality', desc: 'Food/product quality check' },
                { intent: 'parcel', desc: 'Parcel/package analysis' },
                { intent: 'receipt', desc: 'Receipt OCR & extraction' },
                { intent: 'vehicle', desc: 'Vehicle compliance check' },
                { intent: 'shelf', desc: 'Shelf inventory analysis' },
                { intent: 'analyze', desc: 'General image analysis' },
              ].map(({ intent, desc }) => {
                const Icon = INTENT_ICONS[intent];
                return (
                  <div
                    key={intent}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setSelectedIntent(intent)}
                  >
                    <div className={`p-2 rounded-lg ${INTENT_COLORS[intent]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {intent}
                      </p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent History
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No history yet. Process an image to see results here.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLoadFromHistory(item)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left"
                  >
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize truncate">
                        {item.intent}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.context || 'No context'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.timestamp.toLocaleTimeString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
