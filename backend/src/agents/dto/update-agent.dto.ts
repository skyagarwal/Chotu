import { IsString, IsNumber, IsOptional, IsIn, Min, Max } from 'class-validator';

export class UpdateAgentDto {
  @IsOptional()
  @IsIn(['active', 'training', 'inactive'])
  status?: string;

  @IsOptional()
  @IsString()
  llmModel?: string;

  @IsOptional()
  @IsString()
  nluProvider?: string;

  @IsOptional()
  @IsString()
  nluModel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(8192)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}
