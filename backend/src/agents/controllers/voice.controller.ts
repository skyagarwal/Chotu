import { 
  Controller, 
  Post, 
  Body, 
  Logger, 
  HttpException, 
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData = require('form-data');

/**
 * Voice Controller
 * 
 * Proxies voice requests (ASR transcription, TTS synthesis) 
 * from chat frontend to Admin Backend voice services
 */
@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);
  private readonly adminBackendUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.adminBackendUrl = this.configService.get<string>('ADMIN_BACKEND_URL') || 'http://localhost:3002';
    this.logger.log(`✅ Voice Controller initialized - Admin Backend: ${this.adminBackendUrl}`);
  }

  /**
   * Transcribe audio to text (ASR)
   * 
   * POST /voice/transcribe
   * Body: FormData with 'audio' file
   * Returns: { text: string, language: string, confidence: number }
   */
  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() body: { language?: string },
  ) {
    this.logger.log(`🎤 Transcribing audio file (${audioFile?.size || 0} bytes)`);

    try {
      if (!audioFile) {
        throw new HttpException('No audio file provided', HttpStatus.BAD_REQUEST);
      }

      // Create FormData for proxy request
      const formData = new FormData();
      formData.append('audio', audioFile.buffer, {
        filename: audioFile.originalname || 'audio.webm',
        contentType: audioFile.mimetype || 'audio/webm',
      });

      if (body.language) {
        formData.append('language', body.language);
      }

      // Proxy to Admin Backend ASR endpoint
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminBackendUrl}/api/asr/transcribe`,
          formData,
          {
            headers: formData.getHeaders(),
            timeout: 15000, // 15s timeout for ASR
          },
        ),
      );

      this.logger.log(`✅ Transcription successful: "${response.data.text}"`);

      return {
        success: true,
        text: response.data.text,
        language: response.data.language || 'en-US',
        confidence: response.data.confidence || 0.95,
      };
    } catch (error) {
      this.logger.error(`❌ Transcription error: ${error.message}`, error.stack);

      // Return graceful error to frontend
      return {
        success: false,
        error: error.message || 'Transcription failed',
        text: '',
      };
    }
  }

  /**
   * Synthesize text to speech (TTS)
   * 
   * POST /voice/synthesize
   * Body: { text: string, language?: string, voice?: string }
   * Returns: audio/wav file stream
   */
  @Post('synthesize')
  async synthesize(
    @Body() body: { text: string; language?: string; voice?: string },
  ) {
    const { text, language = 'en-US', voice } = body;

    this.logger.log(`🔊 Synthesizing text: "${text.substring(0, 50)}..." (${language})`);

    try {
      if (!text || text.trim().length === 0) {
        throw new HttpException('No text provided', HttpStatus.BAD_REQUEST);
      }

      // Proxy to Admin Backend TTS endpoint
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminBackendUrl}/api/tts/synthesize`,
          { text, language, voice },
          {
            responseType: 'arraybuffer', // Binary audio data
            timeout: 20000, // 20s timeout for TTS
          },
        ),
      );

      this.logger.log(`✅ TTS synthesis successful (${response.data.byteLength} bytes)`);

      return {
        success: true,
        audio: Buffer.from(response.data).toString('base64'),
        contentType: response.headers['content-type'] || 'audio/wav',
      };
    } catch (error) {
      this.logger.error(`❌ TTS synthesis error: ${error.message}`, error.stack);

      return {
        success: false,
        error: error.message || 'TTS synthesis failed',
        audio: null,
      };
    }
  }

  /**
   * Health check for voice services
   * 
   * GET /voice/health
   */
  @Post('health')
  async health() {
    try {
      // Check if admin backend is reachable
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminBackendUrl}/api/health`, { timeout: 5000 }),
      );

      return {
        success: true,
        status: 'healthy',
        adminBackend: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Voice health check failed: ${error.message}`);

      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
