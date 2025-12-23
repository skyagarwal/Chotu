import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

export enum CountingTarget {
  PEOPLE = 'people',
  OBJECTS = 'objects',
  ITEMS = 'items',
  VEHICLES = 'vehicles',
  ALL = 'all',
}

export class CountObjectsDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(CountingTarget)
  target?: CountingTarget = CountingTarget.ALL;

  @IsOptional()
  @IsNumber()
  @Min(0)
  confidenceThreshold?: number = 0.5;

  @IsOptional()
  specificClasses?: string[]; // e.g., ['apple', 'orange', 'banana']
}

export class CountingResult {
  totalCount: number;
  breakdown: {
    [className: string]: {
      count: number;
      confidence: number;
      locations: Array<{ x: number; y: number; width: number; height: number }>;
    };
  };
  visualization?: string; // Base64 image with bounding boxes
  summary: string;
}
