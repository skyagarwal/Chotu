import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

export enum UniformType {
  DELIVERY_RIDER = 'delivery_rider',
  SECURITY_GUARD = 'security_guard',
  RESTAURANT_STAFF = 'restaurant_staff',
  WAREHOUSE_WORKER = 'warehouse_worker',
  CUSTOM = 'custom',
}

export enum UniformComponent {
  HELMET = 'helmet',
  VEST = 'vest',
  SHIRT = 'shirt',
  PANTS = 'pants',
  JACKET = 'jacket',
  CAP = 'cap',
  BADGE = 'badge',
  SHOES = 'shoes',
}

export class UniformDetectionDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsEnum(UniformType)
  @IsOptional()
  uniformType?: UniformType = UniformType.DELIVERY_RIDER;

  @IsOptional()
  requiredComponents?: UniformComponent[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number = 0.6;

  @IsOptional()
  checkBranding?: boolean = false;

  @IsOptional()
  expectedBrand?: string; // e.g., "Mangwale", "Zomato", etc.
}

export class UniformDetectionResult {
  isWearingUniform: boolean;
  compliance: number; // 0-100%
  confidence: number;
  detectedComponents: {
    [key in UniformComponent]?: {
      detected: boolean;
      confidence: number;
      boundingBox?: { x: number; y: number; width: number; height: number };
      color?: string;
      brand?: string;
    };
  };
  missingComponents: UniformComponent[];
  violations: string[];
  brandingDetected?: {
    detected: boolean;
    brand?: string;
    confidence?: number;
    location?: string;
  };
  personDetected: boolean;
  recommendation: string;
}
