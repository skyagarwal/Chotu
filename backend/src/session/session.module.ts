import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionIdentifierService } from './session-identifier.service';

/**
 * SessionModule - Shared Session Management
 * 
 * Provides session/state management for conversations across all channels.
 * Uses Redis for distributed session storage.
 * 
 * Services:
 * - SessionService: Core session CRUD operations
 * - SessionIdentifierService: Resolves phone numbers from session IDs
 */
@Module({
  providers: [SessionService, SessionIdentifierService],
  exports: [SessionService, SessionIdentifierService],
})
export class SessionModule {}
