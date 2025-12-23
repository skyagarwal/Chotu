'use client';

import { useState } from 'react';
import { Upload, CheckCircle2, XCircle, AlertCircle, Camera } from 'lucide-react';
import Image from 'next/image';

type DetectionBox = Record<string, number>;
type RawDetection = Record<string, unknown>;

interface PPEResult {
  isCompliant: boolean;
  helmet: {
    detected: boolean;
    confidence: number;
    bbox?: DetectionBox;
  };
  uniform: {
    detected: boolean;
    color: string;
    confidence: number;
    hasLogo: boolean;
    bbox?: DetectionBox;
  };
  bag: {
    detected: boolean;
    confidence: number;
    bbox?: DetectionBox;
  };
  violations: string[];
  rawDetections?: RawDetection[];
}

interface VisionResult {
  faceRecognition?: {
    identified: boolean;
    employeeId?: string;
    name?: string;
    confidence?: number;
  };
  ppeCompliance: PPEResult;
  overallCompliance: boolean;
  violations: string[];
  timestamp: string;
}

export default function RiderCompliancePage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError('');
    }
  };

  const handleCheck = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch('/api/vision/check-rider', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze image');
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
      console.error('Vision check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const ComplianceCard = ({ 
    title, 
    detected, 
    confidence, 
    icon: Icon 
  }: { 
    title: string; 
    detected: boolean; 
    confidence: number; 
    icon: React.ElementType;
  }) => (
    <div className={`p-4 rounded-lg border-2 ${
      detected 
        ? 'bg-green-50 border-green-300' 
        : 'bg-red-50 border-red-300'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={detected ? 'text-green-600' : 'text-red-600'} size={24} />
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">
              {detected ? 'Detected' : 'Not Detected'}
            </p>
          </div>
        </div>
        {detected ? (
          <CheckCircle2 className="text-green-600" size={32} />
        ) : (
          <XCircle className="text-red-600" size={32} />
        )}
      </div>
      {detected && (
        <div className="mt-2 text-sm text-gray-600">
          Confidence: {(confidence * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rider Compliance Checker</h1>
          <p className="text-gray-600 mt-1">
            Upload a rider photo to check helmet, uniform, and bag compliance
          </p>
        </div>
        <Camera className="text-blue-600" size={48} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Upload Rider Image</h2>
            
            {/* Image Preview */}
            {previewUrl ? (
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Upload className="mx-auto text-gray-400" size={48} />
                  <p className="text-gray-500 mt-2">No image selected</p>
                </div>
              </div>
            )}

            {/* File Input */}
            <div className="space-y-4">
              <label className="block">
                <span className="sr-only">Choose rider image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer"
                />
              </label>

              <button
                onClick={handleCheck}
                disabled={!selectedImage || loading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold
                  hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                  transition-colors duration-200"
              >
                {loading ? 'Analyzing...' : 'Check Compliance'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Compliance Results</h2>

            {!result ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="mx-auto mb-3 text-gray-400" size={48} />
                <p>Upload and analyze an image to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overall Status */}
                <div className={`p-4 rounded-lg ${
                  result.overallCompliance 
                    ? 'bg-green-100 border-2 border-green-400' 
                    : 'bg-red-100 border-2 border-red-400'
                }`}>
                  <div className="flex items-center gap-3">
                    {result.overallCompliance ? (
                      <CheckCircle2 className="text-green-700" size={32} />
                    ) : (
                      <XCircle className="text-red-700" size={32} />
                    )}
                    <div>
                      <h3 className="font-bold text-lg">
                        {result.overallCompliance ? 'Compliant' : 'Non-Compliant'}
                      </h3>
                      <p className="text-sm opacity-80">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Face Recognition */}
                {result.faceRecognition && (
                  <div className={`p-4 rounded-lg border-2 ${
                    result.faceRecognition.identified
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <Camera className={
                        result.faceRecognition.identified ? 'text-blue-600' : 'text-yellow-600'
                      } size={24} />
                      <div>
                        <h3 className="font-semibold">Face Recognition</h3>
                        {result.faceRecognition.identified ? (
                          <p className="text-sm">
                            {result.faceRecognition.name} ({result.faceRecognition.employeeId})
                            <br />
                            Confidence: {((result.faceRecognition.confidence || 0) * 100).toFixed(1)}%
                          </p>
                        ) : (
                          <p className="text-sm">Rider not identified</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PPE Components */}
                <ComplianceCard
                  title="Helmet"
                  detected={result.ppeCompliance.helmet.detected}
                  confidence={result.ppeCompliance.helmet.confidence}
                  icon={CheckCircle2}
                />

                <ComplianceCard
                  title="Uniform"
                  detected={result.ppeCompliance.uniform.detected}
                  confidence={result.ppeCompliance.uniform.confidence}
                  icon={CheckCircle2}
                />

                <ComplianceCard
                  title="Bag"
                  detected={result.ppeCompliance.bag.detected}
                  confidence={result.ppeCompliance.bag.confidence}
                  icon={CheckCircle2}
                />

                {/* Violations */}
                {result.violations.length > 0 && (
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2">Violations</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {result.violations.map((violation, idx) => (
                        <li key={idx} className="text-sm text-red-700">
                          {violation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
