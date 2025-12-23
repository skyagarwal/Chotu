import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Platform } from '../../common/enums/platform.enum';

export interface SendSmsOptions {
  to: string;
  message: string;
  variables?: Record<string, string>;
  templateId?: string;
  sender?: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'msg91' | 'twilio';
}

/**
 * SMS Service
 * 
 * Handles both inbound and outbound SMS with provider abstraction.
 * Supports MSG91 (India) and Twilio (Global) with automatic fallback.
 * 
 * Outbound Features:
 * - Template-based messaging (DLT compliant for India)
 * - Variable substitution
 * - Delivery tracking
 * - Provider failover
 * 
 * Inbound Features:
 * - Webhook parsing for MSG91 and Twilio
 * - Phone number normalization
 * - Session tracking
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  readonly platform = Platform.SMS;
  
  // MSG91 config
  private readonly msg91AuthKey: string;
  private readonly msg91SenderId: string;
  private readonly msg91Enabled: boolean;
  
  // Twilio config
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;
  private readonly twilioPhoneNumber: string;
  private readonly twilioEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    // MSG91 setup
    this.msg91AuthKey = this.configService.get('MSG91_AUTH_KEY', '');
    this.msg91SenderId = this.configService.get('MSG91_SENDER_ID', 'MNGWAL');
    this.msg91Enabled = !!this.msg91AuthKey;
    
    // Twilio setup
    this.twilioAccountSid = this.configService.get('TWILIO_ACCOUNT_SID', '');
    this.twilioAuthToken = this.configService.get('TWILIO_AUTH_TOKEN', '');
    this.twilioPhoneNumber = this.configService.get('TWILIO_PHONE_NUMBER', '');
    this.twilioEnabled = !!(this.twilioAccountSid && this.twilioAuthToken);

    if (this.msg91Enabled) {
      this.logger.log('✅ SMS Service initialized with MSG91');
    } else if (this.twilioEnabled) {
      this.logger.log('✅ SMS Service initialized with Twilio');
    } else {
      this.logger.warn('⚠️ SMS Service running in mock mode (no provider configured)');
    }
  }

  /**
   * Send SMS message
   * Tries MSG91 first (for India), falls back to Twilio
   */
  async sendSms(options: SendSmsOptions): Promise<SmsResult> {
    const normalizedPhone = this.normalizePhone(options.to);
    
    // Mock mode if no provider configured
    if (!this.msg91Enabled && !this.twilioEnabled) {
      this.logger.log(`[MOCK SMS] To: ${normalizedPhone}, Message: ${options.message}`);
      return {
        success: true,
        messageId: `mock_sms_${Date.now()}`,
        provider: 'msg91',
      };
    }

    // Use MSG91 for Indian numbers
    if (this.msg91Enabled && this.isIndianNumber(normalizedPhone)) {
      return this.sendViaMSG91(normalizedPhone, options);
    }
    
    // Use Twilio for international or as fallback
    if (this.twilioEnabled) {
      return this.sendViaTwilio(normalizedPhone, options);
    }

    // Fallback to MSG91 even for non-Indian numbers if Twilio not configured
    if (this.msg91Enabled) {
      return this.sendViaMSG91(normalizedPhone, options);
    }

    return {
      success: false,
      error: 'No SMS provider available',
      provider: 'msg91',
    };
  }

  /**
   * Send via MSG91 API
   */
  private async sendViaMSG91(phone: string, options: SendSmsOptions): Promise<SmsResult> {
    try {
      const url = options.templateId
        ? 'https://api.msg91.com/api/v5/flow/'
        : 'https://api.msg91.com/api/sendhttp.php';

      if (options.templateId) {
        // Flow/Template based sending (DLT compliant)
        const payload = {
          flow_id: options.templateId,
          sender: options.sender || this.msg91SenderId,
          mobiles: phone.replace('+', ''),
          ...options.variables,
        };

        const response = await firstValueFrom(
          this.httpService.post(url, payload, {
            headers: {
              authkey: this.msg91AuthKey,
              'Content-Type': 'application/json',
            },
          })
        );

        this.logger.log(`📱 MSG91 SMS sent to ${phone}`);
        return {
          success: response.data?.type === 'success',
          messageId: response.data?.request_id,
          provider: 'msg91',
        };
      } else {
        // Direct send (may not work for all DLT routes)
        const params = {
          authkey: this.msg91AuthKey,
          mobiles: phone.replace('+91', ''),
          message: options.message,
          sender: options.sender || this.msg91SenderId,
          route: '4', // Transactional
          country: '91',
        };

        const response = await firstValueFrom(
          this.httpService.get(url, { params })
        );

        this.logger.log(`📱 MSG91 direct SMS sent to ${phone}`);
        return {
          success: true,
          messageId: String(response.data),
          provider: 'msg91',
        };
      }
    } catch (error: any) {
      this.logger.error(`MSG91 SMS failed: ${error.message}`);
      
      // Try Twilio as fallback
      if (this.twilioEnabled) {
        this.logger.log('Falling back to Twilio...');
        return this.sendViaTwilio(phone, options);
      }
      
      return {
        success: false,
        error: error.message,
        provider: 'msg91',
      };
    }
  }

  /**
   * Send via Twilio API
   */
  private async sendViaTwilio(phone: string, options: SendSmsOptions): Promise<SmsResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append('To', phone.startsWith('+') ? phone : `+${phone}`);
      formData.append('From', this.twilioPhoneNumber);
      formData.append('Body', options.message);

      const auth = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');

      const response = await firstValueFrom(
        this.httpService.post(url, formData.toString(), {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      this.logger.log(`📱 Twilio SMS sent to ${phone}: ${response.data.sid}`);
      return {
        success: true,
        messageId: response.data.sid,
        provider: 'twilio',
      };
    } catch (error: any) {
      this.logger.error(`Twilio SMS failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        provider: 'twilio',
      };
    }
  }

  /**
   * Parse inbound SMS from MSG91 webhook
   */
  parseMsg91Webhook(body: any): { from: string; message: string; timestamp: Date } | null {
    try {
      // MSG91 inbound webhook format
      const from = body.mobile || body.from || body.sender;
      const message = body.message || body.content || body.text;
      
      if (!from || !message) {
        return null;
      }

      return {
        from: this.normalizePhone(from),
        message,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to parse MSG91 webhook', error);
      return null;
    }
  }

  /**
   * Parse inbound SMS from Twilio webhook
   */
  parseTwilioWebhook(body: any): { from: string; message: string; timestamp: Date } | null {
    try {
      const from = body.From;
      const message = body.Body;
      
      if (!from || !message) {
        return null;
      }

      return {
        from: this.normalizePhone(from),
        message,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to parse Twilio webhook', error);
      return null;
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhone(phone: string): string {
    // Remove all non-digits except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Add + if missing and starts with country code
    if (!cleaned.startsWith('+')) {
      // Assume India (+91) if 10 digits
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        // Remove leading 0 and add +91
        cleaned = '+91' + cleaned.substring(1);
      }
    }
    
    return cleaned;
  }

  /**
   * Check if phone number is Indian
   */
  isIndianNumber(phone: string): boolean {
    const normalized = this.normalizePhone(phone);
    return normalized.startsWith('+91');
  }

  /**
   * Get SMS character count and segment info
   * GSM-7: 160 chars/segment, 153 chars/segment (multipart)
   * Unicode: 70 chars/segment, 67 chars/segment (multipart)
   */
  getMessageInfo(message: string): {
    charCount: number;
    segments: number;
    encoding: 'GSM-7' | 'Unicode';
  } {
    const isGsm7 = /^[\x00-\x7F]*$/.test(message);
    const charCount = message.length;
    
    if (isGsm7) {
      const segments = charCount <= 160 ? 1 : Math.ceil(charCount / 153);
      return { charCount, segments, encoding: 'GSM-7' };
    } else {
      const segments = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
      return { charCount, segments, encoding: 'Unicode' };
    }
  }

  /**
   * Check if provider is enabled
   */
  isEnabled(): boolean {
    return this.msg91Enabled || this.twilioEnabled;
  }

  /**
   * Get active provider name
   */
  getActiveProvider(): string {
    if (this.msg91Enabled) return 'MSG91';
    if (this.twilioEnabled) return 'Twilio';
    return 'None (Mock Mode)';
  }
}
