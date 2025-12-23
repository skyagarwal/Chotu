import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class MultiCameraTrackingDto {
  @IsArray()
  cameraIds: string[];

  @IsOptional()
  @IsNumber()
  trackingDuration?: number = 60; // seconds

  @IsOptional()
  @IsString()
  personId?: string; // If tracking specific person

  @IsOptional()
  zones?: Array<{
    zoneId: string;
    zoneName: string;
    cameraIds: string[];
  }>;
}

export class PersonTrackingResult {
  personId: string;
  trajectory: Array<{
    timestamp: Date;
    cameraId: string;
    cameraName: string;
    location: string;
    zoneId?: string;
    zoneName?: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  currentLocation?: {
    cameraId: string;
    location: string;
    timestamp: Date;
  };
  totalCamerasCrossed: number;
  timeInEachZone: {
    [zoneId: string]: number; // seconds
  };
  summary: string;
}
