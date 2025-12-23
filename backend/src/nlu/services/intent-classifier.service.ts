import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IndicBERTService } from './indicbert.service';
import { LlmIntentExtractorService } from './llm-intent-extractor.service';

interface IntentResult {
  intent: string;
  confidence: number;
  language: string;
  provider: 'indicbert' | 'llm' | 'heuristic' | 'fallback';
}

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);
  private readonly nluEnabled: boolean;
  private readonly llmFallbackEnabled: boolean;
  private readonly confidenceThreshold: number;

  constructor(
    private readonly config: ConfigService,
    private readonly indicBERTService: IndicBERTService,
    private readonly llmIntentExtractor: LlmIntentExtractorService,
  ) {
    this.nluEnabled = this.config.get('NLU_AI_ENABLED', 'true') === 'true';
    this.llmFallbackEnabled = this.config.get('NLU_LLM_FALLBACK_ENABLED', 'true') === 'true';
    this.confidenceThreshold = parseFloat(this.config.get('NLU_CONFIDENCE_THRESHOLD', '0.7'));
  }

  async classify(
    text: string,
    language: string = 'auto',
    context?: string,
  ): Promise<IntentResult> {
    if (!this.nluEnabled) {
      this.logger.debug('NLU AI disabled, using heuristics');
      return this.heuristicClassify(text);
    }

    // Step 0: Check heuristics FIRST for strong matches (overrides AI)
    // This ensures critical business keywords like "paneer" are never missed or misclassified by LLM
    const heuristicResult = this.heuristicClassify(text);
    if (heuristicResult.intent !== 'unknown' && heuristicResult.confidence >= 0.8) {
        this.logger.debug(`Heuristic match (strong): ${heuristicResult.intent}`);
        return heuristicResult;
    }

    try {
      // Step 1: Call real IndicBERT NLU service on port 7010
      const result = await this.indicBERTService.classify(text);

      if (result.intent && result.confidence >= this.confidenceThreshold) {
        this.logger.debug(`IndicBERT classified with high confidence: ${result.confidence}`);
        return {
          intent: result.intent,
          confidence: result.confidence,
          language: language,
          provider: 'indicbert',
        };
      }

      // Step 2: IndicBERT returned low/no confidence, try LLM fallback if enabled
      if (this.llmFallbackEnabled && (result.confidence < this.confidenceThreshold || !result.intent)) {
        this.logger.debug(`IndicBERT confidence ${result.confidence} below threshold ${this.confidenceThreshold}, trying LLM fallback`);
        try {
          const availableIntents = [
            'greeting', 'track_order', 'parcel_booking', 'search_product', 
            'cancel_order', 'help', 'complaint', 'unknown', 'order_food', 'login'
          ];
          const llmResult = await this.llmIntentExtractor.extractIntent(text, language, availableIntents);
          if (llmResult.intent && llmResult.confidence >= 0.5) {
            this.logger.debug(`LLM classified: ${llmResult.intent} (${llmResult.confidence})`);
            return {
              intent: llmResult.intent,
              confidence: llmResult.confidence,
              language: language,
              provider: 'llm',
            };
          }
        } catch (llmError) {
          this.logger.warn(`LLM fallback failed: ${llmError.message}`);
        }
      }

      // Step 3: Final fallback to heuristics
      this.logger.debug('Using heuristics as final fallback');
      return this.heuristicClassify(text);
    } catch (error) {
      this.logger.warn(
        `IndicBERT NLU call failed: ${error.message}, falling back to heuristics`,
      );
      return this.heuristicClassify(text);
    }
  }

  private heuristicClassify(text: string): IntentResult {
    const lowerText = text.toLowerCase().trim();
    this.logger.debug(`Heuristic check for: "${lowerText}"`);

    // Intent patterns (expandable)
    const patterns: Record<string, RegExp[]> = {
      greeting: [/^(hi|hello|hey|namaste|good morning|good afternoon)/i],
      track_order: [
        /track.*order/i,
        /where.*order/i,
        /order.*status/i,
        /delivery.*status/i,
      ],
      parcel_booking: [
        /send.*parcel/i,
        /book.*parcel/i,
        /courier/i,
        /package.*delivery/i,
      ],
      search_product: [/search/i, /find/i, /looking for/i, /show me/i],
      cancel_order: [/cancel.*order/i, /cancel/i],
      help: [/help/i, /support/i, /problem/i, /issue/i],
      complaint: [/complain/i, /refund/i, /wrong.*item/i, /damaged/i],
      order_food: [/order.*food/i, /hungry/i, /eat/i, /pizza/i, /burger/i, /biryani/i, /paneer/i, /menu/i],
      login: [/login/i, /sign in/i, /auth/i, /register/i, /signup/i],
    };

    for (const [intent, regexes] of Object.entries(patterns)) {
      if (regexes.some((regex) => regex.test(lowerText))) {
        this.logger.debug(`Heuristic match found: ${intent}`);
        // Boost confidence for specific keywords to ensure they override LLM
        let confidence = 0.7;
        if (intent === 'order_food' && (lowerText.includes('paneer') || lowerText.includes('biryani') || lowerText.includes('pizza'))) {
            confidence = 0.95;
        }
        
        return {
          intent,
          confidence,
          language: 'en',
          provider: 'heuristic',
        };
      }
    }

    return {
      intent: 'unknown',
      confidence: 0.3,
      language: 'en',
      provider: 'heuristic',
    };
  }
}
