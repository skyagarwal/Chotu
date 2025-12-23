import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStylePresetDto {
  @ApiProperty({ description: 'Style name (slug)', example: 'greeting' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name', example: 'Greeting Style' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Exaggeration (0-1)', example: 0.35 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  exaggeration?: number;

  @ApiPropertyOptional({ description: 'CFG weight (0-1)', example: 0.35 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  cfgWeight?: number;

  @ApiPropertyOptional({ description: 'Speed (0.5-2)', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  speed?: number;

  @ApiPropertyOptional({ description: 'Pitch (0.5-2)', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  pitch?: number;

  @ApiPropertyOptional({ description: 'Regex patterns to trigger this style' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerPatterns?: string[];

  @ApiPropertyOptional({ description: 'Flow intents that use this style' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  useForIntents?: string[];

  @ApiPropertyOptional({ description: 'Sample text for preview' })
  @IsOptional()
  @IsString()
  sampleText?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateStylePresetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  exaggeration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  cfgWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  speed?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  pitch?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerPatterns?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  useForIntents?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sampleText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
