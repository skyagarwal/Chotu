'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Database,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Plus,
  Upload,
  Download,
  Eye,
  Trash2,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import CreateDatasetModal, {
  DatasetFormData,
} from '@/components/CreateDatasetModal';
import { adminBackendClient } from '@/lib/api/admin-backend';
import { useTrainingWebSocket, TrainingJobUpdate, JobCreatedEvent } from '@/hooks/useTrainingWebSocket';

interface Dataset {
  id: string;
  name: string;
  type: 'nlu' | 'asr' | 'tts';
  module: string;
  examples: number;
  created: string;
  status: 'ready' | 'processing';
}

interface TrainingJob {
  id: string;
  name: string;
  dataset: string;
  type: 'nlu-train' | 'asr-finetune' | 'tts-train';
  status: 'queued' | 'training' | 'completed' | 'failed';
  progress: number;
  accuracy?: number;
  loss?: number;
  startTime?: string;
  duration?: string;
  epoch?: number;
  totalEpochs?: number;
}

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<'datasets' | 'jobs'>('datasets');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  // WebSocket connection for real-time updates
  const { isConnected } = useTrainingWebSocket({
    onJobUpdate: useCallback((update: TrainingJobUpdate) => {
      console.log('[Training Page] Job update:', update);
      setJobs((prevJobs) => 
        prevJobs.map((job) =>
          job.id === update.jobId
            ? { ...job, status: update.status as TrainingJob['status'], progress: update.progress }
            : job
        )
      );
    }, []),
    
    onJobCreated: useCallback((event: JobCreatedEvent) => {
      console.log('[Training Page] New job created:', event.job);
      const newJob: TrainingJob = {
        id: event.job.id,
        name: `Training Job ${event.job.id}`,
        dataset: event.job.datasetId || '',
        type: (event.job.kind === 'asr-train' ? 'asr-finetune' : event.job.kind) as TrainingJob['type'],
        status: event.job.status as TrainingJob['status'],
        progress: event.job.progress || 0,
      };
      setJobs((prevJobs) => [newJob, ...prevJobs]);
    }, []),

    onConnected: useCallback(() => {
      console.log('[Training Page] WebSocket connected');
    }, []),

    onDisconnected: useCallback(() => {
      console.log('[Training Page] WebSocket disconnected');
    }, []),
  });

  // Fetch datasets and jobs on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const [datasetsData, jobsData] = await Promise.all([
          adminBackendClient.getDatasets(),
          adminBackendClient.getTrainingJobs(),
        ]);
        
        // Map API data to local format
        const mappedDatasets: Dataset[] = datasetsData.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          module: d.module || 'unknown',
          examples: d.exampleCount || 0,
          created: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: 'ready',
        }));

        const mappedJobs: TrainingJob[] = jobsData.map((j) => ({
          id: j.id,
          name: `Training Job ${j.id}`,
          dataset: j.dataset_id,
          type: (j.type === 'asr-train' ? 'asr-finetune' : j.type) as 'nlu-train' | 'asr-finetune' | 'tts-train',
          status: j.status,
          progress: j.progress || 0,
          accuracy: j.accuracy,
          loss: j.loss,
          startTime: j.createdAt,
          epoch: j.epoch,
          totalEpochs: 10, // Default value
        }));

        setDatasets(mappedDatasets);
        setJobs(mappedJobs);
      } catch (err) {
        console.error('Failed to fetch training data:', err);
        setError('Failed to load training data. Using sample data.');
        // Fallback to sample data on error
        loadSampleData();
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadSampleData = () => {
    // Sample data as fallback
    setDatasets([
      {
        id: 'ds_food_v2',
        name: 'Food NLU Dataset v2',
        type: 'nlu',
        module: 'food',
        examples: 2450,
        created: '2025-10-25',
        status: 'ready',
      },
      {
        id: 'ds_ecom_v1',
        name: 'Ecom NLU Dataset v1',
        type: 'nlu',
        module: 'ecom',
        examples: 1820,
        created: '2025-10-24',
        status: 'ready',
      },
      {
        id: 'ds_parcel_v1',
        name: 'Parcel NLU Dataset v1',
        type: 'nlu',
        module: 'parcel',
        examples: 1350,
        created: '2025-10-23',
        status: 'ready',
      },
      {
        id: 'ds_asr_hindi',
        name: 'Hindi ASR Dataset',
        type: 'asr',
        module: 'global',
        examples: 5600,
        created: '2025-10-20',
        status: 'ready',
      },
    ]);

    setJobs([
      {
        id: 'job_001',
        name: 'Food NLU v2 Training',
        type: 'nlu-train',
        status: 'training',
        dataset: 'ds_food_v2',
        progress: 0.65,
        accuracy: 0.89,
        loss: 0.234,
        startTime: '10 minutes ago',
        epoch: 7,
        totalEpochs: 10,
      },
      {
        id: 'job_002',
        name: 'Ecom Product Classification',
        type: 'nlu-train',
        status: 'queued',
        dataset: 'ds_ecom_v1',
        progress: 0,
        startTime: 'Not started',
        totalEpochs: 15,
      },
      {
        id: 'job_003',
        name: 'Hindi ASR Model Training',
        type: 'asr-finetune',
        status: 'completed',
        dataset: 'ds_asr_hindi',
        progress: 1.0,
        accuracy: 0.96,
        loss: 0.089,
        startTime: '2 hours ago',
        duration: '45 minutes',
        epoch: 20,
        totalEpochs: 20,
      },
      {
        id: 'job_004',
        name: 'Parcel Intent Model',
        type: 'nlu-train',
        status: 'failed',
        dataset: 'ds_parcel_v1',
        progress: 0.45,
        accuracy: 0.67,
        loss: 0.543,
        startTime: '1 day ago',
        epoch: 5,
        totalEpochs: 10,
      },
    ]);
  };

  const handleCreateDataset = async (data: DatasetFormData) => {
    try {
      if (data.file) {
        const newDataset = await adminBackendClient.uploadDataset(data.file, {
          name: data.name,
          type: data.type.toLowerCase(),
          module: data.module,
        });
        // Add default properties for display
        const displayDataset: Dataset = {
          id: newDataset.id,
          name: newDataset.name,
          type: newDataset.type as 'nlu' | 'asr' | 'tts',
          module: data.module,
          examples: 0,
          created: new Date().toISOString().split('T')[0],
          status: 'ready',
        };
        setDatasets([...datasets, displayDataset]);
      }
    } catch (err) {
      console.error('Failed to create dataset:', err);
      alert('Failed to create dataset. Please try again.');
    }
  };

  const handleDeleteDataset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    
    try {
      await adminBackendClient.deleteDataset(id);
      setDatasets(datasets.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Failed to delete dataset:', err);
      alert('Failed to delete dataset. Please try again.');
    }
  };

  const handlePushToLabelStudio = async (datasetId: string) => {
    try {
      const dataset = datasets.find(d => d.id === datasetId);
      if (!dataset) return;

      if (!confirm(`Push "${dataset.name}" (${dataset.examples} examples) to Label Studio?`)) return;

      const result = await adminBackendClient.pushToLabelStudio(datasetId);
      alert(`✅ Successfully pushed ${result.pushed} examples to Label Studio!\n\nProject ID: ${result.projectId}`);
    } catch (err) {
      console.error('Failed to push to Label Studio:', err);
      alert('❌ Failed to push to Label Studio. Make sure Label Studio is configured in settings.');
    }
  };

  const handlePullFromLabelStudio = async (datasetId: string) => {
    try {
      const dataset = datasets.find(d => d.id === datasetId);
      if (!dataset) return;

      if (!confirm(`Pull annotations from Label Studio for "${dataset.name}"?`)) return;

      const result = await adminBackendClient.pullFromLabelStudio(datasetId);
      alert(`✅ Successfully imported ${result.imported} annotations from Label Studio!`);
      
      // Reload datasets to update example count
      const updatedDatasets = await adminBackendClient.getDatasets();
      const mappedDatasets: Dataset[] = updatedDatasets.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        module: d.module || 'unknown',
        examples: d.exampleCount || 0,
        created: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: 'ready',
      }));
      setDatasets(mappedDatasets);
    } catch (err) {
      console.error('Failed to pull from Label Studio:', err);
      alert('❌ Failed to pull from Label Studio. Make sure Label Studio is configured in settings.');
    }
  };

  const handleSyncLabelStudio = async () => {
    if (syncing) return;
    
    if (!confirm('This will sync all pending data to Label Studio and pull approved annotations back. Continue?')) {
      return;
    }

    setSyncing(true);
    try {
      const result = await adminBackendClient.syncLabelStudio();
      if (result.success) {
        alert('✅ Sync completed successfully!');
      } else {
        alert(`❌ Sync failed: ${result.message}`);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      alert('❌ Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">Loading...</div>
          <div className="text-gray-600">Fetching training data...</div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'ready':
        return 'text-green-600 bg-green-100';
      case 'training':
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'queued':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'ready':
        return <CheckCircle size={16} />;
      case 'training':
      case 'processing':
        return <Play size={16} />;
      case 'queued':
        return <Clock size={16} />;
      case 'failed':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'nlu':
      case 'nlu-train':
        return 'bg-purple-100 text-purple-700';
      case 'asr':
      case 'asr-finetune':
        return 'bg-green-100 text-green-700';
      case 'tts':
      case 'tts-train':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <XCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage datasets and train AI models
            </p>
          </div>
          {/* WebSocket Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
            {isConnected ? (
              <>
                <Wifi size={16} className="text-green-600 animate-pulse" />
                <span className="text-xs font-medium text-green-600">Live Updates</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">Reconnecting...</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSyncLabelStudio}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-50"
            title="Sync pending data with Label Studio"
          >
            <RefreshCw size={20} className={syncing ? "animate-spin" : ""} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-[#059211] transition-all">
            <Upload size={20} />
            Upload Dataset
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={20} />
            Create Dataset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {datasets.length}
          </div>
          <div className="text-sm text-gray-600">Total Datasets</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {jobs.filter((j) => j.status === 'training').length}
          </div>
          <div className="text-sm text-gray-600">Training Now</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {jobs.filter((j) => j.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed Jobs</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {datasets.reduce((sum, d) => sum + d.examples, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Examples</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('datasets')}
          className={`px-6 py-3 font-medium transition-all border-b-2 ${
            activeTab === 'datasets'
              ? 'text-[#059211] border-[#059211]'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database size={20} />
            Datasets ({datasets.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-6 py-3 font-medium transition-all border-b-2 ${
            activeTab === 'jobs'
              ? 'text-[#059211] border-[#059211]'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={20} />
            Training Jobs ({jobs.length})
          </div>
        </button>
      </div>

      {/* Datasets Tab */}
      {activeTab === 'datasets' && (
        <div className="space-y-4">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {dataset.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(
                        dataset.type
                      )}`}
                    >
                      {dataset.type.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${getStatusColor(
                        dataset.status
                      )}`}
                    >
                      {getStatusIcon(dataset.status)}
                      {dataset.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Module: {dataset.module}</span>
                    <span>•</span>
                    <span>{dataset.examples.toLocaleString()} examples</span>
                    <span>•</span>
                    <span>Created: {dataset.created}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Eye size={18} className="text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download size={18} className="text-gray-600" />
                  </button>
                  <button 
                    onClick={() => handleDeleteDataset(dataset.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <Link
                  href={`/admin/training/datasets/${dataset.id}`}
                  className="flex-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-center"
                >
                  View Examples
                </Link>
                <button 
                  onClick={() => handlePushToLabelStudio(dataset.id)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  title="Push to Label Studio for annotation"
                >
                  <Upload size={16} />
                  Push to LS
                </button>
                <button 
                  onClick={() => handlePullFromLabelStudio(dataset.id)}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  title="Pull annotations from Label Studio"
                >
                  <RefreshCw size={16} />
                  Pull from LS
                </button>
                <button className="flex-1 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium">
                  Start Training
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Training Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {job.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(
                        job.type
                      )}`}
                    >
                      {job.type.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {getStatusIcon(job.status)}
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Dataset: {job.dataset}</span>
                    {job.startTime && (
                      <>
                        <span>•</span>
                        <span>Started: {job.startTime}</span>
                      </>
                    )}
                    {job.duration && (
                      <>
                        <span>•</span>
                        <span>Duration: {job.duration}</span>
                      </>
                    )}
                  </div>
                </div>
                {job.status === 'training' && (
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Pause size={18} className="text-gray-600" />
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {job.status !== 'queued' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progress: {Math.round(job.progress * 100)}%
                      {job.epoch && job.totalEpochs && (
                        <span className="text-gray-500 ml-2">
                          (Epoch {job.epoch}/{job.totalEpochs})
                        </span>
                      )}
                    </span>
                    {job.accuracy && (
                      <span className="text-sm font-medium text-green-600">
                        Accuracy: {(job.accuracy * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        job.status === 'completed'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : job.status === 'failed'
                          ? 'bg-gradient-to-r from-red-500 to-rose-500'
                          : 'bg-gradient-to-r from-[#059211] to-[#047a0e]'
                      }`}
                      style={{ width: `${job.progress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metrics */}
              {(job.accuracy !== undefined || job.loss !== undefined) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {job.accuracy !== undefined && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-green-600 mb-1">
                        Accuracy
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {(job.accuracy * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {job.loss !== undefined && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 mb-1">Loss</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {job.loss.toFixed(3)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Link
                  href={`/admin/training/jobs/${job.id}`}
                  className="flex-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-center"
                >
                  View Details
                </Link>
                {job.status === 'completed' && (
                  <button className="flex-1 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium">
                    Deploy Model
                  </button>
                )}
                {job.status === 'failed' && (
                  <button className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium">
                    Retry Training
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dataset Modal */}
      <CreateDatasetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateDataset}
      />
    </div>
  );
}
