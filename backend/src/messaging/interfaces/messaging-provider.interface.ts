import { Platform } from '../../common/enums/platform.enum';
import { Message, MessageButton, MessageListItem } from '../../common/interfaces/common.interface';

/**
 * Interface that all messaging providers must implement
 * This allows us to support WhatsApp, RCS, Telegram, etc.
 */
export interface MessagingProvider {
  /**
   * Platform identifier
   */
  readonly platform: Platform;

  /**
   * Send a text message
   */
  sendTextMessage(recipientId: string, text: string): Promise<boolean>;

  /**
   * Send an image message
   */
  sendImageMessage(recipientId: string, imageUrl: string, caption?: string): Promise<boolean>;

  /**
   * Send a message with buttons
   */
  sendButtonMessage(recipientId: string, text: string, buttons: MessageButton[]): Promise<boolean>;

  /**
   * Send a list message
   */
  sendListMessage(
    recipientId: string,
    text: string,
    buttonText: string,
    items: MessageListItem[],
  ): Promise<boolean>;

  /**
   * Send location request
   */
  sendLocationRequest(recipientId: string, text: string): Promise<boolean>;

  /**
   * Mark message as read
   */
  markAsRead?(recipientId: string, messageId: string): Promise<boolean>;

  /**
   * Get user profile information
   */
  getUserProfile?(recipientId: string): Promise<{
    name?: string;
    profilePicture?: string;
  }>;
}
