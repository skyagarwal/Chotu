import { Module } from '@nestjs/common';
import { AuthTriggerService } from './auth-trigger.service';
import { CentralizedAuthService } from './centralized-auth.service';
import { AuthController } from './auth.controller';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';

@Module({
  imports: [PhpIntegrationModule],
  controllers: [AuthController],
  providers: [AuthTriggerService, CentralizedAuthService],
  exports: [AuthTriggerService, CentralizedAuthService],
})
export class AuthModule {}
