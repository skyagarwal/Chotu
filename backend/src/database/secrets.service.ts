import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import * as crypto from 'crypto';

/**
 * Secrets Service - Secure API key and secret management
 * 
 * Uses AES-256-GCM encryption for secrets stored in DB.
 * Encryption key should be set in SECRETS_ENCRYPTION_KEY env var.
 * 
 * Usage:
 *   // Store a secret
 *   await secretsService.setSecret('groq_api_key', 'gsk_xxx...', 'LLM API key');
 *   
 *   // Retrieve a secret
 *   const key = await secretsService.getSecret('groq_api_key');
 *   
 *   // Fallback to env var if not in DB
 *   const key = await secretsService.getSecretWithFallback('groq_api_key', 'GROQ_API_KEY');
 */
@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private readonly encryptionKey: Buffer;
  private secretsCache: Map<string, string> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Get encryption key from environment (32 bytes for AES-256)
    const keyString = this.configService.get<string>('SECRETS_ENCRYPTION_KEY') 
      || 'mangwale-secrets-key-change-me!'; // Default for dev
    
    // Derive 32-byte key using SHA-256
    this.encryptionKey = crypto.createHash('sha256').update(keyString).digest();
    
    this.logger.log('🔐 SecretsService initialized');
  }

  /**
   * Encrypt a secret value using AES-256-GCM
   */
  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a secret value using AES-256-GCM
   */
  private decrypt(encryptedValue: string): string | null {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        this.logger.warn('Invalid encrypted value format');
        return null;
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to decrypt secret: ${error.message}`);
      return null;
    }
  }

  /**
   * Store a secret in the database (encrypted)
   */
  async setSecret(
    name: string, 
    value: string, 
    description?: string,
    category: string = 'api_key',
    expiresAt?: Date,
  ): Promise<void> {
    const encryptedValue = this.encrypt(value);
    
    await this.prisma.secret.upsert({
      where: { name },
      update: {
        encryptedValue,
        description,
        category,
        lastRotated: new Date(),
        expiresAt: expiresAt || null,
      },
      create: {
        name,
        encryptedValue,
        description,
        category,
        expiresAt: expiresAt || null,
      },
    });

    // Clear cache for this key
    this.secretsCache.delete(name);
    
    this.logger.log(`🔐 Secret '${name}' stored/updated`);
  }

  /**
   * Get a secret from the database (decrypted)
   */
  async getSecret(name: string): Promise<string | null> {
    // Check cache first
    await this.refreshCacheIfNeeded();
    if (this.secretsCache.has(name)) {
      return this.secretsCache.get(name)!;
    }

    try {
      const secret = await this.prisma.secret.findUnique({
        where: { name, isActive: true },
      });

      if (!secret) {
        return null;
      }

      const decrypted = this.decrypt(secret.encryptedValue);
      
      if (decrypted) {
        this.secretsCache.set(name, decrypted);
      }
      
      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to get secret '${name}': ${error.message}`);
      return null;
    }
  }

  /**
   * Get a secret with fallback to environment variable
   */
  async getSecretWithFallback(secretName: string, envVarName: string): Promise<string | null> {
    // Try DB first
    const dbSecret = await this.getSecret(secretName);
    if (dbSecret) {
      return dbSecret;
    }

    // Fallback to env var
    const envSecret = this.configService.get<string>(envVarName);
    return envSecret || null;
  }

  /**
   * Delete a secret
   */
  async deleteSecret(name: string): Promise<void> {
    await this.prisma.secret.update({
      where: { name },
      data: { isActive: false },
    });
    
    this.secretsCache.delete(name);
    this.logger.log(`🔐 Secret '${name}' deactivated`);
  }

  /**
   * List all secrets (without values)
   */
  async listSecrets(): Promise<Array<{ name: string; category: string; description?: string; lastRotated?: Date; expiresAt?: Date }>> {
    const secrets = await this.prisma.secret.findMany({
      where: { isActive: true },
      select: {
        name: true,
        category: true,
        description: true,
        lastRotated: true,
        expiresAt: true,
      },
    });

    return secrets;
  }

  /**
   * Get secrets that are expiring soon (within X days)
   */
  async getExpiringSecrets(withinDays: number = 30): Promise<Array<{ name: string; expiresAt: Date; daysUntilExpiry: number }>> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    const secrets = await this.prisma.secret.findMany({
      where: {
        isActive: true,
        expiresAt: {
          not: null,
          lte: futureDate,
          gt: new Date(), // Not already expired
        },
      },
      select: {
        name: true,
        expiresAt: true,
      },
    });

    return secrets.map(s => ({
      name: s.name,
      expiresAt: s.expiresAt!,
      daysUntilExpiry: Math.ceil((s.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));
  }

  /**
   * Get expired secrets
   */
  async getExpiredSecrets(): Promise<Array<{ name: string; expiresAt: Date }>> {
    const secrets = await this.prisma.secret.findMany({
      where: {
        isActive: true,
        expiresAt: {
          not: null,
          lt: new Date(),
        },
      },
      select: {
        name: true,
        expiresAt: true,
      },
    });

    return secrets.map(s => ({
      name: s.name,
      expiresAt: s.expiresAt!,
    }));
  }

  /**
   * Migrate secrets from environment variables to database
   */
  async migrateFromEnv(envMappings: Record<string, { envVar: string; description: string; category?: string }>): Promise<void> {
    for (const [secretName, config] of Object.entries(envMappings)) {
      const envValue = this.configService.get<string>(config.envVar);
      
      if (envValue && envValue.trim()) {
        await this.setSecret(
          secretName, 
          envValue, 
          config.description,
          config.category || 'api_key',
        );
        this.logger.log(`✅ Migrated ${config.envVar} → ${secretName}`);
      } else {
        this.logger.debug(`⏭️ Skipped ${config.envVar} (empty)`);
      }
    }
  }

  /**
   * Refresh cache if expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    if (Date.now() - this.cacheTimestamp > this.CACHE_TTL) {
      this.secretsCache.clear();
      this.cacheTimestamp = Date.now();
    }
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.secretsCache.clear();
    this.cacheTimestamp = 0;
  }
}
