import { IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';

export enum SurveillanceEventType {
  INTRUSION = 'intrusion',
  CROWD_DETECTION = 'crowd_detection',
  ABANDONED_OBJECT = 'abandoned_object',
  LOITERING = 'loitering',
  UNAUTHORIZED_AREA = 'unauthorized_area',
  FALL_DETECTION = 'fall_detection',
  VIOLENCE = 'violence',
  FIRE = 'fire',
  UNUSUAL_ACTIVITY = 'unusual_activity',
}

export class SurveillanceMonitoringDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  cameraId?: string;

  @IsOptional()
  location?: string;

  @IsArray()
  @IsOptional()
  eventsToDetect?: SurveillanceEventType[] = [
    SurveillanceEventType.INTRUSION,
    SurveillanceEventType.CROWD_DETECTION,
  ];

  @IsOptional()
  @IsNumber()
  crowdThreshold?: number = 10; // Number of people

  @IsOptional()
  restrictedZones?: Array<{
    zoneId: string;
    zoneName: string;
    polygon: Array<{ x: number; y: number }>;
  }>;
}

export class SurveillanceResult {
  alerts: Array<{
    eventType: SurveillanceEventType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    confidence: number;
    description: string;
    location?: string;
    details?: any;
  }>;
  peopleCount: number;
  crowdDetected: boolean;
  intrusionDetected: boolean;
  abandonedObjects: number;
  zones: {
    [zoneId: string]: {
      peopleCount: number;
      authorized: boolean;
      alerts: string[];
    };
  };
  summary: string;
  requiresAction: boolean;
}
