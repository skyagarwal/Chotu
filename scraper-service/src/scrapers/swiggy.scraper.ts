/**
 * Swiggy Scraper
 * 
 * ⚠️ FOR RESEARCH PURPOSES ONLY
 * Scrapes restaurant data, reviews, and pricing from Swiggy
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';

export interface SwiggyRestaurant {
  id: string;
  name: string;
  url: string;
  rating: number;
  ratingCount: string;
  cuisine: string[];
  area: string;
  deliveryTime: string;
  costForTwo: number;
  isPromoted: boolean;
  offers: string[];
  confidence: number;
  // FSSAI & GST for exact vendor matching (100% confidence)
  fssaiNumber?: string;  // 14-digit FSSAI license number
  gstNumber?: string;    // 15-digit GSTIN
}

export interface SwiggyReview {
  rating: number;
  text: string;
  date: string;
}

export interface SwiggyMenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  isVeg: boolean;
  isBestseller: boolean;
  inStock: boolean;
  ratings: {
    rating: number;
    ratingCount: string;
  };
}

export class SwiggyScraper {
  private browser: Browser | null = null;
  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  constructor(
    private readonly pool: Pool,
    private readonly redis: RedisClientType,
    private readonly logger: Logger
  ) {}

  /**
   * Initialize browser
   */
  private async initBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;

    this.browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
      protocolTimeout: 60000, // 60 seconds timeout
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--single-process',
        '--no-zygote',
      ]
    });

    return this.browser;
  }

  /**
   * Get new page with stealth settings
   */
  private async getPage(): Promise<Page> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await page.setUserAgent(userAgent);
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'font'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    return page;
  }

  /**
   * Set location for Swiggy
   */
  private async setLocation(page: Page, lat: number = 19.9975, lng: number = 73.7898): Promise<void> {
    // Nashik coordinates by default
    await page.evaluateOnNewDocument(
      (latitude, longitude) => {
        Object.defineProperty(navigator, 'geolocation', {
          value: {
            getCurrentPosition: (success: Function) => {
              success({ coords: { latitude, longitude } });
            },
            watchPosition: () => {},
            clearWatch: () => {}
          }
        });
      },
      lat,
      lng
    );
  }

  /**
   * Search for restaurant on Swiggy
   */
  async searchRestaurant(
    name: string,
    address?: string,
    lat: number = 19.9975,
    lng: number = 73.7898
  ): Promise<SwiggyRestaurant | null> {
    const page = await this.getPage();
    await this.setLocation(page, lat, lng);
    
    try {
      // Navigate to Swiggy search
      const searchUrl = `https://www.swiggy.com/search?query=${encodeURIComponent(name)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results
      await this.delay(2000); // Let dynamic content load
      await page.waitForSelector('[data-testid="restaurant-card"]', { timeout: 10000 }).catch(() => null);
      
      const html = await page.content();
      const $ = cheerio.load(html);
      
      const restaurants: SwiggyRestaurant[] = [];
      
      // Parse restaurant cards
      $('[data-testid="restaurant-card"], .restaurant-card').each((i, el) => {
        const $el = $(el);
        const nameEl = $el.find('.restaurant-name, [data-testid="restaurant-name"]');
        const ratingEl = $el.find('.rating, [data-testid="rating"]');
        const cuisineEl = $el.find('.cuisine, [data-testid="cuisine"]');
        const areaEl = $el.find('.area, [data-testid="area"]');
        const linkEl = $el.find('a').first();
        
        if (nameEl.text()) {
          const restaurantName = nameEl.text().trim();
          restaurants.push({
            id: linkEl.attr('href')?.split('/').pop() || '',
            name: restaurantName,
            url: 'https://www.swiggy.com' + (linkEl.attr('href') || ''),
            rating: parseFloat(ratingEl.text()) || 0,
            ratingCount: '',
            cuisine: cuisineEl.text().split(',').map(c => c.trim()),
            area: areaEl.text().trim(),
            deliveryTime: '',
            costForTwo: 0,
            isPromoted: $el.find('.promoted').length > 0,
            offers: [],
            confidence: this.calculateSimilarity(name, restaurantName)
          });
        }
      });

      // Find best match
      const bestMatch = restaurants.sort((a, b) => b.confidence - a.confidence)[0];
      
      if (bestMatch && bestMatch.confidence > 0.5) {
        this.logger.info(`Swiggy match found: ${bestMatch.name} (${bestMatch.confidence})`);
        return bestMatch;
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Swiggy search error: ${error.message}`);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape restaurant details and menu from Swiggy
   */
  async scrapeRestaurant(url: string): Promise<{
    restaurant: SwiggyRestaurant;
    reviews: SwiggyReview[];
    menu: SwiggyMenuItem[];
  } | null> {
    const page = await this.getPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(3000); // Let menu load
      
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Parse restaurant info
      const restaurant: SwiggyRestaurant = {
        id: url.split('/').pop() || '',
        name: $('h1').first().text().trim() || '',
        url,
        rating: parseFloat($('[data-testid="rating"], .rating').first().text()) || 0,
        ratingCount: $('[data-testid="rating-count"]').text().trim(),
        cuisine: $('[data-testid="cuisine-info"], .cuisine-info').text().split(',').map(c => c.trim()),
        area: $('[data-testid="area-info"], .area-info').text().trim(),
        deliveryTime: $('[data-testid="delivery-time"], .delivery-time').text().trim(),
        costForTwo: parseInt($('[data-testid="cost-for-two"]').text().replace(/[^0-9]/g, '')) || 0,
        isPromoted: false,
        offers: [],
        confidence: 1,
        // Extract FSSAI number (14-digit) for exact vendor matching
        fssaiNumber: this.extractFssaiNumber(html),
        // Extract GST number (15-digit GSTIN) if available
        gstNumber: this.extractGstNumber(html),
      };

      // Parse offers
      $('[data-testid="offer-card"], .offer-card').each((i, el) => {
        restaurant.offers.push($(el).text().trim());
      });

      // Parse menu items
      const menu: SwiggyMenuItem[] = [];
      let currentCategory = '';
      
      $('[data-testid="menu-section"], .menu-section').each((i, section) => {
        const $section = $(section);
        currentCategory = $section.find('h2, h3').first().text().trim();
        
        $section.find('[data-testid="menu-item"], .menu-item').each((j, item) => {
          const $item = $(item);
          const nameEl = $item.find('[data-testid="item-name"], .item-name');
          const priceEl = $item.find('[data-testid="item-price"], .item-price');
          const descEl = $item.find('[data-testid="item-description"], .item-description');
          const ratingEl = $item.find('[data-testid="item-rating"], .item-rating');
          
          if (nameEl.text()) {
            menu.push({
              id: $item.attr('data-item-id') || `${i}-${j}`,
              name: nameEl.text().trim(),
              price: parseInt(priceEl.text().replace(/[^0-9]/g, '')) || 0,
              description: descEl.text().trim(),
              category: currentCategory,
              isVeg: $item.find('.veg-icon, [data-testid="veg"]').length > 0,
              isBestseller: $item.find('.bestseller, [data-testid="bestseller"]').length > 0,
              inStock: !$item.hasClass('out-of-stock'),
              ratings: {
                rating: parseFloat(ratingEl.text()) || 0,
                ratingCount: ''
              }
            });
          }
        });
      });

      // Swiggy doesn't show detailed reviews publicly - minimal data
      const reviews: SwiggyReview[] = [];

      // Save to database
      await this.saveToDatabase(restaurant, reviews, menu);
      
      // Cache result
      await this.redis.setEx(`swiggy:${url}`, 86400 * 7, JSON.stringify({ restaurant, reviews, menu }));

      return { restaurant, reviews, menu };
    } catch (error: any) {
      this.logger.error(`Swiggy scrape error: ${error.message}`);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape menu only (faster)
   */
  async scrapeMenu(url: string): Promise<SwiggyMenuItem[]> {
    const cached = await this.redis.get(`swiggy:menu:${url}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.scrapeRestaurant(url);
    return result?.menu || [];
  }

  /**
   * Save to database
   */
  private async saveToDatabase(
    restaurant: SwiggyRestaurant,
    reviews: SwiggyReview[],
    menu: SwiggyMenuItem[]
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Save restaurant with FSSAI and GST for exact vendor matching
      await client.query(`
        INSERT INTO competitor_restaurants 
          (source, external_id, name, url, rating, review_count, cuisine, address, price_for_two, delivery_time, offers, fssai_number, gst_number, scraped_at)
        VALUES ('swiggy', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (source, external_id) DO UPDATE SET
          rating = $4, price_for_two = $8, delivery_time = $9, offers = $10,
          fssai_number = COALESCE($11, competitor_restaurants.fssai_number),
          gst_number = COALESCE($12, competitor_restaurants.gst_number),
          scraped_at = NOW()
      `, [
        restaurant.id, restaurant.name, restaurant.url, restaurant.rating,
        restaurant.ratingCount, restaurant.cuisine, restaurant.area,
        restaurant.costForTwo, restaurant.deliveryTime, restaurant.offers,
        restaurant.fssaiNumber || null, restaurant.gstNumber || null
      ]);

      // Save menu items
      for (const item of menu) {
        await client.query(`
          INSERT INTO competitor_pricing 
            (source, external_restaurant_id, restaurant_name, item_name, price, category, is_veg, is_bestseller, in_stock, item_rating, scraped_at)
          VALUES ('swiggy', $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (source, external_restaurant_id, item_name) DO UPDATE SET
            price = $4, is_bestseller = $7, in_stock = $8, item_rating = $9, scraped_at = NOW()
        `, [
          restaurant.id, restaurant.name, item.name, item.price, item.category,
          item.isVeg, item.isBestseller, item.inStock, item.ratings.rating
        ]);
      }

      await client.query('COMMIT');
      this.logger.info(`Saved Swiggy data: ${restaurant.name} (${menu.length} items)`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate string similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    const matrix: number[][] = [];
    for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    return 1 - matrix[s1.length][s2.length] / Math.max(s1.length, s2.length);
  }

  /**
   * Extract FSSAI license number (14 digits) from HTML
   * FSSAI is mandatory for food businesses in India
   */
  private extractFssaiNumber(html: string): string | undefined {
    const patterns = [
      /FSSAI\s*(?:Lic\.?\s*)?(?:No\.?\s*)?[:\s]*(\d{14})/i,
      /FSSAI\s*License\s*[:\s]*(\d{14})/i,
      /License\s*(?:No\.?\s*)?[:\s]*(\d{14})/i,
      /Lic\.\s*No\.?\s*[:\s]*(\d{14})/i,
      /FSSAI[^0-9]*(\d{14})/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const fssai = match[1].trim();
        if (/^\d{14}$/.test(fssai)) {
          this.logger.debug(`Extracted FSSAI: ${fssai}`);
          return fssai;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract GST number (15 characters - GSTIN format) from HTML
   * Format: 2 digits state code + 10 char PAN + 1 entity code + 1 Z + 1 checksum
   */
  private extractGstNumber(html: string): string | undefined {
    const patterns = [
      /GST(?:IN)?\s*(?:No\.?\s*)?[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1})/i,
      /GSTIN[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1})/i,
      /Tax\s*(?:Registration\s*)?(?:No\.?\s*)?[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1})/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const gst = match[1].toUpperCase().trim();
        if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)) {
          this.logger.debug(`Extracted GST: ${gst}`);
          return gst;
        }
      }
    }

    return undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
