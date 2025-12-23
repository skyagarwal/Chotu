export class ImageAnalysisResultDto {
  imageUrl?: string;
  width?: number;
  height?: number;
  
  objects?: Array<{
    class: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;

  labels?: Array<{
    label: string;
    confidence: number;
  }>;

  text?: Array<{
    text: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;

  faces?: Array<{
    id: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
    landmarks?: any;
    recognized?: boolean;
    personId?: string;
    personName?: string;
  }>;

  ppe?: {
    helmet: boolean;
    vest: boolean;
    gloves: boolean;
    boots: boolean;
    mask: boolean;
    overallCompliance: boolean;
    confidence: number;
  };

  quality?: {
    brightness: number;
    contrast: number;
    sharpness: number;
    overall: number;
  };

  processingTime: number; // milliseconds
  model: string;
}
