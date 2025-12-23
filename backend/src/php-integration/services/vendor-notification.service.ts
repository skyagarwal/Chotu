import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';

/**
 * Order Notification Payload
 */
export interface OrderNotificationPayload {
  orderId: number;
  orderAmount: number;
  customerName: string;
  customerPhone?: string;
  itemsCount: number;
  itemsSummary: string;
  deliveryAddress?: string;
  paymentMethod: 'cod' | 'online' | 'wallet';
  scheduledAt?: string;
  orderType: 'delivery' | 'pickup';
}

/**
 * Vendor Notification Target
 */
export interface VendorNotificationTarget {
  vendorId: number;
  storeName: string;
  vendorPhone: string;
  vendorEmail?: string;
  fcmTopics?: string[];
  preferredLanguage?: 'en' | 'hi' | 'mr';
}

/**
 * Notification Result
 */
export interface NotificationResult {
  success: boolean;
  channel: 'fcm' | 'whatsapp' | 'voice' | 'sms';
  sentAt: Date;
  messageId?: string;
  error?: string;
}

/**
 * Vendor Notification Service
 * 
 * Multi-channel notification system for vendors:
 * 1. FCM Push (via zone_wise_topic)
 * 2. WhatsApp Message
 * 3. Voice Call IVR (via Nerve System on Mercury)
 * 4. SMS (fallback)
 */
@Injectable()
export class VendorNotificationService {
  private readonly logger = new Logger(VendorNotificationService.name);
  
  private readonly whatsappServiceUrl: string;
  private readonly nerveServiceUrl: string;
  private readonly fcmServerKey: string;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.whatsappServiceUrl = this.configService.get<string>(
      'WHATSAPP_SERVICE_URL',
      'http://localhost:3200'
    );
    this.nerveServiceUrl = this.configService.get<string>(
      'NERVE_SERVICE_URL',
      'http://192.168.0.151:7100'
    );
    this.fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY', '');
    
    this.logger.log(`✅ VendorNotificationService initialized`);
    this.logger.log(`   Nerve System: ${this.nerveServiceUrl}`);
  }

  /**
   * Send new order notification to vendor
   */
  async notifyVendorNewOrder(
    vendor: VendorNotificationTarget,
    order: OrderNotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    this.logger.log(
      `📦 Notifying vendor ${vendor.storeName} about new order #${order.orderId}`
    );

    // Step 1: Send FCM Push (immediate)
    const fcmResult = await this.sendFcmNotification(vendor, order);
    results.push(fcmResult);

    // Step 2: Send WhatsApp (immediate)
    const whatsappResult = await this.sendWhatsAppNotification(vendor, order);
    results.push(whatsappResult);

    // Step 3: Make Voice Call via Nerve System
    const voiceResult = await this.sendVoiceNotification(vendor, order);
    results.push(voiceResult);

    return results;
  }

  /**
   * Send FCM Push Notification
   */
  private async sendFcmNotification(
    vendor: VendorNotificationTarget,
    order: OrderNotificationPayload
  ): Promise<NotificationResult> {
    try {
      const topic = vendor.fcmTopics?.[0] || `zone_${vendor.vendorId}_store`;
      this.logger.log(`📲 Sending FCM to topic: ${topic}`);

      if (!this.fcmServerKey) {
        return {
          success: false,
          channel: 'fcm',
          sentAt: new Date(),
          error: 'FCM not configured',
        };
      }

      const message = {
        to: `/topics/${topic}`,
        notification: {
          title: `🔔 New Order #${order.orderId}`,
          body: `${order.itemsCount} items - ₹${order.orderAmount}`,
          sound: 'default',
        },
        data: {
          type: 'new_order',
          order_id: order.orderId.toString(),
          order_amount: order.orderAmount.toString(),
        },
        priority: 'high',
      };

      const response = await axios.post(
        'https://fcm.googleapis.com/fcm/send',
        message,
        {
          headers: {
            Authorization: `key=${this.fcmServerKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: response.data.success === 1,
        channel: 'fcm',
        sentAt: new Date(),
        messageId: response.data.message_id,
      };
    } catch (error) {
      this.logger.error(`❌ FCM notification failed: ${error.message}`);
      return {
        success: false,
        channel: 'fcm',
        sentAt: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(
    vendor: VendorNotificationTarget,
    order: OrderNotificationPayload
  ): Promise<NotificationResult> {
    try {
      this.logger.log(`📱 Sending WhatsApp to vendor: ${vendor.vendorPhone}`);

      const message = this.formatWhatsAppOrderMessage(vendor, order);

      const response = await axios.post(
        `${this.whatsappServiceUrl}/api/whatsapp/send`,
        {
          phone: vendor.vendorPhone,
          message,
          type: 'vendor_order_notification',
          metadata: {
            orderId: order.orderId,
            vendorId: vendor.vendorId,
          },
        },
        { timeout: 10000 }
      );

      return {
        success: response.data.success === true,
        channel: 'whatsapp',
        sentAt: new Date(),
        messageId: response.data.messageId,
      };
    } catch (error) {
      this.logger.error(`❌ WhatsApp notification failed: ${error.message}`);
      return {
        success: false,
        channel: 'whatsapp',
        sentAt: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Make IVR voice call via Nerve System (Mercury)
   * Calls http://192.168.0.151:7100/api/nerve/vendor-order-confirmation
   */
  async sendVoiceNotification(
    vendor: VendorNotificationTarget,
    order: OrderNotificationPayload
  ): Promise<NotificationResult> {
    try {
      this.logger.log(`📞 Making IVR call to vendor: ${vendor.vendorPhone} via Nerve System`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.nerveServiceUrl}/api/nerve/vendor-order-confirmation`, {
          order_id: order.orderId,
          vendor_id: vendor.vendorId,
          vendor_phone: vendor.vendorPhone,
          vendor_name: vendor.storeName,
          order_amount: order.orderAmount || 0,
          language: vendor.preferredLanguage || 'hi',
        }, { timeout: 30000 })
      );

      const callId = `VC_${order.orderId}_${Date.now()}`;
      
      return {
        success: response.data?.success === true || response.data?.call_sid,
        channel: 'voice',
        sentAt: new Date(),
        messageId: response.data?.call_sid || callId,
        error: response.data?.error,
      };
    } catch (error) {
      this.logger.error(`❌ Voice notification failed: ${error.message}`);
      return {
        success: false,
        channel: 'voice',
        sentAt: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Format WhatsApp message
   */
  private formatWhatsAppOrderMessage(
    vendor: VendorNotificationTarget,
    order: OrderNotificationPayload
  ): string {
    const lang = vendor.preferredLanguage || 'hi';

    const templates = {
      en: `🔔 *NEW ORDER #${order.orderId}*

📍 *${vendor.storeName}*

*Items:* ${order.itemsSummary}
*Total:* ₹${order.orderAmount}
*Payment:* ${(order.paymentMethod || 'COD').toUpperCase()}
*Customer:* ${order.customerName}

⏰ Please confirm within 5 minutes!`,

      hi: `🔔 *नया ऑर्डर #${order.orderId}*

📍 *${vendor.storeName}*

*आइटम:* ${order.itemsSummary}
*कुल:* ₹${order.orderAmount}
*भुगतान:* ${(order.paymentMethod || 'COD').toUpperCase()}
*ग्राहक:* ${order.customerName}

⏰ कृपया 5 मिनट में पुष्टि करें!`,

      mr: `🔔 *नवीन ऑर्डर #${order.orderId}*

📍 *${vendor.storeName}*

*आयटम:* ${order.itemsSummary}
*एकूण:* ₹${order.orderAmount}
*पेमेंट:* ${(order.paymentMethod || 'COD').toUpperCase()}
*ग्राहक:* ${order.customerName}

⏰ कृपया 5 मिनिटांत पुष्टी करा!`,
    };

    return templates[lang] || templates.hi;
  }

  /**
   * Notify vendor about order status changes
   */
  async notifyVendorOrderUpdate(
    vendor: VendorNotificationTarget,
    orderId: number,
    status: string,
    details: string
  ): Promise<NotificationResult> {
    try {
      const message = `📦 Order #${orderId} Update\n\nStatus: ${status}\n${details}`;

      const response = await axios.post(
        `${this.whatsappServiceUrl}/api/whatsapp/send`,
        {
          phone: vendor.vendorPhone,
          message,
          type: 'vendor_order_update',
        },
        { timeout: 10000 }
      );

      return {
        success: true,
        channel: 'whatsapp',
        sentAt: new Date(),
        messageId: response.data.messageId,
      };
    } catch (error) {
      this.logger.error(`❌ Order update notification failed: ${error.message}`);
      return {
        success: false,
        channel: 'whatsapp',
        sentAt: new Date(),
        error: error.message,
      };
    }
  }
}
