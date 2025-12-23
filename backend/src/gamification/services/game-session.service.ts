import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface GameSession {
  sessionId: string;
  userId: number;
  gameType: string;
  currentRound: number;
  totalRounds: number;
  score: number;
  questions: any[];
  answers: any[];
  startedAt: Date;
  status: 'active' | 'completed' | 'abandoned';
}

export interface GameProgress {
  currentRound: number;
  totalRounds: number;
  score: number;
  maxScore: number;
  percentage: number;
}

/**
 * GameSessionService - Manages active game sessions and progress
 */
@Injectable()
export class GameSessionService {
  private readonly logger = new Logger(GameSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start a new game session
   */
  async startSession(
    userId: number,
    gameType: string,
    questions: any[],
    difficulty: string = 'medium',
    language: string = 'en',
  ): Promise<GameSession> {
    try {
      const sessionId = this.generateSessionId();
      
      const session = await this.prisma.gameSession.create({
        data: {
          sessionId,
          userId,
          gameType,
          difficulty,
          language,
          status: 'active',
          score: 0,
          missionData: {
            currentRound: 0,
            totalRounds: questions.length,
            questions: questions.map((q) => ({
              id: q.id,
              text: q.question_text || q.text,
              options: q.answer_options || q.options,
              correctAnswer: q.correct_answer || q.correctIntent || q.correctAnswer,
              reward: q.reward_amount || q.rewardPoints,
            })),
            answers: [],
            startedAt: new Date().toISOString(),
          },
        },
      });

      return {
        sessionId: session.sessionId,
        userId: session.userId,
        gameType: session.gameType,
        currentRound: 0,
        totalRounds: questions.length,
        score: 0,
        questions,
        answers: [],
        startedAt: session.startedAt || new Date(),
        status: 'active',
      };
    } catch (error) {
      this.logger.error(`Failed to start game session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get session by sessionId
   */
  async getSessionById(sessionId: string): Promise<GameSession | null> {
    try {
      const session = await this.prisma.gameSession.findUnique({
        where: { sessionId },
      });

      if (!session || !session.missionData) return null;

      const missionData = session.missionData as any;
      return {
        sessionId: session.sessionId,
        userId: session.userId,
        gameType: session.gameType,
        currentRound: missionData.currentRound || 0,
        totalRounds: missionData.totalRounds || 5,
        score: session.score || 0,
        questions: missionData.questions || [],
        answers: missionData.answers || [],
        startedAt: session.startedAt || new Date(),
        status: session.status === 'completed' ? 'completed' : session.status === 'abandoned' ? 'abandoned' : 'active',
      };
    } catch (error) {
      this.logger.error(`Failed to get session: ${error.message}`);
      return null;
    }
  }

  /**
   * Get active session for user
   */
  async getActiveSession(userId: number, gameType?: string): Promise<GameSession | null> {
    try {
      const session = await this.prisma.gameSession.findFirst({
        where: {
          userId,
          status: 'active',
          ...(gameType && { gameType }),
        },
        orderBy: { startedAt: 'desc' },
      });

      if (!session || !session.missionData) return null;

      const missionData = session.missionData as any;
      return {
        sessionId: session.sessionId,
        userId: session.userId,
        gameType: session.gameType,
        currentRound: missionData.currentRound || 0,
        totalRounds: missionData.totalRounds || 5,
        score: session.score || 0,
        questions: missionData.questions || [],
        answers: missionData.answers || [],
        startedAt: session.startedAt || new Date(),
        status: 'active',
      };
    } catch (error) {
      this.logger.error(`Failed to get active session: ${error.message}`);
      return null;
    }
  }

  /**
   * Update session with answer
   */
  async recordAnswer(
    sessionId: string,
    questionId: number,
    userAnswer: string,
    correct: boolean,
    pointsEarned: number,
  ): Promise<GameSession> {
    try {
      const session = await this.prisma.gameSession.findUnique({
        where: { sessionId },
      });

      if (!session || !session.missionData) {
        throw new Error('Session not found');
      }

      const missionData = session.missionData as any;
      const newAnswers = [
        ...(missionData.answers || []),
        {
          questionId,
          userAnswer,
          correct,
          points: pointsEarned,
          timestamp: new Date().toISOString(),
        },
      ];

      const newScore = (session.score || 0) + pointsEarned;
      const newRound = (missionData.currentRound || 0) + 1;

      const updated = await this.prisma.gameSession.update({
        where: { sessionId },
        data: {
          score: newScore,
          missionData: {
            ...missionData,
            currentRound: newRound,
            answers: newAnswers,
          },
        },
      });

      return {
        sessionId: updated.sessionId,
        userId: updated.userId,
        gameType: updated.gameType,
        currentRound: newRound,
        totalRounds: missionData.totalRounds,
        score: newScore,
        questions: missionData.questions,
        answers: newAnswers,
        startedAt: updated.startedAt || new Date(),
        status: 'active',
      };
    } catch (error) {
      this.logger.error(`Failed to record answer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete game session
   */
  async completeSession(sessionId: string): Promise<GameSession> {
    try {
      const session = await this.prisma.gameSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const updated = await this.prisma.gameSession.update({
        where: { sessionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      const missionData = updated.missionData as any;
      return {
        sessionId: updated.sessionId,
        userId: updated.userId,
        gameType: updated.gameType,
        currentRound: missionData?.currentRound || 0,
        totalRounds: missionData?.totalRounds || 0,
        score: updated.score || 0,
        questions: missionData?.questions || [],
        answers: missionData?.answers || [],
        startedAt: updated.startedAt || new Date(),
        status: 'completed',
      };
    } catch (error) {
      this.logger.error(`Failed to complete session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Abandon session (user left mid-game)
   */
  async abandonSession(sessionId: string): Promise<void> {
    try {
      await this.prisma.gameSession.update({
        where: { sessionId },
        data: {
          status: 'abandoned',
        },
      });
      this.logger.log(`Session ${sessionId} abandoned`);
    } catch (error) {
      this.logger.error(`Failed to abandon session: ${error.message}`);
    }
  }

  /**
   * Get game progress
   */
  getProgress(session: GameSession): GameProgress {
    const maxScore = session.questions.reduce((sum, q) => sum + (q.reward || q.reward_amount || 3), 0);
    const percentage = maxScore > 0 ? Math.round((session.score / maxScore) * 100) : 0;

    return {
      currentRound: session.currentRound,
      totalRounds: session.totalRounds,
      score: session.score,
      maxScore,
      percentage,
    };
  }

  /**
   * Get next question in session
   */
  getNextQuestion(session: GameSession): any | null {
    if (session.currentRound >= session.totalRounds) {
      return null;
    }
    return session.questions[session.currentRound];
  }

  /**
   * Check if session is complete
   */
  isComplete(session: GameSession): boolean {
    return session.currentRound >= session.totalRounds;
  }

  /**
   * Get user's game history
   */
  async getUserGameHistory(
    userId: number,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const sessions = await this.prisma.gameSession.findMany({
        where: {
          userId,
          status: 'completed',
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
      });

      return sessions.map((s) => {
        const missionData = s.missionData as any;
        return {
          sessionId: s.sessionId,
          gameType: s.gameType,
          score: s.score || 0,
          totalRounds: missionData?.totalRounds || 0,
          completedAt: s.completedAt,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get game history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get game statistics
   */
  async getGameStats(userId: number): Promise<any> {
    try {
      const sessions = await this.prisma.gameSession.findMany({
        where: {
          userId,
          status: 'completed',
        },
      });

      const totalGames = sessions.length;
      const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);

      const gamesByType = sessions.reduce((acc, s) => {
        acc[s.gameType] = (acc[s.gameType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalGames,
        totalScore,
        averageScore: totalGames > 0 ? Math.round(totalScore / totalGames) : 0,
        gamesByType,
      };
    } catch (error) {
      this.logger.error(`Failed to get game stats: ${error.message}`);
      return {
        totalGames: 0,
        totalScore: 0,
        averageScore: 0,
        gamesByType: {},
      };
    }
  }
}
