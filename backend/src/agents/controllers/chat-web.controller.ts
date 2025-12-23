import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { ConversationService } from '../../conversation/services/conversation.service';
import { SessionService } from '../../session/session.service';

/**
 * Web Chat Controller
 * 
 * REST API for web-based chat interface
 * NOW INTEGRATED WITH FULL ARCHITECTURE:
 * - ConversationService (flows + agents + orchestrator)
 * - Conversation logging for training data
 * - Session management with user context
 */
@Controller('chat')
export class ChatWebController {
  private readonly logger = new Logger(ChatWebController.name);

  // Store recent messages temporarily (in production, use Redis)
  private messageStore = new Map<string, Array<{ message: string; timestamp: number; from: 'bot' | 'user' }>>();

  constructor(
    private readonly conversationService: ConversationService,
    private readonly sessionService: SessionService,
  ) {
    this.logger.log('✅ Web Chat Controller initialized with ConversationService');
  }

  /**
   * Send a message from web chat
   * 
   * POST /chat/send
   * Body: { recipientId: string, text?: string, location?: { lat: number; lng: number }, type?: 'text' | 'location' }
   */
  @Post('send')
  async sendMessage(@Body() body: { recipientId?: string; sessionId?: string; message?: string; text?: string; location?: { lat: number; lng: number }; type?: 'text' | 'location' }) {
    // Support both recipientId and sessionId for backwards compatibility
    const recipientId = body.recipientId || body.sessionId;
    // Support both text and message fields
    const text = body.text || body.message;
    const { location, type = 'text' } = body;
    
    // Validate required field
    if (!recipientId) {
      return {
        success: false,
        error: 'recipientId or sessionId is required',
        response: 'Please provide a recipientId or sessionId',
      };
    }
    
    this.logger.log(`💬 Web chat message from ${recipientId}: "${type === 'location' ? 'Location Shared' : text}"`);
    
    try {
      // Ensure recipientId has 'web-' prefix for proper routing
      const webRecipientId = recipientId.startsWith('web-') ? recipientId : `web-${recipientId}`;
      
      // Set platform in session before processing
      const session = await this.sessionService.getSession(webRecipientId);
      if (!session || !session.data.platform) {
        await this.sessionService.setData(webRecipientId, { 
          platform: 'web',
          channel: 'web_chat'
        });
        this.logger.log(`✅ Set platform=web for session ${webRecipientId}`);
      }
      
      // 📍 SAVE GPS LOCATION TO SESSION IF PROVIDED
      // This ensures flow-engine can access location data from session
      if (location?.lat && location?.lng) {
        await this.sessionService.setData(webRecipientId, {
          location: { lat: location.lat, lng: location.lng },
          lastLocationUpdate: Date.now(),
        });
        this.logger.log(`📍 Saved GPS location to session: (${location.lat}, ${location.lng})`);
      }
      
      // Store user message
      this.addMessage(webRecipientId, type === 'location' ? `Location: ${location?.lat}, ${location?.lng}` : (text || ''), 'user');

      // Clear previous bot messages to get only new ones
      await this.sessionService.clearBotMessages(webRecipientId);

      // Use ConversationService - goes through full architecture:
      // ConversationService → AgentOrchestrator → FlowEngine/Agents → Response
      // This ensures: flows work, logging happens, session managed correctly
      await this.conversationService.processMessage(webRecipientId, {
        text: { body: text || '' },
        location: location,
        from: webRecipientId,
        type: type,
      });

      // Retrieve bot response stored by MessagingService in Redis
      const botMessages = await this.sessionService.getBotMessages(webRecipientId);
      
      let responseText = 'Message received. Processing...';
      
      if (botMessages && botMessages.length > 0) {
        const latestMessage = botMessages[botMessages.length - 1];
        
        // Extract message from wrapper object
        if (typeof latestMessage === 'object' && latestMessage.message) {
          responseText = latestMessage.message;
        } else if (typeof latestMessage === 'string') {
          responseText = latestMessage;
        } else {
          responseText = JSON.stringify(latestMessage);
        }
      }
      
      // Store bot response in local message store for polling
      this.addMessage(webRecipientId, responseText, 'bot');

      // Safe logging - responseText might be object or string
      const logText = typeof responseText === 'string' 
        ? responseText.substring(0, 80) 
        : JSON.stringify(responseText).substring(0, 80);
      this.logger.log(`✅ Response retrieved: "${logText}..."`);

      return {
        success: true,
        response: responseText,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Error processing web chat message: ${error.message}`, error.stack);
      
      const errorMsg = 'Sorry, I encountered an error. Please try again.';
      this.addMessage(recipientId, errorMsg, 'bot');
      
      return {
        success: false,
        error: error.message,
        response: errorMsg,
      };
    }
  }

  /**
   * Get messages for a recipient (polling endpoint)
   * 
   * GET /chat/messages/:recipientId
   */
  @Get('messages/:recipientId')
  async getMessages(@Param('recipientId') recipientId: string) {
    this.logger.debug(`📨 Fetching messages for ${recipientId}`);
    
    try {
      // Get stored messages
      const messages = this.messageStore.get(recipientId) || [];
      
      // Clear messages after reading (or keep last N messages)
      const unreadMessages = messages.filter(m => m.from === 'bot');
      
      // Clear bot messages that were sent (keep user messages for context)
      this.messageStore.set(
        recipientId,
        messages.filter(m => m.from === 'user')
      );

      return {
        success: true,
        recipientId,
        messages: unreadMessages.map(m => ({
          message: m.message,
          text: m.message,
          timestamp: m.timestamp,
          from: m.from,
        })),
        count: unreadMessages.length,
      };
    } catch (error) {
      this.logger.error(`Error fetching messages: ${error.message}`);
      return {
        success: false,
        error: error.message,
        messages: [],
      };
    }
  }

  /**
   * Get session information for a recipient
   * 
   * GET /chat/session/:recipientId
   */
  @Get('session/:recipientId')
  async getSession(@Param('recipientId') recipientId: string) {
    try {
      const session = await this.sessionService.getSession(recipientId);
      
      return {
        success: true,
        recipientId,
        session: session || null,
        hasActiveSession: !!session,
      };
    } catch (error) {
      this.logger.error(`Error fetching session: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear session for a recipient
   * 
   * POST /chat/session/:recipientId/clear
   */
  @Post('session/:recipientId/clear')
  async clearSession(@Param('recipientId') recipientId: string) {
    try {
      // Ensure recipientId has 'web-' prefix for proper routing
      const webRecipientId = recipientId.startsWith('web-') ? recipientId : `web-${recipientId}`;

      // Clear session - Create fresh session with 'welcome' step
      await this.sessionService.createSession(webRecipientId);
      
      // Clear message store
      this.messageStore.delete(recipientId);
      this.messageStore.delete(webRecipientId);
      
      this.logger.log(`✅ Session cleared and reset to 'welcome' for ${webRecipientId}`);
      
      return {
        success: true,
        message: 'Session cleared successfully',
        recipientId: webRecipientId,
      };
    } catch (error) {
      this.logger.error(`Error clearing session: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Health check endpoint
   * 
   * GET /chat/health
   */
  @Get('health')
  async health() {
    return {
      success: true,
      status: 'ok',
      service: 'Web Chat',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper: Add message to store
   */
  private addMessage(recipientId: string, message: string, from: 'bot' | 'user') {
    if (!this.messageStore.has(recipientId)) {
      this.messageStore.set(recipientId, []);
    }
    
    const messages = this.messageStore.get(recipientId);
    messages.push({
      message,
      timestamp: Date.now(),
      from,
    });

    // Keep only last 50 messages per recipient
    if (messages.length > 50) {
      messages.splice(0, messages.length - 50);
    }
  }
}
