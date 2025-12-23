import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { VoiceCharactersService } from './voice-characters.service';
import {
  CreateVoiceCharacterDto,
  UpdateVoiceCharacterDto,
  CreateEmotionPresetDto,
  UpdateEmotionPresetDto,
  CreateStylePresetDto,
  UpdateStylePresetDto,
  CreateLanguageSettingDto,
  UpdateLanguageSettingDto,
  SynthesizeDto,
} from './dto';

@ApiTags('Voice Characters')
@Controller('voice-characters')
export class VoiceCharactersController {
  private readonly logger = new Logger(VoiceCharactersController.name);

  constructor(private readonly voiceCharactersService: VoiceCharactersService) {}

  // ==================== Characters ====================

  @Get()
  @ApiOperation({ summary: 'Get all voice characters' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of voice characters' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.voiceCharactersService.findAllCharacters(includeInactive === 'true');
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default voice character' })
  @ApiResponse({ status: 200, description: 'Default voice character' })
  async getDefault() {
    return this.voiceCharactersService.getDefaultCharacter();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get voice character by ID' })
  @ApiParam({ name: 'id', description: 'Character ID' })
  @ApiResponse({ status: 200, description: 'Voice character details' })
  async findOne(@Param('id') id: string) {
    return this.voiceCharactersService.findCharacterById(id);
  }

  @Get('name/:name')
  @ApiOperation({ summary: 'Get voice character by name' })
  @ApiParam({ name: 'name', description: 'Character name (slug)' })
  @ApiResponse({ status: 200, description: 'Voice character details' })
  async findByName(@Param('name') name: string) {
    return this.voiceCharactersService.findCharacterByName(name);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new voice character' })
  @ApiResponse({ status: 201, description: 'Character created successfully' })
  async create(@Body() dto: CreateVoiceCharacterDto) {
    return this.voiceCharactersService.createCharacter(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a voice character' })
  @ApiParam({ name: 'id', description: 'Character ID' })
  @ApiResponse({ status: 200, description: 'Character updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateVoiceCharacterDto) {
    return this.voiceCharactersService.updateCharacter(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a voice character' })
  @ApiParam({ name: 'id', description: 'Character ID' })
  @ApiResponse({ status: 200, description: 'Character deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.voiceCharactersService.deleteCharacter(id);
  }

  // ==================== Language Settings ====================

  @Post(':characterId/languages')
  @ApiOperation({ summary: 'Add language setting to character' })
  @ApiParam({ name: 'characterId', description: 'Character ID' })
  @ApiResponse({ status: 201, description: 'Language setting added' })
  async addLanguage(
    @Param('characterId') characterId: string,
    @Body() dto: CreateLanguageSettingDto,
  ) {
    return this.voiceCharactersService.addLanguageSetting(characterId, dto);
  }

  @Put('languages/:id')
  @ApiOperation({ summary: 'Update language setting' })
  @ApiParam({ name: 'id', description: 'Language setting ID' })
  @ApiResponse({ status: 200, description: 'Language setting updated' })
  async updateLanguage(@Param('id') id: string, @Body() dto: UpdateLanguageSettingDto) {
    return this.voiceCharactersService.updateLanguageSetting(id, dto);
  }

  @Delete('languages/:id')
  @ApiOperation({ summary: 'Delete language setting' })
  @ApiParam({ name: 'id', description: 'Language setting ID' })
  @ApiResponse({ status: 200, description: 'Language setting deleted' })
  async removeLanguage(@Param('id') id: string) {
    return this.voiceCharactersService.deleteLanguageSetting(id);
  }

  // ==================== Emotion Presets ====================

  @Post(':characterId/emotions')
  @ApiOperation({ summary: 'Add emotion preset to character' })
  @ApiParam({ name: 'characterId', description: 'Character ID' })
  @ApiResponse({ status: 201, description: 'Emotion preset added' })
  async addEmotion(
    @Param('characterId') characterId: string,
    @Body() dto: CreateEmotionPresetDto,
  ) {
    return this.voiceCharactersService.addEmotionPreset(characterId, dto);
  }

  @Put('emotions/:id')
  @ApiOperation({ summary: 'Update emotion preset' })
  @ApiParam({ name: 'id', description: 'Emotion preset ID' })
  @ApiResponse({ status: 200, description: 'Emotion preset updated' })
  async updateEmotion(@Param('id') id: string, @Body() dto: UpdateEmotionPresetDto) {
    return this.voiceCharactersService.updateEmotionPreset(id, dto);
  }

  @Delete('emotions/:id')
  @ApiOperation({ summary: 'Delete emotion preset' })
  @ApiParam({ name: 'id', description: 'Emotion preset ID' })
  @ApiResponse({ status: 200, description: 'Emotion preset deleted' })
  async removeEmotion(@Param('id') id: string) {
    return this.voiceCharactersService.deleteEmotionPreset(id);
  }

  // ==================== Style Presets ====================

  @Post(':characterId/styles')
  @ApiOperation({ summary: 'Add style preset to character' })
  @ApiParam({ name: 'characterId', description: 'Character ID' })
  @ApiResponse({ status: 201, description: 'Style preset added' })
  async addStyle(
    @Param('characterId') characterId: string,
    @Body() dto: CreateStylePresetDto,
  ) {
    return this.voiceCharactersService.addStylePreset(characterId, dto);
  }

  @Put('styles/:id')
  @ApiOperation({ summary: 'Update style preset' })
  @ApiParam({ name: 'id', description: 'Style preset ID' })
  @ApiResponse({ status: 200, description: 'Style preset updated' })
  async updateStyle(@Param('id') id: string, @Body() dto: UpdateStylePresetDto) {
    return this.voiceCharactersService.updateStylePreset(id, dto);
  }

  @Delete('styles/:id')
  @ApiOperation({ summary: 'Delete style preset' })
  @ApiParam({ name: 'id', description: 'Style preset ID' })
  @ApiResponse({ status: 200, description: 'Style preset deleted' })
  async removeStyle(@Param('id') id: string) {
    return this.voiceCharactersService.deleteStylePreset(id);
  }

  // ==================== TTS Synthesis ====================

  @Post('synthesize')
  @ApiOperation({ summary: 'Synthesize speech using voice character' })
  @ApiResponse({ status: 200, description: 'Audio data', content: { 'audio/wav': {} } })
  async synthesize(@Body() dto: SynthesizeDto, @Res() res: Response) {
    try {
      const audioBuffer = await this.voiceCharactersService.synthesize(dto);
      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length,
        'Content-Disposition': 'inline; filename="speech.wav"',
      });
      res.send(audioBuffer);
    } catch (error: any) {
      this.logger.error(`Synthesis failed: ${error.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==================== Analytics & Utilities ====================

  @Get('stats/usage')
  @ApiOperation({ summary: 'Get voice usage statistics' })
  @ApiQuery({ name: 'characterId', required: false })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getStats(
    @Query('characterId') characterId?: string,
    @Query('days') days?: string,
  ) {
    return this.voiceCharactersService.getUsageStats(characterId, days ? parseInt(days) : 7);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed default voice characters' })
  @ApiResponse({ status: 200, description: 'Default characters seeded' })
  async seed() {
    return this.voiceCharactersService.seedDefaultCharacters();
  }
}
