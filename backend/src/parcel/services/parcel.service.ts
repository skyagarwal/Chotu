import { Injectable, Logger } from '@nestjs/common';
import { ParcelAgentService } from './parcel-agent.service';
import { ParcelFallbackService } from './parcel-fallback.service';
import { ParcelDeliveryData, ConversationMode } from '../types/parcel.types';
import { MessagingService } from '../../messaging/services/messaging.service';
import { Platform } from '../../common/enums/platform.enum';

/**
 * Parcel Service - Main Coordinator
 * 
 * Implements the AI + Guidelines architecture:
 * 1. Try AI first (natural conversation)
 * 2. Monitor confidence
 * 3. Fall back to structured flow if needed
 * 4. Can switch back to AI when confidence recovers
 */
@Injectable()
export class ParcelService {
  private readonly logger = new Logger(ParcelService.name);
  
  // Confidence threshold for fallback
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  
  // Consecutive low confidence before fallback
  private readonly LOW_CONFIDENCE_LIMIT = 2;

  constructor(
    private agentService: ParcelAgentService,
    private fallbackService: ParcelFallbackService,
    private messagingService: MessagingService
  ) {}

  /**
   * Handle parcel delivery conversation
   * 
   * @param phoneNumber - User's phone number
   * @param message - User's message
   * @param session - Current session data
   * @returns Updated session
   */
  async handleParcelDelivery(
    phoneNumber: string,
    message: string,
    session: any
  ): Promise<any> {
    // Initialize parcel data if not exists
    if (!session.parcelData) {
      session.parcelData = {} as ParcelDeliveryData;
    }

    // Initialize conversation mode if not exists
    if (!session.conversationMode) {
      session.conversationMode = {
        mode: 'ai', // Start with AI
        confidence_history: []
      } as ConversationMode;
    }

    const mode = session.conversationMode.mode;

    this.logger.log(`[Parcel] Mode: ${mode}, Message: "${message}"`);

    // Route to AI or Fallback
    if (mode === 'ai') {
      return await this.handleWithAI(phoneNumber, message, session);
    } else {
      return await this.handleWithFallback(phoneNumber, message, session);
    }
  }

  /**
   * Handle conversation with AI
   * 
   * @param phoneNumber - User's phone number
   * @param message - User's message
   * @param session - Current session
   * @returns Updated session
   */
  private async handleWithAI(
    phoneNumber: string,
    message: string,
    session: any
  ): Promise<any> {
    try {
      // Build conversation history
      const conversationHistory = session.conversationHistory || [];

      // Execute agent
      const agentResponse = await this.agentService.executeAgent(
        message,
        session.id,
        {
          collected: session.parcelData,
          missing: this.fallbackService.getMissingFields(session.parcelData),
          platform: Platform.WHATSAPP
        },
        conversationHistory
      );

      const confidence = agentResponse.confidence || 1.0;

      // Track confidence
      session.conversationMode.confidence_history.push(confidence);
      
      // Keep only last 5 confidence scores
      if (session.conversationMode.confidence_history.length > 5) {
        session.conversationMode.confidence_history.shift();
      }

      // Check if we should fall back
      const recentLowConfidence = session.conversationMode.confidence_history
        .slice(-this.LOW_CONFIDENCE_LIMIT)
        .filter(c => c < this.CONFIDENCE_THRESHOLD).length;

      if (recentLowConfidence >= this.LOW_CONFIDENCE_LIMIT) {
        this.logger.warn(`[Parcel AI] Low confidence detected, falling back to structured flow`);
        
        // Switch to fallback mode
        session.conversationMode.mode = 'fallback';
        session.conversationMode.fallback_step = 1;
        session.conversationMode.fallback_reason = 'low_confidence';

        // Get first fallback step
        const firstStep = this.fallbackService.getCurrentStep(1);
        
        await this.messagingService.sendTextMessage(
          Platform.WHATSAPP,
          phoneNumber,
          `I want to make sure I get this right. Let me guide you step by step.\n\n${firstStep?.message || ''}`
        );

        return session;
      }

      // Handle tool calls
      if (agentResponse.type === 'tool_call') {
        await this.handleToolCall(agentResponse, session);
      }

      // Update conversation history
      conversationHistory.push({
        role: 'user',
        content: message
      });
      conversationHistory.push({
        role: 'assistant',
        content: agentResponse.content || ''
      });

      // Keep last 10 messages
      if (conversationHistory.length > 10) {
        conversationHistory.splice(0, conversationHistory.length - 10);
      }

      session.conversationHistory = conversationHistory;

      // Send AI response
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP,
        phoneNumber,
        agentResponse.content || 'How can I help?'
      );

      // Check if data is complete (natural completion)
      if (this.fallbackService.isDataComplete(session.parcelData)) {
        this.logger.log(`[Parcel AI] All required data collected naturally!`);
        // Could proceed to booking confirmation here
      }

      return session;

    } catch (error) {
      this.logger.error(`[Parcel AI] Error: ${error.message}`);
      
      // Fall back on error
      session.conversationMode.mode = 'fallback';
      session.conversationMode.fallback_step = 1;
      session.conversationMode.fallback_reason = 'error';

      const firstStep = this.fallbackService.getCurrentStep(1);
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP,
        phoneNumber,
        `I'm having trouble processing that. Let me help you step by step.\n\n${firstStep?.message || ''}`
      );

      return session;
    }
  }

  /**
   * Handle conversation with structured fallback
   * 
   * @param phoneNumber - User's phone number
   * @param message - User's message
   * @param session - Current session
   * @returns Updated session
   */
  private async handleWithFallback(
    phoneNumber: string,
    message: string,
    session: any
  ): Promise<any> {
    try {
      const currentStep = session.conversationMode.fallback_step || 1;

      // Process input in fallback mode
      const result = await this.fallbackService.processInput(
        message,
        currentStep,
        session.parcelData
      );

      // Update session
      session.parcelData = result.updatedData;
      session.conversationMode.fallback_step = result.nextStep;

      // Send response
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP,
        phoneNumber,
        result.message
      );

      // Check if complete
      if (result.complete) {
        this.logger.log(`[Parcel Fallback] Flow complete!`);
        session.currentStep = 'main_menu';
        session.conversationMode = null;
        session.parcelData = {};
      }

      // Check if we can switch back to AI
      // (User is engaging well, providing good responses)
      if (this.shouldSwitchBackToAI(message, session)) {
        this.logger.log(`[Parcel Fallback] User engaging well, switching back to AI`);
        session.conversationMode.mode = 'ai';
        session.conversationMode.confidence_history = [0.8]; // Reset with decent confidence
      }

      return session;

    } catch (error) {
      this.logger.error(`[Parcel Fallback] Error: ${error.message}`);
      
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP,
        phoneNumber,
        'Something went wrong. Type "start" to begin again.'
      );

      return session;
    }
  }

  /**
   * Handle tool calls from AI agent
   * 
   * @param agentResponse - Agent response with tool call
   * @param session - Current session
   */
  private async handleToolCall(agentResponse: any, session: any): Promise<void> {
    const tool = agentResponse.tool;
    const args = agentResponse.arguments || {};

    this.logger.log(`[Tool Call] ${tool}(${JSON.stringify(args)})`);

    switch (tool) {
      case 'get_pricing':
      case 'calculate_pricing':
        // Calculate pricing based on route and weight
        const price = this.calculatePricing(
          session.parcelData.weight || 0,
          session.parcelData.delivery_speed || 'standard'
        );
        session.parcelData.estimated_price = price.amount;
        session.parcelData.estimated_delivery_days = price.days;
        break;

      case 'check_serviceability':
        // Check if delivery available
        // For now, assume yes
        break;

      case 'create_booking':
        // Create booking
        const trackingId = this.generateTrackingId();
        session.parcelData.tracking_id = trackingId;
        session.parcelData.status = 'confirmed';
        break;

      case 'get_saved_addresses':
        // Retrieve saved addresses
        // Would query database here
        break;

      default:
        this.logger.warn(`[Tool Call] Unknown tool: ${tool}`);
    }
  }

  /**
   * Calculate pricing (placeholder)
   * 
   * @param weight - Parcel weight in kg
   * @param speed - Delivery speed
   * @returns Price and delivery time
   */
  private calculatePricing(weight: number, speed: string): { amount: number; days: number } {
    // Simple placeholder pricing
    let basePrice = 50;
    
    // Weight-based pricing
    if (weight <= 1) {
      basePrice = 80;
    } else if (weight <= 5) {
      basePrice = 120;
    } else if (weight <= 10) {
      basePrice = 200;
    } else {
      basePrice = 300 + (weight - 10) * 20;
    }

    // Speed multiplier
    if (speed === 'express') {
      basePrice *= 1.6;
    }

    const days = speed === 'express' ? 2 : 4;

    return {
      amount: Math.round(basePrice),
      days
    };
  }

  /**
   * Generate tracking ID
   * 
   * @returns Tracking ID
   */
  private generateTrackingId(): string {
    const prefix = 'MGW';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Determine if we should switch back to AI mode
   * 
   * @param message - User's message
   * @param session - Current session
   * @returns True if should switch back
   */
  private shouldSwitchBackToAI(message: string, session: any): boolean {
    // Don't switch if in critical steps (confirmation, payment)
    const step = session.conversationMode.fallback_step || 0;
    if (step >= 5) return false;

    // Switch if user provides detailed, conversational responses
    if (message.length > 30 && message.includes(' ')) {
      return true;
    }

    return false;
  }
}

