import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { FunctionDefinition, LLMMessage, FunctionCall } from '../types/agent.types';

/**
 * LLM Response from Qwen/GPT
 */
export interface LLMResponse {
  content: string | null;
  function_call?: FunctionCall;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * LLM Service
 * 
 * Handles communication with LLM (Qwen 8B or GPT-4)
 * Supports function calling for agent system
 */
@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly adminBackendUrl: string;
  private readonly testMode: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.adminBackendUrl =
      this.configService.get<string>('ADMIN_BACKEND_URL') ||
      'http://localhost:8080';
    this.testMode = this.configService.get<boolean>('app.testMode') || false;
    
    if (this.testMode) {
      this.logger.warn('⚠️  LLM Service running in TEST MODE - Using mock responses');
    }
  }

  /**
   * Chat completion with function calling support
   */
  async chat(request: {
    model: string;
    messages: LLMMessage[];
    functions?: FunctionDefinition[];
    function_call?: 'auto' | 'none' | { name: string };
    temperature?: number;
    max_tokens?: number;
  }): Promise<LLMResponse> {
    // TEST MODE: Return mock responses
    if (this.testMode) {
      return this.getMockResponse(request);
    }

    try {
      // Call Admin Backend LLM endpoint
      const response = await firstValueFrom(
        this.httpService.post(`${this.adminBackendUrl}/ai/chat`, {
          model: request.model,
          messages: request.messages,
          functions: request.functions,
          function_call: request.function_call || 'auto',
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 2000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('LLM chat error:', error);
      
      // Fallback to simple response
      return {
        content: 'I apologize, but I am experiencing technical difficulties. Please try again.',
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    }
  }

  /**
   * Mock LLM response for testing
   */
  private getMockResponse(request: {
    messages: LLMMessage[];
    functions?: FunctionDefinition[];
  }): LLMResponse {
    const lastMessage = request.messages[request.messages.length - 1];
    const userMessage = lastMessage.content?.toLowerCase() || '';

    this.logger.log(`🧪 Mock LLM processing: "${userMessage}"`);

    // Greeting responses
    if (userMessage.match(/^(hi|hello|hey|greetings)/)) {
      return {
        content: "Hello! 👋 Welcome to Mangwale! We offer 8 amazing services:\n\n🍔 Food Delivery - Order from 1000+ restaurants\n🛒 E-Commerce - 10,000+ products available\n📦 Parcel Delivery - Send packages anywhere\n🚗 Ride Booking - Cabs and bikes\n⚕️ Healthcare - Doctor appointments & medicines\n🏨 Room Booking - Hotels, PGs, hostels\n🎬 Movie Tickets - Book cinema seats\n🔧 Local Services - Plumbing, cleaning, repairs\n\nHow can I help you today?",
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
      };
    }

    // Order tracking
    if (userMessage.match(/order|track|where is my/)) {
      // Check if we should call a function
      if (request.functions?.some(f => f.name === 'check_order_status')) {
        return {
          content: null,
          function_call: {
            name: 'check_order_status',
            arguments: JSON.stringify({
              order_id: '12345',
              module: 'food',
            }),
          },
          usage: { prompt_tokens: 60, completion_tokens: 30, total_tokens: 90 },
        };
      }
      return {
        content: "I can help you track your order! Could you please provide your order ID?",
        usage: { prompt_tokens: 55, completion_tokens: 20, total_tokens: 75 },
      };
    }

    // Search queries
    if (userMessage.match(/find|search|looking for|show me|pizza|food|restaurant/)) {
      if (request.functions?.some(f => f.name === 'search_products')) {
        return {
          content: null,
          function_call: {
            name: 'search_products',
            arguments: JSON.stringify({
              query: userMessage.replace(/find|search|looking for|show me/gi, '').trim(),
              limit: 10,
            }),
          },
          usage: { prompt_tokens: 65, completion_tokens: 35, total_tokens: 100 },
        };
      }
    }

    // Help/FAQ
    if (userMessage.match(/help|how|what|support/)) {
      return {
        content: "I'm here to help! I can assist you with:\n\n✅ Finding restaurants and products\n✅ Tracking your orders\n✅ Booking rides and services\n✅ Resolving complaints\n✅ General questions about our platform\n\nWhat would you like to know?",
        usage: { prompt_tokens: 50, completion_tokens: 80, total_tokens: 130 },
      };
    }

    // Complaints
    if (userMessage.match(/complaint|issue|problem|bad|poor|wrong/)) {
      return {
        content: "I'm sorry to hear you're experiencing an issue. 😔 I'm here to help resolve this. Could you please tell me more about what happened?",
        usage: { prompt_tokens: 55, completion_tokens: 40, total_tokens: 95 },
      };
    }

    // Default response
    return {
      content: "I understand. How can I assist you with that?",
      usage: { prompt_tokens: 45, completion_tokens: 15, total_tokens: 60 },
    };
  }

  /**
   * Generate embedding for text (for semantic search/caching)
   */
  async embed(text: string): Promise<number[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.adminBackendUrl}/ai/embed`, {
          text,
        }),
      );

      return response.data.embedding;
    } catch (error) {
      this.logger.error('Embedding error:', error);
      return [];
    }
  }

  /**
   * Check if two embeddings are similar (for caching)
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
