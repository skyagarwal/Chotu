import { Injectable, Logger } from '@nestjs/common';
import { UserPreferenceService } from './user-preference.service';
import { LlmService } from '../llm/services/llm.service';

/**
 * 🧠 Preference Extractor Service
 * 
 * Automatically extracts user preferences from natural conversation using LLM.
 * Builds user profiles progressively without explicit questioning.
 * 
 * Examples:
 * - "mujhe spicy nahi pasand" → spice_level: 'mild' (confidence: 0.9)
 * - "main vegetarian hoon" → dietary_type: 'veg' (confidence: 0.95)
 * - "budget mein kuch dikhao" → price_sensitivity: 'budget' (confidence: 0.85)
 */

export interface ExtractedPreference {
  category: 'dietary' | 'shopping' | 'communication' | 'personality';
  key: string;
  value: any;
  confidence: number; // 0.0 - 1.0
  source: string; // The exact message that led to extraction
  shouldConfirm: boolean; // Should we ask user to confirm?
}

export interface ExtractionResult {
  preferences: ExtractedPreference[];
  suggestedQuestions: string[]; // Follow-up questions to gather more data
}

@Injectable()
export class PreferenceExtractorService {
  private readonly logger = new Logger(PreferenceExtractorService.name);

  constructor(
    private llmService: LlmService,
    private userPreferenceService: UserPreferenceService,
  ) {}

  /**
   * Extract preferences from a user message
   */
  async extractFromMessage(
    userId: number,
    message: string,
    conversationHistory?: string[],
  ): Promise<ExtractionResult> {
    this.logger.log(`🔍 Extracting preferences from: "${message}"`);

    try {
      // Build extraction prompt
      const systemPrompt = this.buildExtractionPrompt();
      const userPrompt = this.buildUserPrompt(message, conversationHistory);

      // Call LLM to extract preferences
      const response = await this.llmService.chat({
        model: 'Qwen/Qwen2.5-7B-Instruct-AWQ', // Local vLLM model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for consistent extraction
        maxTokens: 500,
      });

      // Parse LLM response
      const result = this.parseExtractionResponse(response.content, message);

      // Store high-confidence preferences immediately
      await this.storeHighConfidencePreferences(userId, result.preferences);

      this.logger.log(`✅ Extracted ${result.preferences.length} preferences`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Extraction failed: ${error.message}`);
      return { preferences: [], suggestedQuestions: [] };
    }
  }

  /**
   * Build system prompt for preference extraction
   */
  private buildExtractionPrompt(): string {
    return `You are a preference extraction AI for a food delivery and e-commerce platform in Nashik, India.

Your task: Analyze user messages to extract preferences about:

1. DIETARY PREFERENCES:
   - dietary_type: "veg", "non-veg", "vegan", "jain", "eggetarian"
   - spice_level: "mild", "medium", "hot", "extra-hot"
   - allergies: ["peanuts", "dairy", "gluten", "shellfish"]
   - favorite_cuisines: ["chinese", "italian", "indian", "mexican"]
   - disliked_ingredients: ["mushroom", "paneer", "coconut"]

2. SHOPPING BEHAVIOR:
   - price_sensitivity: "budget", "value", "premium"
   - order_frequency: "daily", "weekly", "monthly", "occasional"

3. COMMUNICATION STYLE:
   - communication_tone: "casual", "formal", "friendly"
   - language_preference: "en", "hi", "hinglish", "mr"

4. PERSONALITY TRAITS:
   - decisive: true/false (knows what they want vs exploratory)
   - health_conscious: true/false
   - impatient: true/false

IMPORTANT RULES:
- Only extract if you're confident (confidence > 0.7)
- Use exact values from the lists above
- Assign confidence score 0.0-1.0 based on clarity
- Return JSON format only

Response format:
{
  "preferences": [
    {
      "category": "dietary",
      "key": "dietary_type",
      "value": "veg",
      "confidence": 0.95,
      "shouldConfirm": false
    }
  ],
  "suggestedQuestions": [
    "Btw, spice level medium theek hai ya kam chahiye?"
  ]
}`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(message: string, history?: string[]): string {
    let prompt = `Extract preferences from this user message:\n\n"${message}"`;

    if (history && history.length > 0) {
      prompt += `\n\nRecent conversation context:\n${history.slice(-3).join('\n')}`;
    }

    return prompt;
  }

  /**
   * Parse LLM extraction response
   */
  private parseExtractionResponse(
    content: string,
    sourceMessage: string,
  ): ExtractionResult {
    try {
      // Extract JSON from response (LLM might add explanation)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { preferences: [], suggestedQuestions: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Add source to each preference
      const preferences = (parsed.preferences || []).map(pref => ({
        ...pref,
        source: sourceMessage,
      }));

      return {
        preferences,
        suggestedQuestions: parsed.suggestedQuestions || [],
      };
    } catch (error) {
      this.logger.warn(`Failed to parse extraction response: ${error.message}`);
      return { preferences: [], suggestedQuestions: [] };
    }
  }

  /**
   * Store high-confidence preferences immediately
   * Low-confidence preferences are stored as insights for later confirmation
   */
  private async storeHighConfidencePreferences(
    userId: number,
    preferences: ExtractedPreference[],
  ): Promise<void> {
    for (const pref of preferences) {
      if (pref.confidence >= 0.85 && !pref.shouldConfirm) {
        // High confidence - update profile directly
        this.logger.log(
          `💾 Storing high-confidence preference: ${pref.key} = ${pref.value} (${pref.confidence})`,
        );

        await this.userPreferenceService.updatePreference(
          userId,
          pref.key,
          pref.value,
          'inferred',
          pref.confidence,
        );
      } else if (pref.confidence >= 0.7) {
        // Medium confidence - store as insight for confirmation
        this.logger.log(
          `📝 Storing insight for confirmation: ${pref.key} = ${pref.value} (${pref.confidence})`,
        );

        await this.userPreferenceService.updatePreference(
          userId,
          `pending_${pref.key}`, // Prefix with 'pending_'
          pref.value,
          'inferred',
          pref.confidence,
        );
      }
    }
  }

  /**
   * Generate confirmation question for pending preferences
   */
  async generateConfirmationQuestion(
    userId: number,
    preference: ExtractedPreference,
  ): Promise<string> {
    const templates = {
      dietary_type: {
        veg: 'Btw, vegetarian preference hai? Profile mein save kar loon? 🥗',
        'non-veg': 'Non-veg pasand hai? Agli baar yaad rakhunga 🍗',
        vegan: 'Vegan preference hai? Note kar leta hoon ✅',
      },
      spice_level: {
        mild: 'Spice kam pasand hai lagta hai? Medium level set kar doon? 🌶️',
        hot: 'Spicy lover! 🔥 Profile mein hot spice level save karoon?',
      },
      price_sensitivity: {
        budget: 'Budget-friendly options pasand hain? Hamesha deals dikhaun? 💰',
        premium: 'Premium quality important hai? High-end options prefer karoge? ⭐',
      },
      communication_tone: {
        casual: 'Casual friendly chat theek hai na? 😊',
        formal: 'Formal tone prefer karte hain? Professional rehta hoon? 👔',
      },
    };

    const template = templates[preference.key]?.[preference.value];
    if (template) {
      return template;
    }

    // Generic fallback
    return `${preference.key} set kar loon as ${preference.value}? Profile complete hoga ✅`;
  }

  /**
   * Get pending preferences that need confirmation
   */
  async getPendingConfirmations(userId: number): Promise<ExtractedPreference[]> {
    // Get user insights with 'pending_' prefix
    const prefs = await this.userPreferenceService.getPreferences(userId);
    
    return prefs.recentInsights
      ?.filter(insight => insight.key.startsWith('pending_'))
      .map(insight => ({
        category: this.getCategoryFromKey(insight.key),
        key: insight.key.replace('pending_', ''),
        value: insight.value,
        confidence: insight.confidence,
        source: 'conversation',
        shouldConfirm: true,
      })) || [];
  }

  /**
   * Confirm a pending preference
   */
  async confirmPreference(
    userId: number,
    key: string,
    confirmed: boolean,
  ): Promise<void> {
    if (confirmed) {
      // Get the pending preference
      const prefs = await this.userPreferenceService.getPreferences(userId);
      const pending = prefs.recentInsights?.find(
        i => i.key === `pending_${key}`,
      );

      if (pending) {
        // Move to actual profile with higher confidence
        await this.userPreferenceService.updatePreference(
          userId,
          key,
          pending.value,
          'explicit', // User confirmed
          1.0, // Full confidence now
        );

        this.logger.log(`✅ Preference confirmed: ${key} = ${pending.value}`);
      }
    } else {
      this.logger.log(`❌ Preference rejected: ${key}`);
    }

    // Remove pending_ insight regardless
    // TODO: Implement insight deletion in UserPreferenceService
  }

  /**
   * Extract preferences from order data (behavioral analysis)
   */
  async extractFromOrder(
    userId: number,
    orderData: {
      items: any[];
      total: number;
      restaurant?: string;
      cuisine?: string;
    },
  ): Promise<void> {
    this.logger.log(`📦 Extracting preferences from order (user ${userId})`);

    // Analyze items for dietary patterns
    const allVeg = orderData.items.every(item => 
      item.name?.toLowerCase().match(/veg|paneer|mushroom|vegetable/)
    );
    
    if (allVeg) {
      await this.userPreferenceService.updatePreference(
        userId,
        'dietary_type',
        'veg',
        'inferred',
        0.8,
      );
    }

    // Analyze price for sensitivity
    if (orderData.total < 300) {
      await this.userPreferenceService.updatePreference(
        userId,
        'price_sensitivity',
        'budget',
        'inferred',
        0.75,
      );
    } else if (orderData.total > 600) {
      await this.userPreferenceService.updatePreference(
        userId,
        'price_sensitivity',
        'premium',
        'inferred',
        0.75,
      );
    }

    // Extract favorite cuisine
    if (orderData.cuisine) {
      const prefs = await this.userPreferenceService.getPreferences(userId);
      const currentCuisines = prefs.favoriteCuisines || [];
      
      if (!currentCuisines.includes(orderData.cuisine)) {
        await this.userPreferenceService.updatePreference(
          userId,
          'favorite_cuisines',
          [...currentCuisines, orderData.cuisine],
          'inferred',
          0.7,
        );
      }
    }
  }

  /**
   * Extract communication style from message patterns
   */
  async analyzeMessageStyle(
    userId: number,
    messages: string[],
  ): Promise<void> {
    if (messages.length < 3) return; // Need at least 3 messages

    const avgLength = messages.reduce((sum, msg) => sum + msg.length, 0) / messages.length;
    const hasEmojis = messages.some(msg => /[\u{1F300}-\u{1F9FF}]/u.test(msg));
    const hasHindi = messages.some(msg => /[\u0900-\u097F]/.test(msg));
    const hasSlang = messages.some(msg => 
      /(bro|dude|yaar|bhai|boss)/i.test(msg)
    );

    // Determine tone
    let tone: string;
    if (hasSlang || hasEmojis) {
      tone = 'casual';
    } else if (avgLength > 100) {
      tone = 'formal';
    } else {
      tone = 'friendly';
    }

    await this.userPreferenceService.updatePreference(
      userId,
      'communication_tone',
      tone,
      'inferred',
      0.8,
    );

    // Determine language preference
    let language: string;
    if (hasHindi && !hasEmojis) {
      language = 'hi';
    } else if (hasHindi || hasSlang) {
      language = 'hinglish';
    } else {
      language = 'en';
    }

    await this.userPreferenceService.updatePreference(
      userId,
      'language_preference',
      language,
      'inferred',
      0.85,
    );
  }

  /**
   * Helper: Get category from preference key
   */
  private getCategoryFromKey(key: string): 'dietary' | 'shopping' | 'communication' | 'personality' {
    if (key.match(/dietary|spice|allerg|cuisine|ingredient/)) return 'dietary';
    if (key.match(/price|order|shopping/)) return 'shopping';
    if (key.match(/communication|tone|language/)) return 'communication';
    return 'personality';
  }
}
