import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { PrismaService } from '../../database/prisma.service';

export interface LlmIntentExtractionResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  tone: string;
  sentiment: string;
  urgency: number;
  reasoning: string; // Why LLM chose this intent
}

@Injectable()
export class LlmIntentExtractorService {
  private readonly logger = new Logger(LlmIntentExtractorService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Use LLM to extract intent when NLU confidence is low
   * This is the fallback when IndicBERT/heuristics fail
   */
  async extractIntent(
    text: string,
    language: string = 'en',
    availableIntents: string[],
  ): Promise<LlmIntentExtractionResult> {
    this.logger.log(`LLM fallback for: "${text}"`);

    // Quick pattern-based check for chitchat before LLM (saves tokens)
    // Includes: Hinglish, seasonal greetings, pleasantries, follow-up responses
    const chitchatPatterns = [
      // Hinglish patterns
      /kaise\s*(hai|ho)/i,       // kaise hai, kaise ho
      /kya\s*(haal|chal)/i,      // kya haal, kya chal
      /kaisa\s*hai/i,            // kaisa hai
      /theek\s*(ho|hai)/i,       // theek ho, theek hai
      /sab\s*theek/i,            // sab theek
      /kya\s*kar\s*rahe/i,       // kya kar rahe ho
      /\bchotu\b/i,              // chotu (bot name)
      /\bre\s+chotu\b/i,         // re chotu
      /\bhey\s+chotu\b/i,        // hey chotu
      // Seasonal/festival greetings (respond as chitchat, not new greeting)
      /merry\s*christmas/i,      // merry christmas
      /happy\s*(new\s*year|diwali|holi|eid|rakhi|navratri)/i, // festivals
      /shubh\s*(diwali|holi|navratri)/i, // Hindi festivals
      // Pleasantries and thank-you
      /thank\s*(you|u)|thanks/i,  // thank you, thanks
      /good\s*(job|work|one)/i,   // good job
      /nice|cool|awesome|great|amazing|wonderful/i, // positive feedback
      /same\s*to\s*(you|u)/i,     // same to you
      /you\s*too/i,               // you too
      // Social questions
      /how\s*are\s*(you|u)/i,     // how are you
      /what'?s\s*up/i,            // what's up
      /wassup|sup\b/i,            // casual greetings
    ];

    for (const pattern of chitchatPatterns) {
      if (pattern.test(text)) {
        this.logger.log(`Matched chitchat pattern: ${pattern}`);
        return {
          intent: 'chitchat',
          confidence: 0.92,
          entities: {},
          tone: 'friendly',
          sentiment: 'positive',
          urgency: 0.1,
          reasoning: 'Chitchat/pleasantry pattern detected',
        };
      }
    }

    let intentList = '';
    
    try {
      // Fetch intents from database (no enabled field in schema)
      const dbIntents = await this.prisma.intentDefinition.findMany();

      if (dbIntents.length > 0) {
        intentList = dbIntents.map((intent, i) => 
          `${i + 1}. ${intent.name}: ${intent.description || ''}`
        ).join('\n');
        this.logger.debug(`Loaded ${dbIntents.length} intents from database`);
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch intents from DB: ${error.message}. Using hardcoded fallback.`);
    }

    // Fallback to hardcoded intents if DB is empty or failed
    if (!intentList) {
      const intentDescriptions = {
        'order_food': 'User wants to order food/meals FROM A RESTAURANT (pizza, biryani, burger, etc.).',
        'track_order': 'User asking about order location/status ("where is my order", "track delivery")',
        'cancel_order': 'User wants to cancel an existing order',
        'repeat_order': 'User wants to repeat a previous order ("repeat last order", "same as before")',
        'parcel_booking': 'User wants to send/book a parcel/courier/package. INCLUDES sending home-cooked food to friends/family ("send food to my friend", "pickup from home").',
        'search_product': 'User searching for products ("find", "show me", "looking for")',
        'earn': 'User wants to play games, earn money, rewards, or see leaderboard',
        'help': 'User needs help/support',
        'complaint': 'User complaining about service/product (wrong item, damaged, refund)',
        'greeting': 'User greeting (hi, hello, hey, namaste)',
        'chitchat': 'Casual conversation, small talk, or pleasantries: "how are you", "kaise hai", "merry christmas", "happy diwali", "thank you", "same to you", "what\'s up", "chotu" (bot name). Use for follow-up social responses after initial greeting.',
        'login': 'User wants to login, sign in, register, or check authentication status',
        'manage_address': 'User wants to add, save, view, or manage saved addresses. INCLUDES: "save this address as home", "add address", "show my addresses", "save this location as office", or when user shares location with request to save it.',
        'service_inquiry': 'User asking about available services, vehicles, categories, or pricing ("what vehicles do you have", "show categories")',
        'unknown': 'Message unclear or doesn\'t fit other intents'
      };

      intentList = availableIntents.map((intent, i) => 
        `${i + 1}. ${intent}: ${intentDescriptions[intent] || intent}`
      ).join('\n');
    }

    const systemPrompt = `You are an expert intent classifier for a delivery and e-commerce platform in India.

Available Intents:
${intentList}

Your task:
1. Classify the user's message into ONE of the above intents
2. Extract entities (location, product, order_id, phone, date, etc.)
3. Detect tone (happy, angry, urgent, neutral, frustrated, polite, confused)
4. Assess urgency (0.0 to 1.0)
5. Provide brief reasoning

Rules:
- Match queries like "I want pizza" → order_food (high confidence 0.85+)
- Match "where is my order" → track_order (high confidence 0.9+)
- Do NOT classify "Cash on Delivery", "COD", or "Pay via Cash" as parcel_booking. These are payment methods. Use "unknown" if no other intent matches.
- CRITICAL: If user shares a Google Maps link or location WITH a request to "save", "add", or label it as "home"/"office" → manage_address (0.9+)
  - Example: "maps.app.goo.gl/xxx save this as my home" → manage_address
  - Example: "save this address as office" → manage_address
  - Extract entities: address_type (home/office/other), has_location (true if maps link present)
- CRITICAL DISTINCTION: 
  - "Order food" / "I want pizza" = order_food (Restaurant -> User)
  - "Send food to friend" / "Pickup food from home" = parcel_booking (User -> User)
  - If user mentions "pickup from my home" or "send to friend", it is ALWAYS parcel_booking, even if the item is food.
- Handle Hinglish and misspellings
- Be decisive - use confidence 0.7-0.95 for clear matches
- Only use "unknown" for truly ambiguous messages

Respond ONLY with valid JSON in this exact format:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": {"entity_type": "value"},
  "tone": "happy|angry|urgent|neutral|frustrated|polite|confused",
  "sentiment": "positive|negative|neutral",
  "urgency": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.llmService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        model: 'Qwen/Qwen2.5-7B-Instruct-AWQ', // Use local vLLM
        provider: 'vllm', // Force vLLM usage (no cloud fallback)
        temperature: 0.2, // Very low for consistent classification
        maxTokens: 200,
      });

      // Parse LLM response
      const result = this.parseLlmResponse(response.content);

      this.logger.log(
        `LLM extracted: ${result.intent} (${result.confidence.toFixed(2)}) - ${result.reasoning}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`LLM intent extraction failed: ${error.message}`);
      
      // Ultimate fallback
      return {
        intent: 'unknown',
        confidence: 0.1,
        entities: {},
        tone: 'neutral',
        sentiment: 'neutral',
        urgency: 0.5,
        reasoning: 'LLM extraction failed',
      };
    }
  }

  /**
   * Parse LLM JSON response with error handling
   */
  private parseLlmResponse(content: string): LlmIntentExtractionResult {
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const parsed = JSON.parse(cleanedContent);

      return {
        intent: parsed.intent || 'unknown',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        entities: parsed.entities || {},
        tone: parsed.tone || 'neutral',
        sentiment: parsed.sentiment || 'neutral',
        urgency: Math.min(Math.max(parsed.urgency || 0.5, 0), 1),
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      this.logger.warn(`Failed to parse LLM response: ${error.message}`);
      this.logger.debug(`Raw content: ${content}`);

      // Try to extract intent from natural language response
      const intent = this.extractIntentFromNaturalLanguage(content);

      return {
        intent,
        confidence: 0.6,
        entities: {},
        tone: 'neutral',
        sentiment: 'neutral',
        urgency: 0.5,
        reasoning: 'Parsed from natural language response',
      };
    }
  }

  /**
   * Fallback: Extract intent from natural language LLM response
   */
  private extractIntentFromNaturalLanguage(content: string): string {
    const lowerContent = content.toLowerCase();

    const intentKeywords: Record<string, string[]> = {
      order_food: ['order', 'food', 'restaurant', 'menu'],
      track_order: ['track', 'status', 'delivery', 'where'],
      cancel_order: ['cancel', 'refund'],
      search_product: ['search', 'find', 'looking'],
      parcel_booking: ['parcel', 'courier', 'send'],
      support_request: ['help', 'support', 'assist'],
      complaint: ['complaint', 'problem', 'issue'],
    };

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        return intent;
      }
    }

    return 'unknown';
  }
}
