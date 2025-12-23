import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VisionController } from './controllers/vision.controller';
import { TrainingController } from './controllers/training.controller';
import { VisionService } from './services/vision.service';
import { ImageAnalysisService } from './services/image-analysis.service';
import { FaceRecognitionService } from './services/face-recognition.service';
import { PpeDetectionService } from './services/ppe-detection.service';
import { CameraManagementService } from './services/camera-management.service';
import { FoodQualityService } from './services/food-quality.service';
import { ProductSearchService } from './services/product-search.service';
import { CountingService } from './services/counting.service';
import { AttendanceService } from './services/attendance.service';
import { UniformDetectionService } from './services/uniform-detection.service';
import { PacketCountingService } from './services/packet-counting.service';
import { PickupDropVerificationService } from './services/pickup-drop-verification.service';
import { ModelTrainingService } from './services/model-training.service';
import { PrismaService } from '../database/prisma.service';
import { OnnxRuntimeService } from './services/onnx-runtime.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60s for image processing
      maxRedirects: 3,
    }),
  ],
  controllers: [VisionController, TrainingController],
  providers: [
    OnnxRuntimeService, // ONNX Runtime for local inference
    VisionService,
    ImageAnalysisService,
    FaceRecognitionService,
    PpeDetectionService,
    CameraManagementService,
    FoodQualityService,
    ProductSearchService,
    CountingService,
    AttendanceService,
    UniformDetectionService,
    PacketCountingService,
    PickupDropVerificationService,
    ModelTrainingService,
    PrismaService,
  ],
  exports: [
    OnnxRuntimeService,
    VisionService,
    ImageAnalysisService,
    FaceRecognitionService,
    FoodQualityService,
    ProductSearchService,
    CountingService,
    AttendanceService,
    UniformDetectionService,
    PacketCountingService,
    PickupDropVerificationService,
    ModelTrainingService,
  ],
})
export class VisionModule {}
