'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Save,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Undo,
  Info,
  HelpCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Zone {
  id: string;
  name: string;
  type: 'entry' | 'exit' | 'counting' | 'restricted';
  polygon: Point[];
  color: string;
  visible: boolean;
}

interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  thumbnailUrl?: string;
}

const ZONE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

const ZONE_TYPES = [
  { value: 'counting', label: 'Counting Zone', description: 'Count all objects in this area' },
  { value: 'entry', label: 'Entry Zone', description: 'Track entries into this area' },
  { value: 'exit', label: 'Exit Zone', description: 'Track exits from this area' },
  { value: 'restricted', label: 'Restricted Zone', description: 'Alert when objects enter' },
];

export default function ZoneConfigurationPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<Zone['type']>('counting');
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storeId] = useState('default');
  const [showHelp, setShowHelp] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Fetch cameras on mount
  useEffect(() => {
    fetchCameras();
  }, []);

  // Load zones when camera is selected
  useEffect(() => {
    if (selectedCamera) {
      fetchZones(selectedCamera.id);
    }
  }, [selectedCamera]);

  // Redraw canvas when zones or points change
  useEffect(() => {
    drawCanvas();
  }, [zones, currentPoints, selectedZone]);

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vision/cameras');
      if (response.ok) {
        const data = await response.json();
        setCameras(Array.isArray(data) ? data : data.cameras || []);
      }
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
      // Add demo camera for testing
      setCameras([
        { id: 'demo-1', name: 'Demo Camera 1', rtspUrl: 'rtsp://demo' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async (cameraId: string) => {
    try {
      const response = await fetch(`/api/vision/counting/zones/${cameraId}`);
      if (response.ok) {
        const data = await response.json();
        setZones(data.map((z: any) => ({
          ...z,
          visible: true,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    }
  };

  const saveZones = async () => {
    if (!selectedCamera) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/vision/counting/zones/${selectedCamera.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          zones: zones.map(z => ({
            name: z.name,
            type: z.type,
            polygon: z.polygon,
            color: z.color,
          })),
        }),
      });

      if (response.ok) {
        alert('Zones saved successfully!');
      } else {
        throw new Error('Failed to save zones');
      }
    } catch (error) {
      console.error('Failed to save zones:', error);
      alert('Failed to save zones');
    } finally {
      setSaving(false);
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image placeholder or actual image
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(selectedCamera ? `Camera: ${selectedCamera.name}` : 'Select a camera', canvas.width / 2, canvas.height / 2);

    // Draw existing zones
    for (const zone of zones) {
      if (!zone.visible) continue;
      drawZone(ctx, zone, selectedZone === zone.id);
    }

    // Draw current drawing points
    if (currentPoints.length > 0) {
      ctx.strokeStyle = newZoneColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw points
      for (const point of currentPoints) {
        ctx.fillStyle = newZoneColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [zones, currentPoints, selectedZone, newZoneColor, selectedCamera]);

  const drawZone = (ctx: CanvasRenderingContext2D, zone: Zone, isSelected: boolean) => {
    if (zone.polygon.length < 3) return;

    // Draw filled polygon with transparency
    ctx.fillStyle = zone.color + '40';
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = isSelected ? 3 : 2;

    ctx.beginPath();
    ctx.moveTo(zone.polygon[0].x, zone.polygon[0].y);
    for (let i = 1; i < zone.polygon.length; i++) {
      ctx.lineTo(zone.polygon[i].x, zone.polygon[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw zone label
    const centerX = zone.polygon.reduce((sum, p) => sum + p.x, 0) / zone.polygon.length;
    const centerY = zone.polygon.reduce((sum, p) => sum + p.y, 0) / zone.polygon.length;

    ctx.fillStyle = zone.color;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(zone.name, centerX, centerY - 8);
    ctx.font = '10px Arial';
    ctx.fillText(`(${zone.type})`, centerX, centerY + 8);

    // Draw vertices if selected
    if (isSelected) {
      for (const point of zone.polygon) {
        ctx.fillStyle = zone.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !selectedCamera) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPoints(prev => [...prev, { x, y }]);
  };

  const handleDoubleClick = () => {
    if (!isDrawing || currentPoints.length < 3) return;

    if (!newZoneName.trim()) {
      alert('Please enter a zone name');
      return;
    }

    // Create new zone
    const newZone: Zone = {
      id: `zone_${Date.now()}`,
      name: newZoneName,
      type: newZoneType,
      polygon: currentPoints,
      color: newZoneColor,
      visible: true,
    };

    setZones(prev => [...prev, newZone]);
    setCurrentPoints([]);
    setIsDrawing(false);
    setNewZoneName('');
    setNewZoneColor(ZONE_COLORS[(zones.length + 1) % ZONE_COLORS.length]);
  };

  const deleteZone = (zoneId: string) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
    if (selectedZone === zoneId) {
      setSelectedZone(null);
    }
  };

  const toggleZoneVisibility = (zoneId: string) => {
    setZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, visible: !z.visible } : z
    ));
  };

  const undoLastPoint = () => {
    setCurrentPoints(prev => prev.slice(0, -1));
  };

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setIsDrawing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zone Configuration</h1>
          <p className="text-gray-500 mt-1">
            Draw counting zones on camera views for advanced analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
          >
            <HelpCircle size={20} />
            Help
          </button>
          <button
            onClick={saveZones}
            disabled={saving || zones.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            Save Zones
          </button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Info size={20} />
            How to Configure Zones
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Creating a Zone:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Select a camera from the list</li>
                <li>Enter a name for the zone</li>
                <li>Choose the zone type</li>
                <li>Click "Start Drawing"</li>
                <li>Click on the canvas to add polygon points</li>
                <li>Double-click to complete the zone</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">Zone Types:</h4>
              <ul className="space-y-1">
                <li><span className="font-medium">Counting:</span> Count all objects in this area</li>
                <li><span className="font-medium">Entry:</span> Track entries into this zone</li>
                <li><span className="font-medium">Exit:</span> Track exits from this zone</li>
                <li><span className="font-medium">Restricted:</span> Alert when objects enter</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* Camera List */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Camera size={20} />
            Cameras
          </h2>
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              Loading cameras...
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No cameras available
            </div>
          ) : (
            <div className="space-y-2">
              {cameras.map(camera => (
                <button
                  key={camera.id}
                  onClick={() => setSelectedCamera(camera)}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                    selectedCamera?.id === camera.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">{camera.name}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Zone Drawing Canvas</h2>
            {isDrawing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={undoLastPoint}
                  disabled={currentPoints.length === 0}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Undo last point"
                >
                  <Undo size={18} />
                </button>
                <button
                  onClick={cancelDrawing}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              onClick={handleCanvasClick}
              onDoubleClick={handleDoubleClick}
              className={`w-full cursor-${isDrawing ? 'crosshair' : 'default'}`}
              style={{ aspectRatio: '4/3' }}
            />
            <img ref={imageRef} className="hidden" alt="" />

            {isDrawing && currentPoints.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-sm">
                Click to add points • Double-click to complete ({currentPoints.length} points)
              </div>
            )}
          </div>
        </div>

        {/* Zone Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="text-lg font-semibold mb-4">Zone Settings</h2>

          {!selectedCamera ? (
            <div className="text-center text-gray-400 py-8">
              Select a camera to start
            </div>
          ) : (
            <div className="space-y-4">
              {/* New Zone Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone Name
                  </label>
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="e.g., Entrance, Checkout"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone Type
                  </label>
                  <select
                    value={newZoneType}
                    onChange={(e) => setNewZoneType(e.target.value as Zone['type'])}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {ZONE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {ZONE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewZoneColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newZoneColor === color ? 'border-gray-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawing(true)}
                  disabled={isDrawing || !newZoneName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                >
                  <Plus size={18} />
                  {isDrawing ? 'Drawing...' : 'Start Drawing'}
                </button>
              </div>

              {/* Existing Zones */}
              {zones.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Configured Zones ({zones.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {zones.map(zone => (
                      <div
                        key={zone.id}
                        onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                          selectedZone === zone.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                          <span className="text-sm font-medium">{zone.name}</span>
                          <span className="text-xs text-gray-500">({zone.type})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleZoneVisibility(zone.id); }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {zone.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
