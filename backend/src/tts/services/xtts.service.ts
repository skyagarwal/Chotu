import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SynthesizeSpeechDto } from '../dto/synthesize-speech.dto';
import { SynthesisResultDto } from '../dto/synthesis-result.dto';

@Injectable()
export class XttsService {
  private readonly logger = new Logger(XttsService.name);
  private readonly xttsUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    // Mercury TTS server default
    this.xttsUrl = this.config.get('TTS_SERVICE_URL', 'http://192.168.0.151:7002');
  }

  async synthesize(dto: SynthesizeSpeechDto): Promise<SynthesisResultDto> {
    const startTime = Date.now();

    // Get the language (first 2 chars for base language)
    const lang = (dto.language || 'en').split('-')[0];

    try {
      // Call Mercury TTS service at /synthesize endpoint
      // Supports Kokoro (en), Chatterbox (hi, mr, bn, gu, etc)
      const response = await firstValueFrom(
        this.httpService.post(`${this.xttsUrl}/synthesize`, {
          text: dto.text,
          language: lang,
          voice: dto.voice || (lang === 'hi' ? 'chotu' : 'af_bella'),
          speed: dto.speed || 1.0,
          emotion: 'neutral',
          style: lang === 'hi' ? 'chotu_helpful' : 'default',
        }, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30s timeout for TTS generation
        }),
      );

      // Response is raw audio data (arraybuffer)
      const audioBuffer = Buffer.from(response.data);

      return {
        audioUrl: undefined,
        audioData: audioBuffer,
        format: 'wav',
        duration: 0, // Duration not provided by service
        provider: 'mercury-tts',
        processingTimeMs: Date.now() - startTime,
        voice: dto.voice || 'default',
        language: dto.language || 'en',
      };
    } catch (error) {
      this.logger.error(`Mercury TTS synthesis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getVoices(language?: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.xttsUrl}/voices`),
      );

      // Mercury TTS returns { kokoro: {...}, chatterbox: {...} }
      const voices: any[] = [];
      const data = response.data;
      
      if (data.kokoro) {
        data.kokoro.voices?.forEach((v: string) => voices.push({ provider: 'kokoro', name: v, language: 'en' }));
      }
      if (data.chatterbox) {
        data.chatterbox.styles?.forEach((s: string) => voices.push({ provider: 'chatterbox', name: s, languages: data.chatterbox.languages }));
      }
      
      return voices;
    } catch (error) {
      this.logger.warn(`Failed to get TTS voices: ${error.message}`);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.xttsUrl}/health`),
      );
      return response.status === 200 && response.data?.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}
