import { Controller, Post, Body, Headers, HttpCode, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostPaymentOrchestrationService } from '../services/post-payment-orchestration.service';

/**
 * Order Events Webhook Controller
 * 
 * Receives webhooks from:
 * - Payment Gateway (Razorpay) - Payment confirmations
 * - Tracking API - Rider location updates, status changes
 * - Nerve System - Vendor/Rider IVR responses
 * - PHP Backend - Order status updates
 */

interface PaymentWebhookPayload {
  event: 'payment.captured' | 'payment.failed' | 'refund.processed';
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        method: string;
        status: string;
        notes?: {
          order_id?: string;
          mangwale_order_id?: string;
        };
      };
    };
  };
}

interface TrackingWebhookPayload {
  event: 'location.updated' | 'status.changed' | 'rider.assigned';
  order_id?: string;
  crn_number?: string;
  data: {
    status?: string;
    lat?: number;
    lng?: number;
    rider_id?: string;
    rider_name?: string;
    rider_phone?: string;
    vehicle_number?: string;
    timestamp?: string;
  };
}

interface NerveCallbackPayload {
  call_id?: string;
  call_sid?: string;
  order_id?: number;
  vendor_id?: number;
  rider_id?: number;
  event: 'answered' | 'completed' | 'failed' | 'dtmf_received';
  status?: string;
  dtmf_digits?: string;
  prep_time?: number;
  rejection_reason?: string;
  recording_url?: string;
}

interface OrderWebhookPayload {
  event: 'order.created' | 'order.status_changed' | 'order.assigned' | 'order.payment';
  order: {
    id: number;
    order_id: string;
    status: string;
    total_amount?: number;
    payment_method?: string;
  };
  customer?: {
    id: number;
    name: string;
    phone: string;
  };
  vendor?: {
    id: number;
    store_name: string;
    phone: string;
  };
  rider?: {
    id: number;
    name: string;
    phone: string;
    vehicle_number?: string;
  };
  timestamp: string;
}

@Controller('webhooks/orders')
export class OrderEventsWebhookController {
  private readonly logger = new Logger(OrderEventsWebhookController.name);
  private readonly webhookSecret: string;
  private readonly razorpayWebhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly orchestrationService: PostPaymentOrchestrationService,
  ) {
    this.webhookSecret = this.configService.get('ORDER_WEBHOOK_SECRET', 'mangwale_webhook_secret_2024');
    this.razorpayWebhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET', '');
  }

  /**
   * Razorpay Payment Webhook
   * POST /webhooks/orders/payment
   */
  @Post('payment')
  @HttpCode(200)
  async handlePaymentWebhook(
    @Body() payload: PaymentWebhookPayload,
    @Headers('x-razorpay-signature') signature: string,
  ): Promise<{ status: string }> {
    this.logger.log(`═══════════════════════════════════════════════════════════`);
    this.logger.log(`💳 PAYMENT WEBHOOK RECEIVED`);
    this.logger.log(`   Event: ${payload.event}`);
    this.logger.log(`   Timestamp: ${new Date().toISOString()}`);
    this.logger.log(`═══════════════════════════════════════════════════════════`);

    // TODO: Verify Razorpay signature
    // if (!this.verifyRazorpaySignature(payload, signature)) {
    //   throw new BadRequestException('Invalid signature');
    // }

    try {
      if (payload.event === 'payment.captured') {
        const payment = payload.payload.payment.entity;
        const mangwaleOrderId = payment.notes?.mangwale_order_id || payment.notes?.order_id;
        
        this.logger.log(`   Payment ID: ${payment.id}`);
        this.logger.log(`   Amount: ₹${payment.amount / 100}`);
        this.logger.log(`   Method: ${payment.method}`);
        this.logger.log(`   Mangwale Order ID: ${mangwaleOrderId || 'MISSING'}`);
        
        if (!mangwaleOrderId) {
          this.logger.warn('⚠️ Payment webhook missing mangwale_order_id in notes');
          return { status: 'ignored' };
        }

        this.logger.log(`   → Triggering payment confirmation flow...`);
        await this.orchestrationService.onPaymentConfirmed({
          orderId: parseInt(mangwaleOrderId),
          paymentId: payment.id,
          paymentMethod: payment.method === 'cod' ? 'cod' : 'online',
          amount: payment.amount / 100, // Razorpay sends in paise
          transactionId: payment.id,
        });

        return { status: 'processed' };
      }

      return { status: 'ignored' };
    } catch (error) {
      this.logger.error(`Payment webhook error: ${error.message}`);
      return { status: 'error' };
    }
  }

  /**
   * Tracking API Webhook
   * POST /webhooks/orders/tracking
   */
  @Post('tracking')
  @HttpCode(200)
  async handleTrackingWebhook(
    @Body() payload: TrackingWebhookPayload,
    @Headers('x-webhook-secret') secret: string,
  ): Promise<{ status: string }> {
    this.logger.log(`📍 Tracking webhook received: ${payload.event}`);

    if (secret !== this.webhookSecret) {
      throw new BadRequestException('Invalid webhook secret');
    }

    try {
      const orderId = parseInt(payload.order_id || payload.crn_number?.replace('CRN', '') || '0');
      
      if (!orderId) {
        return { status: 'ignored' };
      }

      switch (payload.event) {
        case 'location.updated':
          if (payload.data.lat && payload.data.lng) {
            await this.orchestrationService.onRiderLocationUpdate(orderId, {
              lat: payload.data.lat,
              lng: payload.data.lng,
              timestamp: new Date(payload.data.timestamp || Date.now()),
            });
          }
          break;

        case 'status.changed':
          await this.handleStatusChange(orderId, payload.data.status);
          break;

        case 'rider.assigned':
          if (payload.data.rider_id) {
            await this.orchestrationService.assignRider(orderId, {
              orderId,
              riderId: parseInt(payload.data.rider_id),
              riderName: payload.data.rider_name || 'Rider',
              riderPhone: payload.data.rider_phone || '',
              vehicleNumber: payload.data.vehicle_number,
            });
          }
          break;
      }

      return { status: 'processed' };
    } catch (error) {
      this.logger.error(`Tracking webhook error: ${error.message}`);
      return { status: 'error' };
    }
  }

  /**
   * Nerve System Callback
   * POST /webhooks/orders/nerve-callback
   */
  @Post('nerve-callback')
  @HttpCode(200)
  async handleNerveCallback(
    @Body() payload: NerveCallbackPayload,
  ): Promise<{ status: string }> {
    this.logger.log(`📞 Nerve callback received: ${payload.event} for order ${payload.order_id}`);

    try {
      // Handle vendor responses
      if (payload.vendor_id && payload.order_id) {
        if (payload.event === 'completed' && payload.dtmf_digits) {
          // DTMF 1 = Accept, 2 = Reject
          const accepted = payload.dtmf_digits.startsWith('1');
          const prepTime = accepted ? this.parsePrepTime(payload.dtmf_digits) : undefined;

          await this.orchestrationService.onVendorResponse({
            orderId: payload.order_id,
            vendorId: payload.vendor_id,
            accepted,
            prepTimeMinutes: prepTime || payload.prep_time,
            rejectionReason: !accepted ? this.parseRejectionReason(payload.dtmf_digits) : undefined,
          });
        }
      }

      // Handle rider responses
      if (payload.rider_id && payload.order_id) {
        // Rider accepted/rejected the assignment
        if (payload.event === 'completed' && payload.dtmf_digits) {
          const accepted = payload.dtmf_digits === '1';
          if (!accepted) {
            // Rider rejected, find another
            await this.orchestrationService.startRiderSearch(payload.order_id);
          }
        }
      }

      return { status: 'processed' };
    } catch (error) {
      this.logger.error(`Nerve callback error: ${error.message}`);
      return { status: 'error' };
    }
  }

  /**
   * PHP Backend Order Webhook
   * POST /webhooks/orders/php
   */
  @Post('php')
  @HttpCode(200)
  async handlePhpOrderWebhook(
    @Body() payload: OrderWebhookPayload,
    @Headers('x-webhook-secret') secret: string,
  ): Promise<{ status: string }> {
    this.logger.log(`📦 PHP order webhook: ${payload.event}`);

    if (secret !== this.webhookSecret) {
      throw new BadRequestException('Invalid webhook secret');
    }

    try {
      switch (payload.event) {
        case 'order.payment':
          // Payment confirmed via PHP backend
          if (payload.order.status === 'confirmed') {
            await this.orchestrationService.onPaymentConfirmed({
              orderId: payload.order.id,
              paymentId: `PHP_${payload.order.id}`,
              paymentMethod: (payload.order.payment_method as 'cod' | 'online') || 'cod',
              amount: payload.order.total_amount || 0,
            });
          }
          break;

        case 'order.status_changed':
          await this.handleStatusChange(payload.order.id, payload.order.status);
          break;

        case 'order.assigned':
          if (payload.rider) {
            await this.orchestrationService.assignRider(payload.order.id, {
              orderId: payload.order.id,
              riderId: payload.rider.id,
              riderName: payload.rider.name,
              riderPhone: payload.rider.phone,
              vehicleNumber: payload.rider.vehicle_number,
            });
          }
          break;
      }

      return { status: 'processed' };
    } catch (error) {
      this.logger.error(`PHP webhook error: ${error.message}`);
      return { status: 'error' };
    }
  }

  /**
   * Handle status changes
   */
  private async handleStatusChange(orderId: number, status?: string): Promise<void> {
    if (!status) return;

    switch (status) {
      case 'picked_up':
      case 'pickup_done':
        await this.orchestrationService.handleOrderPickedUp(orderId);
        break;
      case 'delivered':
        await this.orchestrationService.handleOrderDelivered(orderId);
        break;
      case 'reached_pickup':
        await this.orchestrationService.handleRiderReachedPickup(orderId);
        break;
      case 'reached_delivery':
        await this.orchestrationService.handleRiderReachedDelivery(orderId);
        break;
    }
  }

  /**
   * Parse prep time from DTMF (e.g., "120" = 20 minutes)
   */
  private parsePrepTime(dtmf: string): number | undefined {
    // Format: 1XX where XX is prep time (10-60 mins)
    if (dtmf.length >= 3 && dtmf.startsWith('1')) {
      const time = parseInt(dtmf.substring(1));
      if (time >= 10 && time <= 60) {
        return time;
      }
    }
    return 20; // Default 20 minutes
  }

  /**
   * Parse rejection reason from DTMF
   */
  private parseRejectionReason(dtmf: string): string {
    // 21 = item unavailable, 22 = too busy, 23 = shop closed, 24 = other
    const reasons: Record<string, string> = {
      '21': 'item_unavailable',
      '22': 'too_busy',
      '23': 'shop_closed',
      '24': 'other',
    };
    return reasons[dtmf] || 'other';
  }
}
