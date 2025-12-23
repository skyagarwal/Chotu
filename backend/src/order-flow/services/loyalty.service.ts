import { Injectable, Logger } from '@nestjs/common';
import { PhpLoyaltyService } from '../../php-integration/services/php-loyalty.service';

/**
 * Loyalty Service - Layer 2 (Business Logic)
 * Channel-agnostic business rules for loyalty program
 * Can be used by WhatsApp, Telegram, Web, Mobile, etc.
 */

export interface LoyaltyBalance {
  points: number;
  wallet_equivalent: number;
  conversion_rate: number;
  can_convert: boolean;
  minimum_points: number;
  formatted_message: string;
}

export interface LoyaltyTransaction {
  id: number;
  type: 'earned' | 'spent' | 'converted';
  points: number;
  description: string;
  date: string;
  formatted: string;
}

export interface ConversionResult {
  success: boolean;
  points_converted: number;
  wallet_credited: number;
  new_balance: number;
  message: string;
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);
  
  // Business Rules
  private readonly CONVERSION_RATE = 10; // 10 points = ₹1
  private readonly MINIMUM_CONVERSION_POINTS = 100; // Minimum 100 points to convert
  private readonly POINTS_PER_ORDER = 10; // Points earned per order

  constructor(private readonly phpLoyaltyService: PhpLoyaltyService) {}

  /**
   * Get loyalty balance with business logic applied
   */
  async getLoyaltyBalance(token: string): Promise<LoyaltyBalance> {
    try {
      const result = await this.phpLoyaltyService.getLoyaltyPoints(token);

      if (!result.success || !result.points) {
        return {
          points: 0,
          wallet_equivalent: 0,
          conversion_rate: this.CONVERSION_RATE,
          can_convert: false,
          minimum_points: this.MINIMUM_CONVERSION_POINTS,
          formatted_message: '❌ Unable to fetch loyalty points. Please try again.',
        };
      }

      const pointsData = result.points;
      const points = pointsData.points; // Extract number from LoyaltyPoints object
      const walletEquivalent = this.calculateWalletValue(points);
      const canConvert = this.canConvertPoints(points);

      return {
        points,
        wallet_equivalent: walletEquivalent,
        conversion_rate: this.CONVERSION_RATE,
        can_convert: canConvert,
        minimum_points: this.MINIMUM_CONVERSION_POINTS,
        formatted_message: this.formatBalanceMessage(points, walletEquivalent, canConvert),
      };
    } catch (error) {
      this.logger.error(`Error getting loyalty balance: ${error.message}`);
      return {
        points: 0,
        wallet_equivalent: 0,
        conversion_rate: this.CONVERSION_RATE,
        can_convert: false,
        minimum_points: this.MINIMUM_CONVERSION_POINTS,
        formatted_message: '❌ Error fetching loyalty points.',
      };
    }
  }

  /**
   * Get loyalty transaction history with formatting
   */
  async getLoyaltyTransactions(
    token: string,
    limit: number = 10,
  ): Promise<{
    success: boolean;
    transactions: LoyaltyTransaction[];
    summary: string;
  }> {
    try {
      const result = await this.phpLoyaltyService.getLoyaltyTransactions(token, limit);

      if (!result.success || !result.transactions) {
        return {
          success: false,
          transactions: [],
          summary: '❌ No loyalty transactions found.',
        };
      }

      const transactions = result.transactions.map(tx => this.formatTransaction(tx));
      const summary = this.formatTransactionSummary(transactions);

      return {
        success: true,
        transactions,
        summary,
      };
    } catch (error) {
      this.logger.error(`Error getting loyalty transactions: ${error.message}`);
      return {
        success: false,
        transactions: [],
        summary: '❌ Error fetching transaction history.',
      };
    }
  }

  /**
   * Convert loyalty points to wallet with validation
   */
  async convertPointsToWallet(
    token: string,
    points: number,
  ): Promise<ConversionResult> {
    try {
      // Validate conversion amount
      if (points < this.MINIMUM_CONVERSION_POINTS) {
        return {
          success: false,
          points_converted: 0,
          wallet_credited: 0,
          new_balance: 0,
          message: `❌ Minimum ${this.MINIMUM_CONVERSION_POINTS} points required to convert. You tried to convert ${points} points.`,
        };
      }

      // Get current balance first
      const balanceResult = await this.phpLoyaltyService.getLoyaltyPoints(token);
      const currentPoints = balanceResult.points?.points || 0;
      
      if (!balanceResult.success || currentPoints < points) {
        return {
          success: false,
          points_converted: 0,
          wallet_credited: 0,
          new_balance: currentPoints,
          message: `❌ Insufficient loyalty points. You have ${currentPoints} points, but tried to convert ${points} points.`,
        };
      }

      // Perform conversion
      const result = await this.phpLoyaltyService.convertPointsToWallet(token, points);

      if (!result.success) {
        return {
          success: false,
          points_converted: 0,
          wallet_credited: 0,
          new_balance: currentPoints,
          message: result.message || '❌ Conversion failed. Please try again.',
        };
      }

      const walletCredited = this.calculateWalletValue(points);
      const newBalance = currentPoints - points;

      return {
        success: true,
        points_converted: points,
        wallet_credited: walletCredited,
        new_balance: newBalance,
        message: this.formatConversionSuccess(points, walletCredited, newBalance),
      };
    } catch (error) {
      this.logger.error(`Error converting points: ${error.message}`);
      return {
        success: false,
        points_converted: 0,
        wallet_credited: 0,
        new_balance: 0,
        message: '❌ Error processing conversion. Please try again.',
      };
    }
  }

  /**
   * Generate loyalty suggestions for user
   */
  async generateLoyaltySuggestions(token: string): Promise<string[]> {
    const balance = await this.getLoyaltyBalance(token);
    const suggestions: string[] = [];

    if (balance.points === 0) {
      suggestions.push('🎁 Start earning loyalty points with your first order!');
      suggestions.push(`📦 Each order earns you ${this.POINTS_PER_ORDER} loyalty points`);
    } else if (balance.points < this.MINIMUM_CONVERSION_POINTS) {
      const needed = this.MINIMUM_CONVERSION_POINTS - balance.points;
      suggestions.push(`💡 You need ${needed} more points to convert to wallet credit`);
      suggestions.push(`📦 Place ${Math.ceil(needed / this.POINTS_PER_ORDER)} more orders to unlock conversion`);
    } else if (balance.can_convert) {
      suggestions.push('✨ You can convert your points to wallet credit now!');
      suggestions.push(`💰 ${balance.points} points = ₹${balance.wallet_equivalent}`);
    }

    if (balance.points >= this.MINIMUM_CONVERSION_POINTS * 2) {
      suggestions.push('🌟 Great job! You have significant loyalty points accumulated');
    }

    return suggestions;
  }

  /**
   * Calculate wallet value from points
   */
  private calculateWalletValue(points: number): number {
    return Math.floor((points / this.CONVERSION_RATE) * 100) / 100; // Round to 2 decimals
  }

  /**
   * Check if user can convert points
   */
  private canConvertPoints(points: number): boolean {
    return points >= this.MINIMUM_CONVERSION_POINTS;
  }

  /**
   * Format balance message for display
   */
  private formatBalanceMessage(
    points: number,
    walletEquivalent: number,
    canConvert: boolean,
  ): string {
    let message = `🎁 *Loyalty Points Balance*\n\n`;
    message += `💎 Points: *${points}*\n`;
    message += `💰 Wallet Value: *₹${walletEquivalent}*\n`;
    message += `📊 Conversion Rate: ${this.CONVERSION_RATE} points = ₹1\n\n`;

    if (canConvert) {
      message += `✅ You can convert your points to wallet credit!\n`;
      message += `💡 Type the number of points to convert (min: ${this.MINIMUM_CONVERSION_POINTS})`;
    } else {
      const needed = this.MINIMUM_CONVERSION_POINTS - points;
      message += `⚠️ Minimum ${this.MINIMUM_CONVERSION_POINTS} points required to convert\n`;
      message += `📈 You need ${needed} more points`;
    }

    return message;
  }

  /**
   * Format transaction for display
   */
  private formatTransaction(tx: any): LoyaltyTransaction {
    const type = this.determineTransactionType(tx);
    const points = Math.abs(parseInt(tx.credit || tx.debit || 0));
    
    return {
      id: tx.id,
      type,
      points,
      description: tx.transaction_type || 'Loyalty points',
      date: tx.created_at,
      formatted: this.formatTransactionLine(type, points, tx.created_at),
    };
  }

  /**
   * Determine transaction type
   */
  private determineTransactionType(tx: any): 'earned' | 'spent' | 'converted' {
    if (tx.transaction_type?.includes('convert') || tx.transaction_type?.includes('loyalty_point_to_wallet')) {
      return 'converted';
    }
    if (tx.credit && parseInt(tx.credit) > 0) {
      return 'earned';
    }
    return 'spent';
  }

  /**
   * Format single transaction line
   */
  private formatTransactionLine(type: string, points: number, date: string): string {
    const icon = type === 'earned' ? '➕' : type === 'spent' ? '➖' : '🔄';
    const action = type === 'earned' ? 'Earned' : type === 'spent' ? 'Spent' : 'Converted';
    const dateStr = new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
    
    return `${icon} ${action} *${points}* points • ${dateStr}`;
  }

  /**
   * Format transaction summary
   */
  private formatTransactionSummary(transactions: LoyaltyTransaction[]): string {
    let summary = `📜 *Loyalty Transaction History*\n\n`;
    
    if (transactions.length === 0) {
      summary += `No transactions yet. Start earning points with your first order! 🎁`;
      return summary;
    }

    transactions.forEach(tx => {
      summary += `${tx.formatted}\n`;
    });

    const totalEarned = transactions
      .filter(tx => tx.type === 'earned')
      .reduce((sum, tx) => sum + tx.points, 0);
    
    const totalSpent = transactions
      .filter(tx => tx.type === 'spent' || tx.type === 'converted')
      .reduce((sum, tx) => sum + tx.points, 0);

    summary += `\n📊 *Summary*\n`;
    summary += `➕ Total Earned: ${totalEarned} points\n`;
    if (totalSpent > 0) {
      summary += `➖ Total Used: ${totalSpent} points\n`;
    }

    return summary;
  }

  /**
   * Format conversion success message
   */
  private formatConversionSuccess(
    points: number,
    walletCredited: number,
    newBalance: number,
  ): string {
    let message = `✅ *Conversion Successful!*\n\n`;
    message += `🔄 Points Converted: *${points}*\n`;
    message += `💰 Wallet Credited: *₹${walletCredited}*\n`;
    message += `💎 Remaining Points: *${newBalance}*\n\n`;
    message += `Your wallet has been updated! 🎉`;
    
    return message;
  }
}
