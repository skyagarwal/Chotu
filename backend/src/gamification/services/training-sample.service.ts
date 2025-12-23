import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GamificationSettingsService } from './gamification-settings.service';

/**
 * TrainingSampleService - Training data management
 */
@Injectable()
export class TrainingSampleService {
  private readonly logger = new Logger(TrainingSampleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: GamificationSettingsService,
  ) {}

  /**
   * Create training sample from game or conversation
   */
  async createTrainingSample(data: {
    userId: number | string;
    sessionId: string;
    gameSessionId?: string;
    text: string;
    intent: string;
    entities?: any[];
    confidence: number;
    language?: string;
    tone?: string;
    context?: any;
    source?: 'game' | 'conversation' | 'manual';
  }): Promise<any> {
    try {
      const minConfidence = await this.settings.getMinConfidenceAutoSave();
      const autoApprove = data.confidence >= minConfidence;

      const sample = await this.prisma.trainingSample.create({
        data: {
          userId: typeof data.userId === 'string' ? parseInt(data.userId) : data.userId,
          sessionId: data.sessionId,
          gameSessionId: data.gameSessionId,
          text: data.text,
          intent: data.intent,
          entities: data.entities || [],
          confidence: data.confidence,
          language: data.language || 'en',
          tone: data.tone,
          context: data.context || {},
          source: data.source || 'game',
          approved: autoApprove,
          reviewStatus: autoApprove ? 'approved' : 'pending',
          approvedAt: autoApprove ? new Date() : null,
          approvedBy: autoApprove ? 'auto' : null,
        },
      });

      this.logger.log(`${autoApprove ? '✅ Auto-approved' : '📝 Created'} training sample: ${sample.id}`);
      return sample;
    } catch (error) {
      this.logger.error(`Failed to create training sample:`, error);
      throw error;
    }
  }

  async approveSample(id: number, approvedBy: string): Promise<void> {
    await this.prisma.trainingSample.update({
      where: { id },
      data: {
        approved: true,
        reviewStatus: 'approved',
        approvedBy,
        approvedAt: new Date(),
      },
    });
    this.logger.log(`✅ Approved training sample ${id}`);
  }

  async getApprovedSamples(limit = 1000): Promise<any[]> {
    return this.prisma.trainingSample.findMany({
      where: {
        approved: true,
        reviewStatus: 'approved',
      },
      take: limit,
    });
  }

  /**
   * Reject a training sample
   */
  async rejectSample(id: number, rejectedBy: string): Promise<any> {
    const sample = await this.prisma.trainingSample.update({
      where: { id },
      data: {
        approved: false,
        reviewStatus: 'rejected',
        approvedBy: rejectedBy,
        approvedAt: new Date(),
      },
    });
    this.logger.log(`❌ Rejected training sample ${id}`);
    return sample;
  }

  /**
   * Get training sample statistics
   */
  async getTrainingSampleStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    autoApproved: number;
  }> {
    const [total, pending, approved, rejected, autoApproved] = await Promise.all([
      this.prisma.trainingSample.count(),
      this.prisma.trainingSample.count({ where: { reviewStatus: 'pending' } }),
      this.prisma.trainingSample.count({ where: { reviewStatus: 'approved' } }),
      this.prisma.trainingSample.count({ where: { reviewStatus: 'rejected' } }),
      this.prisma.trainingSample.count({ 
        where: { 
          reviewStatus: 'approved',
          approvedBy: 'auto',
        },
      }),
    ]);

    return { total, pending, approved, rejected, autoApproved };
  }
}
