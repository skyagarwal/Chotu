/**
 * Context Controller
 * 
 * Test endpoints for User Context Service
 * - Weather info
 * - Time/Date context
 * - Festival info
 * - User preferences
 * - Contextual suggestions
 */

import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UserContextService, UserContext } from '../services/user-context.service';

@ApiTags('Context')
@Controller('context')
export class ContextController {
  private readonly logger = new Logger(ContextController.name);

  constructor(private readonly contextService: UserContextService) {}

  /**
   * Get full user context
   */
  @Get()
  @ApiOperation({ summary: 'Get full user context' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID (phone number)' })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude' })
  @ApiQuery({ name: 'lng', required: false, description: 'Longitude' })
  @ApiResponse({ status: 200, description: 'User context object' })
  async getUserContext(
    @Query('userId') userId?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ): Promise<UserContext> {
    this.logger.log(`Getting context for user: ${userId || 'anonymous'}`);
    
    return this.contextService.getUserContext(
      userId || 'anonymous',
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
    );
  }

  /**
   * Get weather context only
   */
  @Get('weather')
  @ApiOperation({ summary: 'Get current weather context' })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude (default: Nashik)' })
  @ApiQuery({ name: 'lng', required: false, description: 'Longitude (default: Nashik)' })
  async getWeather(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const latitude = lat ? parseFloat(lat) : 19.9975;  // Nashik
    const longitude = lng ? parseFloat(lng) : 73.7898;
    
    return this.contextService.getWeatherContext(latitude, longitude);
  }

  /**
   * Get time/date context
   */
  @Get('datetime')
  @ApiOperation({ summary: 'Get current date/time context' })
  async getDateTime() {
    return this.contextService.getDateTimeContext();
  }

  /**
   * Get upcoming festivals
   */
  @Get('festivals')
  @ApiOperation({ summary: 'Get upcoming festivals' })
  @ApiQuery({ name: 'days', required: false, description: 'Days ahead to look (default: 30)' })
  async getFestivals(@Query('days') days?: string) {
    const daysAhead = days ? parseInt(days) : 30;
    return this.contextService.getUpcomingFestivals(daysAhead);
  }

  /**
   * Get city knowledge (Nashik)
   */
  @Get('city-knowledge')
  @ApiOperation({ summary: 'Get local city knowledge' })
  @ApiQuery({ name: 'city', required: false, description: 'City name (default: Nashik)' })
  async getCityKnowledge(@Query('city') city?: string) {
    return this.contextService.getCityKnowledge(city || 'Nashik');
  }

  /**
   * Get user preferences
   */
  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID (phone number)' })
  async getUserPreferences(@Query('userId') userId: string) {
    if (!userId) {
      return { error: 'userId is required' };
    }
    return this.contextService.getUserPreferences(userId);
  }

  /**
   * Get contextual suggestions
   */
  @Get('suggestions')
  @ApiOperation({ summary: 'Get contextual food suggestions' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  async getSuggestions(
    @Query('userId') userId?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const context = await this.contextService.getUserContext(
      userId || 'anonymous',
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
    );
    
    return context.suggestions;
  }

  /**
   * Test meal-time detection
   */
  @Get('meal-time')
  @ApiOperation({ summary: 'Get current meal time and suggestions' })
  async getMealTime() {
    const dateTime = await this.contextService.getDateTimeContext();
    const weather = await this.contextService.getWeatherContext(19.9975, 73.7898);
    
    return {
      currentTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      mealTime: dateTime.mealTime,
      timeOfDay: dateTime.timeOfDay,
      timeOfDayHindi: dateTime.timeOfDayHindi,
      dayOfWeek: dateTime.dayOfWeek,
      dayOfWeekHindi: dateTime.dayOfWeekHindi,
      isWeekend: dateTime.isWeekend,
      weather: {
        temperature: weather.temperature,
        condition: weather.condition,
        conditionHindi: weather.conditionHindi,
        isHot: weather.isHot,
        isCold: weather.isCold,
        isRainy: weather.isRainy,
      },
      suggestions: this.getMealTimeSuggestions(dateTime.mealTime, weather),
    };
  }

  private getMealTimeSuggestions(mealTime: string, weather: any): string[] {
    const suggestions: Record<string, string[]> = {
      breakfast: ['Poha', 'Misal Pav', 'Upma', 'Idli', 'Dosa', 'Paratha'],
      lunch: ['Thali', 'Biryani', 'Dal Rice', 'Roti Sabji'],
      snacks: ['Vada Pav', 'Samosa', 'Bhel', 'Pav Bhaji', 'Chai'],
      dinner: ['Paneer Butter Masala', 'Dal Makhani', 'Biryani', 'Naan'],
      late_night: ['Maggi', 'Sandwich', 'Frankie', 'Ice Cream'],
    };

    let items = suggestions[mealTime] || suggestions.snacks;

    // Weather adjustments
    if (weather.isHot) {
      items = [...items, 'Lassi', 'Buttermilk', 'Ice Cream', 'Cold Coffee'];
    }
    if (weather.isCold) {
      items = [...items, 'Garam Chai', 'Hot Coffee', 'Soup'];
    }
    if (weather.isRainy) {
      items = [...items, 'Pakora', 'Bhajiya', 'Garam Chai'];
    }

    return items;
  }
}
