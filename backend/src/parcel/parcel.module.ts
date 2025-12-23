import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParcelService } from './services/parcel.service';
import { ParcelAgentService } from './services/parcel-agent.service';
import { ParcelFallbackService } from './services/parcel-fallback.service';
import { MessagingModule } from '../messaging/messaging.module';

/**
 * Parcel Module
 * 
 * Handles parcel delivery booking using AI + Guidelines architecture:
 * - AI-first natural conversation
 * - Structured fallback when needed
 * - Seamless switching between modes
 */
@Module({
  imports: [
    ConfigModule,
    MessagingModule
  ],
  providers: [
    ParcelService,
    ParcelAgentService,
    ParcelFallbackService
  ],
  exports: [
    ParcelService
  ]
})
export class ParcelModule {}

