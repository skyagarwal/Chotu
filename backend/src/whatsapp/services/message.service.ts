import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../session/session.service';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly apiBaseUrl: string;
  private readonly testMode: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @Inject(forwardRef(() => SessionService))
    private sessionService: SessionService,
  ) {
    this.phoneNumberId = this.configService.get('whatsapp.phoneNumberId');
    this.accessToken = this.configService.get('whatsapp.accessToken');
    this.apiBaseUrl = this.configService.get('whatsapp.apiBaseUrl');
    this.testMode = this.configService.get('app.testMode') === 'true' || this.configService.get('app.testMode') === true;
    this.logger.log(this.testMode ? '✅ Message Service initialized (TEST MODE - Responses stored in Redis)' : '✅ Message Service initialized');
  }

  async sendTextMessage(to: string, message: string): Promise<any> {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    });
  }

  async sendButtonMessage(to: string, body: string, buttons: any[]): Promise<any> {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: { buttons },
      },
    });
  }

  async sendListMessage(to: string, header: string, body: string, sections: any[]): Promise<any> {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: header },
        body: { text: body },
        action: {
          button: 'View Options',
          sections,
        },
      },
    });
  }

  async sendLocationRequest(to: string, message: string): Promise<any> {
    return this.sendMessage(to, {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: { text: message },
        action: { name: 'send_location' },
      },
    });
  }

  async markAsRead(messageId: string): Promise<any> {
    try {
      return await this.sendMessage(null, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (error) {
      // Non-critical, just log
      this.logger.debug(`Could not mark message as read: ${messageId}`);
    }
  }

  private async sendMessage(to: string, payload: any): Promise<any> {
    if (this.testMode) {
      this.logger.log(`📤 [TEST MODE] Storing message for ${to}`);
      this.logger.debug(`   Payload type: ${payload.type || 'status'}`);
      
      // Extract message text based on payload type
      let messageText = '';
      if (payload.text?.body) {
        messageText = payload.text.body;
      } else if (payload.interactive?.body?.text) {
        messageText = payload.interactive.body.text;
      } else if (payload.interactive?.type === 'location_request_message') {
        messageText = payload.interactive.body.text + '\n\n[Location Request Button]';
      }

      // Store message in Redis for frontend to retrieve
      if (messageText && to) {
        await this.sessionService.storeBotMessage(to, messageText);
        this.logger.log(`✅ [TEST MODE] Message stored in Redis for ${to}`);
      }

      return { message_id: `test_${Date.now()}`, success: true };
    }

    try {
      const url = `${this.apiBaseUrl}/${this.phoneNumberId}/messages`;

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`✅ Message sent to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error sending message to ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

