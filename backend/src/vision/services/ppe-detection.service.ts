import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnnxRuntimeService } from './onnx-runtime.service';

/**
 * PPE Detection Service using local ONNX YOLOv8 model
 * Detects: person and safety equipment (helmet, vest, etc.)
 */
@Injectable()
export class PpeDetectionService implements OnModuleInit {
  private readonly logger = new Logger(PpeDetectionService.name);
  private readonly modelName = 'yolov8n.onnx';

  // PPE class mapping (custom trained or COCO classes)
  private readonly ppeClasses = {
    person: 0,
    helmet: -1, // Not in standard COCO, would need custom training
    vest: -1,
    gloves: -1,
    boots: -1,
    mask: -1,
  };

  constructor(
    private readonly onnxRuntime: OnnxRuntimeService,
  ) {}

  async onModuleInit() {
    try {
      // Preload the YOLOv8 model
      await this.onnxRuntime.loadModel(this.modelName);
      this.logger.log('✅ PPE Detection model loaded');
    } catch (error) {
      this.logger.error(`❌ Failed to load PPE model: ${error.message}`);
    }
  }

  /**
   * Detect objects in image using YOLOv8
   * NOTE: Standard YOLOv8 (COCO) only detects 'person', not specific PPE items
   * For full PPE detection, you need a custom-trained model with PPE classes
   */
  async detectPpe(
    imageBuffer: Buffer,
  ): Promise<{
    persons: number;
    detections: Array<{
      class: number;
      className: string;
      confidence: number;
      box: { x: number; y: number; width: number; height: number };
    }>;
    helmet: boolean;
    vest: boolean;
    gloves: boolean;
    boots: boolean;
    mask: boolean;
    overallCompliance: boolean;
    confidence: number;
  }> {
    try {
      // Preprocess image
      const { tensor, originalWidth, originalHeight } =
        await this.onnxRuntime.preprocessImageForYolo(imageBuffer);

      // Run inference
      const outputs = await this.onnxRuntime.runInference(this.modelName, {
        images: tensor,
      });

      // Get output tensor (YOLOv8 output is named 'output0')
      const outputTensor = outputs.output0;

      // Post-process detections
      const detections = this.onnxRuntime.postprocessYoloOutput(
        outputTensor,
        originalWidth,
        originalHeight,
        0.5, // confidence threshold
        0.45, // IoU threshold
      );

      // Count persons detected
      const persons = detections.filter((d) => d.className === 'person').length;

      // NOTE: Standard COCO YOLOv8 doesn't detect PPE items
      // These would require custom training with PPE dataset
      // For now, returning false for all PPE items
      return {
        persons,
        detections,
        helmet: false, // Requires custom model
        vest: false, // Requires custom model
        gloves: false, // Requires custom model
        boots: false, // Requires custom model
        mask: false, // Requires custom model
        overallCompliance: false,
        confidence: persons > 0 ? Math.max(...detections.map((d) => d.confidence)) : 0,
      };
    } catch (error) {
      this.logger.error(`PPE detection failed: ${error.message}`);

      // Fallback
      return {
        persons: 0,
        detections: [],
        helmet: false,
        vest: false,
        gloves: false,
        boots: false,
        mask: false,
        overallCompliance: false,
        confidence: 0,
      };
    }
  }

  /**
   * Check PPE compliance
   * NOTE: Requires custom PPE-trained model for actual PPE detection
   */
  async checkCompliance(
    imageBuffer: Buffer,
    requiredPpe: string[] = ['helmet', 'vest'],
  ): Promise<{ compliant: boolean; missing: string[]; detected: string[]; persons: number }> {
    const result = await this.detectPpe(imageBuffer);

    const detected: string[] = [];
    const missing: string[] = [];

    for (const item of requiredPpe) {
      if (result[item]) {
        detected.push(item);
      } else {
        missing.push(item);
      }
    }

    this.logger.warn(
      '⚠️ Standard YOLOv8 (COCO) cannot detect PPE items. Use custom-trained model for actual PPE detection.',
    );

    return {
      compliant: missing.length === 0,
      missing,
      detected,
      persons: result.persons,
    };
  }
}
