import { Injectable, Logger } from '@nestjs/common';
import { PhpParcelService } from '../../php-integration/services/parcel.service';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

/**
 * Parcel Executor
 * 
 * Handles parcel-specific logic:
 * - Fetching vehicle categories
 * - Calculating shipping charges
 */
@Injectable()
export class ParcelExecutor implements ActionExecutor {
  readonly name = 'parcel';
  private readonly logger = new Logger(ParcelExecutor.name);

  constructor(
    private readonly phpParcelService: PhpParcelService,
  ) {}

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const action = config.action || 'get_categories';

      if (action === 'get_categories') {
        return this.getVehicleCategories(config, context);
      } else if (action === 'calculate_shipping') {
        return this.calculateShipping(config, context);
      } else {
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
      }
    } catch (error) {
      this.logger.error(`Parcel executor failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async getVehicleCategories(
    config: any,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      // 1. Get pickup location to determine zone
      const pickupAddress = this.resolve(context, config.pickupAddressPath, 'sender_address') || config.pickup_address;
      
      if (!pickupAddress || !pickupAddress.lat || !pickupAddress.lng) {
        // Fallback to default if no address (should not happen in flow)
        this.logger.warn('No pickup address found, using default zone');
      }

      let zoneId = config.zoneId;
      let moduleId = config.moduleId;

      // If we have coordinates, get the real zone
      if (!zoneId && pickupAddress?.lat && pickupAddress?.lng) {
        try {
          const zoneInfo = await this.phpParcelService.getZoneByLocation(
            pickupAddress.lat,
            pickupAddress.lng
          );
          zoneId = zoneInfo.primaryZoneId;
          moduleId = zoneInfo.primaryModuleId;
          
          // Store zone info in context for later use
          context.data.zone_id = zoneId;
          context.data.module_id = moduleId;
          context.data.zone_ids = zoneInfo.zoneIds;
        } catch (e) {
          this.logger.warn(`Failed to get zone from location: ${e.message}`);
          // Fallback to defaults or error?
          // For now, let's try to proceed if we can, or fail.
        }
      }

      // 2. Fetch categories
      const categories = await this.phpParcelService.getParcelCategories(moduleId, zoneId);
      this.logger.log(`📦 Fetched ${categories.length} categories for module ${moduleId}, zone ${zoneId}`);

      // 3. Format as ProductCards
      const cards = categories.map(cat => ({
        id: cat.id.toString(),
        name: cat.name,
        description: cat.description || `Base fare: ₹${cat.parcel_per_km_shipping_charge}/km`,
        image: cat.image_full_url || cat.image, // Ensure full URL
        price: `₹${cat.parcel_minimum_shipping_charge} min`,
        action: {
          label: 'Select',
          value: cat.id.toString(), // The value sent when clicked
        },
        // Add metadata for calculation
        metadata: {
            per_km_charge: cat.parcel_per_km_shipping_charge,
            minimum_charge: cat.parcel_minimum_shipping_charge,
        }
      }));

      this.logger.log(`Generated ${cards.length} cards. First card image: ${cards[0]?.image}`);

      return {
        success: true,
        output: cards, // Return the list of cards
        event: 'categories_fetched',
      };
    } catch (error) {
      this.logger.error(`Failed to get vehicle categories: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async calculateShipping(
    config: any,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const distance = this.resolve(context, config.distancePath, 'distance');
      const categoryId = this.resolve(context, config.categoryPath, 'parcel_category_id');
      const zoneIds = context.data.zone_ids || [context.data.zone_id || 4]; // Default to Nashik if missing

      if (!distance || !categoryId) {
        return {
          success: false,
          error: 'Distance and Category ID are required for shipping calculation',
        };
      }

      const pricing = await this.phpParcelService.calculateShippingCharge(
        distance,
        categoryId,
        zoneIds
      );

      return {
        success: true,
        output: pricing,
        event: 'shipping_calculated',
      };
    } catch (error) {
      this.logger.error(`Failed to calculate shipping: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private resolve(context: FlowContext, path: string, defaultKey: string): any {
    if (!path) return context.data[defaultKey];
    return path.split('.').reduce((o, i) => o?.[i], context.data);
  }

  validate(config: Record<string, any>): boolean {
    return !!config.action;
  }
}
