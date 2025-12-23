import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ModelTrainingService } from '../services/model-training.service';
import {
  CreateTrainingDatasetDto,
  AddTrainingImageDto,
  TrainModelDto,
  TrainingJob,
} from '../dto/model-training.dto';

@Controller('vision/training')
export class TrainingController {
  private readonly logger = new Logger(TrainingController.name);

  constructor(private readonly trainingService: ModelTrainingService) {}

  /**
   * Create a new training dataset
   * POST /api/vision/training/datasets
   */
  @Post('datasets')
  async createDataset(@Body() dto: CreateTrainingDatasetDto) {
    this.logger.log(`Creating dataset: ${dto.datasetName}`);
    return await this.trainingService.createDataset(dto);
  }

  /**
   * Get all datasets
   * GET /api/vision/training/datasets
   */
  @Get('datasets')
  async getAllDatasets() {
    return await this.trainingService.getAllDatasets();
  }

  /**
   * Get dataset by ID
   * GET /api/vision/training/datasets/:id
   */
  @Get('datasets/:id')
  async getDataset(@Param('id') id: string) {
    const dataset = await this.trainingService.getDataset(id);
    if (!dataset) {
      throw new Error(`Dataset not found: ${id}`);
    }
    return dataset;
  }

  /**
   * Add training image with annotations
   * POST /api/vision/training/images
   */
  @Post('images')
  @UseInterceptors(FileInterceptor('image'))
  async addTrainingImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    this.logger.log(`Adding training image to dataset: ${body.datasetId}`);

    const dto: AddTrainingImageDto = {
      datasetId: body.datasetId,
      imageBuffer: file.buffer,
      annotations: JSON.parse(body.annotations || '[]'),
      metadata: body.metadata ? JSON.parse(body.metadata) : undefined,
    };

    return await this.trainingService.addTrainingImage(dto);
  }

  /**
   * Start model training
   * POST /api/vision/training/train
   */
  @Post('train')
  async trainModel(@Body() dto: TrainModelDto): Promise<TrainingJob> {
    this.logger.log(`Starting training for dataset: ${dto.datasetId}`);
    return await this.trainingService.trainModel(dto);
  }

  /**
   * Get training job status
   * GET /api/vision/training/jobs/:jobId
   */
  @Get('jobs/:jobId')
  async getTrainingJob(@Param('jobId') jobId: string): Promise<TrainingJob> {
    const job = await this.trainingService.getTrainingJob(jobId);
    if (!job) {
      throw new Error(`Training job not found: ${jobId}`);
    }
    return job;
  }

  /**
   * Get all trained models
   * GET /api/vision/training/models
   */
  @Get('models')
  async getTrainedModels() {
    return await this.trainingService.getTrainedModels();
  }

  /**
   * Get model info
   * GET /api/vision/training/models/:jobId
   */
  @Get('models/:jobId')
  async getModel(@Param('jobId') jobId: string) {
    const model = await this.trainingService.getModel(jobId);
    if (!model) {
      throw new Error(`Model not found: ${jobId}`);
    }
    return model;
  }
}
