import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ZoneService } from './services/zone.service';

/**
 * Zones Controller
 * Provides API endpoints for zone information and boundaries
 */
@Controller('zones')
export class ZonesController {
  private readonly logger = new Logger(ZonesController.name);

  constructor(private readonly zoneService: ZoneService) {}

  /**
   * GET /zones/boundaries
   * Returns all active zones with their polygon coordinates for map visualization
   * 
   * Response format:
   * {
   *   zones: [
   *     {
   *       id: 4,
   *       name: "Nashik New",
   *       status: 1,
   *       coordinates: [{ lat: 19.863, lng: 73.815 }, ...],
   *       modules: ["parcel", "food", "ecommerce"]
   *     }
   *   ]
   * }
   */
  @Get('boundaries')
  async getZoneBoundaries() {
    try {
      this.logger.log('🗺️  Fetching zone boundaries for frontend');
      
      const zones = await this.zoneService.getAllZones();

      // Transform zones for frontend consumption
      const boundaries = zones
        .filter((zone) => zone.status === 1) // Only active zones
        .map((zone) => ({
          id: zone.id,
          name: zone.name,
          status: zone.status,
          coordinates: this.parseCoordinates(zone),
          center: this.calculateCenter(zone),
          modules: this.extractModuleTypes(zone),
          payment_methods: {
            cash_on_delivery: zone.cash_on_delivery,
            digital_payment: zone.digital_payment,
          },
          delivery_charges: this.extractDeliveryCharges(zone),
        }));

      this.logger.log(`✅ Returning ${boundaries.length} zone boundaries`);

      return {
        success: true,
        count: boundaries.length,
        zones: boundaries,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch zone boundaries: ${error.message}`);
      return {
        success: false,
        error: 'Failed to fetch zone boundaries',
        zones: [],
      };
    }
  }

  /**
   * GET /zones/check?lat=X&lng=Y
   * Check if a specific location is within any serviceable zone
   */
  @Get('check')
  async checkLocation(@Query('lat') lat: string, @Query('lng') lng: string) {
    try {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return {
          success: false,
          error: 'Invalid coordinates',
        };
      }

      this.logger.log(`📍 Checking zone for location: ${latitude}, ${longitude}`);

      const result = await this.zoneService.getZoneIdByCoordinates(latitude, longitude);

      if (!result) {
        return {
          success: false,
          in_zone: false,
          message: 'Service not available in this area',
        };
      }

      return {
        success: true,
        in_zone: true,
        zone_id: result.zone_id,
        zone_name: result.zone_name,
        is_serviceable: result.is_serviceable,
        available_modules: result.available_modules,
        payment_methods: result.payment_methods,
      };
    } catch (error) {
      this.logger.error(`Zone check failed: ${error.message}`);
      return {
        success: false,
        error: 'Failed to check zone',
      };
    }
  }

  /**
   * Parse coordinates from zone data
   * Converts GeoJSON format to simple lat/lng array
   */
  private parseCoordinates(zone: any): Array<{ lat: number; lng: number }> {
    try {
      // Check if using formated_coordinates (already parsed)
      if (zone.formated_coordinates && Array.isArray(zone.formated_coordinates)) {
        return zone.formated_coordinates;
      }

      // Check if using coordinates with GeoJSON format
      if (zone.coordinates?.coordinates && Array.isArray(zone.coordinates.coordinates)) {
        const coords = zone.coordinates.coordinates[0]; // First polygon ring
        return coords.map(([lng, lat]: [number, number]) => ({ lat, lng }));
      }

      // Fallback: empty array
      this.logger.warn(`Unable to parse coordinates for zone ${zone.id}`);
      return [];
    } catch (error) {
      this.logger.error(`Coordinate parsing error for zone ${zone.id}: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate center point of zone polygon
   */
  private calculateCenter(zone: any): { lat: number; lng: number } | null {
    try {
      const coordinates = this.parseCoordinates(zone);
      
      if (coordinates.length === 0) {
        return null;
      }

      // Calculate centroid (average of all points)
      const sum = coordinates.reduce(
        (acc, coord) => ({
          lat: acc.lat + coord.lat,
          lng: acc.lng + coord.lng,
        }),
        { lat: 0, lng: 0 },
      );

      return {
        lat: sum.lat / coordinates.length,
        lng: sum.lng / coordinates.length,
      };
    } catch (error) {
      this.logger.error(`Center calculation error for zone ${zone.id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract module types from zone
   */
  private extractModuleTypes(zone: any): string[] {
    try {
      if (!zone.modules || !Array.isArray(zone.modules)) {
        return [];
      }

      return zone.modules
        .filter((m: any) => m.status === '1' || m.status === 1)
        .map((m: any) => m.module_type);
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract delivery charge information
   */
  private extractDeliveryCharges(zone: any): any {
    try {
      if (!zone.modules || !Array.isArray(zone.modules)) {
        return {};
      }

      const charges: any = {};
      zone.modules.forEach((module: any) => {
        if (module.pivot) {
          charges[module.module_type] = {
            per_km: module.pivot.per_km_shipping_charge,
            minimum: module.pivot.minimum_shipping_charge,
            maximum: module.pivot.maximum_shipping_charge,
            type: module.pivot.delivery_charge_type,
          };
        }
      });

      return charges;
    } catch (error) {
      return {};
    }
  }
}
