'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  Database,
  Sparkles,
  GitBranch,
  Users,
  Activity,
  Settings,
  ArrowRight
} from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface LearningStats {
  totalExamples: number;
  autoApproved: number;
  humanApproved: number;
  pendingReview: number;
  rejected: number;
  avgConfidence: number;
  autoApproveRate: number;
}

interface DataSourceHealth {
  id: number;
  name: string;
  dataType: string;
  healthStatus: 'healthy' | 'warning' | 'degraded' | 'critical';
  usageCount: number;
  avgResponseTime: number;
  lastSuccess: string;
}

interface ScraperStats {
  todayJobs: number;
  completed: number;
  failed: number;
  pending: number;
  avgDuration: number;
  storesMapped: number;
  avgConfidence: number;
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTrainedAt: string;
  version: string;
}

export default function SelfLearningDashboard() {
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceHealth[]>([]);
  const [scraperStats, setScraperStats] = useState<ScraperStats | null>(null);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance | null>(null);
  const [retrainingNeeded, setRetrainingNeeded] = useState<{ needed: boolean; reason?: string }>({ needed: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [learning, sources, scraper, model, retrain] = await Promise.all([
        fetch('/api/admin/learning/stats').then(r => r.json()),
        fetch('/api/admin/data-sources/health').then(r => r.json()),
        fetch('/api/admin/scraper/stats').then(r => r.json()),
        fetch('/api/admin/model/performance').then(r => r.json()),
        fetch('/api/admin/learning/check-retraining').then(r => r.json()),
      ]);
      
      setLearningStats(learning);
      setDataSources(sources);
      setScraperStats(scraper);
      setModelPerformance(model);
      setRetrainingNeeded(retrain);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-700 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'degraded': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-[#059211]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Self-Learning & AI Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor Chotu's learning progress, data sources, and model performance</p>
        </div>
        <button 
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-[#059211] text-white rounded-lg hover:bg-[#047a0e] transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Retraining Alert */}
      {retrainingNeeded.needed && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600" size={24} />
            <div>
              <h3 className="font-semibold text-amber-900">Model Retraining Recommended</h3>
              <p className="text-amber-700 text-sm">{retrainingNeeded.reason}</p>
            </div>
          </div>
          <Link 
            href="/admin/training"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
          >
            Start Training <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Learning Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Examples */}
        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-100 hover:border-[#059211] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Brain className="text-blue-600" size={24} />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{learningStats?.totalExamples || 0}</div>
          <p className="text-sm text-gray-500 mt-1">Training Examples</p>
        </div>

        {/* Auto Approved */}
        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-100 hover:border-green-500 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Sparkles className="text-green-600" size={24} />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              {((learningStats?.autoApproveRate || 0)).toFixed(1)}%
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{learningStats?.autoApproved || 0}</div>
          <p className="text-sm text-gray-500 mt-1">Auto-Approved (High Confidence)</p>
        </div>

        {/* Pending Review */}
        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-100 hover:border-yellow-500 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="text-yellow-600" size={24} />
            </div>
            <Link href="/admin/learning/review" className="text-xs font-medium text-yellow-600 hover:underline">
              Review →
            </Link>
          </div>
          <div className="text-3xl font-bold text-gray-900">{learningStats?.pendingReview || 0}</div>
          <p className="text-sm text-gray-500 mt-1">Pending Human Review</p>
        </div>

        {/* Avg Confidence */}
        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-100 hover:border-purple-500 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {((learningStats?.avgConfidence || 0) * 100).toFixed(1)}%
          </div>
          <p className="text-sm text-gray-500 mt-1">Avg Confidence Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance */}
        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-[#059211]" />
            Model Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Accuracy</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(modelPerformance?.accuracy || 0) * 100}%` }}
                  />
                </div>
                <span className="font-semibold">{((modelPerformance?.accuracy || 0) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Precision</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${(modelPerformance?.precision || 0) * 100}%` }}
                  />
                </div>
                <span className="font-semibold">{((modelPerformance?.precision || 0) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Recall</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${(modelPerformance?.recall || 0) * 100}%` }}
                  />
                </div>
                <span className="font-semibold">{((modelPerformance?.recall || 0) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">F1 Score</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full" 
                    style={{ width: `${(modelPerformance?.f1Score || 0) * 100}%` }}
                  />
                </div>
                <span className="font-semibold">{((modelPerformance?.f1Score || 0) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="pt-2 border-t text-sm text-gray-500 flex justify-between">
              <span>Version: {modelPerformance?.version || 'N/A'}</span>
              <span>Last trained: {modelPerformance?.lastTrainedAt ? new Date(modelPerformance.lastTrainedAt).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Scraper Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GitBranch size={20} className="text-[#059211]" />
            Competitor Scraper Status
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{scraperStats?.todayJobs || 0}</div>
              <p className="text-sm text-gray-500">Jobs Today</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{scraperStats?.completed || 0}</div>
              <p className="text-sm text-green-600">Completed</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{scraperStats?.pending || 0}</div>
              <p className="text-sm text-yellow-600">Pending</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{scraperStats?.failed || 0}</div>
              <p className="text-sm text-red-600">Failed</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Stores Mapped:</span>
              <span className="font-semibold ml-2">{scraperStats?.storesMapped || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Avg Confidence:</span>
              <span className="font-semibold ml-2">{((scraperStats?.avgConfidence || 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources Health */}
      <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Database size={20} className="text-[#059211]" />
            Data Sources Health
          </h3>
          <Link href="/admin/data-sources" className="text-sm text-[#059211] hover:underline flex items-center gap-1">
            Manage <ArrowRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Usage</th>
                <th className="pb-3 font-medium">Avg Response</th>
                <th className="pb-3 font-medium">Last Success</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dataSources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{source.name}</td>
                  <td className="py-3 text-gray-600">{source.dataType}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getHealthColor(source.healthStatus)}`}>
                      {source.healthStatus}
                    </span>
                  </td>
                  <td className="py-3 text-gray-600">{source.usageCount.toLocaleString()}</td>
                  <td className="py-3 text-gray-600">{source.avgResponseTime}ms</td>
                  <td className="py-3 text-gray-600">{source.lastSuccess ? new Date(source.lastSuccess).toLocaleString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          href="/admin/learning/review"
          className="p-4 bg-white rounded-xl shadow-sm border-2 border-gray-100 hover:border-[#059211] transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-yellow-100 rounded-xl">
            <Clock className="text-yellow-600" size={24} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Review Queue</h4>
            <p className="text-sm text-gray-500">{learningStats?.pendingReview || 0} items pending</p>
          </div>
        </Link>

        <Link 
          href="/admin/training"
          className="p-4 bg-white rounded-xl shadow-sm border-2 border-gray-100 hover:border-[#059211] transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-green-100 rounded-xl">
            <Brain className="text-green-600" size={24} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Training Center</h4>
            <p className="text-sm text-gray-500">Train & export NLU model</p>
          </div>
        </Link>

        <Link 
          href="/admin/scraper"
          className="p-4 bg-white rounded-xl shadow-sm border-2 border-gray-100 hover:border-[#059211] transition-all flex items-center gap-4"
        >
          <div className="p-3 bg-purple-100 rounded-xl">
            <GitBranch className="text-purple-600" size={24} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Scraper Jobs</h4>
            <p className="text-sm text-gray-500">Manage competitor data</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
