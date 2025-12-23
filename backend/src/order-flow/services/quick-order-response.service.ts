import { Injectable, Logger } from '@nestjs/common';
import { OrderDatabaseService } from '../../php-integration/services/order-database.service';
import { PhpOrderService } from '../../php-integration/services/php-order.service';

/**
 * Quick Order Response Service
 * 
 * Provides ultra-fast order status responses for:
 * - Voice calls (Exotel IVR)
 * - WhatsApp quick replies
 * - SMS auto-responses
 * 
 * Data Sources (in order of preference):
 * 1. Redis Cache (< 50ms) - populated by webhooks
 * 2. Direct MySQL (< 200ms) - read-only fallback
 * 3. PHP API (< 500ms) - last resort
 */
@Injectable()
export class QuickOrderResponseService {
  private readonly logger = new Logger(QuickOrderResponseService.name);

  constructor(
    private readonly orderDbService: OrderDatabaseService,
    private readonly phpOrderService: PhpOrderService,
  ) {}

  /**
   * Get quick order status response (optimized for voice/IVR)
   * Returns within 100ms from cache, 500ms worst case
   */
  async getQuickOrderStatus(orderId: number): Promise<{
    success: boolean;
    spokenResponse: string;
    textResponse: string;
    status?: string;
    eta?: number;
    deliveryManName?: string;
    deliveryManPhone?: string;
  }> {
    const startTime = Date.now();

    try {
      // Try fast cache first
      const cached = await this.orderDbService.getOrderStatus(orderId);
      
      if (cached) {
        const response = this.formatResponse(cached);
        this.logger.log(`✅ Quick response for order #${orderId} in ${Date.now() - startTime}ms (cached)`);
        return response;
      }

      // Fallback to PHP API
      const apiResult = await this.phpOrderService.trackOrder(orderId);
      if (apiResult.success && apiResult.status) {
        const response = this.formatResponse({
          orderId,
          status: apiResult.status,
          updatedAt: new Date(),
        });
        this.logger.log(`✅ Quick response for order #${orderId} in ${Date.now() - startTime}ms (API)`);
        return response;
      }

      return {
        success: false,
        spokenResponse: `Sorry, I couldn't find order number ${orderId}. Please check the order ID and try again.`,
        textResponse: `❌ Order #${orderId} not found. Please verify the order ID.`,
      };

    } catch (error) {
      this.logger.error(`Failed to get quick order status: ${error.message}`);
      return {
        success: false,
        spokenResponse: `Sorry, I'm having trouble checking your order right now. Please try again in a moment.`,
        textResponse: `⚠️ Unable to check order status. Please try again later.`,
      };
    }
  }

  /**
   * Get quick order status by phone (for voice calls without order ID)
   */
  async getQuickOrderByPhone(phone: string): Promise<{
    success: boolean;
    spokenResponse: string;
    textResponse: string;
    orderId?: number;
    status?: string;
  }> {
    const startTime = Date.now();

    try {
      // Get latest order for this phone
      const order = await this.orderDbService.getLatestOrderByPhone(phone);

      if (order) {
        const response = this.formatResponse(order);
        this.logger.log(`✅ Quick response for phone ${phone} (order #${order.orderId}) in ${Date.now() - startTime}ms`);
        return {
          ...response,
          orderId: order.orderId,
        };
      }

      return {
        success: false,
        spokenResponse: `I couldn't find any recent orders for your phone number. Would you like to place a new order?`,
        textResponse: `No recent orders found for this number. Would you like to place a new order?`,
      };

    } catch (error) {
      this.logger.error(`Failed to get order by phone: ${error.message}`);
      return {
        success: false,
        spokenResponse: `Sorry, I'm having trouble looking up your order. Please try again.`,
        textResponse: `⚠️ Unable to find your order. Please try again later.`,
      };
    }
  }

  /**
   * Get all active orders for phone (for IVR menu)
   */
  async getActiveOrdersForPhone(phone: string): Promise<{
    success: boolean;
    spokenResponse: string;
    textResponse: string;
    orders: Array<{ orderId: number; status: string; storeName?: string }>;
  }> {
    try {
      const orders = await this.orderDbService.getActiveOrdersByPhone(phone);

      if (orders.length === 0) {
        return {
          success: true,
          spokenResponse: `You don't have any active orders right now.`,
          textResponse: `No active orders found.`,
          orders: [],
        };
      }

      if (orders.length === 1) {
        const order = orders[0];
        return {
          success: true,
          spokenResponse: this.getSpokenStatus(order.status, order.storeName, order.deliveryManName),
          textResponse: this.getTextStatus(order),
          orders: [{ orderId: order.orderId, status: order.status, storeName: order.storeName }],
        };
      }

      // Multiple orders
      const orderList = orders.map((o, i) => 
        `Order ${i + 1} from ${o.storeName || 'restaurant'} is ${this.getStatusWord(o.status)}`
      ).join('. ');

      return {
        success: true,
        spokenResponse: `You have ${orders.length} active orders. ${orderList}. Say an order number to hear more details.`,
        textResponse: orders.map(o => 
          `🔹 Order #${o.orderId} from ${o.storeName}: ${this.phpOrderService.getOrderStatusEmoji(o.status)} ${o.status}`
        ).join('\n'),
        orders: orders.map(o => ({ orderId: o.orderId, status: o.status, storeName: o.storeName })),
      };

    } catch (error) {
      this.logger.error(`Failed to get active orders: ${error.message}`);
      return {
        success: false,
        spokenResponse: `Sorry, I couldn't check your orders right now.`,
        textResponse: `⚠️ Unable to retrieve active orders.`,
        orders: [],
      };
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private formatResponse(order: any): {
    success: boolean;
    spokenResponse: string;
    textResponse: string;
    status: string;
    eta?: number;
    deliveryManName?: string;
    deliveryManPhone?: string;
  } {
    return {
      success: true,
      spokenResponse: this.getSpokenStatus(order.status, order.storeName, order.deliveryManName),
      textResponse: this.getTextStatus(order),
      status: order.status,
      eta: order.eta,
      deliveryManName: order.deliveryManName,
      deliveryManPhone: order.deliveryManPhone,
    };
  }

  private getSpokenStatus(status: string, storeName?: string, deliveryManName?: string): string {
    const store = storeName || 'the restaurant';
    const dm = deliveryManName || 'your delivery partner';

    const responses: Record<string, string> = {
      pending: `Your order is pending. ${store} will confirm it shortly.`,
      confirmed: `Great news! ${store} has confirmed your order and will start preparing it soon.`,
      processing: `${store} is preparing your order right now. It should be ready soon!`,
      handover: `Your order is ready and waiting for pickup. ${dm} will collect it shortly.`,
      picked_up: `${dm} has picked up your order and is on the way to you!`,
      delivered: `Your order has been delivered. We hope you enjoy it!`,
      canceled: `This order has been canceled.`,
      refunded: `A refund has been processed for this order.`,
      failed: `Unfortunately, this order could not be processed.`,
    };

    return responses[status] || `Your order status is ${status}.`;
  }

  private getTextStatus(order: any): string {
    const emoji = this.phpOrderService.getOrderStatusEmoji(order.status);
    const statusMsg = this.orderDbService.getStatusMessage(order.status, order.storeName, order.deliveryManName);
    
    let text = `${emoji} Order #${order.orderId}: ${statusMsg}`;
    
    if (order.totalAmount) {
      text += `\n💰 Total: ₹${order.totalAmount}`;
    }
    
    if (order.deliveryManName && ['handover', 'picked_up'].includes(order.status)) {
      text += `\n🚴 ${order.deliveryManName}`;
      if (order.deliveryManPhone) {
        text += ` - ${order.deliveryManPhone}`;
      }
    }
    
    return text;
  }

  private getStatusWord(status: string): string {
    const words: Record<string, string> = {
      pending: 'pending confirmation',
      confirmed: 'confirmed',
      processing: 'being prepared',
      handover: 'ready for pickup',
      picked_up: 'on the way',
      delivered: 'delivered',
      canceled: 'canceled',
    };
    return words[status] || status;
  }
}
