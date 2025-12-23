import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentResponse } from '../types/parcel.types';

/**
 * Parcel Agent Service
 * 
 * Communicates with Admin Backend's Agent system
 * Handles AI-powered conversation for parcel delivery
 */
@Injectable()
export class ParcelAgentService {
  private readonly logger = new Logger(ParcelAgentService.name);
  private readonly adminBackendUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    // Prefer centralized config
    this.adminBackendUrl = this.configService.get<string>('adminBackend.url') || this.configService.get<string>('ADMIN_BACKEND_URL') || 'http://localhost:3002';
    this.apiKey = this.configService.get<string>('adminBackend.apiKey') || this.configService.get<string>('ADMIN_BACKEND_API_KEY') || '';
  }

  /**
   * Execute the Parcel Delivery Agent
   * 
   * @param input - User's message
   * @param sessionId - Unique session ID
   * @param context - Current conversation context
   * @param conversationHistory - Previous messages
   * @returns Agent's response
   */
  async executeAgent(
    input: string,
    sessionId: string,
    context: any = {},
    conversationHistory: any[] = []
  ): Promise<AgentResponse> {
    try {
      this.logger.log(`[Agent Execute] Input: "${input}"`);

      const response = await fetch(
        `${this.adminBackendUrl}/agents/agent.parcel_delivery/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'x-api-key': this.apiKey })
          },
          body: JSON.stringify({
            input,
            session_id: sessionId,
            context,
            conversation_history: conversationHistory
          }),
          signal: AbortSignal.timeout(15000) // 15 second timeout
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`[Agent Execute] HTTP ${response.status}: ${errorText}`);
        
        // Return fallback response
        return {
          type: 'text',
          content: 'I\'m having trouble processing that. Let me help you step by step.',
          agent_id: 'agent.parcel_delivery',
          model_used: 'fallback',
          confidence: 0.0
        };
      }

      const data = await response.json();
      
      this.logger.log(`[Agent Execute] Response type: ${data.type}, confidence: ${data.confidence || 'N/A'}`);
      
      return data as AgentResponse;

    } catch (error) {
      this.logger.error(`[Agent Execute] Error: ${error.message}`);
      
      // Return fallback response on error
      return {
        type: 'text',
        content: 'I\'m having trouble right now. Let me guide you through the booking step by step.',
        agent_id: 'agent.parcel_delivery',
        model_used: 'fallback',
        confidence: 0.0
      };
    }
  }

  /**
   * Select appropriate agent for an intent
   * 
   * @param intent - Detected intent
   * @param channel - Communication channel
   * @param context - Additional context
   * @returns Selected agent information
   */
  async selectAgent(intent: string, channel: string = 'whatsapp', context: any = {}): Promise<any> {
    try {
      const response = await fetch(
        `${this.adminBackendUrl}/agents/select`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'x-api-key': this.apiKey })
          },
          body: JSON.stringify({ intent, channel, context }),
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`[Agent Select] Error: ${error.message}`);
      
      // Return default parcel agent
      return {
        agent_id: 'agent.parcel_delivery',
        agent_name: 'Parcel Delivery Agent'
      };
    }
  }

  /**
   * Get guidelines for the parcel agent
   * 
   * @returns Agent guidelines
   */
  async getGuidelines(): Promise<any> {
    try {
      const response = await fetch(
        `${this.adminBackendUrl}/agents/agent.parcel_delivery/guidelines`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'x-api-key': this.apiKey })
          },
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.warn(`[Get Guidelines] Using local guidelines (Admin Backend unavailable)`);
      return null; // Will use local guidelines
    }
  }
}

