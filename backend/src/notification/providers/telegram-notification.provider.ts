import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  NotificationResult,
  NotificationStatus,
  NotificationChannel,
} from '../types/notification.types';

/**
 * Telegram Notification Provider
 * 
 * Uses Telegram Bot API for sending:
 * - Text messages with Markdown formatting
 * - Messages with inline keyboard buttons
 * - Photo/image notifications
 * - Document notifications
 * 
 * Note: This is specifically for outbound notifications.
 * Inbound webhook handling is in the Telegram module.
 */
@Injectable()
export class TelegramNotificationProvider {
  private readonly logger = new Logger(TelegramNotificationProvider.name);
  private readonly botToken: string;
  private readonly apiBase: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
    this.enabled = !!this.botToken;

    if (!this.enabled) {
      this.logger.warn('⚠️ Telegram Bot API not configured - messages will be mocked');
    } else {
      this.logger.log('✅ Telegram Notification Provider initialized');
    }
  }

  /**
   * Send text message notification
   */
  async sendTextMessage(
    chatId: string,
    text: string,
    options?: {
      parseMode?: 'Markdown' | 'HTML';
      disableNotification?: boolean;
    },
  ): Promise<NotificationResult> {
    if (!this.enabled) {
      this.logger.log(`[MOCK TELEGRAM] To: ${chatId}, Text: ${text.substring(0, 50)}...`);
      return {
        success: true,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.SENT,
        messageId: `mock_tg_${Date.now()}`,
        sentAt: new Date(),
      };
    }

    try {
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || 'Markdown',
      };

      if (options?.disableNotification) {
        payload.disable_notification = true;
      }

      const response = await axios.post(`${this.apiBase}/sendMessage`, payload, {
        timeout: 10000,
      });

      if (!response.data?.ok) {
        throw new Error(response.data?.description || 'Unknown Telegram API error');
      }

      this.logger.log(`📱 Telegram message sent to ${chatId}: ${response.data.result?.message_id}`);

      return {
        success: true,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.SENT,
        messageId: String(response.data.result?.message_id),
        providerResponse: response.data,
        sentAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`❌ Telegram message failed: ${error.message}`);
      return {
        success: false,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.FAILED,
        error: error.message,
        providerResponse: error.response?.data,
      };
    }
  }

  /**
   * Send message with inline keyboard buttons
   */
  async sendButtonMessage(
    chatId: string,
    text: string,
    buttons: Array<{ text: string; callbackData?: string; url?: string }>,
    options?: {
      parseMode?: 'Markdown' | 'HTML';
      buttonsPerRow?: number;
    },
  ): Promise<NotificationResult> {
    if (!this.enabled) {
      this.logger.log(`[MOCK TELEGRAM BUTTONS] To: ${chatId}, Buttons: ${buttons.length}`);
      return {
        success: true,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.SENT,
        messageId: `mock_tg_btn_${Date.now()}`,
        sentAt: new Date(),
      };
    }

    try {
      const buttonsPerRow = options?.buttonsPerRow || 2;
      const inlineKeyboard: any[][] = [];

      for (let i = 0; i < buttons.length; i += buttonsPerRow) {
        const row: any[] = [];
        for (let j = i; j < Math.min(i + buttonsPerRow, buttons.length); j++) {
          const btn = buttons[j];
          if (btn.url) {
            row.push({ text: btn.text, url: btn.url });
          } else {
            row.push({ text: btn.text, callback_data: btn.callbackData || btn.text });
          }
        }
        inlineKeyboard.push(row);
      }

      const payload = {
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard },
      };

      const response = await axios.post(`${this.apiBase}/sendMessage`, payload, {
        timeout: 10000,
      });

      if (!response.data?.ok) {
        throw new Error(response.data?.description || 'Unknown Telegram API error');
      }

      return {
        success: true,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.SENT,
        messageId: String(response.data.result?.message_id),
        providerResponse: response.data,
        sentAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`❌ Telegram button message failed: ${error.message}`);
      return {
        success: false,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.FAILED,
        error: error.message,
        providerResponse: error.response?.data,
      };
    }
  }

  /**
   * Send photo notification
   */
  async sendPhoto(
    chatId: string,
    photoUrl: string,
    caption?: string,
  ): Promise<NotificationResult> {
    if (!this.enabled) {
      this.logger.log(`[MOCK TELEGRAM PHOTO] To: ${chatId}, Photo: ${photoUrl}`);
      return {
        success: true,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.SENT,
        messageId: `mock_tg_photo_${Date.now()}`,
        sentAt: new Date(),
      };
    }

    try {
      const payload: any = {
        chat_id: chatId,
        photo: photoUrl,
      };

      if (caption) {
        payload.caption = caption;
        payload.parse_mode = 'Markdown';
      }

      const response = await axios.post(`${this.apiBase}/sendPhoto`, payload, {
        timeout: 15000,
      });

      if (!response.data?.ok) {
        throw new Error(response.data?.description || 'Unknown Telegram API error');
      }

      return {
        success: true,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.SENT,
        messageId: String(response.data.result?.message_id),
        providerResponse: response.data,
        sentAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`❌ Telegram photo failed: ${error.message}`);
      return {
        success: false,
        channel: NotificationChannel.TELEGRAM,
        status: NotificationStatus.FAILED,
        error: error.message,
        providerResponse: error.response?.data,
      };
    }
  }

  /**
   * Send notification based on type
   */
  async sendNotification(
    chatId: string,
    notification: {
      type: 'order_update' | 'delivery_status' | 'promo' | 'alert' | 'general';
      title: string;
      body: string;
      data?: Record<string, any>;
      buttons?: Array<{ text: string; callbackData?: string; url?: string }>;
      imageUrl?: string;
    },
  ): Promise<NotificationResult> {
    // Format message based on type
    let text = '';
    let emoji = '📢';

    switch (notification.type) {
      case 'order_update':
        emoji = '📦';
        break;
      case 'delivery_status':
        emoji = '🚚';
        break;
      case 'promo':
        emoji = '🎉';
        break;
      case 'alert':
        emoji = '⚠️';
        break;
    }

    text = `${emoji} *${notification.title}*\n\n${notification.body}`;

    // Add any extra data as formatted text
    if (notification.data) {
      const dataLines = Object.entries(notification.data)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join('\n');
      if (dataLines) {
        text += `\n\n${dataLines}`;
      }
    }

    // Send with image if provided
    if (notification.imageUrl) {
      return this.sendPhoto(chatId, notification.imageUrl, text);
    }

    // Send with buttons if provided
    if (notification.buttons && notification.buttons.length > 0) {
      return this.sendButtonMessage(chatId, text, notification.buttons);
    }

    // Send plain text
    return this.sendTextMessage(chatId, text);
  }

  /**
   * Get provider health status
   */
  async healthCheck(): Promise<{ healthy: boolean; botInfo?: any }> {
    if (!this.enabled) {
      return { healthy: false };
    }

    try {
      const response = await axios.get(`${this.apiBase}/getMe`, { timeout: 5000 });
      return {
        healthy: response.data?.ok === true,
        botInfo: response.data?.result,
      };
    } catch (error) {
      return { healthy: false };
    }
  }
}
