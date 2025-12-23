import { Injectable, Logger } from '@nestjs/common';
import { ImageAnalysisService } from './image-analysis.service';
import { FaceRecognitionService } from './face-recognition.service';
import { PpeDetectionService } from './ppe-detection.service';
import { AnalyzeImageDto } from '../dto/analyze-image.dto';
import { ImageAnalysisResultDto } from '../dto/image-analysis-result.dto';

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  constructor(
    private readonly imageAnalysisService: ImageAnalysisService,
    private readonly faceRecognitionService: FaceRecognitionService,
    private readonly ppeDetectionService: PpeDetectionService,
  ) {}

  async analyzeImage(dto: AnalyzeImageDto): Promise<ImageAnalysisResultDto> {
    const startTime = Date.now();
    
    const result: ImageAnalysisResultDto = {
      processingTime: 0,
      model: dto.model || 'yolov8',
    };

    try {
      const features = dto.features || ['objects', 'labels'];

      // Run requested analysis features in parallel
      const tasks: Promise<any>[] = [];

      if (features.includes('objects') || features.includes('labels')) {
        tasks.push(
          this.imageAnalysisService.detectObjects(dto.imageBuffer, dto.imageUrl, dto.model)
        );
      }

      if (features.includes('text')) {
        tasks.push(
          this.imageAnalysisService.extractText(dto.imageBuffer, dto.imageUrl)
        );
      }

      if (features.includes('quality')) {
        tasks.push(
          this.imageAnalysisService.assessQuality(dto.imageBuffer, dto.imageUrl)
        );
      }

      if (dto.detectFaces || features.includes('faces')) {
        tasks.push(
          this.faceRecognitionService.detectFaces(dto.imageBuffer, dto.imageUrl, false)
        );
      }

      if (dto.detectPpe || features.includes('ppe')) {
        tasks.push(
          this.ppeDetectionService.detectPpe(dto.imageBuffer)
        );
      }

      // Wait for all tasks
      const results = await Promise.allSettled(tasks);

      // Combine results
      let taskIndex = 0;
      
      if (features.includes('objects') || features.includes('labels')) {
        const objectResult = results[taskIndex++];
        if (objectResult.status === 'fulfilled') {
          result.objects = objectResult.value.objects;
          result.labels = objectResult.value.labels;
        }
      }

      if (features.includes('text')) {
        const textResult = results[taskIndex++];
        if (textResult.status === 'fulfilled') {
          result.text = textResult.value;
        }
      }

      if (features.includes('quality')) {
        const qualityResult = results[taskIndex++];
        if (qualityResult.status === 'fulfilled') {
          result.quality = qualityResult.value;
        }
      }

      if (dto.detectFaces || features.includes('faces')) {
        const faceResult = results[taskIndex++];
        if (faceResult.status === 'fulfilled') {
          result.faces = faceResult.value.faces;
        }
      }

      if (dto.detectPpe || features.includes('ppe')) {
        const ppeResult = results[taskIndex++];
        if (ppeResult.status === 'fulfilled') {
          result.ppe = ppeResult.value;
        }
      }

      result.processingTime = Date.now() - startTime;
      result.imageUrl = dto.imageUrl;

      return result;
    } catch (error) {
      this.logger.error(`Image analysis failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
