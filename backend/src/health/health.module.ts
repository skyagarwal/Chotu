import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { DatabaseModule } from '../database/database.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [PhpIntegrationModule, DatabaseModule, SessionModule],
  controllers: [HealthController],
})
export class HealthModule {}
