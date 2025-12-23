import { Controller, Post, Body, Get, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { TtsService } from '../services/tts.service';
import { SynthesizeSpeechDto } from '../dto/synthesize-speech.dto';
import { SynthesisResultDto } from '../dto/synthesis-result.dto';

@Controller('tts')
export class TtsController {
  private readonly logger = new Logger(TtsController.name);

  constructor(private readonly ttsService: TtsService) {}

  @Post('synthesize')
  async synthesize(
    @Body() dto: SynthesizeSpeechDto,
  ): Promise<SynthesisResultDto> {
    this.logger.log(`TTS synthesis request: "${dto.text}" (${dto.language}, ${dto.voice})`);
    return this.ttsService.synthesize(dto);
  }

  @Post('synthesize/stream')
  async synthesizeStream(
    @Body() dto: SynthesizeSpeechDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`TTS stream request: "${dto.text}"`);

    const result = await this.ttsService.synthesize(dto);

    res.setHeader('Content-Type', `audio/${result.format}`);
    res.setHeader('Content-Disposition', `attachment; filename="speech.${result.format}"`);

    if (result.audioData) {
      res.send(result.audioData);
    } else {
      res.status(404).json({ error: 'Audio data not available' });
    }
  }

  @Get('voices')
  async getVoices(): Promise<{ voices: any[] }> {
    const voices = await this.ttsService.getAvailableVoices();
    return { voices };
  }

  @Get('health')
  async health(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
}
