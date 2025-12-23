import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ConversationLoggerService } from '../../database/conversation-logger.service';

/**
 * Analytics Controller
 * 
 * Provides endpoints for:
 * - Conversation analytics
 * - Training data export
 * - System health metrics
 * - Intent distribution analysis
 */
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly conversationLogger: ConversationLoggerService,
  ) {}

  /**
   * GET /api/analytics/stats
   * Get conversation statistics
   */
  @Get('stats')
  async getStats() {
    try {
      const stats = await this.conversationLogger.getConversationStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * GET /api/analytics/intents
   * Get intent distribution over last N days
   * 
   * Query params:
   * - days: number of days to analyze (default: 7)
   */
  @Get('intents')
  async getIntentDistribution(@Query('days') days?: string) {
    try {
      const daysNum = parseInt(days || '7');
      const intents = await this.conversationLogger.getIntentDistribution(daysNum);
      return {
        success: true,
        data: intents,
        meta: {
          days: daysNum,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get intent distribution: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * GET /api/analytics/failed-conversations
   * Get conversations that ended in errors or confusion
   * Useful for identifying areas needing improvement
   * 
   * Query params:
   * - limit: max results (default: 100)
   */
  @Get('failed-conversations')
  async getFailedConversations(@Query('limit') limit?: string) {
    try {
      const limitNum = parseInt(limit || '100');
      const failed = await this.conversationLogger.getFailedConversations(limitNum);
      return {
        success: true,
        data: failed,
        count: failed.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get failed conversations: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * GET /api/analytics/training-data
   * Export conversation pairs for NLU training
   * 
   * Format: user message → bot response + intent label
   * 
   * Query params:
   * - startDate: ISO date string (optional)
   * - endDate: ISO date string (optional)
   * - minConfidence: minimum NLU confidence (0-1, optional)
   * - format: 'json' | 'csv' (default: json)
   */
  @Get('training-data')
  async exportTrainingData(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minConfidence') minConfidence?: string,
    @Query('format') format?: string,
  ) {
    try {
      const params: any = {};
      
      if (startDate) {
        params.startDate = new Date(startDate);
      }
      
      if (endDate) {
        params.endDate = new Date(endDate);
      }
      
      if (minConfidence) {
        params.minConfidence = parseFloat(minConfidence);
      }

      const trainingData = await this.conversationLogger.exportTrainingData(params);

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(trainingData);
        return csv;
      }

      return {
        success: true,
        data: trainingData,
        count: trainingData.length,
        meta: {
          startDate: params.startDate || null,
          endDate: params.endDate || null,
          minConfidence: params.minConfidence || 0,
          exportedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to export training data: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * GET /api/analytics/conversation-history/:phone
   * Get conversation history for a specific phone number
   * 
   * Query params:
   * - limit: max messages (default: 50)
   */
  @Get('conversation-history/:phone')
  async getConversationHistory(
    @Query('phone') phone: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = parseInt(limit || '50');
      const history = await this.conversationLogger.getConversationHistory(phone, limitNum);
      return {
        success: true,
        data: history,
        phone,
        count: history.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation history: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Helper: Convert training data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) {
      return 'user_message,bot_response,intent,confidence,flow_id,created_at\n';
    }

    const header = 'user_message,bot_response,intent,confidence,flow_id,created_at\n';
    const rows = data.map(item => {
      const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        escapeCsv(item.userMessage),
        escapeCsv(item.botResponse),
        escapeCsv(item.intent),
        item.confidence,
        escapeCsv(item.flowId),
        item.createdAt,
      ].join(',');
    });

    return header + rows.join('\n');
  }
}
