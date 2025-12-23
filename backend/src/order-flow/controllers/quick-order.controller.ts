import { Controller, Get, Query, Logger, Param } from '@nestjs/common';
import { QuickOrderResponseService } from '../services/quick-order-response.service';

/**
 * Quick Order Status Controller
 * 
 * Provides fast order status endpoints for:
 * - Exotel IVR integration (voice responses)
 * - WhatsApp quick replies
 * - SMS auto-responses
 * 
 * Response times: < 100ms from cache, < 500ms worst case
 */
@Controller('order/quick')
export class QuickOrderController {
  private readonly logger = new Logger(QuickOrderController.name);

  constructor(
    private readonly quickOrderService: QuickOrderResponseService,
  ) {}

  /**
   * GET /api/order/quick/status/:orderId
   * Get quick order status by order ID
   * 
   * Used by: Exotel IVR, WhatsApp, SMS
   */
  @Get('status/:orderId')
  async getOrderStatus(@Param('orderId') orderId: string) {
    const startTime = Date.now();
    const result = await this.quickOrderService.getQuickOrderStatus(parseInt(orderId));
    
    this.logger.log(`📞 Quick status for #${orderId}: ${result.status || 'not found'} (${Date.now() - startTime}ms)`);
    
    return {
      ...result,
      responseTimeMs: Date.now() - startTime,
    };
  }

  /**
   * GET /api/order/quick/phone?phone=+919xxxxxxxxx
   * Get latest order status by phone number
   * 
   * Used by: Exotel IVR (caller ID lookup), WhatsApp (phone-based)
   */
  @Get('phone')
  async getOrderByPhone(@Query('phone') phone: string) {
    const startTime = Date.now();
    const result = await this.quickOrderService.getQuickOrderByPhone(phone);
    
    this.logger.log(`📞 Quick lookup for ${phone}: ${result.orderId ? `#${result.orderId}` : 'not found'} (${Date.now() - startTime}ms)`);
    
    return {
      ...result,
      responseTimeMs: Date.now() - startTime,
    };
  }

  /**
   * GET /api/order/quick/active?phone=+919xxxxxxxxx
   * Get all active orders for a phone number
   * 
   * Used by: Exotel IVR menu (list active orders)
   */
  @Get('active')
  async getActiveOrders(@Query('phone') phone: string) {
    const startTime = Date.now();
    const result = await this.quickOrderService.getActiveOrdersForPhone(phone);
    
    this.logger.log(`📞 Active orders for ${phone}: ${result.orders.length} orders (${Date.now() - startTime}ms)`);
    
    return {
      ...result,
      responseTimeMs: Date.now() - startTime,
    };
  }

  /**
   * GET /api/order/quick/voice/:orderId
   * Get voice-optimized response for IVR
   * 
   * Returns: { tts: "spoken text", dtmf_options: [...] }
   */
  @Get('voice/:orderId')
  async getVoiceResponse(@Param('orderId') orderId: string) {
    const startTime = Date.now();
    const result = await this.quickOrderService.getQuickOrderStatus(parseInt(orderId));
    
    // Format for Exotel TTS
    return {
      success: result.success,
      tts: result.spokenResponse,
      status: result.status,
      dtmf_options: result.success ? [
        { digit: '1', action: 'track_live', description: 'Press 1 to track live location' },
        { digit: '2', action: 'call_delivery', description: 'Press 2 to call delivery partner' },
        { digit: '3', action: 'call_support', description: 'Press 3 for support' },
        { digit: '0', action: 'main_menu', description: 'Press 0 for main menu' },
      ] : [
        { digit: '1', action: 'retry', description: 'Press 1 to try again' },
        { digit: '0', action: 'main_menu', description: 'Press 0 for main menu' },
      ],
      responseTimeMs: Date.now() - startTime,
    };
  }

  /**
   * GET /api/order/quick/voice/phone/:phone
   * Get voice response by phone number (no order ID needed)
   */
  @Get('voice/phone/:phone')
  async getVoiceResponseByPhone(@Param('phone') phone: string) {
    const startTime = Date.now();
    const result = await this.quickOrderService.getQuickOrderByPhone(phone);
    
    return {
      success: result.success,
      tts: result.spokenResponse,
      orderId: result.orderId,
      status: result.status,
      dtmf_options: result.success ? [
        { digit: '1', action: 'track_live', description: 'Press 1 to track live location' },
        { digit: '2', action: 'call_delivery', description: 'Press 2 to call delivery partner' },
        { digit: '3', action: 'new_order', description: 'Press 3 to place new order' },
        { digit: '0', action: 'main_menu', description: 'Press 0 for main menu' },
      ] : [
        { digit: '1', action: 'new_order', description: 'Press 1 to place new order' },
        { digit: '2', action: 'support', description: 'Press 2 for support' },
        { digit: '0', action: 'main_menu', description: 'Press 0 for main menu' },
      ],
      responseTimeMs: Date.now() - startTime,
    };
  }
}
