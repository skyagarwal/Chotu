import { Injectable, Logger } from '@nestjs/common';
import { OnnxRuntimeService } from './onnx-runtime.service';
import { FoodQualityLevel, FoodQualityResult } from '../dto/food-quality.dto';

/**
 * Food Quality Assessment Service
 * Uses computer vision to assess food quality, freshness, and visual appeal
 */
@Injectable()
export class FoodQualityService {
  private readonly logger = new Logger(FoodQualityService.name);
  private readonly modelName = 'yolov8n.onnx';

  constructor(private readonly onnxRuntime: OnnxRuntimeService) {}

  /**
   * Analyze food quality from image
   * Detects: freshness, color, portion size, plating, presentation
   */
  async analyzeFoodQuality(imageBuffer: Buffer): Promise<FoodQualityResult> {
    try {
      // Run object detection to identify food items
      const { tensor, originalWidth, originalHeight } =
        await this.onnxRuntime.preprocessImageForYolo(imageBuffer);

      const outputs = await this.onnxRuntime.runInference(this.modelName, {
        images: tensor,
      });

      const detections = this.onnxRuntime.postprocessYoloOutput(
        outputs.output0,
        originalWidth,
        originalHeight,
        0.3, // Lower threshold for food items
        0.45,
      );

      // Filter for food-related classes (COCO dataset)
      const foodClasses = [
        'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
        'hot dog', 'pizza', 'donut', 'cake', 'bottle', 'wine glass',
        'cup', 'fork', 'knife', 'spoon', 'bowl',
      ];

      const foodItems = detections.filter((d) =>
        foodClasses.includes(d.className),
      );

      // Analyze quality based on detection confidence and count
      const quality = this.assessQuality(foodItems, detections);
      const freshness = this.assessFreshness(foodItems);
      const visualAppeal = this.assessVisualAppeal(foodItems, detections);

      return {
        quality,
        confidence: foodItems.length > 0 
          ? Math.max(...foodItems.map((f) => f.confidence))
          : 0,
        freshness,
        visualAppeal,
        detectedIssues: this.detectIssues(foodItems, detections),
        recommendation: this.generateRecommendation(quality, freshness),
        details: {
          color: this.analyzeColor(foodItems),
          texture: 'Unable to determine from static image',
          portionSize: this.analyzePortionSize(foodItems),
          plating: this.analyzePlating(foodItems, detections),
        },
      };
    } catch (error) {
      this.logger.error(`Food quality analysis failed: ${error.message}`);
      throw error;
    }
  }

  private assessQuality(foodItems: any[], allDetections: any[]): FoodQualityLevel {
    if (foodItems.length === 0) {
      return FoodQualityLevel.POOR;
    }

    const avgConfidence = foodItems.reduce((sum, item) => sum + item.confidence, 0) / foodItems.length;

    // Check for utensils and presentation
    const hasUtensils = allDetections.some((d) =>
      ['fork', 'knife', 'spoon'].includes(d.className),
    );
    const hasPlating = allDetections.some((d) =>
      ['bowl', 'cup', 'wine glass'].includes(d.className),
    );

    if (avgConfidence > 0.8 && hasUtensils && hasPlating) {
      return FoodQualityLevel.EXCELLENT;
    } else if (avgConfidence > 0.6 && (hasUtensils || hasPlating)) {
      return FoodQualityLevel.GOOD;
    } else if (avgConfidence > 0.4) {
      return FoodQualityLevel.FAIR;
    } else {
      return FoodQualityLevel.POOR;
    }
  }

  private assessFreshness(foodItems: any[]): number {
    // Higher confidence = better freshness (assumption)
    if (foodItems.length === 0) return 0;
    const avgConfidence = foodItems.reduce((sum, item) => sum + item.confidence, 0) / foodItems.length;
    return Math.round(avgConfidence * 100);
  }

  private assessVisualAppeal(foodItems: any[], allDetections: any[]): number {
    // Visual appeal based on variety, plating, and presentation
    const varietyScore = Math.min(foodItems.length * 10, 40); // Max 40 points
    const platingScore = allDetections.some((d) => ['bowl', 'wine glass'].includes(d.className)) ? 30 : 0;
    const utensilScore = allDetections.some((d) => ['fork', 'knife', 'spoon'].includes(d.className)) ? 30 : 0;

    return Math.min(varietyScore + platingScore + utensilScore, 100);
  }

  private detectIssues(foodItems: any[], allDetections: any[]): string[] {
    const issues: string[] = [];

    if (foodItems.length === 0) {
      issues.push('No food items detected');
    }

    if (!allDetections.some((d) => ['bowl', 'cup'].includes(d.className))) {
      issues.push('No proper plating detected');
    }

    if (foodItems.length > 0 && foodItems.every((f) => f.confidence < 0.5)) {
      issues.push('Low quality image or poor food presentation');
    }

    return issues;
  }

  private generateRecommendation(quality: FoodQualityLevel, freshness: number): string {
    if (quality === FoodQualityLevel.EXCELLENT && freshness > 80) {
      return 'Excellent quality food! Safe to serve to customers.';
    } else if (quality === FoodQualityLevel.GOOD && freshness > 60) {
      return 'Good quality food. Suitable for serving.';
    } else if (quality === FoodQualityLevel.FAIR) {
      return 'Fair quality. Consider improving presentation or freshness.';
    } else if (quality === FoodQualityLevel.POOR) {
      return 'Poor quality detected. Do not serve to customers.';
    } else {
      return 'Quality assessment inconclusive. Manual inspection recommended.';
    }
  }

  private analyzeColor(foodItems: any[]): string {
    if (foodItems.length === 0) return 'No food detected';
    const classes = foodItems.map((f) => f.className);
    return `Detected: ${classes.join(', ')}`;
  }

  private analyzePortionSize(foodItems: any[]): string {
    if (foodItems.length === 0) return 'Unknown';
    if (foodItems.length === 1) return 'Single item';
    if (foodItems.length <= 3) return 'Small to medium portion';
    return 'Large portion';
  }

  private analyzePlating(foodItems: any[], allDetections: any[]): string {
    const hasPlate = allDetections.some((d) => ['bowl', 'cup'].includes(d.className));
    const hasUtensils = allDetections.some((d) => ['fork', 'knife', 'spoon'].includes(d.className));

    if (hasPlate && hasUtensils) return 'Professional plating';
    if (hasPlate) return 'Basic plating';
    return 'No plating detected';
  }
}
