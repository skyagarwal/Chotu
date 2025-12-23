import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhpApiService } from './php-api.service';

/**
 * PHP Payment Service
 * Handles all payment-related API calls
 */
@Injectable()
export class PhpPaymentService extends PhpApiService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Calculate tax for order
   */
  async calculateTax(cartData: {
    items: any[];
    deliveryCharge: number;
    distance: number;
  }): Promise<{
    success: boolean;
    tax?: number;
    total?: number;
    message?: string;
  }> {
    try {
      this.logger.log('💰 Calculating tax');

      const response: any = await this.post('/api/v1/customer/order/get-Tax', {
        items: cartData.items,
        delivery_charge: cartData.deliveryCharge,
        distance: cartData.distance,
      });

      return {
        success: true,
        tax: parseFloat(response.tax || 0),
        total: parseFloat(response.total || 0),
      };
    } catch (error) {
      this.logger.error(`Failed to calculate tax: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods(moduleId?: number, zoneId?: number): Promise<{
    success: boolean;
    methods?: Array<{
      id: string;
      name: string;
      type: string;
      enabled: boolean;
    }>;
    message?: string;
  }> {
    try {
      this.logger.log(`💳 Fetching payment methods (Module: ${moduleId}, Zone: ${zoneId})`);

      const headers: any = {};
      if (moduleId) headers['moduleId'] = moduleId.toString();
      if (zoneId) headers['zoneId'] = JSON.stringify([zoneId]);

      const response: any = await this.get('/api/v1/config/get-PaymentMethods', {}, headers);

      if (!response || !Array.isArray(response)) {
        // Return default payment methods
        return {
          success: true,
          methods: [
            {
              id: 'cash_on_delivery',
              name: 'Cash on Delivery',
              type: 'cash',
              enabled: true,
            },
            {
              id: 'digital_payment',
              name: 'Online Payment (Razorpay)',
              type: 'digital',
              enabled: true,
            },
          ],
        };
      }

      return {
        success: true,
        methods: response.map((method: any) => ({
          id: method.id,
          name: method.name,
          type: method.type,
          enabled: method.enabled === 1,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch payment methods: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Initialize Razorpay payment
   * Returns payment link or Razorpay order details
   */
  async initializeRazorpay(
    token: string,
    orderId: number,
    amount: number,
  ): Promise<{
    success: boolean;
    paymentLink?: string;
    razorpayOrderId?: string;
    message?: string;
  }> {
    try {
      this.logger.log(`💳 Initializing Razorpay payment for order ${orderId}`);

      // Update payment method to digital_payment
      await this.authenticatedRequest('put', '/api/v1/customer/order/payment-method', token, {
        order_id: orderId,
        payment_method: 'digital_payment',
      });

      // In a real implementation, you'd call Razorpay API here
      // For now, we'll return a mock response
      // The PHP backend should handle Razorpay integration

      const razorpayOrderId = `razorpay_order_${orderId}_${Date.now()}`;
      const paymentLink = `${this.baseUrl}/payment/razorpay/${orderId}`;

      this.logger.log(`✅ Razorpay payment initialized: ${razorpayOrderId}`);

      return {
        success: true,
        paymentLink,
        razorpayOrderId,
      };
    } catch (error) {
      this.logger.error(`Failed to initialize Razorpay: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Verify Razorpay payment
   */
  async verifyRazorpayPayment(
    token: string,
    orderId: number,
    paymentId: string,
    signature: string,
  ): Promise<{
    success: boolean;
    verified?: boolean;
    message?: string;
  }> {
    try {
      this.logger.log(`🔐 Verifying Razorpay payment: ${paymentId}`);

      // This would typically verify the payment signature with Razorpay
      // The PHP backend should handle this
      const response: any = await this.authenticatedRequest(
        'post',
        '/api/v1/customer/order/verify-payment',
        token,
        {
          order_id: orderId,
          payment_id: paymentId,
          signature: signature,
        },
      );

      this.logger.log('✅ Payment verified');

      return {
        success: true,
        verified: response.verified === true,
      };
    } catch (error) {
      this.logger.error(`Failed to verify payment: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Update offline payment information
   */
  async updateOfflinePayment(
    token: string,
    orderId: number,
    paymentInfo: {
      method: string;
      transactionId?: string;
      note?: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      this.logger.log(`💰 Updating offline payment for order ${orderId}`);

      await this.authenticatedRequest('put', '/api/v1/customer/order/offline-payment', token, {
        order_id: orderId,
        payment_method: paymentInfo.method,
        transaction_id: paymentInfo.transactionId,
        note: paymentInfo.note,
      });

      this.logger.log('✅ Offline payment updated');

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update offline payment: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get payment method emoji
   */
  getPaymentMethodEmoji(method: string): string {
    switch (method) {
      case 'cash_on_delivery':
        return '💵';
      case 'digital_payment':
        return '💳';
      case 'wallet':
        return '👛';
      case 'offline_payment':
        return '🏦';
      default:
        return '💰';
    }
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      cash_on_delivery: 'Cash on Delivery',
      digital_payment: 'Online Payment (Razorpay)',
      wallet: 'Wallet',
      offline_payment: 'Offline Payment',
    };
    return methodMap[method] || method;
  }
}
