import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { SentryService } from './sentry.service';
import { StructuredLoggerService } from './structured-logger.service';
import { MonitoringController } from './monitoring.controller';

@Global() // Make services available globally
@Module({
  imports: [ConfigModule],
  controllers: [MonitoringController],
  providers: [PerformanceMonitoringService, SentryService, StructuredLoggerService],
  exports: [PerformanceMonitoringService, SentryService, StructuredLoggerService],
})
export class MonitoringModule {}
