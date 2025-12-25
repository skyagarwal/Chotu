import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/services/llm.service';

/**
 * Conversation Analyzer Service
 * 
 * Analyzes user conversations to extract:
 * - Food preferences (veg/non-veg, cuisines, spice level)
 * - Dietary restrictions (allergies, religious, health)
 * - Communication tone and style
 * - Personality traits
 * - Shopping behavior and interests
 * - Sentiment and satisfaction
 */
@Injectable()
export class ConversationAnalyzerService {
  private readonly logger = new Logger(ConversationAnalyzerService.name);

  constructor(
    private readonly llmService: LlmService
  ) {}

  /**
   * Analyze conversation to extract user preferences
   */
  async analyzeConversation(params: {
    userId: number;
    phone: string;
    conversationHistory: Array<{ role: string; content: string }>;
    context?: any;
  }): Promise<ConversationAnalysis> {
    const startTime = Date.now();

    try {
      // Build analysis prompt
      const prompt = this.buildAnalysisPrompt(params.conversationHistory);

      // Call LLM to analyze
      const response = await this.llmService.chat({
        messages: [
          {
            role: 'system',
            content: `You are an expert conversation analyst. Analyze user conversations to extract preferences, personality, and behavioral patterns.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'Qwen/Qwen2.5-7B-Instruct-AWQ', // Local vLLM model
        temperature: 0.3,
        maxTokens: 2000,
        responseFormat: { type: 'json_object' }
      });

      // Parse LLM response
      const analysis = this.parseAnalysisResponse(response.content);

      this.logger.log(`Analyzed conversation for user ${params.userId} in ${Date.now() - startTime}ms`);

      return {
        userId: params.userId,
        phone: params.phone,
        ...analysis,
        analyzedAt: new Date(),
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error(`Failed to analyze conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract specific insights from a single message
   */
  async extractMessageInsights(params: {
    userId: number;
    messageText: string;
    context?: any;
  }): Promise<MessageInsight[]> {
    const insights: MessageInsight[] = [];

    try {
      // Quick pattern matching for common insights
      const text = params.messageText.toLowerCase();

      // Dietary preferences
      if (text.match(/\b(veg|vegetarian|no meat|meatless)\b/)) {
        insights.push({
          type: 'food_preference',
          category: 'dietary',
          value: { preference: 'vegetarian' },
          confidence: 0.8,
          textExcerpt: params.messageText
        });
      }

      if (text.match(/\b(jain|no onion|no garlic)\b/)) {
        insights.push({
          type: 'food_preference',
          category: 'dietary',
          value: { restriction: 'jain', no_onion: true, no_garlic: true },
          confidence: 0.9,
          textExcerpt: params.messageText
        });
      }

      // Spice preferences
      const spiceMatch = text.match(/\b(mild|medium|spicy|extra spicy|less spicy|more spicy)\b/);
      if (spiceMatch) {
        insights.push({
          type: 'food_preference',
          category: 'taste',
          value: { spice_level: spiceMatch[1] },
          confidence: 0.85,
          textExcerpt: params.messageText
        });
      }

      // Tone detection
      if (text.includes('please') || text.includes('thank you') || text.includes('thanks')) {
        insights.push({
          type: 'tone_shift',
          category: 'behavioral',
          value: { tone: 'polite' },
          confidence: 0.7,
          textExcerpt: params.messageText
        });
      }

      // Complaints
      if (text.match(/\b(late|delay|slow|bad|terrible|worst|disappointed)\b/)) {
        insights.push({
          type: 'complaint',
          category: 'emotional',
          value: { sentiment: 'negative', issue: this.extractIssue(text) },
          confidence: 0.75,
          textExcerpt: params.messageText
        });
      }

      // Compliments
      if (text.match(/\b(good|great|excellent|amazing|love|best|perfect)\b/)) {
        insights.push({
          type: 'compliment',
          category: 'emotional',
          value: { sentiment: 'positive' },
          confidence: 0.7,
          textExcerpt: params.messageText
        });
      }

      return insights;

    } catch (error) {
      this.logger.error(`Failed to extract insights: ${error.message}`);
      return insights;
    }
  }

  /**
   * Analyze tone and communication style
   */
  analyzeTone(conversationHistory: Array<{ role: string; content: string }>): ToneAnalysis {
    const userMessages = conversationHistory.filter(m => m.role === 'user');
    const totalWords = userMessages.reduce((sum, m) => sum + m.content.split(' ').length, 0);
    const avgWordsPerMessage = totalWords / Math.max(userMessages.length, 1);

    let tone = 'neutral';
    let emojiCount = 0;
    let politeWords = 0;
    let urgentWords = 0;

    userMessages.forEach(msg => {
      const text = msg.content.toLowerCase();
      
      // Count emojis
      emojiCount += (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
      
      // Polite indicators
      if (text.includes('please') || text.includes('thank') || text.includes('kindly')) politeWords++;
      
      // Urgent indicators
      if (text.includes('urgent') || text.includes('asap') || text.includes('quickly')) urgentWords++;
    });

    const emojiUsageRate = emojiCount / Math.max(userMessages.length, 1);

    // Determine tone
    if (politeWords > userMessages.length * 0.3) tone = 'polite';
    else if (urgentWords > 2) tone = 'direct';
    else if (emojiUsageRate > 1) tone = 'friendly';
    else if (avgWordsPerMessage > 20) tone = 'detailed';
    else if (avgWordsPerMessage < 5) tone = 'brief';

    return {
      tone,
      responseStyle: avgWordsPerMessage > 15 ? 'detailed' : avgWordsPerMessage < 8 ? 'brief' : 'conversational',
      emojiUsage: emojiUsageRate > 2 ? 'frequent' : emojiUsageRate > 0.5 ? 'moderate' : emojiUsageRate > 0 ? 'minimal' : 'none',
      avgWordsPerMessage: Math.round(avgWordsPerMessage),
      confidence: 0.7
    };
  }

  /**
   * Build analysis prompt from conversation history
   */
  private buildAnalysisPrompt(conversationHistory: Array<{ role: string; content: string }>): string {
    const recentMessages = conversationHistory.slice(-20); // Last 20 messages
    
    let prompt = 'Analyze this conversation and extract user preferences and personality:\n\n';
    
    recentMessages.forEach((msg, i) => {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });

    prompt += '\nProvide detailed analysis in JSON format.';
    
    return prompt;
  }

  /**
   * Parse LLM analysis response
   */
  private parseAnalysisResponse(content: string): any {
    try {
      // Extract JSON from response (may have markdown formatting)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON found in LLM response, using defaults');
        return this.getDefaultAnalysis();
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return analysis;

    } catch (error) {
      this.logger.error(`Failed to parse analysis: ${error.message}`);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Extract issue type from complaint text
   */
  private extractIssue(text: string): string {
    if (text.includes('late') || text.includes('delay')) return 'delivery_delay';
    if (text.includes('cold') || text.includes('quality')) return 'food_quality';
    if (text.includes('missing') || text.includes('wrong')) return 'wrong_items';
    if (text.includes('rude') || text.includes('behavior')) return 'service_quality';
    return 'other';
  }

  /**
   * Default analysis when parsing fails
   */
  private getDefaultAnalysis(): any {
    return {
      food_preferences: { confidence: 0 },
      dietary_restrictions: [],
      shopping_preferences: { confidence: 0 },
      communication_style: { tone: 'neutral' },
      personality_traits: {},
      behavioral_insights: {},
      sentiment: { overall: 'neutral', satisfaction_score: 3.0 },
      extracted_facts: [],
      insights: []
    };
  }
}

// Type definitions
export interface ConversationAnalysis {
  userId: number;
  phone: string;
  food_preferences?: {
    dietary_type?: string;
    spice_level?: string;
    cuisines?: string[];
    meal_types?: string[];
    confidence?: number;
  };
  dietary_restrictions?: string[];
  shopping_preferences?: {
    product_interests?: string[];
    brands?: string[];
    price_sensitivity?: string;
    confidence?: number;
  };
  communication_style?: {
    tone?: string;
    response_style?: string;
    emoji_usage?: string;
    language_proficiency?: string;
  };
  personality_traits?: {
    patience?: string;
    detail_oriented?: boolean;
    decisive?: boolean;
    price_conscious?: boolean;
    health_conscious?: boolean;
    brand_loyal?: boolean;
  };
  behavioral_insights?: {
    impulse_buyer?: boolean;
    planner?: boolean;
    comparison_shopper?: boolean;
    early_adopter?: boolean;
  };
  sentiment?: {
    overall?: string;
    satisfaction_score?: number;
    recent_complaints?: string[];
    recent_compliments?: string[];
  };
  extracted_facts?: Array<{
    fact: string;
    category: string;
    importance: number;
  }>;
  insights?: string[];
  analyzedAt?: Date;
  processingTimeMs?: number;
}

export interface MessageInsight {
  type: string;
  category: string;
  value: any;
  confidence: number;
  textExcerpt: string;
}

export interface ToneAnalysis {
  tone: string;
  responseStyle: string;
  emojiUsage: string;
  avgWordsPerMessage: number;
  confidence: number;
}
