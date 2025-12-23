import { Injectable, Logger } from '@nestjs/common';
import { IntentQuestService } from './intent-quest.service';
import { LanguageMasterService } from './language-master.service';
import { ToneDetectiveService } from './tone-detective.service';
import { ProfileBuilderService } from './profile-builder.service';
import { GameSessionService } from './game-session.service';
import { TrainingSampleService } from './training-sample.service';
import { GameRewardService } from './game-reward.service';

export interface StartGameResponse {
  success: boolean;
  sessionId: string;
  message: string;
  question: any;
  progress: string;
}

export interface AnswerResponse {
  success: boolean;
  correct?: boolean;
  score: number;
  feedback: string;
  nextQuestion: any | null;
  progress: string;
  gameComplete: boolean;
  totalScore?: number;
  rewardCredited?: boolean;
}

/**
 * GameOrchestratorService - Coordinates all game types and handles game flow
 */
@Injectable()
export class GameOrchestratorService {
  private readonly logger = new Logger(GameOrchestratorService.name);

  constructor(
    private readonly intentQuest: IntentQuestService,
    private readonly languageMaster: LanguageMasterService,
    private readonly toneDetective: ToneDetectiveService,
    private readonly profileBuilder: ProfileBuilderService,
    private readonly sessionService: GameSessionService,
    private readonly trainingSample: TrainingSampleService,
    private readonly rewardService: GameRewardService,
  ) {}

  /**
   * Start a new game
   */
  async startGame(
    userId: number,
    gameType: string,
    difficulty?: string,
  ): Promise<StartGameResponse> {
    try {
      // Handle numeric selection (1, 2, 3) from chat menu
      const numericSelection = parseInt(gameType);
      if (!isNaN(numericSelection)) {
        const games = this.getAvailableGames();
        if (numericSelection >= 1 && numericSelection <= games.length) {
          gameType = games[numericSelection - 1].id;
          this.logger.log(`Mapped numeric selection ${numericSelection} to game type: ${gameType}`);
        }
      }

      // Check for existing active session
      const existingSession = await this.sessionService.getActiveSession(userId, gameType);
      if (existingSession) {
        const nextQuestion = this.sessionService.getNextQuestion(existingSession);
        const progress = this.sessionService.getProgress(existingSession);
        
        return {
          success: true,
          sessionId: existingSession.sessionId,
          message: `Resuming ${gameType}...`,
          question: nextQuestion,
          progress: `Round ${progress.currentRound + 1}/${progress.totalRounds} | Score: ${progress.score}/${progress.maxScore}`,
        };
      }

      // Load questions based on game type
      const questions = await this.loadQuestions(gameType, 5, difficulty);
      
      if (!questions || questions.length === 0) {
        throw new Error(`No questions available for ${gameType}`);
      }

      // Create new session
      const session = await this.sessionService.startSession(userId, gameType, questions, difficulty);
      const firstQuestion = questions[0];

      return {
        success: true,
        sessionId: session.sessionId,
        message: this.getGameIntro(gameType),
        question: this.formatQuestion(gameType, firstQuestion, 1, 5),
        progress: `Round 1/5 | Score: 0`,
      };
    } catch (error) {
      this.logger.error(`Failed to start game: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process user's answer
   */
  async processAnswer(
    sessionId: string,
    userAnswer: string,
    authToken: string,
    timeSpent?: number,
  ): Promise<AnswerResponse> {
    try {
      const session = await this.sessionService.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found or expired');
      }

      const currentQuestion = this.sessionService.getNextQuestion(session);
      if (!currentQuestion) {
        throw new Error('No active question');
      }

      // Map question fields to match service expectations
      const mappedQuestion = this.mapQuestionFields(session.gameType, currentQuestion);

      // Validate answer based on game type
      const result = await this.validateAnswer(
        session.gameType,
        mappedQuestion,
        userAnswer,
        timeSpent,
      );

      // Record answer in session
      await this.sessionService.recordAnswer(
        sessionId,
        currentQuestion.id,
        userAnswer,
        result.correct !== undefined ? result.correct : true,
        result.score,
      );

      // Save training sample
      await this.saveTrainingSample(
        session.userId,
        session.gameType,
        sessionId,
        currentQuestion,
        userAnswer,
        result,
      );

      // Get updated session
      const updatedSession = await this.sessionService.getSessionById(sessionId);
      const isComplete = this.sessionService.isComplete(updatedSession);
      const progress = this.sessionService.getProgress(updatedSession);

      let rewardCredited = false;
      if (isComplete) {
        // Complete session
        await this.sessionService.completeSession(sessionId);
        
        // Credit reward
        const txnId = await this.rewardService.creditReward(session.userId, session.gameType, sessionId, authToken);
        rewardCredited = !!txnId;
        
        return {
          success: true,
          correct: result.correct,
          score: result.score,
          feedback: result.feedback,
          nextQuestion: null,
          progress: `Game Complete! Final Score: ${progress.score}/${progress.maxScore} (${progress.percentage}%)`,
          gameComplete: true,
          totalScore: progress.score,
          rewardCredited,
        };
      }

      // Get next question
      const nextQuestion = this.sessionService.getNextQuestion(updatedSession);

      return {
        success: true,
        correct: result.correct,
        score: result.score,
        feedback: result.feedback,
        nextQuestion: this.formatQuestion(
          session.gameType,
          nextQuestion,
          updatedSession.currentRound + 1,
          updatedSession.totalRounds,
        ),
        progress: `Round ${updatedSession.currentRound + 1}/${updatedSession.totalRounds} | Score: ${progress.score}/${progress.maxScore}`,
        gameComplete: false,
      };
    } catch (error) {
      this.logger.error(`Failed to process answer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load questions for game type
   */
  private async loadQuestions(
    gameType: string,
    count: number,
    difficulty?: string,
  ): Promise<any[]> {
    switch (gameType) {
      case 'intent_quest':
        return this.intentQuest.getQuestions(count, difficulty);
      case 'language_master':
        return this.languageMaster.getQuestions(count, difficulty);
      case 'tone_detective':
        return this.toneDetective.getQuestions(count, difficulty);
      case 'profile_builder':
        return this.profileBuilder.getQuestions(count);
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }
  }

  /**
   * Map question field names to match service expectations
   * DB uses: correctAnswer, but services expect: correctIntent, correctLanguage, etc.
   */
  private mapQuestionFields(gameType: string, question: any): any {
    const mapped = { ...question };
    
    switch (gameType) {
      case 'intent_quest':
        mapped.correctIntent = question.correctAnswer || question.correctIntent;
        mapped.rewardPoints = question.reward || question.rewardPoints;
        break;
      case 'language_master':
        mapped.correctLanguage = question.correctAnswer || question.correctLanguage;
        mapped.rewardPoints = question.reward || question.rewardPoints;
        break;
      case 'tone_detective':
        mapped.correctTone = question.correctAnswer || question.correctTone;
        mapped.rewardPoints = question.reward || question.rewardPoints;
        break;
      case 'profile_builder':
        // Profile builder uses yes/no, no field mapping needed
        break;
    }
    
    return mapped;
  }

  /**
   * Validate answer based on game type
   */
  private async validateAnswer(
    gameType: string,
    question: any,
    userAnswer: string,
    timeSpent?: number,
  ): Promise<any> {
    switch (gameType) {
      case 'intent_quest':
        return this.intentQuest.validateAnswer(question, userAnswer, timeSpent);
      case 'language_master':
        return this.languageMaster.validateAnswer(question, userAnswer, timeSpent);
      case 'tone_detective':
        return this.toneDetective.validateAnswer(question, userAnswer, timeSpent);
      case 'profile_builder':
        return this.profileBuilder.processAnswer(question, userAnswer);
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }
  }

  /**
   * Format question for display
   */
  private formatQuestion(
    gameType: string,
    question: any,
    round: number,
    totalRounds: number,
  ): any {
    const baseFormat = {
      round,
      totalRounds,
      questionId: question.id,
    };

    switch (gameType) {
      case 'intent_quest':
        return {
          ...baseFormat,
          text: `**User says:** "${question.text}"\n\n**What's the intent?**`,
          options: question.options,
          type: 'multiple_choice',
        };
      case 'language_master':
        return {
          ...baseFormat,
          text: `**Text:** "${question.text}"\n\n**What language is this?**`,
          options: question.options,
          type: 'multiple_choice',
        };
      case 'tone_detective':
        return {
          ...baseFormat,
          text: `**Message:** "${question.text}"\n\n**What's the tone/emotion?**`,
          options: question.options,
          type: 'multiple_choice',
        };
      case 'profile_builder':
        return {
          ...baseFormat,
          text: question.question,
          type: 'text_input',
        };
      default:
        return baseFormat;
    }
  }

  /**
   * Get game introduction message
   */
  private getGameIntro(gameType: string): string {
    const intros = {
      intent_quest: '🎯 **Intent Quest** - Guess what users really mean!\n\nRead each message and identify the correct intent. You have 5 questions. Good luck!',
      language_master: '🌍 **Language Master** - Detect the language!\n\nIdentify the language of each text. Watch for mixed languages! You have 5 questions.',
      tone_detective: '😊 **Tone Detective** - Feel the emotion!\n\nIdentify the emotional tone of each message. You have 5 questions.',
      profile_builder: '📝 **Profile Builder** - Tell us about yourself!\n\nAnswer 10 quick questions and earn ₹1 per answer. Help us serve you better!',
    };
    return intros[gameType] || 'Let\'s play!';
  }

  /**
   * Save training sample
   */
  private async saveTrainingSample(
    userId: number,
    gameType: string,
    sessionId: string,
    question: any,
    userAnswer: string,
    result: any,
  ): Promise<void> {
    try {
      // Prepare data in format expected by TrainingSampleService
      const sampleData: any = {
        userId,
        sessionId: sessionId.substring(0, 99), // Trim to fit VarChar(100)
        gameSessionId: sessionId.substring(0, 99), // Trim to fit VarChar(100)
        text: userAnswer || question.text || question.questionText || '',
        intent: result.correctAnswer || 'unknown', // Required field
        confidence: result.correct ? 1.0 : 0.0,
        source: 'game' as const,
        context: {
          gameType,
          questionId: question.id,
          questionText: question.text || question.questionText,
          userAnswer,
          correct: result.correct,
        },
      };

      // Add game-specific fields
      if (gameType === 'intent_quest') {
        sampleData.intent = result.correctAnswer;
      } else if (gameType === 'language_master') {
        sampleData.language = result.correctAnswer;
        sampleData.intent = 'language_detection'; // Still need intent field
      } else if (gameType === 'tone_detective') {
        sampleData.tone = result.correctAnswer;
        sampleData.intent = 'tone_detection'; // Still need intent field
      } else if (gameType === 'profile_builder') {
        sampleData.intent = 'profile_preference'; // Still need intent field
      }

      await this.trainingSample.createTrainingSample(sampleData);
      this.logger.log(`✅ Saved training sample for ${gameType}: ${result.correct ? 'correct' : 'incorrect'}`);
    } catch (error) {
      this.logger.error(`Failed to save training sample: ${error.message}`);
      // Don't throw - game should continue even if logging fails
    }
  }

  /**
   * Get available games list
   */
  getAvailableGames(): any[] {
    return [
      {
        id: 'intent_quest',
        name: 'Intent Quest',
        icon: '🎯',
        description: 'Guess what users really mean',
        reward: '₹15',
        points: 150,
        duration: '2-3 min',
      },
      {
        id: 'language_master',
        name: 'Language Master',
        icon: '🌍',
        description: 'Detect the language',
        reward: '₹15',
        points: 150,
        duration: '2-3 min',
      },
      {
        id: 'tone_detective',
        name: 'Tone Detective',
        icon: '😊',
        description: 'Identify the emotion',
        reward: '₹15',
        points: 150,
        duration: '2-3 min',
      },
      {
        id: 'profile_builder',
        name: 'Profile Builder',
        icon: '📝',
        description: 'Quick questions',
        reward: '₹1 per answer',
        points: 10,
        duration: '1-2 min',
      },
    ];
  }
}
