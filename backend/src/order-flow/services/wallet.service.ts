import { Injectable, Logger } from '@nestjs/common';
import { PhpWalletService } from '../../php-integration/services/php-wallet.service';
import { formatPrice } from '../../common/utils/helpers';

/**
 * Wallet Service
 * Handles wallet operations for order flow
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly phpWalletService: PhpWalletService) {}

  /**
   * Get wallet balance with formatted display
   */
  async getWalletBalance(token: string): Promise<{
    success: boolean;
    balance?: number;
    message?: string;
    formattedMessage?: string;
  }> {
    try {
      const result = await this.phpWalletService.getWalletBalance(token);

      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Failed to fetch wallet balance',
        };
      }

      const formattedMessage =
        `👛 **Your Wallet Balance**\n\n` +
        `💰 Balance: ${formatPrice(result.balance || 0)}\n\n` +
        `💡 Use your wallet for instant payments!`;

      return {
        success: true,
        balance: result.balance,
        formattedMessage,
      };
    } catch (error) {
      this.logger.error(`Error getting wallet balance: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch wallet balance',
      };
    }
  }

  /**
   * Check if wallet can pay for order
   */
  async canPayWithWallet(
    token: string,
    orderAmount: number,
  ): Promise<{
    success: boolean;
    canPay?: boolean;
    balance?: number;
    shortfall?: number;
    message?: string;
  }> {
    try {
      const balanceCheck = await this.phpWalletService.checkSufficientBalance(token, orderAmount);

      if (!balanceCheck.success) {
        return {
          success: false,
          message: 'Failed to check wallet balance',
        };
      }

      return {
        success: true,
        canPay: balanceCheck.sufficient || false,
        balance: balanceCheck.balance,
        shortfall: balanceCheck.shortfall,
      };
    } catch (error) {
      this.logger.error(`Error checking wallet payment: ${error.message}`);
      return {
        success: false,
        message: 'Failed to check wallet balance',
      };
    }
  }

  /**
   * Get wallet payment confirmation message
   */
  formatWalletPaymentMessage(amount: number, balance: number): string {
    const newBalance = balance - amount;

    return (
      `👛 **Wallet Payment Selected**\n\n` +
      `💰 Order Amount: ${formatPrice(amount)}\n` +
      `💵 Current Balance: ${formatPrice(balance)}\n` +
      `💳 After Payment: ${formatPrice(newBalance)}\n\n` +
      `✅ Amount will be deducted from your wallet instantly.`
    );
  }

  /**
   * Get insufficient balance message
   */
  formatInsufficientBalanceMessage(amount: number, balance: number, shortfall: number): string {
    return (
      `❌ **Insufficient Wallet Balance**\n\n` +
      `💰 Order Amount: ${formatPrice(amount)}\n` +
      `💵 Your Balance: ${formatPrice(balance)}\n` +
      `⚠️ Short by: ${formatPrice(shortfall)}\n\n` +
      `💡 Please recharge your wallet or choose another payment method.`
    );
  }

  /**
   * Initiate wallet recharge
   */
  async initiateRecharge(
    token: string,
    amount: number,
  ): Promise<{
    success: boolean;
    paymentLink?: string;
    message?: string;
    formattedMessage?: string;
  }> {
    try {
      // Validate amount
      if (amount < 10) {
        return {
          success: false,
          message: 'Minimum recharge amount is ₹10',
          formattedMessage: '⚠️ Minimum recharge amount is ₹10. Please enter a higher amount.',
        };
      }

      if (amount > 50000) {
        return {
          success: false,
          message: 'Maximum recharge amount is ₹50,000',
          formattedMessage: '⚠️ Maximum recharge amount is ₹50,000. Please enter a lower amount.',
        };
      }

      // Initiate recharge with Razorpay
      const result = await this.phpWalletService.initiateWalletRecharge(token, amount, 'razor_pay');

      if (!result.success || !result.redirectLink) {
        return {
          success: false,
          message: result.message || 'Failed to initiate wallet recharge',
        };
      }

      const formattedMessage =
        `💰 **Wallet Recharge Initiated**\n\n` +
        `Amount: ${formatPrice(amount)}\n\n` +
        `Click the link below to complete payment:\n` +
        `🔗 ${result.redirectLink}\n\n` +
        `✅ Secure payment via Razorpay\n` +
        `💳 UPI, Cards, Net Banking accepted\n\n` +
        `💡 Balance will be added instantly after payment.`;

      return {
        success: true,
        paymentLink: result.redirectLink,
        formattedMessage,
      };
    } catch (error) {
      this.logger.error(`Error initiating wallet recharge: ${error.message}`);
      return {
        success: false,
        message: 'Failed to initiate wallet recharge',
      };
    }
  }

  /**
   * Get wallet transactions with formatted display
   */
  async getTransactions(
    token: string,
    limit: number = 10,
  ): Promise<{
    success: boolean;
    transactions?: any[];
    formattedMessage?: string;
    message?: string;
  }> {
    try {
      const result = await this.phpWalletService.getWalletTransactions(token, limit, 1);

      if (!result.success || !result.transactions) {
        return {
          success: false,
          message: 'Failed to fetch transactions',
        };
      }

      if (result.transactions.length === 0) {
        return {
          success: true,
          transactions: [],
          formattedMessage: '📋 **Transaction History**\n\nNo transactions yet.',
        };
      }

      let formattedMessage = '📋 **Recent Transactions**\n\n';

      result.transactions.slice(0, 5).forEach((txn: any, index: number) => {
        const type = this.phpWalletService.formatTransactionType(txn.transaction_type);
        const amount = txn.credit > 0 ? `+${formatPrice(txn.credit)}` : `-${formatPrice(txn.debit)}`;
        const date = new Date(txn.created_at).toLocaleDateString('en-IN');

        formattedMessage += `${index + 1}. ${type}\n`;
        formattedMessage += `   ${amount} • ${date}\n\n`;
      });

      if (result.transactions.length > 5) {
        formattedMessage += `\n💡 Showing 5 of ${result.transactions.length} transactions`;
      }

      return {
        success: true,
        transactions: result.transactions,
        formattedMessage,
      };
    } catch (error) {
      this.logger.error(`Error getting transactions: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch transactions',
      };
    }
  }

  /**
   * Get wallet bonuses with formatted display
   */
  async getBonuses(token: string): Promise<{
    success: boolean;
    bonuses?: any[];
    formattedMessage?: string;
    message?: string;
  }> {
    try {
      const result = await this.phpWalletService.getWalletBonuses(token);

      if (!result.success) {
        return {
          success: false,
          message: 'Failed to fetch bonuses',
        };
      }

      if (!result.bonuses || result.bonuses.length === 0) {
        return {
          success: true,
          bonuses: [],
          formattedMessage: '🎁 **Wallet Bonuses**\n\nNo active bonuses available right now.',
        };
      }

      let formattedMessage = '🎁 **Active Wallet Bonuses**\n\n';

      result.bonuses.forEach((bonus: any, index: number) => {
        formattedMessage += `${index + 1}. ${bonus.title}\n`;
        formattedMessage += `   💰 Bonus: ${formatPrice(bonus.bonusAmount)}\n`;
        formattedMessage += `   🎯 Min Amount: ${formatPrice(bonus.minimumAddAmount)}\n`;
        formattedMessage += `   📅 Valid till: ${new Date(bonus.endDate).toLocaleDateString('en-IN')}\n\n`;
      });

      formattedMessage += '💡 Recharge now to claim bonuses!';

      return {
        success: true,
        bonuses: result.bonuses,
        formattedMessage,
      };
    } catch (error) {
      this.logger.error(`Error getting bonuses: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch bonuses',
      };
    }
  }

  /**
   * Get smart recharge suggestions based on shortfall and bonuses
   * @param token - User authentication token
   * @param shortfall - Amount needed (optional, for order payments)
   * @returns Suggested recharge amounts with bonus calculations
   */
  async getSmartRechargeSuggestions(
    token: string,
    shortfall?: number,
  ): Promise<{
    success: boolean;
    suggestions?: Array<{
      amount: number;
      bonus: number;
      total: number;
      label: string;
      icon: string;
      recommended?: boolean;
    }>;
    message?: string;
  }> {
    try {
      // Fetch active bonuses
      const bonusResult = await this.phpWalletService.getWalletBonuses(token);
      const bonuses = bonusResult.success && bonusResult.bonuses ? bonusResult.bonuses : [];

      // Define base suggestions
      const baseSuggestions = [];

      // If shortfall is provided, add it as first option
      if (shortfall && shortfall > 0) {
        baseSuggestions.push({
          amount: Math.ceil(shortfall),
          label: 'Exact amount needed',
          icon: '💵',
        });

        // Add rounded up amount
        const roundedAmount = Math.ceil(shortfall / 100) * 100;
        if (roundedAmount > shortfall) {
          baseSuggestions.push({
            amount: roundedAmount,
            label: 'Round amount',
            icon: '💰',
          });
        }
      }

      // Add popular amounts
      baseSuggestions.push(
        { amount: 100, label: 'Quick recharge', icon: '⚡' },
        { amount: 500, label: 'Popular choice', icon: '⭐' },
        { amount: 1000, label: 'Best value', icon: '🎁' },
        { amount: 2000, label: 'Maximum savings', icon: '💎' },
      );

      // Remove duplicates and filter based on shortfall
      const uniqueAmounts = new Set<number>();
      const filteredSuggestions = baseSuggestions.filter((s) => {
        if (uniqueAmounts.has(s.amount)) return false;
        if (shortfall && s.amount < shortfall) return false;
        uniqueAmounts.add(s.amount);
        return true;
      });

      // Calculate bonuses for each suggestion
      const suggestions = filteredSuggestions.map((suggestion) => {
        const bonus = this.calculateBonus(suggestion.amount, bonuses);
        return {
          amount: suggestion.amount,
          bonus,
          total: suggestion.amount + bonus,
          label: suggestion.label,
          icon: suggestion.icon,
          recommended: bonus > 0, // Mark as recommended if bonus available
        };
      });

      // Sort by recommendation (with bonus first), then by amount
      suggestions.sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        return a.amount - b.amount;
      });

      // Take top 4-5 suggestions
      const topSuggestions = suggestions.slice(0, shortfall ? 5 : 4);

      return {
        success: true,
        suggestions: topSuggestions,
      };
    } catch (error) {
      this.logger.error(`Error getting smart recharge suggestions: ${error.message}`);
      return {
        success: false,
        message: 'Failed to get recharge suggestions',
      };
    }
  }

  /**
   * Calculate bonus for a given amount based on active bonuses
   * @param amount - Recharge amount
   * @param bonuses - Array of active bonuses
   * @returns Calculated bonus amount
   */
  private calculateBonus(amount: number, bonuses: any[]): number {
    if (!bonuses || bonuses.length === 0) return 0;

    let maxBonus = 0;

    bonuses.forEach((bonus) => {
      // Check if amount qualifies for this bonus
      if (amount < bonus.minimumAddAmount) return;

      let calculatedBonus = 0;

      // Check bonus_type field (from PHP it's snake_case, not camelCase)
      const bonusType = bonus.bonusType || bonus.bonus_type || 'amount';

      if (bonusType === 'percentage') {
        // Calculate percentage bonus
        calculatedBonus = (amount * bonus.bonusAmount) / 100;
        // Cap at maximum bonus amount
        const maxBonusAmount = bonus.maximumBonusAmount || bonus.maximum_bonus_amount;
        if (maxBonusAmount && calculatedBonus > maxBonusAmount) {
          calculatedBonus = maxBonusAmount;
        }
      } else {
        // Fixed amount bonus
        calculatedBonus = bonus.bonusAmount || bonus.bonus_amount || 0;
      }

      // Keep track of maximum bonus
      if (calculatedBonus > maxBonus) {
        maxBonus = calculatedBonus;
      }
    });

    return maxBonus;
  }

  /**
   * Format smart recharge suggestions for WhatsApp display
   * @param suggestions - Array of recharge suggestions
   * @param shortfall - Optional shortfall amount
   * @returns Formatted WhatsApp message
   */
  formatSmartRechargeSuggestionsMessage(
    suggestions: Array<{
      amount: number;
      bonus: number;
      total: number;
      label: string;
      icon: string;
      recommended?: boolean;
    }>,
    shortfall?: number,
  ): string {
    let message = '';

    if (shortfall && shortfall > 0) {
      message += `💸 You need ${formatPrice(shortfall)} more\n\n`;
    }

    message += `*🎯 Smart Recharge Options:*\n\n`;

    suggestions.forEach((suggestion, index) => {
      message += `${index + 1}️⃣ ${formatPrice(suggestion.amount)} - ${suggestion.label} ${suggestion.icon}\n`;

      if (suggestion.bonus > 0) {
        message += `   💎 Get ${formatPrice(suggestion.bonus)} BONUS!\n`;
        message += `   ↳ Total balance: ${formatPrice(suggestion.total)}\n`;
      }

      if (suggestion.recommended && index === 0) {
        message += `   ⭐ RECOMMENDED\n`;
      }

      message += `\n`;
    });

    message += `${suggestions.length + 1}️⃣ Enter custom amount\n\n`;
    message += `Reply with option number (1-${suggestions.length + 1}):`;

    return message;
  }

  /**
   * Get wallet menu options
   */
  getWalletMenuMessage(): string {
    return (
      `👛 **Wallet Options**\n\n` +
      `1️⃣ Check Balance\n` +
      `2️⃣ Recharge Wallet\n` +
      `3️⃣ Transaction History\n` +
      `4️⃣ View Bonuses\n` +
      `5️⃣ Back to Main Menu\n\n` +
      `💡 Reply with the number to select option`
    );
  }
}
