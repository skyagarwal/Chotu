import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLanguageSettingDto {
  @ApiProperty({ description: 'Language code', example: 'hi' })
  @IsString()
  languageCode: string;

  @ApiProperty({ description: 'Language name', example: 'Hindi' })
  @IsString()
  languageName: string;

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

  @ApiPropertyOptional({ description: 'Voice reference URL for this language' })
  @IsOptional()
  @IsString()
  voiceReferenceUrl?: string;

  @ApiPropertyOptional({ description: 'Voice reference text' })
  @IsOptional()
  @IsString()
  voiceReferenceText?: string;

  @ApiPropertyOptional({ description: 'Is enabled' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateLanguageSettingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  languageName?: string;

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
  @IsString()
  voiceReferenceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voiceReferenceText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
