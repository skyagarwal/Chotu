'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, Square, CheckCircle, TrendingUp, Wifi, WifiOff, Clock } from 'lucide-react';
import { useTrainingWebSocket, TrainingJobUpdate } from '@/hooks/useTrainingWebSocket';
import { adminBackendClient } from '@/lib/api/admin-backend';

interface TrainingMetrics {
  epoch: number;
  accuracy: number;
  loss: number;
  valAccuracy: number;
  valLoss: number;
  time: string;
}

interface TrainingJob {
  id: string;
  name: string;
  datasetId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function TrainingJobDetailPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const [job, setJob] = useState<TrainingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics] = useState<TrainingMetrics[]>([
    { epoch: 1, accuracy: 0.65, loss: 0.892, valAccuracy: 0.62, valLoss: 0.934, time: '1.2s' },
    { epoch: 2, accuracy: 0.73, loss: 0.654, valAccuracy: 0.71, valLoss: 0.689, time: '1.1s' },
    { epoch: 3, accuracy: 0.79, loss: 0.512, valAccuracy: 0.76, valLoss: 0.547, time: '1.2s' },
    { epoch: 4, accuracy: 0.83, loss: 0.423, valAccuracy: 0.81, valLoss: 0.456, time: '1.1s' },
    { epoch: 5, accuracy: 0.86, loss: 0.362, valAccuracy: 0.84, valLoss: 0.398, time: '1.2s' },
    { epoch: 6, accuracy: 0.88, loss: 0.314, valAccuracy: 0.86, valLoss: 0.352, time: '1.1s' },
    { epoch: 7, accuracy: 0.89, loss: 0.278, valAccuracy: 0.87, valLoss: 0.319, time: '1.2s' },
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      timestamp: new Date().toISOString(),
      message: 'Training job started',
      type: 'info'
    }
  ]);

  // WebSocket connection for real-time updates
  const { isConnected } = useTrainingWebSocket({
    onJobUpdate: useCallback((update: TrainingJobUpdate) => {
      if (update.jobId === jobId) {
        console.log('[Job Detail] Update:', update);
        setJob((prev) => prev ? {
          ...prev,
          status: update.status as TrainingJob['status'],
          progress: update.progress
        } : null);

        // Add log entry for this update
        if (update.message) {
          setLogs((prev) => [...prev, {
            timestamp: new Date(update.timestamp).toISOString(),
            message: update.message || 'Update',
            type: update.status === 'failed' ? 'error' : update.status === 'succeeded' ? 'success' : 'info'
          }]);
        }
      }
    }, [jobId]),
  });

  // Fetch job details on mount
  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        const jobData = await adminBackendClient.getTrainingJob(jobId) as any;
        setJob({
          id: jobData.id,
          name: `Training Job ${jobData.id}`,
          datasetId: jobData.dataset_id || '',
          status: jobData.status as TrainingJob['status'],
          progress: jobData.progress || 0,
          createdAt: jobData.createdAt || new Date().toISOString(),
          startedAt: jobData.startedAt,
          completedAt: jobData.completedAt,
        });
        
        // Add initial log
        setLogs([{
          timestamp: jobData.createdAt || new Date().toISOString(),
          message: `Job created with dataset ${jobData.dataset_id}`,
          type: 'info'
        }]);
      } catch (error) {
        console.error('Failed to load job:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Job not found</div>
      </div>
    );
  }

  const currentEpoch = metrics[metrics.length - 1];
  const progress = job.progress;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/training"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#059211] mb-4"
        >
          <ArrowLeft size={20} />
          Back to Training
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {job.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Dataset: {job.datasetId} • Job ID: {job.id.slice(0, 12)}...
              </p>
            </div>
            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
              {isConnected ? (
                <>
                  <Wifi size={16} className="text-green-600 animate-pulse" />
                  <span className="text-xs font-medium text-green-600">Live</span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Offline</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              disabled={job.status !== 'running'}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-[#059211] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause size={20} />
              Pause
            </button>
            <button 
              disabled={job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled'}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square size={20} />
              Stop
            </button>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl p-6 text-white shadow-lg ${
        job.status === 'succeeded' ? 'bg-gradient-to-r from-green-600 to-green-700' :
        job.status === 'failed' ? 'bg-gradient-to-r from-red-600 to-red-700' :
        job.status === 'running' ? 'bg-gradient-to-r from-[#059211] to-[#047a0e]' :
        'bg-gradient-to-r from-gray-600 to-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              {job.status === 'running' ? <Play size={24} /> :
               job.status === 'succeeded' ? <CheckCircle size={24} /> :
               job.status === 'queued' ? <Clock size={24} /> :
               <Square size={24} />}
            </div>
            <div>
              <div className="text-2xl font-bold">
                {job.status === 'running' ? 'Training in Progress' :
                 job.status === 'succeeded' ? 'Training Complete' :
                 job.status === 'failed' ? 'Training Failed' :
                 job.status === 'queued' ? 'Queued' : 'Stopped'}
              </div>
              <div className="text-white/80">
                {job.status === 'running' ? `Progress: ${progress}%` : `Status: ${job.status}`}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{progress.toFixed(0)}%</div>
            <div className="text-white/80">Complete</div>
          </div>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Training Accuracy</div>
          <div className="text-3xl font-bold text-green-600">
            {(currentEpoch.accuracy * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <TrendingUp size={12} />
            +{((currentEpoch.accuracy - metrics[0].accuracy) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Validation Accuracy</div>
          <div className="text-3xl font-bold text-blue-600">
            {(currentEpoch.valAccuracy * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <TrendingUp size={12} />
            +{((currentEpoch.valAccuracy - metrics[0].valAccuracy) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Training Loss</div>
          <div className="text-3xl font-bold text-orange-600">
            {currentEpoch.loss.toFixed(3)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Started: {metrics[0].loss.toFixed(3)}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Validation Loss</div>
          <div className="text-3xl font-bold text-purple-600">
            {currentEpoch.valLoss.toFixed(3)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Started: {metrics[0].valLoss.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Training History Table */}
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Training History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Epoch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Training Acc
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Training Loss
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Val Acc
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Val Loss
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((metric) => (
                <tr
                  key={metric.epoch}
                  className={
                    metric.epoch === currentEpoch.epoch
                      ? 'bg-green-50'
                      : 'hover:bg-gray-50'
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {metric.epoch}
                      </span>
                      {metric.epoch === currentEpoch.epoch && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={14} />
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-green-600">
                      {(metric.accuracy * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {metric.loss.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600">
                      {(metric.valAccuracy * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {metric.valLoss.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {metric.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Training Logs */}
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Training Logs</h2>
          <div className="flex items-center gap-2">
            {isConnected && job.status === 'running' && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                Live
              </span>
            )}
            <span className="text-xs text-gray-500">{logs.length} entries</span>
          </div>
        </div>
        <div className="p-4 bg-gray-50 max-h-96 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="mb-2 flex gap-3">
              <span className="text-gray-400 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={
                log.type === 'error' ? 'text-red-600' :
                log.type === 'success' ? 'text-green-600' :
                'text-gray-700'
              }>
                {log.message}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-400 text-center py-8">
              No logs available yet
            </div>
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Training Configuration
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Dataset</div>
            <div className="font-medium text-gray-900">{job.datasetId}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Job ID</div>
            <div className="font-medium text-gray-900 text-xs">{job.id}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div className={`font-medium ${
              job.status === 'succeeded' ? 'text-green-600' :
              job.status === 'failed' ? 'text-red-600' :
              job.status === 'running' ? 'text-blue-600' :
              'text-gray-600'
            }`}>
              {job.status}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Created</div>
            <div className="font-medium text-gray-900 text-xs">
              {new Date(job.createdAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Model Type</div>
            <div className="font-medium text-gray-900">NLU Classification</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Progress</div>
            <div className="font-medium text-gray-900">{progress.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Epochs</div>
            <div className="font-medium text-gray-900">10</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Batch Size</div>
            <div className="font-medium text-gray-900">32</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Learning Rate</div>
            <div className="font-medium text-gray-900">0.001</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Optimizer</div>
            <div className="font-medium text-gray-900">Adam</div>
          </div>
        </div>
      </div>
    </div>
  );
}
