'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShoppingBag,
  Heart,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Activity,
  Download,
  Database,
  Zap,
} from 'lucide-react';

interface UserProfile {
  id: number;
  user_id: number;
  phone: string;
  dietary_type: string | null;
  dietary_restrictions: string[] | null;
  allergies: string[] | null;
  favorite_cuisines: Record<string, number> | null;
  disliked_ingredients: string[] | null;
  avg_order_value: number | null;
  order_frequency: string | null;
  price_sensitivity: string | null;
  preferred_meal_times: Record<string, string> | null;
  communication_tone: string | null;
  personality_traits: Record<string, any> | null;
  profile_completeness: number;
  last_conversation_analyzed: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  is_guest: boolean;
  total_conversations: number;
  total_orders: number;
}

interface ProfileStats {
  total_profiles: number;
  guest_profiles: number;
  registered_profiles: number;
  avg_completeness: number;
  profiles_today: number;
  profiles_this_week: number;
}

interface ConversationInsight {
  id: number;
  insight_type: string;
  insight_category: string;
  extracted_value: any;
  confidence: number;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

export default function UserProfilesPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [insights, setInsights] = useState<ConversationInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'guest' | 'registered'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'completeness' | 'orders'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        filter: filterType,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`${API_BASE}/api/personalization/profiles?${params}`);
      if (!response.ok) throw new Error('Failed to fetch profiles');
      
      const data = await response.json();
      setProfiles(data.profiles || []);
      setTotalPages(data.totalPages || 1);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
      setError('Failed to load user profiles');
      // Load sample data on error
      loadSampleData();
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterType, sortBy, sortOrder]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/personalization/profiles/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Set sample stats
      setStats({
        total_profiles: 1,
        guest_profiles: 0,
        registered_profiles: 1,
        avg_completeness: 80,
        profiles_today: 0,
        profiles_this_week: 0,
      });
    }
  };

  const fetchInsights = async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/personalization/profiles/${userId}/insights`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setInsights([]);
    }
  };

  const loadSampleData = () => {
    setProfiles([
      {
        id: 1,
        user_id: 1,
        phone: '+919876543210',
        dietary_type: 'veg',
        dietary_restrictions: ['no onion'],
        allergies: null,
        favorite_cuisines: { 'North Indian': 5, 'South Indian': 3 },
        disliked_ingredients: ['capsicum'],
        avg_order_value: 350,
        order_frequency: 'weekly',
        price_sensitivity: 'medium',
        preferred_meal_times: { lunch: '12:30', dinner: '20:00' },
        communication_tone: 'friendly',
        personality_traits: { patience: 0.7, detail_oriented: 0.8 },
        profile_completeness: 80,
        last_conversation_analyzed: '2025-12-18T10:30:00Z',
        created_at: '2025-11-19T18:54:54Z',
        updated_at: '2025-12-18T10:30:00Z',
        is_guest: false,
        total_conversations: 45,
        total_orders: 12,
      },
    ]);
    setStats({
      total_profiles: 1,
      guest_profiles: 0,
      registered_profiles: 1,
      avg_completeness: 80,
      profiles_today: 0,
      profiles_this_week: 0,
    });
  };

  useEffect(() => {
    fetchProfiles();
    fetchStats();
  }, [fetchProfiles]);

  const handleViewProfile = async (profile: UserProfile) => {
    setSelectedProfile(profile);
    await fetchInsights(profile.user_id);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/personalization/profiles/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-profiles-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{
    success: boolean;
    summary?: { processed: number; created: number; failed: number };
    totalProfilesNow?: number;
    error?: string;
  } | null>(null);

  const handleBackfill = async () => {
    if (!confirm('This will analyze existing conversations and create profiles for phones without one. Continue?')) {
      return;
    }
    
    setBackfillRunning(true);
    setBackfillResult(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/personalization/profiles/backfill?limit=500`, {
        method: 'POST',
      });
      const data = await response.json();
      setBackfillResult(data);
      
      if (data.success) {
        // Refresh profiles and stats
        fetchProfiles();
        fetchStats();
      }
    } catch (err: any) {
      setBackfillResult({ success: false, error: err.message });
    } finally {
      setBackfillRunning(false);
    }
  };

  const getCompletenessColor = (completeness: number) => {
    if (completeness >= 80) return 'text-green-600 bg-green-100';
    if (completeness >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            User Profiles
          </h1>
          <p className="text-gray-500 mt-1">
            Manage user preferences, dietary restrictions, and conversation insights
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBackfill}
            disabled={backfillRunning}
            className="px-4 py-2 text-orange-700 border border-orange-300 bg-orange-50 rounded-lg hover:bg-orange-100 flex items-center gap-2 disabled:opacity-50"
          >
            {backfillRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {backfillRunning ? 'Running...' : 'Backfill Profiles'}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => { fetchProfiles(); fetchStats(); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Backfill Result Banner */}
      {backfillResult && (
        <div className={`rounded-lg p-4 mb-6 ${backfillResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {backfillResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={backfillResult.success ? 'text-green-700' : 'text-red-700'}>
                {backfillResult.success 
                  ? `Backfill complete! Created ${backfillResult.summary?.created || 0} profiles (${backfillResult.summary?.failed || 0} failed). Total profiles now: ${backfillResult.totalProfilesNow || 'N/A'}`
                  : `Backfill failed: ${backfillResult.error}`
                }
              </span>
            </div>
            <button
              onClick={() => setBackfillResult(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Profiles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_profiles}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Guest Profiles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.guest_profiles}</p>
              </div>
              <User className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Registered Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.registered_profiles}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Completeness</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avg_completeness}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'guest' | 'registered')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Profiles</option>
            <option value="guest">Guest Only</option>
            <option value="registered">Registered Only</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updated' | 'completeness' | 'orders')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="updated">Last Updated</option>
            <option value="completeness">Completeness</option>
            <option value="orders">Order Count</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {sortOrder === 'desc' ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Profiles Table */}
      {!loading && profiles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Dietary</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Preferences</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Completeness</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Last Updated</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${profile.is_guest ? 'bg-gray-100' : 'bg-blue-100'}`}>
                        <User className={`h-5 w-5 ${profile.is_guest ? 'text-gray-500' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{profile.phone}</p>
                        <p className="text-xs text-gray-500">
                          {profile.is_guest ? 'Guest' : `User #${profile.user_id}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      {profile.dietary_type && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          {profile.dietary_type}
                        </span>
                      )}
                      {profile.dietary_restrictions && profile.dietary_restrictions.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {profile.dietary_restrictions.slice(0, 2).join(', ')}
                          {profile.dietary_restrictions.length > 2 && ` +${profile.dietary_restrictions.length - 2}`}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {profile.favorite_cuisines && Object.keys(profile.favorite_cuisines).slice(0, 2).map((cuisine) => (
                        <span key={cuisine} className="inline-flex px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                          {cuisine}
                        </span>
                      ))}
                      {profile.price_sensitivity && (
                        <span className="inline-flex px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                          {profile.price_sensitivity} budget
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${profile.profile_completeness >= 80 ? 'bg-green-500' : profile.profile_completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${profile.profile_completeness}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getCompletenessColor(profile.profile_completeness)}`}>
                        {profile.profile_completeness}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewProfile(profile)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View Profile"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                        title="View Conversations"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                        title="View Orders"
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && profiles.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No profiles found</h3>
          <p className="text-gray-500">
            User profiles are created automatically as users interact with the bot.
            <br />
            Profiles will appear here after conversations are analyzed.
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Profile Details</h2>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <p className="font-medium">{selectedProfile.phone}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">User ID</label>
                    <p className="font-medium">{selectedProfile.user_id}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Type</label>
                    <p className="font-medium">{selectedProfile.is_guest ? 'Guest' : 'Registered'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Completeness</label>
                    <p className="font-medium">{selectedProfile.profile_completeness}%</p>
                  </div>
                </div>
              </div>

              {/* Dietary Preferences */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Dietary Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Diet Type</label>
                    <p className="font-medium">{selectedProfile.dietary_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Restrictions</label>
                    <p className="font-medium">{selectedProfile.dietary_restrictions?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Allergies</label>
                    <p className="font-medium">{selectedProfile.allergies?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Dislikes</label>
                    <p className="font-medium">{selectedProfile.disliked_ingredients?.join(', ') || 'None'}</p>
                  </div>
                </div>
              </div>

              {/* Favorite Cuisines */}
              {selectedProfile.favorite_cuisines && Object.keys(selectedProfile.favorite_cuisines).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Favorite Cuisines</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedProfile.favorite_cuisines).map(([cuisine, score]) => (
                      <span key={cuisine} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {cuisine} ({score})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Shopping Behavior */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Shopping Behavior</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Avg Order Value</label>
                    <p className="font-medium">₹{selectedProfile.avg_order_value || 0}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Frequency</label>
                    <p className="font-medium">{selectedProfile.order_frequency || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Price Sensitivity</label>
                    <p className="font-medium">{selectedProfile.price_sensitivity || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              {/* Communication Style */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Communication Style</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Tone</label>
                    <p className="font-medium">{selectedProfile.communication_tone || 'Not analyzed'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Personality Traits</label>
                    <p className="font-medium">
                      {selectedProfile.personality_traits 
                        ? Object.entries(selectedProfile.personality_traits).map(([k, v]) => `${k}: ${v}`).join(', ')
                        : 'Not analyzed'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Insights */}
              {insights.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Insights</h3>
                  <div className="space-y-2">
                    {insights.slice(0, 5).map((insight) => (
                      <div key={insight.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{insight.insight_type}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {typeof insight.extracted_value === 'object' 
                            ? JSON.stringify(insight.extracted_value)
                            : insight.extracted_value}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{insight.insight_category}</span>
                          <span className="text-xs text-blue-600">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedProfile(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
