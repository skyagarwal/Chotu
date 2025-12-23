import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SynthesizeDto {
  @ApiProperty({ description: 'Text to synthesize', example: 'नमस्ते, मैं छोटू हूं' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Character name', example: 'chotu' })
  @IsOptional()
  @IsString()
  character?: string;

  @ApiPropertyOptional({ description: 'Language code', example: 'hi' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Emotion preset name', example: 'happy' })
  @IsOptional()
  @IsString()
  emotion?: string;

  @ApiPropertyOptional({ description: 'Style preset name', example: 'greeting' })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({ description: 'Override exaggeration (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  exaggeration?: number;

  @ApiPropertyOptional({ description: 'Override CFG weight (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  cfgWeight?: number;

  @ApiPropertyOptional({ description: 'Override speed (0.5-2)' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  speed?: number;

  @ApiPropertyOptional({ description: 'Source for logging', example: 'api' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Session ID for logging' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
