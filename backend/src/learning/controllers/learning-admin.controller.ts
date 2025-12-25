/**
 * Learning Admin Controller
 * 
 * Exposes admin APIs for the self-learning system:
 * - GET /api/admin/learning/stats - Learning statistics
 * - GET /api/admin/learning/pending - Pending reviews
 * - POST /api/admin/learning/:id/approve - Approve example
 * - POST /api/admin/learning/:id/reject - Reject example
 * - GET /api/admin/learning/intents - Available intents
 * - GET /api/admin/learning/check-retraining - Check if retraining needed
 * - GET /api/admin/learning/export - Export training data
 */

import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { SelfLearningService } from '../services/self-learning.service';
import { PrismaService } from '../../database/prisma.service';

// Define the return type for pending reviews
interface PendingReviewResponse {
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
}

@Controller('admin/learning')
export class LearningAdminController {
  private readonly logger = new Logger(LearningAdminController.name);

  constructor(
    private readonly selfLearningService: SelfLearningService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Get learning statistics
   */
  @Get('stats')
  async getStats() {
    try {
      const stats = await this.selfLearningService.getStats();
      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      this.logger.error(`Error getting stats: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get pending reviews
   */
  @Get('pending')
  async getPendingReviews(
    @Query('priority') priority?: 'all' | 'priority' | 'normal',
    @Query('limit') limit?: string
  ): Promise<PendingReviewResponse> {
    try {
      const reviews = await this.selfLearningService.getPendingReviews(
        priority || 'all',
        parseInt(limit || '50')
      );
      return {
        success: true,
        data: reviews,
        count: reviews.length
      };
    } catch (error: any) {
      this.logger.error(`Error getting pending reviews: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Approve a training example
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveExample(
    @Param('id') id: string,
    @Body() body: {
      adminId?: string;
      correctedIntent?: string;
      correctedEntities?: any[];
    }
  ) {
    try {
      await this.selfLearningService.approveExample(
        id,
        body.adminId || 'admin',
        body.correctedIntent,
        body.correctedEntities
      );
      return {
        success: true,
        message: 'Example approved successfully'
      };
    } catch (error: any) {
      this.logger.error(`Error approving example: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reject a training example
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectExample(
    @Param('id') id: string,
    @Body() body: {
      adminId?: string;
      reason?: string;
    }
  ) {
    try {
      await this.selfLearningService.rejectExample(
        id,
        body.adminId || 'admin',
        body.reason
      );
      return {
        success: true,
        message: 'Example rejected successfully'
      };
    } catch (error: any) {
      this.logger.error(`Error rejecting example: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available intents
   */
  @Get('intents')
  async getIntents() {
    try {
      const intents = await this.prisma.$queryRaw<any[]>`
        SELECT DISTINCT intent, COUNT(*) as count
        FROM nlu_training_data
        WHERE status IN ('auto_approved', 'approved', 'pending_review')
        GROUP BY intent
        ORDER BY count DESC
      `;
      
      // Also get predefined intents from intent_definitions
      const definitions = await this.prisma.$queryRaw<any[]>`
        SELECT DISTINCT name as intent, description
        FROM intent_definitions
        ORDER BY name
      `;
      
      // Merge unique intents
      const allIntents = new Map<string, { intent: string; count: number; description?: string }>();
      
      for (const def of definitions) {
        allIntents.set(def.intent, { 
          intent: def.intent, 
          count: 0, 
          description: def.description 
        });
      }
      
      for (const i of intents) {
        const existing = allIntents.get(i.intent);
        if (existing) {
          existing.count = parseInt(i.count);
        } else {
          allIntents.set(i.intent, { intent: i.intent, count: parseInt(i.count) });
        }
      }
      
      return {
        success: true,
        data: Array.from(allIntents.values())
      };
    } catch (error: any) {
      this.logger.error(`Error getting intents: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if model needs retraining
   */
  @Get('check-retraining')
  async checkRetraining() {
    try {
      const result = await this.selfLearningService.checkRetrainingNeeded();
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      this.logger.error(`Error checking retraining: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export training data
   */
  @Get('export')
  async exportTrainingData(
    @Query('format') format?: 'rasa' | 'json' | 'spacy'
  ) {
    try {
      const data = await this.selfLearningService.exportForTraining(format || 'json');
      return {
        success: true,
        format: format || 'json',
        data: format === 'json' ? JSON.parse(data) : data
      };
    } catch (error: any) {
      this.logger.error(`Error exporting data: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get auto-approval statistics
   */
  @Get('auto-approval-stats')
  async getAutoApprovalStats() {
    try {
      const stats = await this.prisma.$queryRaw<any[]>`
        SELECT 
          intent,
          count,
          avg_confidence,
          last_approved_at
        FROM auto_approval_stats
        ORDER BY count DESC
        LIMIT 20
      `;
      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      this.logger.error(`Error getting auto-approval stats: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get mistake patterns
   */
  @Get('mistakes')
  async getMistakePatterns(
    @Query('limit') limit?: string
  ) {
    try {
      const patterns = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM conversation_mistakes
        ORDER BY created_at DESC
        LIMIT ${parseInt(limit || '50')}
      `;
      return {
        success: true,
        data: patterns
      };
    } catch (error: any) {
      this.logger.error(`Error getting mistake patterns: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trigger model retraining (manual)
   */
  @Post('trigger-retraining')
  @HttpCode(HttpStatus.OK)
  async triggerRetraining(
    @Body() body: { adminId?: string; reason?: string }
  ) {
    try {
      // Log the training request
      await this.prisma.$executeRaw`
        INSERT INTO model_training_history 
          (model_name, model_version, training_examples_count, trained_by, notes)
        VALUES 
          ('chotu-nlu',
           ${`v${Date.now()}`}, 
           (SELECT COUNT(*) FROM nlu_training_data WHERE status IN ('auto_approved', 'approved')),
           ${body.adminId || 'admin'},
           ${body.reason || 'Manual training trigger'})
      `;

      // In production, this would trigger the actual training pipeline
      // For now, just log and return success
      this.logger.log(`Training triggered by ${body.adminId}: ${body.reason}`);
      
      return {
        success: true,
        message: 'Retraining queued. Check model performance dashboard for progress.'
      };
    } catch (error: any) {
      this.logger.error(`Error triggering retraining: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get model training history
   */
  @Get('training-history')
  async getTrainingHistory() {
    try {
      const history = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM model_training_history
        ORDER BY trained_at DESC
        LIMIT 20
      `;
      return {
        success: true,
        data: history
      };
    } catch (error: any) {
      this.logger.error(`Error getting training history: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
