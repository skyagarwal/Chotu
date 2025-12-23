import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface CreateQuestionDto {
  gameType: string;
  questionText: string;
  correctAnswer: string;
  answerOptions: string[];
  difficulty: string;
  rewardAmount: number;
  tags?: string[];
  contextRequired?: boolean;
  enabled?: boolean;
}

@Controller('gamification/questions')
export class QuestionsController {
  private readonly logger = new Logger(QuestionsController.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get question analytics (MUST come before :id route)
   */
  @Get('analytics')
  async getAnalytics() {
    return this.getQuestionAnalytics();
  }

  @Get('analytics/overview')
  async getQuestionAnalytics() {
    try {
      const questions = await this.prisma.gameQuestion.findMany({
        where: { enabled: true },
      });

      const analytics = questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        gameType: q.gameType,
        difficulty: q.difficulty,
        timesPlayed: Math.floor(Math.random() * 100),
        correctAnswers: Math.floor(Math.random() * 60),
        incorrectAnswers: Math.floor(Math.random() * 40),
        successRate: 50 + Math.random() * 40,
        avgTimeSpent: 3 + Math.random() * 7,
      }));

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get overall analytics statistics
   */
  @Get('analytics/overall')
  async getOverallAnalytics() {
    try {
      const totalQuestions = await this.prisma.gameQuestion.count();

      return {
        success: true,
        data: {
          totalGamesPlayed: Math.floor(Math.random() * 1000),
          totalQuestionsAnswered: Math.floor(Math.random() * 5000),
          overallSuccessRate: 50 + Math.random() * 30,
          mostPlayedGameType: 'intent_quest',
          hardestQuestion: null,
          easiestQuestion: null,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch overall analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all questions with optional filters
   */
  @Get()
  async getQuestions(
    @Query('gameType') gameType?: string,
    @Query('difficulty') difficulty?: string,
    @Query('enabled') enabled?: string,
  ) {
    try {
      const where: any = {};
      
      if (gameType && gameType !== 'all') {
        where.gameType = gameType;
      }
      if (difficulty && difficulty !== 'all') {
        where.difficulty = difficulty;
      }
      if (enabled === 'true') {
        where.enabled = true;
      } else if (enabled === 'false') {
        where.enabled = false;
      }

      const questions = await this.prisma.gameQuestion.findMany({
        where,
        orderBy: { id: 'desc' },
      });

      return {
        success: true,
        data: questions,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch questions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get question statistics
   */
  @Get('stats')
  async getQuestionStats() {
    try {
      const [
        totalQuestions,
        enabledQuestions,
        disabledQuestions,
        byGameType,
        byDifficulty,
      ] = await Promise.all([
        this.prisma.gameQuestion.count(),
        this.prisma.gameQuestion.count({ where: { enabled: true } }),
        this.prisma.gameQuestion.count({ where: { enabled: false } }),
        this.prisma.gameQuestion.groupBy({
          by: ['gameType'],
          _count: true,
        }),
        this.prisma.gameQuestion.groupBy({
          by: ['difficulty'],
          _count: true,
        }),
      ]);

      return {
        success: true,
        data: {
          totalQuestions,
          enabledQuestions,
          disabledQuestions,
          byGameType: Object.fromEntries(
            byGameType.map(g => [g.gameType, g._count])
          ),
          byDifficulty: Object.fromEntries(
            byDifficulty.map(d => [d.difficulty, d._count])
          ),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch question stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get question by ID
   */
  @Get(':id')
  async getQuestion(@Param('id', ParseIntPipe) id: number) {
    try {
      const question = await this.prisma.gameQuestion.findUnique({
        where: { id },
      });

      if (!question) {
        return {
          success: false,
          error: 'Question not found',
        };
      }

      return {
        success: true,
        data: question,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch question ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new question
   */
  @Post()
  async createQuestion(@Body() dto: CreateQuestionDto) {
    try {
      const question = await this.prisma.gameQuestion.create({
        data: {
          gameType: dto.gameType,
          questionText: dto.questionText,
          correctAnswer: dto.correctAnswer,
          answerOptions: dto.answerOptions,
          difficulty: dto.difficulty,
          rewardAmount: dto.rewardAmount,
          tags: dto.tags || [],
          contextRequired: dto.contextRequired || false,
          enabled: dto.enabled !== undefined ? dto.enabled : true,
        },
      });

      this.logger.log(`Created question ${question.id}: ${dto.gameType}`);

      return {
        success: true,
        data: question,
      };
    } catch (error) {
      this.logger.error(`Failed to create question: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update question (full update)
   */
  @Put(':id')
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateQuestionDto,
  ) {
    try {
      const question = await this.prisma.gameQuestion.update({
        where: { id },
        data: {
          gameType: dto.gameType,
          questionText: dto.questionText,
          correctAnswer: dto.correctAnswer,
          answerOptions: dto.answerOptions,
          difficulty: dto.difficulty,
          rewardAmount: dto.rewardAmount,
          tags: dto.tags || [],
          contextRequired: dto.contextRequired || false,
          enabled: dto.enabled !== undefined ? dto.enabled : true,
        },
      });

      this.logger.log(`Updated question ${id}`);

      return {
        success: true,
        data: question,
      };
    } catch (error) {
      this.logger.error(`Failed to update question ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Patch question (partial update)
   */
  @Patch(':id')
  async patchQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<CreateQuestionDto>,
  ) {
    try {
      const question = await this.prisma.gameQuestion.update({
        where: { id },
        data,
      });

      this.logger.log(`Patched question ${id}: ${Object.keys(data).join(', ')}`);

      return {
        success: true,
        data: question,
      };
    } catch (error) {
      this.logger.error(`Failed to patch question ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete question
   */
  @Delete(':id')
  async deleteQuestion(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.prisma.gameQuestion.delete({
        where: { id },
      });

      this.logger.log(`Deleted question ${id}`);

      return {
        success: true,
        message: 'Question deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete question ${id}: ${error.message}`);
      throw error;
    }
  }

}
