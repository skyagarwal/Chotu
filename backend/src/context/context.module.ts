/**
 * User Context Module
 * 
 * Provides comprehensive user context for Chotu:
 * - Weather/Climate awareness
 * - Date/Time/Festival context
 * - User preferences and favorites
 * - City knowledge and local slang
 * - Contextual suggestions
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { UserContextService } from './services/user-context.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
  ],
  providers: [
    UserContextService,
  ],
  exports: [
    UserContextService,
  ],
})
export class ContextModule {}
