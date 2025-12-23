import { useState, useRef, useCallback, useEffect } from 'react';

export interface CameraConstraints {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
}

export interface CameraHookReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  stream: MediaStream | null;
  isStreaming: boolean;
  error: string | null;
  isMobile: boolean;
  startCamera: (constraints?: Partial<CameraConstraints>) => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  switchCamera: () => Promise<void>;
}

const DEFAULT_CONSTRAINTS: CameraConstraints = {
  width: 1280,
  height: 720,
  facingMode: 'user',
};

export function useCamera(): CameraHookReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  // Detect if running on mobile (computed once)
  const [isMobile] = useState(() => 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  const startCamera = useCallback(async (constraints?: Partial<CameraConstraints>) => {
    try {
      setError(null);
      
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mergedConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
      
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: mergedConstraints.width },
          height: { ideal: mergedConstraints.height },
          facingMode: mergedConstraints.facingMode,
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Set play attributes before playing
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        try {
          // Wait for video to be ready before playing
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video element not available'));
              return;
            }
            
            const video = videoRef.current;
            
            const onLoadedMetadata = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              resolve();
            };
            
            const onError = () => {
              video.removeEventListener('error', onError);
              reject(new Error('Video failed to load'));
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            
            // If metadata is already loaded
            if (video.readyState >= 1) {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve();
            }
          });
          
          // Now play the video
          const playPromise = videoRef.current.play();
          
          if (playPromise !== undefined) {
            await playPromise.catch(err => {
              // Ignore AbortError - it's normal when quickly switching cameras
              if (err.name !== 'AbortError') {
                throw err;
              }
            });
          }
          
          setStream(mediaStream);
          setIsStreaming(true);
        } catch (playErr) {
          console.warn('Video play error (non-critical):', playErr);
          // Still set streaming as true since we have the stream
          setStream(mediaStream);
          setIsStreaming(true);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      setIsStreaming(false);
      console.error('Camera error:', err);
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [isStreaming]);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    await startCamera({ facingMode: newFacingMode });
  }, [facingMode, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    canvasRef,
    stream,
    isStreaming,
    error,
    isMobile,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  };
}
