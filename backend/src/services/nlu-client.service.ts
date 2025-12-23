import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmIntentExtractorService } from '../nlu/services/llm-intent-extractor.service';
import { NluTrainingDataService } from '../nlu/services/nlu-training-data.service';
import axios, { AxiosInstance } from 'axios';
import * as http from 'http';
import { performance } from 'perf_hooks';
import { AiMetricsLogger } from '../common/logging/ai-metrics.logger';

export interface NluClassificationResult {
  intent: string;
  confidence: number;
  entities?: any[];
  raw?: any;
  provider?: 'indicbert' | 'llm' | 'heuristic';
}

/**
 * NLU Client Service
 * 
 * Multi-tier intent classification:
 * 1. Try LOCAL IndicBERT NLU (fast, trained model)
 * 2. Fallback to LLM (vLLM, accurate but slower)
 * 3. Final fallback to heuristics (keyword patterns)
 * 
 * NO ADMIN BACKEND - All AI services are local!
 */
@Injectable()
export class NluClientService {
  private readonly logger = new Logger(NluClientService.name);
  private readonly nluEndpoint: string;
  private readonly enabled: boolean;
  private readonly llmFallbackEnabled: boolean;
  private readonly captureTrainingData: boolean;
  private readonly axiosInstance: AxiosInstance;
  private readonly metricsLogger: AiMetricsLogger;

  constructor(
    private configService: ConfigService,
    private llmIntentExtractor: LlmIntentExtractorService,
    private trainingDataService: NluTrainingDataService,
  ) {
  // Use local NLU container (mangwale_nlu on port 7010)
  this.nluEndpoint = this.configService.get<string>('NLU_ENDPOINT') || 'http://nlu:7010';
  this.captureTrainingData = this.configService.get('NLU_CAPTURE_TRAINING_DATA', 'true') === 'true';
  this.enabled = this.configService.get<boolean>('NLU_AI_ENABLED') !== false;
  this.llmFallbackEnabled = this.configService.get<boolean>('NLU_LLM_FALLBACK_ENABLED') !== false;
  this.metricsLogger = new AiMetricsLogger('nlu', this.configService);
    
    // Create optimized HTTP client for NLU service
    this.axiosInstance = axios.create({
      baseURL: this.nluEndpoint,
      timeout: 5000, // 5 second timeout (NLU is fast)
      
      httpAgent: new http.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 30, // NLU is lightweight
        maxFreeSockets: 10,
        timeout: 10000,
        scheduling: 'fifo',
      }),
      
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100',
      },
      
      validateStatus: (status) => status >= 200 && status < 300,
    });
    
    if (this.enabled) {
      this.logger.log(`✅ NLU Client initialized - Local IndicBERT: ${this.nluEndpoint}`);
      this.logger.log(`   Connection Pooling: Enabled (max: 30, free: 10)`);
      this.logger.log(`   Timeout: 5s`);
      if (this.llmFallbackEnabled) {
        this.logger.log(`✅ LLM fallback enabled for intent classification`);
      }
    } else {
      this.logger.warn('⚠️  NLU AI disabled - using fallback heuristics');
    }
  }

  /**
   * Classify user message using Admin Backend's trained NLU model
   * 
   * @param text - User message text
   * @param context - Optional context (user_id, session_id, etc.)
   * @returns Classification result with intent and confidence
   */
  async classify(text: string, context?: Record<string, any>): Promise<NluClassificationResult> {
    if (!text || text.trim().length === 0) {
      return {
        intent: 'unknown',
        confidence: 0,
        raw: { error: 'empty_text' }
      };
    }

    // If NLU AI is disabled or Admin Backend unavailable, use fallback
    if (!this.enabled) {
      return this.fallbackClassify(text);
    }

    try {
      const startTime = performance.now();
      const requestId = `nlu_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const response = await this.axiosInstance.post('/classify', { text });
      const latency = performance.now() - startTime;
      const result = response.data;
      
      // IndicBERT returns: { intent, intent_conf, tone, tone_conf, embedding, slots }
      const intent = result.intent || 'unknown';
      const confidence = result.intent_conf || 0;
      
      this.logger.debug(
        `📊 IndicBERT: "${text.substring(0, 50)}..." → intent: ${intent}, ` +
        `confidence: ${confidence.toFixed(2)}, latency: ${latency.toFixed(2)}ms`
      );

      // Log to metrics system
      await this.metricsLogger.logRequest({
        service: 'nlu',
        operation: 'classify',
        requestId,
        input: { text },
        result: {
          intent,
          confidence,
          tone: result.tone,
        },
        metrics: {
          startTime,
          endTime: performance.now(),
          latency: Math.round(latency),
        },
        quality: {
          confidence,
          intent,
        },
      });

      // If IndicBERT confidence is too low, try LLM fallback
      if ((!intent || intent === 'default' || confidence < 0.5) && this.llmFallbackEnabled) {
        this.logger.log(`🤖 IndicBERT confidence ${confidence} too low, trying LLM fallback...`);
        const llmResult = await this.llmFallbackClassify(text, context);
        return this.applyFoodOverride(text, llmResult);
      }

      // If LLM fallback is disabled, use heuristics
      if (!intent || intent === 'default' || confidence < 0.5) {
        this.logger.debug(`Using heuristics (LLM fallback disabled)`);
        return this.fallbackClassify(text);
      }

      // OVERRIDE: If the model misclassifies obvious greetings, fix it
      const lowerText = text.toLowerCase().trim();
      const greetingPattern = /^(hi|hello|hey|namaste|hola|good morning|good evening|good afternoon|howdy|sup|greetings|yo|hii|hiii|helloo|heyy|what'?s\s*up|wassup|how are you|how r u|how are u|how r you|hru)\b/;
      
      const matchesPattern = greetingPattern.test(lowerText);
      const isParcelOrTrack = (intent === 'parcel_booking' || intent === 'track_order');
      
      if (isParcelOrTrack && matchesPattern) {
        this.logger.warn(`⚠️  NLU misclassified greeting "${text}" as ${intent} - overriding to greeting`);
        return {
          intent: 'greeting', 
          confidence: 0.95, 
          entities: result.slots || [],
          raw: { ...result, overridden: true, latency, provider: 'indicbert' }
        };
      }

      // OVERRIDE: Support/help/customer care should go to FAQ agent
      if (intent === 'parcel_booking' && 
          /\b(help|support|customer care|customer service|assist|problem|issue)\b/i.test(lowerText)) {
        this.logger.warn(`⚠️  NLU misclassified support request "${text}" as parcel order - overriding to support`);
        return {
          intent: 'support', 
          confidence: 0.95, 
          entities: result.slots || [],
          raw: { ...result, overridden: true, latency, provider: 'indicbert' }
        };
      }

      return this.applyFoodOverride(text, {
        intent: intent,
        confidence: confidence,
        entities: result.slots || [],
        raw: { ...result, latency, provider: 'indicbert' }
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`NLU classification failed: ${errorMsg}, using fallback`);
      
      // Log error to metrics
      await this.metricsLogger.logRequest({
        service: 'nlu',
        operation: 'classify',
        input: { text },
        error: {
          message: errorMsg,
          stack: error instanceof Error ? error.stack : undefined,
        },
        metrics: {
          startTime: performance.now(),
          endTime: performance.now(),
          latency: 0,
        },
      });
      
      // Try LLM fallback if enabled
      if (this.llmFallbackEnabled) {
        const llmResult = await this.llmFallbackClassify(text, context);
        return this.applyFoodOverride(text, llmResult);
      }
      
      // Final fallback to heuristics
      return this.fallbackClassify(text);
    }
  }

  /**
   * LLM fallback for intent classification
   * Uses vLLM to extract intent when IndicBERT fails
   * Also captures training data for improving IndicBERT
   */
  private async llmFallbackClassify(text: string, context?: Record<string, any>): Promise<NluClassificationResult> {
    try {
      const availableIntents = [
        'greeting',
        'parcel_booking',
        'track_order',
        'order_food',
        'browse_menu',
        'search_product',
        'earn',
        'cancel_order',
        'support_request',
        'unknown'
      ];

      const llmResult = await this.llmIntentExtractor.extractIntent(text, 'auto', availableIntents);
      
      this.logger.log(
        `🤖 LLM Fallback: "${text.substring(0, 50)}..." → ${llmResult.intent} ` +
        `(${llmResult.confidence.toFixed(2)}) | Reasoning: ${llmResult.reasoning}`
      );

      // Capture LLM results as training data for IndicBERT
      if (this.captureTrainingData && llmResult.confidence >= 0.5) {
        await this.trainingDataService.captureTrainingSample({
          text,
          intent: llmResult.intent,
          entities: llmResult.entities || {},
          tone: llmResult.tone,
          sentiment: llmResult.sentiment,
          confidence: llmResult.confidence,
          source: 'llm-fallback',
          reviewStatus: 'pending',
          language: 'auto',
        }).catch(err => {
          this.logger.warn(`Failed to capture training data: ${err.message}`);
        });
      }

      return {
        intent: llmResult.intent,
        confidence: llmResult.confidence,
        entities: Object.keys(llmResult.entities).length > 0 ? [llmResult.entities] : [],
        provider: 'llm',
        raw: {
          tone: llmResult.tone,
          sentiment: llmResult.sentiment,
          urgency: llmResult.urgency,
          reasoning: llmResult.reasoning,
        }
      };
    } catch (llmError) {
      this.logger.warn(`LLM fallback failed: ${llmError.message}, using heuristics`);
      return this.fallbackClassify(text);
    }
  }

  /**
   * Fallback heuristic classification when AI is unavailable
   * 
   * Uses comprehensive keyword matching for common intents.
   * This ensures the system keeps working even if Admin Backend is down.
   * 
   * UPDATED: Enhanced patterns for better food/parcel/support detection
   */
  private fallbackClassify(text: string): NluClassificationResult {
    const lower = text.toLowerCase().trim();

    // ========== SEARCH PRODUCT ==========
    // Patterns: "search for pizza", "find burger", "look for", etc.
    if (/search|find|look.*for|dhundo|khojo/.test(lower)) {
      return { intent: 'search_product', confidence: 0.95, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== PARCEL DELIVERY - P2P FOOD CHECK ==========
    // Check for explicit "send" + "food" context BEFORE generic food check
    if (/send.*food|deliver.*food.*to.*friend|pickup.*food|food.*pickup|ghar.*se.*food|home.*cooked/.test(lower)) {
       return { intent: 'parcel_booking', confidence: 0.85, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== FOOD ORDERING - HIGHEST PRIORITY ==========
    // Patterns: "i want food", "hungry", "order pizza", "food chahiye", etc.
    if (/food|hungry|eat|pizza|burger|biryani|restaurant|dinner|lunch|breakfast|snacks|chinese|italian|order.*food|khana|khane|bhukh|mangwao|mangwana|khilao|order.*pizza|order.*burger/.test(lower)) {
      return { intent: 'order_food', confidence: 0.78, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== PARCEL DELIVERY ==========
    // Patterns: "send parcel", "delivery", "courier", "pickup", etc.
    if (/parcel|delivery|courier|send|pickup|bhejni|bhejwana|bhejwao|package|document|urgent.*delivery|same.*day|bike.*delivery|pickup.*and.*delivery/.test(lower)) {
      return { intent: 'parcel_booking', confidence: 0.78, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== TRACK ORDER ==========
    // Patterns: "where is my order", "track", "status", "location", etc.
    if (/track|where.*order|where.*parcel|order.*status|delivery.*status|location|kahan.*hai|kahan.*pahunch|status.*kya.*hai|order.*update/.test(lower)) {
      return { intent: 'track_order', confidence: 0.78, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== BROWSE MENU ==========
    // Patterns: "show menu", "what items", "restaurants", etc.
    if (/menu|show|browse|items|restaurants|options|cuisines|dikhao|dikhaye|kya.*kya.*milta|what.*do.*you.*have|available.*food|see.*restaurants/.test(lower)) {
      return { intent: 'browse_menu', confidence: 0.78, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== SUPPORT / HELP ==========
    // Patterns: "help", "problem", "complaint", "refund", "cancel", "rider", "delivery person", etc.
    if (/help|support|problem|issue|complaint|refund|cancel|wrong|not.*working|galat|madad|customer.*care|cancel.*order|rider|delivery.*person|connect.*rider|talk.*to.*rider|call.*rider|driver|delivery.*boy|courier.*boy/.test(lower)) {
      return { intent: 'support_request', confidence: 0.78, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== GREETING ==========
    // Patterns: "hi", "hello", "hey", "namaste", etc.
    if (/^(hi|hello|hey|namaste|hola|good.*morning|good.*evening|start|kaise.*ho|howdy)\b/.test(lower)) {
      return { intent: 'greeting', confidence: 0.85, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== GENERIC ORDER (Fallback for "order" without context) ==========
    if (/order|buy|purchase|book|place.*order|chahiye/.test(lower)) {
      return { intent: 'create_order', confidence: 0.65, raw: { source: 'fallback_heuristic_enhanced' } };
    }

    // ========== UNKNOWN ==========
    return { intent: 'unknown', confidence: 0.35, raw: { source: 'fallback_heuristic_enhanced' } };
  }

  /**
   * Analyze message with more details (entities, tone, etc.)
   * 
   * Uses local IndicBERT's /classify endpoint which includes tone and entities
   */
  async analyze(text: string, context?: Record<string, any>): Promise<any> {
    if (!this.enabled) {
      return this.classify(text, context);
    }

    try {
      const response = await this.axiosInstance.post('/classify', { text });
      const result = response.data;
      
      return {
        intent: result.intent || 'unknown',
        confidence: result.intent_conf || 0,
        tone: result.tone,
        toneConfidence: result.tone_conf,
        entities: result.slots || [],
        embedding: result.embedding,
        provider: 'indicbert'
      };
    } catch (error) {
      this.logger.error(`NLU analyze failed: ${error}`);
      return this.classify(text, context);
    }
  }

  /**
   * OVERRIDE: Fix common misclassifications where food items are treated as parcels
   * e.g. "send paneer to home" -> should be order_food, not parcel_booking
   */
  private applyFoodOverride(text: string, result: NluClassificationResult): NluClassificationResult {
    const lowerText = text.toLowerCase();
    
    // Strong food indicators that should almost never be "parcel" in this context
    const foodKeywords = [
      'paneer', 'biryani', 'chicken', 'mutton', 'dal', 'roti', 'naan', 'thali', 
      'burger', 'pizza', 'sandwich', 'fries', 'pasta', 'noodles', 'rice', 
      'paratha', 'kulcha', 'soup', 'starter', 'dessert', 'beverage', 'shake', 
      'juice', 'lassi', 'coffee', 'tea', 'breakfast', 'lunch', 'dinner',
      'manchurian', 'tikka', 'kebab', 'curry', 'masala', 'momos'
    ];

    // If intent is parcel_booking but text contains food keywords
    if (result.intent === 'parcel_booking') {
      // CRITICAL EXCEPTION: If the user explicitly says "send", "deliver to friend", "pickup from home", 
      // "my home", "friend's house", keep it as parcel_booking.
      // This distinguishes "ordering from restaurant" vs "sending homemade food"
      const isP2PContext = 
        lowerText.includes('send') || 
        lowerText.includes('courier') || 
        lowerText.includes('pickup from my') || 
        lowerText.includes('from my home') ||
        lowerText.includes('to my friend') ||
        lowerText.includes('bhej') || // Hindi "send"
        lowerText.includes('deliver to friend');

      if (isP2PContext) {
        this.logger.debug(`📦 Keeping parcel_booking for food item due to P2P context: "${text}"`);
        return result;
      }

      const matchedKeyword = foodKeywords.find(k => lowerText.includes(k));
      if (matchedKeyword) {
        this.logger.warn(`⚠️  NLU misclassified food order "${text}" as parcel_booking (found "${matchedKeyword}") - overriding to order_food`);
        return {
          ...result,
          intent: 'order_food',
          confidence: 0.98, // High confidence override
          raw: { ...result.raw, overridden: true, originalIntent: 'parcel_booking', overrideReason: `keyword_${matchedKeyword}` }
        };
      }
    }
    
    return result;
  }

  /**
   * Health check - test if local IndicBERT NLU is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/healthz', {
        timeout: 3000,
      });
      
      const data = response.data;
      this.logger.debug(`NLU Health: encoder_loaded=${data.encoder_loaded}, intent_loaded=${data.intent_loaded}`);
      return data.encoder_loaded === true;
    } catch {
      return false;
    }
  }
}

