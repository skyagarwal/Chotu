import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { RecommendationEngineService, RecommendationRequest } from '../services/recommendation-engine.service';

/**
 * 🎯 Recommendations API Controller
 * 
 * Public endpoints for product recommendations
 */
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationEngine: RecommendationEngineService,
  ) {}

  /**
   * Get personalized recommendations for user
   * @query userId - User ID for personalization
   * @query sessionId - Session ID for anonymous users
   * @query moduleId - Filter by module (1=food, 2=grocery, etc.)
   * @query limit - Max results (default 10)
   */
  @Get('personalized')
  async getPersonalized(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('moduleId') moduleId?: string,
    @Query('limit') limit?: string,
  ) {
    const request: RecommendationRequest = {
      userId,
      sessionId,
      moduleId: moduleId ? parseInt(moduleId) : undefined,
      limit: limit ? parseInt(limit) : 10,
    };

    return this.recommendationEngine.getPersonalizedRecommendations(request);
  }

  /**
   * Get similar products
   */
  @Get('similar/:productId')
  async getSimilar(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationEngine.getSimilarProducts({
      productId,
      limit: limit ? parseInt(limit) : 6,
    });
  }

  /**
   * Get frequently bought together
   */
  @Get('bundle/:productId')
  async getBundle(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationEngine.getFrequentlyBoughtTogether({
      productId,
      limit: limit ? parseInt(limit) : 4,
    });
  }

  /**
   * Get trending products
   */
  @Get('trending')
  async getTrending(
    @Query('moduleId') moduleId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationEngine.getTrendingProducts({
      moduleId: moduleId ? parseInt(moduleId) : undefined,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  /**
   * Get contextual recommendations (time, location, weather)
   */
  @Get('contextual')
  async getContextual(
    @Query('moduleId') moduleId?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
  ) {
    const request: RecommendationRequest = {
      moduleId: moduleId ? parseInt(moduleId) : undefined,
      limit: limit ? parseInt(limit) : 8,
      context: {
        location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
      },
    };

    return this.recommendationEngine.getContextualRecommendations(request);
  }

  /**
   * Track product interaction
   */
  @Post('track/interaction')
  async trackInteraction(
    @Body() body: {
      userId: string;
      productId: string;
      interactionType: 'view' | 'add_to_cart' | 'purchase' | 'review';
      sessionId?: string;
    },
  ) {
    await this.recommendationEngine.trackInteraction(
      body.userId,
      body.productId,
      body.interactionType,
      body.sessionId,
    );

    return { success: true };
  }

  /**
   * Track recommendation feedback
   */
  @Post('track/feedback')
  async trackFeedback(
    @Body() body: {
      userId?: string;
      sessionId?: string;
      productId: string;
      recommendationType: string;
      action: 'shown' | 'clicked' | 'purchased' | 'dismissed';
      position?: number;
    },
  ) {
    await this.recommendationEngine.trackRecommendationFeedback(
      body.userId || null,
      body.sessionId || null,
      body.productId,
      body.recommendationType,
      body.action,
      body.position,
    );

    return { success: true };
  }
}
