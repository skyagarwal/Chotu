import { Module } from '@nestjs/common';
import { UserSyncService } from './services/user-sync.service';
import { PhpIntegrationModule } from '../php-integration/php-integration.module';
import { SessionModule } from '../session/session.module';

/**
 * User Module - Manages AI user persistence and synchronization
 * 
 * Purpose:
 * - Syncs PHP authenticated users to AI database
 * - Maintains persistent user records for long-term tracking
 * - Manages user preferences and profile data
 * - Links game rewards and conversation history to users
 * 
 * Exports:
 * - UserSyncService - Used by ConversationService after login
 */
@Module({
  imports: [PhpIntegrationModule, SessionModule],
  providers: [UserSyncService],
  exports: [UserSyncService],
})
export class UserModule {}
