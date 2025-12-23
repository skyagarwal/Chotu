import { Controller, Get, Put, Body, Param, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { GamificationSettingsService } from '../services/gamification-settings.service';
import { UpdateSettingsDto } from '../dto';

/**
 * Gamification Settings Controller
 * 
 * Endpoints:
 * - GET /api/gamification/settings - Get all settings
 * - GET /api/gamification/settings/:key - Get single setting
 * - PUT /api/gamification/settings - Update multiple settings
 */
@Controller('gamification/settings')
export class GamificationSettingsController {
  private readonly logger = new Logger(GamificationSettingsController.name);

  constructor(
    private readonly settingsService: GamificationSettingsService,
  ) {}

  /**
   * GET /api/gamification/settings
   * Returns all gamification settings grouped by category
   */
  @Get()
  async getAllSettings() {
    try {
      this.logger.log('📊 [GET /api/gamification/settings] Fetching all settings');
      
      const settings = await this.settingsService.getAllSettings();
      this.logger.log(`✅ Retrieved ${settings.length} settings`);
      
      // Group by category for better UI organization
      const grouped = settings.reduce((acc, setting) => {
        const category = setting.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(setting);
        return acc;
      }, {} as Record<string, any[]>);

      return {
        success: true,
        data: {
          all: settings,
          byCategory: grouped,
        },
        meta: {
          total: settings.length,
          categories: Object.keys(grouped),
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch settings: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch settings',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/gamification/settings/:key
   * Returns a single setting by key
   */
  @Get(':key')
  async getSetting(@Param('key') key: string) {
    try {
      this.logger.log(`📊 [GET /api/gamification/settings/${key}] Fetching single setting`);
      
      const value = await this.settingsService.getSetting(key);
      
      if (value === null) {
        throw new HttpException(
          {
            success: false,
            error: 'Setting not found',
            key,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: {
          key,
          value,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to fetch setting ${key}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch setting',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/gamification/settings
   * Update multiple settings at once
   * 
   * Body: { settings: [{ key: string, value: string }] }
   */
  @Put()
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    try {
      this.logger.log(`💾 [PUT /api/gamification/settings] Updating ${dto.settings.length} settings`);
      this.logger.debug(`Settings to update: ${JSON.stringify(dto.settings.map(s => s.key))}`);
      
      const results = await Promise.all(
        dto.settings.map(async ({ key, value }) => {
          try {
            await this.settingsService.updateSetting(key, value, 'admin-api');
            return { key, success: true };
          } catch (error) {
            this.logger.error(`Failed to update ${key}: ${error.message}`);
            return { key, success: false, error: error.message };
          }
        }),
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success);

      // Clear cache after bulk update
      await this.settingsService['loadSettings']();

      return {
        success: failed.length === 0,
        data: {
          updated: successful,
          failed: failed.length,
          results,
        },
        meta: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update settings: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to update settings',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
