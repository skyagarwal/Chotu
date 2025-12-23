/**
 * Value Proposition Service
 * 
 * Calculates and communicates why Mangwale pricing is better
 * than competitors (Zomato, Swiggy)
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ValueProposition {
  ourPricing: {
    itemsTotal: number;
    deliveryFee: number;
    packagingFee: number;
    platformFee: number;
    tax: number;
    total: number;
  };
  competitorEstimate: {
    itemsTotal: number;
    deliveryFee: number;
    packagingFee: number;
    platformFee: number;
    surgeFee: number;
    tax: number;
    total: number;
  };
  savings: number;
  savingsPercent: number;
  reasons: ValueReason[];
  displayMessage: string;
  displayMessageHindi: string;
}

export interface ValueReason {
  key: string;
  ourValue: string;
  theirValue: string;
  savingsAmount: number;
}

@Injectable()
export class ValuePropositionService {
  private readonly logger = new Logger(ValuePropositionService.name);

  // Competitor pricing estimates (based on typical Zomato/Swiggy pricing)
  private readonly competitorRates = {
    deliveryFeeBase: 40,           // Base delivery fee
    deliveryFeePerKm: 15,          // Per km charge
    deliveryFeeMax: 80,            // Max delivery fee
    packagingPerItem: 10,          // Per item packaging
    platformFee: 5,                // Platform fee
    surgeMultiplier: 1.3,          // Peak hour surge (30% more)
    smallOrderFee: 30,             // Fee for orders under ₹149
    rainSurcharge: 20,             // Bad weather surcharge
  };

  // Our pricing
  private readonly ourRates = {
    deliveryFeeBase: 30,           // Base delivery fee
    deliveryFeePerKm: 10,          // Per km charge
    deliveryFeeMax: 60,            // Max delivery fee
    packagingFee: 0,               // Free packaging
    platformFee: 0,                // No platform fee
    smallOrderFee: 0,              // No small order fee
    surgeMultiplier: 1.0,          // No surge pricing
    rainSurcharge: 0,              // No weather surcharge
  };

  /**
   * Calculate value proposition for an order
   */
  calculateValueProposition(
    itemsTotal: number,
    deliveryDistance: number,
    itemCount: number,
    options: {
      isPeakHour?: boolean;
      isBadWeather?: boolean;
      isSmallOrder?: boolean;
    } = {},
  ): ValueProposition {
    // Our pricing calculation
    const ourDeliveryFee = Math.min(
      Math.max(deliveryDistance * this.ourRates.deliveryFeePerKm, this.ourRates.deliveryFeeBase),
      this.ourRates.deliveryFeeMax,
    );
    const ourPackaging = this.ourRates.packagingFee;
    const ourPlatform = this.ourRates.platformFee;
    const ourSubtotal = itemsTotal + ourDeliveryFee + ourPackaging + ourPlatform;
    const ourTax = Math.round(ourSubtotal * 0.05);  // 5% GST
    const ourTotal = Math.round(ourSubtotal + ourTax);

    // Competitor pricing estimate
    let competitorDeliveryFee = Math.min(
      Math.max(deliveryDistance * this.competitorRates.deliveryFeePerKm, this.competitorRates.deliveryFeeBase),
      this.competitorRates.deliveryFeeMax,
    );
    
    // Apply surge pricing
    if (options.isPeakHour) {
      competitorDeliveryFee = Math.round(competitorDeliveryFee * this.competitorRates.surgeMultiplier);
    }
    
    let surgeFee = 0;
    if (options.isBadWeather) {
      surgeFee = this.competitorRates.rainSurcharge;
    }
    
    const competitorPackaging = itemCount * this.competitorRates.packagingPerItem;
    const competitorPlatform = this.competitorRates.platformFee;
    const smallOrderFee = (options.isSmallOrder && itemsTotal < 149) ? this.competitorRates.smallOrderFee : 0;
    
    const competitorSubtotal = itemsTotal + competitorDeliveryFee + competitorPackaging + 
                               competitorPlatform + surgeFee + smallOrderFee;
    const competitorTax = Math.round(competitorSubtotal * 0.05);
    const competitorTotal = Math.round(competitorSubtotal + competitorTax);

    // Calculate savings
    const savings = competitorTotal - ourTotal;
    const savingsPercent = Math.round((savings / competitorTotal) * 100);

    // Build reasons
    const reasons: ValueReason[] = [];

    if (ourDeliveryFee < competitorDeliveryFee) {
      reasons.push({
        key: 'delivery_fee',
        ourValue: `₹${ourDeliveryFee}`,
        theirValue: `₹${competitorDeliveryFee}`,
        savingsAmount: competitorDeliveryFee - ourDeliveryFee,
      });
    }

    if (competitorPackaging > 0) {
      reasons.push({
        key: 'packaging_fee',
        ourValue: 'Free',
        theirValue: `₹${competitorPackaging}`,
        savingsAmount: competitorPackaging,
      });
    }

    if (competitorPlatform > 0) {
      reasons.push({
        key: 'platform_fee',
        ourValue: 'None',
        theirValue: `₹${competitorPlatform}`,
        savingsAmount: competitorPlatform,
      });
    }

    if (surgeFee > 0) {
      reasons.push({
        key: 'surge_fee',
        ourValue: 'None',
        theirValue: `₹${surgeFee}`,
        savingsAmount: surgeFee,
      });
    }

    if (smallOrderFee > 0) {
      reasons.push({
        key: 'small_order_fee',
        ourValue: 'None',
        theirValue: `₹${smallOrderFee}`,
        savingsAmount: smallOrderFee,
      });
    }

    // Add local business benefit
    reasons.push({
      key: 'local_business',
      ourValue: 'Support Local Nashik',
      theirValue: 'Corporate chains',
      savingsAmount: 0,
    });

    return {
      ourPricing: {
        itemsTotal,
        deliveryFee: ourDeliveryFee,
        packagingFee: ourPackaging,
        platformFee: ourPlatform,
        tax: ourTax,
        total: ourTotal,
      },
      competitorEstimate: {
        itemsTotal,
        deliveryFee: competitorDeliveryFee,
        packagingFee: competitorPackaging,
        platformFee: competitorPlatform,
        surgeFee,
        tax: competitorTax,
        total: competitorTotal,
      },
      savings,
      savingsPercent,
      reasons,
      displayMessage: this.generateDisplayMessage(savings, savingsPercent, reasons),
      displayMessageHindi: this.generateHindiMessage(savings, savingsPercent, reasons),
    };
  }

  /**
   * Generate English display message
   */
  private generateDisplayMessage(
    savings: number,
    savingsPercent: number,
    reasons: ValueReason[],
  ): string {
    if (savings > 100) {
      return `🎉 Amazing! You save ₹${savings} (${savingsPercent}%) compared to other apps! No platform fee, no packaging charges, just honest pricing.`;
    } else if (savings > 50) {
      return `💰 Great choice! You save ₹${savings} with Mangwale. We don't charge packaging or platform fees!`;
    } else if (savings > 20) {
      return `✨ You save ₹${savings} with direct restaurant pricing. No hidden charges!`;
    } else if (savings > 0) {
      return `✅ Honest pricing! Same food, better value. You save ₹${savings}.`;
    }
    return `✅ Direct restaurant pricing with no hidden fees. Supporting local Nashik businesses!`;
  }

  /**
   * Generate Hindi/Hinglish display message
   */
  private generateHindiMessage(
    savings: number,
    savingsPercent: number,
    reasons: ValueReason[],
  ): string {
    if (savings > 100) {
      return `🎉 Waaah! Mangwale se order karke ₹${savings} bachao! Koi platform fee nahi, koi packaging charge nahi - bas seedha hisaab!`;
    } else if (savings > 50) {
      return `💰 Bahut badhiya! ₹${savings} ki savings! Humara delivery charge bhi kam hai aur extra fees bilkul nahi!`;
    } else if (savings > 20) {
      return `✨ ₹${savings} bach gaye! Restaurant ka direct price, koi hidden charges nahi!`;
    } else if (savings > 0) {
      return `✅ Sahi choice! ₹${savings} ki bachat. Honest pricing with no surprises!`;
    }
    return `✅ Restaurant ka direct price! Nashik ka local business support karo!`;
  }

  /**
   * Check if it's currently peak hour (lunch/dinner time)
   */
  isPeakHour(): boolean {
    const hour = new Date().getHours();
    // Lunch: 12-2 PM, Dinner: 7-10 PM
    return (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 22);
  }

  /**
   * Generate comparison table for UI
   */
  generateComparisonTable(proposition: ValueProposition): string {
    const rows = [
      `| Item | Mangwale | Other Apps |`,
      `|------|----------|------------|`,
      `| Items Total | ₹${proposition.ourPricing.itemsTotal} | ₹${proposition.competitorEstimate.itemsTotal} |`,
      `| Delivery Fee | ₹${proposition.ourPricing.deliveryFee} | ₹${proposition.competitorEstimate.deliveryFee} |`,
      `| Packaging | ${proposition.ourPricing.packagingFee === 0 ? 'FREE' : '₹' + proposition.ourPricing.packagingFee} | ₹${proposition.competitorEstimate.packagingFee} |`,
      `| Platform Fee | ${proposition.ourPricing.platformFee === 0 ? 'NONE' : '₹' + proposition.ourPricing.platformFee} | ₹${proposition.competitorEstimate.platformFee} |`,
    ];

    if (proposition.competitorEstimate.surgeFee > 0) {
      rows.push(`| Surge Fee | NONE | ₹${proposition.competitorEstimate.surgeFee} |`);
    }

    rows.push(
      `| Tax (5%) | ₹${proposition.ourPricing.tax} | ₹${proposition.competitorEstimate.tax} |`,
      `| **Total** | **₹${proposition.ourPricing.total}** | **₹${proposition.competitorEstimate.total}** |`,
      `| **You Save** | **₹${proposition.savings}** | - |`,
    );

    return rows.join('\n');
  }

  /**
   * Get quick savings message for order summary
   */
  getQuickSavingsMessage(savings: number): string | null {
    if (savings > 30) {
      return `💰 Aap ₹${savings} bacha rahe ho Mangwale se order karke!`;
    }
    return null;
  }

  /**
   * Answer "Why Mangwale?" questions
   */
  getWhyMangwaleResponse(): string {
    return `🌟 **Mangwale kyun?**

1. **Kam Delivery Charge** - Sirf ₹10/km, minimum ₹30
2. **Zero Platform Fee** - Doosre apps ₹5 charge karte hain
3. **Free Packaging** - Koi extra packaging charge nahi
4. **No Surge Pricing** - Peak hours mein bhi same price
5. **Local Business** - Nashik ka apna, trusted service
6. **Direct Restaurant Pricing** - Koi markup nahi

💡 Average ₹50-100 ki savings every order par!

Seedha hisaab, sahi kaam! 🙏`;
  }
}
