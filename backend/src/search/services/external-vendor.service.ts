import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  address: string;
  formatted_address: string;
  lat: number;
  lng: number;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  phone?: string;
  website?: string;
  maps_link: string;
  distance_km?: number;
}

export interface ExternalSearchResult {
  success: boolean;
  results: GooglePlaceResult[];
  query: string;
  source: 'google_places' | 'php_api' | 'cache';
  cached?: boolean;
  error?: string;
}

@Injectable()
export class ExternalVendorService {
  private readonly logger = new Logger(ExternalVendorService.name);
  private readonly phpBackendUrl: string;
  private readonly googleApiKey: string;
  private readonly cache = new Map<string, { data: ExternalSearchResult; timestamp: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.phpBackendUrl = this.configService.get<string>('PHP_BACKEND_URL') || 
                         this.configService.get<string>('PHP_API_BASE_URL') ||
                         'https://testing.mangwale.com';
    this.googleApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
    
    this.logger.log('✅ ExternalVendorService initialized');
    this.logger.log(`   PHP Backend: ${this.phpBackendUrl}`);
  }

  /**
   * Search for external vendors (restaurants/stores) not in our database
   * Uses Google Places API via PHP backend or directly
   */
  async searchExternalVendor(
    query: string,
    options?: {
      location?: { lat: number; lng: number };
      type?: 'restaurant' | 'store' | 'cafe' | 'bakery' | 'grocery_or_supermarket';
      radius?: number; // in meters
      city?: string;
    }
  ): Promise<ExternalSearchResult> {
    const { location, type = 'restaurant', radius = 10000, city = 'Nashik' } = options || {};
    
    // Build cache key
    const cacheKey = `${query}_${city}_${type}_${location?.lat || 0}_${location?.lng || 0}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`📦 Cache hit for: "${query}"`);
      return { ...cached.data, cached: true };
    }

    this.logger.log(`🔍 Searching external vendors: "${query}" in ${city}`);

    try {
      // Method 1: Try PHP backend's place-api-autocomplete first
      const phpResult = await this.searchViaPhpApi(query, city);
      if (phpResult.success && phpResult.results.length > 0) {
        this.cache.set(cacheKey, { data: phpResult, timestamp: Date.now() });
        return phpResult;
      }

      // Method 2: Try Google Places Text Search directly
      if (this.googleApiKey) {
        const googleResult = await this.searchViaGooglePlaces(query, { location, type, radius, city });
        if (googleResult.success && googleResult.results.length > 0) {
          this.cache.set(cacheKey, { data: googleResult, timestamp: Date.now() });
          return googleResult;
        }
      }

      // Method 3: Try Google Places Nearby Search with location
      if (location && this.googleApiKey) {
        const nearbyResult = await this.searchNearbyPlaces(query, location, type, radius);
        if (nearbyResult.success && nearbyResult.results.length > 0) {
          this.cache.set(cacheKey, { data: nearbyResult, timestamp: Date.now() });
          return nearbyResult;
        }
      }

      return {
        success: false,
        results: [],
        query,
        source: 'google_places',
        error: `No external vendors found for "${query}" in ${city}`
      };
    } catch (error) {
      this.logger.error(`External vendor search failed: ${error.message}`);
      return {
        success: false,
        results: [],
        query,
        source: 'google_places',
        error: error.message
      };
    }
  }

  /**
   * Search via PHP backend's place-api-autocomplete endpoint
   * Handles both old format (array of places) and new format (suggestions array)
   */
  private async searchViaPhpApi(query: string, city: string = 'Nashik'): Promise<ExternalSearchResult> {
    try {
      const searchText = `${query} ${city}`.trim();
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.phpBackendUrl}/api/v1/config/place-api-autocomplete`, {
          params: { search_text: searchText },
          headers: {
            'moduleid': '3',
            'zoneid': '1',
          },
          timeout: 10000,
        })
      );

      // Handle new format: { suggestions: [{ placePrediction: {...} }] }
      let placesData = response.data;
      if (response.data?.suggestions && Array.isArray(response.data.suggestions)) {
        placesData = response.data.suggestions.map((s: any) => {
          const p = s.placePrediction;
          return {
            place_id: p?.placeId || p?.place,
            description: p?.text?.text || '',
            structured_formatting: {
              main_text: p?.structuredFormat?.mainText?.text || '',
              secondary_text: p?.structuredFormat?.secondaryText?.text || '',
            },
            types: p?.types || [],
          };
        });
      }

      if (placesData && Array.isArray(placesData) && placesData.length > 0) {
        // Process results - for now, return with estimated coordinates (center of Nashik) 
        // since we can't get place details without Google API key
        const NASHIK_CENTER = { lat: 19.9975, lng: 73.7898 };
        
        const results: GooglePlaceResult[] = placesData.slice(0, 5).map((place: any) => {
          const name = place.structured_formatting?.main_text || place.description?.split(',')[0] || query;
          const address = place.structured_formatting?.secondary_text || place.description || '';
          const fullAddress = place.description || `${name}, ${address}`;
          
          // Generate a Google Maps search link that will work without coordinates
          const mapsSearchLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
          
          return {
            place_id: place.place_id,
            name,
            address,
            formatted_address: fullAddress,
            lat: NASHIK_CENTER.lat, // Default to city center
            lng: NASHIK_CENTER.lng,
            types: place.types || [],
            maps_link: mapsSearchLink,
            // Flag to indicate coordinates are estimated
            coordinates_estimated: true,
          } as GooglePlaceResult;
        });

        // Return all results since we now have valid search results
        return {
          success: results.length > 0,
          results,
          query,
          source: 'php_api',
        };
      }

      return { success: false, results: [], query, source: 'php_api' };
    } catch (error) {
      this.logger.warn(`PHP API search failed: ${error.message}`);
      return { success: false, results: [], query, source: 'php_api', error: error.message };
    }
  }

  /**
   * Get place details (coordinates, rating, etc.) from place_id or address
   * Uses geocode-api with the address since place_id lookup requires different endpoint
   */
  async getPlaceDetails(placeId: string, address?: string): Promise<Partial<GooglePlaceResult> | null> {
    try {
      // If we have an address, use it for geocoding
      if (address) {
        const response = await firstValueFrom(
          this.httpService.get(`${this.phpBackendUrl}/api/v1/config/geocode-api`, {
            params: { address: address },
            headers: {
              'moduleid': '3',
              'zoneid': '1',
            },
            timeout: 10000,
          })
        );

        if (response.data) {
          // Handle response format { lat, lng, formatted_address }
          if (response.data.lat && response.data.lng) {
            return {
              lat: parseFloat(response.data.lat),
              lng: parseFloat(response.data.lng),
              formatted_address: response.data.formatted_address || address,
              rating: response.data.rating,
              user_ratings_total: response.data.user_ratings_total,
            };
          }
          // Handle nested format { results: [{ geometry: { location: { lat, lng } } }] }
          if (response.data.results?.[0]?.geometry?.location) {
            const loc = response.data.results[0].geometry.location;
            return {
              lat: parseFloat(loc.lat),
              lng: parseFloat(loc.lng),
              formatted_address: response.data.results[0].formatted_address || address,
            };
          }
        }
      }
      
      // Fallback: try to use place_id with Google Places API directly if we have the key
      if (this.googleApiKey && placeId) {
        const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
        const response = await firstValueFrom(
          this.httpService.get(placeDetailsUrl, {
            params: {
              place_id: placeId,
              key: this.googleApiKey,
              fields: 'geometry,rating,user_ratings_total,formatted_address',
            },
            timeout: 10000,
          })
        );
        
        if (response.data?.result?.geometry?.location) {
          const result = response.data.result;
          return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            formatted_address: result.formatted_address,
            rating: result.rating,
            user_ratings_total: result.user_ratings_total,
          };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`Get place details failed for ${placeId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Direct Google Places Text Search API
   */
  private async searchViaGooglePlaces(
    query: string,
    options: { location?: { lat: number; lng: number }; type?: string; radius?: number; city?: string }
  ): Promise<ExternalSearchResult> {
    if (!this.googleApiKey) {
      return { success: false, results: [], query, source: 'google_places', error: 'No API key' };
    }

    try {
      const searchQuery = `${query} ${options.city || 'Nashik'} ${options.type || 'restaurant'}`.trim();
      
      const params: any = {
        query: searchQuery,
        key: this.googleApiKey,
        language: 'en',
        region: 'in',
      };

      if (options.location) {
        params.location = `${options.location.lat},${options.location.lng}`;
        params.radius = options.radius || 10000;
      }

      const response = await firstValueFrom(
        this.httpService.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
          params,
          timeout: 10000,
        })
      );

      if (response.data?.status === 'OK' && response.data.results?.length > 0) {
        const results: GooglePlaceResult[] = response.data.results.slice(0, 5).map((place: any) => ({
          place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          formatted_address: place.formatted_address,
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          types: place.types,
          opening_hours: place.opening_hours,
          maps_link: this.generateMapsLink(
            place.geometry?.location?.lat,
            place.geometry?.location?.lng,
            place.name
          ),
        }));

        return { success: true, results, query, source: 'google_places' };
      }

      return { success: false, results: [], query, source: 'google_places' };
    } catch (error) {
      this.logger.warn(`Google Places search failed: ${error.message}`);
      return { success: false, results: [], query, source: 'google_places', error: error.message };
    }
  }

  /**
   * Google Places Nearby Search
   */
  private async searchNearbyPlaces(
    keyword: string,
    location: { lat: number; lng: number },
    type: string = 'restaurant',
    radius: number = 10000
  ): Promise<ExternalSearchResult> {
    if (!this.googleApiKey) {
      return { success: false, results: [], query: keyword, source: 'google_places', error: 'No API key' };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
          params: {
            location: `${location.lat},${location.lng}`,
            radius,
            keyword,
            type,
            key: this.googleApiKey,
            language: 'en',
          },
          timeout: 10000,
        })
      );

      if (response.data?.status === 'OK' && response.data.results?.length > 0) {
        const results: GooglePlaceResult[] = response.data.results.slice(0, 5).map((place: any) => {
          const placeLat = place.geometry?.location?.lat || 0;
          const placeLng = place.geometry?.location?.lng || 0;
          
          return {
            place_id: place.place_id,
            name: place.name,
            address: place.vicinity || place.formatted_address,
            formatted_address: place.formatted_address || place.vicinity,
            lat: placeLat,
            lng: placeLng,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            types: place.types,
            opening_hours: place.opening_hours,
            maps_link: this.generateMapsLink(placeLat, placeLng, place.name),
            distance_km: this.calculateDistance(location.lat, location.lng, placeLat, placeLng),
          };
        });

        // Sort by distance
        results.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

        return { success: true, results, query: keyword, source: 'google_places' };
      }

      return { success: false, results: [], query: keyword, source: 'google_places' };
    } catch (error) {
      this.logger.warn(`Google Nearby search failed: ${error.message}`);
      return { success: false, results: [], query: keyword, source: 'google_places', error: error.message };
    }
  }

  /**
   * Generate Google Maps link for a location
   */
  generateMapsLink(lat: number, lng: number, name?: string): string {
    if (!lat || !lng) return '';
    
    const encodedName = name ? encodeURIComponent(name) : '';
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${encodedName ? `&query_place_id=${encodedName}` : ''}`;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Format external vendor result for user display
   */
  formatForDisplay(place: GooglePlaceResult): string {
    let display = `📍 **${place.name}**\n`;
    display += `   ${place.address}\n`;
    
    if (place.rating) {
      display += `   ⭐ ${place.rating}`;
      if (place.user_ratings_total) {
        display += ` (${place.user_ratings_total.toLocaleString()} reviews)`;
      }
      display += '\n';
    }
    
    if (place.distance_km) {
      display += `   📏 ${place.distance_km} km away\n`;
    }
    
    if (place.maps_link) {
      display += `   🗺️ [View on Maps](${place.maps_link})\n`;
    }
    
    return display;
  }

  /**
   * Format multiple results for chat display
   */
  formatResultsForChat(results: GooglePlaceResult[], query: string): string {
    if (results.length === 0) {
      return `Sorry, I couldn't find "${query}" on Google Maps. Please provide the exact address.`;
    }

    let message = `I found these locations for "${query}":\n\n`;
    
    results.slice(0, 3).forEach((place, index) => {
      message += `${index + 1}. **${place.name}**\n`;
      message += `   📍 ${place.address}\n`;
      if (place.rating) {
        message += `   ⭐ ${place.rating}`;
        if (place.user_ratings_total) {
          message += ` (${place.user_ratings_total} reviews)`;
        }
        message += '\n';
      }
      message += '\n';
    });

    message += `Reply with a number (1-${Math.min(results.length, 3)}) to select, or tell me the exact address.`;
    
    return message;
  }
}
