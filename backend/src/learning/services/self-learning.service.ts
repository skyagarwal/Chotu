/**
 * Self-Learning Service
 * 
 * Handles:
 * - High confidence (>0.9) → Auto-approve and train
 * - Medium confidence (0.7-0.9) → Human review
 * - Low confidence (<0.7) → Priority review + Label Studio
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface NLUPrediction {
  text: string;
  intent: string;
  confidence: number;
  entities: Array<{
    entity: string;
    value: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  responseGenerated?: string;
  conversationId?: string;
  userId?: string;
  timestamp?: Date;
}

interface TrainingExample {
  id: string;
  text: string;
  intent: string;
  entities: Array<{ entity: string; value: string; start: number; end: number }>;
  confidence: number;
  status: 'auto_approved' | 'pending_review' | 'approved' | 'rejected' | 'sent_to_label_studio';
  approvedBy?: string;
  approvedAt?: Date;
}

@Injectable()
export class SelfLearningService {
  private readonly logger = new Logger(SelfLearningService.name);
  
  // Confidence thresholds
  private readonly HIGH_CONFIDENCE = 0.9;
  private readonly MEDIUM_CONFIDENCE = 0.7;
  
  // Label Studio config
  private readonly labelStudioUrl: string;
  private readonly labelStudioToken: string;
  private readonly labelStudioProject: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.labelStudioUrl = this.configService.get('LABEL_STUDIO_URL') || 'http://localhost:8080';
    this.labelStudioToken = this.configService.get('LABEL_STUDIO_TOKEN') || '';
    this.labelStudioProject = parseInt(this.configService.get('LABEL_STUDIO_PROJECT') || '1');
  }

  /**
   * Process NLU prediction for learning
   */
  async processPrediction(prediction: NLUPrediction): Promise<{
    action: 'auto_approved' | 'pending_review' | 'label_studio';
    message: string;
  }> {
    const { text, intent, confidence, entities, conversationId, userId } = prediction;
    
    // Check for duplicate
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM nlu_training_data 
      WHERE text = ${text} AND intent = ${intent}
      LIMIT 1
    `;
    
    if (existing.length > 0) {
      return { action: 'auto_approved', message: 'Duplicate - already in training data' };
    }

    // High confidence - Auto approve
    if (confidence >= this.HIGH_CONFIDENCE) {
      await this.autoApprove(prediction);
      return { action: 'auto_approved', message: `Auto-approved with ${(confidence * 100).toFixed(1)}% confidence` };
    }
    
    // Medium confidence - Human review
    if (confidence >= this.MEDIUM_CONFIDENCE) {
      await this.queueForReview(prediction, 'normal');
      return { action: 'pending_review', message: `Queued for human review (${(confidence * 100).toFixed(1)}% confidence)` };
    }
    
    // Low confidence - Priority review + Label Studio
    await this.queueForReview(prediction, 'priority');
    await this.sendToLabelStudio(prediction);
    return { action: 'label_studio', message: `Sent to Label Studio for annotation (${(confidence * 100).toFixed(1)}% confidence)` };
  }

  /**
   * Auto-approve high confidence predictions
   */
  private async autoApprove(prediction: NLUPrediction): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO nlu_training_data 
        (text, intent, entities, confidence, status, auto_approved_at, conversation_id, user_id)
      VALUES 
        (${prediction.text}, ${prediction.intent}, ${JSON.stringify(prediction.entities)}::jsonb, 
         ${prediction.confidence}, 'auto_approved', NOW(), ${prediction.conversationId}, ${prediction.userId})
    `;
    
    this.logger.log(`Auto-approved: "${prediction.text}" → ${prediction.intent} (${prediction.confidence})`);
    
    // Track for auto-approve patterns
    await this.trackAutoApproval(prediction);
  }

  /**
   * Queue prediction for human review
   */
  private async queueForReview(prediction: NLUPrediction, priority: 'normal' | 'priority'): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO nlu_training_data 
        (text, intent, entities, confidence, status, priority, conversation_id, user_id)
      VALUES 
        (${prediction.text}, ${prediction.intent}, ${JSON.stringify(prediction.entities)}::jsonb, 
         ${prediction.confidence}, 'pending_review', ${priority}, ${prediction.conversationId}, ${prediction.userId})
    `;
    
    this.logger.log(`Queued for ${priority} review: "${prediction.text}" → ${prediction.intent}`);
  }

  /**
   * Send to Label Studio for annotation
   */
  private async sendToLabelStudio(prediction: NLUPrediction): Promise<void> {
    if (!this.labelStudioToken) {
      this.logger.warn('Label Studio not configured - skipping');
      return;
    }

    try {
      // Create Label Studio task
      const task = {
        data: {
          text: prediction.text,
          predicted_intent: prediction.intent,
          predicted_entities: prediction.entities,
          confidence: prediction.confidence,
          conversation_id: prediction.conversationId,
          timestamp: new Date().toISOString()
        },
        predictions: [
          {
            model_version: 'chotu-nlu-v1',
            score: prediction.confidence,
            result: [
              {
                from_name: 'intent',
                to_name: 'text',
                type: 'choices',
                value: { choices: [prediction.intent] }
              },
              ...prediction.entities.map((ent, idx) => ({
                id: `entity_${idx}`,
                from_name: 'entity',
                to_name: 'text',
                type: 'labels',
                value: {
                  start: ent.start,
                  end: ent.end,
                  text: ent.value,
                  labels: [ent.entity]
                }
              }))
            ]
          }
        ]
      };

      await firstValueFrom(
        this.httpService.post(
          `${this.labelStudioUrl}/api/projects/${this.labelStudioProject}/import`,
          [task],
          {
            headers: {
              'Authorization': `Token ${this.labelStudioToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      this.logger.log(`Sent to Label Studio: "${prediction.text}"`);
    } catch (error: any) {
      this.logger.error(`Label Studio error: ${error.message}`);
    }
  }

  /**
   * Track auto-approval patterns for model improvement
   */
  private async trackAutoApproval(prediction: NLUPrediction): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO auto_approval_stats (intent, count, avg_confidence, last_approved_at)
      VALUES (${prediction.intent}, 1, ${prediction.confidence}, NOW())
      ON CONFLICT (intent) DO UPDATE SET
        count = auto_approval_stats.count + 1,
        avg_confidence = (auto_approval_stats.avg_confidence * auto_approval_stats.count + ${prediction.confidence}) / (auto_approval_stats.count + 1),
        last_approved_at = NOW()
    `;
  }

  /**
   * Get pending reviews for admin
   */
  async getPendingReviews(
    priority?: 'all' | 'priority' | 'normal',
    limit: number = 50
  ): Promise<TrainingExample[]> {
    let query = `
      SELECT * FROM nlu_training_data 
      WHERE status = 'pending_review'
    `;
    
    if (priority === 'priority') {
      query += ` AND priority = 'priority'`;
    } else if (priority === 'normal') {
      query += ` AND priority = 'normal'`;
    }
    
    query += ` ORDER BY priority DESC, created_at ASC LIMIT ${limit}`;
    
    const results = await this.prisma.$queryRawUnsafe<any[]>(query);
    return results;
  }

  /**
   * Approve training example (by admin)
   */
  async approveExample(
    exampleId: string,
    adminId: string,
    correctedIntent?: string,
    correctedEntities?: any[]
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE nlu_training_data 
      SET 
        status = 'approved',
        approved_by = ${adminId},
        approved_at = NOW(),
        intent = COALESCE(${correctedIntent}, intent),
        entities = COALESCE(${correctedEntities ? JSON.stringify(correctedEntities) : null}::jsonb, entities)
      WHERE id = ${exampleId}::uuid
    `;
    
    this.logger.log(`Example ${exampleId} approved by ${adminId}`);
  }

  /**
   * Reject training example
   */
  async rejectExample(exampleId: string, adminId: string, reason?: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE nlu_training_data 
      SET status = 'rejected', rejected_by = ${adminId}, rejection_reason = ${reason}, rejected_at = NOW()
      WHERE id = ${exampleId}::uuid
    `;
    
    this.logger.log(`Example ${exampleId} rejected by ${adminId}`);
  }

  /**
   * Export approved examples for training
   */
  async exportForTraining(format: 'rasa' | 'json' | 'spacy'): Promise<string> {
    const examples = await this.prisma.$queryRaw<any[]>`
      SELECT text, intent, entities 
      FROM nlu_training_data 
      WHERE status IN ('auto_approved', 'approved')
    `;

    if (format === 'rasa') {
      return this.formatForRasa(examples);
    } else if (format === 'spacy') {
      return this.formatForSpacy(examples);
    }
    
    return JSON.stringify(examples, null, 2);
  }

  private formatForRasa(examples: any[]): string {
    const grouped: Record<string, string[]> = {};
    
    for (const ex of examples) {
      if (!grouped[ex.intent]) grouped[ex.intent] = [];
      grouped[ex.intent].push(ex.text);
    }
    
    let output = 'version: "3.1"\n\nnlu:\n';
    
    for (const [intent, texts] of Object.entries(grouped)) {
      output += `- intent: ${intent}\n  examples: |\n`;
      for (const text of texts) {
        output += `    - ${text}\n`;
      }
      output += '\n';
    }
    
    return output;
  }

  private formatForSpacy(examples: any[]): string {
    const data = examples.map(ex => ({
      text: ex.text,
      entities: ex.entities?.map((e: any) => [e.start, e.end, e.entity]) || []
    }));
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Sync approved annotations from Label Studio
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncFromLabelStudio(): Promise<void> {
    if (!this.labelStudioToken) return;

    try {
      // Get completed tasks
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.labelStudioUrl}/api/projects/${this.labelStudioProject}/tasks`,
          {
            headers: { 'Authorization': `Token ${this.labelStudioToken}` },
            params: { page_size: 100, filter: 'completed' }
          }
        )
      );

      const tasks = response.data.tasks || [];
      
      for (const task of tasks) {
        if (task.annotations?.length > 0) {
          const annotation = task.annotations[0];
          const result = annotation.result;
          
          // Extract intent and entities from annotation
          const intentChoice = result.find((r: any) => r.from_name === 'intent');
          const entityLabels = result.filter((r: any) => r.from_name === 'entity');
          
          const intent = intentChoice?.value?.choices?.[0] || task.data.predicted_intent;
          const entities = entityLabels.map((e: any) => ({
            entity: e.value.labels[0],
            value: e.value.text,
            start: e.value.start,
            end: e.value.end
          }));

          // Update in database
          await this.prisma.$executeRaw`
            UPDATE nlu_training_data 
            SET 
              intent = ${intent},
              entities = ${JSON.stringify(entities)}::jsonb,
              status = 'approved',
              approved_by = 'label_studio',
              approved_at = NOW()
            WHERE text = ${task.data.text} AND status = 'sent_to_label_studio'
          `;
        }
      }

      this.logger.log(`Synced ${tasks.length} annotations from Label Studio`);
    } catch (error: any) {
      this.logger.error(`Label Studio sync error: ${error.message}`);
    }
  }

  /**
   * Get learning statistics
   */
  async getStats(): Promise<{
    totalExamples: number;
    autoApproved: number;
    humanApproved: number;
    pendingReview: number;
    rejected: number;
    avgConfidence: number;
    topIntents: Array<{ intent: string; count: number }>;
  }> {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'auto_approved') as auto_approved,
        COUNT(*) FILTER (WHERE status = 'approved') as human_approved,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        AVG(confidence) as avg_confidence
      FROM nlu_training_data
    `;

    const topIntents = await this.prisma.$queryRaw<any[]>`
      SELECT intent, COUNT(*) as count
      FROM nlu_training_data
      WHERE status IN ('auto_approved', 'approved')
      GROUP BY intent
      ORDER BY count DESC
      LIMIT 10
    `;

    return {
      totalExamples: parseInt(stats[0].total),
      autoApproved: parseInt(stats[0].auto_approved),
      humanApproved: parseInt(stats[0].human_approved),
      pendingReview: parseInt(stats[0].pending_review),
      rejected: parseInt(stats[0].rejected),
      avgConfidence: parseFloat(stats[0].avg_confidence) || 0,
      topIntents
    };
  }

  /**
   * Check if model needs retraining
   */
  async checkRetrainingNeeded(): Promise<{
    needed: boolean;
    reason?: string;
    newExamplesCount: number;
  }> {
    // Get count of new approved examples since last training
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as new_count
      FROM nlu_training_data
      WHERE status IN ('auto_approved', 'approved')
      AND created_at > COALESCE(
        (SELECT MAX(trained_at) FROM model_training_history),
        '1970-01-01'::timestamp
      )
    `;

    const newCount = parseInt(result[0].new_count);
    
    // Check patterns that failed frequently
    const patterns = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as pattern_count
      FROM v_mistake_patterns
      WHERE occurrence_count >= 3
      AND first_occurrence > NOW() - INTERVAL '7 days'
    `;

    const failedPatterns = parseInt(patterns[0].pattern_count);

    if (newCount >= 100 || failedPatterns >= 5) {
      return {
        needed: true,
        reason: newCount >= 100 
          ? `${newCount} new training examples available`
          : `${failedPatterns} new failure patterns detected`,
        newExamplesCount: newCount
      };
    }

    return { needed: false, newExamplesCount: newCount };
  }
}
