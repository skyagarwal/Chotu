import { Controller, Post, Body, Get, Param, Logger } from '@nestjs/common';
import { ConversationService } from '../services/conversation.service';
import { Platform } from '../../common/enums/platform.enum';

@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(private conversationService: ConversationService) {}

  @Post('message')
  async sendTestMessage(
    @Body() body: { phoneNumber: string; message: string; senderName?: string },
  ): Promise<any> {
    this.logger.log(`📨 Test message from ${body.phoneNumber}: "${body.message}"`);

    try {
      // Mock WhatsApp message structure
      const messageObject = {
        text: {
          body: body.message
        }
      };

      await this.conversationService.processMessage(
        body.phoneNumber,
        messageObject,
      );

      this.logger.log(`✅ Message processed successfully`);
      return {
        status: 'success',
        phoneNumber: body.phoneNumber,
        message: body.message,
      };
    } catch (error) {
      this.logger.error(`❌ Error processing test message: ${error.message}`);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  @Get('session/:phoneNumber')
  async getTestSession(@Param('phoneNumber') phoneNumber: string): Promise<any> {
    const session = await this.conversationService['sessionService'].getSession(phoneNumber);
    return session || { message: 'No session found' };
  }
}
