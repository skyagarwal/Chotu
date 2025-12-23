import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TranscribeAudioDto } from '../dto/transcribe-audio.dto';
import { TranscriptionResultDto } from '../dto/transcription-result.dto';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class WhisperAsrService {
  private readonly logger = new Logger(WhisperAsrService.name);
  private readonly whisperUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    // Mercury ASR server default, fallback to Docker internal
    this.whisperUrl = this.config.get('ASR_SERVICE_URL', 'http://192.168.0.151:7001');
    this.logger.log(`🎤 Whisper ASR URL: ${this.whisperUrl}`);
  }

  async transcribe(dto: TranscribeAudioDto): Promise<TranscriptionResultDto> {
    const startTime = Date.now();

    try {
      let audioPath: string;

      // Handle audio URL vs raw data
      if (dto.audioUrl) {
        audioPath = await this.downloadAudio(dto.audioUrl);
      } else if (dto.audioData) {
        audioPath = await this.saveAudioBuffer(dto.audioData);
      } else {
        throw new Error('No audio data provided');
      }

      // Create form data for Whisper API
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      formData.append('language', dto.language === 'auto' ? '' : dto.language);
      formData.append('response_format', 'verbose_json');

      // Call Whisper service - use /transcribe endpoint (not OpenAI-compatible /v1/audio/transcriptions)
      const response = await firstValueFrom(
        this.httpService.post(`${this.whisperUrl}/transcribe`, formData, {
          headers: formData.getHeaders(),
        }),
      );

      const data = response.data;

      // Clean up temporary file
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }

      return {
        text: data.text || '',
        language: data.language || dto.language || 'en',
        confidence: data.confidence || 0.8,
        provider: 'whisper',
        processingTimeMs: Date.now() - startTime,
        audioDurationSeconds: data.duration,
        words: data.words?.map((w: any) => ({
          word: w.word,
          startTime: w.start,
          endTime: w.end,
          confidence: w.confidence || 0.8,
        })),
      };
    } catch (error) {
      this.logger.error(`Whisper transcription failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.whisperUrl}/health`),
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async downloadAudio(url: string): Promise<string> {
    const tempDir = '/tmp/mangwale-asr';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `audio_${Date.now()}.ogg`;
    const filePath = path.join(tempDir, fileName);

    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  }

  private async saveAudioBuffer(buffer: Buffer): Promise<string> {
    const tempDir = '/tmp/mangwale-asr';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `audio_${Date.now()}.ogg`;
    const filePath = path.join(tempDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return filePath;
  }
}
