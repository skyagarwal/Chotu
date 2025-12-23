import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ExotelController } from './controllers/exotel.controller';
import { NerveController } from './controllers/nerve.controller';
import { ExotelService } from './services/exotel.service';
import { ExotelConfigService } from './services/exotel-config.service';
import { ExotelSchedulerService } from './services/exotel-scheduler.service';
import { NerveService } from './services/nerve.service';
import { SessionModule } from '../session/session.module';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../database/database.module';
import { AsrModule } from '../asr/asr.module';
import { TtsModule } from '../tts/tts.module';


/**
 * ExotelModule - Exotel Cloud Telephony Integration
 * 
 * Integrates with the Exotel Service running on Mercury (192.168.0.151:3100)
 * and Nerve System for AI Voice Calls (192.168.0.151:7100)
 * 
 * Features:
 * - IVR Call Management
 * - Click-to-Call
 * - Number Masking
 * - Voice Streaming (AgentStream)
 * - Verified Calls (Truecaller)
 * - SMS/WhatsApp Integration
 * - Auto Dialer (PACE)
 * - Call Recording & Transcription
 * - Conversation Quality Analysis (CQA)
 * - Voice Ordering Integration
 * - Scheduled Calls with Retry
 * - DND & Business Hours Management
 * - Configurable Call Templates
 * - AI Voice Calls (Nerve System):
 *   - Vendor Order Confirmation
 *   - Vendor Prep Time Collection
 *   - Rider Assignment Calls
 *   - Rider Pickup Ready Notifications
 * 
 * Architecture:
 * MangwaleAI Backend → Exotel Service (Mercury) → Exotel Cloud API
 * MangwaleAI Backend → Nerve System (Mercury) → Exotel IVR
 * 
 * Configuration:
 * All settings stored in system_settings table, falls back to env vars
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot(),
    SessionModule,
    AgentsModule,
    DatabaseModule,
    AsrModule,
    TtsModule,
    
  ],
  controllers: [ExotelController, NerveController],
  providers: [
    ExotelService,
    ExotelConfigService,
    ExotelSchedulerService,
    NerveService,
  ],
  exports: [
    ExotelService,
    ExotelConfigService,
    ExotelSchedulerService,
    NerveService,
  ],
})
export class ExotelModule {}
