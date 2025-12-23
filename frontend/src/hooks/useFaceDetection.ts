import { useState, useCallback } from 'react';

export interface QualityCheckResult {
  isValid: boolean;
  brightness: number;
  sharpness: number;
  hasFace: boolean;
  warnings: string[];
}

export interface FaceDetectionHookReturn {
  checkImageQuality: (imageData: string) => Promise<QualityCheckResult>;
  isChecking: boolean;
}

export function useFaceDetection(): FaceDetectionHookReturn {
  const [isChecking, setIsChecking] = useState(false);

  const checkImageQuality = useCallback(async (imageData: string): Promise<QualityCheckResult> => {
    setIsChecking(true);
    
    try {
      // Create an image element to analyze
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageData;
      });

      // Create canvas for analysis
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      ctx.drawImage(img, 0, 0);
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;

      // Calculate brightness (average luminance)
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Calculate perceived brightness using standard formula
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
        totalBrightness += brightness;
      }
      const avgBrightness = totalBrightness / (data.length / 4);
      const brightnessScore = avgBrightness / 255; // Normalize to 0-1

      // Calculate sharpness using Tenengrad variance (industry standard)
      // This works reliably on both webcam and mobile cameras
      let sobelSum = 0;
      let pixelCount = 0;
      
      // Apply Sobel operator for edge detection
      for (let y = 1; y < canvas.height - 1; y += 4) { // Sample every 4 pixels for performance
        for (let x = 1; x < canvas.width - 1; x += 4) {
          const idx = (y * canvas.width + x) * 4;
          
          // Convert to grayscale using luminance formula
          const getGray = (offset: number) => 
            0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
          
          // Get 3x3 neighborhood
          const p0 = getGray(idx - canvas.width * 4 - 4);
          const p1 = getGray(idx - canvas.width * 4);
          const p2 = getGray(idx - canvas.width * 4 + 4);
          const p3 = getGray(idx - 4);
          const p5 = getGray(idx + 4);
          const p6 = getGray(idx + canvas.width * 4 - 4);
          const p7 = getGray(idx + canvas.width * 4);
          const p8 = getGray(idx + canvas.width * 4 + 4);
          
          // Sobel X and Y gradients
          const gx = -p0 + p2 - 2*p3 + 2*p5 - p6 + p8;
          const gy = -p0 - 2*p1 - p2 + p6 + 2*p7 + p8;
          
          // Gradient magnitude
          const magnitude = Math.sqrt(gx * gx + gy * gy);
          sobelSum += magnitude;
          pixelCount++;
        }
      }
      
      const avgSobel = sobelSum / pixelCount;
      
      // Normalize to 0-100% based on empirical ranges
      // Works for both webcam (lower quality) and mobile (higher quality)
      const sharpnessScore = Math.min(avgSobel / 30, 1); // Cap at 100%

      // Simple face detection: check for skin tones in center region
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      const regionSize = Math.min(canvas.width, canvas.height) / 4;
      
      let skinTonePixels = 0;
      let totalPixels = 0;
      
      for (let y = centerY - regionSize; y < centerY + regionSize; y += 5) {
        for (let x = centerX - regionSize; x < centerX + regionSize; x += 5) {
          if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Simple skin tone detection (heuristic)
            const isSkinTone = r > 95 && g > 40 && b > 20 &&
                              r > g && r > b &&
                              Math.abs(r - g) > 15;
            
            if (isSkinTone) skinTonePixels++;
            totalPixels++;
          }
        }
      }
      
      const skinRatio = skinTonePixels / totalPixels;
      const hasFace = skinRatio > 0.3; // At least 30% skin tone in center

      // Validate and generate warnings
      const warnings: string[] = [];
      let isValid = true;

      // Brightness checks
      if (brightnessScore < 0.3) {
        warnings.push('Too dark - increase lighting');
        isValid = false;
      } else if (brightnessScore > 0.85) {
        warnings.push('Too bright - reduce lighting or move away from direct light');
        isValid = false;
      } else if (brightnessScore < 0.4) {
        warnings.push('Lighting could be better');
      }

      // Sharpness checks - lenient for enrollment purposes
      if (sharpnessScore < 0.15) {
        warnings.push('Image too blurry - hold phone steady');
        isValid = false;
      } else if (sharpnessScore < 0.3) {
        warnings.push('Image could be sharper - try to hold steady');
      }

      // Face detection
      if (!hasFace) {
        warnings.push('Face not detected in frame - center your face');
        isValid = false;
      }

      return {
        isValid,
        brightness: Math.round(brightnessScore * 100),
        sharpness: Math.round(sharpnessScore * 100),
        hasFace,
        warnings,
      };
    } catch (error) {
      console.error('Quality check error:', error);
      return {
        isValid: false,
        brightness: 0,
        sharpness: 0,
        hasFace: false,
        warnings: ['Failed to analyze image quality'],
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkImageQuality,
    isChecking,
  };
}
