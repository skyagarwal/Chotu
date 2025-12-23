import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrainingController } from './controllers/training.controller';
import { TrainingService } from './services/training.service';
import { TrainingPipelineService } from './services/training-pipeline.service';
import { DatasetService } from './services/dataset.service';
import { ModelTrainingService } from './services/model-training.service';
import { LabelStudioService } from './services/labelstudio.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000, // 2 minutes for training operations
      maxRedirects: 3,
    }),
    DatabaseModule, // For TrainingPipelineService to access Prisma
  ],
  controllers: [TrainingController],
  providers: [
    TrainingService,
    TrainingPipelineService, // Real training pipeline with HuggingFace integration
    DatasetService,
    ModelTrainingService,
    LabelStudioService,
  ],
  exports: [
    TrainingService,
    TrainingPipelineService,
    DatasetService,
    ModelTrainingService,
  ],
})
export class TrainingModule {}
