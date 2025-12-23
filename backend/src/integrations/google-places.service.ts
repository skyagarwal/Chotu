/**
 * Google Places Service
 * 
 * Integrates with Google Places API to:
 * 1. Search for restaurants not in our database
 * 2. Fetch external reviews from Google
 * 3. Match our stores to Google Place IDs
 * 4. Enrich our data with Google ratings
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../database/prisma.service';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating: number;
  user_ratings_total: number;
  types: string[];
  opening_hours?: {
    open_now: boolean;
  };
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
  language: string;
  profile_photo_url?: string;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating: number;
  user_ratings_total: number;
  reviews: GoogleReview[];
  opening_hours?: {
    weekday_text: string[];
    open_now: boolean;
  };
  price_level?: number;
  url: string; // Google Maps URL
}

@Injectable()
export class GooglePlacesService implements OnModuleInit {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private apiKey: string;
  private isConfigured = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.apiKey = this.configService.get('GOOGLE_PLACES_API_KEY');
    
    if (this.apiKey) {
      this.isConfigured = true;
      this.logger.log('✅ Google Places API configured');
    } else {
      this.logger.warn('⚠️ Google Places API key not configured. External search disabled.');
    }
  }

  /**
   * Check if service is configured
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Search for places near a location
   */
  async searchNearby(
    query: string,
    lat: number,
    lng: number,
    options: {
      radius?: number;
      type?: string;
      minRating?: number;
    } = {}
  ): Promise<GooglePlace[]> {
    if (!this.isConfigured) {
      this.logger.warn('Google Places API not configured');
      return [];
    }

    const { radius = 5000, type = 'restaurant', minRating = 0 } = options;

    try {
      const url = `${this.baseUrl}/nearbysearch/json`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            key: this.apiKey,
            location: `${lat},${lng}`,
            radius: radius.toString(),
            keyword: query,
            type,
          },
        })
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        this.logger.error(`Google Places API error: ${response.data.status}`);
        return [];
      }

      let results: GooglePlace[] = response.data.results || [];
      
      // Filter by minimum rating if specified
      if (minRating > 0) {
        results = results.filter(p => (p.rating || 0) >= minRating);
      }

      this.logger.log(`Found ${results.length} places for "${query}" near ${lat},${lng}`);
      return results;
    } catch (error) {
      this.logger.error(`Google Places search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Text search for places (more flexible than nearby)
   */
  async textSearch(
    query: string,
    options: {
      location?: { lat: number; lng: number };
      radius?: number;
      type?: string;
    } = {}
  ): Promise<GooglePlace[]> {
    if (!this.isConfigured) return [];

    try {
      const url = `${this.baseUrl}/textsearch/json`;
      const params: Record<string, string> = {
        key: this.apiKey,
        query,
      };

      if (options.location) {
        params.location = `${options.location.lat},${options.location.lng}`;
        params.radius = (options.radius || 10000).toString();
      }
      if (options.type) {
        params.type = options.type;
      }

      const response = await firstValueFrom(
        this.httpService.get(url, { params })
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        this.logger.error(`Google Places text search error: ${response.data.status}`);
        return [];
      }

      return response.data.results || [];
    } catch (error) {
      this.logger.error(`Google Places text search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get detailed information about a place including reviews
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    if (!this.isConfigured) return null;

    try {
      const url = `${this.baseUrl}/details/json`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            key: this.apiKey,
            place_id: placeId,
            fields: 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,reviews,opening_hours,price_level,url',
          },
        })
      );

      if (response.data.status !== 'OK') {
        this.logger.error(`Google Place details error: ${response.data.status}`);
        return null;
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(`Google Place details failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get reviews for a place
   */
  async getPlaceReviews(placeId: string): Promise<GoogleReview[]> {
    const details = await this.getPlaceDetails(placeId);
    return details?.reviews || [];
  }

  /**
   * Match our store to a Google Place ID
   */
  async matchStoreToGooglePlace(
    storeName: string,
    address: string,
    lat: number,
    lng: number
  ): Promise<{ placeId: string; confidence: number } | null> {
    if (!this.isConfigured) return null;

    try {
      // Search nearby with store name
      const results = await this.searchNearby(storeName, lat, lng, { radius: 500 });
      
      if (results.length === 0) {
        // Try text search with name + address
        const textResults = await this.textSearch(`${storeName} ${address}`);
        if (textResults.length === 0) return null;
        results.push(...textResults);
      }

      // Find best match using similarity
      let bestMatch: GooglePlace | null = null;
      let bestScore = 0;

      for (const place of results) {
        const nameScore = this.similarity(place.name.toLowerCase(), storeName.toLowerCase());
        const addressScore = this.similarity(
          (place.vicinity || place.formatted_address || '').toLowerCase(),
          address.toLowerCase()
        );
        
        // Weight name higher than address
        const score = nameScore * 0.7 + addressScore * 0.3;
        
        if (score > bestScore && score > 0.5) { // Minimum 50% match
          bestScore = score;
          bestMatch = place;
        }
      }

      if (bestMatch) {
        this.logger.log(`Matched "${storeName}" to Google Place: ${bestMatch.name} (confidence: ${bestScore.toFixed(2)})`);
        return {
          placeId: bestMatch.place_id,
          confidence: bestScore,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Store matching failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Save store-Google mapping to database
   */
  async saveStoreMapping(
    storeId: string,
    googlePlaceId: string,
    confidence: number
  ): Promise<void> {
    try {
      const details = await this.getPlaceDetails(googlePlaceId);
      
      await this.prisma.$executeRaw`
        INSERT INTO store_google_mapping (
          store_id, google_place_id, google_rating, google_review_count,
          match_confidence, last_synced_at
        ) VALUES (
          ${storeId}, ${googlePlaceId}, ${details?.rating || null}, 
          ${details?.user_ratings_total || 0}, ${confidence}, NOW()
        )
        ON CONFLICT (store_id) DO UPDATE SET
          google_place_id = EXCLUDED.google_place_id,
          google_rating = EXCLUDED.google_rating,
          google_review_count = EXCLUDED.google_review_count,
          match_confidence = EXCLUDED.match_confidence,
          last_synced_at = NOW()
      `;

      // Cache reviews
      if (details?.reviews) {
        await this.cacheGoogleReviews(googlePlaceId, details.reviews);
      }

      this.logger.log(`Saved mapping for store ${storeId} → ${googlePlaceId}`);
    } catch (error) {
      this.logger.error(`Failed to save store mapping: ${error.message}`);
    }
  }

  /**
   * Cache Google reviews in our database
   */
  private async cacheGoogleReviews(placeId: string, reviews: GoogleReview[]): Promise<void> {
    for (const review of reviews) {
      try {
        await this.prisma.$executeRaw`
          INSERT INTO google_reviews_cache (
            google_place_id, author_name, rating, text, time, synced_at
          ) VALUES (
            ${placeId}, ${review.author_name}, ${review.rating},
            ${review.text}, to_timestamp(${review.time}), NOW()
          )
          ON CONFLICT DO NOTHING
        `;
      } catch (error) {
        // Ignore duplicate errors
      }
    }
  }

  /**
   * Get combined rating (Mangwale + Google)
   */
  async getCombinedRating(storeId: string): Promise<{
    mangwaleRating: number;
    mangwaleReviewCount: number;
    googleRating: number | null;
    googleReviewCount: number;
    combinedRating: number;
    combinedReviewCount: number;
  } | null> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT 
          m.google_rating,
          m.google_review_count,
          s.avg_rating as mangwale_rating,
          s.total_reviews as mangwale_review_count
        FROM store_google_mapping m
        LEFT JOIN store_review_stats s ON s.store_id = m.store_id
        WHERE m.store_id = ${storeId}
      `;

      if (result.length === 0) return null;

      const row = result[0];
      const mangwaleRating = row.mangwale_rating || 0;
      const mangwaleCount = row.mangwale_review_count || 0;
      const googleRating = row.google_rating;
      const googleCount = row.google_review_count || 0;

      // Weighted average (weight by review count)
      const totalCount = mangwaleCount + googleCount;
      const combinedRating = totalCount > 0
        ? (mangwaleRating * mangwaleCount + (googleRating || 0) * googleCount) / totalCount
        : 0;

      return {
        mangwaleRating,
        mangwaleReviewCount: mangwaleCount,
        googleRating,
        googleReviewCount: googleCount,
        combinedRating,
        combinedReviewCount: totalCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get combined rating: ${error.message}`);
      return null;
    }
  }

  /**
   * Sync Google ratings for all mapped stores (daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async syncAllStoreRatings(): Promise<void> {
    if (!this.isConfigured) return;

    this.logger.log('Starting daily Google ratings sync...');

    try {
      const mappings = await this.prisma.$queryRaw<any[]>`
        SELECT store_id, google_place_id 
        FROM store_google_mapping
        WHERE last_synced_at < NOW() - INTERVAL '24 hours'
        LIMIT 100
      `;

      for (const mapping of mappings) {
        try {
          const details = await this.getPlaceDetails(mapping.google_place_id);
          
          if (details) {
            await this.prisma.$executeRaw`
              UPDATE store_google_mapping SET
                google_rating = ${details.rating},
                google_review_count = ${details.user_ratings_total},
                last_synced_at = NOW()
              WHERE store_id = ${mapping.store_id}
            `;

            // Update cached reviews
            if (details.reviews) {
              await this.cacheGoogleReviews(mapping.google_place_id, details.reviews);
            }
          }

          // Rate limit: 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.error(`Failed to sync store ${mapping.store_id}: ${error.message}`);
        }
      }

      this.logger.log(`Synced ${mappings.length} store ratings from Google`);
    } catch (error) {
      this.logger.error(`Daily sync failed: ${error.message}`);
    }
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private similarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Simple word overlap for faster performance
    const words1 = new Set(s1.toLowerCase().split(/\s+/));
    const words2 = new Set(s2.toLowerCase().split(/\s+/));
    
    let overlap = 0;
    for (const word of words1) {
      if (words2.has(word)) overlap++;
    }

    return (2 * overlap) / (words1.size + words2.size);
  }
}
