import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class TranscribeAudioDto {
  @IsString()
  audioUrl?: string; // URL to audio file

  @IsOptional()
  audioData?: Buffer; // Or raw audio data

  @IsOptional()
  @IsEnum(['en', 'hi', 'mr', 'auto'])
  language?: string = 'auto';

  @IsOptional()
  @IsEnum(['whisper', 'google', 'azure', 'auto'])
  provider?: string = 'auto';

  @IsOptional()
  @IsNumber()
  maxDurationSeconds?: number = 60; // Max audio length
}
