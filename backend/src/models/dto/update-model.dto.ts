import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';
import { ModelProvider, ModelType } from './create-model.dto';

export class UpdateModelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ModelProvider)
  provider?: ModelProvider;

  @IsOptional()
  @IsString()
  providerModelId?: string;

  @IsOptional()
  @IsEnum(ModelType)
  modelType?: ModelType;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  deploymentName?: string;

  @IsOptional()
  config?: Record<string, any>;

  @IsOptional()
  @IsArray()
  capabilities?: string[];

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  costPerToken?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  isLocal?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
