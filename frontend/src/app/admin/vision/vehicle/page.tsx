'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { Bike, Upload, Camera, ImageIcon, Loader2, CheckCircle2, XCircle, AlertTriangle, User, Sun, Moon, Shield, ShieldCheck, ShieldX, Car, HardHat, Shirt, BadgeCheck, Eye, History, Sparkles, Clock, MapPin, AlertCircle } from 'lucide-react';

interface SafetyItem {
  item: string;
  present: boolean;
  condition: 'good' | 'needs-attention' | 'critical';
  notes?: string;
}

interface VehicleCompliance {
  riderId?: string;
  vehicleId?: string;
  timestamp: string;
  overallCompliance: 'compliant' | 'warning' | 'non-compliant';
  complianceScore: number;
  rider: {
    identified: boolean;
    uniformCheck: { wearing: boolean; clean: boolean; brandVisible: boolean };
    safetyGear: SafetyItem[];
    idBadge: { visible: boolean; valid: boolean };
  };
  vehicle: {
    type: 'bike' | 'scooter' | 'car' | 'van';
    cleanlinessScore: number;
    brandingVisible: boolean;
    conditionItems: SafetyItem[];
    deliveryBox?: { present: boolean; clean: boolean; secured: boolean };
  };
  timeOfDay: 'day' | 'night';
  lightsCheck?: { headlight: boolean; taillight: boolean; indicators: boolean };
  issues: string[];
  recommendations: string[];
  confidence: number;
}

export default function VehicleCompliancePage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<VehicleCompliance | null>(null);
  const [error, setError] = useState<string>('');
  const [riderId, setRiderId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('day');
  const [activeTab, setActiveTab] = useState('check');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
      setError('');
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
    } catch { setError('Could not access camera'); }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'vehicle-capture.jpg', { type: 'image/jpeg' });
          setSelectedImage(file);
          setImagePreview(canvas.toDataURL());
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const checkCompliance = async () => {
    if (!selectedImage) { setError('Please capture a vehicle/rider image first'); return; }
    setIsChecking(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (riderId) formData.append('riderId', riderId);
      if (vehicleId) formData.append('vehicleId', vehicleId);
      formData.append('timeOfDay', timeOfDay);

      const response = await fetch('/api/vision/vehicle/check', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Compliance check failed');
      const data = await response.json();
      setResult(data);
    } catch { setError('Failed to check compliance. Please try again.'); } finally { setIsChecking(false); }
  };

  const getComplianceBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: ReactNode }> = {
      'compliant': { color: 'bg-green-100 text-green-700', icon: <ShieldCheck className="h-4 w-4" /> },
      'warning': { color: 'bg-yellow-100 text-yellow-700', icon: <Shield className="h-4 w-4" /> },
      'non-compliant': { color: 'bg-red-100 text-red-700', icon: <ShieldX className="h-4 w-4" /> },
    };
    const c = configs[status] || { color: 'bg-gray-100', icon: null };
    return <span className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 ${c.color}`}>{c.icon}{status.replace('-', ' ')}</span>;
  };

  const getConditionBadge = (condition: string) => {
    const colors: Record<string, string> = { 'good': 'bg-green-100 text-green-700', 'needs-attention': 'bg-yellow-100 text-yellow-700', 'critical': 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-0.5 rounded text-xs ${colors[condition] || 'bg-gray-100'}`}>{condition.replace('-', ' ')}</span>;
  };

  const getScoreColor = (score: number) => score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bike className="h-8 w-8 text-purple-500" />
            Vehicle & Rider Compliance
          </h1>
          <p className="text-gray-500 mt-1">AI-powered safety & compliance verification</p>
        </div>
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1"><Sparkles className="h-3 w-3" /> Computer Vision</span>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {[{ id: 'check', icon: Eye, label: 'Check' }, { id: 'rider', icon: User, label: 'Rider' }, { id: 'vehicle', icon: Bike, label: 'Vehicle' }, { id: 'history', icon: History, label: 'History' }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${activeTab === tab.id ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {['check', 'rider', 'vehicle'].includes(activeTab) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Capture Image</h2>

            <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[300px] flex items-center justify-center bg-gray-50">
              {isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="max-h-[280px] rounded-lg" />
              ) : imagePreview ? (
                <img src={imagePreview} alt="Vehicle preview" className="max-h-[280px] rounded-lg object-contain" />
              ) : (
                <div className="text-gray-400"><Bike className="h-16 w-16 mx-auto mb-4 opacity-50" /><p>No image selected</p></div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload
              </button>
              {isCameraActive ? (
                <>
                  <button className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg flex items-center justify-center gap-2" onClick={capturePhoto}><Camera className="h-4 w-4" /> Capture</button>
                  <button className="px-4 py-2 border rounded-lg" onClick={stopCamera}><XCircle className="h-4 w-4" /></button>
                </>
              ) : (
                <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={startCamera}><Camera className="h-4 w-4" /> Camera</button>
              )}
            </div>

            <div className="space-y-4 pt-4 mt-4 border-t">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Rider ID</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="RDR-001" value={riderId} onChange={(e) => setRiderId(e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle ID</label>
                  <div className="relative">
                    <Bike className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="VEH-001" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time of Day</label>
                <div className="flex gap-2">
                  <button onClick={() => setTimeOfDay('day')} className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${timeOfDay === 'day' ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <Sun className="h-4 w-4" /> Day
                  </button>
                  <button onClick={() => setTimeOfDay('night')} className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${timeOfDay === 'night' ? 'bg-indigo-100 border-2 border-indigo-400' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <Moon className="h-4 w-4" /> Night
                  </button>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-3 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2" onClick={checkCompliance} disabled={!selectedImage || isChecking}>
              {isChecking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : <><Shield className="h-4 w-4" /> Check Compliance</>}
            </button>

            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-purple-500" /> Compliance Results</h2>
            {result ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-bold ${getScoreColor(result.complianceScore)}`}>{result.complianceScore}%</div>
                    <div className="text-sm text-gray-500">Compliance<br/>Score</div>
                  </div>
                  {getComplianceBadge(result.overallCompliance)}
                </div>

                {(activeTab === 'check' || activeTab === 'rider') && result.rider && (
                  <div className="space-y-3 p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2"><User className="h-4 w-4" /> Rider Compliance</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded"><span className="text-sm">Identified</span>{result.rider.identified ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded"><span className="text-sm">ID Badge</span>{result.rider.idBadge.visible && result.rider.idBadge.valid ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}</div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1"><Shirt className="h-3 w-3" /> Uniform</p>
                      <div className="flex gap-2 flex-wrap">
                        {result.rider.uniformCheck.wearing && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Wearing ✓</span>}
                        {result.rider.uniformCheck.clean && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Clean ✓</span>}
                        {result.rider.uniformCheck.brandVisible && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Branding ✓</span>}
                        {!result.rider.uniformCheck.wearing && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">No Uniform</span>}
                      </div>
                    </div>
                    {result.rider.safetyGear && result.rider.safetyGear.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1"><HardHat className="h-3 w-3" /> Safety Gear</p>
                        <div className="space-y-1">
                          {result.rider.safetyGear.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-1">{item.present ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}{item.item}</span>
                              {getConditionBadge(item.condition)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(activeTab === 'check' || activeTab === 'vehicle') && result.vehicle && (
                  <div className="space-y-3 p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2"><Bike className="h-4 w-4" /> Vehicle Compliance</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-gray-50 rounded text-center"><div className="text-xs text-gray-500">Type</div><div className="capitalize">{result.vehicle.type}</div></div>
                      <div className="p-2 bg-gray-50 rounded text-center"><div className="text-xs text-gray-500">Cleanliness</div><div className={getScoreColor(result.vehicle.cleanlinessScore)}>{result.vehicle.cleanlinessScore}%</div></div>
                      <div className="p-2 bg-gray-50 rounded text-center"><div className="text-xs text-gray-500">Branding</div>{result.vehicle.brandingVisible ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}</div>
                    </div>
                    {result.vehicle.deliveryBox && (
                      <div className="flex items-center gap-4 p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">Delivery Box</span>
                        <div className="flex gap-2">
                          {result.vehicle.deliveryBox.present && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Present</span>}
                          {result.vehicle.deliveryBox.clean && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Clean</span>}
                          {result.vehicle.deliveryBox.secured && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Secured</span>}
                        </div>
                      </div>
                    )}
                    {result.vehicle.conditionItems && result.vehicle.conditionItems.length > 0 && (
                      <div className="space-y-1">
                        {result.vehicle.conditionItems.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1">{item.present ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}{item.item}</span>
                            {getConditionBadge(item.condition)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {timeOfDay === 'night' && result.lightsCheck && (
                  <div className="flex items-center gap-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <Moon className="h-5 w-5 text-indigo-500" />
                    <div className="flex gap-3 text-sm">
                      <span className="flex items-center gap-1">{result.lightsCheck.headlight ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}Headlight</span>
                      <span className="flex items-center gap-1">{result.lightsCheck.taillight ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}Taillight</span>
                      <span className="flex items-center gap-1">{result.lightsCheck.indicators ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}Indicators</span>
                    </div>
                  </div>
                )}

                {result.issues && result.issues.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800 text-sm mb-2">Issues Found</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">{result.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
                  </div>
                )}

                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 text-sm mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">{result.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'Just now'}</span>
                  <span>Confidence: {Math.round(result.confidence * 100)}%</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400"><Bike className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>Capture a vehicle/rider image to check compliance</p></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><History className="h-5 w-5" /> Compliance History</h2>
          <div className="text-center py-8 text-gray-400"><History className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No compliance checks recorded</p><p className="text-sm">Start checking riders and vehicles to see history</p></div>
        </div>
      )}
    </div>
  );
}
