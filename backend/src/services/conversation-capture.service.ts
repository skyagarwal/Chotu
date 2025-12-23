import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * ConversationCaptureService
 * 
 * Automatically logs all user conversations to PostgreSQL for:
 * - Analytics and debugging
 * - Training data collection
 * - User feedback tracking
 * - Model performance monitoring
 */
@Injectable()
export class ConversationCaptureService {
  private readonly logger = new Logger(ConversationCaptureService.name);
  private prisma: PrismaClient;

  constructor(private configService: ConfigService) {
    this.prisma = new PrismaClient();
  }

  /**
   * Captures a complete conversation interaction
   * 
   * Called by NLU service after every user message is processed
   */
  async captureConversation(data: {
    // Session tracking
    sessionId: string;
    phoneNumber: string;
    userId?: number;

    // User input
    userMessage: string;
    messageType?: string; // 'text', 'voice', 'button'
    messageLanguage?: string;

    // NLU output
    nluIntent?: string;
    nluConfidence?: number;
    nluModuleId?: number;
    nluModuleType?: string;
    nluProvider?: string; // 'indicbert', 'llm-fallback'
    nluEntities?: any;
    nluTone?: string;
    nluProcessingTimeMs?: number;

    // Routing
    routedTo?: string; // 'opensearch', 'php'
    routingReason?: string;

    // Response
    responseText?: string;
    responseType?: string;
    responseTimeMs?: number;
    responseSuccess?: boolean;

    // Context
    conversationContext?: any;
    previousIntent?: string;

    // Platform
    platform?: string;
  }) {
    try {
      // Determine if this is a good training candidate
      const { isTrainingCandidate, confidenceBucket, reviewStatus, reviewPriority } =
        this.evaluateTrainingCandidate(data);

      // Insert into conversation_logs using Prisma Client
      await this.prisma.conversationLog.create({
        data: {
          sessionId: data.sessionId,
          phoneNumber: data.phoneNumber,
          userId: data.userId || null,
          userMessage: data.userMessage,
          messageType: data.messageType || 'text',
          
          // Map messageLanguage to nluLanguage
          nluLanguage: data.messageLanguage || 'en',
          
          nluIntent: data.nluIntent || null,
          nluConfidence: data.nluConfidence ?? null,
          nluProvider: data.nluProvider || null,
          nluEntities: data.nluEntities ?? null,
          nluTone: data.nluTone || null,
          nluProcessingTimeMs: data.nluProcessingTimeMs || null,
          
          routedTo: data.routedTo || null,
          routingReason: data.routingReason || null,
          
          botResponse: data.responseText || null,
          responseType: data.responseType || null,
          responseTimeMs: data.responseTimeMs || null,
          responseSuccess: data.responseSuccess !== undefined ? data.responseSuccess : true,
          
          conversationContext: data.conversationContext ?? null,
          
          isTrainingCandidate: isTrainingCandidate,
          trainingConfidenceBucket: confidenceBucket,
          
          channel: data.platform || 'whatsapp',
        }
      });

      // If auto-approved, create training sample immediately
      if (reviewStatus === 'auto-approved' && data.nluIntent && data.nluModuleId && data.nluModuleType) {
        await this.createTrainingSample({
          userMessage: data.userMessage,
          nluIntent: data.nluIntent,
          nluModuleId: data.nluModuleId,
          nluModuleType: data.nluModuleType,
          nluEntities: data.nluEntities,
          messageLanguage: data.messageLanguage,
          routedTo: data.routedTo,
          nluConfidence: data.nluConfidence,
        });
      }

      this.logger.log(
        `Captured conversation: ${data.phoneNumber} | ${data.nluIntent} (${data.nluConfidence?.toFixed(2)}) | ${reviewStatus}`
      );

      return { success: true, reviewStatus, isTrainingCandidate };
    } catch (error) {
      this.logger.error('Failed to capture conversation', error);
      // Don't throw, just log error so flow continues
      return { success: false, error: error.message };
    }
  }

  /**
   * Evaluates if a conversation should be used for training
   * 
   * Decision logic:
   * - Confidence > 0.85 + IndicBERT → auto-approve
   * - Confidence 0.70-0.85 → needs review
   * - Confidence < 0.70 OR LLM fallback → needs review (higher priority)
   */
  private evaluateTrainingCandidate(data: {
    nluConfidence?: number;
    nluProvider?: string;
    nluIntent?: string;
    userMessage?: string;
  }) {
    const confidence = data.nluConfidence || 0;
    const provider = data.nluProvider || 'unknown';

    // Get thresholds from config
    const highConfidence = this.configService.get<number>('training.confidenceThresholds.high', 0.85);
    const mediumConfidence = this.configService.get<number>('training.confidenceThresholds.medium', 0.70);
    
    const highPriority = this.configService.get<number>('training.reviewPriorities.high', 2);
    const mediumPriority = this.configService.get<number>('training.reviewPriorities.medium', 5);
    const lowPriority = this.configService.get<number>('training.reviewPriorities.low', 10);

    let isTrainingCandidate = false;
    let confidenceBucket = 'error';
    let reviewStatus = 'pending';
    let reviewPriority = mediumPriority;

    // Rule 1: Gibberish/spam (very short or no intent)
    if (!data.nluIntent || data.userMessage.length < 3) {
      return {
        isTrainingCandidate: false,
        confidenceBucket: 'error',
        reviewStatus: 'rejected',
        reviewPriority: lowPriority,
      };
    }

    // Rule 2: High confidence + IndicBERT = auto-approve
    if (confidence >= highConfidence && provider === 'indicbert') {
      isTrainingCandidate = true;
      confidenceBucket = 'high';
      reviewStatus = 'auto-approved';
      reviewPriority = lowPriority; // Low priority (doesn't need human review)
    }
    // Rule 3: Medium confidence = needs review (medium priority)
    else if (confidence >= mediumConfidence && confidence < highConfidence) {
      isTrainingCandidate = true;
      confidenceBucket = 'medium';
      reviewStatus = 'needs-review';
      reviewPriority = mediumPriority;
    }
    // Rule 4: Low confidence OR LLM fallback = needs review (high priority)
    else if (confidence < mediumConfidence || provider.includes('llm')) {
      isTrainingCandidate = true;
      confidenceBucket = 'low';
      reviewStatus = 'needs-review';
      reviewPriority = highPriority; // High priority (model is struggling)
    }

    return { isTrainingCandidate, confidenceBucket, reviewStatus, reviewPriority };
  }

  /**
   * Creates a training sample (for auto-approved conversations)
   */
  private async createTrainingSample(data: {
    userMessage: string;
    nluIntent: string;
    nluModuleId: number;
    nluModuleType: string;
    nluEntities?: any;
    messageLanguage?: string;
    routedTo?: string;
    nluConfidence?: number;
  }) {
    try {
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO training_samples (
          text, intent,
          entities, language,
          review_status, source,
          confidence
        ) VALUES (
          $1, $2,
          $3::jsonb, $4,
          $5, $6,
          $7
        )
      `,
        data.userMessage,
        data.nluIntent,
        data.nluEntities ? JSON.stringify(data.nluEntities) : null,
        data.messageLanguage || 'en',
        'approved', // Auto-approved
        'production', // Real user data
        data.nluConfidence || 0.9
      );

      this.logger.log(`Created training sample: ${data.nluIntent}`);
    } catch (error) {
      this.logger.error('Failed to create training sample', error);
    }
  }

  /**
   * Updates conversation with user feedback
   * 
   * Called when:
   * - User corrects the system
   * - User abandons conversation
   * - User successfully completes action
   */
  async updateUserFeedback(
    conversationId: number,
    feedback: {
      userFeedback?: 'positive' | 'negative' | 'correction';
      userCorrection?: string;
      userClickedResult?: number;
      userCompletedAction?: boolean;
    }
  ) {
    try {
      await this.prisma.$executeRawUnsafe(`
        UPDATE conversation_logs
        SET
          user_feedback = $1,
          user_correction = $2,
          user_clicked_result = $3,
          user_completed_action = $4,
          -- If user corrected, mark for review
          review_status = CASE
            WHEN $1 = 'correction' THEN 'needs-review'
            WHEN $1 = 'negative' THEN 'needs-review'
            ELSE review_status
          END,
          review_priority = CASE
            WHEN $1 IN ('correction', 'negative') THEN 1
            ELSE review_priority
          END
        WHERE id = $5
      `,
        feedback.userFeedback || null,
        feedback.userCorrection || null,
        feedback.userClickedResult || null,
        feedback.userCompletedAction !== undefined ? feedback.userCompletedAction : null,
        conversationId
      );

      this.logger.log(`Updated feedback for conversation ${conversationId}: ${feedback.userFeedback}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update user feedback', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gets training queue statistics
   * 
   * How many samples are waiting for human review?
   */
  async getTrainingQueueStats() {
    try {
      // @ts-ignore - Prisma queryRawUnsafe type inference issue
      const stats = await this.prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*) FILTER (WHERE review_status = 'needs-review') as needs_review_count,
          COUNT(*) FILTER (WHERE review_status = 'auto-approved') as auto_approved_count,
          COUNT(*) FILTER (WHERE review_status = 'approved') as approved_count,
          AVG(nlu_confidence) FILTER (WHERE nlu_confidence IS NOT NULL) as avg_confidence,
          COUNT(*) FILTER (WHERE nlu_provider = 'indicbert') as indicbert_count,
          COUNT(*) FILTER (WHERE nlu_provider LIKE '%llm%') as llm_fallback_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h_count
        FROM conversation_logs
        WHERE is_training_candidate = TRUE
      `);

      return stats[0];
    } catch (error) {
      this.logger.error('Failed to get training queue stats', error);
      return null;
    }
  }

  /**
   * Exports training samples ready for model training
   * 
   * Called by: npm run export:training-data
   */
  async exportTrainingSamples(filters: {
    reviewStatus?: string[];
    languages?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }) {
    try {
      let query = `
        SELECT
          text, intent,
          entities, language,
          confidence, source
        FROM training_samples
        WHERE review_status = ANY($1::text[])
      `;

      const params: any[] = [filters.reviewStatus || ['approved']];
      let paramIndex = 2;

      if (filters.languages && filters.languages.length > 0) {
        query += ` AND language = ANY($${paramIndex}::text[])`;
        params.push(filters.languages);
        paramIndex++;
      }

      if (filters.dateFrom) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      // @ts-ignore - Prisma queryRawUnsafe type inference issue
      const samples = await this.prisma.$queryRawUnsafe(query, ...params) as any;

      this.logger.log(`Exported ${samples.length} training samples`);
      return samples;
    } catch (error) {
      this.logger.error('Failed to export training samples', error);
      return [];
    }
  }
}
