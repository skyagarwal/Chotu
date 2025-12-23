import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * ConversationLoggingService - Detailed conversation analytics
 */
@Injectable()
export class ConversationLoggingService {
  private readonly logger = new Logger(ConversationLoggingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a complete conversation turn
   */
  async logConversation(data: {
    userId: number | string;
    sessionId: string;
    phoneNumber?: string;
    channel: string;
    userMessage: string;
    botResponse: string;
    messageType?: string;
    nluIntent?: string;
    nluConfidence?: number;
    nluLanguage?: string;
    nluTone?: string;
    routedTo?: string;
    responseSuccess?: boolean;
  }): Promise<void> {
    try {
      await this.prisma.conversationLog.create({
        data: {
          userId: typeof data.userId === 'string' ? parseInt(data.userId) : data.userId,
          sessionId: data.sessionId,
          phoneNumber: data.phoneNumber,
          channel: data.channel,
          userMessage: data.userMessage,
          botResponse: data.botResponse,
          messageType: data.messageType || 'text',
          nluIntent: data.nluIntent,
          nluConfidence: data.nluConfidence,
          nluLanguage: data.nluLanguage,
          nluTone: data.nluTone,
          routedTo: data.routedTo,
          responseSuccess: data.responseSuccess !== false,
          trainingConfidenceBucket: data.nluConfidence !== undefined && data.nluConfidence >= 0.85 ? 'high' : data.nluConfidence !== undefined && data.nluConfidence >= 0.6 ? 'medium' : 'low',
        },
      });
      this.logger.debug(`📊 Logged conversation: ${data.userId} → ${data.nluIntent}`);
    } catch (error) {
      this.logger.error(`Failed to log conversation:`, error);
    }
  }

  async getUserConversationHistory(userId: number | string, limit = 50): Promise<any[]> {
    return this.prisma.conversationLog.findMany({
      where: { userId: typeof userId === 'string' ? parseInt(userId) : userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
