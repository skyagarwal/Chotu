import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class ClassifyTextDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsEnum(['en', 'hi', 'mr', 'auto'])
  language?: string = 'auto';

  @IsOptional()
  @IsString()
  context?: string; // Previous conversation context

  @IsOptional()
  @IsString()
  userId?: string; // For tracking user sessions

  @IsOptional()
  @IsString()
  sessionId?: string; // For conversation tracking

  @IsOptional()
  @IsString()
  phoneNumber?: string; // User's phone number
}
