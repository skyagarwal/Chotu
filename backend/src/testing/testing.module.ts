import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { SessionModule } from '../session/session.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AgentsModule } from '../agents/agents.module';
import { TestChatController } from './test-chat.controller';
import { ChatModule } from '../chat/chat.module'; // Import ChatModule instead of ChatGateway directly

@Module({
  imports: [
    ConversationModule, 
    SessionModule, 
    MessagingModule, 
    AgentsModule,
    ChatModule, // Import the module, not the gateway provider directly
  ],
  controllers: [TestChatController],
  // REMOVED: ChatGateway from providers - was causing duplicate instance!
  // ChatGateway is already provided by ChatModule
  providers: [],
})
export class TestingModule {}
