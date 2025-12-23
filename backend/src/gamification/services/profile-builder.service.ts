import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ProfileQuestion {
  id: number;
  question: string;
  category: string;
  rewardPoints: number;
}

export interface GameResult {
  answer: string;
  score: number;
  feedback: string;
}

/**
 * ProfileBuilderService - Quick yes/no questions to build user profile
 * Collects preferences and demographic data while rewarding users
 */
@Injectable()
export class ProfileBuilderService {
  private readonly logger = new Logger(ProfileBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getQuestions(count: number = 10): Promise<ProfileQuestion[]> {
    try {
      const dbQuestions = await this.prisma.gameQuestion.findMany({
        where: {
          gameType: 'profile_builder',
          enabled: true,
        },
        take: count,
        orderBy: { usageCount: 'asc' },
      });

      if (dbQuestions.length > 0) {
        return dbQuestions.map((q) => ({
          id: q.id,
          question: q.questionText,
          category: q.questionContext || 'general',
          rewardPoints: Number(q.rewardAmount || 1),
        }));
      }
    } catch (error) {
      this.logger.warn('Failed to load questions from database, using hardcoded');
    }

    return this.getHardcodedQuestions().slice(0, count);
  }

  /**
   * Process answer - for profile builder, any answer is valid
   */
  processAnswer(question: ProfileQuestion, userAnswer: string): GameResult {
    const normalizedAnswer = userAnswer.toLowerCase().trim();
    
    // All answers are valid for profile questions
    const score = question.rewardPoints;
    const feedback = `✅ Thank you! +₹${score}`;

    return {
      answer: normalizedAnswer,
      score,
      feedback,
    };
  }

  async updateQuestionStats(questionId: number): Promise<void> {
    try {
      await this.prisma.gameQuestion.update({
        where: { id: questionId },
        data: {
          usageCount: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update question stats: ${error.message}`);
    }
  }

  /**
   * Save profile data to user record
   */
  async saveProfileData(
    userId: number,
    category: string,
    answer: string,
  ): Promise<void> {
    try {
      // Save to user preferences or a separate profile table
      // For now, just log it
      this.logger.log(`User ${userId} profile: ${category} = ${answer}`);
      
      // TODO: Implement actual profile storage
      // await this.prisma.userProfile.upsert({
      //   where: { userId_category: { userId, category } },
      //   create: { userId, category, value: answer },
      //   update: { value: answer },
      // });
    } catch (error) {
      this.logger.error(`Failed to save profile data: ${error.message}`);
    }
  }

  private getHardcodedQuestions(): ProfileQuestion[] {
    return [
      // Food preferences
      {
        id: 301,
        question: 'Do you eat non-vegetarian food?',
        category: 'food_preference',
        rewardPoints: 1,
      },
      {
        id: 302,
        question: 'Do you like spicy food?',
        category: 'food_preference',
        rewardPoints: 1,
      },
      {
        id: 303,
        question: 'Do you prefer fast food or home-cooked meals?',
        category: 'food_preference',
        rewardPoints: 1,
      },
      {
        id: 304,
        question: 'Are you allergic to any foods?',
        category: 'food_preference',
        rewardPoints: 1,
      },
      {
        id: 305,
        question: 'Do you like trying new cuisines?',
        category: 'food_preference',
        rewardPoints: 1,
      },

      // Shopping preferences
      {
        id: 306,
        question: 'Do you prefer online shopping or visiting stores?',
        category: 'shopping_preference',
        rewardPoints: 1,
      },
      {
        id: 307,
        question: 'Do you usually look for discounts before buying?',
        category: 'shopping_preference',
        rewardPoints: 1,
      },
      {
        id: 308,
        question: 'How often do you order groceries online? (daily/weekly/monthly)',
        category: 'shopping_preference',
        rewardPoints: 1,
      },

      // Delivery preferences
      {
        id: 309,
        question: 'What time do you usually order food? (morning/afternoon/evening/night)',
        category: 'delivery_preference',
        rewardPoints: 1,
      },
      {
        id: 310,
        question: 'Do you prefer contactless delivery?',
        category: 'delivery_preference',
        rewardPoints: 1,
      },
      {
        id: 311,
        question: 'How urgent are your deliveries usually? (same-day/next-day/flexible)',
        category: 'delivery_preference',
        rewardPoints: 1,
      },

      // Demographics (optional)
      {
        id: 312,
        question: 'What is your age group? (18-25/26-35/36-45/45+)',
        category: 'demographic',
        rewardPoints: 1,
      },
      {
        id: 313,
        question: 'Do you live in Nashik city or outskirts?',
        category: 'demographic',
        rewardPoints: 1,
      },
      {
        id: 314,
        question: 'Are you a student or working professional?',
        category: 'demographic',
        rewardPoints: 1,
      },
      {
        id: 315,
        question: 'How many people live in your household?',
        category: 'demographic',
        rewardPoints: 1,
      },

      // Usage patterns
      {
        id: 316,
        question: 'How often do you use delivery apps? (daily/weekly/monthly)',
        category: 'usage_pattern',
        rewardPoints: 1,
      },
      {
        id: 317,
        question: 'What do you order most frequently? (food/groceries/medicines/other)',
        category: 'usage_pattern',
        rewardPoints: 1,
      },
      {
        id: 318,
        question: 'Do you share your account with family members?',
        category: 'usage_pattern',
        rewardPoints: 1,
      },

      // Feedback preferences
      {
        id: 319,
        question: 'Would you like to receive promotional offers?',
        category: 'notification_preference',
        rewardPoints: 1,
      },
      {
        id: 320,
        question: 'How would you prefer we contact you? (SMS/WhatsApp/Email)',
        category: 'notification_preference',
        rewardPoints: 1,
      },
    ];
  }
}
