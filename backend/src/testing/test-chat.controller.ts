import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ConversationService } from '../conversation/services/conversation.service';
import { SessionService } from '../session/session.service';
import { Platform } from '../common/enums/platform.enum';

@Controller('test-chat')
export class TestChatController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('send')
  @HttpCode(200)
  async send(@Body() body: { recipientId: string; text: string }) {
    const recipientId = String(body?.recipientId || '').trim();
    const text = String(body?.text || '').trim();
    if (!recipientId || !text) return { success: false, error: 'recipientId and text are required' };

    // Add web- prefix for consistency with chat-web.controller.ts
    const webRecipientId = recipientId.startsWith('web-') ? recipientId : `web-${recipientId}`;

    // Normalize to ConversationService input shape (returns void)
    await this.conversationService.processMessage(webRecipientId, { text: { body: text } });
    
    return { 
      success: true, 
      response: 'Message processed successfully',
      timestamp: Date.now()
    };
  }

  @Get('messages/:recipientId')
  async messages(@Param('recipientId') recipientId: string) {
    // Add web- prefix for consistency
    const webRecipientId = recipientId.startsWith('web-') ? recipientId : `web-${recipientId}`;
    const msgs = await this.sessionService.getBotMessages(webRecipientId);
    return { success: true, recipientId: webRecipientId, messages: msgs, count: msgs.length };
  }

  @Post('start/parcel/:recipientId')
  async startParcel(@Param('recipientId') recipientId: string) {
    // Add web- prefix for consistency
    const webRecipientId = recipientId.startsWith('web-') ? recipientId : `web-${recipientId}`;
    // Set session to parcel AI step and default to platform=whatsapp for formatting
    await this.sessionService.setData(webRecipientId, { platform: Platform.WHATSAPP });
    await this.sessionService.setStep(webRecipientId, 'parcel_delivery_ai');
    return { success: true, recipientId: webRecipientId, step: 'parcel_delivery_ai' };
  }
}
