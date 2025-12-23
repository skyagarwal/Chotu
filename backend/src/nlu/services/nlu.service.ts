import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntentClassifierService } from './intent-classifier.service';
import { EntityExtractorService } from './entity-extractor.service';
import { ToneAnalyzerService } from './tone-analyzer.service';
import { LlmIntentExtractorService } from './llm-intent-extractor.service';
import { NluTrainingDataService } from './nlu-training-data.service';
import { ConversationCaptureService } from '../../services/conversation-capture.service';
import { ClassifyTextDto } from '../dto/classify-text.dto';
import { ClassificationResultDto } from '../dto/classification-result.dto';

@Injectable()
export class NluService {
  private readonly logger = new Logger(NluService.name);
  private readonly nluEnabled: boolean;
  private readonly confidenceThreshold: number;
  private readonly enableLlmFallback: boolean;
  private readonly captureTrainingData: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly intentClassifier: IntentClassifierService,
    private readonly entityExtractor: EntityExtractorService,
    private readonly toneAnalyzer: ToneAnalyzerService,
    private readonly llmIntentExtractor: LlmIntentExtractorService,
    private readonly trainingDataService: NluTrainingDataService,
    private readonly conversationCapture: ConversationCaptureService,
  ) {
    this.nluEnabled = this.config.get('NLU_AI_ENABLED', 'true') === 'true';
    this.confidenceThreshold = parseFloat(this.config.get('NLU_CONFIDENCE_THRESHOLD', '0.7'));
    this.enableLlmFallback = this.config.get('NLU_LLM_FALLBACK_ENABLED', 'true') === 'true';
    this.captureTrainingData = this.config.get('NLU_CAPTURE_TRAINING_DATA', 'true') === 'true';
    
    this.logger.log(`NLU Service initialized: enabled=${this.nluEnabled}, threshold=${this.confidenceThreshold}, llmFallback=${this.enableLlmFallback}`);
  }

  async classify(dto: ClassifyTextDto): Promise<ClassificationResultDto> {
    const startTime = Date.now();

    try {
      // Step 1: Classify intent using IndicBERT
      const intentResult = await this.intentClassifier.classify(
        dto.text,
        dto.language,
        dto.context,
      );

      // Step 2: Extract entities
      const entities = await this.entityExtractor.extract(
        dto.text,
        intentResult.intent,
        dto.language,
      );

      // Step 3: Analyze tone (advanced 7-emotion analysis)
      const toneResult = await this.toneAnalyzer.analyzeTone(dto.text, dto.language);

      // Step 4: Capture training data if enabled and confidence is reasonable
      // (IntentClassifierService already handles LLM fallback, so we just use its result)
      if (
        this.captureTrainingData &&
        intentResult.confidence >= 0.5 &&
        intentResult.provider === 'llm'
      ) {
        await this.trainingDataService.captureTrainingSample({
          text: dto.text,
          intent: intentResult.intent,
          entities,
          tone: toneResult.tone,
          sentiment: toneResult.sentiment,
          confidence: intentResult.confidence,
          source: 'llm-fallback',
          reviewStatus: 'pending',
          language: dto.language || 'auto',
          userId: dto.userId,
          sessionId: dto.sessionId,
        }).catch(err => {
          this.logger.warn(`Failed to capture training data: ${err.message}`);
        });
      }

      const processingTimeMs = Date.now() - startTime;

      // Build classification result
      const result: ClassificationResultDto = {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        entities,
        tone: toneResult.tone,
        sentiment: toneResult.sentiment,
        urgency: toneResult.urgency,
        language: intentResult.language,
        provider: intentResult.provider,
        processingTimeMs,
      };

      // Capture conversation for training (async, don't block)
      this.captureConversationAsync(dto, result).catch((err) =>
        this.logger.warn(`Failed to capture conversation: ${err.message}`)
      );

      this.logger.log(
        `Classified "${dto.text}" → ${intentResult.intent} (${intentResult.confidence.toFixed(2)}) | Tone: ${toneResult.tone} (urgency: ${toneResult.urgency.toFixed(2)}) | Provider: ${intentResult.provider} [${processingTimeMs}ms]`,
      );

      return result;
    } catch (error) {
      this.logger.error(`NLU classification failed: ${error.message}`, error.stack);

      // Fallback to basic heuristics
      return this.fallbackClassification(dto.text, Date.now() - startTime);
    }
  }

  private fallbackClassification(text: string, timeMs: number): ClassificationResultDto {
    const lowerText = text.toLowerCase().trim();

    // Simple keyword matching
    const intents = {
      greeting: ['hi', 'hello', 'hey', 'namaste', 'good morning'],
      track_order: ['track', 'order status', 'where is my order', 'delivery'],
      parcel_booking: ['parcel', 'send package', 'courier', 'delivery'],
      search_product: ['search', 'find', 'show me', 'looking for'],
      help: ['help', 'support', 'problem', 'issue'],
      order_food: ['order', 'food', 'hungry', 'eat', 'pizza', 'burger', 'biryani', 'paneer', 'menu'],
      login: ['login', 'sign in', 'auth', 'register', 'signup'],
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some((kw) => lowerText.includes(kw))) {
        return {
          intent,
          confidence: 0.5,
          entities: {},
          language: 'en',
          provider: 'fallback',
          processingTimeMs: timeMs,
        };
      }
    }

    // Enhanced fallback for unknown intents
    // Instead of just returning 'unknown', we can try to guide the user
    return {
      intent: 'unknown',
      confidence: 0.2,
      entities: {},
      language: 'en',
      provider: 'fallback',
      processingTimeMs: timeMs,
    };
  }

  /**
   * Captures conversation to PostgreSQL for training data collection
   * Runs asynchronously to not block NLU response
   */
  private async captureConversationAsync(
    dto: ClassifyTextDto,
    result: ClassificationResultDto
  ) {
    if (!this.captureTrainingData) {
      return;
    }

    // Extract module info from intent
    const { moduleId, moduleType } = this.extractModuleFromIntent(result.intent);

    await this.conversationCapture.captureConversation({
      sessionId: dto.sessionId || 'unknown',
      phoneNumber: dto.phoneNumber || dto.userId || 'unknown',
      userId: dto.userId ? parseInt(dto.userId, 10) : undefined,
      userMessage: dto.text,
      messageType: 'text',
      messageLanguage: result.language,
      nluIntent: result.intent,
      nluConfidence: result.confidence,
      nluModuleId: moduleId,
      nluModuleType: moduleType,
      nluProvider: result.provider,
      nluEntities: result.entities,
      nluTone: result.tone,
      nluProcessingTimeMs: result.processingTimeMs,
      conversationContext: dto.context,
      platform: 'whatsapp',
    });
  }

  /**
   * Extracts module_id and module_type from intent
   * 
   * Examples:
   * - intent.parcel.create → module_id=3, module_type='parcel'
   * - intent.food.item.search → module_id=4, module_type='food'
   * - intent.ecommerce.cart.add → module_id=5, module_type='ecommerce'
   */
  private extractModuleFromIntent(intent: string): {
    moduleId: number;
    moduleType: string;
  } {
    if (intent.includes('parcel')) {
      return { moduleId: 3, moduleType: 'parcel' };
    } else if (intent.includes('food')) {
      return { moduleId: 4, moduleType: 'food' };
    } else if (intent.includes('ecommerce') || intent.includes('shop')) {
      return { moduleId: 5, moduleType: 'ecommerce' };
    } else {
      // Default to food (most common)
      return { moduleId: 4, moduleType: 'food' };
    }
  }
}
