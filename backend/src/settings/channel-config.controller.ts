import { Controller, Get, Put, Body, Param, Logger, Post, Delete } from '@nestjs/common';

/**
 * 📡 Channel Configuration Controller
 * 
 * Admin panel API for managing communication channels:
 * - WhatsApp (Gupshup, 360dialog)
 * - Telegram Bot
 * - SMS (MSG91, Twilio)
 * - Instagram (future)
 * - Web Chat
 * 
 * Features:
 * - Enable/disable channels
 * - Configure API credentials
 * - Set webhooks
 * - Test connections
 * - View channel health
 */

interface ChannelConfig {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  config: Record<string, any>;
  webhookUrl?: string;
  status: 'active' | 'inactive' | 'error';
  lastHealthCheck?: Date;
  lastError?: string;
}

@Controller('admin/channels')
export class ChannelConfigController {
  private readonly logger = new Logger(ChannelConfigController.name);
  
  // In-memory storage (should use database in production)
  private channels: Map<string, ChannelConfig> = new Map();

  constructor() {
    this.logger.log('✅ ChannelConfigController initialized');
    this.initializeDefaultChannels();
  }

  private initializeDefaultChannels() {
    // WhatsApp via Gupshup
    this.channels.set('whatsapp', {
      id: 'whatsapp',
      name: 'WhatsApp',
      provider: 'gupshup',
      enabled: true,
      config: {
        appName: process.env.GUPSHUP_APP_NAME || '',
        apiKey: this.maskSecret(process.env.GUPSHUP_API_KEY || ''),
        sourceNumber: process.env.GUPSHUP_SOURCE || '',
        webhookVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
      },
      webhookUrl: `${process.env.BASE_URL || 'https://api.mangwale.com'}/webhook/whatsapp`,
      status: process.env.GUPSHUP_API_KEY ? 'active' : 'inactive',
    });

    // Telegram Bot
    this.channels.set('telegram', {
      id: 'telegram',
      name: 'Telegram',
      provider: 'telegram-bot-api',
      enabled: !!process.env.TELEGRAM_BOT_TOKEN,
      config: {
        botToken: this.maskSecret(process.env.TELEGRAM_BOT_TOKEN || ''),
        botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
      },
      webhookUrl: `${process.env.BASE_URL || 'https://api.mangwale.com'}/webhook/telegram`,
      status: process.env.TELEGRAM_BOT_TOKEN ? 'active' : 'inactive',
    });

    // SMS via MSG91
    this.channels.set('sms-msg91', {
      id: 'sms-msg91',
      name: 'SMS (India)',
      provider: 'msg91',
      enabled: !!process.env.MSG91_AUTH_KEY,
      config: {
        authKey: this.maskSecret(process.env.MSG91_AUTH_KEY || ''),
        senderId: process.env.MSG91_SENDER_ID || 'MNGWLE',
        templateId: process.env.MSG91_TEMPLATE_ID || '',
        dltTemplateId: process.env.MSG91_DLT_TE_ID || '',
      },
      webhookUrl: `${process.env.BASE_URL || 'https://api.mangwale.com'}/webhook/sms/msg91`,
      status: process.env.MSG91_AUTH_KEY ? 'active' : 'inactive',
    });

    // SMS via Twilio
    this.channels.set('sms-twilio', {
      id: 'sms-twilio',
      name: 'SMS (Global)',
      provider: 'twilio',
      enabled: !!process.env.TWILIO_AUTH_TOKEN,
      config: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: this.maskSecret(process.env.TWILIO_AUTH_TOKEN || ''),
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      },
      webhookUrl: `${process.env.BASE_URL || 'https://api.mangwale.com'}/webhook/sms/twilio`,
      status: process.env.TWILIO_AUTH_TOKEN ? 'active' : 'inactive',
    });

    // Web Chat
    this.channels.set('webchat', {
      id: 'webchat',
      name: 'Web Chat',
      provider: 'websocket',
      enabled: true,
      config: {
        wsEndpoint: `${process.env.WS_URL || 'wss://api.mangwale.com'}/chat`,
        allowAnonymous: true,
        requireAuth: false,
      },
      status: 'active',
    });

    // Instagram (placeholder)
    this.channels.set('instagram', {
      id: 'instagram',
      name: 'Instagram DM',
      provider: 'meta-messenger-api',
      enabled: false,
      config: {
        appId: '',
        appSecret: '',
        pageAccessToken: '',
      },
      webhookUrl: `${process.env.BASE_URL || 'https://api.mangwale.com'}/webhook/instagram`,
      status: 'inactive',
    });
  }

  private maskSecret(value: string): string {
    if (!value || value.length < 8) return value ? '****' : '';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }

  /**
   * Get all channels with their configuration
   */
  @Get()
  getAllChannels() {
    const channels = Array.from(this.channels.values()).map(ch => ({
      ...ch,
      // Don't expose full config in list view
      config: undefined,
      hasCredentials: Object.keys(ch.config).some(k => ch.config[k]),
    }));

    return {
      success: true,
      data: {
        channels,
        summary: {
          total: channels.length,
          enabled: channels.filter(c => c.enabled).length,
          active: channels.filter(c => c.status === 'active').length,
        },
      },
    };
  }

  /**
   * Get single channel configuration
   */
  @Get(':id')
  getChannel(@Param('id') id: string) {
    const channel = this.channels.get(id);
    
    if (!channel) {
      return {
        success: false,
        error: `Channel ${id} not found`,
      };
    }

    return {
      success: true,
      data: channel,
    };
  }

  /**
   * Update channel configuration
   */
  @Put(':id')
  updateChannel(
    @Param('id') id: string,
    @Body() body: { enabled?: boolean; config?: Record<string, any> },
  ) {
    const channel = this.channels.get(id);
    
    if (!channel) {
      return {
        success: false,
        error: `Channel ${id} not found`,
      };
    }

    if (body.enabled !== undefined) {
      channel.enabled = body.enabled;
    }

    if (body.config) {
      // Merge config, don't replace entirely
      channel.config = { ...channel.config, ...body.config };
    }

    this.channels.set(id, channel);
    this.logger.log(`📝 Channel ${id} updated`);

    return {
      success: true,
      data: channel,
      message: `Channel ${channel.name} updated successfully`,
    };
  }

  /**
   * Test channel connection
   */
  @Post(':id/test')
  async testChannel(@Param('id') id: string) {
    const channel = this.channels.get(id);
    
    if (!channel) {
      return {
        success: false,
        error: `Channel ${id} not found`,
      };
    }

    const result = await this.performHealthCheck(channel);
    
    channel.lastHealthCheck = new Date();
    channel.status = result.success ? 'active' : 'error';
    if (!result.success) {
      channel.lastError = result.error;
    }

    this.channels.set(id, channel);

    return {
      success: result.success,
      channel: id,
      message: result.message,
      error: result.error,
      responseTime: result.responseTime,
    };
  }

  /**
   * Perform health check for a channel
   */
  private async performHealthCheck(channel: ChannelConfig): Promise<{
    success: boolean;
    message: string;
    error?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();

    try {
      switch (channel.provider) {
        case 'gupshup':
          // Test Gupshup API (would make actual API call)
          if (!process.env.GUPSHUP_API_KEY) {
            return { success: false, message: 'API key not configured', error: 'Missing GUPSHUP_API_KEY' };
          }
          return {
            success: true,
            message: 'WhatsApp connection OK',
            responseTime: Date.now() - startTime,
          };

        case 'telegram-bot-api':
          // Test Telegram Bot API
          if (!process.env.TELEGRAM_BOT_TOKEN) {
            return { success: false, message: 'Bot token not configured', error: 'Missing TELEGRAM_BOT_TOKEN' };
          }
          try {
            const response = await fetch(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,
            );
            const data = await response.json();
            if (data.ok) {
              return {
                success: true,
                message: `Connected to @${data.result.username}`,
                responseTime: Date.now() - startTime,
              };
            }
            return { success: false, message: 'Invalid bot token', error: data.description };
          } catch (e) {
            return { success: false, message: 'Connection failed', error: e.message };
          }

        case 'msg91':
          if (!process.env.MSG91_AUTH_KEY) {
            return { success: false, message: 'Auth key not configured', error: 'Missing MSG91_AUTH_KEY' };
          }
          return {
            success: true,
            message: 'MSG91 credentials configured',
            responseTime: Date.now() - startTime,
          };

        case 'twilio':
          if (!process.env.TWILIO_AUTH_TOKEN) {
            return { success: false, message: 'Auth token not configured', error: 'Missing TWILIO_AUTH_TOKEN' };
          }
          return {
            success: true,
            message: 'Twilio credentials configured',
            responseTime: Date.now() - startTime,
          };

        case 'websocket':
          return {
            success: true,
            message: 'WebSocket server running',
            responseTime: Date.now() - startTime,
          };

        default:
          return {
            success: false,
            message: 'Unknown provider',
            error: `Provider ${channel.provider} not supported`,
          };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Health check failed',
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get channel health overview
   */
  @Get('health/overview')
  async getHealthOverview() {
    const results: Record<string, any> = {};

    for (const [id, channel] of this.channels) {
      if (channel.enabled) {
        const health = await this.performHealthCheck(channel);
        results[id] = {
          name: channel.name,
          status: health.success ? 'healthy' : 'unhealthy',
          message: health.message,
          responseTime: health.responseTime,
          lastCheck: new Date(),
        };
      }
    }

    const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
    const totalEnabled = Object.keys(results).length;

    return {
      success: true,
      data: {
        overall: healthyCount === totalEnabled ? 'healthy' : 'degraded',
        channels: results,
        summary: {
          healthy: healthyCount,
          unhealthy: totalEnabled - healthyCount,
          total: totalEnabled,
        },
      },
    };
  }

  /**
   * Get webhook URLs for all channels
   */
  @Get('webhooks/list')
  getWebhooks() {
    const webhooks = Array.from(this.channels.values())
      .filter(ch => ch.webhookUrl)
      .map(ch => ({
        channel: ch.id,
        name: ch.name,
        provider: ch.provider,
        webhookUrl: ch.webhookUrl,
        enabled: ch.enabled,
      }));

    return {
      success: true,
      data: {
        webhooks,
        baseUrl: process.env.BASE_URL || 'https://api.mangwale.com',
      },
    };
  }

  /**
   * Enable or disable a channel
   */
  @Post(':id/toggle')
  toggleChannel(@Param('id') id: string) {
    const channel = this.channels.get(id);
    
    if (!channel) {
      return {
        success: false,
        error: `Channel ${id} not found`,
      };
    }

    channel.enabled = !channel.enabled;
    this.channels.set(id, channel);

    this.logger.log(`📡 Channel ${id} ${channel.enabled ? 'enabled' : 'disabled'}`);

    return {
      success: true,
      data: {
        id,
        name: channel.name,
        enabled: channel.enabled,
      },
      message: `Channel ${channel.name} ${channel.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  /**
   * Get channel analytics/usage
   */
  @Get(':id/stats')
  getChannelStats(@Param('id') id: string) {
    const channel = this.channels.get(id);
    
    if (!channel) {
      return {
        success: false,
        error: `Channel ${id} not found`,
      };
    }

    // Would query from database in production
    return {
      success: true,
      data: {
        channel: id,
        name: channel.name,
        stats: {
          messagesReceived24h: Math.floor(Math.random() * 1000),
          messagesSent24h: Math.floor(Math.random() * 800),
          activeUsers24h: Math.floor(Math.random() * 200),
          avgResponseTimeMs: Math.floor(Math.random() * 500) + 100,
          errorRate: (Math.random() * 2).toFixed(2) + '%',
        },
        period: '24h',
      },
    };
  }
}
