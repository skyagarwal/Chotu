import { Injectable, Logger } from '@nestjs/common';
import { OnnxRuntimeService } from './onnx-runtime.service';
import {
  PacketCountingDto,
  PacketCountingResult,
  PacketSize,
  PacketType,
} from '../dto/packet-counting.dto';

/**
 * Advanced Packet Counting Service
 * Counts packages/packets with size and type detection
 * Use Case: Warehouse inventory, delivery verification
 */
@Injectable()
export class PacketCountingService {
  private readonly logger = new Logger(PacketCountingService.name);
  private readonly modelName = 'yolov8n.onnx';

  constructor(private readonly onnxRuntime: OnnxRuntimeService) {}

  /**
   * Count packets with size and type detection
   */
  async countPackets(dto: PacketCountingDto): Promise<PacketCountingResult> {
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
        dto.confidenceThreshold || 0.5,
        0.45,
      );

      // Filter for package-like objects
      const packageClasses = [
        'suitcase',
        'backpack',
        'handbag',
        'bottle', // Containers
        'cup',
        'bowl',
        'book', // Box-like
        'laptop',
        'cell phone',
        'keyboard', // Tech items
        'clock',
        'vase',
        'scissors',
        'teddy bear', // Various items
      ];

      const packages = detections.filter((d) =>
        packageClasses.includes(d.className),
      );

      // Analyze each package
      const packets: PacketCountingResult['packets'] = packages.map(
        (pkg, index) => {
          const size = this.determinePacketSize(pkg.box);
          const type = this.determinePacketType(pkg.className);

          return {
            packetId: `PKG_${index + 1}`,
            size,
            type,
            confidence: pkg.confidence,
            dimensions: {
              width: pkg.box.width,
              height: pkg.box.height,
            },
            boundingBox: pkg.box,
          };
        },
      );

      // Group by similarity if requested
      const groups = dto.groupBySimilarity
        ? this.groupBySimilarity(packets)
        : undefined;

      // Count by size
      const bySize = {
        [PacketSize.SMALL]: packets.filter((p) => p.size === PacketSize.SMALL).length,
        [PacketSize.MEDIUM]: packets.filter((p) => p.size === PacketSize.MEDIUM).length,
        [PacketSize.LARGE]: packets.filter((p) => p.size === PacketSize.LARGE).length,
        [PacketSize.EXTRA_LARGE]: packets.filter((p) => p.size === PacketSize.EXTRA_LARGE).length,
      };

      // Count by type
      const byType: { [key: string]: number } = {};
      packets.forEach((p) => {
        byType[p.type] = (byType[p.type] || 0) + 1;
      });

      // Calculate discrepancy
      const totalPackets = packets.length;
      const match = dto.expectedCount ? totalPackets === dto.expectedCount : true;
      const discrepancy = dto.expectedCount
        ? totalPackets - dto.expectedCount
        : 0;

      // Assess image quality
      const quality = this.assessImageQuality(packets, originalWidth, originalHeight);

      const result: PacketCountingResult = {
        totalPackets,
        expectedCount: dto.expectedCount,
        match,
        discrepancy,
        bySize,
        byType,
        packets,
        groups,
        quality,
        summary: this.generateSummary(totalPackets, dto.expectedCount, bySize),
        recommendations: this.generateRecommendations(quality, discrepancy),
      };

      this.logger.log(
        `Counted ${totalPackets} packets (Expected: ${dto.expectedCount || 'N/A'}, Match: ${match})`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Packet counting failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Determine packet size based on bounding box dimensions
   */
  private determinePacketSize(box: any): PacketSize {
    const area = box.width * box.height;
    
    if (area < 10000) return PacketSize.SMALL;
    if (area < 30000) return PacketSize.MEDIUM;
    if (area < 60000) return PacketSize.LARGE;
    return PacketSize.EXTRA_LARGE;
  }

  /**
   * Determine packet type from detected class
   */
  private determinePacketType(className: string): PacketType {
    const typeMapping: { [key: string]: PacketType } = {
      suitcase: PacketType.BOX,
      backpack: PacketType.BAG,
      handbag: PacketType.BAG,
      bottle: PacketType.CONTAINER,
      cup: PacketType.CONTAINER,
      bowl: PacketType.CONTAINER,
      book: PacketType.BOX,
      laptop: PacketType.BOX,
    };

    return typeMapping[className] || PacketType.CUSTOM;
  }

  /**
   * Group packets by visual similarity
   */
  private groupBySimilarity(packets: any[]): any[] {
    const groups: any[] = [];
    let groupId = 1;

    packets.forEach((packet) => {
      // Find similar existing group
      let foundGroup = groups.find(
        (g) =>
          g.size === packet.size &&
          g.type === packet.type &&
          Math.abs(g.avgWidth - packet.dimensions.width) < 50 &&
          Math.abs(g.avgHeight - packet.dimensions.height) < 50,
      );

      if (foundGroup) {
        foundGroup.count++;
        foundGroup.packets.push(packet.packetId);
        packet.groupId = foundGroup.groupId;
      } else {
        const newGroup = {
          groupId: `GRP_${groupId++}`,
          count: 1,
          size: packet.size,
          type: packet.type,
          similarity: 1.0,
          avgWidth: packet.dimensions.width,
          avgHeight: packet.dimensions.height,
          packets: [packet.packetId],
        };
        groups.push(newGroup);
        packet.groupId = newGroup.groupId;
      }
    });

    return groups.map(({ packets, avgWidth, avgHeight, ...rest }) => rest);
  }

  /**
   * Assess image quality for counting
   */
  private assessImageQuality(
    packets: any[],
    imageWidth: number,
    imageHeight: number,
  ): PacketCountingResult['quality'] {
    const issues: string[] = [];
    let occlusion = false;
    let overlap = false;

    // Check for overlapping bounding boxes
    for (let i = 0; i < packets.length; i++) {
      for (let j = i + 1; j < packets.length; j++) {
        if (this.boxesOverlap(packets[i].boundingBox, packets[j].boundingBox)) {
          overlap = true;
          issues.push('Some packets are overlapping');
          break;
        }
      }
      if (overlap) break;
    }

    // Check for edge occlusion
    packets.forEach((p) => {
      const box = p.boundingBox;
      if (
        box.x <= 10 ||
        box.y <= 10 ||
        box.x + box.width >= imageWidth - 10 ||
        box.y + box.height >= imageHeight - 10
      ) {
        occlusion = true;
        issues.push('Some packets may be cut off at image edges');
      }
    });

    // Determine overall quality
    let imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
    if (issues.length === 0) {
      imageQuality = 'excellent';
    } else if (issues.length === 1) {
      imageQuality = 'good';
    } else if (issues.length === 2) {
      imageQuality = 'fair';
    } else {
      imageQuality = 'poor';
    }

    return { imageQuality, occlusion, overlap, issues };
  }

  /**
   * Check if two bounding boxes overlap
   */
  private boxesOverlap(box1: any, box2: any): boolean {
    return !(
      box1.x + box1.width < box2.x ||
      box2.x + box2.width < box1.x ||
      box1.y + box1.height < box2.y ||
      box2.y + box2.height < box1.y
    );
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    total: number,
    expected?: number,
    bySize?: any,
  ): string {
    let summary = `Total: ${total} packets detected`;
    
    if (expected !== undefined) {
      const diff = total - expected;
      if (diff === 0) {
        summary += ` ✅ (matches expected ${expected})`;
      } else if (diff > 0) {
        summary += ` ⚠️ (${diff} more than expected ${expected})`;
      } else {
        summary += ` ⚠️ (${Math.abs(diff)} less than expected ${expected})`;
      }
    }

    if (bySize) {
      const sizeCounts = Object.entries(bySize)
        .filter(([_, count]) => (count as number) > 0)
        .map(([size, count]) => `${count} ${size}`)
        .join(', ');
      if (sizeCounts) {
        summary += ` | Sizes: ${sizeCounts}`;
      }
    }

    return summary;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    quality: any,
    discrepancy?: number,
  ): string[] {
    const recommendations: string[] = [];

    if (quality.imageQuality === 'poor' || quality.imageQuality === 'fair') {
      recommendations.push('Consider retaking photo with better lighting and angle');
    }

    if (quality.overlap) {
      recommendations.push('Separate overlapping packets for accurate count');
    }

    if (quality.occlusion) {
      recommendations.push('Ensure all packets are fully visible in frame');
    }

    if (discrepancy && discrepancy !== 0) {
      recommendations.push(
        `Verify count manually - ${Math.abs(discrepancy)} packet(s) ${discrepancy > 0 ? 'extra' : 'missing'}`,
      );
    }

    return recommendations;
  }
}
