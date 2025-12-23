import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface IndicBERTClassifyRequest {
  text: string;
}

interface IndicBERTClassifyResponse {
  embedding?: number[];
  intent?: string;
  intent_conf?: number;
  tone?: string;
  tone_conf?: number;
  slots?: Record<string, string>;
}

@Injectable()
export class IndicBERTService {
  private readonly logger = new Logger(IndicBERTService.name);
  private readonly nluEndpoint: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    // Default to docker network hostname 'nlu' on port 7010
    this.nluEndpoint = this.configService.get<string>(
      'NLU_ENDPOINT',
      'http://nlu:7010',
    );
    this.logger.log(`IndicBERT NLU endpoint: ${this.nluEndpoint}`);
  }

  /**
   * Classify text using IndicBERT v2 model
   * 
   * This calls the real NLU service running on port 7010 which uses
   * ai4bharat/IndicBERTv2-MLM-Back-TLM for embeddings and classification.
   * 
   * The service supports:
   * - 10 languages (English + 9 Indian languages)
   * - Intent classification (if model loaded)
   * - Tone detection (if model loaded)
   * - Slot/entity extraction (if model loaded)
   * - Embeddings for all text
   * 
   * @param text The input text to classify
   * @returns Classification result with intent, confidence, tone, slots
   */
  async classify(text: string): Promise<{
    intent: string | null;
    confidence: number;
    tone: string | null;
    toneConfidence: number;
    entities: Record<string, string>;
    embedding?: number[];
    provider: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.post<IndicBERTClassifyResponse>(
          `${this.nluEndpoint}/classify`,
          { text } as IndicBERTClassifyRequest,
          {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const data = response.data;
      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `IndicBERT classified in ${processingTime}ms: intent=${data.intent}, confidence=${data.intent_conf}`,
      );

      return {
        intent: data.intent || null,
        confidence: data.intent_conf || 0,
        tone: data.tone || null,
        toneConfidence: data.tone_conf || 0,
        entities: data.slots || {},
        embedding: data.embedding,
        provider: 'indicbert',
      };
    } catch (error) {
      this.logger.error(`IndicBERT classification failed: ${error.message}`);
      
      // Return null result on failure (allows fallback to other providers)
      return {
        intent: null,
        confidence: 0,
        tone: null,
        toneConfidence: 0,
        entities: {},
        provider: 'indicbert-failed',
      };
    }
  }

  /**
   * Check if IndicBERT service is healthy and which models are loaded
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    encoder: string;
    encoderLoaded: boolean;
    intentLoaded: boolean;
    slotsLoaded: boolean;
    toneLoaded: boolean;
    latency?: number;
  }> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.nluEndpoint}/healthz`, {
          timeout: 3000,
        }),
      );

      const latency = Date.now() - startTime;
      const data = response.data;

      // Determine overall health status
      let status: 'healthy' | 'degraded' | 'down';
      if (data.encoder_loaded && data.intent_loaded && data.tone_loaded) {
        status = 'healthy';
      } else if (data.encoder_loaded) {
        status = 'degraded'; // At least encoder works
      } else {
        status = 'down';
      }

      return {
        status,
        encoder: data.encoder || 'unknown',
        encoderLoaded: data.encoder_loaded || false,
        intentLoaded: data.intent_loaded || false,
        slotsLoaded: data.slots_loaded || false,
        toneLoaded: data.tone_loaded || false,
        latency,
      };
    } catch (error) {
      this.logger.error(`IndicBERT health check failed: ${error.message}`);
      return {
        status: 'down',
        encoder: 'unavailable',
        encoderLoaded: false,
        intentLoaded: false,
        slotsLoaded: false,
        toneLoaded: false,
      };
    }
  }

  /**
   * Get embedding vector for text (useful for semantic search, similarity)
   */
  async getEmbedding(text: string): Promise<number[] | null> {
    try {
      const result = await this.classify(text);
      return result.embedding || null;
    } catch (error) {
      this.logger.error(`Failed to get embedding: ${error.message}`);
      return null;
    }
  }
}
