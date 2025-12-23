import { Injectable, Logger } from '@nestjs/common';

interface SearchResult {
  _id: string;
  _score?: number;
  _source: {
    name?: string;
    title?: string;
    description?: string;
    price?: number;
    mrp?: number;
    rating?: number;
    review_count?: number;
    category?: string;
    brand?: string;
    tags?: string[];
    is_veg?: boolean;
    dietary_type?: string;
    popularity_score?: number;
    freshness?: number;
    stock_status?: string;
    [key: string]: any;
  };
}

interface UserProfile {
  dietary_type?: string;
  allergies?: string[];
  favorite_cuisines?: string[];
  favorite_brands?: string[];
  price_sensitivity?: 'low' | 'medium' | 'high';
  preferred_categories?: string[];
}

interface SearchContext {
  previousSearches?: string[];
  clickedItems?: string[];
  cartItems?: string[];
  isRefinement?: boolean;
  refinementQuery?: string;
}

interface RerankerConfig {
  // Weight factors for scoring (0-1)
  relevanceWeight: number;      // Original search score
  personalizationWeight: number; // User preference match
  popularityWeight: number;      // Rating/review signals
  recencyWeight: number;         // How fresh the item is
  priceWeight: number;           // Price preference match
  contextWeight: number;         // Session context signals
}

const DEFAULT_CONFIG: RerankerConfig = {
  relevanceWeight: 0.4,
  personalizationWeight: 0.25,
  popularityWeight: 0.15,
  recencyWeight: 0.05,
  priceWeight: 0.1,
  contextWeight: 0.05,
};

@Injectable()
export class RerankerService {
  private readonly logger = new Logger(RerankerService.name);

  /**
   * Rerank search results using multiple signals
   */
  rerank(
    results: SearchResult[],
    userProfile?: UserProfile,
    searchContext?: SearchContext,
    config: Partial<RerankerConfig> = {},
  ): SearchResult[] {
    if (!results || results.length === 0) {
      return results;
    }

    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Calculate composite scores
    const scoredResults = results.map((result, index) => {
      const scores = this.calculateScores(result, index, results.length, userProfile, searchContext);
      const compositeScore = this.computeCompositeScore(scores, finalConfig);
      
      return {
        ...result,
        _rerankerScore: compositeScore,
        _scoreBreakdown: scores,
      };
    });

    // Sort by composite score
    scoredResults.sort((a, b) => b._rerankerScore - a._rerankerScore);

    this.logger.debug(`Reranked ${results.length} results with config: ${JSON.stringify(finalConfig)}`);

    return scoredResults;
  }

  /**
   * Calculate individual score components
   */
  private calculateScores(
    result: SearchResult,
    position: number,
    totalResults: number,
    userProfile?: UserProfile,
    searchContext?: SearchContext,
  ): Record<string, number> {
    return {
      relevance: this.normalizeRelevanceScore(result._score, position, totalResults),
      personalization: this.calculatePersonalizationScore(result, userProfile),
      popularity: this.calculatePopularityScore(result),
      recency: this.calculateRecencyScore(result),
      price: this.calculatePriceScore(result, userProfile),
      context: this.calculateContextScore(result, searchContext),
    };
  }

  /**
   * Normalize the original search relevance score (0-1)
   */
  private normalizeRelevanceScore(score: number | undefined, position: number, totalResults: number): number {
    if (score !== undefined && score > 0) {
      // Normalize to 0-1 range (assuming max score is around 10-20)
      return Math.min(score / 15, 1);
    }
    // Fall back to position-based score
    return 1 - (position / totalResults);
  }

  /**
   * Score based on user preference match (0-1)
   */
  private calculatePersonalizationScore(result: SearchResult, userProfile?: UserProfile): number {
    if (!userProfile) return 0.5; // Neutral score if no profile

    let score = 0.5;
    let factors = 0;

    const source = result._source;

    // Dietary match (high importance)
    if (userProfile.dietary_type && source.is_veg !== undefined) {
      factors++;
      if (userProfile.dietary_type === 'vegetarian' && source.is_veg) {
        score += 0.3;
      } else if (userProfile.dietary_type === 'non-vegetarian') {
        score += 0.2; // Non-veg users can eat anything
      } else if (userProfile.dietary_type === 'vegan' && source.dietary_type === 'vegan') {
        score += 0.3;
      }
    }

    // Category preference match
    if (userProfile.preferred_categories?.length && source.category) {
      factors++;
      const categoryLower = source.category.toLowerCase();
      if (userProfile.preferred_categories.some(cat => categoryLower.includes(cat.toLowerCase()))) {
        score += 0.2;
      }
    }

    // Cuisine preference match
    if (userProfile.favorite_cuisines?.length && source.tags) {
      factors++;
      const hasCuisineMatch = userProfile.favorite_cuisines.some(cuisine => 
        source.tags?.some(tag => tag.toLowerCase().includes(cuisine.toLowerCase()))
      );
      if (hasCuisineMatch) {
        score += 0.2;
      }
    }

    // Brand preference match
    if (userProfile.favorite_brands?.length && source.brand) {
      factors++;
      if (userProfile.favorite_brands.some(brand => 
        source.brand?.toLowerCase().includes(brand.toLowerCase())
      )) {
        score += 0.15;
      }
    }

    // Allergy penalty (important - negative score)
    if (userProfile.allergies?.length && source.tags) {
      factors++;
      const hasAllergen = userProfile.allergies.some(allergen =>
        source.tags?.some(tag => tag.toLowerCase().includes(allergen.toLowerCase())) ||
        source.name?.toLowerCase().includes(allergen.toLowerCase()) ||
        source.description?.toLowerCase().includes(allergen.toLowerCase())
      );
      if (hasAllergen) {
        score -= 0.5; // Heavy penalty for allergen matches
      }
    }

    // Normalize score to 0-1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score based on popularity signals (0-1)
   */
  private calculatePopularityScore(result: SearchResult): number {
    const source = result._source;
    let score = 0.5;

    // Rating contribution (0-5 stars)
    if (source.rating !== undefined) {
      score = source.rating / 5;
    }

    // Boost if many reviews
    if (source.review_count !== undefined) {
      const reviewBoost = Math.min(source.review_count / 100, 0.2); // Max 0.2 boost
      score += reviewBoost;
    }

    // Use popularity_score if available
    if (source.popularity_score !== undefined) {
      score = (score + source.popularity_score) / 2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score based on freshness/recency (0-1)
   */
  private calculateRecencyScore(result: SearchResult): number {
    const source = result._source;

    // If freshness is directly available
    if (source.freshness !== undefined) {
      return source.freshness;
    }

    // For food items, in-stock items get higher score
    if (source.stock_status) {
      if (source.stock_status === 'in_stock') return 0.9;
      if (source.stock_status === 'low_stock') return 0.6;
      if (source.stock_status === 'out_of_stock') return 0.1;
    }

    return 0.5; // Neutral default
  }

  /**
   * Score based on price match with user preference (0-1)
   */
  private calculatePriceScore(result: SearchResult, userProfile?: UserProfile): number {
    const source = result._source;
    
    if (source.price === undefined) return 0.5;

    // Calculate discount if MRP available
    let discountScore = 0.5;
    if (source.mrp && source.mrp > source.price) {
      const discountPercent = ((source.mrp - source.price) / source.mrp) * 100;
      discountScore = Math.min(discountPercent / 50, 1); // 50% discount = max score
    }

    // Adjust based on price sensitivity
    if (!userProfile?.price_sensitivity) {
      return discountScore;
    }

    const price = source.price;
    
    switch (userProfile.price_sensitivity) {
      case 'high':
        // Budget conscious - favor cheaper items and bigger discounts
        if (price < 100) return Math.min(0.8 + discountScore * 0.2, 1);
        if (price < 300) return Math.min(0.6 + discountScore * 0.2, 1);
        if (price < 500) return Math.min(0.4 + discountScore * 0.2, 1);
        return Math.min(0.2 + discountScore * 0.3, 1);
        
      case 'medium':
        // Balance price and quality - moderate preference
        return Math.min(0.5 + discountScore * 0.3, 1);
        
      case 'low':
        // Price insensitive - slight preference for premium
        if (price > 500) return Math.min(0.7 + discountScore * 0.1, 1);
        return Math.min(0.5 + discountScore * 0.2, 1);
        
      default:
        return discountScore;
    }
  }

  /**
   * Score based on session context (0-1)
   */
  private calculateContextScore(result: SearchResult, searchContext?: SearchContext): number {
    if (!searchContext) return 0.5;

    let score = 0.5;
    const source = result._source;
    const itemId = result._id;

    // Boost previously clicked items
    if (searchContext.clickedItems?.includes(itemId)) {
      score += 0.2;
    }

    // Items in cart might need complementary items
    if (searchContext.cartItems?.length) {
      // Could implement complementary product logic here
      // For now, just slightly boost different categories
      score += 0.1;
    }

    // For refinement searches, maintain some consistency
    if (searchContext.isRefinement) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Compute final composite score from individual scores
   */
  private computeCompositeScore(
    scores: Record<string, number>,
    config: RerankerConfig,
  ): number {
    return (
      scores.relevance * config.relevanceWeight +
      scores.personalization * config.personalizationWeight +
      scores.popularity * config.popularityWeight +
      scores.recency * config.recencyWeight +
      scores.price * config.priceWeight +
      scores.context * config.contextWeight
    );
  }

  /**
   * Get reranking explanation for debugging
   */
  explainReranking(result: any): string {
    if (!result._scoreBreakdown) {
      return 'No reranking applied';
    }

    const breakdown = result._scoreBreakdown;
    return `Score: ${result._rerankerScore.toFixed(3)} | ` +
      `Relevance: ${breakdown.relevance.toFixed(2)} | ` +
      `Personal: ${breakdown.personalization.toFixed(2)} | ` +
      `Popular: ${breakdown.popularity.toFixed(2)} | ` +
      `Price: ${breakdown.price.toFixed(2)}`;
  }
}
