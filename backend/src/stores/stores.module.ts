import { Module } from '@nestjs/common';
import { StoreScheduleService } from './services/store-schedule.service';

/**
 * Stores Module
 * 
 * Manages store-related functionality including schedules,
 * opening hours, and store status
 */
@Module({
  imports: [
    // MySQL connection for store data (configured in app.module.ts)
  ],
  providers: [StoreScheduleService],
  exports: [StoreScheduleService],
})
export class StoresModule {}
