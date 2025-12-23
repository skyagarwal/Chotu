import { Injectable, Logger } from '@nestjs/common';
import { OnnxRuntimeService } from './onnx-runtime.service';
import { CountingTarget, CountingResult } from '../dto/counting.dto';

/**
 * Object Counting Service
 * Count people, objects, items from images
 */
@Injectable()
export class CountingService {
  private readonly logger = new Logger(CountingService.name);
  private readonly modelName = 'yolov8n.onnx';

  constructor(private readonly onnxRuntime: OnnxRuntimeService) {}

  /**
   * Count objects in image
   */
  async countObjects(
    imageBuffer: Buffer,
    target: CountingTarget = CountingTarget.ALL,
    specificClasses?: string[],
    confidenceThreshold: number = 0.5,
  ): Promise<CountingResult> {
    try {
      // Run object detection
      const { tensor, originalWidth, originalHeight } =
        await this.onnxRuntime.preprocessImageForYolo(imageBuffer);

      const outputs = await this.onnxRuntime.runInference(this.modelName, {
        images: tensor,
      });

      let detections = this.onnxRuntime.postprocessYoloOutput(
        outputs.output0,
        originalWidth,
        originalHeight,
        confidenceThreshold,
        0.45,
      );

      // Filter by target
      detections = this.filterByTarget(detections, target, specificClasses);

      // Count and group by class
      const breakdown = this.groupAndCount(detections);

      const totalCount = Object.values(breakdown).reduce(
        (sum, item: any) => sum + item.count,
        0,
      );

      return {
        totalCount,
        breakdown,
        summary: this.generateSummary(totalCount, breakdown, target),
      };
    } catch (error) {
      this.logger.error(`Object counting failed: ${error.message}`);
      throw error;
    }
  }

  private filterByTarget(
    detections: any[],
    target: CountingTarget,
    specificClasses?: string[],
  ): any[] {
    // If specific classes provided, use them
    if (specificClasses && specificClasses.length > 0) {
      return detections.filter((d) => specificClasses.includes(d.className));
    }

    // Otherwise filter by target type
    switch (target) {
      case CountingTarget.PEOPLE:
        return detections.filter((d) => d.className === 'person');

      case CountingTarget.VEHICLES:
        return detections.filter((d) =>
          ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(d.className),
        );

      case CountingTarget.ITEMS:
        // Exclude people and vehicles
        return detections.filter(
          (d) =>
            d.className !== 'person' &&
            !['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(d.className),
        );

      case CountingTarget.OBJECTS:
      case CountingTarget.ALL:
      default:
        return detections;
    }
  }

  private groupAndCount(detections: any[]): CountingResult['breakdown'] {
    const breakdown: CountingResult['breakdown'] = {};

    for (const detection of detections) {
      const className = detection.className;

      if (!breakdown[className]) {
        breakdown[className] = {
          count: 0,
          confidence: 0,
          locations: [],
        };
      }

      breakdown[className].count++;
      breakdown[className].confidence = Math.max(
        breakdown[className].confidence,
        detection.confidence,
      );
      breakdown[className].locations.push(detection.box);
    }

    return breakdown;
  }

  private generateSummary(
    totalCount: number,
    breakdown: CountingResult['breakdown'],
    target: CountingTarget,
  ): string {
    if (totalCount === 0) {
      return `No ${target} detected in the image`;
    }

    const items = Object.entries(breakdown)
      .map(([className, data]: [string, any]) => `${data.count} ${className}${data.count > 1 ? 's' : ''}`)
      .join(', ');

    return `Total: ${totalCount} | Detected: ${items}`;
  }

  /**
   * Count people specifically (common use case)
   */
  async countPeople(imageBuffer: Buffer): Promise<number> {
    const result = await this.countObjects(
      imageBuffer,
      CountingTarget.PEOPLE,
      undefined,
      0.5,
    );
    return result.totalCount;
  }
}
