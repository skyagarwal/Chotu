/**
 * Review Intelligence Service
 * 
 * Uses Google Cloud Natural Language API to analyze reviews and extract:
 * - Sentiment (positive/negative/neutral)
 * - Aspects/Entities (quantity, taste, delivery, spiciness, etc.)
 * - Key phrases and complaints
 * 
 * Data flows:
 * 1. PHP Backend (MySQL) → Raw reviews
 * 2. This Service → Analyzes with Google NL API
 * 3. PostgreSQL → Stores aggregated intelligence
 * 4. OpenSearch → Enriches item search with review data
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PhpReviewService, Review } from '../../php-integration/services/php-review.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// Google Cloud NL API types
interface SentimentResult {
  score: number;      // -1 to 1
  magnitude: number;  // 0 to infinity (intensity)
}

interface EntityMention {
  text: string;
  type: string;       // 'COMMON', 'PROPER', etc.
  sentiment: SentimentResult;
}

interface AspectSentiment {
  aspect: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  mentionCount: number;
  samplePhrases: string[];
}

export interface ReviewIntelligence {
  itemId: string;
  storeId: string;
  
  // Overall sentiment
  overallSentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral' | 'mixed';
    magnitude: number;
  };
  
  // Aspect-based analysis (what people say about specific things)
  aspects: {
    quantity: AspectSentiment | null;
    taste: AspectSentiment | null;
    spiciness: AspectSentiment | null;
    freshness: AspectSentiment | null;
    packaging: AspectSentiment | null;
    delivery: AspectSentiment | null;
    value: AspectSentiment | null;
    portion: AspectSentiment | null;
  };
  
  // Key extracted insights
  topPraises: string[];      // ["Fresh taste", "Good quantity"]
  topComplaints: string[];   // ["Too oily", "Less quantity"]
  
  // Warning flags for Chotu to mention
  warnings: {
    quantityIssue: boolean;   // Many say "kam quantity"
    spicyWarning: boolean;    // Many say "bahut teekha"
    oilyWarning: boolean;     // Many say "oily/greasy"
    lateDelivery: boolean;    // Delivery complaints
  };
  
  // Statistics
  totalReviewsAnalyzed: number;
  lastAnalyzedAt: Date;
}

// Aspect keywords for Hindi/English/Hinglish
const ASPECT_KEYWORDS = {
  quantity: {
    keywords: [
      'quantity', 'portion', 'size', 'amount', 'serving',
      'quantity', 'matra', 'kam', 'zyada', 'bahut kam', 'thoda',
      'portion size', 'less', 'more', 'enough', 'sufficient',
    ],
    positive: ['enough', 'sufficient', 'zyada', 'bahut', 'good portion', 'large'],
    negative: ['kam', 'less', 'small', 'thoda', 'insufficient', 'not enough', 'chhota'],
  },
  taste: {
    keywords: [
      'taste', 'flavor', 'swad', 'swaad', 'delicious', 'tasty',
      'yummy', 'maza', 'achha', 'bura', 'badhiya', 'zabardast',
    ],
    positive: ['delicious', 'tasty', 'yummy', 'achha', 'badhiya', 'zabardast', 'mast', 'great taste'],
    negative: ['tasteless', 'bad taste', 'bekaar', 'ganda', 'not good', 'bland'],
  },
  spiciness: {
    keywords: [
      'spicy', 'spice', 'teekha', 'mirchi', 'hot', 'mild',
      'tikha', 'jal', 'burning', 'chilli',
    ],
    positive: ['perfect spice', 'mild', 'not too spicy', 'balanced'],
    negative: ['too spicy', 'bahut teekha', 'very hot', 'burning', 'mirchi zyada', 'jal gaya'],
  },
  freshness: {
    keywords: [
      'fresh', 'taza', 'taaza', 'stale', 'old', 'baasi',
      'warm', 'hot', 'cold', 'thanda', 'garam',
    ],
    positive: ['fresh', 'taza', 'hot', 'garam', 'warm'],
    negative: ['stale', 'baasi', 'cold', 'thanda', 'not fresh', 'old'],
  },
  packaging: {
    keywords: [
      'packaging', 'packing', 'container', 'box', 'spill',
      'leak', 'damaged', 'wrap', 'sealed',
    ],
    positive: ['good packaging', 'well packed', 'sealed', 'no spill'],
    negative: ['spill', 'leak', 'damaged', 'poor packaging', 'gir gaya', 'kharab'],
  },
  delivery: {
    keywords: [
      'delivery', 'late', 'fast', 'quick', 'slow', 'time',
      'der', 'jaldi', 'late aaya', 'on time',
    ],
    positive: ['fast', 'quick', 'on time', 'jaldi', 'early'],
    negative: ['late', 'slow', 'der', 'delayed', 'took long', 'bahut der'],
  },
  value: {
    keywords: [
      'price', 'value', 'worth', 'expensive', 'cheap', 'cost',
      'paisa wasool', 'mehenga', 'sasta', 'affordable', 'overpriced',
    ],
    positive: ['paisa wasool', 'worth it', 'good value', 'sasta', 'affordable', 'reasonable'],
    negative: ['expensive', 'mehenga', 'overpriced', 'not worth', 'too costly'],
  },
  portion: {
    keywords: [
      'oily', 'greasy', 'oil', 'tel', 'ghee', 'fat',
      'healthy', 'light', 'heavy', 'bharahari',
    ],
    positive: ['light', 'healthy', 'not oily', 'kam tel'],
    negative: ['oily', 'greasy', 'too much oil', 'tel zyada', 'heavy', 'bharahari'],
  },
};

@Injectable()
export class ReviewIntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(ReviewIntelligenceService.name);
  private googleNLClient: any = null;
  private useGoogleAPI: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly phpReviewService: PhpReviewService,
  ) {}

  async onModuleInit() {
    await this.initializeGoogleNLClient();
  }

  /**
   * Initialize Google Cloud Natural Language client
   * Falls back to local analysis if API not configured
   */
  private async initializeGoogleNLClient() {
    const googleCredentials = this.configService.get('GOOGLE_APPLICATION_CREDENTIALS');
    const googleProjectId = this.configService.get('GOOGLE_CLOUD_PROJECT_ID');

    if (googleCredentials && googleProjectId) {
      try {
        // Dynamic import to avoid errors if package not installed
        // @ts-ignore - Package may not be installed
        const { LanguageServiceClient } = await import('@google-cloud/language');
        this.googleNLClient = new LanguageServiceClient();
        this.useGoogleAPI = true;
        this.logger.log('✅ Google Cloud Natural Language API initialized');
      } catch (error) {
        this.logger.warn('Google NL API package not installed, using local analysis');
        this.useGoogleAPI = false;
      }
    } else {
      this.logger.log('Google NL API not configured, using local keyword-based analysis');
      this.useGoogleAPI = false;
    }
  }

  /**
   * Analyze a single review text
   */
  async analyzeReviewText(text: string): Promise<{
    sentiment: SentimentResult;
    entities: EntityMention[];
    aspects: Record<string, AspectSentiment>;
  }> {
    if (this.useGoogleAPI && this.googleNLClient) {
      return this.analyzeWithGoogleAPI(text);
    }
    return this.analyzeLocally(text);
  }

  /**
   * Google Cloud NL API analysis
   */
  private async analyzeWithGoogleAPI(text: string): Promise<{
    sentiment: SentimentResult;
    entities: EntityMention[];
    aspects: Record<string, AspectSentiment>;
  }> {
    try {
      const document = {
        content: text,
        type: 'PLAIN_TEXT' as const,
        language: 'hi', // Hindi (handles Hinglish well)
      };

      // Get sentiment
      const [sentimentResult] = await this.googleNLClient.analyzeSentiment({ document });
      const sentiment: SentimentResult = {
        score: sentimentResult.documentSentiment?.score || 0,
        magnitude: sentimentResult.documentSentiment?.magnitude || 0,
      };

      // Get entities with sentiment
      const [entityResult] = await this.googleNLClient.analyzeEntitySentiment({ document });
      const entities: EntityMention[] = (entityResult.entities || []).map((e: any) => ({
        text: e.name,
        type: e.type,
        sentiment: {
          score: e.sentiment?.score || 0,
          magnitude: e.sentiment?.magnitude || 0,
        },
      }));

      // Map entities to our aspects
      const aspects = this.mapEntitiesToAspects(text, entities);

      return { sentiment, entities, aspects };
    } catch (error) {
      this.logger.error(`Google API error: ${error.message}, falling back to local`);
      return this.analyzeLocally(text);
    }
  }

  /**
   * Local keyword-based analysis (fallback)
   * Works well for Hindi/Hinglish without API costs
   */
  private async analyzeLocally(text: string): Promise<{
    sentiment: SentimentResult;
    entities: EntityMention[];
    aspects: Record<string, AspectSentiment>;
  }> {
    const lowerText = text.toLowerCase();
    const entities: EntityMention[] = [];
    const aspects: Record<string, AspectSentiment> = {};

    // Positive and negative word lists
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'best', 'love', 'loved', 'perfect',
      'achha', 'acha', 'badhiya', 'zabardast', 'mast', 'kamaal', 'shandar', 
      'tasty', 'delicious', 'yummy', 'fresh', 'fast', 'quick', 'worth',
      'bahut achha', 'ekdum', 'superb', 'awesome', 'nice', 'recommend',
    ];

    const negativeWords = [
      'bad', 'worst', 'terrible', 'poor', 'hate', 'disappointed', 'waste',
      'bura', 'bekaar', 'ganda', 'kharab', 'bekar', 'bakwas',
      'late', 'cold', 'stale', 'oily', 'expensive', 'small', 'less',
      'kam', 'thanda', 'baasi', 'mehenga', 'der', 'slow',
      'not good', 'not worth', 'avoid', 'never', 'pathetic',
    ];

    // Calculate overall sentiment
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (lowerText.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (lowerText.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount || 1;
    const sentimentScore = (positiveCount - negativeCount) / total;

    const sentiment: SentimentResult = {
      score: Math.max(-1, Math.min(1, sentimentScore)),
      magnitude: (positiveCount + negativeCount) * 0.1,
    };

    // Analyze each aspect
    for (const [aspectName, config] of Object.entries(ASPECT_KEYWORDS)) {
      const found = config.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
      
      if (found) {
        const positive = config.positive.some(p => lowerText.includes(p.toLowerCase()));
        const negative = config.negative.some(n => lowerText.includes(n.toLowerCase()));

        let aspectScore = 0;
        let label: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';

        if (positive && negative) {
          label = 'mixed';
          aspectScore = 0;
        } else if (positive) {
          label = 'positive';
          aspectScore = 0.7;
        } else if (negative) {
          label = 'negative';
          aspectScore = -0.7;
        }

        aspects[aspectName] = {
          aspect: aspectName,
          sentiment: label,
          score: aspectScore,
          mentionCount: 1,
          samplePhrases: [text.substring(0, 100)],
        };
      }
    }

    return { sentiment, entities, aspects };
  }

  /**
   * Map Google entities to our predefined aspects
   */
  private mapEntitiesToAspects(
    text: string,
    entities: EntityMention[],
  ): Record<string, AspectSentiment> {
    const aspects: Record<string, AspectSentiment> = {};
    const lowerText = text.toLowerCase();

    for (const [aspectName, config] of Object.entries(ASPECT_KEYWORDS)) {
      const found = config.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
      
      if (found) {
        // Find matching entity sentiment
        const matchingEntity = entities.find(e => 
          config.keywords.some(kw => e.text.toLowerCase().includes(kw.toLowerCase()))
        );

        const positive = config.positive.some(p => lowerText.includes(p.toLowerCase()));
        const negative = config.negative.some(n => lowerText.includes(n.toLowerCase()));

        let label: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
        let score = matchingEntity?.sentiment.score || 0;

        if (positive && negative) label = 'mixed';
        else if (positive || score > 0.2) label = 'positive';
        else if (negative || score < -0.2) label = 'negative';

        aspects[aspectName] = {
          aspect: aspectName,
          sentiment: label,
          score,
          mentionCount: 1,
          samplePhrases: [],
        };
      }
    }

    return aspects;
  }

  /**
   * Analyze all reviews for an item and aggregate intelligence
   */
  async analyzeItemReviews(itemId: string, storeId: string): Promise<ReviewIntelligence> {
    this.logger.log(`Analyzing reviews for item ${itemId}`);

    // Fetch reviews from PHP backend
    const reviewsResult = await this.phpReviewService.getItemReviews(parseInt(itemId), 100, 1);
    
    if (!reviewsResult.success || !reviewsResult.reviews?.length) {
      return this.getEmptyIntelligence(itemId, storeId);
    }

    const reviews = reviewsResult.reviews;
    const aggregatedAspects: Record<string, AspectSentiment> = {};
    let totalSentiment = 0;
    let totalMagnitude = 0;
    const allPraises: string[] = [];
    const allComplaints: string[] = [];

    // Analyze each review
    for (const review of reviews) {
      if (!review.comment) continue;

      const analysis = await this.analyzeReviewText(review.comment);
      
      totalSentiment += analysis.sentiment.score;
      totalMagnitude += analysis.sentiment.magnitude;

      // Aggregate aspects
      for (const [aspectName, aspectData] of Object.entries(analysis.aspects)) {
        if (!aggregatedAspects[aspectName]) {
          aggregatedAspects[aspectName] = {
            ...aspectData,
            mentionCount: 0,
            samplePhrases: [],
          };
        }
        
        aggregatedAspects[aspectName].mentionCount++;
        aggregatedAspects[aspectName].score = 
          (aggregatedAspects[aspectName].score + aspectData.score) / 2;
        
        if (aspectData.samplePhrases?.[0]) {
          aggregatedAspects[aspectName].samplePhrases.push(aspectData.samplePhrases[0]);
        }

        // Collect praises and complaints
        if (aspectData.sentiment === 'positive') {
          allPraises.push(`${aspectName}: ${review.comment.substring(0, 50)}`);
        } else if (aspectData.sentiment === 'negative') {
          allComplaints.push(`${aspectName}: ${review.comment.substring(0, 50)}`);
        }
      }
    }

    // Calculate averages
    const avgSentiment = totalSentiment / reviews.length;
    
    // Determine overall label
    let overallLabel: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
    if (avgSentiment > 0.2) overallLabel = 'positive';
    else if (avgSentiment < -0.2) overallLabel = 'negative';
    else if (Math.abs(avgSentiment) < 0.1 && totalMagnitude > 1) overallLabel = 'mixed';

    // Determine warnings
    const warnings = {
      quantityIssue: aggregatedAspects.quantity?.sentiment === 'negative' && 
                     aggregatedAspects.quantity?.mentionCount >= 3,
      spicyWarning: aggregatedAspects.spiciness?.sentiment === 'negative' &&
                    aggregatedAspects.spiciness?.mentionCount >= 2,
      oilyWarning: aggregatedAspects.portion?.sentiment === 'negative' &&
                   aggregatedAspects.portion?.mentionCount >= 2,
      lateDelivery: aggregatedAspects.delivery?.sentiment === 'negative' &&
                    aggregatedAspects.delivery?.mentionCount >= 3,
    };

    return {
      itemId,
      storeId,
      overallSentiment: {
        score: avgSentiment,
        label: overallLabel,
        magnitude: totalMagnitude / reviews.length,
      },
      aspects: {
        quantity: aggregatedAspects.quantity || null,
        taste: aggregatedAspects.taste || null,
        spiciness: aggregatedAspects.spiciness || null,
        freshness: aggregatedAspects.freshness || null,
        packaging: aggregatedAspects.packaging || null,
        delivery: aggregatedAspects.delivery || null,
        value: aggregatedAspects.value || null,
        portion: aggregatedAspects.portion || null,
      },
      topPraises: [...new Set(allPraises)].slice(0, 5),
      topComplaints: [...new Set(allComplaints)].slice(0, 5),
      warnings,
      totalReviewsAnalyzed: reviews.length,
      lastAnalyzedAt: new Date(),
    };
  }

  /**
   * Store intelligence in PostgreSQL
   */
  async storeIntelligence(intelligence: ReviewIntelligence): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO item_review_intelligence (
          item_id, store_id, overall_sentiment, aspects,
          top_praises, top_complaints, warnings,
          total_reviews_analyzed, last_analyzed_at
        ) VALUES (
          ${intelligence.itemId},
          ${intelligence.storeId},
          ${JSON.stringify(intelligence.overallSentiment)}::jsonb,
          ${JSON.stringify(intelligence.aspects)}::jsonb,
          ${intelligence.topPraises}::text[],
          ${intelligence.topComplaints}::text[],
          ${JSON.stringify(intelligence.warnings)}::jsonb,
          ${intelligence.totalReviewsAnalyzed},
          ${intelligence.lastAnalyzedAt}
        )
        ON CONFLICT (item_id) DO UPDATE SET
          overall_sentiment = EXCLUDED.overall_sentiment,
          aspects = EXCLUDED.aspects,
          top_praises = EXCLUDED.top_praises,
          top_complaints = EXCLUDED.top_complaints,
          warnings = EXCLUDED.warnings,
          total_reviews_analyzed = EXCLUDED.total_reviews_analyzed,
          last_analyzed_at = EXCLUDED.last_analyzed_at
      `;
      
      this.logger.log(`Stored intelligence for item ${intelligence.itemId}`);
    } catch (error) {
      this.logger.error(`Failed to store intelligence: ${error.message}`);
    }
  }

  /**
   * Get stored intelligence for an item
   */
  async getIntelligence(itemId: string): Promise<ReviewIntelligence | null> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM item_review_intelligence WHERE item_id = ${itemId}
      `;

      if (result.length === 0) return null;

      const row = result[0];
      return {
        itemId: row.item_id,
        storeId: row.store_id,
        overallSentiment: row.overall_sentiment,
        aspects: row.aspects,
        topPraises: row.top_praises || [],
        topComplaints: row.top_complaints || [],
        warnings: row.warnings || {},
        totalReviewsAnalyzed: row.total_reviews_analyzed,
        lastAnalyzedAt: row.last_analyzed_at,
      };
    } catch (error) {
      this.logger.error(`Failed to get intelligence: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate Chotu's warning message based on intelligence
   */
  generateChotuWarning(intelligence: ReviewIntelligence): string | null {
    const warnings: string[] = [];

    if (intelligence.warnings.quantityIssue) {
      warnings.push('Sahab, kuch log bolte hain quantity thodi kam hai 😅');
    }
    if (intelligence.warnings.spicyWarning) {
      warnings.push('Yeh dish thodi teekhi hai, mirchi kam karwa sakte ho! 🌶️');
    }
    if (intelligence.warnings.oilyWarning) {
      warnings.push('Kuch customers ne bola oily hai, dekhlo aapko chalega? 🛢️');
    }

    return warnings.length > 0 ? warnings[0] : null; // Return first warning
  }

  /**
   * Cron job: Sync and analyze reviews daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async syncAndAnalyzeReviews() {
    this.logger.log('Starting daily review analysis...');
    
    try {
      // Get items that need analysis (from recent orders or popular items)
      // This would be enhanced to get actual item list from orders
      const itemsToAnalyze = await this.getItemsNeedingAnalysis();
      
      for (const item of itemsToAnalyze) {
        try {
          const intelligence = await this.analyzeItemReviews(item.itemId, item.storeId);
          await this.storeIntelligence(intelligence);
          
          // Rate limit to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          this.logger.error(`Failed to analyze item ${item.itemId}: ${error.message}`);
        }
      }
      
      this.logger.log(`Completed analysis of ${itemsToAnalyze.length} items`);
    } catch (error) {
      this.logger.error(`Daily review sync failed: ${error.message}`);
    }
  }

  /**
   * Get list of items that need review analysis
   */
  private async getItemsNeedingAnalysis(): Promise<Array<{ itemId: string; storeId: string }>> {
    // Get items from recent orders or popular items
    // For now, return empty - would be connected to order history
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT DISTINCT item_id, store_id 
        FROM item_review_intelligence 
        WHERE last_analyzed_at < NOW() - INTERVAL '7 days'
        LIMIT 100
      `;
      return result.map(r => ({ itemId: r.item_id, storeId: r.store_id }));
    } catch {
      return [];
    }
  }

  private getEmptyIntelligence(itemId: string, storeId: string): ReviewIntelligence {
    return {
      itemId,
      storeId,
      overallSentiment: { score: 0, label: 'neutral', magnitude: 0 },
      aspects: {
        quantity: null,
        taste: null,
        spiciness: null,
        freshness: null,
        packaging: null,
        delivery: null,
        value: null,
        portion: null,
      },
      topPraises: [],
      topComplaints: [],
      warnings: {
        quantityIssue: false,
        spicyWarning: false,
        oilyWarning: false,
        lateDelivery: false,
      },
      totalReviewsAnalyzed: 0,
      lastAnalyzedAt: new Date(),
    };
  }
}
