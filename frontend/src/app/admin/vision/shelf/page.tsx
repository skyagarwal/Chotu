'use client';

import { useState, useRef, useCallback } from 'react';
import { Package, Upload, Camera, Layers, ImageIcon, Loader2, CheckCircle2, XCircle, AlertTriangle, BarChart3, RefreshCw, Store, Sparkles, TrendingUp, TrendingDown, AlertCircle, Eye } from 'lucide-react';

interface ShelfProduct {
  name: string;
  position: { row: number; column: number };
  quantity: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'misplaced';
  facings: number;
  priceTag?: { visible: boolean; correct: boolean; price?: number };
  brand?: string;
}

interface ShelfAnalysis {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  misplacedItems: number;
  planogramCompliance: number;
  shareOfShelf: { brand: string; percentage: number }[];
  products: ShelfProduct[];
  emptySpaces: { row: number; column: number; size: string }[];
  recommendations: string[];
  confidence: number;
}

export default function ShelfAnalyticsPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ShelfAnalysis | null>(null);
  const [error, setError] = useState<string>('');
  const [storeId, setStoreId] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [aisle, setAisle] = useState('');
  const [activeTab, setActiveTab] = useState('scan');
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
          const file = new File([blob], 'shelf-capture.jpg', { type: 'image/jpeg' });
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

  const analyzeShelf = async () => {
    if (!selectedImage) { setError('Please select an image first'); return; }
    setIsAnalyzing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (storeId) formData.append('storeId', storeId);
      if (shelfLocation) formData.append('shelfLocation', shelfLocation);
      if (aisle) formData.append('aisle', aisle);

      const response = await fetch('/api/vision/shelf/scan', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      setResult(data);
    } catch { setError('Failed to analyze shelf. Please try again.'); } finally { setIsAnalyzing(false); }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'in-stock': 'bg-green-100 text-green-700',
      'low-stock': 'bg-yellow-100 text-yellow-700',
      'out-of-stock': 'bg-red-100 text-red-700',
      'misplaced': 'bg-purple-100 text-purple-700'
    };
    return <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || 'bg-gray-100'}`}>{status.replace('-', ' ')}</span>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-8 w-8 text-blue-500" />
            Shelf Analytics
          </h1>
          <p className="text-gray-500 mt-1">AI-powered shelf monitoring & inventory analysis</p>
        </div>
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1"><Sparkles className="h-3 w-3" /> Computer Vision</span>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {['scan', 'inventory', 'alerts', 'analytics'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {tab === 'scan' && <Eye className="inline h-4 w-4 mr-2" />}
            {tab === 'inventory' && <Package className="inline h-4 w-4 mr-2" />}
            {tab === 'alerts' && <AlertCircle className="inline h-4 w-4 mr-2" />}
            {tab === 'analytics' && <BarChart3 className="inline h-4 w-4 mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Shelf Image</h2>

            <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[300px] flex items-center justify-center bg-gray-50">
              {isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="max-h-[280px] rounded-lg" />
              ) : imagePreview ? (
                <img src={imagePreview} alt="Shelf preview" className="max-h-[280px] rounded-lg object-contain" />
              ) : (
                <div className="text-gray-400"><Layers className="h-16 w-16 mx-auto mb-4 opacity-50" /><p>No image selected</p></div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload
              </button>
              {isCameraActive ? (
                <>
                  <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2" onClick={capturePhoto}><Camera className="h-4 w-4" /> Capture</button>
                  <button className="px-4 py-2 border rounded-lg" onClick={stopCamera}><XCircle className="h-4 w-4" /></button>
                </>
              ) : (
                <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={startCamera}><Camera className="h-4 w-4" /> Camera</button>
              )}
            </div>

            <div className="space-y-4 pt-4 mt-4 border-t">
              <div>
                <label className="block text-sm font-medium mb-1">Store ID</label>
                <input type="text" placeholder="e.g., STR-001" value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Shelf Location</label>
                  <input type="text" placeholder="Aisle 3, Shelf 2" value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Aisle Category</label>
                  <select value={aisle} onChange={(e) => setAisle(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select aisle</option>
                    <option value="beverages">Beverages</option>
                    <option value="snacks">Snacks</option>
                    <option value="dairy">Dairy</option>
                    <option value="frozen">Frozen</option>
                    <option value="produce">Produce</option>
                  </select>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2" onClick={analyzeShelf} disabled={!selectedImage || isAnalyzing}>
              {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Eye className="h-4 w-4" /> Analyze Shelf</>}
            </button>

            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-500" /> Analysis Results</h2>
            {result ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{result.inStock}</div><div className="text-xs text-gray-500">In Stock</div></div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center"><div className="text-2xl font-bold text-yellow-600">{result.lowStock}</div><div className="text-xs text-gray-500">Low Stock</div></div>
                  <div className="p-3 bg-red-50 rounded-lg text-center"><div className="text-2xl font-bold text-red-600">{result.outOfStock}</div><div className="text-xs text-gray-500">Out of Stock</div></div>
                  <div className="p-3 bg-purple-50 rounded-lg text-center"><div className="text-2xl font-bold text-purple-600">{result.misplacedItems}</div><div className="text-xs text-gray-500">Misplaced</div></div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-sm font-medium">Planogram Compliance</span><span className={result.planogramCompliance >= 80 ? 'text-green-500' : 'text-yellow-500'}>{result.planogramCompliance}%</span></div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${result.planogramCompliance >= 80 ? 'bg-green-500' : 'bg-yellow-500'} rounded-full`} style={{ width: `${result.planogramCompliance}%` }} /></div>
                </div>

                {result.shareOfShelf && result.shareOfShelf.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Share of Shelf</h4>
                    {result.shareOfShelf.slice(0, 5).map((brand, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs w-24 truncate">{brand.brand}</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${brand.percentage}%` }} /></div>
                        <span className="text-xs font-mono w-12 text-right">{brand.percentage}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.emptySpaces && result.emptySpaces.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /><strong>{result.emptySpaces.length} empty spaces</strong> detected</div>
                )}

                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Recommendations</h4>
                    <ul className="space-y-1">{result.recommendations.map((rec, index) => <li key={index} className="text-sm text-gray-600 flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />{rec}</li>)}</ul>
                  </div>
                )}

                <div className="text-xs text-gray-500 text-center pt-2 border-t">Confidence: {Math.round(result.confidence * 100)}%</div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400"><Layers className="h-16 w-16 mx-auto mb-4 opacity-30" /><p>Upload a shelf image and click analyze</p></div>
            )}
          </div>
        </div>
      )}

      {result && result.products && result.products.length > 0 && activeTab === 'scan' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Package className="h-5 w-5" /> Detected Products ({result.products.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr><th className="text-left p-3 text-sm">Product</th><th className="text-center p-3 text-sm">Position</th><th className="text-center p-3 text-sm">Qty</th><th className="text-center p-3 text-sm">Facings</th><th className="p-3 text-sm">Status</th><th className="p-3 text-sm">Price Tag</th></tr></thead>
              <tbody>
                {result.products.map((product, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3"><p className="font-medium">{product.name}</p>{product.brand && <p className="text-xs text-gray-500">{product.brand}</p>}</td>
                    <td className="text-center p-3 text-sm">R{product.position.row} C{product.position.column}</td>
                    <td className="text-center p-3">{product.quantity}</td>
                    <td className="text-center p-3">{product.facings}</td>
                    <td className="p-3">{getStatusBadge(product.status)}</td>
                    <td className="p-3">
                      {product.priceTag ? (
                        <div className="flex items-center gap-1">
                          {product.priceTag.visible ? (product.priceTag.correct ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />) : <XCircle className="h-4 w-4 text-red-500" />}
                          {product.priceTag.price && <span className="text-xs">₹{product.priceTag.price}</span>}
                        </div>
                      ) : <span className="text-xs text-gray-400">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && <div className="bg-white rounded-lg shadow-md p-6"><h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Package className="h-5 w-5" /> Inventory Overview</h2><div className="text-center py-8 text-gray-400"><Package className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Scan shelves to populate inventory data</p></div></div>}
      {activeTab === 'alerts' && <div className="bg-white rounded-lg shadow-md p-6"><h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-yellow-500" /> Stock Alerts</h2><div className="text-center py-8 text-gray-400"><CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-green-500" /><p>No stock alerts at the moment</p></div></div>}
      {activeTab === 'analytics' && <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white rounded-lg shadow-md p-6"><h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /> Best Performers</h2><div className="text-center py-8 text-gray-400"><BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Scan more shelves to see analytics</p></div></div><div className="bg-white rounded-lg shadow-md p-6"><h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /> Needs Attention</h2><div className="text-center py-8 text-gray-400"><BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Scan more shelves to see analytics</p></div></div></div>}
    </div>
  );
}
