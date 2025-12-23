import { Injectable, Logger } from '@nestjs/common';
import { PhpOrderService } from '../../php-integration/services/php-order.service';
import { SessionService } from '../../session/session.service';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

/**
 * Order Executor
 * 
 * Creates orders in PHP backend
 */
@Injectable()
export class OrderExecutor implements ActionExecutor {
  readonly name = 'order';
  private readonly logger = new Logger(OrderExecutor.name);

  constructor(
    private readonly phpOrderService: PhpOrderService,
    private readonly sessionService: SessionService,
  ) {}

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const orderType = config.type as 'food' | 'parcel' | 'ecommerce' || 'food';

      // Get session for auth token
      const session = await this.sessionService.getSession(context._system.sessionId);
      const authToken = session?.data?.auth_token;

      if (!authToken) {
        return {
          success: false,
          error: 'Authentication required to place order',
        };
      }

      let result: any;

      if (orderType === 'parcel') {
        result = await this.createParcelOrder(config, context, authToken);
      } else if (orderType === 'food') {
        result = await this.createFoodOrder(config, context, authToken);
      } else {
        result = await this.createEcommerceOrder(config, context, authToken);
      }

      if (result.success) {
        this.logger.log(`✅ Order created: ${result.orderId}`);

        return {
          success: true,
          output: result,
          event: 'success',
        };
      } else {
        this.logger.error(`Order creation failed: ${result.message}`);

        return {
          success: false,
          error: result.message,
        };
      }
    } catch (error) {
      this.logger.error(`Order executor failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async createParcelOrder(
    config: any,
    context: FlowContext,
    authToken: string
  ): Promise<any> {
    // Resolve paths if provided, otherwise fallback to direct config or default context keys
    const resolve = (path: string, defaultKey: string) => {
      if (!path) return context.data[defaultKey];
      return path.split('.').reduce((o, i) => o?.[i], context.data);
    };

    const pickupAddress = resolve(config.pickupAddressPath, 'sender_address') || config.pickup_address;
    const deliveryAddress = resolve(config.deliveryAddressPath, 'receiver_address') || config.delivery_address;
    const recipientDetails = resolve(config.recipientPath, 'recipient_details');
    const distance = resolve(config.distancePath, 'distance') || config.distance;
    const pricing = resolve(config.pricingPath, 'pricing');
    const parcelDetails = resolve(config.detailsPath, 'parcel_details');
    
    const parcelCategoryId = config.parcel_category_id || context.data.parcel_category_id || 5;
    const paymentMethod = config.payment_method || context.data.payment_method || 'cash_on_delivery';

    // Map recipient details if available
    const receiverName = recipientDetails?.name || deliveryAddress?.contact_person_name;
    const receiverPhone = recipientDetails?.phone || deliveryAddress?.contact_person_number;

    return this.phpOrderService.createOrder(authToken, {
      pickupAddress: {
        address: pickupAddress.address || pickupAddress.formatted,
        latitude: pickupAddress.lat || pickupAddress.latitude,
        longitude: pickupAddress.lng || pickupAddress.longitude,
        landmark: pickupAddress.landmark || '',
      },
      deliveryAddress: {
        address: deliveryAddress.address || deliveryAddress.formatted,
        latitude: deliveryAddress.lat || deliveryAddress.latitude,
        longitude: deliveryAddress.lng || deliveryAddress.longitude,
        landmark: deliveryAddress.landmark || '',
      },
      receiverName,
      receiverPhone,
      paymentMethod,
      orderNote: config.order_note || context.data.order_note || `Weight: ${parcelDetails?.weight}kg, Size: ${parcelDetails?.size}`,
      distance,
      parcelCategoryId,
      senderZoneId: 4, // Default to Nashik
      deliveryZoneId: 4,
    });
  }

  private async createFoodOrder(
    config: any,
    context: FlowContext,
    authToken: string
  ): Promise<any> {
    const items = config.items || context.data.selected_items;
    const deliveryAddress = config.delivery_address || context.data.delivery_address;
    const paymentMethod = config.payment_method || context.data.payment_method || 'cash_on_delivery';
    const orderNote = config.order_note || context.data.order_note;

    if (!items || items.length === 0) {
      return {
        success: false,
        message: 'No items selected for order',
      };
    }

    if (!deliveryAddress) {
      return {
        success: false,
        message: 'Delivery address is required',
      };
    }

    return this.phpOrderService.createFoodOrder(authToken, {
      items,
      deliveryAddress: {
        address: deliveryAddress.address,
        latitude: deliveryAddress.lat || deliveryAddress.latitude,
        longitude: deliveryAddress.lng || deliveryAddress.longitude,
        contact_person_name: deliveryAddress.contact_person_name || context.data.user_name,
        contact_person_number: deliveryAddress.contact_person_number || context.data.user_phone,
      },
      paymentMethod,
      orderNote,
    });
  }

  private async createEcommerceOrder(
    config: any,
    context: FlowContext,
    authToken: string
  ): Promise<any> {
    const items = config.items || context.data.selected_items || context.data.cart_items;
    const deliveryAddress = config.delivery_address || context.data.delivery_address;
    const paymentMethod = config.payment_method || context.data.payment_method || 'cash_on_delivery';
    const orderNote = config.order_note || context.data.order_note;

    if (!items || items.length === 0) {
      return {
        success: false,
        message: 'No items selected for order',
      };
    }

    if (!deliveryAddress) {
      return {
        success: false,
        message: 'Delivery address is required',
      };
    }

    this.logger.log(`🛒 Creating e-commerce order with ${items.length} items`);

    // E-commerce orders use the same food order flow but with module_id for ecommerce
    // The PHP backend handles both through the same cart/order endpoints
    return this.phpOrderService.createFoodOrder(authToken, {
      items: items.map((item: any) => ({
        item_id: item.item_id || item.id,
        quantity: item.quantity || 1,
        store_id: item.store_id,
        variant: item.variant || [],
        addon_ids: item.addon_ids || [],
        addon_quantities: item.addon_quantities || [],
      })),
      deliveryAddress: {
        address: deliveryAddress.address,
        latitude: deliveryAddress.lat || deliveryAddress.latitude,
        longitude: deliveryAddress.lng || deliveryAddress.longitude,
        contact_person_name: deliveryAddress.contact_person_name || context.data.user_name,
        contact_person_number: deliveryAddress.contact_person_number || context.data.user_phone,
      },
      paymentMethod,
      orderNote: orderNote || 'E-commerce order',
      moduleId: 1, // Module ID 1 = E-commerce/Grocery
    });
  }

  validate(config: Record<string, any>): boolean {
    return !!config.type;
  }
}
