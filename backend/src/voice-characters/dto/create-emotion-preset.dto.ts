import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmotionPresetDto {
  @ApiProperty({ description: 'Emotion name (slug)', example: 'happy' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name', example: 'Happy & Cheerful' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category', example: 'positive' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Exaggeration (0-1)', example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  exaggeration?: number;

  @ApiPropertyOptional({ description: 'CFG weight (0-1)', example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  cfgWeight?: number;

  @ApiPropertyOptional({ description: 'Speed multiplier', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  speedMultiplier?: number;

  @ApiPropertyOptional({ description: 'Voice modifiers' })
  @IsOptional()
  @IsObject()
  voiceModifiers?: Record<string, any>;

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

export class UpdateEmotionPresetDto {
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
  @IsString()
  category?: string;

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
  speedMultiplier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  voiceModifiers?: Record<string, any>;

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
