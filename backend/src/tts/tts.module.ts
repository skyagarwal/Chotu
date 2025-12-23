import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TtsController } from './controllers/tts.controller';
import { TtsService } from './services/tts.service';
import { XttsService } from './services/xtts.service';
import { CloudTtsService } from './services/cloud-tts.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30s for audio generation
      maxRedirects: 3,
    }),
  ],
  controllers: [TtsController],
  providers: [TtsService, XttsService, CloudTtsService],
  exports: [TtsService],
})
export class TtsModule {}
