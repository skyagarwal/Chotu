import {
  Controller,
  Get,
  Post,
  Put,
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

import { ExotelService } from '../services/exotel.service';
import { ExotelConfigService } from '../services/exotel-config.service';
import { ExotelSchedulerService } from '../services/exotel-scheduler.service';
import {
  ClickToCallDto,
  ClickToCallResponseDto,
  NumberMaskingDto,
  NumberMaskingResponseDto,
  VoiceStreamStartDto,
  VerifiedCallDto,
  SendSmsDto,
  BulkSmsDto,
  SendWhatsAppDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  ScheduledCallDto,
  AnalyzeCallDto,
  VoiceOrderDto,
  CallLogsQueryDto,
  ExotelConfigDto,
  CallTimingConfigDto,
  RetryConfigDto,
  TimingCheckResponseDto,
  CallPurpose,
} from '../dto/exotel.dto';

/**
 * ExotelController - Comprehensive API for Exotel Voice & SMS integration
 * 
 * Features:
 * - Click-to-Call (Agent ↔ Customer)
 * - Number Masking (Virtual Numbers)
 * - Voice Streaming (Real-time ASR)
 * - Verified Calls (Truecaller Branded)
 * - SMS (Transactional & Promotional)
 * - WhatsApp Business API
 * - Auto Dialer / Campaigns
 * - CQA (Call Quality Analysis)
 * - Voice Ordering
 * - Scheduled Calls with Retry
 * - DND & Business Hours Management
 */
@ApiTags('Exotel - Voice & SMS')
@Controller('exotel')
export class ExotelController {
  private readonly logger = new Logger(ExotelController.name);

  constructor(
    private readonly exotelService: ExotelService,
    private readonly configService: ExotelConfigService,
    private readonly schedulerService: ExotelSchedulerService,
  ) {
    this.logger.log('✅ Exotel Controller initialized');
  }

  // ============== HEALTH & STATUS ==============

  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Check Exotel service health and connectivity' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async health() {
    const health = await this.exotelService.getHealth();
    const features = await this.configService.getFeatureFlags();
    return {
      enabled: this.exotelService.isEnabled(),
      features,
      ...health,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Service status', description: 'Get detailed service status and features' })
  @ApiResponse({ status: 200, description: 'Detailed service status' })
  async getStatus() {
    return this.exotelService.getHealth();
  }

  // ============== CONFIGURATION ==============

  @Get('config')
  @ApiOperation({ summary: 'Get configuration', description: 'Get all Exotel configuration settings' })
  @ApiResponse({ status: 200, description: 'Configuration settings' })
  async getConfig() {
    return this.configService.getAllExotelSettings();
  }

  @Put('config')
  @ApiOperation({ summary: 'Update configuration', description: 'Update Exotel configuration settings' })
  @ApiBody({ type: ExotelConfigDto })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(@Body() config: Partial<ExotelConfigDto>) {
    await this.configService.updateExotelConfig(config);
    return { success: true, message: 'Configuration updated' };
  }

  @Get('config/timing')
  @ApiOperation({ summary: 'Get timing config', description: 'Get business hours, DND, and calling time configuration' })
  @ApiResponse({ status: 200, description: 'Timing configuration' })
  async getTimingConfig() {
    return this.configService.getTimingConfig();
  }

  @Put('config/timing')
  @ApiOperation({ summary: 'Update timing config', description: 'Update business hours and DND settings' })
  @ApiBody({ type: CallTimingConfigDto })
  @ApiResponse({ status: 200, description: 'Timing configuration updated' })
  async updateTimingConfig(@Body() config: Partial<CallTimingConfigDto>) {
    await this.configService.updateTimingConfig(config);
    return { success: true, message: 'Timing configuration updated' };
  }

  @Get('config/retry')
  @ApiOperation({ summary: 'Get retry config', description: 'Get call retry configuration' })
  @ApiResponse({ status: 200, description: 'Retry configuration' })
  async getRetryConfig() {
    return this.configService.getRetryConfig();
  }

  @Put('config/retry')
  @ApiOperation({ summary: 'Update retry config', description: 'Update call retry settings' })
  @ApiBody({ type: RetryConfigDto })
  @ApiResponse({ status: 200, description: 'Retry configuration updated' })
  async updateRetryConfig(@Body() config: Partial<RetryConfigDto>) {
    await this.configService.updateRetryConfig(config);
    return { success: true, message: 'Retry configuration updated' };
  }

  @Get('config/features')
  @ApiOperation({ summary: 'Get feature flags', description: 'Get Exotel feature enable/disable flags' })
  @ApiResponse({ status: 200, description: 'Feature flags' })
  async getFeatureFlags() {
    return this.configService.getFeatureFlags();
  }

  @Put('config/features/:feature')
  @ApiOperation({ summary: 'Toggle feature', description: 'Enable or disable an Exotel feature' })
  @ApiParam({ name: 'feature', description: 'Feature name' })
  @ApiResponse({ status: 200, description: 'Feature toggled' })
  async toggleFeature(
    @Param('feature') feature: string,
    @Body() body: { enabled: boolean },
  ) {
    await this.configService.setFeatureFlag(feature, body.enabled);
    return { success: true, feature, enabled: body.enabled };
  }

  // ============== TIMING CHECK ==============

  @Get('timing/check')
  @ApiOperation({ summary: 'Check timing', description: 'Check if current time allows calling/SMS' })
  @ApiQuery({ name: 'purpose', enum: CallPurpose, required: false })
  @ApiResponse({ status: 200, type: TimingCheckResponseDto })
  async checkTiming(@Query('purpose') purpose?: CallPurpose): Promise<TimingCheckResponseDto> {
    return this.configService.checkTimingAllowed(purpose);
  }

  // ============== CLICK-TO-CALL ==============

  @Post('click-to-call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Click-to-Call', description: 'Connect agent to customer via phone call' })
  @ApiBody({ type: ClickToCallDto })
  @ApiResponse({ status: 200, type: ClickToCallResponseDto })
  async clickToCall(@Body() body: ClickToCallDto) {
    return this.exotelService.clickToCall(body);
  }

  // ============== NUMBER MASKING ==============

  @Post('number-masking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create masked number', description: 'Get a virtual number for agent-customer communication' })
  @ApiBody({ type: NumberMaskingDto })
  @ApiResponse({ status: 200, type: NumberMaskingResponseDto })
  async createMaskedNumber(@Body() body: NumberMaskingDto) {
    return this.exotelService.createMaskedNumber(body);
  }

  // ============== VOICE STREAMING ==============

  @Post('voice-stream/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start voice stream', description: 'Start real-time voice streaming for ASR/TTS' })
  @ApiBody({ type: VoiceStreamStartDto })
  @ApiResponse({ status: 200, description: 'Voice stream started' })
  async startVoiceStream(@Body() body: VoiceStreamStartDto) {
    return this.exotelService.startVoiceStream(body.sessionId, body.phone);
  }

  // ============== VERIFIED CALLS ==============

  @Post('verified-calls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verified call', description: 'Make a Truecaller-verified branded call' })
  @ApiBody({ type: VerifiedCallDto })
  @ApiResponse({ status: 200, description: 'Verified call initiated' })
  async initiateVerifiedCall(@Body() body: VerifiedCallDto) {
    return this.exotelService.initiateVerifiedCall(body.phone, body.reason, body.orderId);
  }

  // ============== SMS ==============

  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send SMS', description: 'Send a single SMS message' })
  @ApiBody({ type: SendSmsDto })
  @ApiResponse({ status: 200, description: 'SMS sent' })
  async sendSms(@Body() body: SendSmsDto) {
    return this.exotelService.sendSms(body.to, body.message, body.templateId);
  }

  @Post('sms/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send bulk SMS', description: 'Send SMS to multiple recipients (max 100)' })
  @ApiBody({ type: BulkSmsDto })
  @ApiResponse({ status: 200, description: 'Bulk SMS sent' })
  async sendBulkSms(@Body() body: BulkSmsDto) {
    const results = await Promise.allSettled(
      body.recipients.map(phone => this.exotelService.sendSms(phone, body.message)),
    );
    return {
      total: body.recipients.length,
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  }

  // ============== WHATSAPP ==============

  @Post('whatsapp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send WhatsApp', description: 'Send WhatsApp message via template' })
  @ApiBody({ type: SendWhatsAppDto })
  @ApiResponse({ status: 200, description: 'WhatsApp message sent' })
  async sendWhatsApp(@Body() body: SendWhatsAppDto) {
    return this.exotelService.sendWhatsApp(body.to, body.templateName, body.variables);
  }

  // ============== CAMPAIGNS ==============

  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create campaign', description: 'Create a new outbound calling/messaging campaign' })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async createCampaign(@Body() body: CreateCampaignDto) {
    return this.exotelService.createDialerCampaign({
      ...body,
      schedule: body.schedule ? new Date(body.schedule) : undefined,
    });
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List campaigns', description: 'Get all campaigns' })
  @ApiResponse({ status: 200, description: 'Campaign list' })
  async listCampaigns() {
    return this.exotelService.getCampaignStats();
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign', description: 'Get campaign details' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  async getCampaign(@Param('id') id: string) {
    return this.exotelService.getCampaignStats(id);
  }

  @Get('campaigns/:id/stats')
  @ApiOperation({ summary: 'Campaign stats', description: 'Get campaign statistics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign statistics' })
  async getCampaignStats(@Param('id') id: string) {
    return this.exotelService.getCampaignStats(id);
  }

  // ============== SCHEDULED CALLS ==============

  @Post('scheduled-calls')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule call', description: 'Schedule a call for optimal time with auto-retry' })
  @ApiBody({ type: ScheduledCallDto })
  @ApiResponse({ status: 201, description: 'Call scheduled' })
  async scheduleCall(@Body() body: ScheduledCallDto) {
    return this.schedulerService.scheduleCall(body);
  }

  @Get('scheduled-calls')
  @ApiOperation({ summary: 'List scheduled calls', description: 'Get pending scheduled calls' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Scheduled calls list' })
  async getScheduledCalls(@Query('limit') limit?: number) {
    return this.schedulerService.getPendingCalls(limit || 50);
  }

  @Get('scheduled-calls/:id')
  @ApiOperation({ summary: 'Get scheduled call', description: 'Get scheduled call status' })
  @ApiParam({ name: 'id', description: 'Scheduled call ID' })
  @ApiResponse({ status: 200, description: 'Scheduled call status' })
  async getScheduledCallStatus(@Param('id') id: string) {
    return this.schedulerService.getScheduledCallStatus(id);
  }

  @Post('scheduled-calls/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel scheduled call', description: 'Cancel a pending scheduled call' })
  @ApiParam({ name: 'id', description: 'Scheduled call ID' })
  @ApiResponse({ status: 200, description: 'Call cancelled' })
  async cancelScheduledCall(@Param('id') id: string) {
    const success = await this.schedulerService.cancelScheduledCall(id);
    return { success, message: success ? 'Call cancelled' : 'Call not found or already processed' };
  }

  @Get('scheduled-calls/stats/summary')
  @ApiOperation({ summary: 'Scheduled call stats', description: 'Get statistics for scheduled calls' })
  @ApiResponse({ status: 200, description: 'Call statistics' })
  async getScheduledCallStats() {
    return this.schedulerService.getCallStats();
  }

  // ============== RECORDINGS ==============

  @Get('recordings/:callSid')
  @ApiOperation({ summary: 'Get recording', description: 'Get call recording URL' })
  @ApiParam({ name: 'callSid', description: 'Call SID' })
  @ApiResponse({ status: 200, description: 'Recording details' })
  async getRecording(@Param('callSid') callSid: string) {
    return this.exotelService.getRecording(callSid);
  }

  // ============== CQA ==============

  @Post('cqa/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze call', description: 'Run quality analysis on a call recording' })
  @ApiBody({ type: AnalyzeCallDto })
  @ApiResponse({ status: 200, description: 'Analysis result' })
  async analyzeCall(@Body() body: AnalyzeCallDto) {
    return this.exotelService.analyzeCall(body.callSid);
  }

  @Get('cqa/stats')
  @ApiOperation({ summary: 'CQA stats', description: 'Get CQA dashboard statistics' })
  @ApiQuery({ name: 'period', required: false, example: '7d' })
  @ApiResponse({ status: 200, description: 'CQA statistics' })
  async getCqaStats(@Query('period') period = '7d') {
    return this.exotelService.getCqaStats(period);
  }

  // ============== VOICE ORDERING ==============

  @Post('voice-ordering')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Voice order', description: 'Process voice-based order' })
  @ApiBody({ type: VoiceOrderDto })
  @ApiResponse({ status: 200, description: 'Voice order processed' })
  async processVoiceOrder(@Body() body: VoiceOrderDto) {
    return this.exotelService.processVoiceOrder(body);
  }

  // ============== CALL LOGS ==============

  @Get('calls')
  @ApiOperation({ summary: 'Get call logs', description: 'Get call history with filters' })
  @ApiResponse({ status: 200, description: 'Call logs' })
  async getCallLogs(@Query() query: CallLogsQueryDto) {
    return this.exotelService.getCallLogs(
      query.page || 1,
      query.limit || 20,
      {
        status: query.status,
        direction: query.direction,
        from: query.from,
        to: query.to,
        phone: query.phone,
      },
    );
  }

  @Get('calls/:callSid')
  @ApiOperation({ summary: 'Get call details', description: 'Get details of a specific call' })
  @ApiParam({ name: 'callSid', description: 'Call SID' })
  @ApiResponse({ status: 200, description: 'Call details' })
  async getCallDetails(@Param('callSid') callSid: string) {
    return { callSid, message: 'Call details endpoint' };
  }

  // ============== TEMPLATES ==============

  @Get('templates/:purpose')
  @ApiOperation({ summary: 'Get call template', description: 'Get call script template for a purpose' })
  @ApiParam({ name: 'purpose', enum: CallPurpose })
  @ApiResponse({ status: 200, description: 'Call template' })
  async getCallTemplate(@Param('purpose') purpose: CallPurpose) {
    return this.configService.getCallTemplate(purpose);
  }
}
