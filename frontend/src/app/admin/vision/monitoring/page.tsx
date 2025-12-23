'use client';

import { useState, useEffect } from 'react';
import { 
  Video, 
  VideoOff, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Search,
  Play
} from 'lucide-react';

interface Camera {
  id: string;
  name: string;
  storeId: string;
  zone: string;
  rtspUrl: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  isActive: boolean;
  lastHeartbeat: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CameraStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  byZone: Array<{
    zone: string;
    count: number;
  }>;
}

interface StreamStats {
  activeStreams: number;
  totalFramesProcessed: number;
  totalDetections: number;
}

export default function LiveMonitoringPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [stats, setStats] = useState<CameraStats | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterZone !== 'all') params.append('zone', filterZone);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const [camerasRes, statsRes, streamStatsRes] = await Promise.all([
        fetch(`/api/vision/cameras?${params.toString()}`),
        fetch('/api/vision/cameras/stats'),
        fetch('/api/vision/live-stream/stats')
      ]);

      if (camerasRes.ok) {
        const camerasData = await camerasRes.json();
        setCameras(camerasData.cameras || camerasData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (streamStatsRes.ok) {
        const streamStatsData = await streamStatsRes.json();
        setStreamStats(streamStatsData);
      }

    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterZone, filterStatus]);

  const filteredCameras = cameras.filter(camera => {
    const matchesSearch = searchQuery === '' || 
      camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.storeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.zone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'OFFLINE': return 'bg-gray-500';
      case 'ERROR': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'OFFLINE': return <VideoOff className="h-5 w-5 text-gray-500" />;
      case 'ERROR': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Video className="h-5 w-5" />;
    }
  };

  const getLastSeenTime = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return 'Never';
    const diff = Date.now() - new Date(lastHeartbeat).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const zones = Array.from(new Set(cameras.map(c => c.zone)));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Live Monitoring</h1>
              <p className="text-gray-600 mt-1">Real-time camera status and stream monitoring</p>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cameras</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total || 0}</p>
                </div>
                <Video className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Online</p>
                  <p className="text-3xl font-bold text-green-500 mt-1">{stats?.online || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Offline</p>
                  <p className="text-3xl font-bold text-gray-500 mt-1">{stats?.offline || 0}</p>
                </div>
                <VideoOff className="h-8 w-8 text-gray-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Streams</p>
                  <p className="text-3xl font-bold text-blue-500 mt-1">{streamStats?.activeStreams || 0}</p>
                </div>
                <Play className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search cameras..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Zones</option>
                {zones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="ERROR">Error</option>
              </select>
            </div>
          </div>

          {/* Camera Grid */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Loading cameras...</p>
            </div>
          ) : filteredCameras.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No cameras found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCameras.map((camera) => (
                <div key={camera.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(camera.status)}
                        <h3 className="font-semibold text-gray-900">{camera.name}</h3>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium text-white rounded ${getStatusColor(camera.status)}`}>
                        {camera.status}
                      </span>
                    </div>

                    <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center mb-3">
                      <Video className="h-12 w-12 text-gray-400" />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Store:</span>
                        <span className="font-medium text-gray-900">{camera.storeId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Zone:</span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-900 font-medium">{camera.zone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Seen:</span>
                        <span className="font-medium text-gray-900">{getLastSeenTime(camera.lastHeartbeat)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active:</span>
                        <span className={camera.isActive ? 'text-green-500 font-medium' : 'text-gray-500'}>
                          {camera.isActive ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
