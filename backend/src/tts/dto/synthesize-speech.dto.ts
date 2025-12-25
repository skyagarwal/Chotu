import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class SynthesizeSpeechDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  language?: string = 'hi';

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsEnum(['xtts', 'google', 'azure', 'auto'])
  provider?: string = 'auto';

  @IsOptional()
  @IsNumber()
  speed?: number = 1.0; // 0.5 to 2.0

  @IsOptional()
  @IsNumber()
  pitch?: number = 1.0; // 0.5 to 2.0
}
