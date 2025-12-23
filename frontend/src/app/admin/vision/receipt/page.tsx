'use client';

import { useState, useRef, useCallback } from 'react';
import { Receipt, Upload, Camera, ScanLine, FileText, Loader2, CheckCircle2, XCircle, Calendar, Store, ShoppingCart, Download, Copy, Sparkles, TrendingUp, Clock, AlertTriangle, IndianRupee } from 'lucide-react';

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  catalogMatch?: { id: string; name: string; confidence: number };
}

interface ReceiptResult {
  merchantName: string;
  merchantAddress?: string;
  date: string;
  time?: string;
  receiptNumber?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  currency: string;
  confidence: number;
}

export default function ReceiptScannerPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [error, setError] = useState<string>('');
  const [matchCatalog, setMatchCatalog] = useState(false);
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
          const file = new File([blob], 'receipt-capture.jpg', { type: 'image/jpeg' });
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

  const scanReceipt = async () => {
    if (!selectedImage) { setError('Please select an image first'); return; }
    setIsScanning(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('matchCatalog', String(matchCatalog));

      const response = await fetch('/api/vision/receipt/scan', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Scan failed');
      const data = await response.json();
      setResult(data);
    } catch { setError('Failed to scan receipt. Please try again.'); } finally { setIsScanning(false); }
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `Receipt from ${result.merchantName}\nDate: ${result.date}\n---\n${result.items.map(item => `${item.name} x${item.quantity} - ₹${item.totalPrice}`).join('\n')}\n---\nTotal: ₹${result.total}`;
    navigator.clipboard.writeText(text);
  };

  const exportAsJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${result.date}.json`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8 text-green-500" />
            Receipt Scanner
          </h1>
          <p className="text-gray-500 mt-1">AI-powered receipt scanning & expense tracking</p>
        </div>
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1"><Sparkles className="h-3 w-3" /> Smart OCR</span>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {['scan', 'history', 'analytics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {tab === 'scan' && <ScanLine className="inline h-4 w-4 mr-2" />}
            {tab === 'history' && <Clock className="inline h-4 w-4 mr-2" />}
            {tab === 'analytics' && <TrendingUp className="inline h-4 w-4 mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><FileText className="h-5 w-5" /> Receipt Image</h2>

            <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[350px] flex items-center justify-center bg-gray-50">
              {isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="max-h-[330px] rounded-lg" />
              ) : imagePreview ? (
                <img src={imagePreview} alt="Receipt preview" className="max-h-[330px] rounded-lg object-contain" />
              ) : (
                <div className="text-gray-400">
                  <Receipt className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No receipt image selected</p>
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

            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <div>
                <label className="font-medium">Match with Product Catalog</label>
                <p className="text-xs text-gray-500">Link items to your product database</p>
              </div>
              <button onClick={() => setMatchCatalog(!matchCatalog)} className={`w-12 h-6 rounded-full ${matchCatalog ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transform ${matchCatalog ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <button className="w-full mt-4 px-4 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2" onClick={scanReceipt} disabled={!selectedImage || isScanning}>
              {isScanning ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</> : <><ScanLine className="h-4 w-4" /> Scan Receipt</>}
            </button>

            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-green-500" /> Extracted Data</h2>
              {result && (
                <div className="flex gap-2">
                  <button className="p-2 border rounded hover:bg-gray-50" onClick={copyToClipboard}><Copy className="h-4 w-4" /></button>
                  <button className="p-2 border rounded hover:bg-gray-50" onClick={exportAsJSON}><Download className="h-4 w-4" /></button>
                </div>
              )}
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2"><Store className="h-5 w-5" />{result.merchantName}</h3>
                      {result.merchantAddress && <p className="text-sm text-gray-500">{result.merchantAddress}</p>}
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{Math.round(result.confidence * 100)}% confident</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{result.date} {result.time}</span>
                    {result.receiptNumber && <span>#{result.receiptNumber}</span>}
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm">Item</th>
                        <th className="text-center p-3 text-sm">Qty</th>
                        <th className="text-right p-3 text-sm">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">
                            <p className="font-medium">{item.name}</p>
                            {item.catalogMatch && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs mt-1">
                                <CheckCircle2 className="h-3 w-3" /> Matched: {item.catalogMatch.name}
                              </span>
                            )}
                          </td>
                          <td className="text-center p-3">x{item.quantity}</td>
                          <td className="text-right p-3 font-mono">₹{item.totalPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-mono">₹{result.subtotal}</span></div>
                  {result.tax !== undefined && <div className="flex justify-between text-sm"><span>Tax</span><span className="font-mono">₹{result.tax}</span></div>}
                  {result.discount !== undefined && result.discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span className="font-mono">-₹{result.discount}</span></div>}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="flex items-center"><IndianRupee className="h-5 w-5" />{result.total}</span>
                  </div>
                  {result.paymentMethod && <div className="text-xs text-gray-500 text-right">Paid via {result.paymentMethod}</div>}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Receipt className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Upload a receipt image and click scan</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Clock className="h-5 w-5" /> Recent Receipts</h2>
          <div className="text-center py-8 text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No receipts scanned yet</p>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Spending Analytics</h2>
          <div className="text-center py-8 text-gray-400">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Scan receipts to see spending analytics</p>
          </div>
        </div>
      )}
    </div>
  );
}
