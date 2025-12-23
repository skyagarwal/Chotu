'use client';

import { useState, useEffect, useRef } from 'react';
import { llmApi, ModelInfo } from '@/lib/api/llm';
import { Send, RotateCcw, TrendingUp, Zap, Eye } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelUsed?: string;
  tokens?: number;
  cost?: number;
  latency?: number;
}

export default function LlmChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [filterCost, setFilterCost] = useState<'all' | 'free' | 'paid'>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [providers, setProviders] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, [filterCost, filterProvider]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Estimate cost when input changes
  useEffect(() => {
    if (input && selectedModel) {
      // Rough estimate: ~4 chars per token
      const estimatedTokens = Math.ceil(input.length / 4);
      llmApi.estimateCost({ tokens: estimatedTokens, model: selectedModel })
        .then(result => setEstimatedCost(result.estimatedCost))
        .catch(() => setEstimatedCost(0));
    } else {
      setEstimatedCost(0);
    }
  }, [input, selectedModel]);

  const loadModels = async () => {
    try {
      const params: any = {};
      if (filterCost !== 'all') params.cost = filterCost;
      if (filterProvider !== 'all') params.provider = filterProvider;

      const { models: allModels } = await llmApi.getModels(params);
      
      // Filter for chat-capable models and remove duplicates
      const chatModels = allModels.filter(m => m.capabilities?.chat);
      
      // Deduplicate by ID
      const uniqueModels = Array.from(
        new Map(chatModels.map(m => [m.id, m])).values()
      );
      
      setModels(uniqueModels);

      // Extract unique providers
      const uniqueProviders = Array.from(new Set(uniqueModels.map(m => m.provider)));
      setProviders(uniqueProviders);
      
      // Set default model (prefer free models)
      if (!selectedModel) {
        const defaultModel = uniqueModels.find(m => m.cost === 'free') || uniqueModels[0];
        if (defaultModel) {
          setSelectedModel(defaultModel.id);
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedModel) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const startTime = Date.now();
      
      // Call the chat endpoint
      const response = await fetch('http://localhost:3200/llm/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: userMessage.content }
          ],
          model: selectedModel,
          provider: 'auto', // Auto-detect provider (vllm, openai, groq, etc.)
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || data.response || data.message || 'No response',
        timestamp: new Date(),
        modelUsed: selectedModel,
        tokens: data.usage?.totalTokens || data.usage?.total_tokens,
        cost: data.estimatedCost || data.cost,
        latency,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const selectedModelInfo = models.find(m => m.id === selectedModel);

  // Calculate session stats
  const sessionStats = {
    totalMessages: messages.filter(m => m.role === 'assistant').length,
    totalCost: messages.reduce((sum, m) => sum + (m.cost || 0), 0),
    totalTokens: messages.reduce((sum, m) => sum + (m.tokens || 0), 0),
    avgLatency: messages.filter(m => m.latency).length > 0
      ? messages.reduce((sum, m) => sum + (m.latency || 0), 0) / messages.filter(m => m.latency).length
      : 0,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">LLM Chat</h1>
          <p className="text-sm text-gray-500 mt-1">Test models with live chat</p>
        </div>

        {/* Model Selector */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model ({models.length} available)
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="">Choose a model...</option>
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider}) {model.cost === 'free' ? '🆓' : '💳'}
              </option>
            ))}
          </select>

          {/* Filters */}
          <div className="mt-3 space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterCost('all')}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
                    filterCost === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterCost('free')}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
                    filterCost === 'free' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Free
                </button>
                <button
                  onClick={() => setFilterCost('paid')}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
                    filterCost === 'paid' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Paid
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="all">All Providers</option>
                {providers.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Model Info */}
        {selectedModelInfo && (
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Model Details</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium">{selectedModelInfo.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost:</span>
                  <span className={`font-medium ${selectedModelInfo.cost === 'free' ? 'text-green-600' : 'text-orange-600'}`}>
                    {selectedModelInfo.cost === 'free' ? '🆓 Free' : '💳 Paid'}
                  </span>
                </div>
                {selectedModelInfo.contextLength && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Context:</span>
                    <span className="font-medium">{selectedModelInfo.contextLength.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Capabilities</h4>
              <div className="flex flex-wrap gap-1">
                {selectedModelInfo.capabilities?.chat && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    💬 Chat
                  </span>
                )}
                {selectedModelInfo.capabilities?.functions && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    ⚙️ Functions
                  </span>
                )}
                {selectedModelInfo.capabilities?.vision && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    👁️ Vision
                  </span>
                )}
                {selectedModelInfo.capabilities?.streaming && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    ⚡ Streaming
                  </span>
                )}
              </div>
            </div>

            {selectedModelInfo.purpose && selectedModelInfo.purpose.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1">Best For</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedModelInfo.purpose.map((p, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session Stats */}
        {messages.length > 0 && (
          <div className="p-4 bg-gray-50 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Session Stats</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Send className="w-3 h-3" /> Messages
                </span>
                <span className="font-semibold">{sessionStats.totalMessages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Tokens
                </span>
                <span className="font-semibold">{sessionStats.totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Avg Latency
                </span>
                <span className="font-semibold">{Math.round(sessionStats.avgLatency)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Total Cost
                </span>
                <span className="font-semibold text-green-600">
                  ${sessionStats.totalCost.toFixed(6)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Clear Button */}
        <div className="mt-auto p-4">
          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedModelInfo ? selectedModelInfo.name : 'Select a model to start'}
              </h2>
              {selectedModelInfo && (
                <p className="text-sm text-gray-500">{selectedModelInfo.provider} · {selectedModelInfo.cost === 'free' ? 'Free' : 'Paid'}</p>
              )}
            </div>
            {estimatedCost > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Estimated next message cost</p>
                <p className="text-lg font-bold text-indigo-600">${estimatedCost.toFixed(6)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to LLM Chat</h3>
                <p className="text-gray-500">
                  {selectedModel 
                    ? 'Start chatting to test the selected model'
                    : 'Select a model from the sidebar to begin'
                  }
                </p>
              </div>
            </div>
          )}
          
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-5 py-3 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                
                {/* Metadata for assistant messages */}
                {message.role === 'assistant' && (message.tokens || message.cost !== undefined || message.latency) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {message.modelUsed && (
                      <span className="font-medium">
                        {models.find(m => m.id === message.modelUsed)?.name || message.modelUsed}
                      </span>
                    )}
                    {message.tokens && <span>🎯 {message.tokens} tokens</span>}
                    {message.cost !== undefined && (
                      <span className="text-green-600 font-semibold">
                        💰 ${message.cost.toFixed(6)}
                      </span>
                    )}
                    {message.latency && <span>⚡ {message.latency}ms</span>}
                  </div>
                )}
                
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-gray-600 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedModel ? "Type your message... (Shift+Enter for new line)" : "Select a model first..."}
              disabled={!selectedModel || isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !selectedModel || isLoading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
