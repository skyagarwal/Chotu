import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExotelService } from './exotel.service';
import { ExotelConfigService } from './exotel-config.service';
import {
  ScheduledCallDto,
  CallPurpose,
  RetryConfigDto,
  TimingCheckResponseDto,
} from '../dto/exotel.dto';
import { PrismaService } from '../../database/prisma.service';

// Export interface for use in controller
export interface ScheduledCall {
  id: string;
  phone: string;
  purpose: CallPurpose;
  scheduledTime: Date;
  context: Record<string, any>;
  useVerifiedCall: boolean;
  retryConfig: RetryConfigDto;
  priority: number;
  attempts: number;
  lastAttempt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'max_retries_reached';
  callSid?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ExotelSchedulerService - Handles call scheduling, timing, and retries
 * 
 * Features:
 * - Schedule calls for optimal times
 * - Respect DND and business hours
 * - Automatic retry with exponential backoff
 * - Priority queue for calls
 * - Promotional vs Transactional call handling
 */
@Injectable()
export class ExotelSchedulerService {
  private readonly logger = new Logger(ExotelSchedulerService.name);
  private scheduledCalls: Map<string, ScheduledCall> = new Map();
  private processingQueue = false;

  constructor(
    private readonly exotelService: ExotelService,
    private readonly configService: ExotelConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.log('✅ ExotelSchedulerService initialized');
    this.loadPendingCalls();
  }

  /**
   * Load pending calls from database on startup
   */
  private async loadPendingCalls(): Promise<void> {
    try {
      // TODO: Create scheduled_calls table and load from there
      this.logger.log('📋 Loaded pending scheduled calls');
    } catch (error) {
      this.logger.error(`Failed to load pending calls: ${error.message}`);
    }
  }

  /**
   * Schedule a new call
   */
  async scheduleCall(dto: ScheduledCallDto): Promise<{ id: string; scheduledTime: Date; status: string }> {
    const id = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get optimal time for this call
    const scheduledTime = dto.preferredTime 
      ? new Date(dto.preferredTime)
      : await this.configService.getOptimalCallTime(dto.phone, dto.purpose);

    // Get retry config (use custom or default)
    const retryConfig = dto.retryConfig || await this.configService.getRetryConfig();

    const scheduledCall: ScheduledCall = {
      id,
      phone: dto.phone,
      purpose: dto.purpose,
      scheduledTime,
      context: dto.context || {},
      useVerifiedCall: dto.useVerifiedCall !== false,
      retryConfig,
      priority: dto.priority || 5,
      attempts: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.scheduledCalls.set(id, scheduledCall);
    
    // Save to database for persistence
    await this.persistScheduledCall(scheduledCall);

    this.logger.log(`📅 Call scheduled: ${id} to ${dto.phone} at ${scheduledTime.toISOString()}`);

    return {
      id,
      scheduledTime,
      status: 'scheduled',
    };
  }

  /**
   * Cancel a scheduled call
   */
  async cancelScheduledCall(callId: string): Promise<boolean> {
    const call = this.scheduledCalls.get(callId);
    if (!call || call.status !== 'pending') {
      return false;
    }

    call.status = 'failed';
    call.error = 'Cancelled by user';
    call.updatedAt = new Date();
    
    await this.updatePersistedCall(call);
    this.scheduledCalls.delete(callId);

    this.logger.log(`🚫 Call cancelled: ${callId}`);
    return true;
  }

  /**
   * Get scheduled call status
   */
  async getScheduledCallStatus(callId: string): Promise<ScheduledCall | null> {
    return this.scheduledCalls.get(callId) || null;
  }

  /**
   * Get all pending calls
   */
  async getPendingCalls(limit = 50): Promise<ScheduledCall[]> {
    return Array.from(this.scheduledCalls.values())
      .filter(c => c.status === 'pending')
      .sort((a, b) => a.priority - b.priority || a.scheduledTime.getTime() - b.scheduledTime.getTime())
      .slice(0, limit);
  }

  /**
   * Process scheduled calls - runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCalls(): Promise<void> {
    if (this.processingQueue) {
      return; // Already processing
    }

    this.processingQueue = true;
    try {
      const now = new Date();
      const timingCheck = await this.configService.checkTimingAllowed(CallPurpose.ORDER_CONFIRMATION);

      if (!timingCheck.canCall) {
        this.logger.debug(`⏰ Skipping call processing: ${timingCheck.reason}`);
        return;
      }

      // Get calls due for processing
      const dueCalls = Array.from(this.scheduledCalls.values())
        .filter(c => c.status === 'pending' && c.scheduledTime <= now)
        .sort((a, b) => a.priority - b.priority);

      for (const call of dueCalls.slice(0, 10)) { // Process up to 10 at a time
        await this.processCall(call);
      }
    } catch (error) {
      this.logger.error(`Error processing scheduled calls: ${error.message}`);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process a single call
   */
  private async processCall(call: ScheduledCall): Promise<void> {
    call.status = 'in_progress';
    call.attempts++;
    call.lastAttempt = new Date();
    call.updatedAt = new Date();

    try {
      const template = await this.configService.getCallTemplate(call.purpose);
      
      let result;
      if (call.useVerifiedCall) {
        // Use Truecaller verified call
        result = await this.exotelService.initiateVerifiedCall(
          call.phone,
          this.formatReason(call.purpose, call.context),
          call.context.orderId,
        );
      } else {
        // Use regular click-to-call or auto-dial
        result = await this.exotelService.clickToCall({
          agentPhone: call.context.agentPhone || 'auto', // Auto-assign agent
          customerPhone: call.phone,
          timeLimit: template.maxDuration,
          recordCall: true,
        });
      }

      call.callSid = result.callSid || result.sid;
      call.status = 'completed';
      
      this.logger.log(`✅ Call completed: ${call.id} -> ${call.phone}`);
    } catch (error: any) {
      this.logger.error(`❌ Call failed: ${call.id} -> ${error.message}`);
      
      // Check if we should retry
      if (call.attempts < call.retryConfig.maxAttempts && this.shouldRetry(error)) {
        // Calculate next retry time
        const delay = this.calculateRetryDelay(call.attempts, call.retryConfig);
        call.scheduledTime = new Date(Date.now() + delay * 1000);
        call.status = 'pending';
        call.error = error.message;
        
        this.logger.log(`🔄 Call ${call.id} scheduled for retry at ${call.scheduledTime.toISOString()}`);
      } else {
        call.status = call.attempts >= call.retryConfig.maxAttempts ? 'max_retries_reached' : 'failed';
        call.error = error.message;
      }
    }

    await this.updatePersistedCall(call);
  }

  /**
   * Check if error is retryable
   */
  private shouldRetry(error: any): boolean {
    const retryableCodes = ['BUSY', 'NO_ANSWER', 'NETWORK_ERROR', 'TIMEOUT'];
    const errorCode = error.code || error.response?.data?.code || '';
    return retryableCodes.some(code => errorCode.includes(code));
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, config: RetryConfigDto): number {
    const delay = config.initialDelaySeconds * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelaySeconds);
  }

  /**
   * Format call reason for Truecaller display
   */
  private formatReason(purpose: CallPurpose, context: Record<string, any>): string {
    const reasonMap: Record<CallPurpose, string> = {
      [CallPurpose.ORDER_CONFIRMATION]: `Order ${context.orderId || ''} Confirmation`,
      [CallPurpose.DELIVERY_UPDATE]: `Delivery Update - ${context.status || ''}`,
      [CallPurpose.PAYMENT_REMINDER]: `Payment Reminder ₹${context.amount || ''}`,
      [CallPurpose.PROMOTIONAL_OFFER]: 'Special Offer for You',
      [CallPurpose.FEEDBACK_REQUEST]: 'Order Feedback Request',
      [CallPurpose.SUPPORT_CALLBACK]: 'Support Callback',
      [CallPurpose.OTP_VERIFICATION]: 'Verification Code',
      [CallPurpose.ABANDONED_CART]: 'Complete Your Order',
      [CallPurpose.CUSTOM]: context.reason || 'Mangwale Call',
    };

    return reasonMap[purpose] || 'Mangwale Call';
  }

  /**
   * Persist scheduled call to database
   */
  private async persistScheduledCall(call: ScheduledCall): Promise<void> {
    // TODO: Save to scheduled_calls table
    // For now, just keeping in memory
  }

  /**
   * Update persisted call
   */
  private async updatePersistedCall(call: ScheduledCall): Promise<void> {
    // TODO: Update in scheduled_calls table
  }

  /**
   * Get call statistics
   */
  async getCallStats(): Promise<{
    pending: number;
    completed: number;
    failed: number;
    retrying: number;
    totalAttempts: number;
  }> {
    const calls = Array.from(this.scheduledCalls.values());
    return {
      pending: calls.filter(c => c.status === 'pending').length,
      completed: calls.filter(c => c.status === 'completed').length,
      failed: calls.filter(c => c.status === 'failed' || c.status === 'max_retries_reached').length,
      retrying: calls.filter(c => c.status === 'pending' && c.attempts > 0).length,
      totalAttempts: calls.reduce((sum, c) => sum + c.attempts, 0),
    };
  }

  /**
   * Batch schedule calls for a campaign
   */
  async scheduleCallBatch(
    phones: string[],
    purpose: CallPurpose,
    context: Record<string, any>,
    options: {
      spreadMinutes?: number;
      startTime?: Date;
      useVerifiedCall?: boolean;
    } = {},
  ): Promise<{ scheduled: number; ids: string[] }> {
    const ids: string[] = [];
    const startTime = options.startTime || new Date();
    const spreadMs = (options.spreadMinutes || 30) * 60 * 1000 / phones.length;

    for (let i = 0; i < phones.length; i++) {
      const preferredTime = new Date(startTime.getTime() + i * spreadMs);
      
      const result = await this.scheduleCall({
        phone: phones[i],
        purpose,
        context,
        preferredTime: preferredTime.toISOString(),
        useVerifiedCall: options.useVerifiedCall,
      });

      ids.push(result.id);
    }

    return { scheduled: ids.length, ids };
  }
}
