export class DatasetResponseDto {
  id: string;
  name: string;
  type: string;
  description: string;
  filePath?: string;
  size: number;
  recordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DatasetStatsResponseDto {
  id: string;
  name: string;
  type: string;
  size: number;
  recordCount: number;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    format?: string;
    encoding?: string;
    sampleCount?: number;
    [key: string]: any;
  };
}
