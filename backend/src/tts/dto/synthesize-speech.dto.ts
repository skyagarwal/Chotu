import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class SynthesizeSpeechDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsEnum(['en', 'hi', 'mr'])
  language?: string = 'en';

  @IsOptional()
  @IsEnum(['male', 'female'])
  voice?: string = 'female';

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
