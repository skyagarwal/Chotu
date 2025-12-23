import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Dataset {
  id: string;
  name: string;
  type: string; // 'nlu', 'image', 'text', 'audio'
  description: string;
  filePath?: string;
  size: number;
  recordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DatasetService {
  private readonly logger = new Logger(DatasetService.name);
  private datasets: Map<string, Dataset> = new Map();
  private readonly datasetsDir = '/tmp/datasets'; // In production, use configurable path

  constructor() {
    this.ensureDatasetsDir();
  }

  private async ensureDatasetsDir(): Promise<void> {
    try {
      await fs.mkdir(this.datasetsDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create datasets directory: ${error.message}`);
    }
  }

  async getDatasets(): Promise<Dataset[]> {
    return Array.from(this.datasets.values());
  }

  async getDataset(id: string): Promise<Dataset | null> {
    return this.datasets.get(id) || null;
  }

  async createDataset(datasetInfo: any, file?: Express.Multer.File): Promise<Dataset> {
    const id = `dataset-${Date.now()}`;
    
    let filePath: string | undefined;
    let size = 0;
    
    if (file) {
      filePath = path.join(this.datasetsDir, `${id}-${file.originalname}`);
      await fs.writeFile(filePath, file.buffer);
      size = file.size;
    }

    const dataset: Dataset = {
      id,
      name: datasetInfo.name,
      type: datasetInfo.type,
      description: datasetInfo.description || '',
      filePath,
      size,
      recordCount: 0, // Will be calculated when parsing the file
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.datasets.set(id, dataset);
    this.logger.log(`Created dataset: ${dataset.name} (${id})`);

    return dataset;
  }

  async uploadFile(id: string, file: Express.Multer.File): Promise<Dataset | null> {
    const dataset = this.datasets.get(id);
    if (!dataset) {
      return null;
    }

    const filePath = path.join(this.datasetsDir, `${id}-${file.originalname}`);
    await fs.writeFile(filePath, file.buffer);

    dataset.filePath = filePath;
    dataset.size = file.size;
    dataset.updatedAt = new Date();

    return dataset;
  }

  async getStats(id: string): Promise<any> {
    const dataset = this.datasets.get(id);
    if (!dataset) {
      return null;
    }

    return {
      id: dataset.id,
      name: dataset.name,
      type: dataset.type,
      size: dataset.size,
      recordCount: dataset.recordCount,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
      // Additional stats based on dataset type
      stats: this.calculateDatasetStats(dataset),
    };
  }

  private calculateDatasetStats(dataset: Dataset): any {
    // Placeholder for actual stats calculation
    return {
      format: 'json',
      encoding: 'utf-8',
      sampleCount: dataset.recordCount,
    };
  }
}
