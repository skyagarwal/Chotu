import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';

export enum ModelProvider {
  OPENAI = 'openai',
  GROQ = 'groq',
  OPENROUTER = 'openrouter',
  HUGGINGFACE = 'huggingface',
  VLLM_LOCAL = 'vllm-local',
  GOOGLE = 'google',
  AZURE = 'azure',
  CUSTOM = 'custom',
}

export enum ModelType {
  LLM = 'llm',
  NLU = 'nlu',
  EMBEDDING = 'embedding',
  ASR = 'asr',
  TTS = 'tts',
}

export class CreateModelDto {
  @IsString()
  name: string;

  @IsEnum(ModelProvider)
  provider: ModelProvider;

  @IsString()
  providerModelId: string;

  @IsEnum(ModelType)
  modelType: ModelType;

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
  @IsBoolean()
  isLocal?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
