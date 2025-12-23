import { Injectable, Logger } from '@nestjs/common';

/**
 * Urgency Trigger Service
 * 
 * Creates ethical FOMO (Fear of Missing Out) without manipulation:
 * - Stock-based urgency (real inventory data)
 * - Time-based urgency (delivery cutoffs)
 * - Demand-based urgency (actual viewing/ordering activity)
 * - Event-based urgency (sales, festivals)
 * 
 * Key principle: All urgency signals must be TRUE and VERIFIABLE
 */

export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface UrgencySignal {
  type: 'stock' | 'time' | 'demand' | 'event' | 'price';
  level: UrgencyLevel;
  message: string;
  messageHi: string; // Hindi version
  expiresAt?: Date;
  data?: Record<string, any>;
}

export interface StockData {
  available: number;
  reserved: number;
  reorderLevel: number;
  avgDailySales: number;
}

export interface DeliverySlot {
  cutoffTime: Date;
  deliveryDate: Date;
  slotName: string;
  slotsRemaining?: number;
}

@Injectable()
export class UrgencyTriggerService {
  private readonly logger = new Logger(UrgencyTriggerService.name);

  /**
   * Get all applicable urgency signals for an item
   */
  getUrgencySignals(params: {
    itemId: number;
    stock?: StockData;
    deliverySlots?: DeliverySlot[];
    viewerCount?: number;
    recentOrders?: number;
    activePromo?: { name: string; endsAt: Date };
    originalPrice?: number;
    currentPrice?: number;
  }): UrgencySignal[] {
    const signals: UrgencySignal[] = [];

    // Stock urgency
    if (params.stock) {
      const stockSignal = this.getStockUrgency(params.stock);
      if (stockSignal) signals.push(stockSignal);
    }

    // Time/delivery urgency
    if (params.deliverySlots && params.deliverySlots.length > 0) {
      const timeSignal = this.getTimeUrgency(params.deliverySlots);
      if (timeSignal) signals.push(timeSignal);
    }

    // Demand urgency
    if (params.viewerCount || params.recentOrders) {
      const demandSignal = this.getDemandUrgency(
        params.viewerCount || 0,
        params.recentOrders || 0
      );
      if (demandSignal) signals.push(demandSignal);
    }

    // Event/promo urgency
    if (params.activePromo) {
      const eventSignal = this.getEventUrgency(params.activePromo);
      if (eventSignal) signals.push(eventSignal);
    }

    // Price urgency (discount ending)
    if (params.originalPrice && params.currentPrice && params.currentPrice < params.originalPrice) {
      const priceSignal = this.getPriceUrgency(params.originalPrice, params.currentPrice);
      if (priceSignal) signals.push(priceSignal);
    }

    // Sort by urgency level
    const levelOrder: Record<UrgencyLevel, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      none: 1,
    };

    return signals.sort((a, b) => levelOrder[b.level] - levelOrder[a.level]);
  }

  /**
   * Stock-based urgency
   */
  private getStockUrgency(stock: StockData): UrgencySignal | null {
    const effectiveStock = stock.available - stock.reserved;
    const daysOfStock = stock.avgDailySales > 0 
      ? effectiveStock / stock.avgDailySales 
      : 999;

    if (effectiveStock <= 0) {
      return {
        type: 'stock',
        level: 'critical',
        message: 'Out of stock! Adding to waitlist...',
        messageHi: 'Stock खत्म! Waitlist में add कर रहे हैं...',
        data: { available: 0 },
      };
    }

    if (effectiveStock <= 3) {
      return {
        type: 'stock',
        level: 'critical',
        message: `Only ${effectiveStock} left! Order now`,
        messageHi: `सिर्फ ${effectiveStock} बचे हैं! अभी order करें`,
        data: { available: effectiveStock },
      };
    }

    if (effectiveStock <= 10 || daysOfStock < 2) {
      return {
        type: 'stock',
        level: 'high',
        message: `Low stock - ${effectiveStock} remaining`,
        messageHi: `Stock कम है - ${effectiveStock} बचे हैं`,
        data: { available: effectiveStock },
      };
    }

    if (effectiveStock <= stock.reorderLevel || daysOfStock < 5) {
      return {
        type: 'stock',
        level: 'medium',
        message: 'Selling fast! Limited stock',
        messageHi: 'तेज़ी से बिक रहा है! Limited stock',
        data: { available: effectiveStock },
      };
    }

    return null; // No urgency needed
  }

  /**
   * Time-based urgency (delivery cutoffs)
   */
  private getTimeUrgency(slots: DeliverySlot[]): UrgencySignal | null {
    const now = new Date();
    const nextSlot = slots.find(s => s.cutoffTime > now);

    if (!nextSlot) {
      return {
        type: 'time',
        level: 'high',
        message: 'No delivery slots available today',
        messageHi: 'आज के लिए delivery slot उपलब्ध नहीं है',
      };
    }

    const minutesToCutoff = Math.floor(
      (nextSlot.cutoffTime.getTime() - now.getTime()) / (1000 * 60)
    );

    if (minutesToCutoff <= 15) {
      return {
        type: 'time',
        level: 'critical',
        message: `Order in ${minutesToCutoff} min for ${nextSlot.slotName} delivery!`,
        messageHi: `${nextSlot.slotName} delivery के लिए ${minutesToCutoff} min में order करें!`,
        expiresAt: nextSlot.cutoffTime,
        data: { minutesLeft: minutesToCutoff, slot: nextSlot.slotName },
      };
    }

    if (minutesToCutoff <= 30) {
      return {
        type: 'time',
        level: 'high',
        message: `${minutesToCutoff} minutes left for ${nextSlot.slotName} delivery`,
        messageHi: `${nextSlot.slotName} delivery के लिए ${minutesToCutoff} minutes बाकी`,
        expiresAt: nextSlot.cutoffTime,
        data: { minutesLeft: minutesToCutoff, slot: nextSlot.slotName },
      };
    }

    if (minutesToCutoff <= 60) {
      return {
        type: 'time',
        level: 'medium',
        message: `Order soon for ${nextSlot.slotName} delivery`,
        messageHi: `${nextSlot.slotName} delivery के लिए जल्दी order करें`,
        expiresAt: nextSlot.cutoffTime,
        data: { minutesLeft: minutesToCutoff, slot: nextSlot.slotName },
      };
    }

    // Slot availability
    if (nextSlot.slotsRemaining !== undefined && nextSlot.slotsRemaining < 10) {
      return {
        type: 'time',
        level: 'medium',
        message: `Only ${nextSlot.slotsRemaining} delivery slots left for ${nextSlot.slotName}`,
        messageHi: `${nextSlot.slotName} के लिए सिर्फ ${nextSlot.slotsRemaining} delivery slots बचे`,
        data: { slotsLeft: nextSlot.slotsRemaining },
      };
    }

    return null;
  }

  /**
   * Demand-based urgency (social proof + scarcity)
   */
  private getDemandUrgency(viewerCount: number, recentOrders: number): UrgencySignal | null {
    // High demand signal
    if (recentOrders >= 20) {
      return {
        type: 'demand',
        level: 'high',
        message: `🔥 ${recentOrders} orders in last hour!`,
        messageHi: `🔥 पिछले 1 घंटे में ${recentOrders} orders!`,
        data: { recentOrders },
      };
    }

    if (recentOrders >= 10) {
      return {
        type: 'demand',
        level: 'medium',
        message: `Popular! ${recentOrders} recent orders`,
        messageHi: `Popular! ${recentOrders} हाल के orders`,
        data: { recentOrders },
      };
    }

    // Viewers watching
    if (viewerCount >= 10) {
      return {
        type: 'demand',
        level: 'medium',
        message: `${viewerCount} people viewing this now`,
        messageHi: `${viewerCount} लोग अभी यह देख रहे हैं`,
        data: { viewers: viewerCount },
      };
    }

    if (viewerCount >= 5) {
      return {
        type: 'demand',
        level: 'low',
        message: `${viewerCount} others are looking at this`,
        messageHi: `${viewerCount} और लोग यह देख रहे हैं`,
        data: { viewers: viewerCount },
      };
    }

    return null;
  }

  /**
   * Event-based urgency (sales, festivals)
   */
  private getEventUrgency(promo: { name: string; endsAt: Date }): UrgencySignal | null {
    const now = new Date();
    const hoursLeft = Math.floor(
      (promo.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    if (hoursLeft <= 0) {
      return null; // Promo ended
    }

    if (hoursLeft <= 2) {
      return {
        type: 'event',
        level: 'critical',
        message: `⏰ ${promo.name} ends in ${hoursLeft}h! Don't miss out`,
        messageHi: `⏰ ${promo.name} ${hoursLeft} घंटे में खत्म! मौका न चूकें`,
        expiresAt: promo.endsAt,
        data: { promoName: promo.name, hoursLeft },
      };
    }

    if (hoursLeft <= 12) {
      return {
        type: 'event',
        level: 'high',
        message: `${promo.name} - Only ${hoursLeft} hours left!`,
        messageHi: `${promo.name} - सिर्फ ${hoursLeft} घंटे बाकी!`,
        expiresAt: promo.endsAt,
        data: { promoName: promo.name, hoursLeft },
      };
    }

    if (hoursLeft <= 48) {
      return {
        type: 'event',
        level: 'medium',
        message: `${promo.name} ending soon`,
        messageHi: `${promo.name} जल्द खत्म हो रहा है`,
        expiresAt: promo.endsAt,
        data: { promoName: promo.name, hoursLeft },
      };
    }

    return {
      type: 'event',
      level: 'low',
      message: `${promo.name} is on!`,
      messageHi: `${promo.name} चल रहा है!`,
      expiresAt: promo.endsAt,
      data: { promoName: promo.name },
    };
  }

  /**
   * Price-based urgency (discount)
   */
  private getPriceUrgency(originalPrice: number, currentPrice: number): UrgencySignal | null {
    const discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    const savings = originalPrice - currentPrice;

    if (discountPercent >= 50) {
      return {
        type: 'price',
        level: 'high',
        message: `🎉 ${discountPercent}% OFF! Save ₹${savings}`,
        messageHi: `🎉 ${discountPercent}% छूट! ₹${savings} बचाएं`,
        data: { discountPercent, savings },
      };
    }

    if (discountPercent >= 25) {
      return {
        type: 'price',
        level: 'medium',
        message: `${discountPercent}% discount - Save ₹${savings}`,
        messageHi: `${discountPercent}% छूट - ₹${savings} बचाएं`,
        data: { discountPercent, savings },
      };
    }

    if (discountPercent >= 10) {
      return {
        type: 'price',
        level: 'low',
        message: `${discountPercent}% off today`,
        messageHi: `आज ${discountPercent}% छूट`,
        data: { discountPercent, savings },
      };
    }

    return null;
  }

  /**
   * Get the most important urgency signal
   */
  getPrimaryUrgency(params: Parameters<typeof this.getUrgencySignals>[0]): UrgencySignal | null {
    const signals = this.getUrgencySignals(params);
    return signals.length > 0 ? signals[0] : null;
  }

  /**
   * Format urgency for display in conversation
   */
  formatForConversation(signal: UrgencySignal, language: 'en' | 'hi' = 'hi'): string {
    const levelEmoji: Record<UrgencyLevel, string> = {
      critical: '🚨',
      high: '⚡',
      medium: '📢',
      low: '💡',
      none: '',
    };

    const message = language === 'hi' ? signal.messageHi : signal.message;
    const emoji = levelEmoji[signal.level];

    return `${emoji} ${message}`.trim();
  }
}
