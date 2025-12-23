import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

/**
 * Zone Executor
 * 
 * Validates if coordinates are in serviceable zone
 */
@Injectable()
export class ZoneExecutor implements ActionExecutor {
  readonly name = 'zone';
  private readonly logger = new Logger(ZoneExecutor.name);

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      // Support both direct values and paths to context data
      let latitude: number;
      let longitude: number;

      if (config.latPath && config.lngPath) {
        // Extract from context using path
        latitude = this.getValueByPath(context.data, config.latPath);
        longitude = this.getValueByPath(context.data, config.lngPath);
        
        // Fallback: try alternative field names (lat/latitude, lng/longitude)
        if (!latitude || !longitude) {
          const pathParts = config.latPath.split('.');
          const objPath = pathParts.slice(0, -1).join('.');
          const obj = objPath ? this.getValueByPath(context.data, objPath) : context.data;
          
          if (obj && typeof obj === 'object') {
            latitude = latitude || obj['latitude'] || obj['lat'];
            longitude = longitude || obj['longitude'] || obj['lng'] || obj['long'];
          }
        }
      } else {
        // Direct values
        latitude = config.latitude as number;
        longitude = config.longitude as number;
      }

      if (!latitude || !longitude) {
        this.logger.error(`Missing coordinates. Config: ${JSON.stringify(config)}, Data: ${JSON.stringify(context.data)}`);
        return {
          success: false,
          error: 'Latitude and longitude required',
        };
      }

      this.logger.debug(`Validating zone for: (${latitude}, ${longitude})`);

      // Zone validation for Maharashtra cities
      // Define service areas for multiple cities
      const serviceBounds = [
        // Nashik City bounds
        {
          name: 'Nashik City',
          zoneId: 4,
          minLat: 19.9,
          maxLat: 20.1,
          minLng: 73.6,
          maxLng: 73.9,
        },
        // Pune City bounds (expanded to cover Swargate, Koregaon Park, Hinjewadi, etc.)
        {
          name: 'Pune City',
          zoneId: 5,
          minLat: 18.4,
          maxLat: 18.7,
          minLng: 73.7,
          maxLng: 74.0,
        },
        // Mumbai Metropolitan Region
        {
          name: 'Mumbai',
          zoneId: 6,
          minLat: 18.87,
          maxLat: 19.3,
          minLng: 72.7,
          maxLng: 73.1,
        },
      ];

      // Check if coordinates fall within any service zone
      let matchedZone = null;
      for (const zone of serviceBounds) {
        if (
          latitude >= zone.minLat &&
          latitude <= zone.maxLat &&
          longitude >= zone.minLng &&
          longitude <= zone.maxLng
        ) {
          matchedZone = zone;
          break;
        }
      }

      const isValid = matchedZone !== null;

      const output = {
        valid: isValid,
        zoneName: matchedZone?.name || 'Outside service area',
        zoneId: matchedZone?.zoneId || null,
      };

      this.logger.debug(`Zone validation: ${isValid ? 'VALID' : 'INVALID'} - ${matchedZone?.name || 'No match'}`);

      const event = isValid ? 'zone_valid' : 'zone_invalid';

      return {
        success: true,
        output,
        event,
      };
    } catch (error) {
      this.logger.error(`Zone validation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  validate(config: Record<string, any>): boolean {
    return !!(
      (config.latitude && config.longitude) ||
      (config.latPath && config.lngPath)
    );
  }

  private getValueByPath(data: any, path: string): any {
    const keys = path.split('.');
    let value = data;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }
}
