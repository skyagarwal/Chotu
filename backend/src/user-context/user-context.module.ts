import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserContextService } from './user-context.service';
import { UserContextController } from './user-context.controller';

/**
 * User Context Module
 * 
 * Provides comprehensive user context for personalized AI interactions.
 * Combines MySQL (PHP backend) and PostgreSQL (NestJS) data sources.
 */
@Module({
  imports: [ConfigModule],
  controllers: [UserContextController],
  providers: [UserContextService],
  exports: [UserContextService],
})
export class UserContextModule {}
