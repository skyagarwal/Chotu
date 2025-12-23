import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VoiceCharactersService } from './voice-characters.service';
import { VoiceCharactersController } from './voice-characters.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, HttpModule],
  providers: [VoiceCharactersService],
  controllers: [VoiceCharactersController],
  exports: [VoiceCharactersService],
})
export class VoiceCharactersModule {}
