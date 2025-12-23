import { Injectable, Logger } from '@nestjs/common';
import { PhpReviewService } from '../../php-integration/services/php-review.service';

/**
 * Review Service - Layer 2 (Business Logic)
 * Channel-agnostic business rules for reviews and ratings
 * Can be used by WhatsApp, Telegram, Web, Mobile, etc.
 */

export interface ReviewDisplay {
  id: number;
  customer_name: string;
  rating: number;
  rating_stars: string;
  comment: string;
  date: string;
  formatted_message: string;
}

export interface RatingDisplay {
  average: number;
  average_stars: string;
  total_reviews: number;
  distribution: {
    stars: number;
    count: number;
    percentage: number;
    bar: string;
  }[];
  formatted_message: string;
}

export interface ReviewSubmission {
  success: boolean;
  review_id?: number;
  message: string;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  // Business Rules
  private readonly MIN_RATING = 1;
  private readonly MAX_RATING = 5;
  private readonly MIN_COMMENT_LENGTH = 3;
  private readonly MAX_COMMENT_LENGTH = 500;

  constructor(private readonly phpReviewService: PhpReviewService) {}

  /**
   * Get item reviews with formatting
   */
  async getItemReviews(
    itemId: number,
    limit: number = 5,
  ): Promise<{
    success: boolean;
    reviews: ReviewDisplay[];
    message: string;
  }> {
    try {
      const result = await this.phpReviewService.getItemReviews(itemId, limit);

      if (!result.success || !result.reviews || result.reviews.length === 0) {
        return {
          success: false,
          reviews: [],
          message: '📝 No reviews yet. Be the first to review this item!',
        };
      }

      const reviews = result.reviews.map(review => this.formatReview(review));

      return {
        success: true,
        reviews,
        message: this.formatReviewList(reviews, 'item'),
      };
    } catch (error) {
      this.logger.error(`Error getting item reviews: ${error.message}`);
      return {
        success: false,
        reviews: [],
        message: '❌ Error fetching reviews.',
      };
    }
  }

  /**
   * Get item rating summary with formatting
   */
  async getItemRating(itemId: number): Promise<{
    success: boolean;
    rating?: RatingDisplay;
    message: string;
  }> {
    try {
      const result = await this.phpReviewService.getItemRating(itemId);

      if (!result.success || !result.rating) {
        return {
          success: false,
          message: '⭐ No ratings yet.',
        };
      }

      const rating = this.formatRating(result.rating);

      return {
        success: true,
        rating,
        message: rating.formatted_message,
      };
    } catch (error) {
      this.logger.error(`Error getting item rating: ${error.message}`);
      return {
        success: false,
        message: '❌ Error fetching rating.',
      };
    }
  }

  /**
   * Submit item review with validation
   */
  async submitItemReview(
    token: string,
    itemId: number,
    orderId: number,
    rating: number | string,
    comment: string,
  ): Promise<ReviewSubmission> {
    try {
      // Validate rating
      const validatedRating = this.validateRating(rating);
      if (!validatedRating.valid) {
        return {
          success: false,
          message: validatedRating.message,
        };
      }

      // Validate comment
      const validatedComment = this.validateComment(comment);
      if (!validatedComment.valid) {
        return {
          success: false,
          message: validatedComment.message,
        };
      }

      // Submit review
      const result = await this.phpReviewService.submitItemReview(
        token,
        itemId,
        orderId,
        validatedRating.rating,
        validatedComment.comment,
      );

      if (!result.success) {
        return {
          success: false,
          message: result.message || '❌ Failed to submit review.',
        };
      }

      return {
        success: true,
        review_id: result.review_id,
        message: this.formatSubmitSuccess('item', validatedRating.rating),
      };
    } catch (error) {
      this.logger.error(`Error submitting item review: ${error.message}`);
      return {
        success: false,
        message: '❌ Error submitting review. Please try again.',
      };
    }
  }

  /**
   * Get delivery man reviews with formatting
   */
  async getDeliveryManReviews(deliveryManId: number): Promise<{
    success: boolean;
    reviews: ReviewDisplay[];
    message: string;
  }> {
    try {
      const result = await this.phpReviewService.getDeliveryManReviews(deliveryManId);

      if (!result.success || !result.reviews || result.reviews.length === 0) {
        return {
          success: false,
          reviews: [],
          message: '📝 No reviews yet for this delivery person.',
        };
      }

      const reviews = result.reviews.map(review => this.formatReview(review));

      return {
        success: true,
        reviews,
        message: this.formatReviewList(reviews, 'delivery'),
      };
    } catch (error) {
      this.logger.error(`Error getting delivery man reviews: ${error.message}`);
      return {
        success: false,
        reviews: [],
        message: '❌ Error fetching reviews.',
      };
    }
  }

  /**
   * Get delivery man rating summary
   */
  async getDeliveryManRating(deliveryManId: number): Promise<{
    success: boolean;
    rating?: RatingDisplay;
    message: string;
  }> {
    try {
      const result = await this.phpReviewService.getDeliveryManRating(deliveryManId);

      if (!result.success || !result.rating) {
        return {
          success: false,
          message: '⭐ No ratings yet.',
        };
      }

      const rating = this.formatRating(result.rating);

      return {
        success: true,
        rating,
        message: rating.formatted_message,
      };
    } catch (error) {
      this.logger.error(`Error getting delivery man rating: ${error.message}`);
      return {
        success: false,
        message: '❌ Error fetching rating.',
      };
    }
  }

  /**
   * Submit delivery man review with validation
   */
  async submitDeliveryManReview(
    token: string,
    deliveryManId: number,
    orderId: number,
    rating: number | string,
    comment: string,
  ): Promise<ReviewSubmission> {
    try {
      // Validate rating
      const validatedRating = this.validateRating(rating);
      if (!validatedRating.valid) {
        return {
          success: false,
          message: validatedRating.message,
        };
      }

      // Validate comment
      const validatedComment = this.validateComment(comment);
      if (!validatedComment.valid) {
        return {
          success: false,
          message: validatedComment.message,
        };
      }

      // Submit review
      const result = await this.phpReviewService.submitDeliveryManReview(
        token,
        deliveryManId,
        orderId,
        validatedRating.rating,
        validatedComment.comment,
      );

      if (!result.success) {
        return {
          success: false,
          message: result.message || '❌ Failed to submit review.',
        };
      }

      return {
        success: true,
        review_id: result.review_id,
        message: this.formatSubmitSuccess('delivery', validatedRating.rating),
      };
    } catch (error) {
      this.logger.error(`Error submitting delivery man review: ${error.message}`);
      return {
        success: false,
        message: '❌ Error submitting review. Please try again.',
      };
    }
  }

  /**
   * Parse rating from various input formats
   */
  parseRatingInput(input: string): number | null {
    // Handle star emojis
    const starCount = (input.match(/⭐/g) || []).length;
    if (starCount > 0) return starCount;

    // Handle numeric input
    const numMatch = input.match(/(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      if (num >= this.MIN_RATING && num <= this.MAX_RATING) {
        return num;
      }
    }

    // Handle text input
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('excellent') || lowerInput.includes('amazing')) return 5;
    if (lowerInput.includes('good') || lowerInput.includes('great')) return 4;
    if (lowerInput.includes('okay') || lowerInput.includes('average')) return 3;
    if (lowerInput.includes('poor') || lowerInput.includes('bad')) return 2;
    if (lowerInput.includes('terrible') || lowerInput.includes('awful')) return 1;

    return null;
  }

  /**
   * Generate review prompt message
   */
  generateReviewPrompt(type: 'item' | 'delivery', itemName?: string): string {
    let message = `⭐ *Rate Your ${type === 'item' ? 'Order' : 'Delivery Experience'}*\n\n`;
    
    if (type === 'item' && itemName) {
      message += `📦 Item: ${itemName}\n\n`;
    }

    message += `Please rate from 1 to 5 stars:\n`;
    message += `⭐ 1 star - Poor\n`;
    message += `⭐⭐ 2 stars - Below Average\n`;
    message += `⭐⭐⭐ 3 stars - Average\n`;
    message += `⭐⭐⭐⭐ 4 stars - Good\n`;
    message += `⭐⭐⭐⭐⭐ 5 stars - Excellent\n\n`;
    message += `💡 You can type a number (1-5) or send stars ⭐`;

    return message;
  }

  /**
   * Generate comment prompt message
   */
  generateCommentPrompt(rating: number): string {
    let message = `📝 *Share Your Feedback*\n\n`;
    message += `You rated: ${this.convertToStars(rating)}\n\n`;
    message += `Please share your experience in a few words (optional):\n`;
    message += `💡 Type your comment or send "skip" to submit without comment`;

    return message;
  }

  /**
   * Validate rating input
   */
  private validateRating(rating: number | string): {
    valid: boolean;
    rating?: number;
    message?: string;
  } {
    let numericRating: number;

    if (typeof rating === 'string') {
      const parsed = this.parseRatingInput(rating);
      if (parsed === null) {
        return {
          valid: false,
          message: `❌ Invalid rating. Please provide a number between ${this.MIN_RATING} and ${this.MAX_RATING}.`,
        };
      }
      numericRating = parsed;
    } else {
      numericRating = rating;
    }

    if (numericRating < this.MIN_RATING || numericRating > this.MAX_RATING) {
      return {
        valid: false,
        message: `❌ Rating must be between ${this.MIN_RATING} and ${this.MAX_RATING}.`,
      };
    }

    return {
      valid: true,
      rating: numericRating,
    };
  }

  /**
   * Validate comment input
   */
  private validateComment(comment: string): {
    valid: boolean;
    comment?: string;
    message?: string;
  } {
    const trimmed = comment.trim();

    // Allow empty comments or "skip"
    if (trimmed === '' || trimmed.toLowerCase() === 'skip') {
      return {
        valid: true,
        comment: '',
      };
    }

    if (trimmed.length < this.MIN_COMMENT_LENGTH) {
      return {
        valid: false,
        message: `❌ Comment must be at least ${this.MIN_COMMENT_LENGTH} characters.`,
      };
    }

    if (trimmed.length > this.MAX_COMMENT_LENGTH) {
      return {
        valid: false,
        message: `❌ Comment must not exceed ${this.MAX_COMMENT_LENGTH} characters.`,
      };
    }

    return {
      valid: true,
      comment: trimmed,
    };
  }

  /**
   * Convert rating number to stars
   */
  private convertToStars(rating: number): string {
    return '⭐'.repeat(Math.max(0, Math.min(5, rating)));
  }

  /**
   * Format single review
   */
  private formatReview(review: any): ReviewDisplay {
    const stars = this.convertToStars(review.rating);
    const date = new Date(review.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      id: review.id,
      customer_name: review.customer_name,
      rating: review.rating,
      rating_stars: stars,
      comment: review.comment,
      date,
      formatted_message: this.formatReviewMessage(
        review.customer_name,
        stars,
        review.comment,
        date,
      ),
    };
  }

  /**
   * Format single review message
   */
  private formatReviewMessage(
    customerName: string,
    stars: string,
    comment: string,
    date: string,
  ): string {
    let message = `👤 *${customerName}*\n`;
    message += `${stars}\n`;
    if (comment) {
      message += `💬 "${comment}"\n`;
    }
    message += `📅 ${date}`;

    return message;
  }

  /**
   * Format review list
   */
  private formatReviewList(reviews: ReviewDisplay[], type: 'item' | 'delivery'): string {
    let message = `📝 *${type === 'item' ? 'Item' : 'Delivery'} Reviews*\n\n`;

    reviews.forEach((review, index) => {
      message += `${index + 1}. ${review.formatted_message}\n\n`;
    });

    return message;
  }

  /**
   * Format rating summary
   */
  private formatRating(rating: any): RatingDisplay {
    const stars = this.convertToStars(Math.round(rating.average));
    const distribution = this.calculateDistribution(rating.rating_breakdown, rating.total_reviews);

    return {
      average: rating.average,
      average_stars: stars,
      total_reviews: rating.total_reviews,
      distribution,
      formatted_message: this.formatRatingMessage(rating.average, stars, rating.total_reviews, distribution),
    };
  }

  /**
   * Calculate rating distribution
   */
  private calculateDistribution(
    breakdown: any,
    total: number,
  ): { stars: number; count: number; percentage: number; bar: string }[] {
    const distribution = [];

    for (let i = 5; i >= 1; i--) {
      const count = breakdown[i] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const barLength = Math.round(percentage / 10);
      const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);

      distribution.push({
        stars: i,
        count,
        percentage,
        bar,
      });
    }

    return distribution;
  }

  /**
   * Format rating message
   */
  private formatRatingMessage(
    average: number,
    stars: string,
    total: number,
    distribution: any[],
  ): string {
    let message = `⭐ *Rating Summary*\n\n`;
    message += `${stars} *${average.toFixed(1)}*/5\n`;
    message += `📊 Based on ${total} review${total !== 1 ? 's' : ''}\n\n`;
    
    message += `*Distribution:*\n`;
    distribution.forEach(d => {
      message += `${'⭐'.repeat(d.stars)} ${d.bar} ${d.percentage}% (${d.count})\n`;
    });

    return message;
  }

  /**
   * Format submit success message
   */
  private formatSubmitSuccess(type: 'item' | 'delivery', rating: number): string {
    const stars = this.convertToStars(rating);
    let message = `✅ *Review Submitted Successfully!*\n\n`;
    message += `${stars}\n`;
    message += `Thank you for your feedback! 🙏\n\n`;
    message += `Your review helps us improve our ${type === 'item' ? 'products' : 'service'}.`;

    return message;
  }
}
