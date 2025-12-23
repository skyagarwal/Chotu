import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { NluService } from '../services/nlu.service';
import { ClassifyTextDto } from '../dto/classify-text.dto';
import { ClassificationResultDto } from '../dto/classification-result.dto';

@Controller('nlu')
export class NluController {
  private readonly logger = new Logger(NluController.name);

  constructor(private readonly nluService: NluService) {}

  @Post('classify')
  async classify(
    @Body() dto: ClassifyTextDto,
  ): Promise<ClassificationResultDto> {
    this.logger.log(`NLU classification request: "${dto.text}"`);
    return this.nluService.classify(dto);
  }

  @Get('intents')
  async getAvailableIntents(): Promise<{ intents: string[] }> {
    return {
      intents: [
        'greeting',
        'track_order',
        'parcel_booking',
        'search_product',
        'cancel_order',
        'help',
        'complaint',
        'unknown',
      ],
    };
  }

  @Get('health')
  async health(): Promise<{ status: string; nluEnabled: boolean }> {
    return {
      status: 'ok',
      nluEnabled: process.env.NLU_AI_ENABLED === 'true',
    };
  }
}
