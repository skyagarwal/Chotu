import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface IntentQuestion {
  id: number;
  text: string;
  correctIntent: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  rewardPoints: number;
}

export interface GameResult {
  correct: boolean;
  score: number;
  feedback: string;
  correctAnswer: string;
  userAnswer: string;
}

/**
 * IntentQuestService - "Guess the Intent" game
 * User reads a message and identifies the correct intent
 */
@Injectable()
export class IntentQuestService {
  private readonly logger = new Logger(IntentQuestService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get questions for Intent Quest game
   * Loads from database or returns hardcoded questions as fallback
   */
  async getQuestions(count: number = 5, difficulty?: string): Promise<IntentQuestion[]> {
    try {
      // Try to load from database first
      const dbQuestions = await this.prisma.gameQuestion.findMany({
        where: {
          gameType: 'intent_quest',
          enabled: true,
          ...(difficulty && { difficulty }),
        },
        take: count,
        orderBy: { usageCount: 'asc' }, // Load least-used questions first
      });

      if (dbQuestions.length > 0) {
        return dbQuestions.map((q) => ({
          id: q.id,
          text: q.questionText,
          correctIntent: q.correctAnswer,
          options: q.answerOptions as string[],
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          rewardPoints: Number(q.rewardAmount),
        }));
      }
    } catch (error) {
      this.logger.warn('Failed to load questions from database, using hardcoded');
    }

    // Fallback to hardcoded questions
    return this.getHardcodedQuestions().slice(0, count);
  }

  /**
   * Validate user's answer
   */
  validateAnswer(
    question: IntentQuestion,
    userAnswer: string,
    timeSpent?: number,
  ): GameResult {
    const normalizedAnswer = userAnswer.toLowerCase().trim();
    const normalizedCorrect = question.correctIntent.toLowerCase().trim();
    const correct = normalizedAnswer === normalizedCorrect;

    // Calculate score with time bonus
    let score = 0;
    if (correct) {
      score = question.rewardPoints;
      
      // Time bonus: +20% if answered in < 10 seconds
      if (timeSpent && timeSpent < 10000) {
        score = Math.floor(score * 1.2);
      }
    }

    const feedback = correct
      ? `✅ Correct! The intent is "${question.correctIntent}". +${score} points`
      : `❌ Incorrect. The correct intent is "${question.correctIntent}". ${this.getHint(question)}`;

    return {
      correct,
      score,
      feedback,
      correctAnswer: question.correctIntent,
      userAnswer: normalizedAnswer,
    };
  }

  /**
   * Update question usage stats
   */
  async updateQuestionStats(questionId: number, correct: boolean): Promise<void> {
    try {
      await this.prisma.gameQuestion.update({
        where: { id: questionId },
        data: {
          usageCount: { increment: 1 },
          successRate: {
            // Recalculate success rate
            // This is a simplified version; in production, track attempts separately
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update question stats: ${error.message}`);
    }
  }

  /**
   * Get hint for wrong answer
   */
  private getHint(question: IntentQuestion): string {
    const hints: Record<string, string> = {
      order_food: 'Look for keywords like "order", "food", "restaurant", "delivery"',
      parcel_delivery: 'Look for "send", "parcel", "courier", "deliver"',
      search_product: 'Look for "find", "search", "looking for", "show me"',
      greeting: 'Look for "hi", "hello", "hey", "good morning"',
      track_order: 'Look for "track", "where is", "status of my order"',
      cancel_order: 'Look for "cancel", "remove", "don\'t want"',
      complaint: 'Look for "issue", "problem", "complaint", "not working"',
      help: 'Look for "help", "how to", "can you", "support"',
    };
    return hints[question.correctIntent] || 'Think about what the user wants to do';
  }

  /**
   * Hardcoded questions (fallback if database is empty)
   */
  private getHardcodedQuestions(): IntentQuestion[] {
    return [
      // Easy questions (3 points)
      {
        id: 1,
        text: 'I want to order pizza',
        correctIntent: 'order_food',
        options: ['greeting', 'order_food', 'search_product', 'parcel_delivery'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 2,
        text: 'Send this parcel to Mumbai',
        correctIntent: 'parcel_delivery',
        options: ['order_food', 'parcel_delivery', 'search_product', 'track_order'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 3,
        text: 'Hello! How are you?',
        correctIntent: 'greeting',
        options: ['greeting', 'help', 'order_food', 'complaint'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 4,
        text: 'Show me nearby restaurants',
        correctIntent: 'search_product',
        options: ['order_food', 'search_product', 'track_order', 'greeting'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 5,
        text: 'Where is my order?',
        correctIntent: 'track_order',
        options: ['cancel_order', 'track_order', 'complaint', 'help'],
        difficulty: 'easy',
        rewardPoints: 3,
      },

      // Medium questions (5 points)
      {
        id: 6,
        text: 'मुझे पिज़्ज़ा चाहिए',
        correctIntent: 'order_food',
        options: ['greeting', 'order_food', 'help', 'search_product'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 7,
        text: 'Can you help me with delivery?',
        correctIntent: 'help',
        options: ['greeting', 'help', 'complaint', 'track_order'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 8,
        text: 'I need to cancel my parcel booking',
        correctIntent: 'cancel_order',
        options: ['track_order', 'cancel_order', 'complaint', 'help'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 9,
        text: 'My food never arrived, this is frustrating!',
        correctIntent: 'complaint',
        options: ['cancel_order', 'complaint', 'track_order', 'help'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 10,
        text: 'ढूंढो मेरे पास के रेस्टोरेंट',
        correctIntent: 'search_product',
        options: ['order_food', 'search_product', 'greeting', 'help'],
        difficulty: 'medium',
        rewardPoints: 5,
      },

      // Hard questions (8 points) - mixed language, ambiguous
      {
        id: 11,
        text: 'Bro yaar, send this package to my friend na',
        correctIntent: 'parcel_delivery',
        options: ['greeting', 'order_food', 'parcel_delivery', 'search_product'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 12,
        text: 'Mere order ka kya hua? Not delivered yet!',
        correctIntent: 'track_order',
        options: ['complaint', 'track_order', 'cancel_order', 'help'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 13,
        text: 'Boss, urgent hai - biryani chahiye abhi ke abhi',
        correctIntent: 'order_food',
        options: ['order_food', 'search_product', 'help', 'complaint'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 14,
        text: 'Bhai sahab, ye jo parcel bheja tha woh nahi aaya',
        correctIntent: 'complaint',
        options: ['track_order', 'complaint', 'cancel_order', 'help'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 15,
        text: 'Kya koi Chinese food milta hai nearby?',
        correctIntent: 'search_product',
        options: ['order_food', 'search_product', 'greeting', 'help'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
    ];
  }
}
