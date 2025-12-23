'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Server, Play, Square, RefreshCw, Trash2, RotateCcw,
  Activity, Cpu, HardDrive, MemoryStick, Clock, CheckCircle, 
  XCircle, AlertCircle, Settings, Terminal, Eye, Download,
  Layers, Database, Wifi, Gauge, Zap
} from 'lucide-react';

interface Container {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'restarting' | 'unhealthy';
  health?: 'healthy' | 'unhealthy' | 'starting';
  ports: string[];
  cpu: string;
  memory: string;
  network: string;
  uptime: string;
  createdAt: string;
}

interface DockerStats {
  totalContainers: number;
  runningContainers: number;
  stoppedContainers: number;
  totalImages: number;
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
}

// Container card component
const ContainerCard = ({ 
  container, 
  onAction 
}: { 
  container: Container; 
  onAction: (action: string, containerId: string) => void;
}) => {
  const statusColors = {
    running: 'bg-green-100 text-green-700 border-green-300',
    stopped: 'bg-gray-100 text-gray-700 border-gray-300',
    restarting: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    unhealthy: 'bg-red-100 text-red-700 border-red-300',
  };

  const healthColors = {
    healthy: 'text-green-500',
    unhealthy: 'text-red-500',
    starting: 'text-yellow-500',
  };

  const getContainerType = (name: string): { icon: React.ReactNode; color: string } => {
    if (name.includes('vllm')) return { icon: <Zap size={16} />, color: 'bg-purple-500' };
    if (name.includes('nlu')) return { icon: <Activity size={16} />, color: 'bg-blue-500' };
    if (name.includes('asr')) return { icon: <Activity size={16} />, color: 'bg-orange-500' };
    if (name.includes('tts')) return { icon: <Activity size={16} />, color: 'bg-pink-500' };
    if (name.includes('postgres') || name.includes('mysql')) return { icon: <Database size={16} />, color: 'bg-blue-600' };
    if (name.includes('redis')) return { icon: <Database size={16} />, color: 'bg-red-500' };
    if (name.includes('opensearch')) return { icon: <Database size={16} />, color: 'bg-amber-500' };
    if (name.includes('traefik')) return { icon: <Wifi size={16} />, color: 'bg-cyan-500' };
    if (name.includes('dashboard') || name.includes('frontend')) return { icon: <Layers size={16} />, color: 'bg-green-500' };
    return { icon: <Box size={16} />, color: 'bg-gray-500' };
  };

  const typeInfo = getContainerType(container.name);

  return (
    <div className="bg-white rounded-xl p-5 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${typeInfo.color} text-white`}>
            {typeInfo.icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{container.name}</h3>
            <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]">{container.image}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[container.status]}`}>
          {container.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">CPU</div>
          <div className="font-medium text-gray-900">{container.cpu}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">Memory</div>
          <div className="font-medium text-gray-900">{container.memory}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">Ports</div>
          <div className="font-mono text-gray-900 truncate">{container.ports.join(', ') || 'None'}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">Health</div>
          <div className={`font-medium ${container.health ? healthColors[container.health] : 'text-gray-400'}`}>
            {container.health || 'N/A'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {container.uptime}
        </span>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        {container.status === 'running' ? (
          <button 
            onClick={() => onAction('stop', container.id)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
          >
            <Square size={14} />
            Stop
          </button>
        ) : (
          <button 
            onClick={() => onAction('start', container.id)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium"
          >
            <Play size={14} />
            Start
          </button>
        )}
        <button 
          onClick={() => onAction('restart', container.id)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
        >
          <RotateCcw size={14} />
          Restart
        </button>
        <button 
          onClick={() => onAction('logs', container.id)}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium"
        >
          <Terminal size={14} />
        </button>
      </div>
    </div>
  );
};

export default function DockerManagementPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [stats, setStats] = useState<DockerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped' | 'ai'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadContainers();
    const interval = setInterval(loadContainers, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadContainers = async () => {
    try {
      const res = await fetch('/api/docker/containers');
      if (res.ok) {
        const data = await res.json();
        setContainers(data.containers || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to load containers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAction = async (action: string, containerId: string) => {
    if (action === 'logs') {
      setSelectedLogs(containerId);
      try {
        const res = await fetch(`/api/docker/logs/${containerId}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || 'No logs available');
        }
      } catch (error) {
        setLogs('Failed to fetch logs');
      }
      return;
    }

    setActionInProgress(containerId);
    try {
      const res = await fetch(`/api/docker/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, containerId }),
      });
      
      if (res.ok) {
        await loadContainers();
      }
    } catch (error) {
      console.error(`Failed to ${action} container:`, error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadContainers();
  };

  const filteredContainers = containers.filter(c => {
    if (filter === 'running') return c.status === 'running';
    if (filter === 'stopped') return c.status === 'stopped';
    if (filter === 'ai') return c.name.includes('vllm') || c.name.includes('nlu') || c.name.includes('asr') || c.name.includes('tts') || c.name.includes('ai');
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-[#059211]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Box size={32} />
              <h1 className="text-3xl font-bold">Docker Management</h1>
            </div>
            <p className="text-slate-300">
              Monitor and control all Docker containers in the Mangwale AI stack
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white text-slate-700 px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Server className="text-blue-500" size={24} />
              <span className="text-sm text-gray-600">Containers</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.runningContainers}/{stats.totalContainers}
            </div>
            <div className="text-xs text-gray-500">Running</div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Cpu className="text-orange-500" size={24} />
              <span className="text-sm text-gray-600">CPU Usage</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.cpuUsage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Utilization</div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <MemoryStick className="text-purple-500" size={24} />
              <span className="text-sm text-gray-600">Memory</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {(stats.memoryUsage / 1024).toFixed(1)} GB
            </div>
            <div className="text-xs text-gray-500">of {(stats.memoryTotal / 1024).toFixed(1)} GB</div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <HardDrive className="text-green-500" size={24} />
              <span className="text-sm text-gray-600">Images</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalImages}
            </div>
            <div className="text-xs text-gray-500">Docker Images</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'running', 'stopped', 'ai'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f
                ? 'bg-[#059211] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'ai' ? 'AI Services' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Container Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContainers.map((container) => (
          <ContainerCard
            key={container.id}
            container={container}
            onAction={handleAction}
          />
        ))}
      </div>

      {filteredContainers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No containers found matching the filter.
        </div>
      )}

      {/* Logs Modal */}
      {selectedLogs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">
                Container Logs: {containers.find(c => c.id === selectedLogs)?.name}
              </h3>
              <button
                onClick={() => setSelectedLogs(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-sm text-green-400">
              <pre className="whitespace-pre-wrap">{logs}</pre>
            </div>
          </div>
        </div>
      )}

      {/* GPU Status */}
      <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Gauge className="text-purple-500" size={20} />
          GPU Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="text-sm text-purple-600 mb-1">GPU Model</div>
            <div className="font-bold text-gray-900">NVIDIA RTX 3060</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="text-sm text-green-600 mb-1">Memory Used</div>
            <div className="font-bold text-gray-900">10.9 GB / 12 GB</div>
            <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '91%' }} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1">Active Process</div>
            <div className="font-bold text-gray-900">vLLM (Qwen 2.5 7B AWQ)</div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-500 mt-0.5" size={20} />
            <div>
              <div className="font-medium text-amber-800">GPU Memory Note</div>
              <p className="text-sm text-amber-700">
                vLLM is using 90% of GPU memory. ASR (Whisper) and TTS (XTTS) are running on CPU to conserve GPU resources.
                For GPU-accelerated voice services, consider a GPU with more VRAM.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
