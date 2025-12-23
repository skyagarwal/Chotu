import { Injectable, Logger } from '@nestjs/common';
import { OnnxRuntimeService } from './onnx-runtime.service';
import {
  UniformDetectionDto,
  UniformDetectionResult,
  UniformComponent,
  UniformType,
} from '../dto/uniform-detection.dto';

/**
 * Uniform Detection Service
 * Detects if riders/workers are wearing required uniform components
 * Use Case: Delivery rider compliance, security checks
 */
@Injectable()
export class UniformDetectionService {
  private readonly logger = new Logger(UniformDetectionService.name);
  private readonly modelName = 'yolov8n.onnx';

  // Training data storage (in-memory for now)
  private trainingData: Array<{
    imageBuffer: Buffer;
    labels: {
      uniformType: UniformType;
      components: UniformComponent[];
      boundingBoxes: any[];
    };
    timestamp: Date;
  }> = [];

  constructor(private readonly onnxRuntime: OnnxRuntimeService) {}

  /**
   * Detect uniform compliance
   */
  async detectUniform(dto: UniformDetectionDto): Promise<UniformDetectionResult> {
    try {
      if (!dto.imageBuffer) {
        throw new Error('Image buffer is required');
      }

      // Run object detection
      const { tensor, originalWidth, originalHeight } =
        await this.onnxRuntime.preprocessImageForYolo(dto.imageBuffer);

      const outputs = await this.onnxRuntime.runInference(this.modelName, {
        images: tensor,
      });

      const detections = this.onnxRuntime.postprocessYoloOutput(
        outputs.output0,
        originalWidth,
        originalHeight,
        dto.confidenceThreshold || 0.6,
        0.45,
      );

      // Check for person
      const person = detections.find((d) => d.className === 'person');
      if (!person) {
        return {
          isWearingUniform: false,
          compliance: 0,
          confidence: 0,
          detectedComponents: {},
          missingComponents: dto.requiredComponents || [],
          violations: ['No person detected in image'],
          personDetected: false,
          recommendation: 'Please ensure rider is visible in the image',
        };
      }

      // Analyze uniform components
      const result = this.analyzeUniformComponents(
        detections,
        dto.uniformType || UniformType.DELIVERY_RIDER,
        dto.requiredComponents,
      );

      // Check branding if requested
      if (dto.checkBranding && dto.expectedBrand) {
        result.brandingDetected = {
          detected: false, // TODO: Implement branding detection
          brand: undefined,
          confidence: 0,
        };
      }

      this.logger.log(
        `Uniform detection: ${result.compliance}% compliant (${result.detectedComponents ? Object.keys(result.detectedComponents).length : 0} components)`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Uniform detection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze detected objects for uniform components
   */
  private analyzeUniformComponents(
    detections: any[],
    uniformType: UniformType,
    requiredComponents?: UniformComponent[],
  ): UniformDetectionResult {
    const detectedComponents: UniformDetectionResult['detectedComponents'] = {};
    const violations: string[] = [];

    // Map COCO classes to uniform components (simplified)
    // In production, use custom-trained model for specific uniform detection
    const componentMapping = {
      backpack: UniformComponent.VEST, // Approximation
      tie: UniformComponent.BADGE,
      // Add more mappings based on visual similarity
    };

    // Default required components based on uniform type
    const defaultRequired = this.getRequiredComponents(uniformType);
    const required = requiredComponents || defaultRequired;

    // Detect components from COCO classes
    detections.forEach((detection) => {
      const component = componentMapping[detection.className];
      if (component) {
        detectedComponents[component] = {
          detected: true,
          confidence: detection.confidence,
          boundingBox: detection.box,
        };
      }
    });

    // Check for missing components
    const missingComponents = required.filter(
      (comp) => !detectedComponents[comp]?.detected,
    );

    if (missingComponents.length > 0) {
      violations.push(
        `Missing: ${missingComponents.join(', ')}`,
      );
    }

    // Calculate compliance
    const compliance = Math.round(
      ((required.length - missingComponents.length) / required.length) * 100,
    );

    const isWearingUniform = compliance >= 70; // 70% threshold

    return {
      isWearingUniform,
      compliance,
      confidence: Math.max(...Object.values(detectedComponents).map((c) => c.confidence || 0), 0),
      detectedComponents,
      missingComponents,
      violations,
      personDetected: true,
      recommendation: isWearingUniform
        ? 'Uniform compliance verified'
        : `Please wear: ${missingComponents.join(', ')}`,
    };
  }

  /**
   * Get required components for uniform type
   */
  private getRequiredComponents(uniformType: UniformType): UniformComponent[] {
    switch (uniformType) {
      case UniformType.DELIVERY_RIDER:
        return [
          UniformComponent.HELMET,
          UniformComponent.VEST,
          UniformComponent.SHIRT,
        ];
      case UniformType.SECURITY_GUARD:
        return [
          UniformComponent.SHIRT,
          UniformComponent.PANTS,
          UniformComponent.CAP,
          UniformComponent.BADGE,
        ];
      case UniformType.RESTAURANT_STAFF:
        return [
          UniformComponent.SHIRT,
          UniformComponent.CAP,
        ];
      case UniformType.WAREHOUSE_WORKER:
        return [
          UniformComponent.VEST,
          UniformComponent.HELMET,
          UniformComponent.SHOES,
        ];
      default:
        return [];
    }
  }

  /**
   * Add training data for continuous learning
   */
  async addTrainingData(
    imageBuffer: Buffer,
    labels: {
      uniformType: UniformType;
      components: UniformComponent[];
      boundingBoxes: any[];
    },
  ): Promise<void> {
    this.trainingData.push({
      imageBuffer,
      labels,
      timestamp: new Date(),
    });

    this.logger.log(
      `Added training data: ${labels.components.length} components (Total: ${this.trainingData.length})`,
    );

    // Auto-trigger retraining when enough data collected
    if (this.trainingData.length >= 100) {
      this.logger.log('⚠️ 100+ training samples collected. Consider retraining model.');
    }
  }

  /**
   * Export training data for model fine-tuning
   */
  async exportTrainingData(): Promise<any[]> {
    return this.trainingData.map((data) => ({
      timestamp: data.timestamp,
      labels: data.labels,
      // Image would be exported to file system
    }));
  }
}
