import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

/**
 * Pricing Executor
 * 
 * Calculates pricing for orders/deliveries
 */
@Injectable()
export class PricingExecutor implements ActionExecutor {
  readonly name = 'pricing';
  private readonly logger = new Logger(PricingExecutor.name);

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const type = config.type as 'food' | 'parcel' | 'ecommerce' || 'food';

      let output: any;

      if (type === 'food') {
        output = this.calculateFoodPricing(config, context);
      } else if (type === 'parcel') {
        output = this.calculateParcelPricing(config, context);
      } else {
        output = this.calculateEcommercePricing(config, context);
      }

      this.logger.debug(`Pricing calculated: ₹${output.total}`);

      return {
        success: true,
        output,
        event: 'calculated',
      };
    } catch (error) {
      this.logger.error(`Pricing calculation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private calculateFoodPricing(config: any, context: FlowContext): any {
    const items = config.items || context.data.selected_items || [];
    const distance = config.distance || context.data.distance || 0;
    const deliveryFeePerKm = config.delivery_fee_per_km || 10;

    const itemsTotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price * (item.quantity || 1));
    }, 0);

    const deliveryFee = Math.max(distance * deliveryFeePerKm, 30); // Min ₹30
    const subtotal = itemsTotal + deliveryFee;
    const tax = Math.ceil(subtotal * 0.05); // 5% GST
    const total = subtotal + tax;

    return {
      items_total: itemsTotal,
      delivery_fee: deliveryFee,
      subtotal,
      tax,
      total,
      breakdown: {
        items: itemsTotal,
        delivery: deliveryFee,
        tax,
      },
    };
  }

  private calculateParcelPricing(config: any, context: FlowContext): any {
    const distance = config.distance || context.data.distance || 0;
    const perKmCharge = config.per_km_charge || context.data.per_km_charge || 11.11;
    const minimumCharge = config.minimum_charge || context.data.minimum_charge || 44;

    const distanceCharge = Math.ceil(distance * perKmCharge);
    const subtotal = Math.max(minimumCharge, distanceCharge);
    const tax = Math.ceil(subtotal * 0.18); // 18% GST
    const total = subtotal + tax;

    return {
      distance,
      per_km_charge: perKmCharge,
      minimum_charge: minimumCharge,
      subtotal,
      tax,
      total,
    };
  }

  private calculateEcommercePricing(config: any, context: FlowContext): any {
    const items = config.items || context.data.cart_items || [];
    
    const itemsTotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price * (item.quantity || 1));
    }, 0);

    const shippingFee = itemsTotal > 500 ? 0 : 40; // Free shipping over ₹500
    const subtotal = itemsTotal + shippingFee;
    const tax = Math.ceil(subtotal * 0.18); // 18% GST
    const total = subtotal + tax;

    return {
      items_total: itemsTotal,
      shipping_fee: shippingFee,
      subtotal,
      tax,
      total,
    };
  }
}
