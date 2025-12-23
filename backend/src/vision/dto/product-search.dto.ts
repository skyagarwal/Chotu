import { IsOptional, IsNumber, Min } from 'class-validator';

export class SearchProductByImageDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxResults?: number = 10;

  @IsOptional()
  @IsNumber()
  @Min(0)
  confidenceThreshold?: number = 0.3;
}

export class ProductSearchResult {
  products: Array<{
    productId?: string;
    name: string;
    category: string;
    confidence: number;
    matchedFeatures: string[];
    estimatedPrice?: number;
    availability?: boolean;
    storeId?: string;
    storeName?: string;
    imageUrl?: string;
  }>;
  detectedObjects: Array<{
    className: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  searchQuery: string;
  totalResults: number;
}
