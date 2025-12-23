'use client';

import { useState, useRef, useCallback } from 'react';
import {
  UtensilsCrossed,
  Upload,
  Camera,
  Leaf,
  ThermometerSun,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Star,
  Scale,
  Clock,
  ImageIcon
} from 'lucide-react';

interface QualityResult {
  freshness: {
    score: number;
    status: 'fresh' | 'good' | 'warning' | 'spoiled';
    indicators: string[];
  };
  presentation: {
    score: number;
    plating: string;
    garnishing: string;
    colorBalance: string;
  };
  portion: {
    estimated: string;
    adequate: boolean;
    comparison: string;
  };
  hygiene: {
    score: number;
    issues: string[];
    containerClean: boolean;
  };
  packaging?: {
    sealed: boolean;
    damage: string[];
    labeling: boolean;
  };
  overallScore: number;
  recommendation: string;
  dishIdentified?: string;
  confidence: number;
}

export default function FoodQualityPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<QualityResult | null>(null);
  const [error, setError] = useState<string>('');
  const [dishName, setDishName] = useState('');
  const [portionSize, setPortionSize] = useState('regular');
  const [checkPackaging, setCheckPackaging] = useState(false);
  const [activeTab, setActiveTab] = useState('analyze');
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch {
      setError('Could not access camera');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'food-capture.jpg', { type: 'image/jpeg' });
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

  const analyzeFood = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (dishName) formData.append('dishName', dishName);
      formData.append('expectedPortionSize', portionSize);
      formData.append('checkPackaging', String(checkPackaging));

      const response = await fetch('/api/vision/food-quality/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      setResult(data);
    } catch {
      setError('Failed to analyze food quality. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getFreshnessIcon = (status: string) => {
    switch (status) {
      case 'fresh': return <Leaf className="h-5 w-5 text-green-500" />;
      case 'good': return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'spoiled': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="h-8 w-8 text-orange-500" />
            Food Quality Analysis
          </h1>
          <p className="text-gray-500 mt-1">AI-powered food freshness, presentation & hygiene analysis</p>
        </div>
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">Powered by Vision AI</span>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {['analyze', 'freshness', 'hygiene'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {tab === 'analyze' && <Eye className="inline h-4 w-4 mr-2" />}
            {tab === 'freshness' && <Leaf className="inline h-4 w-4 mr-2" />}
            {tab === 'hygiene' && <ThermometerSun className="inline h-4 w-4 mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'analyze' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Food Image
            </h2>

            <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[300px] flex items-center justify-center bg-gray-50">
              {isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="max-h-[280px] rounded-lg" />
              ) : imagePreview ? (
                <img src={imagePreview} alt="Food preview" className="max-h-[280px] rounded-lg object-contain" />
              ) : (
                <div className="text-gray-400">
                  <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No image selected</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload
              </button>
              {isCameraActive ? (
                <>
                  <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2" onClick={capturePhoto}>
                    <Camera className="h-4 w-4" /> Capture
                  </button>
                  <button className="px-4 py-2 border rounded-lg" onClick={stopCamera}><XCircle className="h-4 w-4" /></button>
                </>
              ) : (
                <button className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2" onClick={startCamera}>
                  <Camera className="h-4 w-4" /> Camera
                </button>
              )}
            </div>

            <div className="space-y-4 pt-4 mt-4 border-t">
              <div>
                <label className="block text-sm font-medium mb-1">Dish Name (Optional)</label>
                <input type="text" placeholder="e.g., Chicken Biryani" value={dishName} onChange={(e) => setDishName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expected Portion Size</label>
                <div className="flex gap-2">
                  {['small', 'regular', 'large'].map((size) => (
                    <button key={size} onClick={() => setPortionSize(size)} className={`flex-1 px-3 py-2 rounded-lg border capitalize ${portionSize === size ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Check Packaging</label>
                  <p className="text-xs text-gray-500">Analyze container quality</p>
                </div>
                <button onClick={() => setCheckPackaging(!checkPackaging)} className={`w-12 h-6 rounded-full ${checkPackaging ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transform ${checkPackaging ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2" onClick={analyzeFood} disabled={!selectedImage || isAnalyzing}>
              {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Eye className="h-4 w-4" /> Analyze Food Quality</>}
            </button>

            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> Results</h2>
            {result ? (
              <div className="space-y-6">
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <div className={`text-5xl font-bold ${getScoreColor(result.overallScore)}`}>{result.overallScore}</div>
                  <p className="text-sm text-gray-500 mt-1">Overall Quality Score</p>
                  <span className={`inline-block mt-2 px-3 py-1 ${getScoreBg(result.overallScore)} text-white rounded-full text-sm`}>
                    {result.overallScore >= 80 ? 'Excellent' : result.overallScore >= 60 ? 'Good' : result.overallScore >= 40 ? 'Fair' : 'Poor'}
                  </span>
                  {result.dishIdentified && <p className="mt-2 text-sm">Identified: <span className="font-medium">{result.dishIdentified}</span></p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">{getFreshnessIcon(result.freshness.status)} Freshness</span>
                    <span className={getScoreColor(result.freshness.score)}>{result.freshness.score}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${getScoreBg(result.freshness.score)} rounded-full`} style={{ width: `${result.freshness.score}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> Presentation</span>
                    <span className={getScoreColor(result.presentation.score)}>{result.presentation.score}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${getScoreBg(result.presentation.score)} rounded-full`} style={{ width: `${result.presentation.score}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Scale className="h-4 w-4 text-blue-500" /> Portion Size</span>
                  <span className={`px-2 py-1 rounded text-sm ${result.portion.adequate ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{result.portion.estimated}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><ThermometerSun className="h-4 w-4 text-purple-500" /> Hygiene</span>
                    <span className={getScoreColor(result.hygiene.score)}>{result.hygiene.score}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${getScoreBg(result.hygiene.score)} rounded-full`} style={{ width: `${result.hygiene.score}%` }} />
                  </div>
                </div>

                {result.packaging && (
                  <div className="space-y-2 pt-2 border-t">
                    <span className="flex items-center gap-2 font-medium"><Package className="h-4 w-4" /> Packaging</span>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">{result.packaging.sealed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />} Sealed</div>
                      <div className="flex items-center gap-1">{result.packaging.labeling ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />} Labeled</div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <strong>Recommendation:</strong> {result.recommendation}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Upload a food image and click analyze</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'freshness' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Leaf className="h-5 w-5 text-green-500" /> Freshness Detection</h2>
          <div className="text-center py-8 text-gray-400">
            <Clock className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>Upload food image in the Analyze tab</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Mold growth', 'Discoloration', 'Wilting', 'Texture changes'].map((item) => (
                <span key={item} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{item}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hygiene' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ThermometerSun className="h-5 w-5 text-purple-500" /> Kitchen Hygiene</h2>
          <div className="text-center py-8 text-gray-400">
            <ThermometerSun className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>Capture kitchen/prep area images</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Clean surfaces', 'Proper storage', 'PPE compliance', 'Temperature zones'].map((item) => (
                <span key={item} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{item}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
