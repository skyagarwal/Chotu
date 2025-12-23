import { Module } from '@nestjs/common';
import { SessionModule } from '../session/session.module';
// import { WhatsAppProvider } from './providers/whatsapp.provider'; // Disabled - configure API keys to enable
import { RCSProvider } from './providers/rcs.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { MessagingService } from './services/messaging.service';

@Module({
  imports: [SessionModule],
  providers: [
    // WhatsAppProvider, // Disabled - configure API keys to enable
    RCSProvider,
    TelegramProvider,
    MessagingService,
  ],
  exports: [MessagingService],
})
export class MessagingModule {}

