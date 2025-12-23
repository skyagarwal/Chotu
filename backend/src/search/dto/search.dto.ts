import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';

export class SearchDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsEnum([
    'food_items_v2',
    'ecom_items_v2', 
    'parcel_items',
    'pharmacy_items',
    'room_items',
    'movie_items',
    'service_items',
    'products',
    'stores',
    'orders',
    'all'
  ])
  index?: string = 'all';

  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @IsOptional()
  @IsArray()
  filters?: SearchFilter[];

  @IsOptional()
  @IsEnum(['keyword', 'semantic', 'hybrid'])
  searchType?: string = 'hybrid';
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'range' | 'geo_distance';
  value: any;
}
