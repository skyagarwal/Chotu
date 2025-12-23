/**
 * Competitor Scraper Microservice
 * 
 * ⚠️ LEGAL DISCLAIMER:
 * This scraper is for PERSONAL USE and RESEARCH PURPOSES ONLY.
 * Scraping may violate Terms of Service of target websites.
 * Use responsibly and respect robots.txt.
 * Consider using official APIs when available.
 * 
 * Features:
 * - Scrape Zomato restaurant data & reviews
 * - Scrape Swiggy pricing & delivery info
 * - Rate limiting & stealth mode
 * - Caching with Redis
 * - Database storage with timestamps
 */

import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import cron from 'node-cron';
import dotenv from 'dotenv';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

import { ZomatoScraper } from './scrapers/zomato.scraper';
import { SwiggyScraper } from './scrapers/swiggy.scraper';
import { ScraperQueue } from './queue/scraper.queue';

dotenv.config();

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'scraper.log' })
  ]
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mangwale_ai'
});

// Redis connection
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Express app
const app = express();
app.use(express.json());

// Initialize scrapers
let zomatoScraper: ZomatoScraper;
let swiggyScraper: SwiggyScraper;
let scraperQueue: ScraperQueue;

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * API: Scrape restaurant from Zomato
 * POST /api/scrape/zomato
 */
app.post('/api/scrape/zomato', async (req: Request, res: Response) => {
  try {
    const { restaurantUrl, restaurantName, city, lat, lng } = req.body;
    
    if (!restaurantUrl && !restaurantName) {
      return res.status(400).json({ error: 'restaurantUrl or restaurantName required' });
    }

    // Check cache first
    const cacheKey = `zomato:${restaurantUrl || restaurantName}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      logger.info(`Cache hit: ${cacheKey}`);
      return res.json({ source: 'cache', data: JSON.parse(cached) });
    }

    // Queue the scrape job
    const jobId = uuidv4();
    await scraperQueue.addJob({
      source: 'zomato',
      url: restaurantUrl,
      storeName: restaurantName,
      storeAddress: city || 'nashik',
      lat: lat || 19.9975,
      lng: lng || 73.7898,
      priority: 'high'
    });

    res.json({ 
      status: 'queued', 
      jobId,
      message: 'Scrape job queued. Check /api/job/:jobId for status'
    });
  } catch (error: any) {
    logger.error('Zomato scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Scrape restaurant from Swiggy
 * POST /api/scrape/swiggy
 */
app.post('/api/scrape/swiggy', async (req: Request, res: Response) => {
  try {
    const { restaurantUrl, restaurantName, city, lat, lng } = req.body;
    
    if (!restaurantUrl && !restaurantName) {
      return res.status(400).json({ error: 'restaurantUrl or restaurantName required' });
    }

    const cacheKey = `swiggy:${restaurantUrl || restaurantName}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json({ source: 'cache', data: JSON.parse(cached) });
    }

    const jobId = uuidv4();
    await scraperQueue.addJob({
      source: 'swiggy',
      url: restaurantUrl,
      storeName: restaurantName,
      storeAddress: city || 'nashik',
      lat: lat || 19.9975,
      lng: lng || 73.7898,
      priority: 'high'
    });

    res.json({ status: 'queued', jobId });
  } catch (error: any) {
    logger.error('Swiggy scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Get pricing comparison
 * POST /api/compare/pricing
 */
app.post('/api/compare/pricing', async (req: Request, res: Response) => {
  try {
    const { itemName, restaurantName, city } = req.body;
    
    // Get from database cache
    const result = await pool.query(`
      SELECT * FROM competitor_pricing
      WHERE item_name ILIKE $1 
      AND (restaurant_name ILIKE $2 OR $2 IS NULL)
      AND scraped_at > NOW() - INTERVAL '7 days'
      ORDER BY scraped_at DESC
    `, [`%${itemName}%`, restaurantName ? `%${restaurantName}%` : null]);

    if (result.rows.length > 0) {
      return res.json({
        source: 'database',
        data: result.rows,
        freshness: 'within 7 days'
      });
    }

    res.json({ 
      source: 'none',
      message: 'No recent data. Queue a scrape job first.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Get reviews for a restaurant
 * GET /api/reviews/:source/:restaurantId
 */
app.get('/api/reviews/:source/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { source, restaurantId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM competitor_reviews
      WHERE source = $1 AND external_restaurant_id = $2
      ORDER BY review_date DESC
      LIMIT 50
    `, [source, restaurantId]);

    res.json({
      count: result.rows.length,
      reviews: result.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Check job status
 * GET /api/job/:jobId
 */
app.get('/api/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const status = await scraperQueue.getJobStatus(jobId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Match our store to competitor
 * POST /api/match/store
 * Priority: FSSAI (100%) > GST (100%) > Name similarity (50-90%)
 */
app.post('/api/match/store', async (req: Request, res: Response) => {
  try {
    const { storeId, storeName, storeAddress, lat, lng, fssaiNumber, gstNumber } = req.body;

    let zomatoMatch = null;
    let swiggyMatch = null;
    let matchMethod = 'name_similarity';

    // Priority 1: Try FSSAI match (100% confidence)
    if (fssaiNumber) {
      const fssaiResult = await pool.query(`
        SELECT source, external_id, url, name, rating 
        FROM competitor_restaurants 
        WHERE fssai_number = $1
      `, [fssaiNumber]);

      for (const row of fssaiResult.rows) {
        if (row.source === 'zomato' && !zomatoMatch) {
          zomatoMatch = { id: row.external_id, url: row.url, name: row.name, confidence: 1.0 };
          matchMethod = 'fssai_match';
        }
        if (row.source === 'swiggy' && !swiggyMatch) {
          swiggyMatch = { id: row.external_id, url: row.url, name: row.name, confidence: 1.0 };
          matchMethod = 'fssai_match';
        }
      }
    }

    // Priority 2: Try GST match (100% confidence)
    if (gstNumber && (!zomatoMatch || !swiggyMatch)) {
      const gstResult = await pool.query(`
        SELECT source, external_id, url, name, rating 
        FROM competitor_restaurants 
        WHERE gst_number = $1
      `, [gstNumber]);

      for (const row of gstResult.rows) {
        if (row.source === 'zomato' && !zomatoMatch) {
          zomatoMatch = { id: row.external_id, url: row.url, name: row.name, confidence: 1.0 };
          matchMethod = matchMethod === 'fssai_match' ? 'fssai_match' : 'gst_match';
        }
        if (row.source === 'swiggy' && !swiggyMatch) {
          swiggyMatch = { id: row.external_id, url: row.url, name: row.name, confidence: 1.0 };
          matchMethod = matchMethod === 'fssai_match' ? 'fssai_match' : 'gst_match';
        }
      }
    }

    // Priority 3: Fall back to name similarity search
    if (!zomatoMatch) {
      zomatoMatch = await zomatoScraper.searchRestaurant(storeName, storeAddress, lat, lng);
    }
    if (!swiggyMatch) {
      swiggyMatch = await swiggyScraper.searchRestaurant(storeName, lat, lng);
    }

    // Determine final match method
    const finalMatchMethod = (zomatoMatch?.confidence === 1.0 || swiggyMatch?.confidence === 1.0) 
      ? matchMethod 
      : 'name_similarity';

    // Save matches to database with match method
    if (zomatoMatch || swiggyMatch) {
      await pool.query(`
        INSERT INTO store_competitor_mapping 
          (store_id, source, external_id, external_url, match_confidence, match_method, fssai_number, gst_number, matched_at)
        VALUES 
          ($1, 'zomato', $2, $3, $4, $7, $8, $9, NOW()),
          ($1, 'swiggy', $5, $6, $4, $7, $8, $9, NOW())
        ON CONFLICT (store_id, source) DO UPDATE SET
          external_id = COALESCE(EXCLUDED.external_id, store_competitor_mapping.external_id),
          external_url = COALESCE(EXCLUDED.external_url, store_competitor_mapping.external_url),
          match_confidence = EXCLUDED.match_confidence,
          match_method = EXCLUDED.match_method,
          fssai_number = COALESCE(EXCLUDED.fssai_number, store_competitor_mapping.fssai_number),
          gst_number = COALESCE(EXCLUDED.gst_number, store_competitor_mapping.gst_number),
          matched_at = NOW()
      `, [
        storeId,
        zomatoMatch?.id || null,
        zomatoMatch?.url || null,
        Math.max(zomatoMatch?.confidence || 0, swiggyMatch?.confidence || 0),
        swiggyMatch?.id || null,
        swiggyMatch?.url || null,
        finalMatchMethod,
        fssaiNumber || null,
        gstNumber || null
      ]);
    }

    res.json({
      storeId,
      matchMethod: finalMatchMethod,
      zomato: zomatoMatch,
      swiggy: swiggyMatch
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Bulk scrape for all mapped stores
 * POST /api/scrape/bulk
 */
app.post('/api/scrape/bulk', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.body;

    // Get stores with competitor mappings
    const result = await pool.query(`
      SELECT * FROM store_competitor_mapping
      WHERE (zomato_url IS NOT NULL OR swiggy_url IS NOT NULL)
      AND (last_scraped IS NULL OR last_scraped < NOW() - INTERVAL '7 days')
      LIMIT $1
    `, [limit]);

    let queued = 0;
    for (const row of result.rows) {
      if (row.zomato_url) {
        await scraperQueue.addJob({
          id: uuidv4(),
          type: 'zomato',
          url: row.zomato_url,
          storeId: row.store_id,
          priority: 'normal'
        });
        queued++;
      }
      if (row.swiggy_url) {
        await scraperQueue.addJob({
          id: uuidv4(),
          type: 'swiggy',
          url: row.swiggy_url,
          storeId: row.store_id,
          priority: 'normal'
        });
        queued++;
      }
    }

    res.json({ queued, message: `Queued ${queued} scrape jobs` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Initialize and start server
 */
async function main() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('Connected to Redis');

    // Test database connection
    await pool.query('SELECT 1');
    logger.info('Connected to PostgreSQL');

    // Initialize scrapers
    zomatoScraper = new ZomatoScraper(pool, redis, logger);
    swiggyScraper = new SwiggyScraper(pool, redis, logger);
    scraperQueue = new ScraperQueue(pool, redis, logger, zomatoScraper, swiggyScraper);

    // Start queue processor
    scraperQueue.startProcessing();

    // Schedule daily scrape (3 AM)
    cron.schedule('0 3 * * *', async () => {
      logger.info('Starting daily bulk scrape...');
      // Trigger bulk scrape for outdated entries
      const result = await pool.query(`
        SELECT store_id FROM store_competitor_mapping
        WHERE last_scraped < NOW() - INTERVAL '7 days'
        LIMIT 50
      `);
      
      for (const row of result.rows) {
        await scraperQueue.addJob({
          id: uuidv4(),
          type: 'zomato',
          storeId: row.store_id,
          priority: 'low'
        });
      }
      logger.info(`Queued ${result.rows.length} stores for daily scrape`);
    });

    // Start server
    const PORT = process.env.PORT || 3200;
    app.listen(PORT, () => {
      logger.info(`Scraper service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start scraper service:', error);
    process.exit(1);
  }
}

main();
