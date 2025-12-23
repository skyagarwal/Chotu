import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhpApiService } from './php-api.service';

/**
 * PHP Wallet Service
 * Handles wallet-related API calls to PHP backend
 */
@Injectable()
export class PhpWalletService extends PhpApiService {
  protected readonly logger = new Logger(PhpWalletService.name);

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Get user wallet balance
   */
  async getWalletBalance(token: string): Promise<{
    success: boolean;
    balance?: number;
    formattedBalance?: string;
    message?: string;
  }> {
    // MOCK FOR TESTING
    const isTestMode = this.configService.get('app.testMode');
    if (isTestMode && token.startsWith('mock_token_')) {
      this.logger.log('👛 [MOCK] Fetching wallet balance');
      return {
        success: true,
        balance: 500.0,
        formattedBalance: '₹500.00',
      };
    }

    try {
      this.logger.log('👛 Fetching wallet balance');

      const response: any = await this.get('/api/v1/customer/info', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const balance = parseFloat(response.wallet_balance || 0);

      return {
        success: true,
        balance,
        formattedBalance: `₹${balance.toFixed(2)}`,
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet balance: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(
    token: string,
    limit: number = 10,
    offset: number = 1,
    type?: 'order' | 'loyalty_point' | 'add_fund' | 'referrer' | 'CashBack',
  ): Promise<{
    success: boolean;
    transactions?: any[];
    total?: number;
    message?: string;
  }> {
    try {
      this.logger.log(`👛 Fetching wallet transactions (limit: ${limit}, offset: ${offset})`);

      const params: any = { limit, offset };
      if (type) {
        params.type = type;
      }

      const response: any = await this.get('/api/v1/customer/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      return {
        success: true,
        transactions: response.data || [],
        total: response.total_size || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet transactions: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Initiate wallet recharge
   * 
   * @param token - User authentication token
   * @param amount - Recharge amount (₹10 - ₹50,000)
   * @param paymentMethod - Payment gateway identifier (default: 'razor_pay')
   * 
   * Note: The paymentMethod becomes the 'reference' in wallet_transactions table.
   * PHP backend flow:
   * 1. Creates WalletPayment record
   * 2. Generates Razorpay payment link
   * 3. On success, calls wallet_success() hook
   * 4. Calls CustomerLogic::create_wallet_transaction($user_id, $amount, 'add_fund', $paymentMethod)
   * 5. Creates wallet_transaction with:
   *    - transaction_type = 'add_fund'
   *    - reference = $paymentMethod (e.g., 'razor_pay')
   */
  async initiateWalletRecharge(
    token: string,
    amount: number,
    paymentMethod: string = 'razor_pay',
  ): Promise<{
    success: boolean;
    redirectLink?: string;
    walletPaymentId?: number;
    message?: string;
  }> {
    try {
      this.logger.log(`💰 Initiating wallet recharge for ₹${amount} via ${paymentMethod}`);

      const response: any = await this.authenticatedRequest(
        'post',
        '/api/v1/customer/wallet/add-fund',
        token,
        {
          amount,
          payment_method: paymentMethod, // This becomes the 'reference' in wallet_transactions
          payment_platform: 'app',
        },
      );

      if (!response.redirect_link) {
        throw new Error('Failed to generate payment link');
      }

      return {
        success: true,
        redirectLink: response.redirect_link,
        walletPaymentId: response.wallet_payment_id,
      };
    } catch (error) {
      this.logger.error(`Failed to initiate wallet recharge: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get wallet bonuses
   */
  async getWalletBonuses(token: string): Promise<{
    success: boolean;
    bonuses?: Array<{
      id: number;
      title: string;
      description: string;
      bonusAmount: number;
      minimumAddAmount: number;
      maximumBonusAmount: number;
      startDate: string;
      endDate: string;
    }>;
    message?: string;
  }> {
    try {
      this.logger.log('🎁 Fetching wallet bonuses');

      const response: any = await this.get('/api/v1/customer/wallet/bonuses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!Array.isArray(response)) {
        return { success: true, bonuses: [] };
      }

      const bonuses = response.map((bonus: any) => ({
        id: bonus.id,
        title: bonus.title,
        description: bonus.description,
        bonusAmount: parseFloat(bonus.bonus_amount || 0),
        minimumAddAmount: parseFloat(bonus.minimum_add_amount || 0),
        maximumBonusAmount: parseFloat(bonus.maximum_bonus_amount || 0),
        startDate: bonus.start_date,
        endDate: bonus.end_date,
      }));

      return {
        success: true,
        bonuses,
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet bonuses: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Check if wallet has sufficient balance for payment
   */
  async checkSufficientBalance(
    token: string,
    requiredAmount: number,
  ): Promise<{
    success: boolean;
    sufficient?: boolean;
    balance?: number;
    shortfall?: number;
    message?: string;
  }> {
    try {
      const balanceResult = await this.getWalletBalance(token);

      if (!balanceResult.success) {
        return {
          success: false,
          message: 'Failed to check wallet balance',
        };
      }

      const balance = balanceResult.balance || 0;
      const sufficient = balance >= requiredAmount;
      const shortfall = sufficient ? 0 : requiredAmount - balance;

      return {
        success: true,
        sufficient,
        balance,
        shortfall,
      };
    } catch (error) {
      this.logger.error(`Failed to check wallet balance: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Format wallet balance for display
   */
  formatWalletBalance(balance: number): string {
    return `₹${balance.toFixed(2)}`;
  }

  /**
   * Format wallet transaction for display
   */
  formatTransactionType(type: string): string {
    const typeMap: { [key: string]: string } = {
      order_place: '🛍️ Order Payment',
      order_refund: '↩️ Order Refund',
      partial_payment: '💳 Partial Payment',
      loyalty_point: '⭐ Loyalty Points',
      add_fund: '💰 Wallet Recharge',
      referrer: '👥 Referral Bonus',
      CashBack: '🎁 Cashback',
    };
    return typeMap[type] || type;
  }
}
