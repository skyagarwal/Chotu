import { Controller, Get, Put, Body, Logger } from '@nestjs/common';
import { OSRMService } from '../services/osrm.service';

/**
 * Routing Configuration Controller
 * 
 * Allows frontend to configure routing and delivery time settings
 */
@Controller('routing/config')
export class RoutingConfigController {
  private readonly logger = new Logger(RoutingConfigController.name);

  constructor(private readonly osrmService: OSRMService) {}

  /**
   * Get current delivery time buffer configuration
   */
  @Get('buffer')
  getDeliveryTimeBuffer() {
    const bufferPercent = this.osrmService.getDeliveryTimeBuffer();
    
    return {
      success: true,
      data: {
        bufferPercent,
        description: `${bufferPercent}% buffer added to store preparation times`,
        example: {
          storeTime: '20-30 min',
          withBuffer: `${Math.round(25 * (1 + bufferPercent/100))} min average`,
          formula: 'total_time = travel_time + avg(store_prep_time) * (1 + buffer/100)'
        }
      }
    };
  }

  /**
   * Update delivery time buffer percentage
   * 
   * @param body.bufferPercent - New buffer percentage (0-100)
   */
  @Put('buffer')
  updateDeliveryTimeBuffer(
    @Body() body: { bufferPercent: number }
  ) {
    try {
      const { bufferPercent } = body;

      if (bufferPercent === undefined || bufferPercent === null) {
        return {
          success: false,
          error: 'bufferPercent is required'
        };
      }

      if (bufferPercent < 0 || bufferPercent > 100) {
        return {
          success: false,
          error: 'bufferPercent must be between 0 and 100'
        };
      }

      this.osrmService.setDeliveryTimeBuffer(bufferPercent);

      this.logger.log(`✅ Delivery time buffer updated to ${bufferPercent}%`);

      return {
        success: true,
        message: `Delivery time buffer updated to ${bufferPercent}%`,
        data: {
          previousBuffer: this.osrmService.getDeliveryTimeBuffer(),
          newBuffer: bufferPercent,
          example: {
            storeTime: '20-30 min',
            avgPrepTime: 25,
            withBuffer: `${Math.round(25 * (1 + bufferPercent/100))} min`,
            travelTime: '3 min (OSRM)',
            totalEstimate: `${Math.round(3 + 25 * (1 + bufferPercent/100))} min`
          }
        }
      };
    } catch (error) {
      this.logger.error(`Failed to update buffer: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get routing service health and configuration
   */
  @Get('status')
  async getStatus() {
    return {
      success: true,
      data: {
        osrm: {
          status: 'active',
          url: 'http://localhost:5000',
          dataset: 'India OSM data'
        },
        deliveryTimeBuffer: {
          current: this.osrmService.getDeliveryTimeBuffer(),
          unit: 'percent',
          description: 'Buffer added on top of store preparation time'
        },
        calculation: {
          formula: 'total_delivery_time = travel_time + avg(store_prep_time) * (1 + buffer/100)',
          components: {
            travel_time: 'OSRM actual road distance calculation',
            store_prep_time: 'From MySQL stores.delivery_time field',
            buffer: 'Configurable safety margin (default 10%)'
          }
        }
      }
    };
  }
}
