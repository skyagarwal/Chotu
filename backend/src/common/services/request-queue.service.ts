import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 📋 Request Queue Service
 * 
 * Queues requests for load balancing:
 * - Priority-based queuing
 * - Rate limiting per tenant
 * - Backpressure handling
 * - Fair scheduling across tenants
 * 
 * Features:
 * - Token bucket rate limiting
 * - Priority queues (high, normal, low)
 * - Request timeout handling
 * - Queue depth monitoring
 */

export interface QueuedRequest<T = any> {
  id: string;
  priority: 'high' | 'normal' | 'low';
  tenantId?: number;
  payload: T;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  addedAt: Date;
  deadline: Date;
  retries: number;
}

interface TenantBucket {
  tokens: number;
  lastRefill: Date;
  maxTokens: number;
  refillRate: number; // tokens per second
}

@Injectable()
export class RequestQueueService implements OnModuleInit {
  private readonly logger = new Logger(RequestQueueService.name);

  // Priority queues
  private highPriorityQueue: QueuedRequest[] = [];
  private normalPriorityQueue: QueuedRequest[] = [];
  private lowPriorityQueue: QueuedRequest[] = [];

  // Rate limiting
  private tenantBuckets: Map<number, TenantBucket> = new Map();
  private globalBucket: TenantBucket;

  // Processing
  private isProcessing = false;
  private concurrentLimit = 10;
  private activeRequests = 0;

  // Configuration
  private config = {
    defaultTimeoutMs: 30000,
    maxQueueSize: 1000,
    defaultTokens: 100,
    defaultRefillRate: 10, // per second
    globalTokens: 500,
    globalRefillRate: 50,
  };

  // Request executor callback
  private executor?: (request: QueuedRequest) => Promise<any>;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('📋 RequestQueueService initializing...');
    
    // Initialize global bucket
    this.globalBucket = {
      tokens: this.config.globalTokens,
      lastRefill: new Date(),
      maxTokens: this.config.globalTokens,
      refillRate: this.config.globalRefillRate,
    };
  }

  async onModuleInit() {
    // Start processing loop
    this.startProcessing();
    this.logger.log('✅ RequestQueueService initialized');
  }

  /**
   * Register request executor
   */
  registerExecutor(executor: (request: QueuedRequest) => Promise<any>): void {
    this.executor = executor;
  }

  /**
   * Enqueue a request
   */
  async enqueue<T, R>(
    payload: T,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      tenantId?: number;
      timeoutMs?: number;
    },
  ): Promise<R> {
    const priority = options?.priority || 'normal';
    const timeoutMs = options?.timeoutMs || this.config.defaultTimeoutMs;

    // Check queue size
    const totalQueueSize = this.highPriorityQueue.length + 
                          this.normalPriorityQueue.length + 
                          this.lowPriorityQueue.length;
    
    if (totalQueueSize >= this.config.maxQueueSize) {
      throw new Error('Request queue is full');
    }

    // Check rate limit
    if (options?.tenantId) {
      if (!this.checkTenantLimit(options.tenantId)) {
        throw new Error('Rate limit exceeded');
      }
    }

    if (!this.checkGlobalLimit()) {
      throw new Error('Global rate limit exceeded');
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: this.generateId(),
        priority,
        tenantId: options?.tenantId,
        payload,
        resolve,
        reject,
        addedAt: new Date(),
        deadline: new Date(Date.now() + timeoutMs),
        retries: 0,
      };

      // Add to appropriate queue
      switch (priority) {
        case 'high':
          this.highPriorityQueue.push(request);
          break;
        case 'low':
          this.lowPriorityQueue.push(request);
          break;
        default:
          this.normalPriorityQueue.push(request);
      }

      this.processQueue();
    });
  }

  /**
   * Start processing loop
   */
  private startProcessing(): void {
    setInterval(() => {
      this.refillBuckets();
      this.checkTimeouts();
    }, 1000);
  }

  /**
   * Process next item in queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeRequests >= this.concurrentLimit) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.activeRequests < this.concurrentLimit) {
        const request = this.getNextRequest();
        if (!request) break;

        // Check if expired
        if (request.deadline < new Date()) {
          request.reject(new Error('Request timeout'));
          continue;
        }

        // Execute request
        this.activeRequests++;
        this.executeRequest(request).finally(() => {
          this.activeRequests--;
          this.processQueue(); // Process next
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get next request (priority order)
   */
  private getNextRequest(): QueuedRequest | null {
    if (this.highPriorityQueue.length > 0) {
      return this.highPriorityQueue.shift()!;
    }
    if (this.normalPriorityQueue.length > 0) {
      return this.normalPriorityQueue.shift()!;
    }
    if (this.lowPriorityQueue.length > 0) {
      return this.lowPriorityQueue.shift()!;
    }
    return null;
  }

  /**
   * Execute a request
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    if (!this.executor) {
      request.reject(new Error('No executor registered'));
      return;
    }

    try {
      const result = await this.executor(request);
      request.resolve(result);
    } catch (error: any) {
      // Retry logic
      if (request.retries < 3 && request.deadline > new Date()) {
        request.retries++;
        this.normalPriorityQueue.push(request); // Re-queue with normal priority
        this.logger.debug(`🔄 Retrying request ${request.id} (attempt ${request.retries})`);
      } else {
        request.reject(error);
      }
    }
  }

  /**
   * Check tenant rate limit
   */
  private checkTenantLimit(tenantId: number): boolean {
    let bucket = this.tenantBuckets.get(tenantId);
    
    if (!bucket) {
      bucket = {
        tokens: this.config.defaultTokens,
        lastRefill: new Date(),
        maxTokens: this.config.defaultTokens,
        refillRate: this.config.defaultRefillRate,
      };
      this.tenantBuckets.set(tenantId, bucket);
    }

    this.refillBucket(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Check global rate limit
   */
  private checkGlobalLimit(): boolean {
    this.refillBucket(this.globalBucket);

    if (this.globalBucket.tokens >= 1) {
      this.globalBucket.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Refill token buckets
   */
  private refillBuckets(): void {
    this.refillBucket(this.globalBucket);
    for (const bucket of this.tenantBuckets.values()) {
      this.refillBucket(bucket);
    }
  }

  /**
   * Refill a single bucket
   */
  private refillBucket(bucket: TenantBucket): void {
    const now = new Date();
    const elapsed = (now.getTime() - bucket.lastRefill.getTime()) / 1000;
    const newTokens = elapsed * bucket.refillRate;
    
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + newTokens);
    bucket.lastRefill = now;
  }

  /**
   * Check for timed out requests
   */
  private checkTimeouts(): void {
    const now = new Date();

    const checkQueue = (queue: QueuedRequest[]) => {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].deadline < now) {
          const request = queue.splice(i, 1)[0];
          request.reject(new Error('Request timeout'));
        }
      }
    };

    checkQueue(this.highPriorityQueue);
    checkQueue(this.normalPriorityQueue);
    checkQueue(this.lowPriorityQueue);
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    highPriority: number;
    normalPriority: number;
    lowPriority: number;
    totalQueued: number;
    activeRequests: number;
    globalTokens: number;
    tenantBuckets: Array<{ tenantId: number; tokens: number }>;
  } {
    return {
      highPriority: this.highPriorityQueue.length,
      normalPriority: this.normalPriorityQueue.length,
      lowPriority: this.lowPriorityQueue.length,
      totalQueued: this.highPriorityQueue.length + 
                   this.normalPriorityQueue.length + 
                   this.lowPriorityQueue.length,
      activeRequests: this.activeRequests,
      globalTokens: Math.floor(this.globalBucket.tokens),
      tenantBuckets: Array.from(this.tenantBuckets.entries()).map(([id, bucket]) => ({
        tenantId: id,
        tokens: Math.floor(bucket.tokens),
      })),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...updates };
    
    // Update global bucket
    this.globalBucket.maxTokens = this.config.globalTokens;
    this.globalBucket.refillRate = this.config.globalRefillRate;
  }

  /**
   * Set tenant rate limit
   */
  setTenantLimit(tenantId: number, maxTokens: number, refillRate: number): void {
    const bucket = this.tenantBuckets.get(tenantId) || {
      tokens: maxTokens,
      lastRefill: new Date(),
      maxTokens,
      refillRate,
    };
    
    bucket.maxTokens = maxTokens;
    bucket.refillRate = refillRate;
    this.tenantBuckets.set(tenantId, bucket);
  }

  /**
   * Set concurrent request limit
   */
  setConcurrentLimit(limit: number): void {
    this.concurrentLimit = limit;
  }

  /**
   * Clear all queues (for shutdown)
   */
  clearQueues(): void {
    const rejectAll = (queue: QueuedRequest[]) => {
      queue.forEach(req => req.reject(new Error('Queue cleared')));
      queue.length = 0;
    };

    rejectAll(this.highPriorityQueue);
    rejectAll(this.normalPriorityQueue);
    rejectAll(this.lowPriorityQueue);
  }
}
