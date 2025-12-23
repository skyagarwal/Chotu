'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Download,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Search,
  AlertCircle
} from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface TrainingSample {
  id: number;
  text: string;
  intent: string;
  entities: any[];
  confidence: number;
  language: string;
  tone?: string;
  source: 'game' | 'conversation' | 'manual';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  userId: string;
  sessionId: string;
}

export default function TrainingSamplesPage() {
  const [samples, setSamples] = useState<TrainingSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSample, setSelectedSample] = useState<TrainingSample | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    autoApproved: 0,
  });

  useEffect(() => {
    loadSamples();
    loadStats();
  }, [filter]);

  const loadSamples = async () => {
    try {
      setLoading(true);
      const response = await mangwaleAIClient.getTrainingSamples({
        status: filter,
        search: searchQuery,
        limit: 100,
      });
      
      if (response.success) {
        const formattedSamples: TrainingSample[] = response.data.map(s => ({
          id: s.id,
          text: s.text,
          intent: s.intent,
          entities: s.entities,
          confidence: s.confidence,
          language: s.language,
          tone: s.tone,
          source: s.source as 'game' | 'conversation' | 'manual',
          reviewStatus: s.reviewStatus as 'pending' | 'approved' | 'rejected',
          approved: s.approved,
          approvedBy: s.approvedBy || undefined,
          approvedAt: s.approvedAt || undefined,
          createdAt: s.createdAt,
          userId: s.userId.toString(),
          sessionId: '', // Not in response, but required by type
        }));
        setSamples(formattedSamples);
      }
    } catch (error) {
      console.error('Failed to load samples:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await mangwaleAIClient.getTrainingSampleStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleApprove = async (sampleId: number) => {
    try {
      await mangwaleAIClient.approveTrainingSample(sampleId, 'admin');
      setSamples(prev => prev.filter(s => s.id !== sampleId));
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        approved: prev.approved + 1,
      }));
      setSelectedSample(null);
    } catch (error) {
      console.error('Failed to approve sample:', error);
    }
  };

  const handleReject = async (sampleId: number) => {
    try {
      await mangwaleAIClient.rejectTrainingSample(sampleId, 'admin');
      setSamples(prev => prev.filter(s => s.id !== sampleId));
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        rejected: prev.rejected + 1,
      }));
      setSelectedSample(null);
    } catch (error) {
      console.error('Failed to reject sample:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await mangwaleAIClient.exportTrainingSamples('jsonl');
      if (response.success) {
        // Create download link
        const blob = new Blob([response.data], { type: 'application/x-ndjson' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training-samples-${Date.now()}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <CheckCircle size={14} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            <XCircle size={14} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
            <Clock size={14} />
            Pending
          </span>
        );
    }
  };

  const filteredSamples = samples.filter(sample =>
    sample.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sample.intent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Database size={32} />
                <h1 className="text-4xl font-bold">Training Samples</h1>
              </div>
              <p className="text-green-100 text-lg">
                Review and approve collected training data
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 font-semibold transition-colors"
            >
              <Download size={18} />
              Export Approved
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'blue' },
            { label: 'Pending', value: stats.pending, color: 'orange' },
            { label: 'Approved', value: stats.approved, color: 'green' },
            { label: 'Rejected', value: stats.rejected, color: 'red' },
            { label: 'Auto-Approved', value: stats.autoApproved, color: 'purple' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm border-2 border-gray-100 p-4">
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex-1 relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by text or intent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Auto-Approval Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">Auto-Approval Enabled</p>
              <p className="text-sm text-blue-800">
                Samples with confidence ≥ 0.85 are automatically approved. Lower confidence samples require manual review.
              </p>
            </div>
          </div>
        </div>

        {/* Samples List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin text-green-600" size={32} />
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-12 text-center">
            <Database className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg">No samples found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSamples.map(sample => (
              <div
                key={sample.id}
                className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(sample.reviewStatus)}
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(sample.confidence)}`}>
                        {(sample.confidence * 100).toFixed(1)}% confidence
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                        {sample.source}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold uppercase">
                        {sample.language}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">{sample.text}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span><strong>Intent:</strong> {sample.intent}</span>
                      {sample.tone && <span><strong>Tone:</strong> {sample.tone}</span>}
                      <span><strong>Entities:</strong> {sample.entities.length}</span>
                    </div>
                    {sample.approvedBy && (
                      <p className="text-xs text-gray-500 mt-2">
                        Approved by {sample.approvedBy} on {new Date(sample.approvedAt!).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  {sample.reviewStatus === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(sample.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
                      >
                        <ThumbsDown size={18} />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(sample.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                      >
                        <ThumbsUp size={18} />
                        Approve
                      </button>
                    </div>
                  )}
                </div>
                
                {sample.entities.length > 0 && (
                  <div className="border-t-2 border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Entities:</p>
                    <div className="flex flex-wrap gap-2">
                      {sample.entities.map((entity, idx) => (
                        <div key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                          <strong>{entity.type}:</strong> {entity.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
