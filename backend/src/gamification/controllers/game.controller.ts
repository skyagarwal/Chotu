import { Body, Controller, Get, Post, Param } from '@nestjs/common';
import { GameOrchestratorService } from '../services/game-orchestrator.service';
import { GameSessionService } from '../services/game-session.service';

@Controller('gamification/games')
export class GameController {
  constructor(
    private readonly orchestrator: GameOrchestratorService,
    private readonly sessionService: GameSessionService,
  ) {}

  /**
   * Get available games list
   */
  @Get()
  async getGames() {
    const games = this.orchestrator.getAvailableGames();
    return {
      success: true,
      data: games,
      meta: {
        total: games.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Start a new game
   * POST /api/gamification/games/start
   */
  @Post('start')
  async startGame(
    @Body() body: {
      userId: number;
      gameType: string;
      difficulty?: string;
    },
  ) {
    try {
      const result = await this.orchestrator.startGame(
        body.userId,
        body.gameType,
        body.difficulty,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Submit answer to current question
   * POST /api/gamification/games/answer
   */
  @Post('answer')
  async submitAnswer(
    @Body() body: {
      sessionId: string;
      answer: string;
      timeSpent?: number;
      authToken?: string;
    },
  ) {
    try {
      const result = await this.orchestrator.processAnswer(
        body.sessionId,
        body.answer,
        body.authToken || '',
        body.timeSpent,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user's game history
   * GET /api/gamification/games/history/:userId
   */
  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    try {
      const history = await this.sessionService.getUserGameHistory(
        parseInt(userId),
        20,
      );
      return {
        success: true,
        data: history,
        meta: {
          total: history.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user's game statistics
   * GET /api/gamification/games/stats/:userId
   */
  @Get('stats/:userId')
  async getStats(@Param('userId') userId: string) {
    try {
      const stats = await this.sessionService.getGameStats(parseInt(userId));
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
