import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TrainingService } from '../services/training.service';
import { DatasetService } from '../services/dataset.service';
import { ModelTrainingService } from '../services/model-training.service';
import { LabelStudioService } from '../services/labelstudio.service';
import { 
  CreateTrainingJobDto, 
  CreateDatasetDto, 
  DeployModelDto, 
  CreateLabelStudioProjectDto,
  TrainingJobResponseDto,
  DatasetResponseDto,
  DatasetStatsResponseDto
} from '../dto';

@Controller('training')
export class TrainingController {
  private readonly logger = new Logger(TrainingController.name);

  constructor(
    private readonly trainingService: TrainingService,
    private readonly datasetService: DatasetService,
    private readonly modelTrainingService: ModelTrainingService,
    private readonly labelStudioService: LabelStudioService,
  ) {}

  @Get('jobs')
  async getTrainingJobs(@Query('status') status?: string): Promise<any> {
    return this.trainingService.getJobs(status);
  }

  @Get('jobs/:id')
  async getTrainingJob(@Param('id') id: string): Promise<any> {
    return this.trainingService.getJob(id);
  }

  @Post('jobs')
  async createTrainingJob(@Body() jobData: CreateTrainingJobDto): Promise<TrainingJobResponseDto> {
    this.logger.log(`Create training job: ${jobData.name} (${jobData.modelType})`);
    return this.trainingService.createJob(jobData);
  }

  @Post('jobs/:id/start')
  async startTraining(@Param('id') id: string): Promise<any> {
    this.logger.log(`Start training job: ${id}`);
    return this.trainingService.startJob(id);
  }

  @Post('jobs/:id/stop')
  async stopTraining(@Param('id') id: string): Promise<any> {
    this.logger.log(`Stop training job: ${id}`);
    return this.trainingService.stopJob(id);
  }

  @Get('datasets')
  async getDatasets(): Promise<any> {
    return this.datasetService.getDatasets();
  }

  @Get('datasets/:id')
  async getDataset(@Param('id') id: string): Promise<any> {
    return this.datasetService.getDataset(id);
  }

  @Post('datasets')
  @UseInterceptors(FileInterceptor('file'))
  async createDataset(
    @Body('name') name: string,
    @Body('type') type: string,
    @Body('description') description: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DatasetResponseDto> {
    this.logger.log(`Create dataset: ${name} (${type})`);
    const datasetDto: CreateDatasetDto = { name, type: type as any, description };
    return this.datasetService.createDataset(datasetDto, file);
  }

  @Post('datasets/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDatasetFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    return this.datasetService.uploadFile(id, file);
  }

  @Get('datasets/:id/stats')
  async getDatasetStats(@Param('id') id: string): Promise<any> {
    return this.datasetService.getStats(id);
  }

  @Get('models')
  async getModels(): Promise<any> {
    return this.modelTrainingService.getModels();
  }

  @Get('models/:id')
  async getModel(@Param('id') id: string): Promise<any> {
    return this.modelTrainingService.getModel(id);
  }

  @Post('models/:id/deploy')
  async deployModel(@Param('id') id: string, @Body() deployDto?: DeployModelDto): Promise<any> {
    this.logger.log(`Deploy model: ${id}`);
    return this.modelTrainingService.deployModel(id);
  }

  @Post('models/:id/evaluate')
  async evaluateModel(
    @Param('id') id: string,
    @Body('datasetId') datasetId: string,
  ): Promise<any> {
    this.logger.log(`Evaluate model: ${id} on dataset: ${datasetId}`);
    return this.modelTrainingService.evaluateModel(id, datasetId);
  }

  @Get('labelstudio/projects')
  async getLabelStudioProjects(): Promise<any> {
    return this.labelStudioService.getProjects();
  }

  @Post('labelstudio/projects')
  async createLabelStudioProject(@Body() projectData: CreateLabelStudioProjectDto): Promise<any> {
    this.logger.log(`Create Label Studio project: ${projectData.title}`);
    return this.labelStudioService.createProject(projectData);
  }

  @Get('labelstudio/projects/:id/export')
  async exportLabelStudioData(@Param('id') id: string): Promise<any> {
    return this.labelStudioService.exportData(id);
  }

  @Post('labelstudio/sync')
  async syncLabelStudioData(@Body('projectId') projectId?: string): Promise<any> {
    this.logger.log(`Triggering Label Studio sync...`);
    return this.labelStudioService.syncData(projectId || '1');
  }

  @Get('health')
  async health(): Promise<any> {
    return {
      status: 'ok',
      services: {
        training: true,
        datasets: true,
        labelStudio: await this.labelStudioService.healthCheck(),
      },
    };
  }
}
