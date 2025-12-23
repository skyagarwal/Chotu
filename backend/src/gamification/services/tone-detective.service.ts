import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ToneQuestion {
  id: number;
  text: string;
  correctTone: string;
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
 * ToneDetectiveService - "Identify the Emotion/Tone" game
 * User detects the emotional tone of a message
 */
@Injectable()
export class ToneDetectiveService {
  private readonly logger = new Logger(ToneDetectiveService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getQuestions(count: number = 5, difficulty?: string): Promise<ToneQuestion[]> {
    try {
      const dbQuestions = await this.prisma.gameQuestion.findMany({
        where: {
          gameType: 'tone_detective',
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
          correctTone: q.correctAnswer,
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
    question: ToneQuestion,
    userAnswer: string,
    timeSpent?: number,
  ): GameResult {
    const normalizedAnswer = userAnswer.toLowerCase().trim();
    const normalizedCorrect = question.correctTone.toLowerCase().trim();
    const correct = normalizedAnswer === normalizedCorrect;

    let score = 0;
    if (correct) {
      score = question.rewardPoints;
      if (timeSpent && timeSpent < 8000) {
        score = Math.floor(score * 1.2);
      }
    }

    const feedback = correct
      ? `✅ Correct! The tone is ${question.correctTone}. +${score} points`
      : `❌ Incorrect. The tone is ${question.correctTone}. ${this.getHint(question)}`;

    return {
      correct,
      score,
      feedback,
      correctAnswer: question.correctTone,
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

  private getHint(question: ToneQuestion): string {
    const hints: Record<string, string> = {
      happy: 'Look for positive words, excitement, emojis like 😊 🎉',
      angry: 'Look for frustration, harsh words, exclamation marks',
      sad: 'Look for disappointment, crying emojis 😢',
      neutral: 'Simple statement with no strong emotion',
      urgent: 'Look for time pressure: "urgent", "fast", "ASAP"',
      polite: 'Look for "please", "thank you", formal language',
      frustrated: 'Look for annoyance without being fully angry',
      excited: 'Look for enthusiasm, multiple exclamation marks!!!',
    };
    return hints[question.correctTone] || 'Think about the emotion in the message';
  }

  private getHardcodedQuestions(): ToneQuestion[] {
    return [
      // Easy questions - obvious emotions
      {
        id: 201,
        text: 'Thank you so much! This is amazing! 😊',
        correctTone: 'happy',
        options: ['happy', 'angry', 'sad', 'neutral'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 202,
        text: 'This is unacceptable! I want a refund NOW!',
        correctTone: 'angry',
        options: ['happy', 'angry', 'neutral', 'polite'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 203,
        text: 'My order never arrived. I am so disappointed 😢',
        correctTone: 'sad',
        options: ['happy', 'angry', 'sad', 'excited'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 204,
        text: 'I would like to order a pizza.',
        correctTone: 'neutral',
        options: ['happy', 'angry', 'sad', 'neutral'],
        difficulty: 'easy',
        rewardPoints: 3,
      },
      {
        id: 205,
        text: 'URGENT! Need delivery ASAP!!',
        correctTone: 'urgent',
        options: ['happy', 'urgent', 'polite', 'neutral'],
        difficulty: 'easy',
        rewardPoints: 3,
      },

      // Medium questions - subtle emotions
      {
        id: 206,
        text: 'Could you please help me with this? I would really appreciate it.',
        correctTone: 'polite',
        options: ['neutral', 'polite', 'urgent', 'happy'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 207,
        text: 'This has happened 3 times now. Not good.',
        correctTone: 'frustrated',
        options: ['angry', 'frustrated', 'sad', 'neutral'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 208,
        text: 'OMG YES! Finally! Been waiting for this!!!',
        correctTone: 'excited',
        options: ['happy', 'excited', 'urgent', 'polite'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 209,
        text: 'I guess that works. Whatever.',
        correctTone: 'frustrated',
        options: ['happy', 'neutral', 'frustrated', 'polite'],
        difficulty: 'medium',
        rewardPoints: 5,
      },
      {
        id: 210,
        text: 'Yaar please jaldi bhejo, bahut urgent hai',
        correctTone: 'urgent',
        options: ['urgent', 'polite', 'happy', 'angry'],
        difficulty: 'medium',
        rewardPoints: 5,
      },

      // Hard questions - complex/mixed emotions
      {
        id: 211,
        text: 'I appreciate your help but this still doesn\'t solve my problem.',
        correctTone: 'frustrated',
        options: ['polite', 'frustrated', 'happy', 'angry'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 212,
        text: 'Great. Another delay. Perfect timing. 🙄',
        correctTone: 'frustrated',
        options: ['happy', 'frustrated', 'sad', 'excited'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 213,
        text: 'Boss please yaar, bahut zaroori hai but no pressure',
        correctTone: 'urgent',
        options: ['polite', 'urgent', 'neutral', 'happy'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 214,
        text: 'I mean... it\'s okay I guess. Not what I expected though.',
        correctTone: 'sad',
        options: ['happy', 'neutral', 'sad', 'angry'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
      {
        id: 215,
        text: 'Thanks for nothing. Really helpful. 👍',
        correctTone: 'angry',
        options: ['happy', 'polite', 'angry', 'neutral'],
        difficulty: 'hard',
        rewardPoints: 8,
      },
    ];
  }
}
