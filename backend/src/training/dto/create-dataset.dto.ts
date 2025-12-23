import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt } from 'class-validator';

export enum DatasetType {
  NLU = 'nlu',
  IMAGE = 'image',
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export class CreateDatasetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DatasetType)
  @IsNotEmpty()
  type: DatasetType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  labelStudioProjectId?: number;
}
