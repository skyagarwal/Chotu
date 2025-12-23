import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorNotificationService } from '../services/vendor-notification.service';
import { OrderDatabaseService } from '../services/order-database.service';

/**
 * Order Status Types from PHP Backend
 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'handover'
  | 'picked_up'
  | 'delivered'
  | 'canceled'
  | 'refunded'
  | 'failed';

/**
 * Order Webhook Payload from PHP Backend
 */
export interface OrderWebhookPayload {
  event: 'order.created' | 'order.status_changed' | 'order.assigned' | 'order.payment';
  
  order: {
    id: number;
    order_id: string; // Display ID like #MNG-12345
    status: OrderStatus;
    previous_status?: OrderStatus;
    order_amount: number;
    delivery_charge: number;
    total_amount: number;
    payment_method: 'cod' | 'online' | 'wallet';
    payment_status: 'unpaid' | 'paid' | 'refunded';
    order_type: 'delivery' | 'pickup';
    scheduled_at?: string;
    created_at: string;
    updated_at: string;
  };
  
  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string;
  };
  
  vendor: {
    id: number;
    store_name: string;
    phone: string;
    email?: string;
    zone_wise_topic?: string;
  };
  
  delivery_man?: {
    id: number;
    name: string;
    phone: string;
  };
  
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  
  delivery_address?: {
    address: string;
    latitude?: number;
    longitude?: number;
    contact_person_name?: string;
    contact_person_number?: string;
  };
  
  // Processing time set by vendor (in minutes)
  processing_time?: number;
  
  timestamp: string;
}

/**
 * Order Webhook Controller
 * 
 * Receives webhooks from PHP backend when:
 * 1. New order is created (after payment)
 * 2. Order status changes
 * 3. Delivery man assigned/changed
 * 4. Payment status changes
 * 
 * Triggers notifications to:
 * - Vendors (new order, order confirmed by customer, etc.)
 * - Customers (order confirmed, preparing, out for delivery, delivered)
 * - Delivery men (new delivery assigned, order ready for pickup)
 */
@Controller('webhook/order')
export class OrderWebhookController {
  private readonly logger = new Logger(OrderWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly vendorNotificationService: VendorNotificationService,
    private readonly orderDatabaseService: OrderDatabaseService,
  ) {
    this.webhookSecret = this.configService.get<string>(
      'ORDER_WEBHOOK_SECRET',
      'mangwale_webhook_secret_2024'
    );
  }

  /**
   * Main webhook endpoint for order events
   * POST /webhook/order
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleOrderWebhook(
    @Body() payload: OrderWebhookPayload,
    @Headers('x-webhook-secret') secret: string,
  ): Promise<{ success: boolean; message: string }> {
    // Validate webhook secret
    if (secret !== this.webhookSecret) {
      this.logger.warn(`⚠️ Invalid webhook secret received`);
      throw new UnauthorizedException('Invalid webhook secret');
    }

    this.logger.log(
      `📨 Order webhook received: ${payload.event} for order #${payload.order.id}`
    );

    try {
      // 🔄 ALWAYS update order cache for real-time access
      await this.updateOrderCache(payload);

      switch (payload.event) {
        case 'order.created':
          await this.handleNewOrder(payload);
          break;
          
        case 'order.status_changed':
          await this.handleStatusChange(payload);
          break;
          
        case 'order.assigned':
          await this.handleDeliveryAssignment(payload);
          break;
          
        case 'order.payment':
          await this.handlePaymentUpdate(payload);
          break;
          
        default:
          this.logger.warn(`Unknown event type: ${payload.event}`);
      }

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      this.logger.error(`❌ Webhook processing failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Update order cache with webhook data (for fast lookups)
   */
  private async updateOrderCache(payload: OrderWebhookPayload): Promise<void> {
    try {
      await this.orderDatabaseService.updateCache(payload.order.id, {
        status: payload.order.status,
        storeName: payload.vendor?.store_name,
        totalAmount: payload.order.total_amount,
        paymentStatus: payload.order.payment_status,
        deliveryManId: payload.delivery_man?.id,
        deliveryManName: payload.delivery_man?.name,
        deliveryManPhone: payload.delivery_man?.phone,
        eta: payload.processing_time,
      });
    } catch (error) {
      this.logger.warn(`Failed to update order cache: ${error.message}`);
    }
  }

  /**
   * Handle new order creation
   * Triggered after payment is confirmed
   */
  private async handleNewOrder(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`🆕 New order #${payload.order.id} - notifying vendor`);

    // Safely handle items array
    const items = payload.items || [];
    
    // Prepare order notification payload
    const orderNotification = {
      orderId: payload.order.id,
      orderAmount: payload.order.total_amount,
      customerName: payload.customer?.name || 'Customer',
      customerPhone: payload.customer?.phone || '',
      itemsCount: items.length,
      itemsSummary: items.length > 0 
        ? items.map(i => `${i.quantity}x ${i.name}`).join(', ')
        : 'Order items',
      deliveryAddress: payload.delivery_address?.address,
      paymentMethod: payload.order.payment_method,
      scheduledAt: payload.order.scheduled_at,
      orderType: payload.order.order_type,
    };

    // Prepare vendor target
    const vendorTarget = {
      vendorId: payload.vendor.id,
      storeName: payload.vendor.store_name,
      vendorPhone: payload.vendor.phone,
      vendorEmail: payload.vendor.email,
      fcmTopics: payload.vendor.zone_wise_topic
        ? [payload.vendor.zone_wise_topic]
        : [],
    };

    // Send multi-channel notification
    const results = await this.vendorNotificationService.notifyVendorNewOrder(
      vendorTarget,
      orderNotification
    );

    this.logger.log(
      `✅ Vendor notification sent: ${JSON.stringify(results.map(r => ({
        channel: r.channel,
        success: r.success,
      })))}`
    );

    // TODO: Also notify customer that order is being processed
    await this.notifyCustomerOrderReceived(payload);
  }

  /**
   * Handle order status changes
   */
  private async handleStatusChange(payload: OrderWebhookPayload): Promise<void> {
    const { order, customer, vendor, delivery_man } = payload;
    
    this.logger.log(
      `🔄 Order #${order.id} status: ${order.previous_status} → ${order.status}`
    );

    // Notify based on new status
    switch (order.status) {
      case 'confirmed':
        // Vendor confirmed - notify customer
        await this.notifyCustomerOrderConfirmed(payload);
        break;
        
      case 'processing':
        // Vendor started preparing - notify customer with ETA
        await this.notifyCustomerOrderPreparing(payload);
        break;
        
      case 'handover':
        // Ready for pickup - notify delivery man
        if (delivery_man) {
          await this.notifyDeliveryManOrderReady(payload);
        }
        // Also notify customer
        await this.notifyCustomerOrderReady(payload);
        break;
        
      case 'picked_up':
        // Delivery man picked up - notify customer
        await this.notifyCustomerOrderPickedUp(payload);
        break;
        
      case 'delivered':
        // Order delivered - notify customer for feedback
        await this.notifyCustomerOrderDelivered(payload);
        break;
        
      case 'canceled':
        // Order canceled - notify all parties
        await this.notifyOrderCanceled(payload);
        break;
    }
  }

  /**
   * Handle delivery man assignment
   */
  private async handleDeliveryAssignment(payload: OrderWebhookPayload): Promise<void> {
    if (!payload.delivery_man) return;

    this.logger.log(
      `🚴 Order #${payload.order.id} assigned to ${payload.delivery_man.name}`
    );

    // Notify delivery man about new assignment
    await this.notifyDeliveryManNewAssignment(payload);

    // Notify customer about delivery partner
    await this.notifyCustomerDeliveryAssigned(payload);
  }

  /**
   * Handle payment status updates
   */
  private async handlePaymentUpdate(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(
      `💳 Order #${payload.order.id} payment: ${payload.order.payment_status}`
    );

    if (payload.order.payment_status === 'paid') {
      // Payment confirmed - this triggers the order flow
      await this.handleNewOrder(payload);
    } else if (payload.order.payment_status === 'refunded') {
      // Refund processed - notify customer
      await this.notifyCustomerRefundProcessed(payload);
    }
  }

  // ========================================
  // Customer Notification Methods
  // ========================================

  private async notifyCustomerOrderReceived(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying customer: Order received`);
    // TODO: Send WhatsApp/SMS to customer
  }

  private async notifyCustomerOrderConfirmed(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying customer: Order confirmed by ${payload.vendor.store_name}`);
    // TODO: Send WhatsApp/SMS to customer
  }

  private async notifyCustomerOrderPreparing(payload: OrderWebhookPayload): Promise<void> {
    const eta = payload.processing_time || 30; // Default 30 mins
    this.logger.log(`📱 Notifying customer: Order preparing, ETA ${eta} mins`);
    // TODO: Send WhatsApp/SMS to customer
  }

  private async notifyCustomerOrderReady(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying customer: Order ready for pickup/delivery`);
    // TODO: Send WhatsApp/SMS to customer
  }

  private async notifyCustomerOrderPickedUp(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying customer: Order picked up by ${payload.delivery_man?.name}`);
    // TODO: Send WhatsApp/SMS to customer with live tracking link
  }

  private async notifyCustomerOrderDelivered(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying customer: Order delivered! Requesting feedback`);
    // TODO: Send WhatsApp/SMS to customer with feedback link
  }

  private async notifyCustomerDeliveryAssigned(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying customer: Delivery partner assigned`);
    // TODO: Send WhatsApp/SMS to customer
  }

  private async notifyCustomerRefundProcessed(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying customer: Refund processed`);
    // TODO: Send WhatsApp/SMS to customer
  }

  private async notifyOrderCanceled(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying all parties: Order canceled`);
    // TODO: Send notifications to customer, vendor, delivery man
  }

  // ========================================
  // Delivery Man Notification Methods
  // ========================================

  private async notifyDeliveryManNewAssignment(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying delivery man: New order assigned`);
    // TODO: Send notification to delivery man
  }

  private async notifyDeliveryManOrderReady(payload: OrderWebhookPayload): Promise<void> {
    this.logger.log(`📱 Notifying delivery man: Order ready for pickup`);
    // TODO: Send notification to delivery man
  }
}
