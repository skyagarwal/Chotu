import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GamificationSettingsService {
  private readonly logger = new Logger(GamificationSettingsService.name);
  private settingsCache: Map<string, { value: any; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async getSetting(key: string): Promise<any> {
    const cached = this.settingsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const setting = await this.prisma.gamificationSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      this.logger.warn(`Setting not found: ${key}`);
      return null;
    }

    let parsedValue: any;
    switch (setting.type) {
      case 'number':
        parsedValue = parseFloat(setting.value);
        break;
      case 'boolean':
        parsedValue = setting.value === 'true';
        break;
      case 'json':
        parsedValue = JSON.parse(setting.value);
        break;
      default:
        parsedValue = setting.value;
    }

    this.settingsCache.set(key, {
      value: parsedValue,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return parsedValue;
  }

  async isGameSystemEnabled(): Promise<boolean> {
    return (await this.getSetting('game_system_enabled')) === true;
  }

  async getRewardAmount(gameType: string): Promise<number> {
    const key = `reward_${gameType}`;
    const amount = await this.getSetting(key);
    return amount || 0;
  }

  async getMaxGamesPerDay(): Promise<number> {
    return (await this.getSetting('max_games_per_day')) || 10;
  }

  async getMinConfidenceAutoSave(): Promise<number> {
    return (await this.getSetting('min_confidence_auto_save')) || 0.85;
  }

  clearCache(): void {
    this.settingsCache.clear();
  }

  /**
   * Get all settings from database
   */
  async getAllSettings(): Promise<any[]> {
    return this.prisma.gamificationSettings.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });
  }

  /**
   * Update a setting value
   */
  async updateSetting(key: string, value: string, updatedBy: string): Promise<void> {
    await this.prisma.gamificationSettings.update({
      where: { key },
      data: {
        value,
        updatedBy,
        updatedAt: new Date(),
      },
    });

    // Clear cache for this key
    this.settingsCache.delete(key);
    this.logger.log(`Updated setting ${key} by ${updatedBy}`);
  }

  /**
   * Load all settings into cache
   */
  private async loadSettings(): Promise<void> {
    const settings = await this.getAllSettings();
    this.settingsCache.clear();
    
    for (const setting of settings) {
      let parsedValue: any;
      switch (setting.type) {
        case 'number':
          parsedValue = parseFloat(setting.value);
          break;
        case 'boolean':
          parsedValue = setting.value === 'true';
          break;
        case 'json':
          parsedValue = JSON.parse(setting.value);
          break;
        default:
          parsedValue = setting.value;
      }

      this.settingsCache.set(setting.key, {
        value: parsedValue,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });
    }

    this.logger.log(`Loaded ${settings.length} settings into cache`);
  }
}
