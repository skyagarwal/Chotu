import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 🔄 Request Batching Service
 * 
 * Batches similar LLM requests to:
 * - Reduce duplicate API calls
 * - Improve throughput
 * - Optimize model warm-up
 * 
 * Batching Strategy:
 * - Deduplicate identical requests in flight
 * - Group embedding requests for batch processing
 * - Queue non-urgent requests for batch execution
 */

interface PendingRequest {
  id: string;
  type: 'chat' | 'embedding' | 'completion';
  prompt: string;
  modelId: string;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  addedAt: Date;
  priority: number; // Higher = more urgent
}

interface BatchConfig {
  maxBatchSize: number;
  maxWaitMs: number;
  minBatchSize: number;
}

@Injectable()
export class RequestBatchingService implements OnModuleInit {
  private readonly logger = new Logger(RequestBatchingService.name);
  
  // Request queues by type
  private chatQueue: PendingRequest[] = [];
  private embeddingQueue: PendingRequest[] = [];
  
  // In-flight deduplication
  private inFlightRequests: Map<string, Promise<any>> = new Map();
  
  // Batch processing timers
  private chatBatchTimer: NodeJS.Timeout | null = null;
  private embeddingBatchTimer: NodeJS.Timeout | null = null;

  // Configuration
  private config: {
    chat: BatchConfig;
    embedding: BatchConfig;
  } = {
    chat: {
      maxBatchSize: 1, // Chat usually processed individually
      maxWaitMs: 50, // Very short wait for chat
      minBatchSize: 1,
    },
    embedding: {
      maxBatchSize: 32, // Embeddings can be batched
      maxWaitMs: 100, // Longer wait to collect batch
      minBatchSize: 4,
    },
  };

  // Callbacks for actual execution
  private chatExecutor?: (requests: Array<{ prompt: string; modelId: string }>) => Promise<string[]>;
  private embeddingExecutor?: (texts: string[]) => Promise<number[][]>;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('🔄 RequestBatchingService initializing...');
  }

  async onModuleInit() {
    this.logger.log('✅ RequestBatchingService initialized');
  }

  /**
   * Register chat executor
   */
  registerChatExecutor(executor: (requests: Array<{ prompt: string; modelId: string }>) => Promise<string[]>): void {
    this.chatExecutor = executor;
  }

  /**
   * Register embedding executor
   */
  registerEmbeddingExecutor(executor: (texts: string[]) => Promise<number[][]>): void {
    this.embeddingExecutor = executor;
  }

  /**
   * Submit chat request (with deduplication)
   */
  async submitChat(prompt: string, modelId: string, priority: number = 5): Promise<string> {
    const requestKey = this.generateRequestKey('chat', prompt, modelId);

    // Check for in-flight duplicate
    const inFlight = this.inFlightRequests.get(requestKey);
    if (inFlight) {
      this.logger.debug(`♻️ Deduplicating chat request: ${requestKey.slice(0, 20)}...`);
      return inFlight;
    }

    // Create promise for this request
    const promise = new Promise<string>((resolve, reject) => {
      const request: PendingRequest = {
        id: requestKey,
        type: 'chat',
        prompt,
        modelId,
        resolve,
        reject,
        addedAt: new Date(),
        priority,
      };

      this.chatQueue.push(request);
      this.scheduleChatBatch();
    });

    // Track in-flight
    this.inFlightRequests.set(requestKey, promise);
    promise.finally(() => {
      this.inFlightRequests.delete(requestKey);
    });

    return promise;
  }

  /**
   * Submit embedding request (batched)
   */
  async submitEmbedding(text: string, priority: number = 5): Promise<number[]> {
    const requestKey = this.generateRequestKey('embedding', text, 'default');

    // Check for in-flight duplicate
    const inFlight = this.inFlightRequests.get(requestKey);
    if (inFlight) {
      this.logger.debug(`♻️ Deduplicating embedding request`);
      return inFlight;
    }

    // Create promise for this request
    const promise = new Promise<number[]>((resolve, reject) => {
      const request: PendingRequest = {
        id: requestKey,
        type: 'embedding',
        prompt: text,
        modelId: 'default',
        resolve,
        reject,
        addedAt: new Date(),
        priority,
      };

      this.embeddingQueue.push(request);
      this.scheduleEmbeddingBatch();
    });

    // Track in-flight
    this.inFlightRequests.set(requestKey, promise);
    promise.finally(() => {
      this.inFlightRequests.delete(requestKey);
    });

    return promise;
  }

  /**
   * Submit batch of embeddings
   */
  async submitEmbeddingBatch(texts: string[]): Promise<number[][]> {
    // Submit all at once for batch processing
    const promises = texts.map(text => this.submitEmbedding(text, 10)); // High priority
    return Promise.all(promises);
  }

  /**
   * Generate deduplication key
   */
  private generateRequestKey(type: string, prompt: string, modelId: string): string {
    const crypto = require('crypto');
    const normalized = prompt.toLowerCase().trim().replace(/\s+/g, ' ');
    return `${type}:${modelId}:${crypto.createHash('md5').update(normalized).digest('hex')}`;
  }

  /**
   * Schedule chat batch processing
   */
  private scheduleChatBatch(): void {
    if (this.chatBatchTimer) return;

    const config = this.config.chat;

    // Process immediately if at max size
    if (this.chatQueue.length >= config.maxBatchSize) {
      this.processChatBatch();
      return;
    }

    // Schedule with delay
    this.chatBatchTimer = setTimeout(() => {
      this.processChatBatch();
    }, config.maxWaitMs);
  }

  /**
   * Schedule embedding batch processing
   */
  private scheduleEmbeddingBatch(): void {
    if (this.embeddingBatchTimer) return;

    const config = this.config.embedding;

    // Process immediately if at max size
    if (this.embeddingQueue.length >= config.maxBatchSize) {
      this.processEmbeddingBatch();
      return;
    }

    // Schedule with delay
    this.embeddingBatchTimer = setTimeout(() => {
      this.processEmbeddingBatch();
    }, config.maxWaitMs);
  }

  /**
   * Process chat batch
   */
  private async processChatBatch(): Promise<void> {
    if (this.chatBatchTimer) {
      clearTimeout(this.chatBatchTimer);
      this.chatBatchTimer = null;
    }

    if (this.chatQueue.length === 0) return;

    // Sort by priority and take batch
    this.chatQueue.sort((a, b) => b.priority - a.priority);
    const batch = this.chatQueue.splice(0, this.config.chat.maxBatchSize);

    if (!this.chatExecutor) {
      batch.forEach(req => req.reject(new Error('No chat executor registered')));
      return;
    }

    try {
      const requests = batch.map(req => ({ prompt: req.prompt, modelId: req.modelId }));
      const results = await this.chatExecutor(requests);

      batch.forEach((req, idx) => {
        if (results[idx]) {
          req.resolve(results[idx]);
        } else {
          req.reject(new Error('No result for request'));
        }
      });
    } catch (error: any) {
      batch.forEach(req => req.reject(error));
    }

    // Schedule next batch if queue has items
    if (this.chatQueue.length > 0) {
      this.scheduleChatBatch();
    }
  }

  /**
   * Process embedding batch
   */
  private async processEmbeddingBatch(): Promise<void> {
    if (this.embeddingBatchTimer) {
      clearTimeout(this.embeddingBatchTimer);
      this.embeddingBatchTimer = null;
    }

    if (this.embeddingQueue.length === 0) return;

    // Check minimum batch size unless queue is old
    const oldestRequest = this.embeddingQueue[0];
    const waitTime = Date.now() - oldestRequest.addedAt.getTime();
    
    if (this.embeddingQueue.length < this.config.embedding.minBatchSize && waitTime < this.config.embedding.maxWaitMs) {
      this.scheduleEmbeddingBatch();
      return;
    }

    // Sort by priority and take batch
    this.embeddingQueue.sort((a, b) => b.priority - a.priority);
    const batch = this.embeddingQueue.splice(0, this.config.embedding.maxBatchSize);

    if (!this.embeddingExecutor) {
      batch.forEach(req => req.reject(new Error('No embedding executor registered')));
      return;
    }

    try {
      const texts = batch.map(req => req.prompt);
      this.logger.debug(`📦 Processing embedding batch of ${texts.length}`);
      
      const results = await this.embeddingExecutor(texts);

      batch.forEach((req, idx) => {
        if (results[idx]) {
          req.resolve(results[idx]);
        } else {
          req.reject(new Error('No result for request'));
        }
      });
    } catch (error: any) {
      batch.forEach(req => req.reject(error));
    }

    // Schedule next batch if queue has items
    if (this.embeddingQueue.length > 0) {
      this.scheduleEmbeddingBatch();
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    chatQueueSize: number;
    embeddingQueueSize: number;
    inFlightCount: number;
    config: { chat: BatchConfig; embedding: BatchConfig };
  } {
    return {
      chatQueueSize: this.chatQueue.length,
      embeddingQueueSize: this.embeddingQueue.length,
      inFlightCount: this.inFlightRequests.size,
      config: this.config,
    };
  }

  /**
   * Update batch configuration
   */
  updateConfig(updates: Partial<{
    chat: Partial<BatchConfig>;
    embedding: Partial<BatchConfig>;
  }>): void {
    if (updates.chat) {
      this.config.chat = { ...this.config.chat, ...updates.chat };
    }
    if (updates.embedding) {
      this.config.embedding = { ...this.config.embedding, ...updates.embedding };
    }
  }

  /**
   * Flush all queues (for shutdown)
   */
  async flush(): Promise<void> {
    // Process remaining items
    while (this.chatQueue.length > 0) {
      await this.processChatBatch();
    }
    while (this.embeddingQueue.length > 0) {
      await this.processEmbeddingBatch();
    }
  }
}
