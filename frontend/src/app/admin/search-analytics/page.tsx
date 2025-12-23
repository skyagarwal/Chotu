'use client';

import { BarChart3, TrendingUp, Clock, Search, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SearchStats {
  totalSearches: number;
  zeroResults: number;
  zeroResultsRate: number;
  avgResponseTime: number;
  topQueries: Array<{ query: string; count: number }>;
  dailyVolume: Array<{ date: string; count: number }>;
}

export default function SearchAnalyticsPage() {
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';
        const response = await fetch(`${apiUrl}/search/analytics/stats?days=7`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err: any) {
        console.error('Error fetching stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
        <h3 className="text-lg font-medium text-red-900">Failed to load analytics</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={32} />
          <h1 className="text-3xl font-bold">Search Analytics</h1>
        </div>
        <p className="text-blue-100">
          Monitor search performance and user behavior (Last 7 Days)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Search className="text-blue-600" size={24} />
            <span className="text-sm font-medium text-gray-500">Total Searches</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats?.totalSearches.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-1">Last 7 days</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-purple-600" size={24} />
            <span className="text-sm font-medium text-gray-500">Avg Response Time</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats?.avgResponseTime}ms</div>
          <div className="text-sm text-gray-500 mt-1">Average latency</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-green-600" size={24} />
            <span className="text-sm font-medium text-gray-500">Daily Average</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats?.dailyVolume.length ? Math.round(stats.totalSearches / stats.dailyVolume.length) : 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Searches per day</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Search className="text-orange-600" size={24} />
            <span className="text-sm font-medium text-gray-500">Zero Results</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {(stats?.zeroResultsRate! * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-red-600 mt-1">
            {stats?.zeroResults} failed searches
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Search Queries</h2>
        {stats?.topQueries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No search data available yet</div>
        ) : (
          <div className="space-y-3">
            {stats?.topQueries.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.query}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{item.count}</div>
                  <div className="text-xs text-gray-500">searches</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
