import { Module, forwardRef } from '@nestjs/common';
import { AuthTriggerService } from './auth-trigger.service';
import { CentralizedAuthService } from './centralized-auth.service';
import { AuthController } from './auth.controller';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { DatabaseModule } from '../database/database.module';
import { UserProfileEnrichmentService } from '../personalization/user-profile-enrichment.service';

@Module({
  imports: [
    PhpIntegrationModule,
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthTriggerService, 
    CentralizedAuthService,
    UserProfileEnrichmentService, // Direct provider, not via module to avoid circular deps
  ],
  exports: [AuthTriggerService, CentralizedAuthService],
})
export class AuthModule {}
