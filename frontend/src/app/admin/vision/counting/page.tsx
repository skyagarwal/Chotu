'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  Package, 
  Apple,
  Car,
  RefreshCw,
  Upload,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Camera,
  Clock,
  Activity,
  Play,
  Pause,
  Info,
  HelpCircle,
  Zap,
  Eye,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface CountingResult {
  totalObjects: number;
  peopleCount: number;
  boxCount: number;
  itemCount: number;
  vehicleCount: number;
  crowdDensity: 'low' | 'medium' | 'high' | 'critical';
  densityScore: number;
  counts: {
    [className: string]: {
      total: number;
      detections: Array<{
        id: string;
        class: string;
        confidence: number;
        bbox: { x: number; y: number; width: number; height: number };
      }>;
    };
  };
  processingTimeMs: number;
}

interface CountingStats {
  totalLogs: number;
  totalPeopleCounted: number;
  totalBoxesCounted: number;
  totalItemsCounted: number;
  avgPeoplePerFrame: number;
  avgDensityScore: number;
  peakCount: number;
  peakTime: string | null;
  byHour: Array<{ hour: number; avgPeople: number; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
}

interface SupportedClass {
  id: number;
  name: string;
  category: string;
}

interface LiveStream {
  cameraId: string;
  peopleCount: number;
  totalObjects: number;
  crowdDensity: string;
  lastUpdate: string;
}

interface LiveDashboard {
  summary: {
    activeStreams: number;
    totalOnlineCameras: number;
    totalPeopleNow: number;
    totalObjectsNow: number;
  };
  cameras: LiveStream[];
  timestamp: string;
}

type TabType = 'live' | 'upload' | 'analytics' | 'help';

export default function ObjectCountingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [result, setResult] = useState<CountingResult | null>(null);
  const [stats, setStats] = useState<CountingStats | null>(null);
  const [liveDashboard, setLiveDashboard] = useState<LiveDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supportedClasses, setSupportedClasses] = useState<SupportedClass[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [storeId, setStoreId] = useState('default');
  const [livePolling, setLivePolling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch supported classes and stats on mount
  useEffect(() => {
    fetchSupportedClasses();
    fetchStats();
  }, [storeId]);

  // Live polling effect
  useEffect(() => {
    if (livePolling && activeTab === 'live') {
      fetchLiveDashboard();
      pollingRef.current = setInterval(fetchLiveDashboard, 5000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [livePolling, activeTab]);

  const fetchSupportedClasses = async () => {
    try {
      const response = await fetch('/api/vision/counting/classes');
      if (response.ok) {
        const data = await response.json();
        setSupportedClasses(data.classes || []);
      }
    } catch (err) {
      console.error('Failed to fetch supported classes:', err);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch(`/api/vision/counting/analytics/stats?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchLiveDashboard = async () => {
    setLiveLoading(true);
    try {
      const response = await fetch(`/api/vision/counting/live/dashboard?storeId=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setLiveDashboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch live dashboard:', err);
    } finally {
      setLiveLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError('');
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError('');
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const countObjects = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('storeId', storeId);
      if (selectedClasses.length > 0) {
        formData.append('classesToCount', JSON.stringify(selectedClasses));
      }

      const response = await fetch('/api/vision/counting/objects', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to count objects');
      }

      const data = await response.json();
      setResult(data);

      // Draw bounding boxes
      if (previewUrl && canvasRef.current) {
        drawDetections(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to count objects');
    } finally {
      setLoading(false);
    }
  };

  const drawDetections = (data: CountingResult) => {
    const canvas = canvasRef.current;
    const img = new Image();
    img.src = previewUrl!;

    img.onload = () => {
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      // Draw each detection
      for (const [className, classData] of Object.entries(data.counts)) {
        const color = getClassColor(className);
        for (const det of classData.detections) {
          const { x, y, width, height } = det.bbox;
          
          // Draw box
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          // Draw label
          const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
          ctx.fillStyle = color;
          ctx.fillRect(x, y - 25, ctx.measureText(label).width + 10, 25);
          ctx.fillStyle = 'white';
          ctx.font = '14px Arial';
          ctx.fillText(label, x + 5, y - 8);
        }
      }
    };
  };

  const getClassColor = (className: string): string => {
    const colors: { [key: string]: string } = {
      person: '#3B82F6',
      car: '#EF4444',
      truck: '#F97316',
      bus: '#F59E0B',
      bicycle: '#10B981',
      motorcycle: '#8B5CF6',
      bottle: '#06B6D4',
      cup: '#84CC16',
      backpack: '#EC4899',
      handbag: '#F472B6',
      suitcase: '#A855F7',
    };
    return colors[className] || '#6B7280';
  };

  const getDensityColor = (density: string): string => {
    switch (density) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const tabs = [
    { id: 'live' as TabType, label: 'Live Counting', icon: Activity },
    { id: 'upload' as TabType, label: 'Upload Image', icon: Upload },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
    { id: 'help' as TabType, label: 'Help & Info', icon: HelpCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Object Counting</h1>
          <p className="text-gray-500 mt-1">
            AI-powered object detection and counting for people, vehicles, packages, and more
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="default">Default Store</option>
            <option value="store-1">Store 1</option>
            <option value="store-2">Store 2</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Live Counting Tab */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Live Controls */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${livePolling ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-lg font-semibold">
                  {livePolling ? 'Live Monitoring Active' : 'Live Monitoring Paused'}
                </span>
              </div>
              <button
                onClick={() => setLivePolling(!livePolling)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  livePolling 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {livePolling ? <Pause size={18} /> : <Play size={18} />}
                {livePolling ? 'Pause' : 'Start'} Monitoring
              </button>
            </div>

            {/* Live Summary */}
            {liveDashboard && (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Camera size={20} />
                    <span className="text-sm font-medium">Active Streams</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    {liveDashboard.summary.activeStreams}
                  </div>
                  <div className="text-xs text-blue-500 mt-1">
                    of {liveDashboard.summary.totalOnlineCameras} cameras
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Users size={20} />
                    <span className="text-sm font-medium">People Now</span>
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    {liveDashboard.summary.totalPeopleNow}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Package size={20} />
                    <span className="text-sm font-medium">Total Objects</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-700">
                    {liveDashboard.summary.totalObjectsNow}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Clock size={20} />
                    <span className="text-sm font-medium">Last Update</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-700">
                    {new Date(liveDashboard.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}

            {/* Camera List */}
            {liveDashboard && liveDashboard.cameras.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Camera Feeds</h3>
                <div className="grid grid-cols-3 gap-4">
                  {liveDashboard.cameras.map((cam) => (
                    <div key={cam.cameraId} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{cam.cameraId}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDensityColor(cam.crowdDensity)}`}>
                          {cam.crowdDensity}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">People:</span>
                          <span className="ml-1 font-medium">{cam.peopleCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Objects:</span>
                          <span className="ml-1 font-medium">{cam.totalObjects}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!liveDashboard && !liveLoading && (
              <div className="text-center text-gray-500 py-8">
                <Activity size={48} className="mx-auto mb-4 opacity-50" />
                <p>Start monitoring to see live counts from connected cameras</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Image</h2>
            
            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">Drop an image here or click to upload</p>
              <p className="text-gray-400 text-sm mt-2">Supports JPG, PNG, WebP</p>
            </div>

            {/* Class Filter */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Class (Optional)</h3>
              <div className="flex flex-wrap gap-2">
                {['person', 'car', 'truck', 'bottle', 'backpack', 'suitcase'].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => {
                      setSelectedClasses(prev => 
                        prev.includes(cls) 
                          ? prev.filter(c => c !== cls)
                          : [...prev, cls]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedClasses.includes(cls)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Count Button */}
            <button
              onClick={countObjects}
              disabled={!selectedFile || loading}
              className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Processing...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Count Objects
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <XCircle size={18} />
                {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detection Results</h2>
            
            {previewUrl ? (
              <div className="relative">
                <canvas 
                  ref={canvasRef} 
                  className="w-full rounded-lg border"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Eye size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Upload an image to see detections</p>
                </div>
              </div>
            )}

            {result && (
              <div className="mt-6 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <Users size={20} className="mx-auto text-blue-600 mb-1" />
                    <div className="text-2xl font-bold text-blue-700">{result.peopleCount}</div>
                    <div className="text-xs text-blue-500">People</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <Package size={20} className="mx-auto text-orange-600 mb-1" />
                    <div className="text-2xl font-bold text-orange-700">{result.boxCount}</div>
                    <div className="text-xs text-orange-500">Boxes</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <Car size={20} className="mx-auto text-green-600 mb-1" />
                    <div className="text-2xl font-bold text-green-700">{result.vehicleCount}</div>
                    <div className="text-xs text-green-500">Vehicles</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <Apple size={20} className="mx-auto text-purple-600 mb-1" />
                    <div className="text-2xl font-bold text-purple-700">{result.itemCount}</div>
                    <div className="text-xs text-purple-500">Items</div>
                  </div>
                </div>

                {/* Crowd Density */}
                <div className={`rounded-lg p-4 ${getDensityColor(result.crowdDensity)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Crowd Density</span>
                    <span className="font-bold uppercase">{result.crowdDensity}</span>
                  </div>
                  <div className="mt-2 bg-white/50 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-current"
                      style={{ width: `${result.densityScore}%` }}
                    />
                  </div>
                </div>

                {/* Processing Time */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Processing Time</span>
                  <span className="font-medium">{result.processingTimeMs}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 size={24} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Counts</div>
                  <div className="text-2xl font-bold">{stats?.totalLogs || 0}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total People</div>
                  <div className="text-2xl font-bold">{stats?.totalPeopleCounted || 0}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp size={24} className="text-orange-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Peak Count</div>
                  <div className="text-2xl font-bold">{stats?.peakCount || 0}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity size={24} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Avg Density</div>
                  <div className="text-2xl font-bold">{(stats?.avgDensityScore || 0).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts would go here */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Hourly Distribution</h3>
            {stats?.byHour && stats.byHour.length > 0 ? (
              <div className="h-64 flex items-end gap-2">
                {stats.byHour.map((hour, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(hour.avgPeople / (stats.peakCount || 1)) * 200}px` }}
                    />
                    <span className="text-xs text-gray-500 mt-2">{hour.hour}:00</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No hourly data available yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Tab */}
      {activeTab === 'help' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Getting Started */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info size={20} className="text-blue-600" />
                Getting Started
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  The Object Counting module uses AI-powered YOLOv8 model to detect and count
                  objects in images and video streams. It supports 80 different object classes.
                </p>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Quick Start:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to "Upload Image" tab</li>
                    <li>Drag & drop or click to upload an image</li>
                    <li>Optionally select classes to filter</li>
                    <li>Click "Count Objects" to run detection</li>
                    <li>View results with bounding boxes</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">People Counting</div>
                    <div className="text-sm text-gray-500">Track crowd density</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Vehicle Detection</div>
                    <div className="text-sm text-gray-500">Cars, trucks, bikes</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Package Counting</div>
                    <div className="text-sm text-gray-500">Boxes and luggage</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Live Streaming</div>
                    <div className="text-sm text-gray-500">Real-time camera feeds</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Zone Counting</div>
                    <div className="text-sm text-gray-500">Define custom areas</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Alerts</div>
                    <div className="text-sm text-gray-500">Crowd density warnings</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Supported Classes */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Supported Object Classes</h2>
              <div className="max-h-64 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                  {supportedClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getClassColor(cls.name) }} />
                      <span className="text-gray-700">{cls.name}</span>
                      <span className="text-xs text-gray-400">({cls.category})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Crowd Density Guide */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Crowd Density Levels</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-16 px-2 py-1 text-center rounded text-xs font-medium bg-green-100 text-green-700">LOW</span>
                  <span className="text-sm text-gray-600">0-10 people - Normal operation</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 px-2 py-1 text-center rounded text-xs font-medium bg-yellow-100 text-yellow-700">MEDIUM</span>
                  <span className="text-sm text-gray-600">11-30 people - Moderate activity</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 px-2 py-1 text-center rounded text-xs font-medium bg-orange-100 text-orange-700">HIGH</span>
                  <span className="text-sm text-gray-600">31-50 people - High traffic</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 px-2 py-1 text-center rounded text-xs font-medium bg-red-100 text-red-700">CRITICAL</span>
                  <span className="text-sm text-gray-600">50+ people - Requires attention</span>
                </div>
              </div>
            </div>

            {/* API Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints</h2>
              <div className="space-y-2 text-sm font-mono">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-green-600">POST</span> /counting/objects
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-green-600">POST</span> /counting/people
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-blue-600">GET</span> /counting/live/dashboard
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-blue-600">GET</span> /counting/classes
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
