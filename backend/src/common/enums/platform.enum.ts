/**
 * Supported messaging platforms (Multi-Channel Architecture)
 * 
 * Each platform has a corresponding:
 * - Entry point (webhook/websocket)
 * - Provider (for sending messages)
 * - Capabilities (buttons, media, voice, etc.)
 */
export enum Platform {
  WHATSAPP = 'whatsapp',     // Meta Business API
  RCS = 'rcs',               // Rich Communication Services (Jio/Airtel)
  TELEGRAM = 'telegram',     // Telegram Bot API
  WEB = 'web',               // Web Chat (WebSocket)
  SMS = 'sms',               // SMS (Twilio/MSG91)
  MOBILE_APP = 'app',        // Mobile App (Push + API)
  VOICE = 'voice',           // IVR / Voice Call
  INSTAGRAM = 'instagram',   // Instagram Direct API
}

/**
 * Order status from PHP backend
 */
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  PICKED_UP = 'picked_up',
  HANDOVER = 'handover',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

/**
 * Payment methods supported
 */
export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  DIGITAL_PAYMENT = 'digital_payment',
  WALLET = 'wallet',
  OFFLINE_PAYMENT = 'offline_payment',
}

/**
 * Payment status
 */
export enum PaymentStatus {
  PAID = 'paid',
  UNPAID = 'unpaid',
  PARTIAL = 'partial_paid',
}
