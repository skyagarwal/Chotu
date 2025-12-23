import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';

export enum PickupDropType {
  PICKUP = 'pickup',
  DROP = 'drop',
}

export enum PackageCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  DAMAGED = 'damaged',
  TAMPERED = 'tampered',
  MISSING_ITEMS = 'missing_items',
}

export class PickupDropVerificationDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsEnum(PickupDropType)
  type: PickupDropType;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  riderId?: string;

  @IsOptional()
  @IsNumber()
  expectedPackages?: number;

  @IsOptional()
  verifyPackaging?: boolean = true;

  @IsOptional()
  verifySeals?: boolean = true;

  @IsOptional()
  expectedItems?: Array<{
    itemName: string;
    quantity: number;
  }>;
}

export class PickupDropVerificationResult {
  verified: boolean;
  confidence: number;
  timestamp: Date;
  type: PickupDropType;
  orderId?: string;
  riderId?: string;
  
  packages: {
    detected: number;
    expected?: number;
    match: boolean;
    details: Array<{
      packageId: string;
      condition: PackageCondition;
      sealed: boolean;
      damaged: boolean;
      boundingBox: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
  };
  
  packaging: {
    intact: boolean;
    sealsPresent: boolean;
    tampering: boolean;
    issues: string[];
  };
  
  items?: {
    detected: Array<{
      itemName: string;
      quantity: number;
      confidence: number;
    }>;
    missing: string[];
  };
  
  riderDetected?: {
    present: boolean;
    uniformCompliance: boolean;
    confidence: number;
  };
  
  locationData?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  
  violations: string[];
  recommendations: string[];
  summary: string;
}
