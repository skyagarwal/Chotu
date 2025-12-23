import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { NerveService } from '../services/nerve.service';

/**
 * Nerve Controller - AI Voice Call Orchestration
 * 
 * Endpoints for:
 * - Vendor order confirmation calls
 * - Rider assignment calls
 * - Call result callbacks
 * - Voice call history and stats
 * 
 * Integrates with Nerve System on Mercury (192.168.0.151:7100)
 */
@ApiTags('Nerve - AI Voice Calls')
@Controller('exotel/nerve')
export class NerveController {
  private readonly logger = new Logger(NerveController.name);

  constructor(private readonly nerveService: NerveService) {
    this.logger.log('✅ Nerve Controller initialized');
  }

  // ============== HEALTH ==============

  @Get('health')
  @ApiOperation({ summary: 'Nerve System health', description: 'Check AI voice call system health' })
  @ApiResponse({ status: 200, description: 'Nerve System status' })
  async health() {
    return this.nerveService.getHealth();
  }

  // ============== VENDOR CALLS ==============

  @Post('vendor/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Vendor order confirmation', 
    description: 'Initiate AI voice call to vendor for order confirmation' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orderId', 'vendorId', 'vendorPhone', 'vendorName'],
      properties: {
        orderId: { type: 'number', example: 12345 },
        vendorId: { type: 'number', example: 67 },
        vendorPhone: { type: 'string', example: '919876543210' },
        vendorName: { type: 'string', example: 'Sharma Dhaba' },
        orderAmount: { type: 'number', example: 450 },
        itemCount: { type: 'number', example: 3 },
        language: { type: 'string', example: 'hi', default: 'hi' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Call initiated' })
  async confirmVendorOrder(@Body() body: {
    orderId: number;
    vendorId: number;
    vendorPhone: string;
    vendorName: string;
    orderAmount?: number;
    itemCount?: number;
    language?: string;
  }) {
    this.logger.log(`📞 Vendor confirmation call: Order ${body.orderId} → ${body.vendorPhone}`);
    return this.nerveService.confirmVendorOrder(body);
  }

  // ============== RIDER CALLS ==============

  @Post('rider/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Rider assignment call', 
    description: 'Initiate AI voice call to rider for order assignment' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orderId', 'riderId', 'riderPhone', 'riderName', 'vendorName', 'vendorAddress'],
      properties: {
        orderId: { type: 'number', example: 12345 },
        riderId: { type: 'number', example: 89 },
        riderPhone: { type: 'string', example: '919876543210' },
        riderName: { type: 'string', example: 'Ramesh' },
        vendorName: { type: 'string', example: 'Sharma Dhaba' },
        vendorAddress: { type: 'string', example: 'Near SBI Bank, Main Road' },
        estimatedAmount: { type: 'number', example: 35 },
        language: { type: 'string', example: 'hi', default: 'hi' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Call initiated' })
  async assignRider(@Body() body: {
    orderId: number;
    riderId: number;
    riderPhone: string;
    riderName: string;
    vendorName: string;
    vendorAddress: string;
    estimatedAmount?: number;
    language?: string;
  }) {
    this.logger.log(`📞 Rider assignment call: Order ${body.orderId} → ${body.riderPhone}`);
    return this.nerveService.assignRider(body);
  }

  // ============== CALLBACK ==============

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Nerve callback', 
    description: 'Receive callback from Nerve System with call results' 
  })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  async processCallback(@Body() body: any) {
    this.logger.log(`📥 Nerve callback received: ${JSON.stringify(body)}`);
    await this.nerveService.processCallback(body);
    return { success: true, message: 'Callback processed' };
  }

  // ============== HISTORY & STATS ==============

  @Get('calls/order/:orderId')
  @ApiOperation({ summary: 'Order call history', description: 'Get all voice calls for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Call history' })
  async getOrderCallHistory(@Param('orderId') orderId: string) {
    return this.nerveService.getOrderCallHistory(parseInt(orderId));
  }

  @Get('calls/stats')
  @ApiOperation({ summary: 'Voice call stats', description: 'Get AI voice call statistics' })
  @ApiQuery({ name: 'period', required: false, example: '7d' })
  @ApiResponse({ status: 200, description: 'Call statistics' })
  async getCallStats(@Query('period') period = '7d') {
    return this.nerveService.getCallStats(period);
  }

  @Post('calls/:callId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry call', description: 'Retry a failed voice call' })
  @ApiParam({ name: 'callId', description: 'Call ID' })
  @ApiResponse({ status: 200, description: 'Retry initiated' })
  async retryCall(@Param('callId') callId: string) {
    return this.nerveService.retryCall(callId);
  }
}
