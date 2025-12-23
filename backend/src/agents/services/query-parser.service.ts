import { Injectable, Logger } from '@nestjs/common';

export interface ParsedQuery {
  cleanQuery: string;  // Query with filters removed
  veg?: boolean;
  priceMin?: number;
  priceMax?: number;
  category?: string;
  rating?: number;
  targetModule?: string; // Target module (e.g., 'ecom', 'food')
}

/**
 * Query Parser Service
 * Extracts structured parameters from natural language queries
 * before passing to LLM, improving function calling accuracy
 */
@Injectable()
export class QueryParserService {
  private readonly logger = new Logger(QueryParserService.name);

  /**
   * Parse natural language query into structured parameters
   */
  parseQuery(query: string): ParsedQuery {
    const original = query;
    let cleanQuery = query.toLowerCase();
    const parsed: ParsedQuery = { cleanQuery: '' };

    // Extract module/store type hints (e.g., "local dukan", "grocery")
    // This helps route "milk in dukan" to e-commerce instead of food delivery
    const modulePatterns = [
      { pattern: /\b(local dukan|dukan|kirana|grocery|general store|supermarket|shop|store|ecom|ecommerce)\b/gi, value: 'ecom' },
      { pattern: /\b(restaurant|cafe|hotel|kitchen|dining)\b/gi, value: 'food' },
      { pattern: /\b(pharmacy|medical|chemist|medicine shop)\b/gi, value: 'pharmacy' },
    ];

    for (const { pattern, value } of modulePatterns) {
      if (pattern.test(cleanQuery)) {
        parsed.targetModule = value;
        // Remove the module hint from the query to improve search relevance
        // e.g. "milk in dukan" -> "milk"
        cleanQuery = cleanQuery.replace(pattern, '').trim();
        // Also remove "in", "from", "at" if they are left dangling
        cleanQuery = cleanQuery.replace(/\b(in|from|at)\s*$/i, '').trim();
      }
    }

    // Extract vegetarian preference
    const vegPatterns = [
      /\b(veg|vegetarian|veggie|pure veg|veg only)\b/gi,
    ];
    for (const pattern of vegPatterns) {
      if (pattern.test(cleanQuery)) {
        parsed.veg = true;
        cleanQuery = cleanQuery.replace(pattern, '').trim();
      }
    }

    // Check for non-veg explicitly
    const nonVegPatterns = [
      /\b(non[- ]?veg|nonveg|non vegetarian|meat|chicken|mutton|fish|egg)\b/gi,
    ];
    for (const pattern of nonVegPatterns) {
      if (pattern.test(cleanQuery)) {
        parsed.veg = false;
        break;
      }
    }

    // Extract price maximum (most common constraint)
    const priceMaxPatterns = [
      /(?:under|below|less than|within|max|maximum|upto|up to)\s*(?:rs\.?|₹|rupees?)?\s*(\d+)/gi,
    ];
    for (const pattern of priceMaxPatterns) {
      const match = pattern.exec(cleanQuery);
      if (match) {
        parsed.priceMax = parseInt(match[1]);
        cleanQuery = cleanQuery.replace(match[0], '').trim();
        break;
      }
    }

    // Extract price minimum
    const priceMinPatterns = [
      /(?:above|over|more than|minimum|min|at least|from)\s*(?:rs\.?|₹|rupees?)?\s*(\d+)/gi,
    ];
    for (const pattern of priceMinPatterns) {
      const match = pattern.exec(cleanQuery);
      if (match) {
        parsed.priceMin = parseInt(match[1]);
        cleanQuery = cleanQuery.replace(match[0], '').trim();
        break;
      }
    }

    // Extract price range
    const rangePatterns = [
      /(?:between|from)\s*(?:rs\.?|₹|rupees?)?\s*(\d+)\s*(?:to|and|-)\s*(?:rs\.?|₹|rupees?)?\s*(\d+)/gi,
    ];
    for (const pattern of rangePatterns) {
      const match = pattern.exec(cleanQuery);
      if (match) {
        parsed.priceMin = parseInt(match[1]);
        parsed.priceMax = parseInt(match[2]);
        cleanQuery = cleanQuery.replace(match[0], '').trim();
        break;
      }
    }

    // Extract rating
    const ratingPatterns = [
      /(?:rating|rated)\s*(?:above|over|at least)?\s*(\d+(?:\.\d+)?)\s*(?:stars?)?/gi,
    ];
    for (const pattern of ratingPatterns) {
      const match = pattern.exec(cleanQuery);
      if (match) {
        parsed.rating = parseFloat(match[1]);
        cleanQuery = cleanQuery.replace(match[0], '').trim();
        break;
      }
    }

    // Extract common categories/cuisines
    const categoryPatterns = [
      { pattern: /\b(chinese|indo[- ]?chinese)\b/gi, value: 'chinese' },
      { pattern: /\b(italian|pasta|pizza)\b/gi, value: 'italian' },
      { pattern: /\b(indian|desi|punjabi|south indian)\b/gi, value: 'indian' },
      { pattern: /\b(mexican|tacos|burrito)\b/gi, value: 'mexican' },
      { pattern: /\b(fast[- ]?food|burger|fries)\b/gi, value: 'fast-food' },
      { pattern: /\b(dessert|sweet|ice[- ]?cream|cake)\b/gi, value: 'dessert' },
    ];
    
    for (const { pattern, value } of categoryPatterns) {
      if (pattern.test(original)) {
        parsed.category = value;
        // If a cuisine is detected and no explicit module is set, default to food
        if (!parsed.targetModule) {
          parsed.targetModule = 'food';
        }
        // Don't remove category from query as it's part of the search intent
        break;
      }
    }

    // Clean up extra whitespace and common filler words
    cleanQuery = cleanQuery
      .replace(/\b(show me|find|search|get|give me|i want|looking for)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    parsed.cleanQuery = cleanQuery || original;

    // Log parsing results for debugging
    if (Object.keys(parsed).length > 1) {
      this.logger.debug(`Parsed query: "${original}" →`, parsed);
    }

    return parsed;
  }

  /**
   * Merge parsed parameters with LLM-extracted parameters
   * LLM parameters take precedence if both exist
   */
  mergeParameters(
    parsed: ParsedQuery,
    llmArgs: Record<string, any>,
  ): Record<string, any> {
    return {
      query: llmArgs.query || parsed.cleanQuery,
      veg: llmArgs.veg !== undefined ? llmArgs.veg : parsed.veg,
      price_min: llmArgs.price_min || parsed.priceMin,
      price_max: llmArgs.price_max || parsed.priceMax,
      category: llmArgs.category || parsed.category,
      rating: llmArgs.rating || parsed.rating,
      limit: llmArgs.limit,
    };
  }
}
