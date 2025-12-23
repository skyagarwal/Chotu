import {
  Controller,
  Post,
  Body,
  Get,
  Logger,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AsrService } from '../services/asr.service';
import { TranscribeAudioDto } from '../dto/transcribe-audio.dto';
import { TranscriptionResultDto } from '../dto/transcription-result.dto';

@Controller('asr')
export class AsrController {
  private readonly logger = new Logger(AsrController.name);

  constructor(private readonly asrService: AsrService) {}

  @Post('transcribe')
  async transcribe(
    @Body() dto: TranscribeAudioDto,
  ): Promise<TranscriptionResultDto> {
    this.logger.log(`ASR transcription request (provider: ${dto.provider})`);
    return this.asrService.transcribe(dto);
  }

  @Post('transcribe/upload')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribeUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: Partial<TranscribeAudioDto>,
  ): Promise<TranscriptionResultDto> {
    this.logger.log(`ASR file upload: ${file.originalname} (${file.size} bytes)`);

    return this.asrService.transcribe({
      ...dto,
      audioData: file.buffer,
    } as TranscribeAudioDto);
  }

  @Get('providers')
  async getProviders(): Promise<{ providers: string[] }> {
    const providers = await this.asrService.getAvailableProviders();
    return { providers };
  }

  @Get('health')
  async health(): Promise<{ status: string; providers: string[] }> {
    const providers = await this.asrService.getAvailableProviders();
    return {
      status: providers.length > 0 ? 'ok' : 'degraded',
      providers,
    };
  }
}
