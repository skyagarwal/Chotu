import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { WhisperAsrService } from './whisper-asr.service';
import { CloudAsrService } from './cloud-asr.service';
import { TranscribeAudioDto } from '../dto/transcribe-audio.dto';
import { TranscriptionResultDto } from '../dto/transcription-result.dto';

@Injectable()
export class AsrService {
  private readonly logger = new Logger(AsrService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly whisperAsr: WhisperAsrService,
    private readonly cloudAsr: CloudAsrService,
  ) {}

  async transcribe(dto: TranscribeAudioDto): Promise<TranscriptionResultDto> {
    const startTime = Date.now();

    try {
      // 1. Determine provider from DB if 'auto' or not specified
      let provider = dto.provider;
      let modelConfig: any = {};

      if (!provider || provider === 'auto') {
        const activeModel = await this.prisma.model.findFirst({
          where: {
            modelType: 'asr',
            status: 'active',
          },
          orderBy: {
            isLocal: 'desc', // Prefer local models first
          },
        });

        if (activeModel) {
          provider = this.mapDbProviderToService(activeModel.provider);
          modelConfig = activeModel.config || {};
          this.logger.log(`Selected ASR provider from DB: ${provider} (${activeModel.name})`);
        } else {
          provider = 'auto'; // Fallback to hardcoded logic
        }
      }

      // 2. Execute based on provider
      const tryWhisper = provider === 'whisper' || provider === 'vllm-local' || provider === 'auto';
      const tryGoogle = provider === 'google' || provider === 'auto';
      const tryAzure = provider === 'azure' || provider === 'auto';

      if (tryWhisper) {
        this.logger.log('Attempting Whisper ASR (local)');
        try {
          return await this.whisperAsr.transcribe(dto);
        } catch (error) {
          this.logger.warn(`Whisper ASR failed: ${error.message}`);
          if (provider === 'whisper' || provider === 'vllm-local') throw error;
        }
      }

      if (tryGoogle) {
        this.logger.log('Attempting Google Cloud Speech-to-Text');
        try {
          return await this.cloudAsr.transcribeGoogle(dto);
        } catch (error) {
          this.logger.warn(`Google ASR failed: ${error.message}`);
          if (provider === 'google') throw error;
        }
      }

      if (tryAzure) {
        this.logger.log('Attempting Azure Speech Services');
        try {
          return await this.cloudAsr.transcribeAzure(dto);
        } catch (error) {
          this.logger.warn(`Azure ASR failed: ${error.message}`);
          if (provider === 'azure') throw error;
        }
      }

      throw new Error('No ASR provider available');
    } catch (error) {
      this.logger.error(`All ASR providers failed: ${error.message}`, error.stack);

      // Fallback: return empty transcription
      return {
        text: '',
        language: dto.language || 'en',
        confidence: 0,
        provider: 'fallback',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private mapDbProviderToService(dbProvider: string): string {
    switch (dbProvider) {
      case 'vllm-local': return 'whisper';
      case 'openai': return 'whisper'; // OpenAI API uses Whisper
      case 'google': return 'google';
      case 'azure': return 'azure';
      default: return 'auto';
    }
  }

  async getAvailableProviders(): Promise<string[]> {
    const providers: string[] = [];

    // Check Whisper availability
    try {
      await this.whisperAsr.healthCheck();
      providers.push('whisper');
    } catch (error) {
      this.logger.debug('Whisper not available');
    }

    // Check Google availability
    if (this.config.get('GOOGLE_CLOUD_API_KEY')) {
      providers.push('google');
    }

    // Check Azure availability
    if (this.config.get('AZURE_SPEECH_KEY')) {
      providers.push('azure');
    }

    return providers;
  }
}
