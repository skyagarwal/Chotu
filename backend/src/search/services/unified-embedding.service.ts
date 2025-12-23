import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { IndicBERTService } from '../../nlu/services/indicbert.service';

/**
 * Language detection result
 */
export interface LanguageDetection {
  language: 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te' | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'mixed';
  script: 'latin' | 'devanagari' | 'bengali' | 'tamil' | 'telugu' | 'gujarati' | 'kannada' | 'malayalam' | 'gurmukhi' | 'oriya' | 'mixed';
  confidence: number;
}

/**
 * Embedding result with metadata
 */
export interface EmbeddingResult {
  embedding: number[];
  model: 'minilm-384' | 'indicbert-768';
  dimensions: 384 | 768;
  language: string;
  processingTimeMs: number;
}

/**
 * UnifiedEmbeddingService
 * 
 * Provides language-aware embedding generation using:
 * - MiniLM-L6-v2 (384 dimensions) for English text
 * - IndicBERT v2 (768 dimensions) for Hindi, Marathi, and other Indic languages
 * 
 * This service acts as the single point for generating embeddings,
 * automatically selecting the best model based on the input language.
 * 
 * Architecture:
 * - Detects script/language of input text
 * - Routes to appropriate embedding model
 * - Returns normalized embeddings with metadata
 * 
 * Note: For OpenSearch k-NN, you'll need dual indices:
 * - items_vector_384 for MiniLM embeddings
 * - items_vector_768 for IndicBERT embeddings
 * 
 * Or use padding to normalize dimensions (384 → 768 with zeros)
 */
@Injectable()
export class UnifiedEmbeddingService {
  private readonly logger = new Logger(UnifiedEmbeddingService.name);
  
  // Unicode ranges for script detection
  private readonly scriptRanges = {
    devanagari: /[\u0900-\u097F]/,      // Hindi, Marathi, Sanskrit
    bengali: /[\u0980-\u09FF]/,          // Bengali
    tamil: /[\u0B80-\u0BFF]/,            // Tamil
    telugu: /[\u0C00-\u0C7F]/,           // Telugu
    gujarati: /[\u0A80-\u0AFF]/,         // Gujarati
    kannada: /[\u0C80-\u0CFF]/,          // Kannada
    malayalam: /[\u0D00-\u0D7F]/,        // Malayalam
    gurmukhi: /[\u0A00-\u0A7F]/,         // Punjabi
    oriya: /[\u0B00-\u0B7F]/,            // Odia
    latin: /[a-zA-Z]/,                    // English
  };
  
  // Script to language mapping (simplified)
  private readonly scriptToLanguage: Record<string, string> = {
    devanagari: 'hi',  // Could be Hindi or Marathi, IndicBERT handles both
    bengali: 'bn',
    tamil: 'ta',
    telugu: 'te',
    gujarati: 'gu',
    kannada: 'kn',
    malayalam: 'ml',
    gurmukhi: 'pa',
    oriya: 'or',
    latin: 'en',
  };
  
  constructor(
    private readonly embeddingService: EmbeddingService,
    @Inject(forwardRef(() => IndicBERTService))
    private readonly indicBertService: IndicBERTService,
  ) {
    this.logger.log('✅ UnifiedEmbeddingService initialized');
    this.logger.log('   English: MiniLM-L6-v2 (384 dimensions)');
    this.logger.log('   Indic: IndicBERTv2 (768 dimensions)');
  }
  
  /**
   * Generate embedding for text, automatically selecting the best model
   */
  async embed(text: string, options?: { forceModel?: 'minilm' | 'indicbert' }): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const languageDetection = this.detectLanguage(text);
    
    this.logger.debug(`Embedding text (${text.substring(0, 50)}...) - ` +
      `Language: ${languageDetection.language}, Script: ${languageDetection.script}`);
    
    // Force specific model if requested
    if (options?.forceModel === 'minilm') {
      return this.embedWithMiniLM(text, languageDetection.language, startTime);
    }
    if (options?.forceModel === 'indicbert') {
      return this.embedWithIndicBERT(text, languageDetection.language, startTime);
    }
    
    // Use IndicBERT for Indic languages, MiniLM for English
    const useIndicBert = this.shouldUseIndicBert(languageDetection);
    
    if (useIndicBert) {
      return this.embedWithIndicBERT(text, languageDetection.language, startTime);
    } else {
      return this.embedWithMiniLM(text, languageDetection.language, startTime);
    }
  }
  
  /**
   * Generate food-specific embedding (768 dimensions)
   * Uses jonny9f/food_embeddings model which is optimized for food items
   * This is required for searching food_items_v3 index which has item_vector (768-dim)
   */
  async embedFood(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const languageDetection = this.detectLanguage(text);
    
    try {
      // Use the dedicated food embedding model (768-dim)
      const embedding = await this.embeddingService.embedFood(text);
      
      if (!embedding || embedding.length !== 768) {
        this.logger.warn(`Food embedding returned ${embedding?.length || 0} dims, expected 768`);
        // Fall back to IndicBERT (also 768-dim)
        return this.embedWithIndicBERT(text, languageDetection.language, startTime);
      }
      
      return {
        embedding,
        model: 'food-768' as any,
        dimensions: 768,
        language: languageDetection.language,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.warn(`Food embedding failed, falling back to IndicBERT: ${error.message}`);
      return this.embedWithIndicBERT(text, languageDetection.language, startTime);
    }
  }
  
  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Group by language for efficiency
    const englishTexts: { text: string; index: number }[] = [];
    const indicTexts: { text: string; index: number }[] = [];
    
    texts.forEach((text, index) => {
      const detection = this.detectLanguage(text);
      if (this.shouldUseIndicBert(detection)) {
        indicTexts.push({ text, index });
      } else {
        englishTexts.push({ text, index });
      }
    });
    
    // Process in parallel
    const results: EmbeddingResult[] = new Array(texts.length);
    
    await Promise.all([
      // Process English texts with MiniLM
      ...englishTexts.map(async ({ text, index }) => {
        results[index] = await this.embed(text, { forceModel: 'minilm' });
      }),
      // Process Indic texts with IndicBERT
      ...indicTexts.map(async ({ text, index }) => {
        results[index] = await this.embed(text, { forceModel: 'indicbert' });
      }),
    ]);
    
    return results;
  }
  
  /**
   * Embed with MiniLM-L6-v2 (384 dimensions)
   */
  private async embedWithMiniLM(text: string, language: string, startTime: number): Promise<EmbeddingResult> {
    try {
      const embedding = await this.embeddingService.embed(text);
      
      return {
        embedding,
        model: 'minilm-384',
        dimensions: 384,
        language,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`MiniLM embedding failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Embed with IndicBERT v2 (768 dimensions)
   */
  private async embedWithIndicBERT(text: string, language: string, startTime: number): Promise<EmbeddingResult> {
    try {
      // Use IndicBERT getEmbedding method
      const embedding = await this.indicBertService.getEmbedding(text);
      
      if (!embedding || embedding.length !== 768) {
        this.logger.warn(`IndicBERT returned ${embedding?.length || 0} dims, expected 768`);
        // Fall back to MiniLM if IndicBERT fails
        return this.embedWithMiniLM(text, language, startTime);
      }
      
      return {
        embedding,
        model: 'indicbert-768',
        dimensions: 768,
        language,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.warn(`IndicBERT embedding failed, falling back to MiniLM: ${error.message}`);
      // Fallback to MiniLM
      return this.embedWithMiniLM(text, language, startTime);
    }
  }
  
  /**
   * Detect the language/script of input text
   */
  detectLanguage(text: string): LanguageDetection {
    const scriptCounts: Record<string, number> = {};
    let totalChars = 0;
    
    for (const char of text) {
      for (const [script, regex] of Object.entries(this.scriptRanges)) {
        if (regex.test(char)) {
          scriptCounts[script] = (scriptCounts[script] || 0) + 1;
          totalChars++;
          break;
        }
      }
    }
    
    if (totalChars === 0) {
      // No recognizable script, default to English
      return {
        language: 'en',
        script: 'latin',
        confidence: 0.5,
      };
    }
    
    // Find dominant script
    let dominantScript = 'latin';
    let maxCount = 0;
    
    for (const [script, count] of Object.entries(scriptCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantScript = script;
      }
    }
    
    const confidence = maxCount / totalChars;
    const language = this.scriptToLanguage[dominantScript] || 'en';
    
    // Check for mixed content
    if (Object.keys(scriptCounts).length > 1 && confidence < 0.7) {
      return {
        language: 'mixed' as any,
        script: 'mixed' as any,
        confidence,
      };
    }
    
    return {
      language: language as any,
      script: dominantScript as any,
      confidence,
    };
  }
  
  /**
   * Determine if IndicBERT should be used based on language detection
   */
  private shouldUseIndicBert(detection: LanguageDetection): boolean {
    // Use IndicBERT for all Indic languages
    const indicLanguages = ['hi', 'mr', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'pa', 'or'];
    
    // For mixed content with significant Indic portion, use IndicBERT
    if (detection.language === 'mixed') {
      return detection.script !== 'latin';
    }
    
    return indicLanguages.includes(detection.language);
  }
  
  /**
   * Normalize 384-dim MiniLM embedding to 768-dim (with zero padding)
   * Useful when you need consistent dimensions
   */
  normalize384To768(embedding: number[]): number[] {
    if (embedding.length >= 768) {
      return embedding.slice(0, 768);
    }
    
    // Pad with zeros
    const padded = new Array(768).fill(0);
    for (let i = 0; i < embedding.length; i++) {
      padded[i] = embedding[i];
    }
    return padded;
  }
  
  /**
   * Truncate 768-dim IndicBERT embedding to 384-dim
   * Useful when you only have 384-dim index
   */
  normalize768To384(embedding: number[]): number[] {
    return embedding.slice(0, 384);
  }
  
  /**
   * Get embedding with normalized dimensions
   * Always returns 768-dim embedding (padding if necessary)
   */
  async embedNormalized(text: string): Promise<EmbeddingResult> {
    const result = await this.embed(text);
    
    if (result.dimensions === 384) {
      return {
        ...result,
        embedding: this.normalize384To768(result.embedding),
        dimensions: 768,
      };
    }
    
    return result;
  }
}
