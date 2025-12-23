'use client';

import { useState, useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useFaceDetection, QualityCheckResult } from '@/hooks/useFaceDetection';
import { Camera, CheckCircle2, XCircle, AlertTriangle, RotateCw, Sun, Focus } from 'lucide-react';

export type FacePosition = 'front' | 'left' | 'right';

export interface CapturedPhoto {
  position: FacePosition;
  dataUrl: string;
  quality: QualityCheckResult;
  timestamp: number;
}

interface GuidedFaceCaptureProps {
  onPhotosComplete: (photos: CapturedPhoto[]) => void;
  onCancel?: () => void;
  requiredPositions?: FacePosition[];
}

const POSITION_INSTRUCTIONS = {
  front: {
    title: 'Face Forward',
    instruction: 'Look straight at the camera',
    icon: '👤',
  },
  left: {
    title: 'Turn Left',
    instruction: 'Turn your face to the left (your left)',
    icon: '👈',
  },
  right: {
    title: 'Turn Right',
    instruction: 'Turn your face to the right (your right)',
    icon: '👉',
  },
};

export default function GuidedFaceCapture({
  onPhotosComplete,
  onCancel,
  requiredPositions = ['front', 'left', 'right'],
}: GuidedFaceCaptureProps) {
  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    isMobile,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  } = useCamera();

  const { checkImageQuality, isChecking } = useFaceDetection();

  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [liveQuality, setLiveQuality] = useState<QualityCheckResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const currentPosition = requiredPositions[currentPositionIndex];
  const isComplete = capturedPhotos.length === requiredPositions.length;

  // Start camera on mount with retry logic
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const initCamera = async () => {
      if (!mounted) return;
      
      try {
        await startCamera();
      } catch (err) {
        console.error('Camera initialization error:', err);
        
        // Retry after a short delay
        if (retryCount < maxRetries && mounted) {
          retryCount++;
          setTimeout(() => {
            if (mounted) {
              initCamera();
            }
          }, 1000 * retryCount); // Exponential backoff
        }
      }
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      if (mounted) {
        initCamera();
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Live quality monitoring (every 2 seconds)
  useEffect(() => {
    if (!isStreaming || isCapturing) return;

    const interval = setInterval(async () => {
      const photo = capturePhoto();
      if (photo) {
        const quality = await checkImageQuality(photo);
        setLiveQuality(quality);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, capturePhoto, checkImageQuality, isCapturing]);

  const handleCapture = async () => {
    if (isCapturing || !isStreaming) return;

    setIsCapturing(true);
    
    // Countdown 3, 2, 1
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);

    // Capture photo
    const photoDataUrl = capturePhoto();
    if (!photoDataUrl) {
      setIsCapturing(false);
      return;
    }

    // Check quality
    const quality = await checkImageQuality(photoDataUrl);

    const photo: CapturedPhoto = {
      position: currentPosition,
      dataUrl: photoDataUrl,
      quality,
      timestamp: Date.now(),
    };

    // Check if quality is acceptable - must pass isValid from quality checks
    // isValid checks: brightness in range, minimum sharpness, face detected
    if (!quality.isValid) {
      // Show quality issues and allow retry
      setLiveQuality(quality);
      setIsCapturing(false);
      return;
    }

    // Photo accepted - add to collection
    setCapturedPhotos(prev => [...prev, photo]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);

    // Move to next position or complete
    if (currentPositionIndex < requiredPositions.length - 1) {
      setCurrentPositionIndex(prev => prev + 1);
      setLiveQuality(null);
    } else {
      // All photos captured
      const allPhotos = [...capturedPhotos, photo];
      setTimeout(() => {
        stopCamera();
        onPhotosComplete(allPhotos);
      }, 1500);
    }

    setIsCapturing(false);
  };

  const handleRetake = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    setCurrentPositionIndex(index);
    setLiveQuality(null);
  };

  const handleCancel = () => {
    stopCamera();
    onCancel?.();
  };

  if (cameraError) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Camera Access Error</h2>
          <p className="text-gray-600 mb-6">{cameraError}</p>
          <div className="space-y-2 text-sm text-gray-700 mb-6">
            <p>Please ensure:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Camera permissions are granted in browser settings</li>
              <li>No other application is using the camera</li>
              <li>Your device has a working camera</li>
            </ul>
          </div>
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Photos Captured Successfully!</h2>
          <p className="text-gray-600 mb-6">
            All {capturedPhotos.length} photos have been captured with good quality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Photo Capture</h2>
            <p className="text-blue-100 text-sm">
              Step {currentPositionIndex + 1} of {requiredPositions.length}
            </p>
          </div>
          {isMobile && (
            <button
              onClick={switchCamera}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Switch Camera"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {requiredPositions.map((pos, idx) => (
              <div key={pos} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-1 ${
                    idx < currentPositionIndex
                      ? 'bg-green-500 text-white'
                      : idx === currentPositionIndex
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx < currentPositionIndex ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="text-xs text-gray-600 capitalize">{pos}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Camera Preview */}
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-[3/4]">
              {/* Video Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Countdown Overlay */}
              {countdown && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-8xl font-bold text-white animate-pulse">
                    {countdown}
                  </div>
                </div>
              )}

              {/* Success Overlay */}
              {showSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/50">
                  <CheckCircle2 className="w-24 h-24 text-white" />
                </div>
              )}

              {/* Face Oval Guide */}
              {!isCapturing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4/5 h-4/5 border-4 border-white/50 rounded-full" />
                </div>
              )}

              {/* Quality Indicators */}
              {liveQuality && !isCapturing && (
                <div className="absolute top-4 left-4 right-4 space-y-2">
                  <QualityIndicator
                    icon={<Sun className="w-4 h-4" />}
                    label="Lighting"
                    value={liveQuality.brightness}
                    isGood={liveQuality.brightness >= 30 && liveQuality.brightness <= 85}
                  />
                  <QualityIndicator
                    icon={<Focus className="w-4 h-4" />}
                    label="Sharpness"
                    value={liveQuality.sharpness}
                    isGood={liveQuality.sharpness >= 30}
                  />
                  <QualityIndicator
                    icon={<Camera className="w-4 h-4" />}
                    label="Face"
                    value={liveQuality.hasFace ? 100 : 0}
                    isGood={liveQuality.hasFace}
                  />
                </div>
              )}
            </div>

            {/* Capture Button */}
            <button
              onClick={handleCapture}
              disabled={isCapturing || isChecking || !isStreaming}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                isCapturing || isChecking || !isStreaming
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : liveQuality?.isValid
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isCapturing ? 'Capturing...' : isChecking ? 'Analyzing...' : 'Capture Photo'}
            </button>
          </div>

          {/* Instructions & Feedback */}
          <div className="space-y-4">
            {/* Current Position Instructions */}
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className="text-6xl mb-3">{POSITION_INSTRUCTIONS[currentPosition].icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {POSITION_INSTRUCTIONS[currentPosition].title}
              </h3>
              <p className="text-gray-700">
                {POSITION_INSTRUCTIONS[currentPosition].instruction}
              </p>
            </div>

            {/* Quality Warnings */}
            {liveQuality && liveQuality.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 mb-2">Quality Checks</h4>
                    <ul className="space-y-1 text-sm text-yellow-800">
                      {liveQuality.warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Tips for Best Results</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Ensure good, even lighting on your face</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Remove sunglasses, masks, or hats</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Hold phone steady at eye level</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Keep face within the oval guide</span>
                </li>
              </ul>
            </div>

            {/* Captured Photos Preview */}
            {capturedPhotos.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Captured Photos</h4>
                <div className="grid grid-cols-3 gap-2">
                  {capturedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.dataUrl}
                        alt={`${photo.position} view`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleRetake(idx)}
                        className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <RotateCw className="w-6 h-6 text-white" />
                      </button>
                      <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded text-center capitalize">
                        {photo.position}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface QualityIndicatorProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  isGood: boolean;
}

function QualityIndicator({ icon, label, value, isGood }: QualityIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm ${
      isGood ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
    }`}>
      {icon}
      <span className="text-sm font-medium flex-1">{label}</span>
      <span className="text-sm font-bold">{value}%</span>
    </div>
  );
}
