import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';

export interface TrainingDataSample {
  text: string;
  intent: string;
  entities: Record<string, any>;
  tone?: string;
  sentiment?: string;
  confidence: number;
  source: 'nlu' | 'llm-fallback' | 'manual';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  userId?: string;
  sessionId?: string;
  language: string;
}

@Injectable()
export class NluTrainingDataService {
  private readonly logger = new Logger(NluTrainingDataService.name);
  private readonly labelStudioUrl: string;
  private readonly labelStudioApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.labelStudioUrl = this.config.get('LABEL_STUDIO_URL', 'http://localhost:8080');
    this.labelStudioApiKey = this.config.get('LABEL_STUDIO_API_KEY', '');
  }

  /**
   * Save training sample to database AND Label Studio
   * This implements the continuous learning loop
   */
  async captureTrainingSample(sample: TrainingDataSample): Promise<void> {
    try {
      // 0. Filter out spam/common short messages
      const ignoredTexts = ['hi', 'hello', 'hey', 'ok', 'yes', 'no', 'thanks', 'thank you', 'bye'];
      if (ignoredTexts.includes(sample.text.trim().toLowerCase()) || sample.text.length < 2) {
        return;
      }

      // 1. Check for duplicates (Deduplication) using Prisma ORM
      const existing = await this.prisma.nluTrainingData.findUnique({
        where: { text: sample.text },
        select: { id: true },
      });
      
      if (existing) {
        this.logger.debug(`Skipping duplicate training sample: "${sample.text}"`);
        return;
      }

      // 2. Auto-approve high confidence samples (Auto-Training)
      if (sample.confidence > 0.95 && sample.source === 'llm-fallback') {
        sample.reviewStatus = 'approved';
        this.logger.log(`✨ Auto-approved high confidence sample: "${sample.text}" (${sample.intent})`);
      }

      // 3. Save to database for immediate access
      await this.saveToDatabase(sample);

      // 4. Send to Label Studio for human review (Only if pending and not auto-approved)
      if (sample.source === 'llm-fallback' && sample.reviewStatus === 'pending') {
        await this.sendToLabelStudio(sample);
      }

      this.logger.log(
        `Captured training sample: ${sample.intent} (${sample.source}) - "${sample.text.substring(0, 50)}..."`,
      );
    } catch (error) {
      this.logger.error(`Failed to capture training sample: ${error.message}`);
      // Don't throw - training data capture is non-critical
    }
  }

  /**
   * Save to PostgreSQL for analytics and batch export
   */
  private async saveToDatabase(sample: TrainingDataSample): Promise<void> {
    // Now using Prisma ORM with NluTrainingData model
    try {
      await this.prisma.nluTrainingData.create({
        data: {
          text: sample.text,
          intent: sample.intent,
          entities: sample.entities || {},
          tone: sample.tone || null,
          sentiment: sample.sentiment || null,
          confidence: sample.confidence,
          source: sample.source,
          reviewStatus: sample.reviewStatus,
          userId: sample.userId || null,
          sessionId: sample.sessionId || null,
          language: sample.language,
        },
      });
    } catch (error: any) {
      // Ignore unique constraint violations (duplicates)
      if (error.code === 'P2002') {
        this.logger.debug(`Duplicate training sample ignored: "${sample.text.substring(0, 30)}..."`);
        return;
      }
      throw error;
    }
  }

  /**
   * Send to Label Studio for human annotation/review
   */
  private async sendToLabelStudio(sample: TrainingDataSample): Promise<void> {
    if (!this.labelStudioApiKey) {
      this.logger.debug('Label Studio API key not configured, skipping');
      return;
    }

    try {
      const task = {
        data: {
          text: sample.text,
          language: sample.language,
          suggested_intent: sample.intent,
          suggested_entities: sample.entities,
          suggested_tone: sample.tone,
          llm_confidence: sample.confidence,
          source: sample.source,
        },
        annotations: [
          {
            result: [
              {
                value: {
                  start: 0,
                  end: sample.text.length,
                  text: sample.text,
                  labels: [sample.intent],
                },
                from_name: 'intent',
                to_name: 'text',
                type: 'labels',
              },
            ],
          },
        ],
      };

      await firstValueFrom(
        this.httpService.post(
          `${this.labelStudioUrl}/api/projects/1/tasks`,
          task,
          {
            headers: {
              Authorization: `Token ${this.labelStudioApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.debug('Sent sample to Label Studio for review');
    } catch (error) {
      this.logger.warn(`Label Studio submission failed: ${error.message}`);
    }
  }

  /**
   * Get pending training samples for admin review
   */
  async getPendingSamples(limit: number = 100): Promise<any[]> {
    return this.prisma.nluTrainingData.findMany({
      where: { reviewStatus: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Approve training sample (admin action)
   */
  async approveSample(sampleId: string): Promise<void> {
    await this.prisma.nluTrainingData.update({
      where: { id: sampleId },
      data: { reviewStatus: 'approved' },
    });

    this.logger.log(`Training sample ${sampleId} approved`);
  }

  /**
   * Get count of samples needing review
   */
  async getPendingCount(): Promise<number> {
    return this.prisma.nluTrainingData.count({
      where: { reviewStatus: 'pending' },
    });
  }

  /**
   * Export approved training data for model retraining
   */
  async exportForTraining(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ text: string; intent: string; entities: any }[]> {
    const samples = await this.prisma.nluTrainingData.findMany({
      where: {
        reviewStatus: 'approved',
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
      },
      select: {
        text: true,
        intent: true,
        entities: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return samples.map(s => ({
      text: s.text,
      intent: s.intent,
      entities: typeof s.entities === 'string' ? JSON.parse(s.entities) : s.entities,
    }));
  }
}
