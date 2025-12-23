import { IsString, IsEnum, IsOptional, IsArray, IsObject } from 'class-validator';

export enum ModelType {
  UNIFORM_DETECTION = 'uniform_detection',
  BRANDING_DETECTION = 'branding_detection',
  DAMAGE_DETECTION = 'damage_detection',
  SEAL_DETECTION = 'seal_detection',
  CUSTOM_OBJECT = 'custom_object',
}

export enum TrainingMethod {
  FINE_TUNING = 'fine_tuning', // Fine-tune existing model
  TRANSFER_LEARNING = 'transfer_learning', // Use pre-trained, train last layers
  FROM_SCRATCH = 'from_scratch', // Train completely new model
}

export class CreateTrainingDatasetDto {
  @IsString()
  datasetName: string;

  @IsEnum(ModelType)
  modelType: ModelType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  classes?: string[]; // Custom classes to detect
}

export class AddTrainingImageDto {
  @IsString()
  datasetId: string;

  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsArray()
  annotations: Array<{
    className: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence?: number;
    attributes?: any; // Additional metadata
  }>;

  @IsOptional()
  @IsObject()
  metadata?: {
    location?: string;
    timestamp?: Date;
    cameraId?: string;
    userId?: string;
  };
}

export class TrainModelDto {
  @IsString()
  datasetId: string;

  @IsEnum(TrainingMethod)
  method: TrainingMethod;

  @IsOptional()
  @IsString()
  baseModel?: string; // e.g., "yolov8n.onnx"

  @IsOptional()
  epochs?: number = 100;

  @IsOptional()
  batchSize?: number = 16;

  @IsOptional()
  learningRate?: number = 0.001;

  @IsOptional()
  validationSplit?: number = 0.2;

  @IsOptional()
  augmentation?: {
    rotation?: boolean;
    flip?: boolean;
    brightness?: boolean;
    contrast?: boolean;
  };
}

export class TrainingJob {
  jobId: string;
  datasetId: string;
  modelType: ModelType;
  method: TrainingMethod;
  status: 'pending' | 'training' | 'completed' | 'failed';
  progress: number; // 0-100
  currentEpoch: number;
  totalEpochs: number;
  metrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    loss?: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  modelPath?: string;
  error?: string;
}
