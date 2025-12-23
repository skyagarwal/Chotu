'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface Conversation {
  id: string;
  userId: string;
  userMessage: string;
  agentResponse: string;
  intent: string;
  confidence: number;
  success: boolean;
  timestamp: string;
  duration: number;
}

interface ConversationsTabProps {
  agentId: string;
}

export function ConversationsTab({ agentId }: ConversationsTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');

  useEffect(() => {
    loadConversations();
  }, [agentId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await mangwaleAIClient.getAgentConversations(agentId, 50);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      // Mock data for development
      setConversations([
        {
          id: '1',
          userId: '+1234567890',
          userMessage: 'I want to order pizza from Dominos',
          agentResponse: 'Great! I found 3 Dominos locations near you. Which one would you like to order from?',
          intent: 'order_food',
          confidence: 0.95,
          success: true,
          timestamp: new Date(Date.now() - 120000).toISOString(),
          duration: 1200,
        },
        {
          id: '2',
          userId: '+1234567891',
          userMessage: 'Show me Italian restaurants',
          agentResponse: 'Here are 5 Italian restaurants in your area...',
          intent: 'search_restaurant',
          confidence: 0.89,
          success: true,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          duration: 890,
        },
        {
          id: '3',
          userId: '+1234567892',
          userMessage: 'Cancel my order',
          agentResponse: 'I encountered an error processing your cancellation. Please try again.',
          intent: 'cancel_order',
          confidence: 0.72,
          success: false,
          timestamp: new Date(Date.now() - 720000).toISOString(),
          duration: 2100,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.userMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.intent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'success' && conv.success) ||
      (filterStatus === 'failed' && !conv.success);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#059211]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search conversations by message or intent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'all'
                ? 'bg-[#059211] text-white'
                : 'bg-white border-2 border-gray-200 hover:border-[#059211]'
            }`}
          >
            All ({conversations.length})
          </button>
          <button
            onClick={() => setFilterStatus('success')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-white border-2 border-gray-200 hover:border-green-600'
            }`}
          >
            Success ({conversations.filter((c) => c.success).length})
          </button>
          <button
            onClick={() => setFilterStatus('failed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'failed'
                ? 'bg-red-600 text-white'
                : 'bg-white border-2 border-gray-200 hover:border-red-600'
            }`}
          >
            Failed ({conversations.filter((c) => !c.success).length})
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-600">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {conv.success ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <XCircle className="text-red-600" size={20} />
                  )}
                  <span className="font-mono text-sm text-gray-600">{conv.userId}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {conv.intent}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {(conv.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {conv.duration}ms
                  </span>
                  <span>
                    {new Date(conv.timestamp).toLocaleTimeString()} •{' '}
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-xs font-medium text-blue-700 mb-1">User</div>
                  <p className="text-gray-900">{conv.userMessage}</p>
                </div>
                <div className={`rounded-lg p-4 ${conv.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-xs font-medium mb-1 ${conv.success ? 'text-green-700' : 'text-red-700'}`}>
                    Agent
                  </div>
                  <p className="text-gray-900">{conv.agentResponse}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
