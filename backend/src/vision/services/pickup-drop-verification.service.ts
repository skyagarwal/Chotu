import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PickupDropVerificationDto, PickupDropVerificationResult, PackageCondition, PickupDropType } from '../dto/pickup-drop.dto';
import { OnnxRuntimeService } from './onnx-runtime.service';
import { UniformDetectionService } from './uniform-detection.service';
import { PacketCountingService } from './packet-counting.service';

/**
 * Pickup/Drop Verification Service
 * Comprehensive verification for delivery pickup and drop events
 */
@Injectable()
export class PickupDropVerificationService {
  private readonly logger = new Logger(PickupDropVerificationService.name);

  constructor(
    private readonly onnxRuntime: OnnxRuntimeService,
    private readonly uniformService: UniformDetectionService,
    private readonly packetService: PacketCountingService,
  ) {}

  async verifyPickupDrop(dto: PickupDropVerificationDto): Promise<PickupDropVerificationResult> {
    try {
      if (!dto.imageBuffer) {
        throw new Error('Image buffer is required');
      }

      // 1. Count packages
      const packetsResult = await this.packetService.countPackets({
        imageBuffer: dto.imageBuffer,
        expectedCount: dto.expectedPackages,
        detectSizes: true,
        detectTypes: true,
      });

      // 2. Check rider presence and uniform (if riderId provided)
      let riderDetected;
      if (dto.riderId) {
        const uniformResult = await this.uniformService.detectUniform({
          imageBuffer: dto.imageBuffer,
          uniformType: 'delivery_rider' as any,
        });

        riderDetected = {
          present: uniformResult.personDetected,
          uniformCompliance: uniformResult.isWearingUniform,
          confidence: uniformResult.confidence,
        };
      }

      // 3. Analyze package condition
      const packages = packetsResult.packets.map((p, index) => ({
        packageId: `${dto.orderId || 'PKG'}_${index + 1}`,
        condition: this.assessPackageCondition(p),
        sealed: true, // TODO: Implement seal detection
        damaged: false, // TODO: Implement damage detection
        boundingBox: p.boundingBox,
        confidence: p.confidence,
      }));

      // 4. Check for tampering signs
      const tampering = packages.some((p) => p.condition === PackageCondition.TAMPERED);

      // 5. Compile violations
      const violations: string[] = [];
      if (packetsResult.discrepancy && packetsResult.discrepancy !== 0) {
        violations.push(
          `Package count mismatch: ${packetsResult.totalPackets} found, ${dto.expectedPackages} expected`,
        );
      }
      if (tampering) {
        violations.push('Tampering detected on one or more packages');
      }
      if (riderDetected && !riderDetected.uniformCompliance) {
        violations.push('Rider not in proper uniform');
      }

      // 6. Generate verification result
      const verified = violations.length === 0 && packetsResult.match;

      const result: PickupDropVerificationResult = {
        verified,
        confidence: Math.min(...packages.map((p) => p.confidence)),
        timestamp: new Date(),
        type: dto.type,
        orderId: dto.orderId,
        riderId: dto.riderId,
        packages: {
          detected: packetsResult.totalPackets,
          expected: dto.expectedPackages,
          match: packetsResult.match,
          details: packages,
        },
        packaging: {
          intact: !tampering,
          sealsPresent: packages.every((p) => p.sealed),
          tampering,
          issues: violations.filter((v) => v.includes('Tampering') || v.includes('damaged')),
        },
        riderDetected,
        violations,
        recommendations: this.generateRecommendations(verified, violations),
        summary: this.generateSummary(dto.type, verified, packetsResult.totalPackets),
      };

      this.logger.log(
        `${dto.type} verification: ${verified ? 'PASSED' : 'FAILED'} (${violations.length} violations)`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Pickup/Drop verification failed: ${error.message}`);
      throw error;
    }
  }

  private assessPackageCondition(packet: any): PackageCondition {
    // TODO: Implement ML-based damage detection
    // For now, use confidence as proxy
    if (packet.confidence > 0.9) return PackageCondition.EXCELLENT;
    if (packet.confidence > 0.75) return PackageCondition.GOOD;
    return PackageCondition.DAMAGED;
  }

  private generateRecommendations(verified: boolean, violations: string[]): string[] {
    const recommendations: string[] = [];

    if (!verified) {
      recommendations.push('Do not complete transaction until issues are resolved');
    }

    if (violations.some((v) => v.includes('count mismatch'))) {
      recommendations.push('Recount packages manually');
      recommendations.push('Contact merchant/customer to verify order contents');
    }

    if (violations.some((v) => v.includes('Tampering'))) {
      recommendations.push('Report to supervisor immediately');
      recommendations.push('Take additional photos for evidence');
    }

    if (violations.some((v) => v.includes('uniform'))) {
      recommendations.push('Ensure rider wears proper Mangwale uniform');
    }

    return recommendations;
  }

  private generateSummary(type: PickupDropType, verified: boolean, packageCount: number): string {
    const action = type === PickupDropType.PICKUP ? 'Pickup' : 'Delivery';
    const status = verified ? '✅ VERIFIED' : '⚠️ VERIFICATION FAILED';
    return `${action} ${status} - ${packageCount} package(s)`;
  }
}
