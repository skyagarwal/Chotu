import { Injectable, Logger } from '@nestjs/common';
import { PhpParcelService } from '../../php-integration/services/parcel.service';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

/**
 * Distance Executor
 * 
 * Calculates distance between two points using OSRM
 */
@Injectable()
export class DistanceExecutor implements ActionExecutor {
  readonly name = 'distance';
  private readonly logger = new Logger(DistanceExecutor.name);

  constructor(private readonly phpParcelService: PhpParcelService) {}

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      // Support both direct objects, context paths, and explicit lat/lng paths
      const from = config.from;
      const to = config.to;
      const fromLatPath = config.fromLatPath;
      const fromLngPath = config.fromLngPath;
      const toLatPath = config.toLatPath;
      const toLngPath = config.toLngPath;

      // Helper to extract coordinates
      const getCoords = (
        source: any, 
        latPath?: string, 
        lngPath?: string
      ): { latitude: number; longitude: number } | null => {
        // Case 1: Explicit paths provided
        if (latPath && lngPath) {
          this.logger.debug(`Getting coords from paths: latPath=${latPath}, lngPath=${lngPath}`);
          this.logger.debug(`Context data keys: ${Object.keys(context.data || {})}`);
          // Debug: log the intermediate values
          const pathParts = latPath.split('.');
          this.logger.debug(`Path parts: ${JSON.stringify(pathParts)}`);
          let current = context.data;
          for (const part of pathParts) {
            current = current?.[part];
            this.logger.debug(`After ${part}: ${JSON.stringify(current)?.slice(0, 100)}`);
          }
          const lat = this.getValueByPath(context.data, latPath);
          const lng = this.getValueByPath(context.data, lngPath);
          this.logger.debug(`Got lat=${lat}, lng=${lng} from paths`);
          if (lat && lng) return { latitude: parseFloat(lat), longitude: parseFloat(lng) };
        }

        // Case 2: Source is a context key (string)
        if (typeof source === 'string') {
          const data = context.data[source];
          if (!data) return null;
          return {
            latitude: parseFloat(data.latitude || data.lat),
            longitude: parseFloat(data.longitude || data.lng)
          };
        }

        // Case 3: Source is an object
        if (source && typeof source === 'object') {
          return {
            latitude: parseFloat(source.latitude || source.lat),
            longitude: parseFloat(source.longitude || source.lng)
          };
        }

        return null;
      };

      const fromCoords = getCoords(from, fromLatPath, fromLngPath);
      const toCoords = getCoords(to, toLatPath, toLngPath);

      if (!fromCoords || !toCoords) {
        this.logger.error(`Missing coordinates. From: ${JSON.stringify(fromCoords)}, To: ${JSON.stringify(toCoords)}`);
        return {
          success: false,
          error: 'Missing coordinates for distance calculation',
        };
      }

      // Validate coordinates
      if (isNaN(fromCoords.latitude) || isNaN(fromCoords.longitude) || 
          isNaN(toCoords.latitude) || isNaN(toCoords.longitude)) {
         return {
          success: false,
          error: 'Invalid coordinate values (NaN)',
        };
      }

      this.logger.debug(
        `Calculating distance: (${fromCoords.latitude}, ${fromCoords.longitude}) → (${toCoords.latitude}, ${toCoords.longitude})`
      );

      const distance = await this.phpParcelService.calculateDistance(
        fromCoords.latitude,
        fromCoords.longitude,
        toCoords.latitude,
        toCoords.longitude
      );

      this.logger.debug(`Distance calculated: ${distance} km`);

      return {
        success: true,
        output: distance,
        event: 'calculated',
      };
    } catch (error) {
      this.logger.error(`Distance calculation failed: ${error.message}`, error.stack);
      
      // Fallback to approximate distance
      return {
        success: true,
        output: 5.0, // Fallback distance
        event: 'calculated',
      };
    }
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  validate(config: Record<string, any>): boolean {
    return !!((config.from && config.to) || (config.fromLatPath && config.toLatPath));
  }
}
