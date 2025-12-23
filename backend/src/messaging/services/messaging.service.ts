import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '../../common/enums/platform.enum';
import { Message, MessageButton, MessageListItem } from '../../common/interfaces/common.interface';
import { MessagingProvider } from '../interfaces/messaging-provider.interface';
// import { WhatsAppProvider } from '../providers/whatsapp.provider'; // Disabled
import { RCSProvider } from '../providers/rcs.provider';
import { TelegramProvider } from '../providers/telegram.provider';
import { SessionService } from '../../session/session.service';

/**
 * Unified Messaging Service
 * Routes messages to the appropriate platform provider
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly providers: Map<Platform, MessagingProvider>;

  constructor(
    // private readonly whatsappProvider: WhatsAppProvider, // Disabled
    private readonly rcsProvider: RCSProvider,
    private readonly telegramProvider: TelegramProvider,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {
    // Register all providers (WhatsApp disabled until API keys configured)
    this.providers = new Map<Platform, MessagingProvider>();
    // this.providers.set(Platform.WHATSAPP, whatsappProvider); // Disabled
    this.providers.set(Platform.RCS, rcsProvider);
    this.providers.set(Platform.TELEGRAM, telegramProvider);
  }

  /**
   * Get provider for specific platform
   */
  private getProvider(platform: Platform): MessagingProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider for platform ${platform} not found`);
    }
    return provider;
  }

  /**
   * Resolve platform based on session preference (if enabled)
   */
  private async resolvePlatform(recipientId: string, platform: Platform): Promise<Platform> {
    try {
      const forceBySession = this.configService.get<boolean>('messaging.forceSessionPlatform');
      if (!forceBySession) return platform;
      const sessPlatform = await this.sessionService.getData(recipientId, 'platform');
      if (sessPlatform && Object.values(Platform).includes(sessPlatform)) {
        return sessPlatform as Platform;
      }
      return platform;
    } catch (e) {
      return platform;
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(platform: Platform, recipientId: string, text: string): Promise<boolean> {
    const resolved = await this.resolvePlatform(recipientId, platform);
    const isWebPlatform = recipientId.startsWith('web-');
    
    // For web platform, only store in Redis (no external provider call)
    if (isWebPlatform) {
      this.logger.log(`[web] Storing text message for ${recipientId}`);
      try {
        if (text) {
          await this.sessionService.storeBotMessage(recipientId, text);
          this.logger.log(`💾 Stored bot message for ${recipientId} in Redis`);
        }
        return true; // Success - message stored for WebSocket retrieval
      } catch (error) {
        this.logger.error(`Failed to store bot message: ${error.message}`);
        return false;
      }
    }
    
    // For other platforms (WhatsApp, Telegram, etc), send via provider
    this.logger.log(`[${resolved}] Sending text message to ${recipientId}`);
    const ok = await this.getProvider(resolved).sendTextMessage(recipientId, text);
    
    // Store messages for test mode
    try {
      const testMode = this.configService.get('app.testMode') === true || this.configService.get('app.testMode') === 'true';
      if (testMode && text) {
        await this.sessionService.storeBotMessage(recipientId, text);
        this.logger.log(`💾 Stored bot message for ${recipientId} in Redis (test mode)`);
      }
    } catch (error) {
      this.logger.error(`Failed to store bot message: ${error.message}`);
    }
    return ok;
  }

  /**
   * Send image message
   */
  async sendImageMessage(
    platform: Platform,
    recipientId: string,
    imageUrl: string,
    caption?: string,
  ): Promise<boolean> {
    const resolved = await this.resolvePlatform(recipientId, platform);
    this.logger.log(`[${resolved}] Sending image message to ${recipientId}`);
    return this.getProvider(resolved).sendImageMessage(recipientId, imageUrl, caption);
  }

  /**
   * Send button message
   */
  async sendButtonMessage(
    platform: Platform,
    recipientId: string,
    text: string,
    buttons: MessageButton[],
  ): Promise<boolean> {
    const resolved = await this.resolvePlatform(recipientId, platform);
    const isWebPlatform = recipientId.startsWith('web-');
    
    // For web platform, only store in Redis (no external provider call)
    if (isWebPlatform) {
      this.logger.log(`[web] Storing button message for ${recipientId}`);
      try {
        if (text) {
          const message = JSON.stringify({ text, buttons, type: 'button' });
          await this.sessionService.storeBotMessage(recipientId, message);
          this.logger.log(`💾 Stored button message for ${recipientId} in Redis`);
        }
        return true;
      } catch (error) {
        this.logger.error(`Failed to store button message: ${error.message}`);
        return false;
      }
    }
    
    // For other platforms, send via provider
    this.logger.log(`[${resolved}] Sending button message to ${recipientId}`);
    return this.getProvider(resolved).sendButtonMessage(recipientId, text, buttons);
  }

  /**
   * Send list message
   */
  async sendListMessage(
    platform: Platform,
    recipientId: string,
    text: string,
    buttonText: string,
    items: MessageListItem[],
  ): Promise<boolean> {
    const resolved = await this.resolvePlatform(recipientId, platform);
    const isWebPlatform = recipientId.startsWith('web-');
    
    // For web platform, only store in Redis (no external provider call)
    if (isWebPlatform) {
      this.logger.log(`[web] Storing list message for ${recipientId}`);
      try {
        if (text) {
          const message = JSON.stringify({ text, buttonText, items, type: 'list' });
          await this.sessionService.storeBotMessage(recipientId, message);
          this.logger.log(`💾 Stored list message for ${recipientId} in Redis`);
        }
        return true;
      } catch (error) {
        this.logger.error(`Failed to store list message: ${error.message}`);
        return false;
      }
    }
    
    // For other platforms, send via provider
    this.logger.log(`[${resolved}] Sending list message to ${recipientId}`);
    return this.getProvider(resolved).sendListMessage(recipientId, text, buttonText, items);
  }

  /**
   * Send location request
   */
  async sendLocationRequest(platform: Platform, recipientId: string, text: string): Promise<boolean> {
    const resolved = await this.resolvePlatform(recipientId, platform);
    const isWebPlatform = recipientId.startsWith('web-');
    
    // For web platform, only store in Redis (no external provider call)
    if (isWebPlatform) {
      this.logger.log(`[web] Storing location request for ${recipientId}`);
      try {
        if (text) {
          await this.sessionService.storeBotMessage(recipientId, text);
          this.logger.log(`💾 Stored location request for ${recipientId} in Redis`);
        }
        return true;
      } catch (error) {
        this.logger.error(`Failed to store location request: ${error.message}`);
        return false;
      }
    }
    
    // For other platforms, send via provider
    this.logger.log(`[${resolved}] Sending location request to ${recipientId}`);
    return this.getProvider(resolved).sendLocationRequest(recipientId, text);
  }

  /**
   * Mark message as read
   */
  async markAsRead(platform: Platform, recipientId: string, messageId: string): Promise<boolean> {
    const resolved = await this.resolvePlatform(recipientId, platform);
    const provider = this.getProvider(resolved);
    if (provider.markAsRead) {
      return provider.markAsRead(recipientId, messageId);
    }
    return false;
  }
}
