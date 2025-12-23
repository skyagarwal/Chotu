'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  Database,
  Filter,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface MemoryEntry {
  id: string;
  userId?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  intent?: string;
  sentiment?: string;
  entities?: Record<string, any>;
  embedding?: number[];
  timestamp: string;
  metadata?: Record<string, any>;
}

interface MemoryStats {
  totalMemories: number;
  uniqueSessions: number;
  uniqueUsers: number;
  memoriesLast24h: number;
  memoriesLast7d: number;
  avgMemoriesPerSession: number;
  indexSize?: string;
}

interface SearchResult {
  entry: MemoryEntry;
  score: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

export default function ConversationMemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [sessionHistory, setSessionHistory] = useState<MemoryEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionIdFilter, setSessionIdFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ type: 'session' | 'user'; id: string } | null>(null);
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/memory/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Set sample stats
      setStats({
        totalMemories: 0,
        uniqueSessions: 0,
        uniqueUsers: 0,
        memoriesLast24h: 0,
        memoriesLast7d: 0,
        avgMemoriesPerSession: 0,
      });
    }
  };

  const fetchSessionHistory = async (sessionId: string) => {
    if (!sessionId.trim()) {
      setSessionHistory([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/ai/memory/session/${encodeURIComponent(sessionId)}?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setSessionHistory(data.history || []);
      } else {
        setSessionHistory([]);
      }
    } catch (err) {
      console.error('Failed to fetch session history:', err);
      setSessionHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const response = await fetch(`${API_BASE}/api/ai/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          userId: userIdFilter ? parseInt(userIdFilter, 10) : undefined,
          sessionId: sessionIdFilter || undefined,
          limit: 20,
          minScore: 0.5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/memory/session/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Deleted ${data.deleted} memory entries for session`);
        setShowDeleteModal(null);
        fetchStats();
        if (sessionIdFilter === sessionId) {
          setSessionHistory([]);
        }
      } else {
        alert('Failed to delete session memories');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete session memories');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/memory/user/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Deleted ${data.deleted} memory entries for user (GDPR compliance)`);
        setShowDeleteModal(null);
        fetchStats();
      } else {
        alert('Failed to delete user memories');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete user memories');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchStats().finally(() => setLoading(false));
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return 'bg-gray-100 text-gray-600';
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-700';
      case 'negative': return 'bg-red-100 text-red-700';
      case 'neutral': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-600" />
            Conversation Memory
          </h1>
          <p className="text-gray-500 mt-1">
            View and manage what the AI remembers from conversations
          </p>
        </div>
        <button
          onClick={() => fetchStats()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Memories</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMemories.toLocaleString()}</p>
              </div>
              <Database className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unique Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueSessions.toLocaleString()}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueUsers.toLocaleString()}</p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Last 24 Hours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.memoriesLast24h.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search Memories
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by content (semantic search)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Session ID (phone)"
              value={sessionIdFilter}
              onChange={(e) => setSessionIdFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="User ID"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => fetchSessionHistory(sessionIdFilter)}
            disabled={!sessionIdFilter.trim()}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Load Session History
          </button>
          {sessionIdFilter && (
            <button
              onClick={() => setShowDeleteModal({ type: 'session', id: sessionIdFilter })}
              className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
            >
              Delete Session Memories
            </button>
          )}
          {userIdFilter && (
            <button
              onClick={() => setShowDeleteModal({ type: 'user', id: userIdFilter })}
              className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
            >
              Delete User Memories (GDPR)
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Semantic Search Results ({searchResults.length})
          </h3>
          <div className="space-y-3">
            {searchResults.map((result, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${result.entry.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {result.entry.role}
                    </span>
                    <span className="text-xs text-gray-500">{result.entry.sessionId}</span>
                    {result.entry.intent && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                        {result.entry.intent}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-purple-600">
                    {(result.score * 100).toFixed(1)}% match
                  </span>
                </div>
                <p className="text-gray-700">{result.entry.content}</p>
                {result.entry.summary && (
                  <p className="text-sm text-gray-500 mt-1 italic">Summary: {result.entry.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(result.entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session History */}
      {sessionHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            Session History: {sessionIdFilter} ({sessionHistory.length} messages)
          </h3>
          <div className="space-y-2">
            {sessionHistory.map((memory, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg ${memory.role === 'user' ? 'bg-blue-50 ml-0 mr-12' : 'bg-green-50 ml-12 mr-0'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${memory.role === 'user' ? 'text-blue-700' : 'text-green-700'}`}>
                    {memory.role === 'user' ? 'User' : 'Assistant'}
                  </span>
                  <div className="flex items-center gap-2">
                    {memory.sentiment && (
                      <span className={`px-2 py-0.5 text-xs rounded ${getSentimentColor(memory.sentiment)}`}>
                        {memory.sentiment}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(memory.timestamp)}
                    </span>
                    <button
                      onClick={() => setExpandedMemory(expandedMemory === memory.id ? null : memory.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {expandedMemory === memory.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">{memory.content}</p>
                
                {/* Expanded Details */}
                {expandedMemory === memory.id && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {memory.intent && (
                        <div>
                          <span className="text-gray-500">Intent:</span>{' '}
                          <span className="font-medium">{memory.intent}</span>
                        </div>
                      )}
                      {memory.summary && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Summary:</span>{' '}
                          <span className="font-medium">{memory.summary}</span>
                        </div>
                      )}
                      {memory.entities && Object.keys(memory.entities).length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Entities:</span>{' '}
                          <span className="font-mono">{JSON.stringify(memory.entities)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && sessionHistory.length === 0 && searchResults.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No memories loaded</h3>
          <p className="text-gray-500">
            Enter a session ID (phone number) above to view conversation history,
            <br />
            or use semantic search to find relevant memories across all sessions.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete {showDeleteModal.type === 'session' ? 'Session' : 'User'} Memories
            </h3>
            <p className="text-gray-600 mb-4">
              {showDeleteModal.type === 'session' ? (
                <>
                  This will permanently delete all memories for session <strong>{showDeleteModal.id}</strong>.
                  This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete all memories for user <strong>{showDeleteModal.id}</strong> (GDPR compliance).
                  This action cannot be undone.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteModal.type === 'session') {
                    handleDeleteSession(showDeleteModal.id);
                  } else {
                    handleDeleteUser(showDeleteModal.id);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
