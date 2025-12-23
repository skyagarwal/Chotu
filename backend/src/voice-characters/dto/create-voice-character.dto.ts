import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoiceCharacterDto {
  @ApiProperty({ description: 'Unique character name (slug)', example: 'chotu' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name', example: 'Chotu - The Helper' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Character description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Personality JSON' })
  @IsOptional()
  @IsObject()
  personality?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Character traits', example: ['helpful', 'innocent'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  traits?: string[];

  @ApiPropertyOptional({ description: 'Default language code', example: 'hi' })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @ApiPropertyOptional({ description: 'Default exaggeration (0-1)', example: 0.35 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultExaggeration?: number;

  @ApiPropertyOptional({ description: 'Default CFG weight (0-1)', example: 0.35 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultCfgWeight?: number;

  @ApiPropertyOptional({ description: 'Default speed (0.5-2)', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  defaultSpeed?: number;

  @ApiPropertyOptional({ description: 'Default pitch (0.5-2)', example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  defaultPitch?: number;

  @ApiPropertyOptional({ description: 'Voice reference audio URL' })
  @IsOptional()
  @IsString()
  voiceReferenceUrl?: string;

  @ApiPropertyOptional({ description: 'Voice reference text' })
  @IsOptional()
  @IsString()
  voiceReferenceText?: string;

  @ApiPropertyOptional({ description: 'TTS engine to use', example: 'chatterbox' })
  @IsOptional()
  @IsString()
  ttsEngine?: string;

  @ApiPropertyOptional({ description: 'TTS engine specific config' })
  @IsOptional()
  @IsObject()
  ttsConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is character active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is default character' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
