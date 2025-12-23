import { Injectable, Logger } from '@nestjs/common';

interface TrainingJob {
  id: string;
  name: string;
  modelType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  datasetId: string;
  config: any;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  metrics?: any;
}

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);
  private jobs: Map<string, TrainingJob> = new Map();

  async getJobs(status?: string): Promise<TrainingJob[]> {
    const allJobs = Array.from(this.jobs.values());
    
    if (status) {
      return allJobs.filter(job => job.status === status);
    }
    
    return allJobs;
  }

  async getJob(id: string): Promise<TrainingJob | null> {
    return this.jobs.get(id) || null;
  }

  async createJob(jobData: any): Promise<TrainingJob> {
    const id = `job-${Date.now()}`;
    
    const job: TrainingJob = {
      id,
      name: jobData.name,
      modelType: jobData.modelType, // 'nlu', 'ner', 'classification', 'yolo', etc.
      status: 'pending',
      datasetId: jobData.datasetId,
      config: jobData.config || {},
      progress: 0,
    };

    this.jobs.set(id, job);
    this.logger.log(`Created training job: ${job.name} (${id})`);

    return job;
  }

  async startJob(id: string): Promise<TrainingJob | null> {
    const job = this.jobs.get(id);
    if (!job) {
      return null;
    }

    job.status = 'running';
    job.startedAt = new Date();
    job.progress = 0;

    this.logger.log(`Started training job: ${id}`);

    // Simulate training progress (in real implementation, this would integrate with actual training services)
    this.simulateTraining(id);

    return job;
  }

  async stopJob(id: string): Promise<TrainingJob | null> {
    const job = this.jobs.get(id);
    if (!job) {
      return null;
    }

    job.status = 'failed';
    this.logger.log(`Stopped training job: ${id}`);

    return job;
  }

  private simulateTraining(id: string): void {
    const interval = setInterval(() => {
      const job = this.jobs.get(id);
      if (!job || job.status !== 'running') {
        clearInterval(interval);
        return;
      }

      job.progress += 10;
      
      if (job.progress >= 100) {
        job.progress = 100;
        job.status = 'completed';
        job.completedAt = new Date();
        job.metrics = {
          accuracy: 0.92,
          loss: 0.15,
          epochs: 10,
        };
        clearInterval(interval);
        this.logger.log(`Completed training job: ${id}`);
      }
    }, 2000);
  }
}
