import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '../../common/enums/platform.enum';
import { MessageButton, MessageListItem } from '../../common/interfaces/common.interface';
import { MessagingProvider } from '../interfaces/messaging-provider.interface';
import axios from 'axios';

/**
 * Telegram Bot API Provider
 * Placeholder for future implementation
 */
@Injectable()
export class TelegramProvider implements MessagingProvider {
  private readonly logger = new Logger(TelegramProvider.name);
  readonly platform = Platform.TELEGRAM;
  private readonly botToken?: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!this.botToken) {
      this.logger.warn('Telegram bot token not configured (TELEGRAM_BOT_TOKEN)');
    }
  }

  async sendTextMessage(recipientId: string, text: string): Promise<boolean> {
    if (!this.botToken) {
      this.logger.warn('Telegram bot token missing');
      return false;
    }
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const payload = { chat_id: recipientId, text };
      const resp = await axios.post(url, payload, { timeout: 5000 });
      if (!resp.data?.ok) {
        this.logger.warn(`Telegram sendMessage failed: ${JSON.stringify(resp.data)}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error('Telegram sendMessage error', e);
      return false;
    }
  }

  async sendImageMessage(recipientId: string, imageUrl: string, caption?: string): Promise<boolean> {
    this.logger.warn('Telegram image send not implemented yet');
    return false;
  }

  async sendButtonMessage(recipientId: string, text: string, buttons: MessageButton[]): Promise<boolean> {
    this.logger.warn('Telegram button message not implemented yet');
    return false;
  }

  async sendListMessage(
    recipientId: string,
    text: string,
    buttonText: string,
    items: MessageListItem[],
  ): Promise<boolean> {
    this.logger.warn('Telegram list message not implemented yet');
    return false;
  }

  async sendLocationRequest(recipientId: string, text: string): Promise<boolean> {
    this.logger.warn('Telegram location request not implemented yet');
    return false;
  }
}
