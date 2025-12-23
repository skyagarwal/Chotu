import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  ExotelConfigDto,
  CallTimingConfigDto,
  RetryConfigDto,
  TimingCheckResponseDto,
  EXOTEL_SETTINGS_KEYS,
  CallPurpose,
} from '../dto/exotel.dto';

/**
 * ExotelConfigService - Manages Exotel configuration from database
 * 
 * All Exotel settings are stored in system_settings table
 * Falls back to environment variables if not in DB
 */
@Injectable()
export class ExotelConfigService {
  private readonly logger = new Logger(ExotelConfigService.name);
  private configCache: Map<string, { value: string; expiry: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('✅ ExotelConfigService initialized');
  }

  /**
   * Get a setting value with caching, fallback to env
   */
  async getSetting(key: string, defaultValue?: string): Promise<string> {
    const cached = this.configCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    try {
      const setting = await this.prisma.systemSettings.findUnique({
        where: { key },
      });

      if (setting) {
        this.configCache.set(key, { value: setting.value, expiry: Date.now() + this.CACHE_TTL });
        return setting.value;
      }
    } catch (error) {
      this.logger.warn(`Failed to get setting ${key}: ${error.message}`);
    }

    // Fallback to env var
    const envKey = key.toUpperCase().replace(/-/g, '_');
    const envValue = this.configService.get(envKey) || defaultValue || '';
    this.configCache.set(key, { value: envValue, expiry: Date.now() + this.CACHE_TTL });
    return envValue;
  }

  /**
   * Update a setting in database
   */
  async setSetting(key: string, value: string, description?: string): Promise<void> {
    try {
      await this.prisma.systemSettings.upsert({
        where: { key },
        update: { value, updatedAt: new Date() },
        create: {
          key,
          value,
          type: 'string',
          description,
          category: 'exotel',
          isSecret: key.includes('key') || key.includes('token') || key.includes('password'),
        },
      });
      this.configCache.delete(key);
    } catch (error) {
      this.logger.error(`Failed to set setting ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get full Exotel configuration
   */
  async getExotelConfig(): Promise<ExotelConfigDto> {
    return {
      serviceUrl: await this.getSetting(EXOTEL_SETTINGS_KEYS.SERVICE_URL, 'http://192.168.0.151:3100'),
      apiKey: await this.getSetting(EXOTEL_SETTINGS_KEYS.API_KEY, ''),
      apiToken: await this.getSetting(EXOTEL_SETTINGS_KEYS.API_TOKEN, ''),
      accountSid: await this.getSetting(EXOTEL_SETTINGS_KEYS.ACCOUNT_SID, ''),
      subdomain: await this.getSetting(EXOTEL_SETTINGS_KEYS.SUBDOMAIN, 'api.in.exotel.com'),
      defaultExoPhone: await this.getSetting(EXOTEL_SETTINGS_KEYS.DEFAULT_EXOPHONE),
      dltEntityId: await this.getSetting(EXOTEL_SETTINGS_KEYS.DLT_ENTITY_ID),
    };
  }

  /**
   * Update Exotel configuration
   */
  async updateExotelConfig(config: Partial<ExotelConfigDto>): Promise<void> {
    const keyMap: Record<keyof ExotelConfigDto, string> = {
      serviceUrl: EXOTEL_SETTINGS_KEYS.SERVICE_URL,
      apiKey: EXOTEL_SETTINGS_KEYS.API_KEY,
      apiToken: EXOTEL_SETTINGS_KEYS.API_TOKEN,
      accountSid: EXOTEL_SETTINGS_KEYS.ACCOUNT_SID,
      subdomain: EXOTEL_SETTINGS_KEYS.SUBDOMAIN,
      defaultExoPhone: EXOTEL_SETTINGS_KEYS.DEFAULT_EXOPHONE,
      dltEntityId: EXOTEL_SETTINGS_KEYS.DLT_ENTITY_ID,
    };

    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && keyMap[key as keyof ExotelConfigDto]) {
        await this.setSetting(keyMap[key as keyof ExotelConfigDto], String(value));
      }
    }
  }

  /**
   * Get call timing configuration
   */
  async getTimingConfig(): Promise<CallTimingConfigDto> {
    return {
      businessHoursStart: await this.getSetting(EXOTEL_SETTINGS_KEYS.BUSINESS_HOURS_START, '09:00'),
      businessHoursEnd: await this.getSetting(EXOTEL_SETTINGS_KEYS.BUSINESS_HOURS_END, '21:00'),
      dndStart: await this.getSetting(EXOTEL_SETTINGS_KEYS.DND_START, '21:00'),
      dndEnd: await this.getSetting(EXOTEL_SETTINGS_KEYS.DND_END, '09:00'),
      promoSmsStart: await this.getSetting(EXOTEL_SETTINGS_KEYS.PROMO_SMS_START, '10:00'),
      promoSmsEnd: await this.getSetting(EXOTEL_SETTINGS_KEYS.PROMO_SMS_END, '21:00'),
      timezone: await this.getSetting(EXOTEL_SETTINGS_KEYS.TIMEZONE, 'Asia/Kolkata'),
      weekendCallsAllowed: (await this.getSetting(EXOTEL_SETTINGS_KEYS.WEEKEND_CALLS_ALLOWED, 'false')) === 'true',
      holidays: [], // TODO: Load from separate table or JSON setting
    };
  }

  /**
   * Update timing configuration
   */
  async updateTimingConfig(config: Partial<CallTimingConfigDto>): Promise<void> {
    const keyMap: Partial<Record<keyof CallTimingConfigDto, string>> = {
      businessHoursStart: EXOTEL_SETTINGS_KEYS.BUSINESS_HOURS_START,
      businessHoursEnd: EXOTEL_SETTINGS_KEYS.BUSINESS_HOURS_END,
      dndStart: EXOTEL_SETTINGS_KEYS.DND_START,
      dndEnd: EXOTEL_SETTINGS_KEYS.DND_END,
      promoSmsStart: EXOTEL_SETTINGS_KEYS.PROMO_SMS_START,
      promoSmsEnd: EXOTEL_SETTINGS_KEYS.PROMO_SMS_END,
      timezone: EXOTEL_SETTINGS_KEYS.TIMEZONE,
      weekendCallsAllowed: EXOTEL_SETTINGS_KEYS.WEEKEND_CALLS_ALLOWED,
    };

    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && keyMap[key as keyof CallTimingConfigDto]) {
        await this.setSetting(keyMap[key as keyof CallTimingConfigDto]!, String(value));
      }
    }
  }

  /**
   * Get retry configuration
   */
  async getRetryConfig(): Promise<RetryConfigDto> {
    return {
      maxAttempts: parseInt(await this.getSetting(EXOTEL_SETTINGS_KEYS.RETRY_MAX_ATTEMPTS, '3')),
      initialDelaySeconds: parseInt(await this.getSetting(EXOTEL_SETTINGS_KEYS.RETRY_INITIAL_DELAY, '300')),
      backoffMultiplier: parseFloat(await this.getSetting(EXOTEL_SETTINGS_KEYS.RETRY_BACKOFF_MULTIPLIER, '2')),
      maxDelaySeconds: parseInt(await this.getSetting(EXOTEL_SETTINGS_KEYS.RETRY_MAX_DELAY, '3600')),
      retryOnBusy: true,
      retryOnNoAnswer: true,
      retryOnNetworkError: true,
    };
  }

  /**
   * Update retry configuration
   */
  async updateRetryConfig(config: Partial<RetryConfigDto>): Promise<void> {
    if (config.maxAttempts !== undefined) {
      await this.setSetting(EXOTEL_SETTINGS_KEYS.RETRY_MAX_ATTEMPTS, String(config.maxAttempts));
    }
    if (config.initialDelaySeconds !== undefined) {
      await this.setSetting(EXOTEL_SETTINGS_KEYS.RETRY_INITIAL_DELAY, String(config.initialDelaySeconds));
    }
    if (config.backoffMultiplier !== undefined) {
      await this.setSetting(EXOTEL_SETTINGS_KEYS.RETRY_BACKOFF_MULTIPLIER, String(config.backoffMultiplier));
    }
    if (config.maxDelaySeconds !== undefined) {
      await this.setSetting(EXOTEL_SETTINGS_KEYS.RETRY_MAX_DELAY, String(config.maxDelaySeconds));
    }
  }

  /**
   * Get feature flags
   */
  async getFeatureFlags(): Promise<Record<string, boolean>> {
    return {
      verifiedCallsEnabled: (await this.getSetting(EXOTEL_SETTINGS_KEYS.VERIFIED_CALLS_ENABLED, 'true')) === 'true',
      numberMaskingEnabled: (await this.getSetting(EXOTEL_SETTINGS_KEYS.NUMBER_MASKING_ENABLED, 'true')) === 'true',
      voiceStreamingEnabled: (await this.getSetting(EXOTEL_SETTINGS_KEYS.VOICE_STREAMING_ENABLED, 'true')) === 'true',
      autoDialerEnabled: (await this.getSetting(EXOTEL_SETTINGS_KEYS.AUTO_DIALER_ENABLED, 'true')) === 'true',
      cqaEnabled: (await this.getSetting(EXOTEL_SETTINGS_KEYS.CQA_ENABLED, 'true')) === 'true',
    };
  }

  /**
   * Update feature flags
   */
  async setFeatureFlag(feature: string, enabled: boolean): Promise<void> {
    const keyMap: Record<string, string> = {
      verifiedCallsEnabled: EXOTEL_SETTINGS_KEYS.VERIFIED_CALLS_ENABLED,
      numberMaskingEnabled: EXOTEL_SETTINGS_KEYS.NUMBER_MASKING_ENABLED,
      voiceStreamingEnabled: EXOTEL_SETTINGS_KEYS.VOICE_STREAMING_ENABLED,
      autoDialerEnabled: EXOTEL_SETTINGS_KEYS.AUTO_DIALER_ENABLED,
      cqaEnabled: EXOTEL_SETTINGS_KEYS.CQA_ENABLED,
    };

    if (keyMap[feature]) {
      await this.setSetting(keyMap[feature], String(enabled));
    }
  }

  /**
   * Check if current time allows calling/SMS
   */
  async checkTimingAllowed(purpose: CallPurpose = CallPurpose.ORDER_CONFIRMATION): Promise<TimingCheckResponseDto> {
    const timing = await this.getTimingConfig();
    const now = new Date();
    
    // Get current time in configured timezone
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timing.timezone }));
    const currentHour = timeInZone.getHours();
    const currentMinute = timeInZone.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const dayOfWeek = timeInZone.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Parse time strings
    const parseTime = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const currentMinutes = parseTime(currentTime);
    const businessStart = parseTime(timing.businessHoursStart);
    const businessEnd = parseTime(timing.businessHoursEnd);
    const dndStart = parseTime(timing.dndStart);
    const dndEnd = parseTime(timing.dndEnd);
    const promoSmsStart = parseTime(timing.promoSmsStart || '10:00');
    const promoSmsEnd = parseTime(timing.promoSmsEnd || '21:00');

    // Check DND (handles overnight DND like 21:00 to 09:00)
    let isDND = false;
    if (dndStart > dndEnd) {
      // Overnight DND
      isDND = currentMinutes >= dndStart || currentMinutes < dndEnd;
    } else {
      isDND = currentMinutes >= dndStart && currentMinutes < dndEnd;
    }

    // Check business hours
    const isBusinessHours = currentMinutes >= businessStart && currentMinutes < businessEnd;

    // Check promotional SMS hours (India: 10 AM to 9 PM)
    const isPromoSmsHours = currentMinutes >= promoSmsStart && currentMinutes < promoSmsEnd;

    // Determine if calling is allowed
    let canCall = !isDND && isBusinessHours;
    let canSms = !isDND;
    let canPromoSms = isPromoSmsHours && !isWeekend;

    // Check weekend restrictions
    if (isWeekend && !timing.weekendCallsAllowed) {
      canCall = false;
    }

    // Determine reason
    let reason: string | undefined;
    if (isDND) {
      reason = 'DND hours - calls not allowed';
    } else if (!isBusinessHours) {
      reason = 'Outside business hours';
    } else if (isWeekend && !timing.weekendCallsAllowed) {
      reason = 'Weekend calling not enabled';
    }

    // Calculate next available time
    let nextAvailableTime: Date | undefined;
    if (!canCall) {
      const nextDate = new Date(timeInZone);
      if (isDND || !isBusinessHours) {
        // Set to next business hours start
        if (currentMinutes >= businessEnd) {
          // Next day
          nextDate.setDate(nextDate.getDate() + 1);
        }
        const [startHour, startMin] = timing.businessHoursStart.split(':').map(Number);
        nextDate.setHours(startHour, startMin, 0, 0);
      }
      nextAvailableTime = nextDate;
    }

    return {
      canCall,
      canSms,
      canPromoSms,
      reason,
      nextAvailableTime,
      currentTime,
      timezone: timing.timezone,
    };
  }

  /**
   * Get optimal call time based on purpose
   */
  async getOptimalCallTime(phone: string, purpose: CallPurpose): Promise<Date> {
    const timing = await this.getTimingConfig();
    const now = new Date();
    
    // Get current time in timezone
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timing.timezone }));
    
    // Check if we can call now
    const timingCheck = await this.checkTimingAllowed(purpose);
    if (timingCheck.canCall) {
      return now;
    }

    // Otherwise, return next available time
    return timingCheck.nextAvailableTime || now;
  }

  /**
   * Get call template by purpose
   */
  async getCallTemplate(purpose: CallPurpose): Promise<{
    greeting: string;
    script: string;
    closingScript: string;
    maxDuration: number;
    priority: number;
  }> {
    const templates: Record<CallPurpose, any> = {
      [CallPurpose.ORDER_CONFIRMATION]: {
        greeting: 'Hello, this is Mangwale calling to confirm your order.',
        script: 'Your order {orderId} for {itemCount} items totaling ₹{total} has been placed successfully. It will be delivered by {deliveryDate}.',
        closingScript: 'Thank you for ordering with Mangwale!',
        maxDuration: 120,
        priority: 2,
      },
      [CallPurpose.DELIVERY_UPDATE]: {
        greeting: 'Hello, this is Mangwale with an update on your delivery.',
        script: 'Your order {orderId} is {status}. {additionalInfo}',
        closingScript: 'Thank you for your patience!',
        maxDuration: 90,
        priority: 1,
      },
      [CallPurpose.PAYMENT_REMINDER]: {
        greeting: 'Hello, this is Mangwale with a payment reminder.',
        script: 'You have an outstanding balance of ₹{amount} for order {orderId}. Please complete the payment to proceed.',
        closingScript: 'Thank you!',
        maxDuration: 60,
        priority: 3,
      },
      [CallPurpose.PROMOTIONAL_OFFER]: {
        greeting: 'Hello from Mangwale! We have an exciting offer for you.',
        script: '{offerDetails}',
        closingScript: 'Thank you for being a valued customer!',
        maxDuration: 90,
        priority: 5,
      },
      [CallPurpose.FEEDBACK_REQUEST]: {
        greeting: 'Hello, this is Mangwale calling to get your feedback.',
        script: 'How was your recent order experience? Press 1 for excellent, 2 for good, 3 for average, 4 for poor.',
        closingScript: 'Thank you for your feedback!',
        maxDuration: 120,
        priority: 6,
      },
      [CallPurpose.SUPPORT_CALLBACK]: {
        greeting: 'Hello, this is Mangwale support returning your call.',
        script: 'You requested a callback regarding {issue}. How can we help?',
        closingScript: 'Is there anything else we can help with?',
        maxDuration: 300,
        priority: 1,
      },
      [CallPurpose.OTP_VERIFICATION]: {
        greeting: 'Hello, this is Mangwale with your verification code.',
        script: 'Your OTP is {otp}. I repeat, {otp}.',
        closingScript: 'Thank you!',
        maxDuration: 30,
        priority: 1,
      },
      [CallPurpose.ABANDONED_CART]: {
        greeting: 'Hello from Mangwale!',
        script: 'We noticed you left some items in your cart. Would you like to complete your order? You have {itemCount} items worth ₹{total}.',
        closingScript: 'We hope to see you again soon!',
        maxDuration: 90,
        priority: 4,
      },
      [CallPurpose.CUSTOM]: {
        greeting: 'Hello from Mangwale!',
        script: '{customScript}',
        closingScript: 'Thank you!',
        maxDuration: 180,
        priority: 5,
      },
    };

    return templates[purpose] || templates[CallPurpose.CUSTOM];
  }

  /**
   * Clear config cache
   */
  clearCache(): void {
    this.configCache.clear();
  }

  /**
   * Get all Exotel-related settings for admin dashboard
   */
  async getAllExotelSettings(): Promise<Record<string, any>> {
    const config = await this.getExotelConfig();
    const timing = await this.getTimingConfig();
    const retry = await this.getRetryConfig();
    const features = await this.getFeatureFlags();

    return {
      config: {
        ...config,
        apiKey: config.apiKey ? '••••••••' : '', // Hide secrets
        apiToken: config.apiToken ? '••••••••' : '',
      },
      timing,
      retry,
      features,
    };
  }
}
