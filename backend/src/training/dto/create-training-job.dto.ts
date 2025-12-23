import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateTrainingJobDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  modelType: string; // 'nlu', 'ner', 'classification', 'yolo', 'object_detection'

  @IsString()
  @IsNotEmpty()
  datasetId: string;

  @IsObject()
  @IsOptional()
  config?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    [key: string]: any;
  };

  @IsString()
  @IsOptional()
  description?: string;
}
