import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

export enum FoodQualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  SPOILED = 'spoiled',
}

export class AnalyzeFoodQualityDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number = 0.5;
}

export class FoodQualityResult {
  quality: FoodQualityLevel;
  confidence: number;
  freshness: number; // 0-100
  visualAppeal: number; // 0-100
  detectedIssues: string[];
  recommendation: string;
  details: {
    color?: string;
    texture?: string;
    portionSize?: string;
    plating?: string;
  };
}
