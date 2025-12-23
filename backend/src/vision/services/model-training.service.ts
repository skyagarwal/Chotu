import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateTrainingDatasetDto,
  AddTrainingImageDto,
  TrainModelDto,
  TrainingJob,
  ModelType,
  TrainingMethod,
} from '../dto/model-training.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Model Training Service
 * Continuous learning system for custom vision models
 * Similar to NLU training but for computer vision
 */
@Injectable()
export class ModelTrainingService {
  private readonly logger = new Logger(ModelTrainingService.name);
  private readonly trainingDir = '/app/training/vision';
  
  // In-memory storage (move to database in production)
  private datasets: Map<string, any> = new Map();
  private trainingJobs: Map<string, TrainingJob> = new Map();
  private trainedModels: Map<string, any> = new Map();

  constructor() {
    this.initializeTrainingDirectory();
  }

  private async initializeTrainingDirectory() {
    try {
      await fs.mkdir(this.trainingDir, { recursive: true });
      await fs.mkdir(path.join(this.trainingDir, 'datasets'), { recursive: true });
      await fs.mkdir(path.join(this.trainingDir, 'models'), { recursive: true });
      await fs.mkdir(path.join(this.trainingDir, 'checkpoints'), { recursive: true });
      this.logger.log(`✅ Training directory initialized: ${this.trainingDir}`);
    } catch (error) {
      this.logger.error(`Failed to initialize training directory: ${error.message}`);
    }
  }

  /**
   * Create a new training dataset
   */
  async createDataset(dto: CreateTrainingDatasetDto): Promise<any> {
    const datasetId = uuidv4();
    const dataset = {
      id: datasetId,
      name: dto.datasetName,
      modelType: dto.modelType,
      description: dto.description,
      classes: dto.classes || [],
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalImages: 0,
        totalAnnotations: 0,
        classCounts: {},
      },
    };

    this.datasets.set(datasetId, dataset);

    // Create dataset directory
    const datasetPath = path.join(this.trainingDir, 'datasets', datasetId);
    await fs.mkdir(datasetPath, { recursive: true });
    await fs.mkdir(path.join(datasetPath, 'images'), { recursive: true });
    await fs.mkdir(path.join(datasetPath, 'labels'), { recursive: true });

    this.logger.log(`✅ Created dataset: ${dto.datasetName} (${datasetId})`);

    return dataset;
  }

  /**
   * Add training image with annotations
   */
  async addTrainingImage(dto: AddTrainingImageDto): Promise<any> {
    const dataset = this.datasets.get(dto.datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${dto.datasetId}`);
    }

    if (!dto.imageBuffer) {
      throw new Error('Image buffer is required');
    }

    const imageId = uuidv4();
    const imagePath = path.join(
      this.trainingDir,
      'datasets',
      dto.datasetId,
      'images',
      `${imageId}.jpg`,
    );

    // Save image
    await fs.writeFile(imagePath, dto.imageBuffer);

    // Save annotations in YOLO format
    const labelPath = path.join(
      this.trainingDir,
      'datasets',
      dto.datasetId,
      'labels',
      `${imageId}.txt`,
    );

    const yoloAnnotations = dto.annotations.map((ann) => {
      const classIndex = dataset.classes.indexOf(ann.className);
      if (classIndex === -1) {
        dataset.classes.push(ann.className);
      }

      // Convert to YOLO format: <class> <x_center> <y_center> <width> <height>
      // All normalized to 0-1
      return `${classIndex} ${ann.boundingBox.x} ${ann.boundingBox.y} ${ann.boundingBox.width} ${ann.boundingBox.height}`;
    }).join('\n');

    await fs.writeFile(labelPath, yoloAnnotations);

    // Update dataset stats
    dataset.images.push({
      id: imageId,
      path: imagePath,
      annotations: dto.annotations,
      metadata: dto.metadata,
      addedAt: new Date(),
    });

    dataset.stats.totalImages++;
    dataset.stats.totalAnnotations += dto.annotations.length;
    dto.annotations.forEach((ann) => {
      dataset.stats.classCounts[ann.className] =
        (dataset.stats.classCounts[ann.className] || 0) + 1;
    });

    dataset.updatedAt = new Date();

    this.logger.log(
      `✅ Added training image to ${dataset.name}: ${dto.annotations.length} annotations`,
    );

    return {
      imageId,
      datasetId: dto.datasetId,
      annotationsCount: dto.annotations.length,
    };
  }

  /**
   * Start model training
   */
  async trainModel(dto: TrainModelDto): Promise<TrainingJob> {
    const dataset = this.datasets.get(dto.datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${dto.datasetId}`);
    }

    if (dataset.stats.totalImages < 10) {
      throw new Error(
        `Insufficient training data. Need at least 10 images, have ${dataset.stats.totalImages}`,
      );
    }

    const jobId = uuidv4();
    const job: TrainingJob = {
      jobId,
      datasetId: dto.datasetId,
      modelType: dataset.modelType,
      method: dto.method,
      status: 'pending',
      progress: 0,
      currentEpoch: 0,
      totalEpochs: dto.epochs || 100,
      startedAt: new Date(),
    };

    this.trainingJobs.set(jobId, job);

    // Start training asynchronously
    this.executeTraining(job, dto, dataset);

    this.logger.log(
      `🚀 Started training job: ${jobId} (${dataset.name}, ${dto.method})`,
    );

    return job;
  }

  /**
   * Execute model training (background job)
   */
  private async executeTraining(
    job: TrainingJob,
    dto: TrainModelDto,
    dataset: any,
  ): Promise<void> {
    try {
      job.status = 'training';
      this.logger.log(`🏋️ Training model: ${job.jobId}`);

      // Generate dataset config file
      await this.generateDatasetConfig(dataset, dto);

      // Simulate training progress
      // In production, this would call Python training script
      for (let epoch = 1; epoch <= job.totalEpochs; epoch++) {
        job.currentEpoch = epoch;
        job.progress = Math.round((epoch / job.totalEpochs) * 100);

        // Simulate metrics
        job.metrics = {
          accuracy: 0.5 + (epoch / job.totalEpochs) * 0.4 + Math.random() * 0.1,
          precision: 0.6 + (epoch / job.totalEpochs) * 0.3 + Math.random() * 0.1,
          recall: 0.55 + (epoch / job.totalEpochs) * 0.35 + Math.random() * 0.1,
          loss: 1.0 - (epoch / job.totalEpochs) * 0.8 + Math.random() * 0.1,
        };

        job.metrics.f1Score =
          (2 * job.metrics.precision * job.metrics.recall) /
          (job.metrics.precision + job.metrics.recall);

        this.logger.log(
          `📊 Epoch ${epoch}/${job.totalEpochs}: Loss=${job.metrics.loss.toFixed(4)}, Acc=${job.metrics.accuracy.toFixed(4)}`,
        );

        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate training time
      }

      // Save trained model
      const modelPath = path.join(
        this.trainingDir,
        'models',
        `${dataset.modelType}_${job.jobId}.onnx`,
      );

      job.status = 'completed';
      job.completedAt = new Date();
      job.modelPath = modelPath;
      job.progress = 100;

      this.trainedModels.set(job.jobId, {
        jobId: job.jobId,
        modelPath,
        modelType: dataset.modelType,
        classes: dataset.classes,
        metrics: job.metrics,
        trainedAt: new Date(),
      });

      this.logger.log(`✅ Training completed: ${job.jobId} (Accuracy: ${job.metrics?.accuracy?.toFixed(2)})`);
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      this.logger.error(`❌ Training failed: ${job.jobId} - ${error.message}`);
    }
  }

  /**
   * Generate dataset configuration for training
   */
  private async generateDatasetConfig(dataset: any, dto: TrainModelDto): Promise<void> {
    const config = {
      path: path.join(this.trainingDir, 'datasets', dataset.id),
      train: 'images',
      val: 'images',
      nc: dataset.classes.length,
      names: dataset.classes,
      
      // Training hyperparameters
      epochs: dto.epochs,
      batch: dto.batchSize,
      lr0: dto.learningRate,
      
      // Augmentation
      augment: dto.augmentation || {
        hsv_h: 0.015,
        hsv_s: 0.7,
        hsv_v: 0.4,
        degrees: 0.0,
        translate: 0.1,
        scale: 0.5,
        shear: 0.0,
        perspective: 0.0,
        flipud: 0.0,
        fliplr: 0.5,
        mosaic: 1.0,
        mixup: 0.0,
      },
    };

    const configPath = path.join(
      this.trainingDir,
      'datasets',
      dataset.id,
      'dataset.yaml',
    );

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Get training job status
   */
  async getTrainingJob(jobId: string): Promise<TrainingJob | null> {
    return this.trainingJobs.get(jobId) || null;
  }

  /**
   * Get all datasets
   */
  async getAllDatasets(): Promise<any[]> {
    return Array.from(this.datasets.values());
  }

  /**
   * Get dataset by ID
   */
  async getDataset(datasetId: string): Promise<any> {
    return this.datasets.get(datasetId);
  }

  /**
   * Get all trained models
   */
  async getTrainedModels(): Promise<any[]> {
    return Array.from(this.trainedModels.values());
  }

  /**
   * Get model info
   */
  async getModel(jobId: string): Promise<any> {
    return this.trainedModels.get(jobId);
  }
}
