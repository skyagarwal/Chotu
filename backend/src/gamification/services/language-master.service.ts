import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface LanguageQuestion {
  id: number;
  text: string;
  correctLanguage: string;
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
 * LanguageMasterService - "Detect the Language" game
 * User identifies the language of a given text
 */
@Injectable()
export class LanguageMasterService {
  private readonly logger = new Logger(LanguageMasterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getQuestions(count: number = 5, difficulty?: string): Promise<LanguageQuestion[]> {
    try {
      const dbQuestions = await this.prisma.gameQuestion.findMany({
        where: {
          gameType: 'language_master',
          enabled: true,
          ...(difficulty && { difficulty }),
        },
        take: count,
        orderBy: { usageCount: 'asc' },
      });

      if (dbQuestions.length > 0) {
        return dbQuestions.map((q) => ({
          id: q.id,
          text: q.questionText,
          correctLanguage: q.correctAnswer,
          options: q.answerOptions as string[],
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          rewardPoints: Number(q.rewardAmount),
        }));
      }
    } catch (error) {
      this.logger.warn('Failed to load questions from database, using hardcoded');
    }

    return this.getHardcodedQuestions().slice(0, count);
  }

  validateAnswer(
    question: LanguageQuestion,
    userAnswer: string,
    timeSpent?: number,
  ): GameResult {
    const normalizedAnswer = userAnswer.toLowerCase().trim();
    const normalizedCorrect = question.correctLanguage.toLowerCase().trim();
    const correct = normalizedAnswer === normalizedCorrect;

    let score = 0;
    if (correct) {
      score = question.rewardPoints;
      if (timeSpent && timeSpent < 8000) {
        score = Math.floor(score * 1.2);
      }
    }

    const feedback = correct
      ? `✅ Correct! This is ${question.correctLanguage}. +${score} points`
      : `❌ Incorrect. This is ${question.correctLanguage}. ${this.getHint(question)}`;

    return {
      correct,
      score,
      feedback,
      correctAnswer: question.correctLanguage,
      userAnswer: normalizedAnswer,
    };
  }

  async updateQuestionStats(questionId: number, correct: boolean): Promise<void> {
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

  private getHint(question: LanguageQuestion): string {
    const hints: Record<string, string> = {
      english: 'Look for English alphabet and grammar patterns',
      hindi: 'देवनागरी script - look for Hindi letters',
      marathi: 'मराठी script - similar to Hindi but different vocabulary',
      mixed: 'Combination of English and Hindi/Marathi (Hinglish)',
      gujarati: 'ગુજરાતી script - distinct from Hindi',
      tamil: 'தமிழ் script - South Indian language',
      telugu: 'తెలుగు script - South Indian language',
    };
    return hints[question.correctLanguage] || 'Look at the script and words used';
  }

  private getHardcodedQuestions(): LanguageQuestion[] {
    return [
      // Easy questions - pure single language
      {
        id: 101,
        text: 'Hello, how are you today?',
        correctLanguage: 'english',
        options: ['english', 'hindi', 'mixed', 'marathi'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 102,
        text: 'नमस्ते, आप कैसे हैं?',
        correctLanguage: 'hindi',
        options: ['english', 'hindi', 'marathi', 'mixed'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 103,
        text: 'मला पिझ्झा हवा आहे',
        correctLanguage: 'marathi',
        options: ['hindi', 'marathi', 'gujarati', 'mixed'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 104,
        text: 'Good morning! Have a great day!',
        correctLanguage: 'english',
        options: ['english', 'mixed', 'hindi', 'marathi'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 105,
        text: 'मुझे खाना चाहिए',
        correctLanguage: 'hindi',
        options: ['english', 'hindi', 'marathi', 'mixed'],
        difficulty: 'easy',
        rewardPoints: 3,
      },

      // Medium questions - mixed language (Hinglish)
      {
        id: 106,
        text: 'Bro, tum kahan ho?',
        correctLanguage: 'mixed',
        options: ['english', 'hindi', 'mixed', 'marathi'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 107,
        text: 'Please mujhe pizza deliver karo',
        correctLanguage: 'mixed',
        options: ['english', 'hindi', 'mixed', 'marathi'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 108,
        text: 'मी थोडा busy आहे',
        correctLanguage: 'mixed',
        options: ['hindi', 'marathi', 'mixed', 'gujarati'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 109,
        text: 'Kya aap help kar sakte ho?',
        correctLanguage: 'mixed',
        options: ['english', 'hindi', 'mixed', 'marathi'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 110,
        text: 'Boss, urgent delivery kardo na',
        correctLanguage: 'mixed',
        options: ['english', 'hindi', 'mixed', 'marathi'],
        difficulty: 'medium',
        rewardPoints: 5,
      },

      // Hard questions - complex mixed, regional
      {
        id: 111,
        text: 'Ae bhai, ચા લાવો ને',
        correctLanguage: 'gujarati',
        options: ['hindi', 'gujarati', 'mixed', 'marathi'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 112,
        text: 'Boss yaar, seriously meko order abhi chahiye',
        correctLanguage: 'mixed',
        options: ['english', 'hindi', 'mixed', 'marathi'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 113,
        text: 'நான் உணவு ஆர்டர் செய்ய விரும்புகிறேன்',
        correctLanguage: 'tamil',
        options: ['hindi', 'tamil', 'telugu', 'marathi'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 114,
        text: 'Bhai तू मला help करशील का?',
        correctLanguage: 'mixed',
        options: ['hindi', 'marathi', 'mixed', 'gujarati'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 115,
        text: 'నాకు డెలివరీ కావాలి',
        correctLanguage: 'telugu',
        options: ['tamil', 'telugu', 'hindi', 'gujarati'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
    ];
  }
}
