'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { Package, Upload, Camera, ImageIcon, Loader2, CheckCircle2, XCircle, AlertTriangle, Truck, User, Store, ShoppingBag, QrCode, Barcode, Shield, History, Clock, MapPin, Sparkles, Eye } from 'lucide-react';

interface ParcelItem {
  name: string;
  quantity: number;
  verified: boolean;
  damaged: boolean;
  notes?: string;
}

interface ParcelVerification {
  orderId: string;
  riderId?: string;
  storeId?: string;
  status: 'verified' | 'mismatch' | 'damaged' | 'missing-items';
  timestamp: string;
  items: ParcelItem[];
  itemsVerified: number;
  itemsTotal: number;
  packaging: {
    integrity: 'intact' | 'minor-damage' | 'major-damage';
    sealed: boolean;
    labelVisible: boolean;
    bagType?: string;
  };
  qrCode?: { detected: boolean; valid: boolean; data?: string };
  temperature?: { status: 'ok' | 'warning' | 'critical'; value?: number };
  confidence: number;
  recommendations?: string[];
}

export default function ParcelVerificationPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<ParcelVerification | null>(null);
  const [error, setError] = useState<string>('');
  const [orderId, setOrderId] = useState('');
  const [riderId, setRiderId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [checkpointType, setCheckpointType] = useState('pickup');
  const [activeTab, setActiveTab] = useState('verify');
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
          const file = new File([blob], 'parcel-capture.jpg', { type: 'image/jpeg' });
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

  const verifyParcel = async () => {
    if (!selectedImage) { setError('Please capture a parcel image first'); return; }
    setIsVerifying(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (orderId) formData.append('orderId', orderId);
      if (riderId) formData.append('riderId', riderId);
      if (storeId) formData.append('storeId', storeId);
      formData.append('checkpoint', checkpointType);

      const response = await fetch('/api/vision/parcel/verify', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Verification failed');
      const data = await response.json();
      setResult(data);
    } catch { setError('Failed to verify parcel. Please try again.'); } finally { setIsVerifying(false); }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: ReactNode }> = {
      'verified': { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
      'mismatch': { color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="h-3 w-3" /> },
      'damaged': { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
      'missing-items': { color: 'bg-orange-100 text-orange-700', icon: <Package className="h-3 w-3" /> },
    };
    const c = configs[status] || { color: 'bg-gray-100', icon: null };
    return <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${c.color}`}>{c.icon}{status.replace('-', ' ')}</span>;
  };

  const getPackagingIntegrityBadge = (integrity: string) => {
    const colors: Record<string, string> = { 'intact': 'bg-green-100 text-green-700', 'minor-damage': 'bg-yellow-100 text-yellow-700', 'major-damage': 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-0.5 rounded text-xs ${colors[integrity] || 'bg-gray-100'}`}>{integrity.replace('-', ' ')}</span>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-orange-500" />
            Parcel Verification
          </h1>
          <p className="text-gray-500 mt-1">AI-powered parcel inspection & order verification</p>
        </div>
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1"><Sparkles className="h-3 w-3" /> Computer Vision</span>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {[{ id: 'verify', icon: Eye, label: 'Verify' }, { id: 'pickup', icon: Store, label: 'Pickup' }, { id: 'transit', icon: Truck, label: 'Transit' }, { id: 'delivery', icon: ShoppingBag, label: 'Delivery' }, { id: 'history', icon: History, label: 'History' }].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (['pickup', 'transit', 'delivery'].includes(tab.id)) setCheckpointType(tab.id); }} className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {['verify', 'pickup', 'transit', 'delivery'].includes(activeTab) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Parcel Image</h2>

            <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[300px] flex items-center justify-center bg-gray-50">
              {isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="max-h-[280px] rounded-lg" />
              ) : imagePreview ? (
                <img src={imagePreview} alt="Parcel preview" className="max-h-[280px] rounded-lg object-contain" />
              ) : (
                <div className="text-gray-400"><Package className="h-16 w-16 mx-auto mb-4 opacity-50" /><p>No image selected</p></div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload
              </button>
              {isCameraActive ? (
                <>
                  <button className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg flex items-center justify-center gap-2" onClick={capturePhoto}><Camera className="h-4 w-4" /> Capture</button>
                  <button className="px-4 py-2 border rounded-lg" onClick={stopCamera}><XCircle className="h-4 w-4" /></button>
                </>
              ) : (
                <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={startCamera}><Camera className="h-4 w-4" /> Camera</button>
              )}
            </div>

            <div className="space-y-4 pt-4 mt-4 border-t">
              <div>
                <label className="block text-sm font-medium mb-1">Order ID</label>
                <input type="text" placeholder="e.g., ORD-12345" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Rider ID</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="RDR-001" value={riderId} onChange={(e) => setRiderId(e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Store ID</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="STR-001" value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Checkpoint</label>
                <select value={checkpointType} onChange={(e) => setCheckpointType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="pickup">📦 Pickup (Store)</option>
                  <option value="transit">🚚 In Transit</option>
                  <option value="delivery">🏠 Delivery</option>
                </select>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-3 bg-orange-500 text-white rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2" onClick={verifyParcel} disabled={!selectedImage || isVerifying}>
              {isVerifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><Shield className="h-4 w-4" /> Verify Parcel</>}
            </button>

            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-orange-500" /> Verification Results</h2>
            {result ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div><p className="text-sm text-gray-500">Order ID</p><p className="font-mono font-medium">{result.orderId || orderId || 'N/A'}</p></div>
                  {getStatusBadge(result.status)}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{result.itemsVerified}</div><div className="text-xs text-gray-500">Verified</div></div>
                  <div className="p-3 bg-gray-100 rounded-lg text-center"><div className="text-2xl font-bold text-gray-600">{result.itemsTotal}</div><div className="text-xs text-gray-500">Total</div></div>
                  <div className="p-3 bg-green-50 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{Math.round((result.itemsVerified / result.itemsTotal) * 100)}%</div><div className="text-xs text-gray-500">Match</div></div>
                </div>

                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium">Packaging Check</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span className="text-sm">Integrity</span>{getPackagingIntegrityBadge(result.packaging.integrity)}</div>
                    <div className="flex items-center justify-between"><span className="text-sm">Sealed</span>{result.packaging.sealed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</div>
                    <div className="flex items-center justify-between"><span className="text-sm">Label Visible</span>{result.packaging.labelVisible ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</div>
                    {result.packaging.bagType && <div className="flex items-center justify-between"><span className="text-sm">Bag Type</span><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{result.packaging.bagType}</span></div>}
                  </div>
                </div>

                {result.qrCode && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2"><QrCode className="h-5 w-5" /><span className="text-sm font-medium">QR/Barcode</span></div>
                    {result.qrCode.detected ? (result.qrCode.valid ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Valid</span> : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Invalid</span>) : <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Not Detected</span>}
                  </div>
                )}

                {result.temperature && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2"><span className="text-lg">🌡️</span><span className="text-sm font-medium">Temperature</span></div>
                    <div className={`text-sm font-mono px-2 py-0.5 rounded ${result.temperature.status === 'ok' ? 'bg-green-100 text-green-700' : result.temperature.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {result.temperature.value ? `${result.temperature.value}°C` : result.temperature.status}
                    </div>
                  </div>
                )}

                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                    <h4 className="font-medium text-blue-800 text-sm">Recommendations</h4>
                    <ul className="list-disc list-inside text-sm text-blue-700">{result.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'Just now'}</span>
                  <span>Confidence: {Math.round(result.confidence * 100)}%</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400"><Package className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>Capture a parcel image to verify</p></div>
            )}
          </div>
        </div>
      )}

      {result && result.items && result.items.length > 0 && ['verify', 'pickup', 'transit', 'delivery'].includes(activeTab) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Order Items ({result.items.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr><th className="text-left p-3 text-sm">Item</th><th className="text-center p-3 text-sm">Qty</th><th className="text-center p-3 text-sm">Verified</th><th className="text-center p-3 text-sm">Condition</th><th className="text-left p-3 text-sm">Notes</th></tr></thead>
              <tbody>
                {result.items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="text-center p-3">{item.quantity}</td>
                    <td className="text-center p-3">{item.verified ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}</td>
                    <td className="text-center p-3">{item.damaged ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Damaged</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Good</span>}</td>
                    <td className="p-3 text-sm text-gray-500">{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><History className="h-5 w-5" /> Verification History</h2>
          <div className="text-center py-8 text-gray-400"><History className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No recent verifications</p><p className="text-sm">Start verifying parcels to see history</p></div>
        </div>
      )}
    </div>
  );
}
