import { Controller, Post, Body, Get, Query, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AgentOrchestratorService } from '../../agents/services/agent-orchestrator.service';
import { ConversationLoggerService } from '../../database/conversation-logger.service';
import { SessionService } from '../../session/session.service';
import { Platform } from '../../common/enums/platform.enum';
import { ModuleType } from '../../agents/types/agent.types';

/**
 * 🎤 Voice Conversation Controller
 * 
 * Dedicated endpoint for Mercury voice infrastructure to query Jupiter brain.
 * Optimizes responses for TTS output (no markdown, short sentences, etc.)
 * 
 * Endpoints:
 * - POST /api/conversation/voice - Process voice transcription
 * - GET /api/conversation/voice/health - Health check
 * 
 * Mercury → (ASR) → text → this controller → Jupiter AI → response → (TTS) → audio
 */
@ApiTags('Voice Conversation')
@Controller('conversation/voice')
export class VoiceConversationController {
  private readonly logger = new Logger(VoiceConversationController.name);

  constructor(
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly conversationLogger: ConversationLoggerService,
    private readonly sessionService: SessionService,
  ) {
    this.logger.log('✅ Voice Conversation Controller initialized');
    this.logger.log('🎤 Mercury can now call Jupiter at /api/conversation/voice');
  }

  /**
   * Health check endpoint for Mercury
   */
  @Get('health')
  @ApiOperation({ summary: 'Voice conversation health check' })
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'jupiter-voice-conversation',
      timestamp: Date.now(),
      features: {
        tts_optimization: true,
        chotu_character: true,
        multi_language: ['en', 'hi', 'mr'],
      },
    };
  }

  /**
   * Process voice transcription and return TTS-optimized response
   * 
   * This is the main endpoint Mercury calls after ASR processing.
   */
  @Post()
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Process voice transcription',
    description: 'Mercury sends transcribed speech, Jupiter returns TTS-optimized response'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text', 'session_id'],
      properties: {
        text: { type: 'string', description: 'ASR transcription' },
        session_id: { type: 'string', description: 'Voice session ID' },
        language: { type: 'string', enum: ['en', 'hi', 'mr', 'auto'], default: 'auto' },
        user_id: { type: 'number', description: 'Optional authenticated user ID' },
        phone: { type: 'string', description: 'Caller phone number' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'TTS-optimized response',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        response: { type: 'string', description: 'TTS-ready text response' },
        language: { type: 'string', description: 'Response language' },
        emotion: { type: 'string', description: 'Suggested TTS emotion' },
        dtmf_options: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              digit: { type: 'string' },
              label: { type: 'string' },
            }
          }
        },
        session_context: { type: 'object' },
      },
    },
  })
  async processVoiceTranscription(
    @Body() body: {
      text: string;
      session_id: string;
      language?: string;
      user_id?: number;
      phone?: string;
    },
  ) {
    const startTime = Date.now();
    const { text, session_id, language = 'auto', user_id, phone } = body;

    this.logger.log(`🎤 Voice input: "${text?.substring(0, 50)}..." | session: ${session_id}`);

    try {
      // Detect language if auto
      const detectedLanguage = language === 'auto' ? this.detectLanguage(text) : language;
      
      // Store session context
      await this.sessionService.setData(session_id, {
        platform: Platform.VOICE,
        language: detectedLanguage,
        user_id,
        phone,
        last_activity: Date.now(),
      });

      // Log user message
      await this.conversationLogger.logUserMessage({
        phone: phone || session_id,
        messageText: text,
        platform: 'voice',
        sessionId: session_id,
      });

      // Process through agent orchestrator
      const agentResponse = await this.agentOrchestratorService.processMessage(
        phone || session_id,  // phoneNumber
        text,                  // message
        ModuleType.FOOD,       // module (default)
        undefined,             // imageUrl
        undefined,             // testSession
        undefined,             // userPreferenceContext
      );

      // Optimize response for TTS
      // Handle response being either a string or an object with message property
      const rawResponse = agentResponse.response as any;
      const responseText = typeof rawResponse === 'string' 
        ? rawResponse 
        : rawResponse?.message || JSON.stringify(rawResponse);
      const ttsResponse = this.optimizeForTTS(responseText, detectedLanguage);
      
      // Extract DTMF options if buttons present
      const dtmfOptions = this.extractDTMFOptions(agentResponse);

      // Determine emotion/style for TTS
      const emotion = this.suggestEmotion(agentResponse, text);

      // Log assistant response
      await this.conversationLogger.logUserMessage({
        phone: phone || session_id,
        messageText: `[AI Response] ${ttsResponse}`,
        platform: 'voice',
        sessionId: session_id,
      });

      const latencyMs = Date.now() - startTime;
      this.logger.log(`✅ Voice response generated in ${latencyMs}ms | emotion: ${emotion}`);

      return {
        success: true,
        response: ttsResponse,
        language: detectedLanguage,
        emotion,
        dtmf_options: dtmfOptions,
        latency_ms: latencyMs,
        session_context: {
          session_id,
          flow: agentResponse.metadata?.flow,
          state: agentResponse.metadata?.state,
        },
      };
    } catch (error: any) {
      this.logger.error(`Voice processing error: ${error.message}`);
      
      // Return a friendly error response suitable for TTS
      const errorResponse = language === 'hi' || this.detectLanguage(text) === 'hi'
        ? 'माफ़ कीजिए, कुछ तकनीकी समस्या हो गई। कृपया दोबारा कोशिश करें।'
        : 'Sorry, there was a technical issue. Please try again.';

      return {
        success: false,
        response: errorResponse,
        language: language === 'auto' ? 'hi' : language,
        emotion: 'apologetic',
        error: error.message,
        latency_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Quick intent classification without full processing
   * Mercury can use this to decide if local handling is sufficient
   */
  @Post('classify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Quick intent classification' })
  async classifyIntent(
    @Body() body: { text: string; language?: string },
  ) {
    const { text, language = 'auto' } = body;
    
    // Simple local classification for common intents
    const lowerText = text.toLowerCase();
    const detectedLanguage = language === 'auto' ? this.detectLanguage(text) : language;
    
    // Greeting patterns
    if (this.matchesPattern(lowerText, ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'नमस्ते', 'नमस्कार'])) {
      return {
        intent: 'greeting',
        confidence: 0.95,
        requires_jupiter: false,
        suggested_response: this.getGreetingResponse(detectedLanguage),
        language: detectedLanguage,
      };
    }

    // Farewell patterns
    if (this.matchesPattern(lowerText, ['bye', 'goodbye', 'alvida', 'dhanyavaad', 'thank', 'धन्यवाद', 'अलविदा'])) {
      return {
        intent: 'farewell',
        confidence: 0.95,
        requires_jupiter: false,
        suggested_response: this.getFarewellResponse(detectedLanguage),
        language: detectedLanguage,
      };
    }

    // Order-related (needs Jupiter)
    if (this.matchesPattern(lowerText, ['order', 'track', 'delivery', 'status', 'ऑर्डर', 'डिलीवरी', 'स्टेटस'])) {
      return {
        intent: 'order_tracking',
        confidence: 0.8,
        requires_jupiter: true,
        language: detectedLanguage,
      };
    }

    // Unknown - needs Jupiter for full processing
    return {
      intent: 'unknown',
      confidence: 0.0,
      requires_jupiter: true,
      language: detectedLanguage,
    };
  }

  /**
   * Detect language from text
   */
  private detectLanguage(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Check for Devanagari characters (Hindi/Marathi)
    const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
    const totalAlpha = (text.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;

    if (totalAlpha === 0) return 'en';

    // If significant Devanagari script, it's Hindi/Marathi
    const hindiRatio = devanagariCount / totalAlpha;
    if (hindiRatio > 0.3) return 'hi';
    
    // Check for Romanized Hindi (Hinglish) patterns
    // Common Hindi words/particles that don't appear in English
    const hinglishWords = [
      'hai', 'hain', 'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'par',
      'aap', 'aapko', 'aapka', 'mujhe', 'mera', 'mere', 'tumhe', 'tumhara',
      'kya', 'kab', 'kahan', 'kaise', 'kyun', 'kaun',
      'chahiye', 'chahie', 'chaiye', 'chaye',
      'dekhne', 'lena', 'dena', 'karna', 'hona',
      'namaste', 'namaskar', 'dhanyavaad', 'shukriya',
      'bhi', 'abhi', 'yahan', 'wahan', 'jahan',
      'nahi', 'nahin', 'haan', 'han', 'thik', 'theek',
      'baare', 'liye', 'saath', 'wale', 'wala',
      'pasand', 'accha', 'achha', 'bahut', 'thoda', 'kuch'
    ];
    
    // Count Hinglish word matches (exact word boundaries)
    const words = lowerText.split(/\s+/);
    const hinglishMatches = words.filter(word => 
      hinglishWords.includes(word) || 
      hinglishWords.some(hw => hw.length > 3 && word === hw)
    ).length;
    
    // If 2 or more Hinglish words found, or 15%+ of words are Hinglish
    const hinglishRatio = words.length > 0 ? hinglishMatches / words.length : 0;
    if (hinglishMatches >= 2 || hinglishRatio >= 0.15) return 'hi';
    
    // Check for Marathi-specific Romanized patterns
    const marathiWords = ['aahe', 'ahe', 'mhanje', 'tumhi', 'tumcha'];
    const marathiMatches = words.filter(word => 
      marathiWords.includes(word)
    ).length;
    if (marathiMatches > 0) return 'mr';
    
    // Default to English
    return 'en';
  }

  /**
   * Optimize text for TTS output
   * 
   * Rules:
   * - Remove markdown formatting
   * - Remove emojis
   * - Expand abbreviations
   * - Keep sentences short
   */
  private optimizeForTTS(text: string, language: string): string {
    if (!text) return '';

    let optimized = text;

    // Remove markdown
    optimized = optimized.replace(/\*\*?(.*?)\*\*?/g, '$1'); // Bold/italic
    optimized = optimized.replace(/_+(.*?)_+/g, '$1'); // Underline
    optimized = optimized.replace(/`(.*?)`/g, '$1'); // Code

    // Remove emojis (keep text clean for TTS)
    optimized = optimized.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '');

    // Expand currency
    if (language === 'hi') {
      optimized = optimized.replace(/₹\s*(\d+)/g, '$1 रुपये');
    } else {
      optimized = optimized.replace(/₹\s*(\d+)/g, '$1 rupees');
    }

    // Clean up extra whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // Remove bullet points
    optimized = optimized.replace(/^[\-•]\s*/gm, '');

    return optimized;
  }

  /**
   * Extract DTMF options from buttons in response
   */
  private extractDTMFOptions(response: any): Array<{ digit: string; label: string }> {
    if (!response.buttons || !Array.isArray(response.buttons)) {
      return [];
    }

    return response.buttons.slice(0, 9).map((btn: any, idx: number) => ({
      digit: String(idx + 1),
      label: btn.label || btn.text || btn.title,
    }));
  }

  /**
   * Suggest TTS emotion based on response context
   */
  private suggestEmotion(response: any, userText: string): string {
    const lowerText = userText.toLowerCase();
    
    // Greeting → warm
    if (this.matchesPattern(lowerText, ['hello', 'hi', 'namaste', 'नमस्ते'])) {
      return 'warm';
    }

    // Complaint → apologetic
    if (this.matchesPattern(lowerText, ['problem', 'issue', 'complaint', 'late', 'wrong', 'शिकायत', 'समस्या'])) {
      return 'apologetic';
    }

    // Order success → happy
    const respText = typeof response.response === 'string' 
      ? response.response 
      : (response.response as any)?.message || '';
    if (respText.includes('confirm') || respText.includes('success')) {
      return 'happy';
    }

    // Default Chotu personality
    return 'helpful';
  }

  /**
   * Check if text matches any of the patterns
   */
  private matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  /**
   * Get greeting response for language
   */
  private getGreetingResponse(language: string): string {
    const greetings: Record<string, string> = {
      hi: 'नमस्ते! मैं छोटू हूं, मंगवाले का AI असिस्टेंट। आपकी क्या मदद कर सकता हूं?',
      mr: 'नमस्कार! मी छोटू आहे, मंगवालेचा AI असिस्टंट. मी तुमची कशी मदत करू शकतो?',
      en: "Hello! I'm Chotu, Mangwale's AI assistant. How can I help you today?",
    };
    return greetings[language] || greetings.en;
  }

  /**
   * Get farewell response for language
   */
  private getFarewellResponse(language: string): string {
    const farewells: Record<string, string> = {
      hi: 'धन्यवाद! आपका दिन शुभ हो। फिर मिलेंगे!',
      mr: 'धन्यवाद! तुमचा दिवस चांगला जावो. पुन्हा भेटू!',
      en: 'Thank you! Have a great day. Talk to you soon!',
    };
    return farewells[language] || farewells.en;
  }
}
