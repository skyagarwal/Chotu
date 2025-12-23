import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddingUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.embeddingUrl = this.config.get(
      'EMBEDDING_SERVICE_URL',
      'http://localhost:3101',
    );
  }

  /**
   * Generate embedding using specified model
   * @param text - Text to embed
   * @param modelType - 'general' (384-dim) or 'food' (768-dim)
   */
  async embed(text: string, modelType: 'general' | 'food' = 'general'): Promise<number[]> {
    try {
      // Call embedding service (sentence-transformers)
      // Service expects 'texts' array format and 'model_type' parameter
      const response = await firstValueFrom(
        this.httpService.post(`${this.embeddingUrl}/embed`, {
          texts: [text], // Service expects array format
          model_type: modelType, // 'general' (384-dim) or 'food' (768-dim)
        }),
      );

      const embedding = response.data.embeddings?.[0] || response.data.embedding || [];
      this.logger.debug(`Generated ${embedding.length}-dim embedding using ${modelType} model`);
      return embedding;
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error.message}`, error.stack);
      
      // Fallback: return zero vector of appropriate dimension
      const dimension = modelType === 'food' ? 768 : 384;
      return new Array(dimension).fill(0);
    }
  }
  
  /**
   * Generate 768-dim food embedding (for food_items_v3 index)
   */
  async embedFood(text: string): Promise<number[]> {
    return this.embed(text, 'food');
  }

  async embedBatch(texts: string[], modelType: 'general' | 'food' = 'general'): Promise<number[][]> {
    try {
      // Use same /embed endpoint - it accepts array of texts
      const response = await firstValueFrom(
        this.httpService.post(`${this.embeddingUrl}/embed`, {
          texts,
          model_type: modelType,
        }),
      );

      return response.data.embeddings || [];
    } catch (error) {
      this.logger.error(`Batch embedding failed: ${error.message}`, error.stack);
      
      // Fallback: return zero vectors
      const dimension = modelType === 'food' ? 768 : 384;
      return texts.map(() => new Array(dimension).fill(0));
    }
  }
}
