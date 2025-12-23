/**
 * Enhanced Agent Tools
 * 
 * New tools for LLM agents to use:
 * 1. search_google_places - Find restaurants via Google
 * 2. get_external_reviews - Fetch Google reviews
 * 3. get_item_intelligence - AI review insights
 * 4. compare_with_competitors - Value proposition
 * 5. log_conversation_feedback - Self-learning
 */

import { Injectable, Logger } from '@nestjs/common';
import { FunctionExecutor, AgentContext, FunctionDefinition } from '../types/agent.types';
import { GooglePlacesService } from '../../integrations/google-places.service';
import { ReviewIntelligenceService } from '../../reviews/services/review-intelligence.service';
import { ValuePropositionService } from '../../pricing/services/value-proposition.service';
import { MistakeTrackerService, MistakeType } from '../../learning/services/mistake-tracker.service';

/**
 * Tool definitions for LLM function calling
 */
export const ENHANCED_TOOL_DEFINITIONS: FunctionDefinition[] = [
  {
    name: 'search_google_places',
    description: 'Search Google for restaurants/stores not in our database. Use when user asks for a specific restaurant we don\'t have or wants to explore new places.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Restaurant name, cuisine type, or search query (e.g., "Dominos", "Chinese restaurants")',
        },
        lat: {
          type: 'number',
          description: 'User latitude for nearby search',
        },
        lng: {
          type: 'number',
          description: 'User longitude for nearby search',
        },
        radius: {
          type: 'number',
          description: 'Search radius in meters (default: 5000)',
        },
        min_rating: {
          type: 'number',
          description: 'Minimum Google rating filter (1-5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_external_reviews',
    description: 'Get Google reviews for a restaurant. Use when user wants more reviews or when our reviews are limited.',
    parameters: {
      type: 'object',
      properties: {
        store_id: {
          type: 'string',
          description: 'Our store ID to fetch Google reviews for',
        },
        include_analysis: {
          type: 'boolean',
          description: 'Include sentiment analysis of reviews (default: true)',
        },
      },
      required: ['store_id'],
    },
  },
  {
    name: 'get_item_intelligence',
    description: 'Get AI-analyzed review insights for a food item. Returns warnings about quantity, spiciness, oiliness, etc. that Chotu should mention.',
    parameters: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'Food item ID to get intelligence for',
        },
      },
      required: ['item_id'],
    },
  },
  {
    name: 'compare_with_competitors',
    description: 'Compare Mangwale pricing with Zomato/Swiggy. Use when user asks about pricing or value.',
    parameters: {
      type: 'object',
      properties: {
        item_total: {
          type: 'number',
          description: 'Total price of items in cart',
        },
        delivery_distance: {
          type: 'number',
          description: 'Delivery distance in km',
        },
        item_count: {
          type: 'number',
          description: 'Number of items in cart',
        },
      },
      required: ['item_total', 'delivery_distance'],
    },
  },
  {
    name: 'get_combined_rating',
    description: 'Get combined rating from Mangwale + Google reviews for a restaurant.',
    parameters: {
      type: 'object',
      properties: {
        store_id: {
          type: 'string',
          description: 'Store ID to get combined rating for',
        },
      },
      required: ['store_id'],
    },
  },
  {
    name: 'log_feedback',
    description: 'Log conversation feedback for self-learning when something goes wrong or user corrects the bot.',
    parameters: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Current session ID',
        },
        message: {
          type: 'string',
          description: 'User message that caused issue',
        },
        predicted_intent: {
          type: 'string',
          description: 'What we thought the intent was',
        },
        actual_intent: {
          type: 'string',
          description: 'What the intent actually was (if known)',
        },
        error_type: {
          type: 'string',
          description: 'Type of error: wrong_intent, missed_entity, bad_response',
        },
        user_feedback: {
          type: 'string',
          description: 'User feedback or correction',
        },
      },
      required: ['session_id', 'message', 'error_type'],
    },
  },
];

@Injectable()
export class EnhancedAgentToolsService {
  private readonly logger = new Logger(EnhancedAgentToolsService.name);

  constructor(
    private readonly googlePlacesService: GooglePlacesService,
    private readonly reviewIntelligenceService: ReviewIntelligenceService,
    private readonly valuePropositionService: ValuePropositionService,
    private readonly mistakeTrackerService: MistakeTrackerService,
  ) {}

  /**
   * Get all enhanced tool executors
   */
  getToolExecutors(): FunctionExecutor[] {
    return [
      {
        name: 'search_google_places',
        execute: this.searchGooglePlaces.bind(this),
      },
      {
        name: 'get_external_reviews',
        execute: this.getExternalReviews.bind(this),
      },
      {
        name: 'get_item_intelligence',
        execute: this.getItemIntelligence.bind(this),
      },
      {
        name: 'compare_with_competitors',
        execute: this.compareWithCompetitors.bind(this),
      },
      {
        name: 'get_combined_rating',
        execute: this.getCombinedRating.bind(this),
      },
      {
        name: 'log_feedback',
        execute: this.logFeedback.bind(this),
      },
    ];
  }

  /**
   * Search Google Places for restaurants
   */
  private async searchGooglePlaces(
    args: {
      query: string;
      lat?: number;
      lng?: number;
      radius?: number;
      min_rating?: number;
    },
    context: AgentContext
  ): Promise<any> {
    try {
      // Use context location if not provided
      const lat = args.lat || context.session?.location?.lat;
      const lng = args.lng || context.session?.location?.lon;

      if (!lat || !lng) {
        return {
          success: false,
          message: 'Location not available. Please share your location first.',
        };
      }

      const places = await this.googlePlacesService.searchNearby(
        args.query,
        lat,
        lng,
        {
          radius: args.radius || 5000,
          minRating: args.min_rating || 0,
        }
      );

      if (places.length === 0) {
        return {
          success: true,
          message: `No "${args.query}" found nearby on Google Maps.`,
          places: [],
        };
      }

      // Format results
      const formatted = places.slice(0, 5).map(p => ({
        name: p.name,
        address: p.vicinity || p.formatted_address,
        rating: p.rating,
        reviews: p.user_ratings_total,
        open_now: p.opening_hours?.open_now,
        price_level: '₹'.repeat(p.price_level || 2),
        google_place_id: p.place_id,
      }));

      return {
        success: true,
        message: `Found ${places.length} places for "${args.query}" on Google`,
        places: formatted,
        note: 'These are from Google Maps, not in our delivery network yet.',
      };
    } catch (error) {
      this.logger.error(`Google Places search failed: ${error.message}`);
      return {
        success: false,
        message: 'Google search is temporarily unavailable.',
      };
    }
  }

  /**
   * Get external reviews from Google
   */
  private async getExternalReviews(
    args: { store_id: string; include_analysis?: boolean },
    context: AgentContext
  ): Promise<any> {
    try {
      const combinedRating = await this.googlePlacesService.getCombinedRating(args.store_id);
      
      if (!combinedRating || !combinedRating.googleReviewCount) {
        return {
          success: true,
          message: 'No Google reviews available for this restaurant.',
          has_google: false,
        };
      }

      return {
        success: true,
        has_google: true,
        mangwale: {
          rating: combinedRating.mangwaleRating,
          reviews: combinedRating.mangwaleReviewCount,
        },
        google: {
          rating: combinedRating.googleRating,
          reviews: combinedRating.googleReviewCount,
        },
        combined: {
          rating: combinedRating.combinedRating.toFixed(1),
          total_reviews: combinedRating.combinedReviewCount,
        },
        message: `This restaurant has ${combinedRating.combinedRating.toFixed(1)}★ from ${combinedRating.combinedReviewCount} reviews (Mangwale: ${combinedRating.mangwaleRating}★, Google: ${combinedRating.googleRating}★)`,
      };
    } catch (error) {
      this.logger.error(`External reviews fetch failed: ${error.message}`);
      return {
        success: false,
        message: 'Could not fetch external reviews.',
      };
    }
  }

  /**
   * Get AI-analyzed item intelligence
   */
  private async getItemIntelligence(
    args: { item_id: string },
    context: AgentContext
  ): Promise<any> {
    try {
      const intelligence = await this.reviewIntelligenceService.getIntelligence(args.item_id);
      
      if (!intelligence || intelligence.totalReviewsAnalyzed === 0) {
        return {
          success: true,
          has_intelligence: false,
          message: 'No review analysis available for this item.',
        };
      }

      // Generate Chotu's warning if needed
      const warning = this.reviewIntelligenceService.generateChotuWarning(intelligence);

      return {
        success: true,
        has_intelligence: true,
        sentiment: intelligence.overallSentiment.label,
        reviews_analyzed: intelligence.totalReviewsAnalyzed,
        warnings: intelligence.warnings,
        chotu_warning: warning,
        top_praises: intelligence.topPraises.slice(0, 3),
        top_complaints: intelligence.topComplaints.slice(0, 3),
        aspects: {
          quantity: intelligence.aspects.quantity?.sentiment || 'unknown',
          taste: intelligence.aspects.taste?.sentiment || 'unknown',
          spiciness: intelligence.aspects.spiciness?.sentiment || 'unknown',
        },
      };
    } catch (error) {
      this.logger.error(`Item intelligence fetch failed: ${error.message}`);
      return {
        success: false,
        message: 'Could not fetch item analysis.',
      };
    }
  }

  /**
   * Compare pricing with competitors
   */
  private async compareWithCompetitors(
    args: {
      item_total: number;
      delivery_distance: number;
      item_count?: number;
    },
    context: AgentContext
  ): Promise<any> {
    try {
      const comparison = this.valuePropositionService.calculateValueProposition(
        args.item_total,
        args.delivery_distance,
        args.item_count || 1
      );

      return {
        success: true,
        our_total: comparison.ourPricing.total,
        competitor_estimate: comparison.competitorEstimate.total,
        savings: comparison.savings,
        savings_percent: comparison.savingsPercent.toFixed(0),
        reasons: comparison.reasons,
        message: comparison.displayMessage,
        breakdown: {
          our_delivery: comparison.ourPricing.deliveryFee,
          competitor_delivery: comparison.competitorEstimate.deliveryFee,
        },
      };
    } catch (error) {
      this.logger.error(`Value comparison failed: ${error.message}`);
      return {
        success: false,
        message: 'Could not calculate comparison.',
      };
    }
  }

  /**
   * Get combined Mangwale + Google rating
   */
  private async getCombinedRating(
    args: { store_id: string },
    context: AgentContext
  ): Promise<any> {
    return this.getExternalReviews({ store_id: args.store_id }, context);
  }

  /**
   * Log feedback for self-learning
   */
  private async logFeedback(
    args: {
      session_id: string;
      message: string;
      predicted_intent?: string;
      actual_intent?: string;
      error_type: string;
      user_feedback?: string;
    },
    context: AgentContext
  ): Promise<any> {
    try {
      await this.mistakeTrackerService.logMistake({
        messageId: `agent_${Date.now()}`,
        sessionId: args.session_id,
        userMessage: args.message,
        predictedIntent: args.predicted_intent || 'unknown',
        actualIntent: args.actual_intent,
        confidence: 0,
        mistakeType: args.error_type as MistakeType,
        userFeedback: args.user_feedback,
      });

      return {
        success: true,
        message: 'Feedback logged for learning. Thank you!',
      };
    } catch (error) {
      this.logger.error(`Feedback logging failed: ${error.message}`);
      return {
        success: false,
        message: 'Could not log feedback.',
      };
    }
  }
}
