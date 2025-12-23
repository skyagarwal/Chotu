import { IsOptional, IsNumber, Min } from 'class-validator';

export class BrandingDetectionDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  expectedBrands?: string[]; // ["Mangwale", "Coca-Cola", etc.]

  @IsOptional()
  @IsNumber()
  @Min(0)
  confidenceThreshold?: number = 0.5;

  @IsOptional()
  detectLogos?: boolean = true;

  @IsOptional()
  detectText?: boolean = true;
}

export class BrandingDetectionResult {
  brandsDetected: Array<{
    brand: string;
    confidence: number;
    type: 'logo' | 'text' | 'both';
    locations: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    matchesExpected?: boolean;
  }>;
  totalBrands: number;
  dominantBrand?: string;
  textDetected: string[];
  summary: string;
}
