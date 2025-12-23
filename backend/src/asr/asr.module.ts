import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AsrController } from './controllers/asr.controller';
import { AsrService } from './services/asr.service';
import { WhisperAsrService } from './services/whisper-asr.service';
import { CloudAsrService } from './services/cloud-asr.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30s for audio processing
      maxRedirects: 3,
      maxBodyLength: 50 * 1024 * 1024, // 50MB for audio files
    }),
  ],
  controllers: [AsrController],
  providers: [AsrService, WhisperAsrService, CloudAsrService],
  exports: [AsrService],
})
export class AsrModule {}
