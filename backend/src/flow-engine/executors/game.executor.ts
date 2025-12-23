import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import { GameOrchestratorService } from '../../gamification/services/game-orchestrator.service';
import { FlowContextService } from '../flow-context.service';
import { SessionService } from '../../session/session.service';

@Injectable()
export class GameExecutor implements ActionExecutor {
  public readonly name = 'game';
  private readonly logger = new Logger(GameExecutor.name);

  constructor(
    private readonly gameOrchestrator: GameOrchestratorService,
    private readonly contextService: FlowContextService,
    private readonly sessionService: SessionService,
  ) {}

  validate(config: Record<string, any>): boolean {
    return !!config.action;
  }

  async execute(
    config: Record<string, any>,
    context: FlowContext,
  ): Promise<ActionExecutionResult> {
    const action = (config.action as string) || 'start';
    const gameTypeRaw = (config.gameType as string) || 'intent_quest';
    
    // Interpolate gameType from context
    const gameType = this.contextService.interpolate(context, gameTypeRaw);
    
    this.logger.log(`🎮 Game Executor: ${action} ${gameType}`);

    const userId = context._system.userId;
    if (!userId) {
      return {
        success: true, // Step successful, but we return a response asking for login
        output: {
          message: 'Please login to play games and earn rewards! [BUTTON:Login:__LOGIN__]',
          buttons: [{ id: 'login', label: 'Login', value: '__LOGIN__' }]
        }
      };
    }

    try {
      if (action === 'start') {
        // Check if game already started in this flow run
        const gameStarted = this.contextService.get(context, `game_${gameType}_started`);
        
        if (gameStarted) {
           // If game started, check for user answer
           const userMessage = this.contextService.get(context, '_user_message');
           if (userMessage) {
             return this.processAnswer(context, userMessage);
           }
        }

        const result = await this.gameOrchestrator.startGame(Number(userId), gameType);
        
        if (result.success) {
          this.contextService.set(context, `game_${gameType}_started`, true);
          this.contextService.set(context, 'current_game_session_id', result.sessionId);
          
          let responseText = `${result.message}\n\n`;
          let buttons = [];
          
          if (result.question) {
            responseText += result.question.text + '\n\n';
            
            if (result.question.options && Array.isArray(result.question.options)) {
              buttons = result.question.options.map((opt, idx) => ({
                id: `option_${idx + 1}`,
                label: opt,
                value: String(idx + 1)
              }));

              result.question.options.forEach((opt, idx) => {
                responseText += `${idx + 1}. ${opt}\n`;
              });
              responseText += '\nReply with the number of your choice.';
            } else if (result.question.type === 'text_input') {
              responseText += '\nType your answer below.';
            }
          }
          
          return {
            success: true,
            output: {
              message: responseText,
              buttons: buttons.length > 0 ? buttons : undefined,
              game_session_id: result.sessionId,
              game_question_id: result.question?.questionId
            }
          };
        } else {
          return {
            success: false,
            error: 'Failed to start game'
          };
        }
      }
      
      if (action === 'answer') {
        const userMessage = this.contextService.get(context, '_user_message');
        return this.processAnswer(context, userMessage);
      }

      return {
        success: false,
        error: `Unknown game action: ${action}`
      };

    } catch (error) {
      this.logger.error(`Game execution error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async processAnswer(context: FlowContext, answer: string): Promise<ActionExecutionResult> {
    const sessionId = this.contextService.get(context, 'current_game_session_id');
    
    if (!sessionId) {
      return {
        success: false,
        error: 'No active game session'
      };
    }

    // Get auth token
    const flowSessionId = context._system.sessionId;
    const session = await this.sessionService.getSession(flowSessionId);
    const authToken = session?.data?.auth_token || '';

    const result = await this.gameOrchestrator.processAnswer(sessionId, answer, authToken);
    
    let responseText = '';
    if (result.correct) {
      responseText += '✅ Correct! ';
    } else {
      responseText += '❌ Incorrect. ';
    }
    responseText += `${result.feedback}\n\n`;

    let buttons = [];
    let completed = false;

    if (result.gameComplete) {
      responseText += `🎉 **Game Complete!**\n\nFinal Score: ${result.totalScore}\n`;
      if (result.rewardCredited) {
        responseText += `💰 Reward credited to your wallet!`;
      }
      completed = true;
    } else if (result.nextQuestion) {
      responseText += `--- Next Question ---\n\n`;
      responseText += result.nextQuestion.text + '\n\n';
      
      if (result.nextQuestion.options && Array.isArray(result.nextQuestion.options)) {
        buttons = result.nextQuestion.options.map((opt, idx) => ({
          id: `option_${idx + 1}`,
          label: opt,
          value: String(idx + 1)
        }));

        result.nextQuestion.options.forEach((opt, idx) => {
          responseText += `${idx + 1}. ${opt}\n`;
        });
        responseText += '\nReply with the number of your choice.';
      } else if (result.nextQuestion.type === 'text_input') {
        responseText += '\nType your answer below.';
      }
    }

    return {
      success: true,
      event: completed ? 'complete' : undefined,
      output: {
        message: responseText,
        buttons: buttons.length > 0 ? buttons : undefined,
        game_complete: completed,
        game_score: result.totalScore
      }
    };
  }
}
