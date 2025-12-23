import { Injectable, Logger } from '@nestjs/common';
import { PhpPaymentService } from '../../php-integration/services/php-payment.service';
import { formatPrice } from '../../common/utils/helpers';

/**
 * Payment Service
 * Handles payment method selection and processing
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly phpPaymentService: PhpPaymentService) {}

  /**
   * Get formatted payment methods for selection
   */
  async getFormattedPaymentMethods(): Promise<{
    success: boolean;
    methods?: Array<{ id: string; name: string; type: string; enabled: boolean }>;
    formattedText?: string;
    message?: string;
  }> {
    try {
      const result = await this.phpPaymentService.getPaymentMethods();

      if (!result.success || !result.methods) {
        return {
          success: false,
          message: 'Failed to fetch payment methods',
        };
      }

      // Filter enabled methods
      const enabledMethods = result.methods.filter((m) => m.enabled);

      // Format for display
      let text = '💳 **Select Payment Method**\n\n';
      
      enabledMethods.forEach((method, index) => {
        const emoji = this.phpPaymentService.getPaymentMethodEmoji(method.id);
        text += `${index + 1}. ${emoji} ${method.name}\n`;
      });

      text += '\n💡 Reply with the number to select payment method';

      return {
        success: true,
        methods: enabledMethods,
        formattedText: text,
      };
    } catch (error) {
      this.logger.error(`Error fetching payment methods: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch payment methods',
      };
    }
  }

  /**
   * Select payment method by index
   */
  selectPaymentMethodByIndex(
    methods: Array<{ id: string; name: string }>,
    index: number,
  ): { id: string; name: string } | null {
    if (index < 0 || index >= methods.length) {
      return null;
    }
    return methods[index];
  }

  /**
   * Initialize Razorpay payment
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
    return this.phpPaymentService.initializeRazorpay(token, orderId, amount);
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
    return this.phpPaymentService.verifyRazorpayPayment(token, orderId, paymentId, signature);
  }

  /**
   * Format payment confirmation
   */
  formatPaymentConfirmation(paymentMethod: string, amount: number): string {
    const emoji = this.phpPaymentService.getPaymentMethodEmoji(paymentMethod);
    const methodName = this.phpPaymentService.formatPaymentMethod(paymentMethod);
    
    let text = '💳 **Payment Method Selected**\n\n';
    text += `${emoji} ${methodName}\n`;
    text += `💰 Amount: ${formatPrice(amount)}\n`;
    
    if (paymentMethod === 'cash_on_delivery') {
      text += '\n💡 Please keep exact change ready for the delivery person.';
    } else if (paymentMethod === 'digital_payment') {
      text += '\n💡 You will receive a payment link after order confirmation.';
    }
    
    return text;
  }

  /**
   * Get Razorpay payment instructions
   */
  getRazorpayInstructions(paymentLink: string): string {
    return '💳 **Complete Your Payment**\n\n' +
      `Click the link below to pay via Razorpay:\n` +
      `🔗 ${paymentLink}\n\n` +
      '✅ Secure payment powered by Razorpay\n' +
      '💳 UPI, Cards, Net Banking accepted\n\n' +
      '💡 Your order will be confirmed once payment is successful.';
  }

  /**
   * Validate payment method
   */
  isValidPaymentMethod(method: string): boolean {
    const validMethods = ['cash_on_delivery', 'digital_payment', 'wallet', 'offline_payment'];
    return validMethods.includes(method);
  }
}
