import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class UpdateFlowDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  trigger?: string;

  @IsArray()
  @IsOptional()
  nodes?: any[];

  @IsObject()
  @IsOptional()
  metadata?: any;
}
