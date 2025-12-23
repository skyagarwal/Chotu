import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { XttsService } from './xtts.service';
import { CloudTtsService } from './cloud-tts.service';
import { SynthesizeSpeechDto } from '../dto/synthesize-speech.dto';
import { SynthesisResultDto } from '../dto/synthesis-result.dto';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly xttsService: XttsService,
    private readonly cloudTtsService: CloudTtsService,
  ) {}

  async synthesize(dto: SynthesizeSpeechDto): Promise<SynthesisResultDto> {
    const startTime = Date.now();

    try {
      // 1. Determine provider from DB if 'auto' or not specified
      let provider = dto.provider;
      let modelConfig: any = {};

      if (!provider || provider === 'auto') {
        const activeModel = await this.prisma.model.findFirst({
          where: {
            modelType: 'tts',
            status: 'active',
          },
          orderBy: {
            isLocal: 'desc', // Prefer local models first
          },
        });

        if (activeModel) {
          provider = this.mapDbProviderToService(activeModel.provider);
          modelConfig = activeModel.config || {};
          this.logger.log(`Selected TTS provider from DB: ${provider} (${activeModel.name})`);
        } else {
          provider = 'auto'; // Fallback to hardcoded logic
        }
      }

      // 2. Execute based on provider
      const tryXtts = provider === 'xtts' || provider === 'vllm-local' || provider === 'auto';
      const tryGoogle = provider === 'google' || provider === 'auto';
      const tryAzure = provider === 'azure' || provider === 'auto';

      if (tryXtts) {
        this.logger.log('Attempting XTTS neural synthesis');
        try {
          // Merge DB config with DTO
          const mergedDto = { ...dto };
          if (modelConfig.voice && !mergedDto.voice) mergedDto.voice = modelConfig.voice;
          if (modelConfig.speed && !mergedDto.speed) mergedDto.speed = modelConfig.speed;

          return await this.xttsService.synthesize(mergedDto);
        } catch (error) {
          this.logger.warn(`XTTS failed: ${error.message}`);
          if (provider === 'xtts' || provider === 'vllm-local') throw error;
        }
      }

      if (tryGoogle) {
        this.logger.log('Attempting Google Cloud TTS');
        try {
          return await this.cloudTtsService.synthesizeGoogle(dto);
        } catch (error) {
          this.logger.warn(`Google TTS failed: ${error.message}`);
          if (provider === 'google') throw error;
        }
      }

      if (tryAzure) {
        this.logger.log('Attempting Azure Speech Services');
        try {
          return await this.cloudTtsService.synthesizeAzure(dto);
        } catch (error) {
          this.logger.warn(`Azure TTS failed: ${error.message}`);
          if (provider === 'azure') throw error;
        }
      }

      throw new Error('No TTS provider available');
    } catch (error) {
      this.logger.error(`All TTS providers failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapDbProviderToService(dbProvider: string): string {
    switch (dbProvider) {
      case 'vllm-local': return 'xtts'; // Our local TTS is XTTS
      case 'google': return 'google';
      case 'azure': return 'azure';
      default: return 'auto';
    }
  }

  async getAvailableVoices(language?: string): Promise<any[]> {
    const voices: any[] = [];

    // Get XTTS voices
    try {
      const xttsVoices = await this.xttsService.getVoices(language);
      voices.push(...xttsVoices);
    } catch (error) {
      this.logger.debug('XTTS voices not available');
    }

    return voices;
  }
}
