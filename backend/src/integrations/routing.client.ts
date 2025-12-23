/**
 * Delivery Routing Integration Client
 * 
 * HTTP client for communicating with delivery-routing service in admin-backend.
 * Replaces direct OSRMService calls with HTTP API requests.
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Location coordinates
 */
export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Location with identifier
 */
export interface IdentifiedLocation extends Location {
  id?: number | string;
  name?: string;
}

/**
 * Distance calculation result
 */
export interface DistanceResult {
  distance_km: number;
  duration_min: number;
  distance_m: number;
  duration_s: number;
}

/**
 * Bulk distance result
 */
export interface BulkDistanceResult {
  source: Location;
  destinations: Array<{
    location: Location;
    distance_km: number;
    duration_min: number;
    id?: number | string;
    name?: string;
  }>;
  computation_time_ms?: number;
}

/**
 * Delivery time estimate
 */
export interface DeliveryEstimate {
  travel_time_min: number;
  preparation_time_min: number;
  buffer_time_min: number;
  total_time_min: number;
  formatted_estimate: string;
}

/**
 * Routing health check
 */
export interface RoutingHealthCheck {
  available: boolean;
  response_time_ms?: number;
  error?: string;
  osrm_url: string;
  fallback_mode: boolean;
}

/**
 * Delivery Routing Client for Admin Backend Integration
 */
@Injectable()
export class RoutingClient {
  private readonly logger = new Logger(RoutingClient.name);
  private readonly adminBackendUrl: string;
  private readonly timeout = 10000; // 10 second timeout

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.adminBackendUrl = 
      this.configService.get<string>('ADMIN_BACKEND_URL') || 
      'http://localhost:3002';

    this.logger.log(`🗺️  Routing Client initialized: ${this.adminBackendUrl}`);
  }

  /**
   * Calculate distance between two points
   */
  async calculateDistance(
    from: Location,
    to: Location,
  ): Promise<DistanceResult | null> {
    try {
      this.logger.debug(`Calculating distance: ${from.latitude},${from.longitude} → ${to.latitude},${to.longitude}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminBackendUrl}/api/delivery-routing/distance`,
          { from, to },
          { timeout: this.timeout }
        )
      );

      if (!response.data.success) {
        this.logger.warn(`Distance calculation failed: ${response.data.error}`);
        return null;
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error(`❌ Distance calculation failed: ${error.message}`);
      
      // Handle network errors gracefully
      if (error.code === 'ECONNREFUSED') {
        this.logger.warn('Routing service unavailable, returning null');
        return null;
      }

      // Handle timeout
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        this.logger.warn('Routing service timeout, returning null');
        return null;
      }

      return null;
    }
  }

  /**
   * Calculate distances from one source to multiple destinations
   * Much more efficient than calling calculateDistance multiple times
   */
  async calculateBulkDistances(
    source: Location,
    destinations: IdentifiedLocation[],
  ): Promise<BulkDistanceResult | null> {
    try {
      this.logger.debug(`Calculating bulk distances: 1 source → ${destinations.length} destinations`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminBackendUrl}/api/delivery-routing/bulk-distance`,
          { source, destinations },
          { timeout: this.timeout }
        )
      );

      if (!response.data.success) {
        this.logger.warn(`Bulk distance calculation failed: ${response.data.error}`);
        return null;
      }

      this.logger.debug(`✅ Bulk distances calculated in ${response.data.data.computation_time_ms}ms`);
      return response.data.data;
    } catch (error: any) {
      this.logger.error(`❌ Bulk distance calculation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Estimate total delivery time
   */
  async estimateDeliveryTime(
    travelTimeMin: number,
    preparationTimeMin: number,
    bufferPercent?: number,
  ): Promise<DeliveryEstimate | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminBackendUrl}/api/delivery-routing/estimate`,
          {
            travel_time_min: travelTimeMin,
            preparation_time_min: preparationTimeMin,
            buffer_percent: bufferPercent,
          },
          { timeout: this.timeout }
        )
      );

      if (!response.data.success) {
        return null;
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Failed to estimate delivery time: ${error.message}`);
      return null;
    }
  }

  /**
   * Get current routing configuration
   */
  async getConfig(): Promise<{ buffer_percent: number } | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminBackendUrl}/api/delivery-routing/config`,
          { timeout: this.timeout }
        )
      );

      if (!response.data.success) {
        return null;
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Failed to get routing config: ${error.message}`);
      return null;
    }
  }

  /**
   * Update routing configuration
   */
  async updateConfig(bufferPercent: number): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminBackendUrl}/api/delivery-routing/config`,
          { buffer_percent: bufferPercent },
          { timeout: this.timeout }
        )
      );

      return response.data.success;
    } catch (error: any) {
      this.logger.error(`Failed to update routing config: ${error.message}`);
      return false;
    }
  }

  /**
   * Check routing service health
   */
  async healthCheck(): Promise<RoutingHealthCheck | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminBackendUrl}/api/delivery-routing/health`,
          { timeout: 5000 }
        )
      );

      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Routing health check failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Find nearest stores/locations from a source
   * Returns sorted by distance (nearest first)
   */
  async findNearest(
    source: Location,
    locations: IdentifiedLocation[],
    limit?: number,
  ): Promise<IdentifiedLocation[] | null> {
    const result = await this.calculateBulkDistances(source, locations);

    if (!result) {
      return null;
    }

    // Results are already sorted by distance
    const nearest = result.destinations.map(d => ({
      latitude: d.location.latitude,
      longitude: d.location.longitude,
      id: d.id,
      name: d.name,
      distance_km: d.distance_km,
      duration_min: d.duration_min,
    }));

    return limit ? nearest.slice(0, limit) : nearest;
  }

  /**
   * Enrich items with distance and delivery time information
   * Useful for search results, store listings, etc.
   */
  async enrichWithDistance<T extends {
    latitude?: number;
    longitude?: number;
    id?: number;
    name?: string;
    preparation_time_min?: number;
  }>(
    items: T[],
    userLocation: Location,
  ): Promise<Array<T & {
    distance_km?: number;
    duration_min?: number;
    total_delivery_time?: number;
    delivery_time_estimate?: string;
  }>> {
    try {
      // Extract locations with valid coordinates
      const locations: IdentifiedLocation[] = items
        .filter(item => item.latitude && item.longitude)
        .map(item => ({
          latitude: item.latitude!,
          longitude: item.longitude!,
          id: item.id,
          name: item.name,
        }));

      if (locations.length === 0) {
        this.logger.warn('No valid locations to enrich');
        return items;
      }

      // Calculate all distances in one call
      const bulkResult = await this.calculateBulkDistances(userLocation, locations);

      if (!bulkResult) {
        this.logger.warn('Bulk distance calculation failed, returning items without enrichment');
        return items;
      }

      // Create a map of id → distance data
      const distanceMap = new Map<number | string, {
        distance_km: number;
        duration_min: number;
      }>();

      bulkResult.destinations.forEach(dest => {
        if (dest.id !== undefined) {
          distanceMap.set(dest.id, {
            distance_km: dest.distance_km,
            duration_min: dest.duration_min,
          });
        }
      });

      // Enrich items with distance data
      return items.map(item => {
        const distanceData = item.id !== undefined ? distanceMap.get(item.id) : null;

        if (!distanceData) {
          return item;
        }

        // Calculate total delivery time
        const prepTime = item.preparation_time_min || 15; // Default 15 min
        const totalTime = distanceData.duration_min + prepTime;

        return {
          ...item,
          distance_km: distanceData.distance_km,
          duration_min: distanceData.duration_min,
          total_delivery_time: totalTime,
          delivery_time_estimate: this.formatDeliveryTime(totalTime),
        };
      });
    } catch (error: any) {
      this.logger.error(`Failed to enrich items with distance: ${error.message}`);
      return items;
    }
  }

  /**
   * Format delivery time (simple version, server has better formatting)
   */
  private formatDeliveryTime(minutes: number): string {
    if (minutes < 15) return '10-15 mins';
    if (minutes < 25) return '15-25 mins';
    if (minutes < 35) return '25-35 mins';
    if (minutes < 50) return '35-50 mins';
    if (minutes < 70) return '50-70 mins';
    return `${Math.floor(minutes / 10) * 10}-${Math.floor(minutes / 10) * 10 + 15} mins`;
  }
}
