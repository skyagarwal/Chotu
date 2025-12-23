import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateLabelStudioProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  labelConfig: string; // XML configuration for labeling interface

  @IsArray()
  @IsOptional()
  samplingStrategy?: string[];
}
