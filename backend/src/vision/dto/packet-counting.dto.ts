import { IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';

export enum PacketSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large',
}

export enum PacketType {
  BOX = 'box',
  ENVELOPE = 'envelope',
  BAG = 'bag',
  CONTAINER = 'container',
  PALLET = 'pallet',
  CUSTOM = 'custom',
}

export class PacketCountingDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  expectedCount?: number;

  @IsOptional()
  detectSizes?: boolean = true;

  @IsOptional()
  detectTypes?: boolean = true;

  @IsOptional()
  groupBySimilarity?: boolean = true;

  @IsOptional()
  @IsArray()
  expectedSizes?: PacketSize[];

  @IsOptional()
  @IsNumber()
  confidenceThreshold?: number = 0.5;
}

export class PacketCountingResult {
  totalPackets: number;
  expectedCount?: number;
  match: boolean;
  discrepancy?: number; // Difference from expected
  
  bySize: {
    [PacketSize.SMALL]: number;
    [PacketSize.MEDIUM]: number;
    [PacketSize.LARGE]: number;
    [PacketSize.EXTRA_LARGE]: number;
  };
  
  byType: {
    [key: string]: number; // box: 5, bag: 3, etc.
  };
  
  packets: Array<{
    packetId: string;
    size: PacketSize;
    type: PacketType;
    confidence: number;
    dimensions?: {
      width: number;
      height: number;
      estimatedDepth?: number;
    };
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    groupId?: string; // If grouped by similarity
  }>;
  
  groups?: Array<{
    groupId: string;
    count: number;
    size: PacketSize;
    type: PacketType;
    similarity: number; // 0-1
  }>;
  
  quality: {
    imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
    occlusion: boolean; // Some packets hidden
    overlap: boolean; // Packets overlapping
    issues: string[];
  };
  
  summary: string;
  recommendations: string[];
}
