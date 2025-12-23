'use client';

import { useState, useRef, useCallback } from 'react';
import { Search, Upload, Camera, ShoppingBag, ImageIcon, Loader2, Star, MapPin, Package, Store, Sparkles, Grid, List, ExternalLink, XCircle, AlertTriangle, IndianRupee } from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  similarity: number;
  category: string;
  brand?: string;
  store?: { name: string; distance?: string; rating?: number };
  inStock: boolean;
}

interface VisualSearchResponse {
  query: { description: string; category: string; attributes: Record<string, string> };
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  embeddingUsed: boolean;
}

export default function VisualSearchPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [response, setResponse] = useState<VisualSearchResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [module, setModule] = useState<'food' | 'ecom' | 'all'>('all');
  const [maxResults, setMaxResults] = useState(10);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResponse(null);
      setError('');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResponse(null);
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
          const file = new File([blob], 'search-capture.jpg', { type: 'image/jpeg' });
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

  const searchByImage = async () => {
    if (!selectedImage) { setError('Please select an image first'); return; }
    setIsSearching(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('module', module);
      formData.append('maxResults', String(maxResults));
      formData.append('useEmbedding', 'true');

      const res = await fetch('/api/vision/visual-search/by-image', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResponse(data);
    } catch { setError('Search failed. Please try again.'); } finally { setIsSearching(false); }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Search className="h-8 w-8 text-purple-500" />
            Visual Search
          </h1>
          <p className="text-gray-500 mt-1">&quot;I want to buy this&quot; - Search products by image</p>
        </div>
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> AI-Powered
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Search by Image</h2>

          <div
            className="border-2 border-dashed rounded-lg p-4 text-center min-h-[200px] flex items-center justify-center bg-gray-50 cursor-pointer hover:border-blue-300"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !isCameraActive && fileInputRef.current?.click()}
          >
            {isCameraActive ? (
              <video ref={videoRef} autoPlay playsInline className="max-h-[180px] rounded-lg" />
            ) : imagePreview ? (
              <img src={imagePreview} alt="Search preview" className="max-h-[180px] rounded-lg object-contain" />
            ) : (
              <div className="text-gray-400">
                <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Drop image here</p>
                <p className="text-sm">or click to upload</p>
              </div>
            )}
          </div>

          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />

          <div className="flex gap-2 mt-4">
            {isCameraActive ? (
              <>
                <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2" onClick={capturePhoto}>
                  <Camera className="h-4 w-4" /> Capture
                </button>
                <button className="px-4 py-2 border rounded-lg" onClick={stopCamera}>Cancel</button>
              </>
            ) : (
              <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={startCamera}>
                <Camera className="h-4 w-4" /> Use Camera
              </button>
            )}
          </div>

          <div className="space-y-4 pt-4 mt-4 border-t">
            <div>
              <label className="block text-sm font-medium mb-1">Search Category</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value as 'food' | 'ecom' | 'all')}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Products</option>
                <option value="food">Food & Groceries</option>
                <option value="ecom">E-commerce</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Results: {maxResults}</label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <button
            className="w-full mt-4 px-4 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2"
            onClick={searchByImage}
            disabled={!selectedImage || isSearching}
          >
            {isSearching ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</> : <><Search className="h-4 w-4" /> Find Similar Products</>}
          </button>

          {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {response ? (
            <>
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">AI Identified:</h3>
                    <p className="text-lg">{response.query.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">{response.query.category}</span>
                      {Object.entries(response.query.attributes || {}).map(([key, value]) => (
                        <span key={key} className="px-2 py-1 bg-gray-50 border rounded text-xs">{key}: {value}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{response.totalResults} results</p>
                    <p>{response.searchTime}ms</p>
                    {response.embeddingUsed && <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs mt-1"><Sparkles className="h-3 w-3" />Semantic</span>}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}><Grid className="h-4 w-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}><List className="h-4 w-4" /></button>
              </div>

              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-3'}>
                {response.results.map((result) => (
                  <div key={result.id} className={`bg-white rounded-lg shadow overflow-hidden ${viewMode === 'list' ? 'flex' : ''}`}>
                    <div className={viewMode === 'list' ? 'w-32 h-32 flex-shrink-0' : 'aspect-square'}>
                      <img src={result.image || '/placeholder-product.png'} alt={result.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-sm line-clamp-2">{result.name}</h4>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs ml-2">{Math.round(result.similarity * 100)}%</span>
                      </div>
                      {result.brand && <p className="text-xs text-gray-500">{result.brand}</p>}
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="font-bold text-lg flex items-center"><IndianRupee className="h-4 w-4" />{result.price}</span>
                        {result.originalPrice && result.originalPrice > result.price && <span className="text-sm text-gray-400 line-through">₹{result.originalPrice}</span>}
                      </div>
                      {result.store && viewMode === 'list' && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Store className="h-3 w-3" />{result.store.name}
                          {result.store.distance && <><MapPin className="h-3 w-3 ml-2" />{result.store.distance}</>}
                          {result.store.rating && <span className="flex items-center"><Star className="h-3 w-3 text-yellow-500 ml-2" />{result.store.rating}</span>}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${result.inStock ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {result.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <button className="px-2 py-1 border rounded text-xs flex items-center gap-1">View<ExternalLink className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md min-h-[400px] flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h3 className="font-medium text-lg">Visual Product Search</h3>
                <p className="text-sm mt-1">Upload a product image to find similar items</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-sm mx-auto">
                  {['🍕 Food Items', '👕 Clothing', '📱 Electronics', '🏠 Home Decor', '💄 Beauty'].map((item) => (
                    <span key={item} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
