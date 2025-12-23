import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface Session {
  phoneNumber: string;
  currentStep: string;
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly redis: Redis;
  private readonly sessionTtl: number;

  constructor(private configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      password: this.configService.get('redis.password') || undefined,
      db: this.configService.get('redis.db'),
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('connect', () => {
      this.logger.log(`🔗 Connected to Redis at ${redisConfig.host}:${redisConfig.port} DB ${redisConfig.db}`);
    });

    this.redis.on('error', (err) => {
      this.logger.error(`❌ Redis connection error: ${err.message}`);
    });

    this.sessionTtl = this.configService.get('session.ttl');
    this.logger.log(`✅ Session Service initialized | TTL: ${this.sessionTtl}s`);
  }

  private getSessionKey(phoneNumber: string): string {
    // Channel-agnostic session key (works for WhatsApp, Web, Telegram, SMS, etc.)
    return `session:${phoneNumber}`;
  }

  async getSession(phoneNumber: string): Promise<Session | null> {
    try {
      const key = this.getSessionKey(phoneNumber);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Error getting session for ${phoneNumber}:`, error);
      return null;
    }
  }

  async createSession(phoneNumber: string): Promise<Session> {
    const session: Session = {
      phoneNumber,
      currentStep: 'welcome',
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveSession(phoneNumber, session);
    this.logger.log(`📝 Session created for ${phoneNumber}`);
    return session;
  }

  async saveSession(phoneNumber: string, session: Partial<Session>): Promise<void> {
    try {
      const existingSession = await this.getSession(phoneNumber);
      const updatedSession: Session = {
        ...(existingSession || { phoneNumber, data: {}, createdAt: Date.now() }),
        ...session,
        updatedAt: Date.now(),
      } as Session;

      const key = this.getSessionKey(phoneNumber);
      const sessionData = JSON.stringify(updatedSession);
      
      this.logger.debug(`🔍 About to save: key=${key}, ttl=${this.sessionTtl}, dataSize=${sessionData.length}`);
      
      const result = await this.redis.setex(key, this.sessionTtl, sessionData);
      
      this.logger.log(`💾 Saved session for ${phoneNumber} | Result: ${result} | TTL: ${this.sessionTtl}s | Data keys: ${Object.keys(updatedSession.data || {}).join(', ')}`);
      
      // Verify it was saved
      const verify = await this.redis.exists(key);
      if (verify === 0) {
        this.logger.error(`⚠️ Session key ${key} NOT FOUND after saving!`);
      } else {
        this.logger.debug(`✅ Session key ${key} verified in Redis`);
      }
    } catch (error) {
      this.logger.error(`Error saving session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async updateSession(phoneNumber: string, data: Record<string, any>): Promise<void> {
    const session = await this.getSession(phoneNumber);
    if (!session) {
      await this.createSession(phoneNumber);
    }
    
    await this.saveSession(phoneNumber, {
      data: {
        ...(session?.data || {}),
        ...data,
      },
    });
  }

  async setStep(phoneNumber: string, step: string, data: Record<string, any> = {}): Promise<void> {
    const session = await this.getSession(phoneNumber);
    
    if (!session) {
      await this.createSession(phoneNumber);
    }

    await this.saveSession(phoneNumber, {
      currentStep: step,
      data: {
        ...(session?.data || {}),
        ...data,
      },
    });
  }

  async clearStep(phoneNumber: string): Promise<void> {
    await this.setStep(phoneNumber, 'welcome');
  }

  async getData(phoneNumber: string, key?: string): Promise<any> {
    const session = await this.getSession(phoneNumber);
    if (!session) return null;
    return key ? session.data[key] : session.data;
  }

  async setData(phoneNumber: string, keyOrData: string | Record<string, any>, value?: any): Promise<void> {
    const session = await this.getSession(phoneNumber);
    const data = session?.data || {};
    
    if (typeof keyOrData === 'string') {
      // Single key-value pair
      data[keyOrData] = value;
      this.logger.log(`📝 Setting data for ${phoneNumber}: ${keyOrData} = ${typeof value === 'string' ? value.substring(0, 50) : value}`);
    } else {
      // Multiple data as object
      Object.assign(data, keyOrData);
      this.logger.log(`📝 Setting multiple data for ${phoneNumber}: ${Object.keys(keyOrData).join(', ')}`);
    }
    
    await this.saveSession(phoneNumber, { data });
  }

  async clearOrderData(phoneNumber: string): Promise<void> {
    const session = await this.getSession(phoneNumber);
    if (session) {
      // Clear order-related data while keeping authentication
      const { auth_token, user_info, ...otherData } = session.data;
      const clearedData = {
        auth_token,
        user_info,
        // Reset to initial state
        currentStep: 'modules',
      };
      await this.saveSession(phoneNumber, { 
        data: clearedData,
        currentStep: 'modules'
      });
    }
  }

  async clearSession(phoneNumber: string): Promise<void> {
    const key = this.getSessionKey(phoneNumber);
    await this.redis.del(key);
    this.logger.log(`🗑️ Session cleared for ${phoneNumber}`);
  }

  async deleteSession(phoneNumber: string): Promise<void> {
    // Delete session data
    const sessionKey = this.getSessionKey(phoneNumber);
    await this.redis.del(sessionKey);
    
    // Delete bot messages
    const messagesKey = `bot_messages:${phoneNumber}`;
    await this.redis.del(messagesKey);
    
    this.logger.log(`🗑️ Session and messages deleted for ${phoneNumber}`);
  }

  async getAllSessions(): Promise<Session[]> {
    try {
      const keys = await this.redis.keys('session:*');
      const sessions: Session[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          sessions.push(JSON.parse(data));
        }
      }

      return sessions;
    } catch (error) {
      this.logger.error('Error getting all sessions:', error);
      return [];
    }
  }

  /**
   * Store bot messages for test mode (so frontend can retrieve them)
   */
  async storeBotMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      const key = `bot_messages:${phoneNumber}`;
      await this.redis.rpush(key, JSON.stringify({
        message,
        timestamp: Date.now()
      }));
      await this.redis.expire(key, 300); // 5 minutes TTL
    } catch (error) {
      this.logger.error('Error storing bot message:', error);
    }
  }

  /**
   * Get pending bot messages for frontend
   */
  async getBotMessages(phoneNumber: string): Promise<any[]> {
    try {
      const key = `bot_messages:${phoneNumber}`;
      const messages = await this.redis.lrange(key, 0, -1);
      
      if (messages.length > 0) {
        // Clear the queue after retrieving
        await this.redis.del(key);
      }

      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      this.logger.error('Error getting bot messages:', error);
      return [];
    }
  }

  /**
   * Clear bot messages without retrieving
   */
  async clearBotMessages(phoneNumber: string): Promise<void> {
    try {
      const key = `bot_messages:${phoneNumber}`;
      await this.redis.del(key);
      this.logger.log(`🗑️ Cleared bot messages for ${phoneNumber}`);
    } catch (error) {
      this.logger.error('Error clearing bot messages:', error);
    }
  }

  /**
   * Peek at bot messages without deleting
   */
  async peekBotMessages(phoneNumber: string): Promise<any[]> {
    try {
      const key = `bot_messages:${phoneNumber}`;
      const messages = await this.redis.lrange(key, 0, -1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      this.logger.error('Error peeking bot messages:', error);
      return [];
    }
  }

  /**
   * Check Redis connection health
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear authentication data from a session
   */
  async clearAuth(sessionId: string): Promise<void> {
    try {
      await this.setData(sessionId, {
        user_id: null,
        phone: null,
        auth_token: null,
        user_name: null,
        authenticated: false,
        authenticated_at: null,
      });
      this.logger.log(`🗑️ Cleared auth for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error clearing auth for session ${sessionId}:`, error);
    }
  }
}

