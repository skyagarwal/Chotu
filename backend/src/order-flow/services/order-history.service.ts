import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../../common/interfaces/common.interface';
import { PhpOrderService } from '../../php-integration/services/php-order.service';
import { formatPrice } from '../../common/utils/helpers';

/**
 * Order History Service
 * Handles fetching, displaying, and repeating orders
 */
@Injectable()
export class OrderHistoryService {
  private readonly logger = new Logger(OrderHistoryService.name);

  constructor(private readonly phpOrderService: PhpOrderService) {}

  /**
   * Get formatted order history for display
   */
  async getFormattedOrderHistory(token: string, limit: number = 5): Promise<{
    success: boolean;
    orders?: Order[];
    formattedText?: string;
    message?: string;
  }> {
    try {
      const orders = await this.phpOrderService.getOrders(token, limit);

      if (orders.length === 0) {
        return {
          success: true,
          orders: [],
          formattedText: '📦 You have no previous orders yet.\n\n🚀 Place your first order now!',
        };
      }

      // Format orders for display
      let text = '📦 **Your Recent Orders**\n\n';
      
      orders.slice(0, 5).forEach((order, index) => {
        const emoji = this.phpOrderService.getOrderStatusEmoji(order.orderStatus || '');
        const status = this.phpOrderService.formatOrderStatus(order.orderStatus || '');
        
        text += `${index + 1}. ${emoji} Order #${order.id}\n`;
        text += `   Status: ${status}\n`;
        text += `   Amount: ${formatPrice(order.orderAmount)}\n`;
        
        if (order.createdAt) {
          text += `   Date: ${this.formatDate(order.createdAt)}\n`;
        }
        
        // Show delivery info
        if (order.deliveryAddress) {
          const deliveryAddr = order.deliveryAddress as any;
          if (deliveryAddr.address) {
            text += `   📍 To: ${deliveryAddr.address.substring(0, 40)}...\n`;
          }
        }
        
        text += '\n';
      });

      text += '💡 Reply with the number to:\n';
      text += '   • View details\n';
      text += '   • Repeat order\n';
      text += '   • Track delivery';

      return {
        success: true,
        orders,
        formattedText: text,
      };
    } catch (error) {
      this.logger.error(`Error fetching order history: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch order history',
      };
    }
  }

  /**
   * Get detailed order information
   */
  async getOrderDetails(token: string, orderId: number): Promise<{
    success: boolean;
    order?: Order;
    formattedText?: string;
    message?: string;
  }> {
    try {
      const order = await this.phpOrderService.getOrderDetails(token, orderId);

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
        };
      }

      // Format order details
      const emoji = this.phpOrderService.getOrderStatusEmoji(order.orderStatus || '');
      const status = this.phpOrderService.formatOrderStatus(order.orderStatus || '');
      
      let text = `📦 **Order #${order.id}**\n\n`;
      text += `${emoji} Status: **${status}**\n`;
      text += `💰 Amount: ${formatPrice(order.orderAmount)}\n`;
      text += `🚚 Delivery Charge: ${formatPrice(order.deliveryCharge)}\n`;
      text += `💳 Payment: ${order.paymentMethod}\n`;
      
      if (order.createdAt) {
        text += `📅 Date: ${this.formatDate(order.createdAt)}\n`;
      }
      
      text += '\n';
      
      // Pickup address
      if (order.pickupAddress) {
        const pickup = order.pickupAddress as any;
        text += '📤 **Pickup Location**\n';
        if (pickup.address) {
          text += `   ${pickup.address}\n`;
        }
        if (pickup.landmark) {
          text += `   🏷️ ${pickup.landmark}\n`;
        }
        text += '\n';
      }
      
      // Delivery address
      if (order.deliveryAddress) {
        const delivery = order.deliveryAddress as any;
        text += '📍 **Delivery Location**\n';
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
      }
      
      if (order.orderNote) {
        text += `\n📝 Note: ${order.orderNote}`;
      }

      text += '\n\n💡 Options:\n';
      text += '   🔄 Type "repeat" to reorder\n';
      text += '   📍 Type "track" to track this order\n';
      text += '   ❌ Type "cancel" to cancel order';

      return {
        success: true,
        order,
        formattedText: text,
      };
    } catch (error) {
      this.logger.error(`Error fetching order details: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch order details',
      };
    }
  }

  /**
   * Get running/active orders
   */
  async getRunningOrders(token: string): Promise<{
    success: boolean;
    orders?: Order[];
    formattedText?: string;
    message?: string;
  }> {
    try {
      const orders = await this.phpOrderService.getRunningOrders(token);

      if (orders.length === 0) {
        return {
          success: true,
          orders: [],
          formattedText: '✅ No active deliveries right now.',
        };
      }

      // Format running orders
      let text = '🚚 **Active Deliveries**\n\n';
      
      orders.forEach((order, index) => {
        const emoji = this.phpOrderService.getOrderStatusEmoji(order.orderStatus || '');
        const status = this.phpOrderService.formatOrderStatus(order.orderStatus || '');
        
        text += `${emoji} Order #${order.id}\n`;
        text += `   Status: ${status}\n`;
        text += `   Amount: ${formatPrice(order.orderAmount)}\n\n`;
      });

      text += '💡 Type order number to view details or track';

      return {
        success: true,
        orders,
        formattedText: text,
      };
    } catch (error) {
      this.logger.error(`Error fetching running orders: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch running orders',
      };
    }
  }

  /**
   * Create repeat order from previous order
   */
  createRepeatOrderData(order: Order): {
    pickupAddress: any;
    deliveryAddress: any;
    paymentMethod: string;
    orderNote?: string;
  } {
    return {
      pickupAddress: order.pickupAddress,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      orderNote: order.orderNote,
    };
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const orderDate = new Date(date);
    const diffMs = now.getTime() - orderDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today ' + orderDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return 'Yesterday ' + orderDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return orderDate.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    }
  }

  /**
   * Select order from list by index
   */
  selectOrderByIndex(orders: Order[], index: number): Order | null {
    if (index < 0 || index >= orders.length) {
      return null;
    }
    return orders[index];
  }
}
