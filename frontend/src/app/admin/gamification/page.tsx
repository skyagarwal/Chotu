'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Gamepad2, 
  Settings, 
  Database, 
  TrendingUp, 
  Users,
  Award,
  Zap,
  Activity,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface GamificationStats {
  totalGamesPlayed: number;
  totalRewardsCredited: number;
  activeUsers: number;
  trainingSamplesCollected: number;
  approvalRate: number;
  avgGameScore: number;
}

export default function GamificationDashboard() {
  const [stats, setStats] = useState<GamificationStats>({
    totalGamesPlayed: 0,
    totalRewardsCredited: 0,
    activeUsers: 0,
    trainingSamplesCollected: 0,
    approvalRate: 0,
    avgGameScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await mangwaleAIClient.getGamificationStats();
      
      if (response.success) {
        setStats({
          totalGamesPlayed: response.data.summary.totalGames,
          totalRewardsCredited: response.data.summary.totalRewards,
          activeUsers: response.data.summary.activeUsers,
          trainingSamplesCollected: response.data.trainingSamples.total,
          approvalRate: response.data.systemStatus.autoApprovalRate,
          avgGameScore: response.data.systemStatus.avgConfidenceScore,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Games Played',
      value: stats.totalGamesPlayed.toLocaleString(),
      icon: Gamepad2,
      color: 'blue',
      change: '+12%',
    },
    {
      title: 'Rewards Credited',
      value: `₹${stats.totalRewardsCredited.toLocaleString()}`,
      icon: Award,
      color: 'green',
      change: '+8%',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: Users,
      color: 'purple',
      change: '+15%',
    },
    {
      title: 'Training Samples',
      value: stats.trainingSamplesCollected.toLocaleString(),
      icon: Database,
      color: 'orange',
      change: '+23%',
    },
  ];

  const quickActions = [
    {
      title: 'Gamification Settings',
      description: 'Configure rewards, limits, and game parameters',
      icon: Settings,
      href: '/admin/gamification/settings',
      color: 'blue',
    },
    {
      title: 'Training Samples',
      description: 'Review and approve collected training data',
      icon: Database,
      href: '/admin/gamification/training-samples',
      color: 'green',
    },
    {
      title: 'Game Questions',
      description: 'Manage question bank for all game types',
      icon: Zap,
      href: '/admin/gamification/questions',
      color: 'purple',
    },
    {
      title: 'Analytics',
      description: 'View detailed gamification analytics',
      icon: TrendingUp,
      href: '/admin/gamification/analytics',
      color: 'orange',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Gamepad2 size={32} />
                <h1 className="text-4xl font-bold">Gamification System</h1>
              </div>
              <p className="text-green-100 text-lg">
                Self-learning AI training through interactive games
              </p>
            </div>
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                    <Icon className={`text-${stat.color}-600`} size={24} />
                  </div>
                  <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                    {stat.change}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6 hover:shadow-md hover:border-green-200 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 bg-${action.color}-100 rounded-lg`}>
                        <Icon className={`text-${action.color}-600`} size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-gray-600 text-sm">{action.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" size={20} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={24} className="text-green-600" />
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Auto-Approval Rate</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-gray-900">{stats.approvalRate}%</p>
                <p className="text-sm text-gray-500 mb-1">of samples</p>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 rounded-full h-2 transition-all"
                  style={{ width: `${stats.approvalRate}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Game Score</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-gray-900">{stats.avgGameScore}</p>
                <p className="text-sm text-gray-500 mb-1">out of 10</p>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 rounded-full h-2 transition-all"
                  style={{ width: `${(stats.avgGameScore / 10) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">System Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <p className="text-lg font-semibold text-green-600">Online</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">All services operational</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
