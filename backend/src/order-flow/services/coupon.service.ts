import { Injectable, Logger } from '@nestjs/common';
import { PhpCouponService } from '../../php-integration/services/php-coupon.service';

/**
 * Coupon Service - Layer 2 (Business Logic)
 * Channel-agnostic business rules for coupons and discounts
 * Can be used by WhatsApp, Telegram, Web, Mobile, etc.
 */

export interface CouponDisplay {
  id: number;
  title: string;
  code: string;
  discount_text: string;
  min_purchase_text: string;
  validity: string;
  formatted_message: string;
  is_applicable: boolean;
  reason?: string;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: any;
  discount_amount?: number;
  final_amount?: number;
  message: string;
}

export interface CouponRecommendation {
  best_coupon?: CouponDisplay;
  alternatives: CouponDisplay[];
  message: string;
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(private readonly phpCouponService: PhpCouponService) {}

  /**
   * Get available coupons with formatting
   */
  async getAvailableCoupons(
    token?: string,
    orderAmount?: number,
  ): Promise<{
    success: boolean;
    coupons: CouponDisplay[];
    message: string;
  }> {
    try {
      const result = await this.phpCouponService.getCoupons(token);

      if (!result.success || !result.coupons || result.coupons.length === 0) {
        return {
          success: false,
          coupons: [],
          message: '❌ No coupons available at the moment.',
        };
      }

      // Format and filter coupons
      const coupons = result.coupons
        .filter(coupon => this.isCouponActive(coupon))
        .map(coupon => this.formatCoupon(coupon, orderAmount));

      // Sort by applicability and discount value
      coupons.sort((a, b) => {
        if (a.is_applicable && !b.is_applicable) return -1;
        if (!a.is_applicable && b.is_applicable) return 1;
        return 0;
      });

      return {
        success: true,
        coupons,
        message: this.formatCouponList(coupons),
      };
    } catch (error) {
      this.logger.error(`Error getting coupons: ${error.message}`);
      return {
        success: false,
        coupons: [],
        message: '❌ Error fetching coupons.',
      };
    }
  }

  /**
   * Validate and apply coupon with business rules
   */
  async validateAndApplyCoupon(
    token: string,
    code: string,
    orderAmount: number,
    storeId?: number,
  ): Promise<CouponValidation> {
    try {
      // First get coupon details
      const couponResult = await this.phpCouponService.getCouponByCode(code);
      
      if (!couponResult.success || !couponResult.coupon) {
        return {
          valid: false,
          message: `❌ Coupon code "${code}" not found or expired.`,
        };
      }

      const coupon = couponResult.coupon;

      // Check if coupon is active
      if (!this.isCouponActive(coupon)) {
        return {
          valid: false,
          message: `❌ This coupon has expired.`,
        };
      }

      // Check minimum purchase requirement
      if (orderAmount < coupon.min_purchase) {
        return {
          valid: false,
          message: `❌ Minimum order amount of ₹${coupon.min_purchase} required. Your order: ₹${orderAmount}`,
        };
      }

      // Apply coupon via PHP backend
      const applyResult = await this.phpCouponService.applyCoupon(
        token,
        code,
        orderAmount,
        storeId,
      );

      if (!applyResult.success) {
        return {
          valid: false,
          message: applyResult.message || '❌ Coupon could not be applied.',
        };
      }

      // Calculate discount
      const discountAmount = this.calculateDiscount(coupon, orderAmount);
      const finalAmount = Math.max(0, orderAmount - discountAmount);

      return {
        valid: true,
        coupon,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        message: this.formatApplySuccess(code, discountAmount, finalAmount),
      };
    } catch (error) {
      this.logger.error(`Error applying coupon: ${error.message}`);
      return {
        valid: false,
        message: '❌ Error applying coupon. Please try again.',
      };
    }
  }

  /**
   * Get best coupon recommendation for order amount
   */
  async recommendCoupon(
    token: string,
    orderAmount: number,
  ): Promise<CouponRecommendation> {
    try {
      const result = await this.getAvailableCoupons(token, orderAmount);

      if (!result.success || result.coupons.length === 0) {
        return {
          alternatives: [],
          message: '❌ No coupons available for this order.',
        };
      }

      // Filter applicable coupons
      const applicable = result.coupons.filter(c => c.is_applicable);

      if (applicable.length === 0) {
        const nearest = this.findNearestCoupon(result.coupons, orderAmount);
        return {
          alternatives: result.coupons,
          message: nearest
            ? `💡 Add ₹${nearest.amount_needed} more to unlock "${nearest.coupon.code}" coupon!`
            : '⚠️ No coupons applicable for this order amount.',
        };
      }

      // Find best coupon (highest discount)
      const bestCoupon = this.findBestCoupon(applicable, orderAmount);

      return {
        best_coupon: bestCoupon,
        alternatives: applicable.filter(c => c.id !== bestCoupon.id),
        message: this.formatRecommendation(bestCoupon, orderAmount),
      };
    } catch (error) {
      this.logger.error(`Error recommending coupon: ${error.message}`);
      return {
        alternatives: [],
        message: '❌ Error finding coupons.',
      };
    }
  }

  /**
   * Get coupons by type (first_order, free_delivery, etc.)
   */
  async getCouponsByType(
    token: string,
    type: string,
  ): Promise<{
    success: boolean;
    coupons: CouponDisplay[];
    message: string;
  }> {
    try {
      const result = await this.phpCouponService.getCouponsByType(token, type);

      if (!result.success || !result.coupons || result.coupons.length === 0) {
        return {
          success: false,
          coupons: [],
          message: `❌ No ${type} coupons available.`,
        };
      }

      const coupons = result.coupons
        .filter(coupon => this.isCouponActive(coupon))
        .map(coupon => this.formatCoupon(coupon));

      return {
        success: true,
        coupons,
        message: this.formatCouponList(coupons),
      };
    } catch (error) {
      this.logger.error(`Error getting coupons by type: ${error.message}`);
      return {
        success: false,
        coupons: [],
        message: '❌ Error fetching coupons.',
      };
    }
  }

  /**
   * Calculate discount amount based on coupon
   */
  private calculateDiscount(coupon: any, orderAmount: number): number {
    let discount = 0;

    if (coupon.discount_type === 'percentage') {
      discount = (orderAmount * coupon.discount) / 100;
      
      // Apply max discount cap if exists
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      // Fixed amount discount
      discount = coupon.discount;
    }

    // Ensure discount doesn't exceed order amount
    return Math.min(discount, orderAmount);
  }

  /**
   * Check if coupon is currently active
   */
  private isCouponActive(coupon: any): boolean {
    if (coupon.status !== 1) return false;

    const now = new Date();
    const startDate = new Date(coupon.start_date);
    const expireDate = new Date(coupon.expire_date);

    return now >= startDate && now <= expireDate;
  }

  /**
   * Check if coupon is applicable for order amount
   */
  private isCouponApplicable(coupon: any, orderAmount?: number): {
    applicable: boolean;
    reason?: string;
  } {
    if (!orderAmount) {
      return { applicable: true };
    }

    if (orderAmount < coupon.min_purchase) {
      return {
        applicable: false,
        reason: `Min. order ₹${coupon.min_purchase}`,
      };
    }

    return { applicable: true };
  }

  /**
   * Format coupon for display
   */
  private formatCoupon(coupon: any, orderAmount?: number): CouponDisplay {
    const discountText =
      coupon.discount_type === 'percentage'
        ? `${coupon.discount}% OFF${coupon.max_discount ? ` (Max ₹${coupon.max_discount})` : ''}`
        : `₹${coupon.discount} OFF`;

    const minPurchaseText = `Min. order ₹${coupon.min_purchase}`;
    
    const expireDate = new Date(coupon.expire_date);
    const validity = `Valid till ${expireDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;

    const applicability = this.isCouponApplicable(coupon, orderAmount);

    return {
      id: coupon.id,
      title: coupon.title,
      code: coupon.code,
      discount_text: discountText,
      min_purchase_text: minPurchaseText,
      validity,
      formatted_message: this.formatCouponMessage(
        coupon.title,
        coupon.code,
        discountText,
        minPurchaseText,
        validity,
        applicability.applicable,
        applicability.reason,
      ),
      is_applicable: applicability.applicable,
      reason: applicability.reason,
    };
  }

  /**
   * Format single coupon message
   */
  private formatCouponMessage(
    title: string,
    code: string,
    discount: string,
    minPurchase: string,
    validity: string,
    applicable: boolean,
    reason?: string,
  ): string {
    const status = applicable ? '✅' : '⚠️';
    let message = `${status} *${title}*\n`;
    message += `🎫 Code: *${code}*\n`;
    message += `💰 ${discount}\n`;
    message += `📦 ${minPurchase}\n`;
    message += `📅 ${validity}`;
    
    if (!applicable && reason) {
      message += `\n⚠️ ${reason}`;
    }

    return message;
  }

  /**
   * Format coupon list message
   */
  private formatCouponList(coupons: CouponDisplay[]): string {
    let message = `🎫 *Available Coupons*\n\n`;

    if (coupons.length === 0) {
      message += `No coupons available right now. Check back later! 🎁`;
      return message;
    }

    coupons.forEach((coupon, index) => {
      message += `${index + 1}. ${coupon.formatted_message}\n\n`;
    });

    message += `💡 Type the coupon code to apply it to your order`;

    return message;
  }

  /**
   * Format apply success message
   */
  private formatApplySuccess(
    code: string,
    discount: number,
    finalAmount: number,
  ): string {
    let message = `✅ *Coupon Applied Successfully!*\n\n`;
    message += `🎫 Code: *${code}*\n`;
    message += `💰 Discount: *-₹${discount}*\n`;
    message += `💳 Final Amount: *₹${finalAmount}*\n\n`;
    message += `You're saving ₹${discount}! 🎉`;

    return message;
  }

  /**
   * Find best coupon (highest discount)
   */
  private findBestCoupon(coupons: CouponDisplay[], orderAmount: number): CouponDisplay {
    return coupons.reduce((best, current) => {
      // Parse discount amounts for comparison
      const bestDiscount = this.parseDiscountValue(best.discount_text);
      const currentDiscount = this.parseDiscountValue(current.discount_text);
      
      return currentDiscount > bestDiscount ? current : best;
    });
  }

  /**
   * Find nearest coupon (closest min purchase above order amount)
   */
  private findNearestCoupon(
    coupons: CouponDisplay[],
    orderAmount: number,
  ): { coupon: CouponDisplay; amount_needed: number } | null {
    const inapplicable = coupons.filter(c => !c.is_applicable);
    
    if (inapplicable.length === 0) return null;

    let nearest = null;
    let minDiff = Infinity;

    inapplicable.forEach(coupon => {
      const minPurchase = this.parseMinPurchase(coupon.min_purchase_text);
      const diff = minPurchase - orderAmount;
      
      if (diff > 0 && diff < minDiff) {
        minDiff = diff;
        nearest = { coupon, amount_needed: diff };
      }
    });

    return nearest;
  }

  /**
   * Parse discount value from text
   */
  private parseDiscountValue(discountText: string): number {
    const match = discountText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Parse minimum purchase from text
   */
  private parseMinPurchase(minPurchaseText: string): number {
    const match = minPurchaseText.match(/₹(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Format recommendation message
   */
  private formatRecommendation(coupon: CouponDisplay, orderAmount: number): string {
    let message = `💡 *Best Coupon for Your Order*\n\n`;
    message += coupon.formatted_message;
    message += `\n\n✨ This will give you the maximum discount!`;
    
    return message;
  }
}
