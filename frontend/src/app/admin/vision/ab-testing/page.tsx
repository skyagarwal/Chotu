'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Play,
  Pause,
  Plus,
  Trash2,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trophy,
  Clock,
  Target,
  Percent,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
} from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  type: 'control' | 'treatment';
  weight: number;
  config: Record<string, unknown>;
  impressions: number;
  conversions: number;
  totalLatencyMs: number;
  errors: number;
  customMetrics: Record<string, number>;
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  featureKey: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  targetPercentage: number;
  minSampleSize: number;
  confidenceLevel: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  winner?: string;
}

interface ExperimentResults {
  experimentId: string;
  status: string;
  variants: Array<{
    id: string;
    name: string;
    impressions: number;
    conversions: number;
    conversionRate: number;
    avgLatencyMs: number;
    errorRate: number;
    isWinner: boolean;
    improvementOverControl?: number;
  }>;
  statisticalSignificance?: number;
  sampleSizeReached: boolean;
  recommendation?: string;
}

export default function ABTestingPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedExperiment, setExpandedExperiment] = useState<string | null>(null);
  const [experimentResults, setExperimentResults] = useState<Record<string, ExperimentResults>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New experiment form state
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    featureKey: '',
    targetPercentage: 100,
    minSampleSize: 100,
    confidenceLevel: 0.95,
    variants: [
      { name: 'Control', type: 'control' as const, weight: 50, config: {} },
      { name: 'Treatment', type: 'treatment' as const, weight: 50, config: {} },
    ],
  });

  const fetchExperiments = useCallback(async () => {
    try {
      const response = await fetch('/api/vision/ab-testing/experiments');
      if (!response.ok) throw new Error('Failed to fetch experiments');
      const data = await response.json();
      setExperiments(data.experiments || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResults = async (experimentId: string) => {
    try {
      const response = await fetch(`/api/vision/ab-testing/experiments/${experimentId}/results`);
      if (response.ok) {
        const data = await response.json();
        setExperimentResults(prev => ({ ...prev, [experimentId]: data }));
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  const handleStartExperiment = async (id: string) => {
    try {
      const response = await fetch(`/api/vision/ab-testing/experiments/${id}/start`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchExperiments();
      }
    } catch (err) {
      console.error('Failed to start experiment:', err);
    }
  };

  const handleStopExperiment = async (id: string) => {
    try {
      const response = await fetch(`/api/vision/ab-testing/experiments/${id}/stop`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchExperiments();
      }
    } catch (err) {
      console.error('Failed to stop experiment:', err);
    }
  };

  const handleDeleteExperiment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return;
    try {
      const response = await fetch(`/api/vision/ab-testing/experiments/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchExperiments();
      }
    } catch (err) {
      console.error('Failed to delete experiment:', err);
    }
  };

  const handleCreateExperiment = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/vision/ab-testing/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExperiment),
      });
      if (response.ok) {
        setShowCreateModal(false);
        setNewExperiment({
          name: '',
          description: '',
          featureKey: '',
          targetPercentage: 100,
          minSampleSize: 100,
          confidenceLevel: 0.95,
          variants: [
            { name: 'Control', type: 'control', weight: 50, config: {} },
            { name: 'Treatment', type: 'treatment', weight: 50, config: {} },
          ],
        });
        fetchExperiments();
      }
    } catch (err) {
      console.error('Failed to create experiment:', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedExperiment === id) {
      setExpandedExperiment(null);
    } else {
      setExpandedExperiment(id);
      if (!experimentResults[id]) {
        fetchResults(id);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'paused':
        return <Pause className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-8 h-8 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              A/B Testing - Vision AI
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Run experiments to optimize VLM providers, models, and settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchExperiments}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            <Plus className="w-4 h-4" />
            New Experiment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-purple-500 opacity-50" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Experiments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {experiments.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Play className="w-8 h-8 text-green-500 opacity-50" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Running</p>
              <p className="text-2xl font-bold text-green-500">
                {experiments.filter(e => e.status === 'running').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-blue-500 opacity-50" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-blue-500">
                {experiments.filter(e => e.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500 opacity-50" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">With Winner</p>
              <p className="text-2xl font-bold text-yellow-500">
                {experiments.filter(e => e.winner).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Experiments List */}
      <div className="space-y-4">
        {experiments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <FlaskConical className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No experiments yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first A/B test to optimize Vision AI performance
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Plus className="w-4 h-4" />
              Create Experiment
            </button>
          </div>
        ) : (
          experiments.map((experiment) => (
            <div
              key={experiment.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Experiment Header */}
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => toggleExpand(experiment.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {experiment.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(experiment.status)}`}>
                          {getStatusIcon(experiment.status)}
                          {experiment.status}
                        </span>
                        {experiment.winner && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded-full">
                            <Trophy className="w-3 h-3" />
                            Winner: {experiment.variants.find(v => v.id === experiment.winner)?.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {experiment.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-gray-500 dark:text-gray-400">Feature Key</p>
                      <p className="font-mono font-medium text-gray-900 dark:text-white">
                        {experiment.featureKey}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500 dark:text-gray-400">Target</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {experiment.targetPercentage}%
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500 dark:text-gray-400">Sample Size</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatNumber(experiment.minSampleSize)}
                      </p>
                    </div>
                    {expandedExperiment === experiment.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedExperiment === experiment.id && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {/* Variants */}
                  <div className="p-5">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                      Variants
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {experiment.variants.map((variant) => {
                        const results = experimentResults[experiment.id]?.variants?.find(
                          (v) => v.id === variant.id
                        );
                        const isWinner = results?.isWinner || variant.id === experiment.winner;
                        
                        return (
                          <div
                            key={variant.id}
                            className={`p-4 rounded-lg border ${
                              isWinner
                                ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20'
                                : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {variant.name}
                                </span>
                                {isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                variant.type === 'control'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                              }`}>
                                {variant.type}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Weight</span>
                                <span className="font-medium">{variant.weight}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Impressions</span>
                                <span className="font-medium">{formatNumber(variant.impressions)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Conversions</span>
                                <span className="font-medium">{formatNumber(variant.conversions)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Conv. Rate</span>
                                <span className="font-medium">
                                  {results?.conversionRate?.toFixed(2) || 
                                   (variant.impressions > 0 
                                    ? ((variant.conversions / variant.impressions) * 100).toFixed(2) 
                                    : '0')}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Avg Latency</span>
                                <span className="font-medium">
                                  {results?.avgLatencyMs?.toFixed(0) ||
                                   (variant.impressions > 0
                                    ? (variant.totalLatencyMs / variant.impressions).toFixed(0)
                                    : '0')}ms
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Error Rate</span>
                                <span className={`font-medium ${
                                  variant.errors > 0 ? 'text-red-500' : 'text-green-500'
                                }`}>
                                  {results?.errorRate?.toFixed(2) ||
                                   (variant.impressions > 0
                                    ? ((variant.errors / variant.impressions) * 100).toFixed(2)
                                    : '0')}%
                                </span>
                              </div>
                              {results?.improvementOverControl !== undefined && variant.type === 'treatment' && (
                                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                                  <span className="text-gray-500 dark:text-gray-400">Improvement</span>
                                  <span className={`font-bold ${
                                    results.improvementOverControl > 0 ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                    {results.improvementOverControl > 0 ? '+' : ''}{results.improvementOverControl.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            {Object.keys(variant.config).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Config</p>
                                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(variant.config, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Results Summary */}
                  {experimentResults[experiment.id] && (
                    <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Analysis
                      </h4>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">Sample Size:</span>
                          <span className={`font-medium ${
                            experimentResults[experiment.id].sampleSizeReached 
                              ? 'text-green-500' 
                              : 'text-yellow-500'
                          }`}>
                            {experimentResults[experiment.id].sampleSizeReached 
                              ? 'Reached' 
                              : 'In Progress'}
                          </span>
                        </div>
                        {experimentResults[experiment.id].statisticalSignificance !== undefined && (
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-500 dark:text-gray-400">Significance:</span>
                            <span className={`font-medium ${
                              (experimentResults[experiment.id].statisticalSignificance || 0) >= 0.95 
                                ? 'text-green-500' 
                                : 'text-yellow-500'
                            }`}>
                              {((experimentResults[experiment.id].statisticalSignificance || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {experimentResults[experiment.id].recommendation && (
                          <div className="flex-1 text-right">
                            <span className="text-gray-500 dark:text-gray-400">Recommendation: </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {experimentResults[experiment.id].recommendation}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      Created: {new Date(experiment.createdAt).toLocaleDateString()}
                      {experiment.startedAt && (
                        <span className="ml-3">
                          Started: {new Date(experiment.startedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchResults(experiment.id);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Refresh Results
                      </button>
                      {experiment.status === 'draft' || experiment.status === 'paused' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartExperiment(experiment.id);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                      ) : experiment.status === 'running' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStopExperiment(experiment.id);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                        >
                          <Pause className="w-4 h-4" />
                          Stop
                        </button>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExperiment(experiment.id);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Experiment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Create New Experiment
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experiment Name
                </label>
                <input
                  type="text"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="e.g., VLM Provider Comparison"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  rows={2}
                  placeholder="Describe what this experiment is testing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Feature Key
                </label>
                <input
                  type="text"
                  value={newExperiment.featureKey}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, featureKey: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono"
                  placeholder="e.g., vlm_provider"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target %
                  </label>
                  <input
                    type="number"
                    value={newExperiment.targetPercentage}
                    onChange={(e) => setNewExperiment(prev => ({ ...prev, targetPercentage: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Sample Size
                  </label>
                  <input
                    type="number"
                    value={newExperiment.minSampleSize}
                    onChange={(e) => setNewExperiment(prev => ({ ...prev, minSampleSize: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    min={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confidence Level
                  </label>
                  <select
                    value={newExperiment.confidenceLevel}
                    onChange={(e) => setNewExperiment(prev => ({ ...prev, confidenceLevel: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value={0.90}>90%</option>
                    <option value={0.95}>95%</option>
                    <option value={0.99}>99%</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExperiment}
                disabled={creating || !newExperiment.name || !newExperiment.featureKey}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
