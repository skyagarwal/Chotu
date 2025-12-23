import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '../../common/enums/platform.enum';
import { MessageButton, MessageListItem } from '../../common/interfaces/common.interface';
import { MessagingProvider } from '../interfaces/messaging-provider.interface';

/**
 * WhatsApp Business Cloud API Provider
 */
@Injectable()
export class WhatsAppProvider implements MessagingProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  readonly platform = Platform.WHATSAPP;

  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiUrl: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiUrl = `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`;
  }

  async sendTextMessage(recipientId: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'text',
          text: { body: text },
        }),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      return false;
    }
  }

  async sendImageMessage(recipientId: string, imageUrl: string, caption?: string): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp image: ${error.message}`);
      return false;
    }
  }

  async sendButtonMessage(recipientId: string, text: string, buttons: MessageButton[]): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text },
            action: {
              buttons: buttons.map((btn, idx) => ({
                type: 'reply',
                reply: {
                  id: btn.id || `btn_${idx}`,
                  title: btn.title.substring(0, 20), // WhatsApp limit
                },
              })),
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp button message: ${error.message}`);
      return false;
    }
  }

  async sendListMessage(
    recipientId: string,
    text: string,
    buttonText: string,
    items: MessageListItem[],
  ): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text },
            action: {
              button: buttonText,
              sections: [
                {
                  title: 'Options',
                  rows: items.map((item) => ({
                    id: item.id,
                    title: item.title.substring(0, 24), // WhatsApp limit
                    description: item.description?.substring(0, 72), // WhatsApp limit
                  })),
                },
              ],
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp list message: ${error.message}`);
      return false;
    }
  }

  async sendLocationRequest(recipientId: string, text: string): Promise<boolean> {
    try {
      // Send text message asking for location
      // WhatsApp Cloud API doesn't have direct location request
      // User must manually share location
      await this.sendTextMessage(
        recipientId,
        text + '\n\n📍 Please tap the 📎 (attach) button and share your live location.',
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send location request: ${error.message}`);
      return false;
    }
  }

  async markAsRead(recipientId: string, messageId: string): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${error.message}`);
      return false;
    }
  }
}
