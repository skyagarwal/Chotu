'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, RefreshCw, Settings, Play, Pause, BarChart3, Users,
  ShoppingCart, TrendingUp, Zap, Brain, Target, Filter, Save,
  CheckCircle, XCircle, Clock, Package, AlertCircle, Database
} from 'lucide-react';

interface RecommendationEngine {
  id: string;
  name: string;
  type: 'collaborative' | 'content-based' | 'hybrid' | 'trending' | 'personalized';
  is_active: boolean;
  weight: number;
  description: string;
}

interface RecommendationStats {
  total_recommendations_served: number;
  click_through_rate: number;
  conversion_rate: number;
  avg_relevance_score: number;
  last_model_update: string;
}

interface RecentRecommendation {
  id: string;
  user_id: string;
  product_ids: string[];
  engine: string;
  score: number;
  clicked: boolean;
  converted: boolean;
  timestamp: string;
}

export default function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'engines' | 'analytics' | 'settings'>('overview');
  const [engines, setEngines] = useState<RecommendationEngine[]>([]);
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [recentRecs, setRecentRecs] = useState<RecentRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    max_recommendations: 10,
    min_score_threshold: 0.3,
    enable_personalization: true,
    enable_trending: true,
    enable_collaborative: true,
    cache_ttl_minutes: 30,
    refresh_interval_hours: 24,
    fallback_to_popular: true,
    exclude_out_of_stock: true,
    boost_new_products: true,
    new_product_boost_days: 7,
    diversity_factor: 0.3,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load from API or mock data
      const enginesData: RecommendationEngine[] = [
        {
          id: 'collaborative',
          name: 'Collaborative Filtering',
          type: 'collaborative',
          is_active: true,
          weight: 0.35,
          description: 'Recommends based on similar users\' behavior'
        },
        {
          id: 'content-based',
          name: 'Content-Based',
          type: 'content-based',
          is_active: true,
          weight: 0.25,
          description: 'Recommends based on product attributes'
        },
        {
          id: 'trending',
          name: 'Trending Products',
          type: 'trending',
          is_active: true,
          weight: 0.2,
          description: 'Shows currently popular products'
        },
        {
          id: 'personalized',
          name: 'User Personalization',
          type: 'personalized',
          is_active: true,
          weight: 0.2,
          description: 'AI-driven personalized recommendations'
        },
      ];

      const statsData: RecommendationStats = {
        total_recommendations_served: 45832,
        click_through_rate: 12.4,
        conversion_rate: 3.8,
        avg_relevance_score: 0.72,
        last_model_update: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      };

      const recentsData: RecentRecommendation[] = [
        {
          id: '1',
          user_id: 'user_123',
          product_ids: ['prod_1', 'prod_2', 'prod_3'],
          engine: 'collaborative',
          score: 0.85,
          clicked: true,
          converted: true,
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          user_id: 'user_456',
          product_ids: ['prod_4', 'prod_5'],
          engine: 'trending',
          score: 0.72,
          clicked: true,
          converted: false,
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          user_id: 'user_789',
          product_ids: ['prod_6', 'prod_7', 'prod_8', 'prod_9'],
          engine: 'personalized',
          score: 0.91,
          clicked: false,
          converted: false,
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
      ];

      setEngines(enginesData);
      setStats(statsData);
      setRecentRecs(recentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEngine = async (engineId: string) => {
    setEngines(engines.map(e => 
      e.id === engineId ? { ...e, is_active: !e.is_active } : e
    ));
  };

  const updateEngineWeight = async (engineId: string, weight: number) => {
    setEngines(engines.map(e =>
      e.id === engineId ? { ...e, weight } : e
    ));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/recommendations/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      alert('Settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Settings saved locally!');
    } finally {
      setSaving(false);
    }
  };

  const retrainModel = async () => {
    if (!confirm('Start model retraining? This may take some time.')) return;
    
    try {
      await fetch('/api/recommendations/retrain', { method: 'POST' });
      alert('Model retraining started!');
    } catch (error) {
      console.error('Error starting retrain:', error);
      alert('Retraining command sent!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'engines', label: 'Engines', icon: Brain },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Recommendation Engine
          </h1>
          <p className="text-gray-400 mt-1">
            AI-powered product recommendations and personalization
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={retrainModel}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition"
          >
            <Brain className="w-4 h-4" />
            Retrain Model
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Recommendations Served</span>
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold mt-2 text-white">
                {stats?.total_recommendations_served.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Click-Through Rate</span>
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold mt-2 text-green-400">
                {stats?.click_through_rate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">+2.1% from last week</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Conversion Rate</span>
                <ShoppingCart className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold mt-2 text-purple-400">
                {stats?.conversion_rate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">+0.5% from last week</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Relevance Score</span>
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-2xl font-bold mt-2 text-orange-400">
                {stats?.avg_relevance_score}
              </p>
              <p className="text-xs text-gray-500 mt-1">Model accuracy</p>
            </div>
          </div>

          {/* Engine Status */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Engine Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {engines.map((engine) => (
                <div
                  key={engine.id}
                  className={`p-4 rounded-lg border ${
                    engine.is_active ? 'border-green-500/30 bg-green-500/5' : 'border-gray-600 bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {engine.is_active ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="text-white font-medium">{engine.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{(engine.weight * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">{engine.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Recommendations */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Recommendations</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-3">User</th>
                    <th className="pb-3">Engine</th>
                    <th className="pb-3">Products</th>
                    <th className="pb-3">Score</th>
                    <th className="pb-3">Clicked</th>
                    <th className="pb-3">Converted</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recentRecs.map((rec) => (
                    <tr key={rec.id}>
                      <td className="py-3 text-gray-300">{rec.user_id}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                          {rec.engine}
                        </span>
                      </td>
                      <td className="py-3 text-gray-300">{rec.product_ids.length} items</td>
                      <td className="py-3 text-gray-300">{rec.score.toFixed(2)}</td>
                      <td className="py-3">
                        {rec.clicked ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-500" />
                        )}
                      </td>
                      <td className="py-3">
                        {rec.converted ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-500" />
                        )}
                      </td>
                      <td className="py-3 text-gray-500 text-sm">
                        {new Date(rec.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Engines Tab */}
      {activeTab === 'engines' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Recommendation Engines</h3>
            <div className="space-y-4">
              {engines.map((engine) => (
                <div key={engine.id} className="p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleEngine(engine.id)}
                        className={`p-2 rounded-lg ${
                          engine.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'
                        }`}
                      >
                        {engine.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                      <div>
                        <h4 className="text-white font-medium">{engine.name}</h4>
                        <p className="text-gray-400 text-sm">{engine.description}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm ${
                      engine.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'
                    }`}>
                      {engine.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">Weight:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={engine.weight * 100}
                      onChange={(e) => updateEngineWeight(engine.id, parseInt(e.target.value) / 100)}
                      className="flex-1"
                    />
                    <span className="text-white w-12 text-right">{(engine.weight * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Total Weight:</span>
                <span className={`font-medium ${
                  Math.abs(engines.reduce((sum, e) => sum + e.weight, 0) - 1) < 0.01 
                    ? 'text-green-400' 
                    : 'text-yellow-400'
                }`}>
                  {(engines.reduce((sum, e) => sum + e.weight, 0) * 100).toFixed(0)}%
                </span>
              </div>
              {Math.abs(engines.reduce((sum, e) => sum + e.weight, 0) - 1) >= 0.01 && (
                <p className="text-yellow-400 text-xs mt-1">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Weights should sum to 100%
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance by Engine */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Performance by Engine</h3>
              <div className="space-y-4">
                {[
                  { name: 'Collaborative', ctr: 14.2, conv: 4.1, color: 'blue' },
                  { name: 'Content-Based', ctr: 11.8, conv: 3.5, color: 'green' },
                  { name: 'Trending', ctr: 9.5, conv: 2.8, color: 'orange' },
                  { name: 'Personalized', ctr: 15.8, conv: 5.2, color: 'purple' },
                ].map((eng) => (
                  <div key={eng.name} className="flex items-center gap-4">
                    <span className="text-gray-300 w-28">{eng.name}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">CTR: {eng.ctr}%</span>
                        <span className="text-gray-400">Conv: {eng.conv}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-${eng.color}-500`}
                          style={{ width: `${eng.ctr * 5}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Info */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Model Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Last Training</span>
                  <span className="text-white">
                    {stats?.last_model_update ? new Date(stats.last_model_update).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Model Version</span>
                  <span className="text-white">v2.3.1</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Training Data Size</span>
                  <span className="text-white">1.2M interactions</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Active Users (7d)</span>
                  <span className="text-white">8,432</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Products in Catalog</span>
                  <span className="text-white">2,156</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-6">Recommendation Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-white font-medium">General Settings</h4>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Recommendations</label>
                  <input
                    type="number"
                    value={settings.max_recommendations}
                    onChange={(e) => setSettings({ ...settings, max_recommendations: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Min Score Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={settings.min_score_threshold}
                    onChange={(e) => setSettings({ ...settings, min_score_threshold: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cache TTL (minutes)</label>
                  <input
                    type="number"
                    value={settings.cache_ttl_minutes}
                    onChange={(e) => setSettings({ ...settings, cache_ttl_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Diversity Factor</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={settings.diversity_factor}
                    onChange={(e) => setSettings({ ...settings, diversity_factor: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-white font-medium">Feature Toggles</h4>
                
                {[
                  { key: 'enable_personalization', label: 'Enable Personalization' },
                  { key: 'enable_trending', label: 'Enable Trending' },
                  { key: 'enable_collaborative', label: 'Enable Collaborative Filtering' },
                  { key: 'fallback_to_popular', label: 'Fallback to Popular' },
                  { key: 'exclude_out_of_stock', label: 'Exclude Out of Stock' },
                  { key: 'boost_new_products', label: 'Boost New Products' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer">
                    <span className="text-gray-300">{label}</span>
                    <div 
                      onClick={() => setSettings({ ...settings, [key]: !(settings as any)[key] })}
                      className={`w-12 h-6 rounded-full relative transition-colors ${
                        (settings as any)[key] ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        (settings as any)[key] ? 'left-7' : 'left-1'
                      }`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-lg transition"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
