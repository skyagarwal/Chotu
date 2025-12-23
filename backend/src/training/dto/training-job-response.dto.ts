export class TrainingJobResponseDto {
  id: string;
  name: string;
  modelType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  datasetId: string;
  config: any;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  metrics?: {
    accuracy?: number;
    loss?: number;
    epochs?: number;
    [key: string]: any;
  };
}
