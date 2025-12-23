/**
 * Store Review Enrichment Service
 * 
 * KEY CONCEPT: We only show OUR stores from search API,
 * but we ENRICH them with external reviews (Google, etc.)
 * 
 * Flow:
 * 1. Match our store to Google Place ID
 * 2. Fetch Google reviews
 * 3. Cache with timestamp
 * 4. Combine our reviews + Google reviews
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { firstValueFrom } from 'rxjs';

export interface StoreMatch {
  storeId: string;
  storeName: string;
  storeAddress: string;
  googlePlaceId?: string;
  matchConfidence: number;
  matchSource: string;
  lastMatched: Date;
}

export interface EnrichedReview {
  source: 'mangwale' | 'google' | 'zomato' | 'swiggy';
  authorName: string;
  rating: number;
  text: string;
  time: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
  aspects?: string[];
}

export interface CombinedStoreRating {
  storeId: string;
  mangwaleRating: number;
  mangwaleReviewCount: number;
  googleRating?: number;
  googleReviewCount?: number;
  combinedRating: number;
  combinedReviewCount: number;
  topPositives: string[];
  topNegatives: string[];
  lastUpdated: Date;
}

@Injectable()
export class StoreReviewEnrichmentService implements OnModuleInit {
  private readonly logger = new Logger(StoreReviewEnrichmentService.name);
  
  // Cache for store-to-Google mappings
  private storeMatchCache = new Map<string, StoreMatch>();
  
  // Cache for combined ratings
  private ratingCache = new Map<string, CombinedStoreRating>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Store Review Enrichment Service...');
    await this.loadStoreMappings();
  }

  /**
   * Get combined rating for a store (OUR store + external reviews)
   */
  async getCombinedRating(storeId: string): Promise<CombinedStoreRating> {
    // Check cache first
    const cached = this.ratingCache.get(storeId);
    if (cached && Date.now() - cached.lastUpdated.getTime() < 24 * 60 * 60 * 1000) {
      return cached;
    }

    // Get our rating from PHP/database
    const ourRating = await this.getOurStoreRating(storeId);
    
    // Get Google Place ID for this store
    const storeMatch = await this.getStoreMatch(storeId);
    
    let googleData = { rating: 0, reviewCount: 0, reviews: [] as EnrichedReview[] };
    
    if (storeMatch?.googlePlaceId) {
      googleData = await this.fetchGoogleReviews(storeMatch.googlePlaceId);
    }

    // Combine ratings (weighted average)
    const combinedRating = this.calculateCombinedRating(
      ourRating.rating,
      ourRating.reviewCount,
      googleData.rating,
      googleData.reviewCount
    );

    // Extract top positives and negatives
    const { positives, negatives } = await this.extractTopAspects(storeId, googleData.reviews);

    const result: CombinedStoreRating = {
      storeId,
      mangwaleRating: ourRating.rating,
      mangwaleReviewCount: ourRating.reviewCount,
      googleRating: googleData.rating || undefined,
      googleReviewCount: googleData.reviewCount || undefined,
      combinedRating,
      combinedReviewCount: ourRating.reviewCount + googleData.reviewCount,
      topPositives: positives,
      topNegatives: negatives,
      lastUpdated: new Date(),
    };

    // Cache it
    this.ratingCache.set(storeId, result);
    
    // Save to database
    await this.saveCombinedRating(result);

    return result;
  }

  /**
   * Match our store to Google Place
   * Uses name + address + location for matching
   */
  async matchStoreToGoogle(
    storeId: string,
    storeName: string,
    storeAddress: string,
    lat: number,
    lng: number
  ): Promise<StoreMatch | null> {
    // Check if already matched
    const existing = await this.getStoreMatch(storeId);
    if (existing?.googlePlaceId) {
      return existing;
    }

    // Try to find on Google Places
    const sources = await this.getActiveReviewSources();
    
    for (const source of sources) {
      if (source.provider === 'google_places') {
        const placeId = await this.searchGoogleForStore(storeName, storeAddress, lat, lng, source.apiKey);
        
        if (placeId) {
          const match: StoreMatch = {
            storeId,
            storeName,
            storeAddress,
            googlePlaceId: placeId,
            matchConfidence: 0.85, // Can be improved with fuzzy matching score
            matchSource: 'google_places',
            lastMatched: new Date(),
          };
          
          await this.saveStoreMatch(match);
          this.storeMatchCache.set(storeId, match);
          
          return match;
        }
      }
    }

    // No match found
    const noMatch: StoreMatch = {
      storeId,
      storeName,
      storeAddress,
      matchConfidence: 0,
      matchSource: 'none',
      lastMatched: new Date(),
    };
    
    await this.saveStoreMatch(noMatch);
    return noMatch;
  }

  /**
   * Search Google Places for our store
   */
  private async searchGoogleForStore(
    storeName: string,
    storeAddress: string,
    lat: number,
    lng: number,
    apiKey?: string
  ): Promise<string | null> {
    if (!apiKey) {
      this.logger.warn('Google Places API key not configured');
      return null;
    }

    try {
      // Method 1: Text search with name + address
      const textSearchUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
      const query = `${storeName} ${storeAddress}`;
      
      const response = await firstValueFrom(
        this.httpService.get(textSearchUrl, {
          params: {
            query,
            location: `${lat},${lng}`,
            radius: 500, // 500 meters
            key: apiKey,
          },
          timeout: 10000,
        })
      );

      const results = response.data.results;
      
      if (results && results.length > 0) {
        // Find best match using similarity
        const bestMatch = this.findBestMatch(storeName, results);
        
        if (bestMatch && bestMatch.similarity > 0.6) {
          this.logger.log(`Matched ${storeName} to Google Place: ${bestMatch.place.name}`);
          return bestMatch.place.place_id;
        }
      }

      // Method 2: Nearby search (fallback)
      const nearbyUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      
      const nearbyResponse = await firstValueFrom(
        this.httpService.get(nearbyUrl, {
          params: {
            keyword: storeName,
            location: `${lat},${lng}`,
            radius: 200,
            type: 'restaurant',
            key: apiKey,
          },
          timeout: 10000,
        })
      );

      const nearbyResults = nearbyResponse.data.results;
      
      if (nearbyResults && nearbyResults.length > 0) {
        const bestNearby = this.findBestMatch(storeName, nearbyResults);
        
        if (bestNearby && bestNearby.similarity > 0.5) {
          this.logger.log(`Matched ${storeName} via nearby: ${bestNearby.place.name}`);
          return bestNearby.place.place_id;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Google Places search failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Find best matching place using string similarity
   */
  private findBestMatch(storeName: string, places: any[]): { place: any; similarity: number } | null {
    let bestMatch: { place: any; similarity: number } | null = null;
    
    for (const place of places) {
      const similarity = this.calculateSimilarity(
        storeName.toLowerCase(),
        place.name.toLowerCase()
      );
      
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { place, similarity };
      }
    }
    
    return bestMatch;
  }

  /**
   * Levenshtein distance based similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Remove common words
    const commonWords = ['restaurant', 'cafe', 'hotel', 'the', 'and', '&'];
    let s1 = str1;
    let s2 = str2;
    
    for (const word of commonWords) {
      s1 = s1.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
      s2 = s2.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
    }

    // If one contains the other, high similarity
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.9;
    }

    // Levenshtein distance
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
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
    
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - matrix[s1.length][s2.length] / maxLen;
  }

  /**
   * Fetch reviews from Google for a matched place
   */
  private async fetchGoogleReviews(placeId: string): Promise<{
    rating: number;
    reviewCount: number;
    reviews: EnrichedReview[];
  }> {
    // Check cache in database first
    const cached = await this.getCachedGoogleReviews(placeId);
    if (cached) {
      return cached;
    }

    const sources = await this.getActiveReviewSources();
    const googleSource = sources.find(s => s.provider === 'google_places');
    
    if (!googleSource?.apiKey) {
      return { rating: 0, reviewCount: 0, reviews: [] };
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/place/details/json';
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            place_id: placeId,
            fields: 'rating,user_ratings_total,reviews',
            key: googleSource.apiKey,
          },
          timeout: 10000,
        })
      );

      const result = response.data.result;
      
      if (!result) {
        return { rating: 0, reviewCount: 0, reviews: [] };
      }

      const reviews: EnrichedReview[] = (result.reviews || []).map((r: any) => ({
        source: 'google' as const,
        authorName: r.author_name,
        rating: r.rating,
        text: r.text,
        time: new Date(r.time * 1000),
        sentiment: this.quickSentiment(r.rating, r.text),
      }));

      const data = {
        rating: result.rating || 0,
        reviewCount: result.user_ratings_total || 0,
        reviews,
      };

      // Cache in database
      await this.cacheGoogleReviews(placeId, data);

      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch Google reviews: ${error.message}`);
      return { rating: 0, reviewCount: 0, reviews: [] };
    }
  }

  /**
   * Quick sentiment analysis based on rating and text
   */
  private quickSentiment(rating: number, text: string): 'positive' | 'neutral' | 'negative' {
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    
    // Check text for sentiment keywords
    const lower = text.toLowerCase();
    const negativeWords = ['bad', 'worst', 'terrible', 'avoid', 'waste', 'poor', 'cold', 'late'];
    const positiveWords = ['great', 'best', 'excellent', 'amazing', 'fresh', 'tasty', 'recommend'];
    
    const negCount = negativeWords.filter(w => lower.includes(w)).length;
    const posCount = positiveWords.filter(w => lower.includes(w)).length;
    
    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate weighted combined rating
   */
  private calculateCombinedRating(
    ourRating: number,
    ourCount: number,
    googleRating: number,
    googleCount: number
  ): number {
    const totalCount = ourCount + googleCount;
    
    if (totalCount === 0) return 0;
    
    // Weighted average, but give our reviews slightly more weight
    const ourWeight = ourCount * 1.2; // 20% more weight to our reviews
    const googleWeight = googleCount;
    
    const combined = (ourRating * ourWeight + googleRating * googleWeight) / (ourWeight + googleWeight);
    
    return Math.round(combined * 10) / 10; // Round to 1 decimal
  }

  /**
   * Extract top aspects from reviews
   */
  private async extractTopAspects(
    storeId: string,
    googleReviews: EnrichedReview[]
  ): Promise<{ positives: string[]; negatives: string[] }> {
    const positives: string[] = [];
    const negatives: string[] = [];

    // Analyze Google reviews
    for (const review of googleReviews) {
      if (review.sentiment === 'positive') {
        const aspects = this.extractAspects(review.text);
        positives.push(...aspects);
      } else if (review.sentiment === 'negative') {
        const aspects = this.extractAspects(review.text);
        negatives.push(...aspects);
      }
    }

    // Get unique top 3
    const topPositives = [...new Set(positives)].slice(0, 3);
    const topNegatives = [...new Set(negatives)].slice(0, 3);

    return { positives: topPositives, negatives: topNegatives };
  }

  /**
   * Simple aspect extraction from text
   */
  private extractAspects(text: string): string[] {
    const aspects: string[] = [];
    const lower = text.toLowerCase();
    
    const aspectKeywords: Record<string, string[]> = {
      'Fast delivery': ['fast', 'quick', 'speedy', 'on time'],
      'Good taste': ['tasty', 'delicious', 'yummy', 'amazing taste'],
      'Fresh food': ['fresh', 'hot', 'crispy'],
      'Good quantity': ['large portion', 'generous', 'filling'],
      'Slow delivery': ['slow', 'late', 'delayed'],
      'Bad taste': ['bland', 'tasteless', 'not good'],
      'Cold food': ['cold', 'not hot', 'soggy'],
      'Less quantity': ['small portion', 'less', 'not enough'],
    };
    
    for (const [aspect, keywords] of Object.entries(aspectKeywords)) {
      if (keywords.some(k => lower.includes(k))) {
        aspects.push(aspect);
      }
    }
    
    return aspects;
  }

  /**
   * Get our store rating from database/PHP
   */
  private async getOurStoreRating(storeId: string): Promise<{ rating: number; reviewCount: number }> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT 
          COALESCE(AVG(rating), 0) as rating,
          COUNT(*) as review_count
        FROM store_reviews
        WHERE store_id = ${storeId}
      `;
      
      return {
        rating: parseFloat(result[0]?.rating || 0),
        reviewCount: parseInt(result[0]?.review_count || 0),
      };
    } catch {
      return { rating: 0, reviewCount: 0 };
    }
  }

  /**
   * Get active review sources from database
   */
  private async getActiveReviewSources(): Promise<any[]> {
    try {
      const sources = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM data_sources 
        WHERE type = 'reviews' AND is_active = true
        ORDER BY priority ASC
      `;
      return sources;
    } catch {
      // Return default with env variable
      const apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');
      return apiKey ? [{ provider: 'google_places', apiKey, priority: 1 }] : [];
    }
  }

  /**
   * Get store match from cache or database
   */
  private async getStoreMatch(storeId: string): Promise<StoreMatch | null> {
    // Check memory cache
    const cached = this.storeMatchCache.get(storeId);
    if (cached) return cached;

    // Check database
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM store_external_mapping WHERE store_id = ${storeId}
      `;
      
      if (result.length > 0) {
        const match: StoreMatch = {
          storeId: result[0].store_id,
          storeName: result[0].store_name,
          storeAddress: result[0].store_address,
          googlePlaceId: result[0].google_place_id,
          matchConfidence: result[0].match_confidence,
          matchSource: result[0].match_source,
          lastMatched: result[0].last_matched,
        };
        this.storeMatchCache.set(storeId, match);
        return match;
      }
    } catch {
      // Table might not exist yet
    }
    
    return null;
  }

  /**
   * Save store match to database
   */
  private async saveStoreMatch(match: StoreMatch): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO store_external_mapping 
        (store_id, store_name, store_address, google_place_id, match_confidence, match_source, last_matched)
      VALUES 
        (${match.storeId}, ${match.storeName}, ${match.storeAddress}, ${match.googlePlaceId}, 
         ${match.matchConfidence}, ${match.matchSource}, ${match.lastMatched})
      ON CONFLICT (store_id) DO UPDATE SET
        google_place_id = ${match.googlePlaceId},
        match_confidence = ${match.matchConfidence},
        match_source = ${match.matchSource},
        last_matched = ${match.lastMatched}
    `.catch(() => {});
  }

  /**
   * Get cached Google reviews
   */
  private async getCachedGoogleReviews(placeId: string): Promise<{
    rating: number;
    reviewCount: number;
    reviews: EnrichedReview[];
  } | null> {
    try {
      const cached = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM google_reviews_cache 
        WHERE google_place_id = ${placeId}
        AND fetched_at > NOW() - INTERVAL '7 days'
      `;
      
      if (cached.length > 0) {
        return {
          rating: cached[0].rating,
          reviewCount: cached[0].review_count,
          reviews: cached[0].reviews || [],
        };
      }
    } catch {
      // Table might not exist
    }
    
    return null;
  }

  /**
   * Cache Google reviews in database
   */
  private async cacheGoogleReviews(
    placeId: string,
    data: { rating: number; reviewCount: number; reviews: EnrichedReview[] }
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO google_reviews_cache 
        (google_place_id, rating, review_count, reviews, fetched_at)
      VALUES 
        (${placeId}, ${data.rating}, ${data.reviewCount}, ${JSON.stringify(data.reviews)}::jsonb, NOW())
      ON CONFLICT (google_place_id) DO UPDATE SET
        rating = ${data.rating},
        review_count = ${data.reviewCount},
        reviews = ${JSON.stringify(data.reviews)}::jsonb,
        fetched_at = NOW()
    `.catch(() => {});
  }

  /**
   * Save combined rating to database
   */
  private async saveCombinedRating(rating: CombinedStoreRating): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO store_combined_ratings 
        (store_id, mangwale_rating, mangwale_review_count, google_rating, google_review_count,
         combined_rating, combined_review_count, top_positives, top_negatives, last_updated)
      VALUES 
        (${rating.storeId}, ${rating.mangwaleRating}, ${rating.mangwaleReviewCount},
         ${rating.googleRating || null}, ${rating.googleReviewCount || null},
         ${rating.combinedRating}, ${rating.combinedReviewCount},
         ${rating.topPositives}::text[], ${rating.topNegatives}::text[], ${rating.lastUpdated})
      ON CONFLICT (store_id) DO UPDATE SET
        mangwale_rating = ${rating.mangwaleRating},
        mangwale_review_count = ${rating.mangwaleReviewCount},
        google_rating = ${rating.googleRating || null},
        google_review_count = ${rating.googleReviewCount || null},
        combined_rating = ${rating.combinedRating},
        combined_review_count = ${rating.combinedReviewCount},
        top_positives = ${rating.topPositives}::text[],
        top_negatives = ${rating.topNegatives}::text[],
        last_updated = ${rating.lastUpdated}
    `.catch(() => {});
  }

  /**
   * Load store mappings on startup
   */
  private async loadStoreMappings(): Promise<void> {
    try {
      const mappings = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM store_external_mapping WHERE google_place_id IS NOT NULL
      `;
      
      for (const m of mappings) {
        this.storeMatchCache.set(m.store_id, {
          storeId: m.store_id,
          storeName: m.store_name,
          storeAddress: m.store_address,
          googlePlaceId: m.google_place_id,
          matchConfidence: m.match_confidence,
          matchSource: m.match_source,
          lastMatched: m.last_matched,
        });
      }
      
      this.logger.log(`Loaded ${mappings.length} store-to-Google mappings`);
    } catch {
      this.logger.log('No existing store mappings found');
    }
  }

  /**
   * Daily cron to refresh Google reviews for mapped stores
   */
  @Cron('0 4 * * *') // 4 AM daily
  async refreshGoogleReviews(): Promise<void> {
    this.logger.log('Starting daily Google review refresh...');
    
    let refreshed = 0;
    
    for (const [storeId, match] of this.storeMatchCache.entries()) {
      if (match.googlePlaceId) {
        try {
          await this.fetchGoogleReviews(match.googlePlaceId);
          refreshed++;
          
          // Rate limit: 1 request per second
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error(`Failed to refresh reviews for store ${storeId}: ${error.message}`);
        }
      }
    }
    
    this.logger.log(`Refreshed Google reviews for ${refreshed} stores`);
  }
}
