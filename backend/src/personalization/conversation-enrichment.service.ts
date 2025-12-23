import { Injectable, Logger } from '@nestjs/common';
import { PreferenceExtractorService, ExtractedPreference } from './preference-extractor.service';
import { UserPreferenceService } from './user-preference.service';

/**
 * 🎯 Conversation Enrichment Service
 * 
 * Orchestrates profile enrichment during conversations:
 * 1. Monitors conversations for preference signals
 * 2. Extracts preferences automatically
 * 3. Asks confirmation questions when needed
 * 4. Updates profiles progressively
 * 
 * This service is called by ConversationService after each user message.
 */

export interface EnrichmentSuggestion {
  question: string;
  preference: ExtractedPreference;
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class ConversationEnrichmentService {
  private readonly logger = new Logger(ConversationEnrichmentService.name);

  // Track which users we've asked questions to (avoid spam)
  private recentlyAskedUsers = new Map<number, Set<string>>();

  constructor(
    private preferenceExtractor: PreferenceExtractorService,
    private userPreferenceService: UserPreferenceService,
  ) {}

  /**
   * Main entry point: Enrich profile after user message
   */
  async enrichProfileFromMessage(
    userId: number,
    message: string,
    conversationHistory?: string[],
  ): Promise<EnrichmentSuggestion | null> {
    try {
      // 1. Extract preferences from message
      const extraction = await this.preferenceExtractor.extractFromMessage(
        userId,
        message,
        conversationHistory,
      );

      // 2. Check if we should ask a confirmation question
      const suggestion = await this.shouldAskConfirmation(
        userId,
        extraction.preferences,
      );

      if (suggestion) {
        this.markAsked(userId, suggestion.preference.key);
        return suggestion;
      }

      // 3. Check if we should ask a proactive question (profile building)
      const proactiveQuestion = await this.getProactiveQuestion(userId);
      if (proactiveQuestion) {
        return proactiveQuestion;
      }

      return null;
    } catch (error) {
      this.logger.error(`Enrichment failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Enrich profile after order completion
   */
  async enrichProfileFromOrder(
    userId: number,
    orderData: any,
  ): Promise<void> {
    await this.preferenceExtractor.extractFromOrder(userId, orderData);
    
    // Update order count for frequency calculation
    await this.userPreferenceService.inferPreferences(userId);
  }

  /**
   * Analyze message patterns to extract communication style
   */
  async enrichCommunicationStyle(
    userId: number,
    recentMessages: string[],
  ): Promise<void> {
    if (recentMessages.length >= 5) {
      await this.preferenceExtractor.analyzeMessageStyle(userId, recentMessages);
    }
  }

  /**
   * Decide if we should ask confirmation for extracted preferences
   */
  private async shouldAskConfirmation(
    userId: number,
    preferences: ExtractedPreference[],
  ): Promise<EnrichmentSuggestion | null> {
    // Find highest priority preference needing confirmation
    const needsConfirmation = preferences
      .filter(p => p.shouldConfirm && p.confidence >= 0.7 && p.confidence < 0.85)
      .sort((a, b) => b.confidence - a.confidence);

    if (needsConfirmation.length === 0) {
      return null;
    }

    const pref = needsConfirmation[0];

    // Check if we've already asked about this
    if (this.hasRecentlyAsked(userId, pref.key)) {
      return null;
    }

    // Generate confirmation question
    const question = await this.preferenceExtractor.generateConfirmationQuestion(
      userId,
      pref,
    );

    return {
      question,
      preference: pref,
      priority: this.calculatePriority(pref),
    };
  }

  /**
   * Get proactive question to fill profile gaps
   */
  private async getProactiveQuestion(
    userId: number,
  ): Promise<EnrichmentSuggestion | null> {
    const prefs = await this.userPreferenceService.getPreferences(userId);

    // Don't ask if profile is already complete enough
    if (prefs.profileCompleteness > 70) {
      return null;
    }

    // Prioritized list of questions (only ask if missing)
    const questionTemplates = [
      {
        key: 'dietary_type',
        missing: !prefs.dietaryType,
        question: 'Btw, veg ya non-veg preference hai? Profile complete karne ke liye puchh raha hoon 🙏',
        priority: 'high' as const,
      },
      {
        key: 'spice_level',
        missing: !prefs.spiceLevel,
        question: 'Spice level kaisa pasand hai - mild, medium ya hot? 🌶️',
        priority: 'high' as const,
      },
      {
        key: 'favorite_cuisines',
        missing: !prefs.favoriteCuisines || prefs.favoriteCuisines.length === 0,
        question: 'Konsa cuisine sabse zyada pasand hai? Chinese, Italian, Indian? 🍜',
        priority: 'medium' as const,
      },
      {
        key: 'allergies',
        missing: !prefs.allergies || prefs.allergies.length === 0,
        question: 'Koi food allergy hai kya? Safety ke liye jaanna important hai 🏥',
        priority: 'high' as const,
      },
      {
        key: 'price_sensitivity',
        missing: !prefs.priceSensitivity,
        question: 'Budget-friendly options dikhau ya premium quality prefer karte ho? 💰',
        priority: 'medium' as const,
      },
    ];

    // Find first missing high-priority item we haven't asked about
    for (const template of questionTemplates) {
      if (template.missing && !this.hasRecentlyAsked(userId, template.key)) {
        this.markAsked(userId, template.key);
        
        return {
          question: template.question,
          preference: {
            category: 'dietary',
            key: template.key,
            value: null,
            confidence: 0,
            source: 'proactive_question',
            shouldConfirm: false,
          },
          priority: template.priority,
        };
      }
    }

    return null;
  }

  /**
   * Calculate priority for asking about a preference
   */
  private calculatePriority(pref: ExtractedPreference): 'high' | 'medium' | 'low' {
    // High priority: Safety and core preferences
    if (pref.key === 'allergies' || pref.key === 'dietary_type') {
      return 'high';
    }

    // Medium priority: UX improvement
    if (pref.key === 'price_sensitivity' || pref.key === 'spice_level') {
      return 'medium';
    }

    // Low priority: Nice to have
    return 'low';
  }

  /**
   * Check if we've recently asked this user about this preference
   */
  private hasRecentlyAsked(userId: number, key: string): boolean {
    const asked = this.recentlyAskedUsers.get(userId);
    return asked ? asked.has(key) : false;
  }

  /**
   * Mark that we've asked this user about this preference
   */
  private markAsked(userId: number, key: string): void {
    if (!this.recentlyAskedUsers.has(userId)) {
      this.recentlyAskedUsers.set(userId, new Set());
    }
    this.recentlyAskedUsers.get(userId).add(key);

    // Clean up after 24 hours
    setTimeout(() => {
      this.recentlyAskedUsers.get(userId)?.delete(key);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Process user's response to our confirmation question
   */
  async processConfirmationResponse(
    userId: number,
    preferenceKey: string,
    userResponse: string,
  ): Promise<boolean> {
    // Detect yes/no from response
    const isYes = this.detectConfirmation(userResponse);
    
    await this.preferenceExtractor.confirmPreference(
      userId,
      preferenceKey,
      isYes,
    );

    return isYes;
  }

  /**
   * Detect if user said yes/no
   */
  private detectConfirmation(response: string): boolean {
    const lower = response.toLowerCase().trim();
    
    // Yes patterns
    if (lower.match(/^(yes|y|ha|haan|han|sure|ok|okay|correct|right|theek|bilkul)/)) {
      return true;
    }

    // No patterns
    if (lower.match(/^(no|n|nahi|nai|nope|wrong|galat)/)) {
      return false;
    }

    // Default to yes if ambiguous (optimistic)
    return true;
  }

  /**
   * Get enrichment progress for user
   */
  async getEnrichmentProgress(userId: number): Promise<{
    profileCompleteness: number;
    pendingConfirmations: number;
    recentExtractions: number;
    nextSuggestedQuestion?: string;
  }> {
    const prefs = await this.userPreferenceService.getPreferences(userId);
    const pending = await this.preferenceExtractor.getPendingConfirmations(userId);
    const proactive = await this.getProactiveQuestion(userId);

    return {
      profileCompleteness: prefs.profileCompleteness,
      pendingConfirmations: pending.length,
      recentExtractions: prefs.recentInsights?.length || 0,
      nextSuggestedQuestion: proactive?.question,
    };
  }
}
