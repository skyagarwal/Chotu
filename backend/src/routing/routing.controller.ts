import { Controller, Get, Query, Param } from '@nestjs/common';
import { StoreScheduleService } from '../stores/services/store-schedule.service';

@Controller('routing')
export class RoutingController {
  constructor(
    private readonly storeScheduleService: StoreScheduleService,
  ) {}

  @Get('test/store-schedule/:storeId')
  async testStoreSchedule(@Param('storeId') storeId: string) {
    const storeIdNum = parseInt(storeId, 10);
    
    // Get store schedule
    const schedule = await this.storeScheduleService.getStoreSchedule(storeIdNum);
    
    if (!schedule) {
      return {
        storeId: storeIdNum,
        error: 'No schedule found for this store',
      };
    }
    
    // Check if store is open
    const status = await this.storeScheduleService.isStoreOpen(storeIdNum);
    
    return {
      storeId: storeIdNum,
      schedule: {
        day: schedule.day,
        opening_time: schedule.opening_time,
        closing_time: schedule.closing_time,
      },
      status: {
        is_open: status.is_open,
        message: status.message,
        opens_at: status.opens_at,
        closes_at: status.closes_at,
      },
      currentTime: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' }),
    };
  }
}
