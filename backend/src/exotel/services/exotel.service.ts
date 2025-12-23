import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * ExotelService - Client for Exotel Service on Mercury
 * 
 * Connects to http://192.168.0.151:3100 (Exotel Service)
 * which handles all Exotel Cloud API interactions
 */

export interface ClickToCallRequest {
  agentPhone: string;
  customerPhone: string;
  callerId?: string;
  timeLimit?: number;
  recordCall?: boolean;
}

export interface NumberMaskingRequest {
  partyA: string; // Agent phone
  partyB: string; // Customer phone
  expiresInHours?: number;
  callType?: 'trans' | 'promo';
}

export interface CampaignRequest {
  name: string;
  type: 'outbound' | 'sms' | 'whatsapp' | 'voice_blast';
  contacts: Array<{ phone: string; name?: string; metadata?: any }>;
  template?: string;
  schedule?: Date;
}

export interface VoiceOrderRequest {
  phone: string;
  action: 'start' | 'confirm' | 'cancel' | 'modify';
  orderData?: any;
}

@Injectable()
export class ExotelService {
  private readonly logger = new Logger(ExotelService.name);
  private readonly exotelServiceUrl: string;
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.exotelServiceUrl = this.configService.get(
      'EXOTEL_SERVICE_URL',
      'http://192.168.0.151:3100',
    );
    
    this.checkConnection();
  }

  private async checkConnection(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.exotelServiceUrl}/health`),
      );
      this.enabled = response.data?.status === 'ok';
      if (this.enabled) {
        this.logger.log(`✅ ExotelService connected to ${this.exotelServiceUrl}`);
        this.logger.log(`   Features: ${response.data?.features?.join(', ') || 'N/A'}`);
      }
    } catch (error: any) {
      this.logger.warn(`⚠️ Exotel Service not available: ${error.message}`);
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get service health and status
   */
  async getHealth(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.exotelServiceUrl}/health`),
      );
      return response.data;
    } catch (error: any) {
      return { status: 'offline', error: error.message };
    }
  }

  /**
   * Click-to-Call: Connect agent to customer
   */
  async clickToCall(request: ClickToCallRequest): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/click-to-call/initiate`, request),
      );
      this.logger.log(`📞 Click-to-call initiated: ${request.customerPhone}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Click-to-call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Number Masking: Get virtual number for agent-customer calls
   */
  async createMaskedNumber(request: NumberMaskingRequest): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/number-masking/create`, request),
      );
      this.logger.log(`🎭 Masked number created for ${request.partyA} ↔ ${request.partyB}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Number masking failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Voice Streaming: Start real-time voice stream
   */
  async startVoiceStream(sessionId: string, phone: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/voice-stream/start`, {
          sessionId,
          phone,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Voice stream start failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verified Calls: Enable Truecaller branded caller ID
   */
  async initiateVerifiedCall(
    phone: string,
    reason: string,
    orderId?: string,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/verified-calls/initiate`, {
          phone,
          reason,
          orderId,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Verified call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * SMS: Send SMS via Exotel
   */
  async sendSms(
    to: string,
    message: string,
    template?: string,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/messaging/sms/send`, {
          to,
          message,
          template,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`SMS send failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * WhatsApp: Send WhatsApp message via Exotel
   */
  async sendWhatsApp(
    to: string,
    templateName: string,
    variables?: Record<string, string>,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/messaging/whatsapp/send`, {
          to,
          templateName,
          variables,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`WhatsApp send failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto Dialer: Create outbound campaign
   */
  async createDialerCampaign(campaign: CampaignRequest): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/auto-dialer/campaigns`, campaign),
      );
      this.logger.log(`📢 Campaign created: ${campaign.name}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Campaign creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Call Recording: Get recording URL
   */
  async getRecording(callSid: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.exotelServiceUrl}/recordings/${callSid}`),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get recording failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * CQA: Analyze call quality
   */
  async analyzeCall(callSid: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/cqa/analyze`, {
          callSid,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`CQA analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Voice Ordering: Process voice order
   */
  async processVoiceOrder(request: VoiceOrderRequest): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.exotelServiceUrl}/voice-ordering/process`, request),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Voice order failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all call logs with pagination
   */
  async getCallLogs(page = 1, limit = 20, filters?: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.exotelServiceUrl}/calls`, {
          params: { page, limit, ...filters },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get call logs failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get campaign stats
   */
  async getCampaignStats(campaignId?: string): Promise<any> {
    try {
      const url = campaignId
        ? `${this.exotelServiceUrl}/auto-dialer/campaigns/${campaignId}/stats`
        : `${this.exotelServiceUrl}/auto-dialer/campaigns/stats`;
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get campaign stats failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get CQA dashboard stats
   */
  async getCqaStats(period = '7d'): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.exotelServiceUrl}/cqa/stats/summary`, {
          params: { period },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get CQA stats failed: ${error.message}`);
      throw error;
    }
  }
}
