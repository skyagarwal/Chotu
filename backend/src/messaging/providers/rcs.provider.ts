import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '../../common/enums/platform.enum';
import { MessageButton, MessageListItem } from '../../common/interfaces/common.interface';
import { MessagingProvider } from '../interfaces/messaging-provider.interface';

/**
 * RCS (Rich Communication Services) Provider
 * Placeholder for future implementation
 */
@Injectable()
export class RCSProvider implements MessagingProvider {
  private readonly logger = new Logger(RCSProvider.name);
  readonly platform = Platform.RCS;

  async sendTextMessage(recipientId: string, text: string): Promise<boolean> {
    this.logger.warn('RCS not implemented yet');
    // TODO: Implement RCS Business Messaging API
    return false;
  }

  async sendImageMessage(recipientId: string, imageUrl: string, caption?: string): Promise<boolean> {
    this.logger.warn('RCS not implemented yet');
    return false;
  }

  async sendButtonMessage(recipientId: string, text: string, buttons: MessageButton[]): Promise<boolean> {
    this.logger.warn('RCS not implemented yet');
    return false;
  }

  async sendListMessage(
    recipientId: string,
    text: string,
    buttonText: string,
    items: MessageListItem[],
  ): Promise<boolean> {
    this.logger.warn('RCS not implemented yet');
    return false;
  }

  async sendLocationRequest(recipientId: string, text: string): Promise<boolean> {
    this.logger.warn('RCS not implemented yet');
    return false;
  }
}
