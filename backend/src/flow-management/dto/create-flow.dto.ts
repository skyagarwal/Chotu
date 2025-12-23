import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateFlowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
