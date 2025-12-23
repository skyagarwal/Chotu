import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { firstValueFrom } from 'rxjs';
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

@Injectable()
export class VoiceCharactersService {
  private readonly logger = new Logger(VoiceCharactersService.name);
  private readonly ttsServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ttsServiceUrl = this.configService.get('TTS_SERVICE_URL', 'http://192.168.0.151:7002');
  }

  // ==================== Character CRUD ====================

  async findAllCharacters(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.voiceCharacter.findMany({
      where,
      include: {
        languageSettings: true,
        emotionPresets: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        stylePresets: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findCharacterById(id: string) {
    const character = await this.prisma.voiceCharacter.findUnique({
      where: { id },
      include: {
        languageSettings: true,
        emotionPresets: { orderBy: { sortOrder: 'asc' } },
        stylePresets: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!character) {
      throw new NotFoundException(`Character with ID ${id} not found`);
    }
    return character;
  }

  async findCharacterByName(name: string) {
    const character = await this.prisma.voiceCharacter.findUnique({
      where: { name },
      include: {
        languageSettings: true,
        emotionPresets: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        stylePresets: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!character) {
      throw new NotFoundException(`Character "${name}" not found`);
    }
    return character;
  }

  async getDefaultCharacter() {
    let character = await this.prisma.voiceCharacter.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        languageSettings: true,
        emotionPresets: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        stylePresets: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!character) {
      // Fallback to first active character
      character = await this.prisma.voiceCharacter.findFirst({
        where: { isActive: true },
        include: {
          languageSettings: true,
          emotionPresets: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          stylePresets: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return character;
  }

  async createCharacter(dto: CreateVoiceCharacterDto, createdBy?: string) {
    // Check if name already exists
    const existing = await this.prisma.voiceCharacter.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Character with name "${dto.name}" already exists`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.voiceCharacter.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.voiceCharacter.create({
      data: {
        ...dto,
        createdBy,
      },
      include: {
        languageSettings: true,
        emotionPresets: true,
        stylePresets: true,
      },
    });
  }

  async updateCharacter(id: string, dto: UpdateVoiceCharacterDto) {
    await this.findCharacterById(id);

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.voiceCharacter.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.voiceCharacter.update({
      where: { id },
      data: dto,
      include: {
        languageSettings: true,
        emotionPresets: true,
        stylePresets: true,
      },
    });
  }

  async deleteCharacter(id: string) {
    await this.findCharacterById(id);
    return this.prisma.voiceCharacter.delete({ where: { id } });
  }

  // ==================== Language Settings ====================

  async addLanguageSetting(characterId: string, dto: CreateLanguageSettingDto) {
    await this.findCharacterById(characterId);
    
    return this.prisma.voiceLanguageSetting.create({
      data: {
        characterId,
        ...dto,
      },
    });
  }

  async updateLanguageSetting(id: string, dto: UpdateLanguageSettingDto) {
    const setting = await this.prisma.voiceLanguageSetting.findUnique({ where: { id } });
    if (!setting) {
      throw new NotFoundException(`Language setting with ID ${id} not found`);
    }

    return this.prisma.voiceLanguageSetting.update({
      where: { id },
      data: dto,
    });
  }

  async deleteLanguageSetting(id: string) {
    const setting = await this.prisma.voiceLanguageSetting.findUnique({ where: { id } });
    if (!setting) {
      throw new NotFoundException(`Language setting with ID ${id} not found`);
    }
    return this.prisma.voiceLanguageSetting.delete({ where: { id } });
  }

  // ==================== Emotion Presets ====================

  async addEmotionPreset(characterId: string, dto: CreateEmotionPresetDto) {
    await this.findCharacterById(characterId);
    
    return this.prisma.voiceEmotionPreset.create({
      data: {
        characterId,
        ...dto,
      },
    });
  }

  async updateEmotionPreset(id: string, dto: UpdateEmotionPresetDto) {
    const preset = await this.prisma.voiceEmotionPreset.findUnique({ where: { id } });
    if (!preset) {
      throw new NotFoundException(`Emotion preset with ID ${id} not found`);
    }

    return this.prisma.voiceEmotionPreset.update({
      where: { id },
      data: dto,
    });
  }

  async deleteEmotionPreset(id: string) {
    const preset = await this.prisma.voiceEmotionPreset.findUnique({ where: { id } });
    if (!preset) {
      throw new NotFoundException(`Emotion preset with ID ${id} not found`);
    }
    return this.prisma.voiceEmotionPreset.delete({ where: { id } });
  }

  // ==================== Style Presets ====================

  async addStylePreset(characterId: string, dto: CreateStylePresetDto) {
    await this.findCharacterById(characterId);
    
    return this.prisma.voiceStylePreset.create({
      data: {
        characterId,
        ...dto,
      },
    });
  }

  async updateStylePreset(id: string, dto: UpdateStylePresetDto) {
    const preset = await this.prisma.voiceStylePreset.findUnique({ where: { id } });
    if (!preset) {
      throw new NotFoundException(`Style preset with ID ${id} not found`);
    }

    return this.prisma.voiceStylePreset.update({
      where: { id },
      data: dto,
    });
  }

  async deleteStylePreset(id: string) {
    const preset = await this.prisma.voiceStylePreset.findUnique({ where: { id } });
    if (!preset) {
      throw new NotFoundException(`Style preset with ID ${id} not found`);
    }
    return this.prisma.voiceStylePreset.delete({ where: { id } });
  }

  // ==================== TTS Synthesis ====================

  async synthesize(dto: SynthesizeDto): Promise<Buffer> {
    const startTime = Date.now();
    
    // Get character (by name or default)
    let character = dto.character
      ? await this.findCharacterByName(dto.character)
      : await this.getDefaultCharacter();

    if (!character) {
      throw new NotFoundException('No voice character available');
    }

    // Determine TTS parameters
    let exaggeration = character.defaultExaggeration;
    let cfgWeight = character.defaultCfgWeight;
    let speed = character.defaultSpeed;

    // Apply language-specific settings if available
    const language = dto.language || character.defaultLanguage;
    const langSetting = character.languageSettings?.find(l => l.languageCode === language);
    if (langSetting) {
      exaggeration = langSetting.exaggeration;
      cfgWeight = langSetting.cfgWeight;
      speed = langSetting.speed;
    }

    // Apply emotion preset if specified
    if (dto.emotion) {
      const emotionPreset = character.emotionPresets?.find(e => e.name === dto.emotion);
      if (emotionPreset) {
        exaggeration = emotionPreset.exaggeration;
        cfgWeight = emotionPreset.cfgWeight;
        speed = speed * emotionPreset.speedMultiplier;
      }
    }

    // Apply style preset if specified
    if (dto.style) {
      const stylePreset = character.stylePresets?.find(s => s.name === dto.style);
      if (stylePreset) {
        exaggeration = stylePreset.exaggeration;
        cfgWeight = stylePreset.cfgWeight;
        speed = stylePreset.speed;
      }
    }

    // Override with explicit parameters
    if (dto.exaggeration !== undefined) exaggeration = dto.exaggeration;
    if (dto.cfgWeight !== undefined) cfgWeight = dto.cfgWeight;
    if (dto.speed !== undefined) speed = dto.speed;

    this.logger.log(`Synthesizing with character=${character.name}, lang=${language}, exag=${exaggeration}, cfg=${cfgWeight}`);

    try {
      // Call Mercury TTS service
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.ttsServiceUrl}/synthesize`,
          {
            text: dto.text,
            language,
            exaggeration,
            cfg_weight: cfgWeight,
            speed,
          },
          { responseType: 'arraybuffer', timeout: 60000 },
        ),
      );

      const processingTime = Date.now() - startTime;
      const audioBuffer = Buffer.from(response.data);

      // Log usage
      await this.prisma.voiceUsageLog.create({
        data: {
          characterId: character.id,
          text: dto.text,
          language,
          emotionUsed: dto.emotion,
          styleUsed: dto.style,
          exaggeration,
          cfgWeight,
          speed,
          processingTimeMs: processingTime,
          audioBytesSize: audioBuffer.length,
          source: dto.source || 'api',
          sessionId: dto.sessionId,
          success: true,
        },
      });

      return audioBuffer;
    } catch (error: any) {
      // Log failure
      await this.prisma.voiceUsageLog.create({
        data: {
          characterId: character.id,
          text: dto.text,
          language,
          emotionUsed: dto.emotion,
          styleUsed: dto.style,
          exaggeration,
          cfgWeight,
          speed,
          processingTimeMs: Date.now() - startTime,
          source: dto.source || 'api',
          sessionId: dto.sessionId,
          success: false,
          errorMessage: error.message,
        },
      });

      this.logger.error(`TTS synthesis failed: ${error.message}`);
      throw error;
    }
  }


  // ==================== Persona Generation ====================
  
  /**
   * Generate system prompt for a character persona
   * Used by AgentOrchestrator to inject personality into chatbot
   */
  async generateSystemPromptForCharacter(characterName: string): Promise<string> {
    try {
      const character = await this.findCharacterByName(characterName);
      
      if (!character || !character.isActive) {
        this.logger.warn(`Character "${characterName}" not found or inactive`);
        return ''; // Return empty string to use default system prompt
      }
      
      const personality = character.personality as any;
      const background = personality?.background || '';
      const style = personality?.style || '';
      const traits = character.traits || [];
      
      // Build persona prompt
      const personaPrompt = `You are ${character.displayName} - ${character.description}

CHARACTER BACKGROUND:
${background}

COMMUNICATION STYLE:
${style}

PERSONALITY TRAITS:
${traits.map(t => `- ${t}`).join('\n')}

IMPORTANT GUIDELINES:
- Embody this character's personality in all your responses
- Use the communication style that matches this character
- Stay in character while being helpful and accurate
- Balance personality with professionalism
`;
      
      return personaPrompt;
    } catch (error) {
      this.logger.error(`Failed to generate persona: ${error.message}`);
      return '';
    }
  }



  // ==================== Analytics ====================

  async getUsageStats(characterId?: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = { createdAt: { gte: since } };
    if (characterId) {
      where.characterId = characterId;
    }

    const [total, successful, byCharacter, byLanguage, avgProcessingTime] = await Promise.all([
      this.prisma.voiceUsageLog.count({ where }),
      this.prisma.voiceUsageLog.count({ where: { ...where, success: true } }),
      this.prisma.voiceUsageLog.groupBy({
        by: ['characterId'],
        where,
        _count: true,
      }),
      this.prisma.voiceUsageLog.groupBy({
        by: ['language'],
        where,
        _count: true,
      }),
      this.prisma.voiceUsageLog.aggregate({
        where: { ...where, success: true },
        _avg: { processingTimeMs: true },
      }),
    ]);

    return {
      period: { days, since },
      total,
      successful,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
      avgProcessingTimeMs: avgProcessingTime._avg.processingTimeMs || 0,
      byCharacter,
      byLanguage,
    };
  }

  // ==================== Seed Default Characters ====================

  async seedDefaultCharacters() {
    const chotu = await this.prisma.voiceCharacter.upsert({
      where: { name: 'chotu' },
      update: {},
      create: {
        name: 'chotu',
        displayName: 'Chotu - The Helpful Assistant',
        description: 'A sweet, innocent village boy working in the city. Always eager to help with a warm, pleasing nature.',
        personality: {
          background: 'Young village boy who moved to the city to work. Innocent and helpful.',
          style: 'Warm, friendly, slightly shy but eager to please',
          traits: ['helpful', 'innocent', 'polite', 'warm', 'eager'],
        },
        traits: ['helpful', 'innocent', 'polite', 'warm', 'shy', 'eager'],
        defaultLanguage: 'hi',
        defaultExaggeration: 0.35,
        defaultCfgWeight: 0.35,
        defaultSpeed: 1.0,
        defaultPitch: 1.0,
        ttsEngine: 'chatterbox',
        isActive: true,
        isDefault: true,
        sortOrder: 1,
      },
    });

    // Add Chotu's emotions
    const chotuEmotions = [
      { name: 'sweet', displayName: 'Sweet & Warm', category: 'positive', exaggeration: 0.3, cfgWeight: 0.3, speedMultiplier: 0.95 },
      { name: 'innocent', displayName: 'Innocent & Pure', category: 'positive', exaggeration: 0.25, cfgWeight: 0.25, speedMultiplier: 0.9 },
      { name: 'helpful', displayName: 'Helpful & Eager', category: 'positive', exaggeration: 0.4, cfgWeight: 0.35, speedMultiplier: 1.0 },
      { name: 'polite', displayName: 'Polite & Respectful', category: 'neutral', exaggeration: 0.3, cfgWeight: 0.3, speedMultiplier: 0.95 },
      { name: 'apologetic', displayName: 'Apologetic', category: 'apologetic', exaggeration: 0.25, cfgWeight: 0.25, speedMultiplier: 0.85 },
      { name: 'excited', displayName: 'Excited', category: 'positive', exaggeration: 0.5, cfgWeight: 0.45, speedMultiplier: 1.1 },
    ];

    for (const emotion of chotuEmotions) {
      await this.prisma.voiceEmotionPreset.upsert({
        where: { characterId_name: { characterId: chotu.id, name: emotion.name } },
        update: emotion,
        create: { characterId: chotu.id, ...emotion, isActive: true },
      });
    }

    // Add Chotu's styles
    const chotuStyles = [
      { name: 'greeting', displayName: 'Greeting', exaggeration: 0.35, cfgWeight: 0.35, speed: 1.0, sampleText: 'नमस्ते! मैं छोटू हूं। आपकी क्या सेवा करूं?' },
      { name: 'informative', displayName: 'Informative', exaggeration: 0.3, cfgWeight: 0.3, speed: 0.95, sampleText: 'जी हां, मैं आपको बताता हूं।' },
      { name: 'apologetic', displayName: 'Apologetic', exaggeration: 0.25, cfgWeight: 0.25, speed: 0.9, sampleText: 'माफ करें, मुझे समझ नहीं आया।' },
      { name: 'farewell', displayName: 'Farewell', exaggeration: 0.3, cfgWeight: 0.3, speed: 0.95, sampleText: 'धन्यवाद! फिर मिलेंगे।' },
    ];

    for (const style of chotuStyles) {
      await this.prisma.voiceStylePreset.upsert({
        where: { characterId_name: { characterId: chotu.id, name: style.name } },
        update: style,
        create: { characterId: chotu.id, ...style, isActive: true },
      });
    }

    // Add language settings for Chotu
    const chotuLanguages = [
      { languageCode: 'hi', languageName: 'Hindi', exaggeration: 0.35, cfgWeight: 0.35, speed: 1.0 },
      { languageCode: 'en', languageName: 'English', exaggeration: 0.4, cfgWeight: 0.4, speed: 1.0 },
      { languageCode: 'mr', languageName: 'Marathi', exaggeration: 0.35, cfgWeight: 0.35, speed: 1.0 },
    ];

    for (const lang of chotuLanguages) {
      await this.prisma.voiceLanguageSetting.upsert({
        where: { characterId_languageCode: { characterId: chotu.id, languageCode: lang.languageCode } },
        update: lang,
        create: { characterId: chotu.id, ...lang, isEnabled: true },
      });
    }

    this.logger.log('✅ Seeded default voice characters');
    return { chotu };
  }
}
