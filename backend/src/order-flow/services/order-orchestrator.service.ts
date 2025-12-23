import { Injectable, Logger } from '@nestjs/common';
import { Address, Order } from '../../common/interfaces/common.interface';
import { OrderFlowState, OrderStep } from '../interfaces/order-flow.interface';
import { PhpOrderService } from '../../php-integration/services/php-order.service';
import { AddressService } from './address.service';
import { OrderHistoryService } from './order-history.service';
import { PaymentService } from './payment.service';
import { formatPrice } from '../../common/utils/helpers';

/**
 * Order Orchestrator Service
 * Main controller for the entire order flow
 * Manages state transitions and coordinates all order-related services
 */
@Injectable()
export class OrderOrchestratorService {
  private readonly logger = new Logger(OrderOrchestratorService.name);

  constructor(
    private readonly phpOrderService: PhpOrderService,
    private readonly addressService: AddressService,
    private readonly orderHistoryService: OrderHistoryService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Create a new order
   */
  async createOrder(
    token: string,
    orderData: {
      pickupAddress: Address;
      deliveryAddress: Address;
      pickupLandmark?: string;
      deliveryLandmark?: string;
      receiverName?: string;
      receiverPhone?: string;
      paymentMethod: string;
      orderNote?: string;
      distance?: number;
      vehicleId?: number;
    },
  ): Promise<{
    success: boolean;
    orderId?: number;
    order?: Order;
    message?: string;
  }> {
    try {
      this.logger.log('🚀 Creating new order');

      const result = await this.phpOrderService.createOrder(token, orderData);

      if (!result.success || !result.orderId) {
        return {
          success: false,
          message: result.message || 'Failed to create order',
        };
      }

      // Fetch full order details
      const order = await this.phpOrderService.getOrderDetails(token, result.orderId);

      return {
        success: true,
        orderId: result.orderId,
        order: order || undefined,
      };
    } catch (error) {
      this.logger.error(`Error creating order: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Format order confirmation message
   */
  formatOrderConfirmation(order: Order, paymentLink?: string): string {
    const emoji = this.phpOrderService.getOrderStatusEmoji(order.orderStatus || '');
    const status = this.phpOrderService.formatOrderStatus(order.orderStatus || '');
    
    let text = '🎉 **Order Confirmed!**\n\n';
    text += `📦 Order ID: #${order.id}\n`;
    text += `${emoji} Status: ${status}\n`;
    text += `💰 Total Amount: ${formatPrice(order.orderAmount)}\n`;
    text += `🚚 Delivery Charge: ${formatPrice(order.deliveryCharge)}\n`;
    
    const paymentEmoji = order.paymentMethod 
      ? this.paymentService['phpPaymentService'].getPaymentMethodEmoji(order.paymentMethod)
      : '💳';
    text += `${paymentEmoji} Payment: ${order.paymentMethod}\n\n`;
    
    // Pickup info
    if (order.pickupAddress) {
      const pickup = order.pickupAddress as any;
      text += '📤 **Pickup From**\n';
      if (pickup.address) {
        text += `   ${pickup.address}\n`;
      }
      if (pickup.landmark) {
        text += `   🏷️ ${pickup.landmark}\n`;
      }
      text += '\n';
    }
    
    // Delivery info
    if (order.deliveryAddress) {
      const delivery = order.deliveryAddress as any;
      text += '📍 **Deliver To**\n';
      if (delivery.address) {
        text += `   ${delivery.address}\n`;
      }
      if (delivery.landmark) {
        text += `   🏷️ ${delivery.landmark}\n`;
      }
      if (delivery.contact_person_name) {
        text += `   👤 ${delivery.contact_person_name}`;
        if (delivery.contact_person_number) {
          text += ` (${delivery.contact_person_number})`;
        }
        text += '\n';
      }
      text += '\n';
    }
    
    // Payment link if digital payment
    if (paymentLink && order.paymentMethod === 'digital_payment') {
      text += '💳 **Complete Payment**\n';
      text += `🔗 ${paymentLink}\n\n`;
    }
    
    text += '📱 You will receive updates about your delivery.\n';
    text += '💡 Type "track" to track your order anytime!';
    
    return text;
  }

  /**
   * Track order
   */
  async trackOrder(orderId: number): Promise<{
    success: boolean;
    formattedText?: string;
    message?: string;
  }> {
    try {
      const result = await this.phpOrderService.trackOrder(orderId);

      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Failed to track order',
        };
      }

      const emoji = this.phpOrderService.getOrderStatusEmoji(result.status || '');
      const status = this.phpOrderService.formatOrderStatus(result.status || '');
      
      let text = `📦 **Order #${orderId} Tracking**\n\n`;
      text += `${emoji} Status: **${status}**\n\n`;
      
      // Add status-specific messages
      switch (result.status) {
        case 'pending':
          text += '⏳ Your order is being processed...';
          break;
        case 'confirmed':
          text += '✅ Your order has been confirmed!\n';
          text += '🚚 Waiting for delivery person assignment...';
          break;
        case 'processing':
          text += '📦 Your order is being prepared...';
          break;
        case 'picked_up':
          text += '🚚 Your parcel has been picked up!\n';
          text += '📍 On the way to delivery location...';
          if (result.location) {
            text += `\n🗺️ Current Location: ${result.location.latitude}, ${result.location.longitude}`;
          }
          break;
        case 'handover':
          text += '🤝 Parcel is ready for handover!';
          break;
        case 'delivered':
          text += '✅ Your parcel has been delivered!\n';
          text += '🎉 Thank you for using our service!';
          break;
        case 'canceled':
          text += '❌ This order has been canceled.';
          break;
        default:
          text += 'Order is being processed.';
      }
      
      text += '\n\n💡 Type "track" again for latest updates';
      
      return {
        success: true,
        formattedText: text,
      };
    } catch (error) {
      this.logger.error(`Error tracking order: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    token: string,
    orderId: number,
    reason?: string,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    return this.phpOrderService.cancelOrder(token, orderId, reason);
  }

  /**
   * Validate order flow state
   */
  validateOrderState(state: OrderFlowState): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!state.pickupAddress) {
      errors.push('Pickup address is required');
    }

    if (!state.deliveryAddress) {
      errors.push('Delivery address is required');
    }

    if (!state.paymentMethod) {
      errors.push('Payment method is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get order summary for confirmation
   */
  getOrderSummary(state: OrderFlowState): string {
    let text = '📋 **Order Summary**\n\n';
    
    // Pickup
    text += '📤 **Pickup Location**\n';
    if (state.pickupAddress) {
      text += `   ${this.addressService['phpAddressService'].formatAddress(state.pickupAddress)}\n`;
      if (state.pickupLandmark) {
        text += `   🏷️ ${state.pickupLandmark}\n`;
      }
    }
    text += '\n';
    
    // Delivery
    text += '📍 **Delivery Location**\n';
    if (state.deliveryAddress) {
      text += `   ${this.addressService['phpAddressService'].formatAddress(state.deliveryAddress)}\n`;
      if (state.deliveryLandmark) {
        text += `   🏷️ ${state.deliveryLandmark}\n`;
      }
    }
    
    if (state.receiverName) {
      text += `   👤 ${state.receiverName}`;
      if (state.receiverPhone) {
        text += ` (${state.receiverPhone})`;
      }
      text += '\n';
    }
    text += '\n';
    
    // Payment
    if (state.paymentMethod) {
      const emoji = this.paymentService['phpPaymentService'].getPaymentMethodEmoji(state.paymentMethod);
      const methodName = this.paymentService['phpPaymentService'].formatPaymentMethod(state.paymentMethod);
      text += `${emoji} Payment: ${methodName}\n\n`;
    }
    
    text += '✅ Type "confirm" to place order\n';
    text += '❌ Type "cancel" to start over';
    
    return text;
  }

  /**
   * Calculate estimated delivery charge
   */
  calculateDeliveryCharge(distance: number): number {
    // Base charge + per km charge
    const baseCharge = 30;
    const perKmCharge = 10;
    
    return baseCharge + (distance * perKmCharge);
  }
}
