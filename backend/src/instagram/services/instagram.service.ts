import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * 📸 Instagram DM Service
 * 
 * Uses Instagram Messaging API (via Meta Messenger Platform):
 * - Send text messages
 * - Send images and media
 * - Send quick replies (interactive buttons)
 * - Handle incoming DMs
 * 
 * Prerequisites:
 * - Facebook Developer App with Instagram Messaging enabled
 * - Instagram Business/Creator account linked to Facebook Page
 * - Page Access Token with instagram_manage_messages permission
 * 
 * @see https://developers.facebook.com/docs/instagram-api/guides/messaging
 */

export interface InstagramMessage {
  recipientId: string;
  message: string;
  quickReplies?: InstagramQuickReply[];
  imageUrl?: string;
}

export interface InstagramQuickReply {
  title: string;
  payload: string;
}

export interface InstagramMediaMessage {
  recipientId: string;
  mediaType: 'image' | 'video' | 'audio';
  mediaUrl: string;
}

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v19.0';
  private readonly pageAccessToken: string;
  private readonly instagramAccountId: string;
  private readonly appSecret: string;
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.pageAccessToken = this.configService.get('INSTAGRAM_PAGE_ACCESS_TOKEN', '');
    this.instagramAccountId = this.configService.get('INSTAGRAM_ACCOUNT_ID', '');
    this.appSecret = this.configService.get('FACEBOOK_APP_SECRET', '');

    this.enabled = !!(this.pageAccessToken && this.instagramAccountId);
    
    if (this.enabled) {
      this.logger.log('✅ Instagram DM Service initialized');
    } else {
      this.logger.warn('⚠️ Instagram DM Service disabled (missing credentials)');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Send a text message via Instagram DM
   */
  async sendTextMessage(msg: InstagramMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Instagram service not configured' };
    }

    try {
      const payload: any = {
        recipient: {
          id: msg.recipientId,
        },
        message: {
          text: msg.message,
        },
      };

      // Add quick replies if provided
      if (msg.quickReplies && msg.quickReplies.length > 0) {
        payload.message.quick_replies = msg.quickReplies.map(qr => ({
          content_type: 'text',
          title: qr.title.substring(0, 20), // Max 20 chars
          payload: qr.payload,
        }));
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/${this.instagramAccountId}/messages`,
          payload,
          {
            params: { access_token: this.pageAccessToken },
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      this.logger.log(`📤 Instagram DM sent to ${msg.recipientId}`);
      return { success: true, messageId: response.data.message_id };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Instagram send failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Send an image via Instagram DM
   */
  async sendImage(msg: InstagramMediaMessage): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Instagram service not configured' };
    }

    try {
      const payload = {
        recipient: {
          id: msg.recipientId,
        },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: msg.mediaUrl,
              is_reusable: true,
            },
          },
        },
      };

      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/${this.instagramAccountId}/messages`,
          payload,
          {
            params: { access_token: this.pageAccessToken },
          },
        ),
      );

      this.logger.log(`📷 Instagram image sent to ${msg.recipientId}`);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Instagram image send failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Send a generic template (card with image, title, buttons)
   */
  async sendCard(
    recipientId: string,
    card: {
      title: string;
      subtitle?: string;
      imageUrl?: string;
      buttons?: Array<{ title: string; url?: string; payload?: string }>;
    },
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Instagram service not configured' };
    }

    try {
      const buttons = (card.buttons || []).map(btn => {
        if (btn.url) {
          return {
            type: 'web_url',
            url: btn.url,
            title: btn.title.substring(0, 20),
          };
        }
        return {
          type: 'postback',
          title: btn.title.substring(0, 20),
          payload: btn.payload || btn.title,
        };
      }).slice(0, 3); // Max 3 buttons

      const payload = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: card.title.substring(0, 80),
                  subtitle: card.subtitle?.substring(0, 80),
                  image_url: card.imageUrl,
                  buttons: buttons.length > 0 ? buttons : undefined,
                },
              ],
            },
          },
        },
      };

      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/${this.instagramAccountId}/messages`,
          payload,
          {
            params: { access_token: this.pageAccessToken },
          },
        ),
      );

      this.logger.log(`🎴 Instagram card sent to ${recipientId}`);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Instagram card send failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Mark a message as seen (read receipt)
   */
  async markSeen(recipientId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/${this.instagramAccountId}/messages`,
          {
            recipient: { id: recipientId },
            sender_action: 'mark_seen',
          },
          {
            params: { access_token: this.pageAccessToken },
          },
        ),
      );
    } catch (error) {
      // Silent fail for mark_seen
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(recipientId: string, on: boolean = true): Promise<void> {
    if (!this.enabled) return;

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/${this.instagramAccountId}/messages`,
          {
            recipient: { id: recipientId },
            sender_action: on ? 'typing_on' : 'typing_off',
          },
          {
            params: { access_token: this.pageAccessToken },
          },
        ),
      );
    } catch (error) {
      // Silent fail for typing indicator
    }
  }

  /**
   * Get user profile info
   */
  async getUserProfile(userId: string): Promise<{
    name?: string;
    profilePic?: string;
    username?: string;
  } | null> {
    if (!this.enabled) return null;

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/${userId}`, {
          params: {
            fields: 'name,profile_pic,username',
            access_token: this.pageAccessToken,
          },
        }),
      );

      return {
        name: response.data.name,
        profilePic: response.data.profile_pic,
        username: response.data.username,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse incoming webhook event
   */
  parseWebhookEvent(body: any): {
    senderId: string;
    messageText?: string;
    quickReplyPayload?: string;
    attachments?: Array<{ type: string; url: string }>;
    storyMention?: string;
    isEcho?: boolean;
  } | null {
    try {
      // Instagram webhooks come through the "instagram" object in Messenger Platform
      const entry = body?.entry?.[0];
      if (!entry) return null;

      const messaging = entry.messaging?.[0];
      if (!messaging) return null;

      const senderId = messaging.sender?.id;
      if (!senderId) return null;

      // Skip echo messages (our own messages)
      if (messaging.message?.is_echo) {
        return { senderId, isEcho: true };
      }

      // Text message
      if (messaging.message?.text) {
        return {
          senderId,
          messageText: messaging.message.text,
          quickReplyPayload: messaging.message.quick_reply?.payload,
        };
      }

      // Attachments (images, videos, etc.)
      if (messaging.message?.attachments) {
        return {
          senderId,
          attachments: messaging.message.attachments.map((att: any) => ({
            type: att.type,
            url: att.payload?.url,
          })),
        };
      }

      // Story mention
      if (messaging.message?.story_mention) {
        return {
          senderId,
          storyMention: messaging.message.story_mention.url,
        };
      }

      // Postback (from buttons)
      if (messaging.postback) {
        return {
          senderId,
          quickReplyPayload: messaging.postback.payload,
        };
      }

      return { senderId };
    } catch (error) {
      this.logger.error(`Failed to parse Instagram webhook: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify webhook signature (for security)
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.appSecret) return true; // Skip verification if no secret

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');

    return `sha256=${expectedSignature}` === signature;
  }
}
