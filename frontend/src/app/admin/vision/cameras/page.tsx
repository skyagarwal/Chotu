'use client';

import { useState, useEffect } from 'react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Video, 
  VideoOff,
  TestTube,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface CameraData {
  id: string;
  name: string;
  rtspUrl: string;
  subStreamUrl?: string;
  storeId: string;
  zone: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastHeartbeat: string | null;
  location?: {
    description?: string;
    floor?: string;
  };
  capabilities?: {
    resolution?: string;
    fps?: number;
  };
  createdAt: string;
}

const ZONES = [
  'KITCHEN',
  'DINING', 
  'ENTRANCE',
  'EXIT',
  'STORAGE',
  'DELIVERY',
  'PARKING',
  'OFFICE'
];

export default function CameraManagementPage() {
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testingCamera, setTestingCamera] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    rtspUrl: '',
    subStreamUrl: '',
    storeId: '',
    zone: 'ENTRANCE',
    locationDescription: '',
    locationFloor: '',
    resolution: '1920x1080',
    fps: 25
  });

  const fetchCameras = async () => {
    try {
      const response = await fetch('/api/vision/cameras');
      if (response.ok) {
        const data = await response.json();
        setCameras(Array.isArray(data) ? data : data.cameras || []);
      }
    } catch (err) {
      console.error('Failed to fetch cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/vision/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          rtspUrl: formData.rtspUrl,
          subStreamUrl: formData.subStreamUrl || undefined,
          storeId: formData.storeId,
          zone: formData.zone,
          location: {
            description: formData.locationDescription,
            floor: formData.locationFloor
          },
          capabilities: {
            resolution: formData.resolution,
            fps: formData.fps
          }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to add camera');
      }

      setSuccess('Camera added successfully!');
      setShowAddModal(false);
      setFormData({
        name: '',
        rtspUrl: '',
        subStreamUrl: '',
        storeId: '',
        zone: 'ENTRANCE',
        locationDescription: '',
        locationFloor: '',
        resolution: '1920x1080',
        fps: 25
      });
      fetchCameras();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add camera');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCamera = async (id: string) => {
    if (!confirm('Are you sure you want to delete this camera?')) return;

    try {
      const response = await fetch(`/api/vision/cameras/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete camera');

      setSuccess('Camera deleted successfully!');
      fetchCameras();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete camera');
    }
  };

  const handleTestCamera = async (id: string) => {
    setTestingCamera(id);
    try {
      const response = await fetch(`/api/vision/cameras/${id}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success || result.isOnline) {
        setSuccess(`Camera test successful! Latency: ${result.latency || 'N/A'}ms`);
      } else {
        setError(`Camera test failed: ${result.error || 'Connection failed'}`);
      }
      fetchCameras();
      setTimeout(() => { setSuccess(''); setError(''); }, 5000);
    } catch (err) {
      setError('Failed to test camera connection');
    } finally {
      setTestingCamera(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Online</span>;
      case 'OFFLINE':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 flex items-center gap-1"><VideoOff className="w-3 h-3" /> Offline</span>;
      case 'ERROR':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Error</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Camera Management</h1>
          <p className="text-gray-600">Add, configure, and manage surveillance cameras</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchCameras}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Camera
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Total Cameras</span>
            <Camera className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{cameras.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Online</span>
            <Video className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-green-600">{cameras.filter(c => c.status === 'ONLINE').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Offline</span>
            <VideoOff className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{cameras.filter(c => c.status === 'OFFLINE').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Errors</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-red-600">{cameras.filter(c => c.status === 'ERROR').length}</p>
        </div>
      </div>

      {/* Camera List */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Registered Cameras</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Loading cameras...</p>
          </div>
        ) : cameras.length === 0 ? (
          <div className="p-8 text-center">
            <Camera className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No cameras registered yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Your First Camera
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Zone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Store ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">RTSP URL</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cameras.map((camera) => (
                  <tr key={camera.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{camera.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">{camera.zone}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{camera.storeId}</td>
                    <td className="py-3 px-4">{getStatusBadge(camera.status)}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm font-mono max-w-xs truncate">{camera.rtspUrl}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTestCamera(camera.id)}
                          disabled={testingCamera === camera.id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Test Connection"
                        >
                          {testingCamera === camera.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteCamera(camera.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Add New Camera</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCamera} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Camera Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Kitchen Camera 1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {ZONES.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RTSP URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.rtspUrl}
                  onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="rtsp://username:password@192.168.1.100:554/stream1"
                />
                <p className="text-xs text-gray-500 mt-1">Main stream URL for high-quality recording</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub-Stream URL (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subStreamUrl}
                  onChange={(e) => setFormData({ ...formData, subStreamUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="rtsp://username:password@192.168.1.100:554/stream2"
                />
                <p className="text-xs text-gray-500 mt-1">Lower resolution stream for live preview</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.storeId}
                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., STORE-001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor/Location
                  </label>
                  <input
                    type="text"
                    value={formData.locationFloor}
                    onChange={(e) => setFormData({ ...formData, locationFloor: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Ground Floor"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Description
                </label>
                <input
                  type="text"
                  value={formData.locationDescription}
                  onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Near main entrance, facing parking lot"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                  <select
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="3840x2160">4K (3840x2160)</option>
                    <option value="2560x1440">2K (2560x1440)</option>
                    <option value="1920x1080">Full HD (1920x1080)</option>
                    <option value="1280x720">HD (1280x720)</option>
                    <option value="640x480">VGA (640x480)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FPS</label>
                  <select
                    value={formData.fps}
                    onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 FPS</option>
                    <option value={25}>25 FPS</option>
                    <option value={20}>20 FPS</option>
                    <option value={15}>15 FPS</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-blue-800 mb-2">RTSP URL Format</h4>
                <p className="text-sm text-blue-700">
                  Most IP cameras use this format:<br/>
                  <code className="bg-blue-100 px-1 rounded">rtsp://username:password@IP:PORT/path</code>
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Common paths: /Streaming/Channels/1 (Hikvision), /cam/realmonitor (Dahua), /live/ch00_0 (Generic)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
