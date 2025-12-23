import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Put()
  async updateSettings(@Body() body: { settings: Array<{ key: string; value: string }> }) {
    return this.settingsService.updateSettings(body.settings);
  }

  @Get('labelstudio/test')
  async testLabelStudio() {
    return this.settingsService.testLabelStudio();
  }

  @Get('asr/test')
  async testAsr() {
    return this.settingsService.testAsr();
  }

  @Get('tts/test')
  async testTts() {
    return this.settingsService.testTts();
  }

  @Get('minio/test')
  async testMinio() {
    return this.settingsService.testMinio();
  }

  @Get('key/:key')
  async getSetting(@Param('key') key: string) {
    const value = await this.settingsService.getSetting(key);
    return { key, value };
  }

  @Put('key/:key')
  async updateSetting(@Param('key') key: string, @Body() body: { value: string }) {
    await this.settingsService.updateSettings([{ key, value: body.value }]);
    return { key, value: body.value, success: true };
  }
}
