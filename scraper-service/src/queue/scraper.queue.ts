/**
 * Scraper Queue Processor
 * 
 * Handles background scraping jobs with rate limiting
 */

import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { ZomatoScraper } from '../scrapers/zomato.scraper';
import { SwiggyScraper } from '../scrapers/swiggy.scraper';

export interface ScrapeJob {
  id: string;
  source: 'zomato' | 'swiggy' | 'both';
  storeId?: string;
  storeName: string;
  storeAddress?: string;
  lat?: number;
  lng?: number;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export class ScraperQueue {
  private isProcessing = false;
  private readonly QUEUE_KEY = 'scraper:queue';
  private readonly PROCESSING_KEY = 'scraper:processing';
  private readonly RATE_LIMIT_KEY = 'scraper:rate_limit';
  
  // Rate limits (requests per minute per source)
  private readonly RATE_LIMITS = {
    zomato: 10,
    swiggy: 10
  };

  constructor(
    private readonly pool: Pool,
    private readonly redis: RedisClientType,
    private readonly logger: Logger,
    private readonly zomatoScraper: ZomatoScraper,
    private readonly swiggyScraper: SwiggyScraper
  ) {}

  /**
   * Add job to queue
   */
  async addJob(job: Omit<ScrapeJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullJob: ScrapeJob = {
      ...job,
      id,
      status: 'pending',
      attempts: 0,
      maxAttempts: job.maxAttempts || 3,
      createdAt: new Date()
    };

    // Add to sorted set (priority based)
    const score = job.priority === 'high' ? 0 : job.priority === 'normal' ? 1 : 2;
    await this.redis.zAdd(this.QUEUE_KEY, { score, value: JSON.stringify(fullJob) });
    
    // Save to database for tracking
    await this.pool.query(`
      INSERT INTO scrape_jobs (id, source, store_id, store_name, store_address, lat, lng, priority, status, attempts, max_attempts, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `, [id, job.source, job.storeId, job.storeName, job.storeAddress, job.lat, job.lng, job.priority, 'pending', 0, job.maxAttempts || 3]);

    this.logger.info(`Job added to queue: ${id} for ${job.storeName}`);
    
    // Start processing if not already
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return id;
  }

  /**
   * Add bulk jobs
   */
  async addBulkJobs(jobs: Array<Omit<ScrapeJob, 'id' | 'status' | 'attempts' | 'createdAt'>>): Promise<string[]> {
    const ids: string[] = [];
    
    for (const job of jobs) {
      const id = await this.addJob(job);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Start queue processing
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.logger.info('Starting queue processing...');

    while (this.isProcessing) {
      try {
        // Get next job from queue
        const result = await this.redis.zPopMin(this.QUEUE_KEY);
        
        if (!result) {
          // No jobs, wait and check again
          await this.delay(5000);
          continue;
        }

        const job: ScrapeJob = JSON.parse(result.value);
        
        // Check rate limit
        const canProcess = await this.checkRateLimit(job.source);
        if (!canProcess) {
          // Re-add to queue and wait
          await this.redis.zAdd(this.QUEUE_KEY, { score: 1, value: JSON.stringify(job) });
          await this.delay(3000);
          continue;
        }

        // Process job
        await this.processJob(job);
        
        // Rate limit delay
        await this.delay(2000);
      } catch (error: any) {
        this.logger.error(`Queue processing error: ${error.message}`);
        await this.delay(5000);
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: ScrapeJob): Promise<void> {
    job.attempts++;
    job.status = 'processing';
    
    await this.updateJobStatus(job);
    this.logger.info(`Processing job: ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

    try {
      if (job.source === 'zomato' || job.source === 'both') {
        const zomatoResult = await this.zomatoScraper.searchRestaurant(
          job.storeName,
          job.storeAddress,
          job.lat,
          job.lng
        );

        if (zomatoResult) {
          await this.zomatoScraper.scrapeRestaurant(zomatoResult.url);
          
          // Save mapping
          if (job.storeId) {
            await this.saveMapping(job.storeId, 'zomato', zomatoResult.id, zomatoResult.url, zomatoResult.confidence);
          }
        }
        
        await this.incrementRateLimit('zomato');
      }

      if (job.source === 'swiggy' || job.source === 'both') {
        const swiggyResult = await this.swiggyScraper.searchRestaurant(
          job.storeName,
          job.storeAddress,
          job.lat,
          job.lng
        );

        if (swiggyResult) {
          await this.swiggyScraper.scrapeRestaurant(swiggyResult.url);
          
          // Save mapping
          if (job.storeId) {
            await this.saveMapping(job.storeId, 'swiggy', swiggyResult.id, swiggyResult.url, swiggyResult.confidence);
          }
        }
        
        await this.incrementRateLimit('swiggy');
      }

      job.status = 'completed';
      job.completedAt = new Date();
      await this.updateJobStatus(job);
      
      this.logger.info(`Job completed: ${job.id}`);
    } catch (error: any) {
      job.error = error.message;
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        this.logger.error(`Job failed permanently: ${job.id} - ${error.message}`);
      } else {
        // Re-add to queue for retry
        job.status = 'pending';
        await this.redis.zAdd(this.QUEUE_KEY, { score: 2, value: JSON.stringify(job) });
        this.logger.warn(`Job will retry: ${job.id} - ${error.message}`);
      }
      
      await this.updateJobStatus(job);
    }
  }

  /**
   * Save store to competitor mapping
   */
  private async saveMapping(
    storeId: string,
    source: string,
    externalId: string,
    url: string,
    confidence: number
  ): Promise<void> {
    await this.pool.query(`
      INSERT INTO store_competitor_mapping (store_id, source, external_id, external_url, match_confidence, matched_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (store_id, source) DO UPDATE SET
        external_id = $3, external_url = $4, match_confidence = $5, matched_at = NOW()
    `, [storeId, source, externalId, url, confidence]);
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(source: 'zomato' | 'swiggy' | 'both'): Promise<boolean> {
    if (source === 'both') {
      const zomatoOk = await this.checkSingleRateLimit('zomato');
      const swiggyOk = await this.checkSingleRateLimit('swiggy');
      return zomatoOk && swiggyOk;
    }
    return this.checkSingleRateLimit(source);
  }

  private async checkSingleRateLimit(source: 'zomato' | 'swiggy'): Promise<boolean> {
    const key = `${this.RATE_LIMIT_KEY}:${source}`;
    const count = await this.redis.get(key);
    return !count || parseInt(count) < this.RATE_LIMITS[source];
  }

  private async incrementRateLimit(source: 'zomato' | 'swiggy'): Promise<void> {
    const key = `${this.RATE_LIMIT_KEY}:${source}`;
    const current = await this.redis.get(key);
    
    if (!current) {
      await this.redis.setEx(key, 60, '1');
    } else {
      await this.redis.incr(key);
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(job: ScrapeJob): Promise<void> {
    await this.pool.query(`
      UPDATE scrape_jobs 
      SET status = $1, attempts = $2, error = $3, completed_at = $4
      WHERE id = $5
    `, [job.status, job.attempts, job.error, job.completedAt, job.id]);
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    this.isProcessing = false;
    this.logger.info('Queue processing stopped');
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const result = await this.pool.query(`
      SELECT status, COUNT(*) as count
      FROM scrape_jobs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY status
    `);

    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const row of result.rows) {
      stats[row.status as keyof typeof stats] = parseInt(row.count);
    }

    return stats;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ScrapeJob | null> {
    const result = await this.pool.query(
      'SELECT * FROM scrape_jobs WHERE id = $1',
      [jobId]
    );
    return result.rows[0] || null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
