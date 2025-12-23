import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MonitoringController],
  providers: [PerformanceMonitoringService],
  exports: [PerformanceMonitoringService],
})
export class MonitoringModule {}
