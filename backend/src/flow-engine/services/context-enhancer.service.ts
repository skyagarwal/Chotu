/**
 * Context Enhancer Service
 * 
 * Enriches flow context with real-time data:
 * - Weather (temperature, conditions)
 * - Meal time (breakfast, lunch, dinner)
 * - Festival info (upcoming festivals, greetings)
 * - City knowledge (local slang, dishes, tips)
 * - User preferences (favorites, history)
 * 
 * This makes Chotu's responses contextual and personalized!
 */

import { Injectable, Logger } from '@nestjs/common';
import { UserContextService, UserContext, WeatherContext, DateTimeContext, ContextualSuggestions } from '../../context/services/user-context.service';

export interface EnhancedContext {
  // Weather Context
  weather: {
    temperature: number;
    feelsLike: number;
    condition: string;
    conditionHindi: string;
    isHot: boolean;
    isCold: boolean;
    isRainy: boolean;
  };
  
  // Time Context
  time: {
    timeOfDay: string;
    timeOfDayHindi: string;
    mealTime: string;
    dayOfWeek: string;
    dayOfWeekHindi: string;
    isWeekend: boolean;
  };
  
  // Festival Context
  festival: {
    name?: string;
    nameHindi?: string;
    isToday: boolean;
    daysAway?: number;
    foods?: string[];
    greeting?: string;
  };
  
  // Local Knowledge
  local: {
    cityName: string;
    popularDishes: string[];
    localSpecialties: string[];
    slang: Array<{ slang: string; meaning: string }>;
    tips: string[];
  };
  
  // Suggestions
  suggestions: {
    weatherBased: string[];
    timeBased: string[];
    festivalBased?: string[];
    weatherMessage: string;
    timeMessage: string;
    festivalMessage?: string;
  };
  
  // Formatted strings for easy prompt injection
  contextSummary: string;
  greetingEnhancement: string;
  foodSuggestionPrompt: string;
}

@Injectable()
export class ContextEnhancerService {
  private readonly logger = new Logger(ContextEnhancerService.name);
  private contextCache = new Map<string, { data: EnhancedContext; timestamp: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor(private readonly userContextService: UserContextService) {}

  /**
   * Get enhanced context for a user
   */
  async getEnhancedContext(userId?: string, lat?: number, lng?: number): Promise<EnhancedContext> {
    const cacheKey = `${userId || 'anon'}_${lat || 'default'}_${lng || 'default'}`;
    
    // Check cache
    const cached = this.contextCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Get full user context
      const userContext = await this.userContextService.getUserContext(userId || 'anonymous', lat, lng);
      
      // Build enhanced context
      const enhanced = this.buildEnhancedContext(userContext);
      
      // Cache it
      this.contextCache.set(cacheKey, { data: enhanced, timestamp: Date.now() });
      
      return enhanced;
    } catch (error) {
      this.logger.error(`Failed to get enhanced context: ${error.message}`);
      return this.getDefaultContext();
    }
  }

  /**
   * Build enhanced context from user context
   */
  private buildEnhancedContext(userContext: UserContext): EnhancedContext {
    const { weather, dateTime, localKnowledge, suggestions } = userContext;
    
    // Build festival context
    const festivalContext = {
      name: dateTime.upcomingFestival,
      nameHindi: dateTime.upcomingFestivalHindi,
      isToday: dateTime.isFestivalToday,
      daysAway: dateTime.daysToFestival,
      foods: suggestions.festivalFood,
      greeting: dateTime.isFestivalToday 
        ? `Happy ${dateTime.upcomingFestival || dateTime.upcomingFestivalHindi}! 🎉`
        : dateTime.daysToFestival && dateTime.daysToFestival <= 3
          ? `${dateTime.upcomingFestival || dateTime.upcomingFestivalHindi} is coming soon!`
          : undefined,
    };

    // Build context summary for prompts
    const contextSummary = this.buildContextSummary(weather, dateTime, festivalContext);
    
    // Build greeting enhancement
    const greetingEnhancement = this.buildGreetingEnhancement(weather, dateTime, festivalContext);
    
    // Build food suggestion prompt
    const foodSuggestionPrompt = this.buildFoodSuggestionPrompt(suggestions, weather, dateTime);

    return {
      weather: {
        temperature: weather.temperature,
        feelsLike: weather.feelsLike,
        condition: weather.condition,
        conditionHindi: weather.conditionHindi,
        isHot: weather.isHot,
        isCold: weather.isCold,
        isRainy: weather.isRainy,
      },
      time: {
        timeOfDay: dateTime.timeOfDay,
        timeOfDayHindi: dateTime.timeOfDayHindi,
        mealTime: dateTime.mealTime,
        dayOfWeek: dateTime.dayOfWeek,
        dayOfWeekHindi: dateTime.dayOfWeekHindi,
        isWeekend: dateTime.isWeekend,
      },
      festival: festivalContext,
      local: {
        cityName: userContext.cityName,
        popularDishes: localKnowledge.popularDishes,
        localSpecialties: localKnowledge.localSpecialties,
        slang: localKnowledge.citySlang.slice(0, 5),
        tips: localKnowledge.localTips,
      },
      suggestions: {
        weatherBased: suggestions.weatherBasedFood,
        timeBased: suggestions.timeBasedFood,
        festivalBased: suggestions.festivalFood,
        weatherMessage: suggestions.weatherBasedMessage,
        timeMessage: suggestions.timeBasedMessage,
        festivalMessage: suggestions.festivalMessage,
      },
      contextSummary,
      greetingEnhancement,
      foodSuggestionPrompt,
    };
  }

  /**
   * Build context summary for LLM system prompts
   */
  private buildContextSummary(weather: WeatherContext, dateTime: DateTimeContext, festival: any): string {
    const parts: string[] = [];
    
    // Weather context
    parts.push(`Current Weather: ${weather.temperature}°C, ${weather.condition}`);
    if (weather.isHot) parts.push('⚠️ Hot weather - suggest cold drinks and light food');
    if (weather.isCold) parts.push('❄️ Cold weather - suggest hot beverages and comfort food');
    if (weather.isRainy) parts.push('🌧️ Rainy weather - suggest pakode, chai, and indoor food');
    
    // Time context
    parts.push(`Time: ${dateTime.timeOfDayHindi} (${dateTime.timeOfDay}), ${dateTime.dayOfWeekHindi}`);
    parts.push(`Meal Time: ${dateTime.mealTime}`);
    if (dateTime.isWeekend) parts.push('🎉 Weekend - users may want party food or family meals');
    
    // Festival context
    if (festival.isToday) {
      parts.push(`🎊 TODAY IS ${festival.nameHindi} (${festival.name})!`);
      parts.push(`Festival Foods: ${festival.foods?.join(', ')}`);
    } else if (festival.daysAway && festival.daysAway <= 3) {
      parts.push(`📅 ${festival.nameHindi} in ${festival.daysAway} days - suggest festival preparations`);
    }
    
    // Special days
    if (dateTime.specialDay) {
      parts.push(`Special: ${dateTime.specialDay}`);
    }

    return parts.join('\n');
  }

  /**
   * Build greeting enhancement for welcome messages
   */
  private buildGreetingEnhancement(weather: WeatherContext, dateTime: DateTimeContext, festival: any): string {
    const greetings: string[] = [];
    
    // Time-based greeting
    switch (dateTime.timeOfDay) {
      case 'morning':
        greetings.push('Good morning! ☀️');
        break;
      case 'afternoon':
        greetings.push('Good afternoon!');
        break;
      case 'evening':
        greetings.push('Good evening! 🌆');
        break;
      case 'night':
        greetings.push('Good night! 🌙');
        break;
    }
    
    // Festival greeting takes priority
    if (festival.isToday) {
      return `${festival.greeting} ${greetings[0] || 'Hello!'}`;
    }
    
    // Weather-based addition
    if (weather.isHot) {
      greetings.push("It's hot today—want to order something cool? 🥤");
    } else if (weather.isCold) {
      greetings.push('Feeling chilly—hot chai/coffee? ☕');
    } else if (weather.isRainy) {
      greetings.push('Rainy weather—pakode and chai sound good? 🌧️');
    }
    
    return greetings.join(' ');
  }

  /**
   * Build food suggestion prompt
   */
  private buildFoodSuggestionPrompt(suggestions: ContextualSuggestions, weather: WeatherContext, dateTime: DateTimeContext): string {
    const parts: string[] = [];
    
    parts.push(`CONTEXTUAL FOOD SUGGESTIONS:`);
    
    // Weather-based
    if (suggestions.weatherBasedFood.length > 0) {
      parts.push(`Weather-appropriate (${weather.temperature}°C ${weather.condition}): ${suggestions.weatherBasedFood.join(', ')}`);
    }
    
    // Time-based
    if (suggestions.timeBasedFood.length > 0) {
      parts.push(`${dateTime.mealTime} suggestions: ${suggestions.timeBasedFood.join(', ')}`);
    }
    
    // Festival-based
    if (suggestions.festivalFood && suggestions.festivalFood.length > 0) {
      parts.push(`Festival special: ${suggestions.festivalFood.join(', ')}`);
    }
    
    parts.push('');
    parts.push('Use these suggestions naturally in conversation when relevant.');
    
    return parts.join('\n');
  }

  /**
   * Get default context when service fails
   */
  private getDefaultContext(): EnhancedContext {
    return {
      weather: {
        temperature: 28,
        feelsLike: 30,
        condition: 'partly cloudy',
        conditionHindi: 'आंशिक बादल',
        isHot: false,
        isCold: false,
        isRainy: false,
      },
      time: {
        timeOfDay: 'afternoon',
        timeOfDayHindi: 'दोपहर',
        mealTime: 'lunch',
        dayOfWeek: 'Monday',
        dayOfWeekHindi: 'सोमवार',
        isWeekend: false,
      },
      festival: {
        isToday: false,
      },
      local: {
        cityName: 'Nashik',
        popularDishes: ['Misal Pav', 'Vada Pav', 'Poha'],
        localSpecialties: ['Nashik Grapes', 'Sula Wines'],
        slang: [],
        tips: [],
      },
      suggestions: {
        weatherBased: [],
        timeBased: ['Thali', 'Biryani', 'Rice'],
        weatherMessage: '',
        timeMessage: 'Lunch time! Kya khayenge aaj?',
      },
      contextSummary: 'Default context - weather service unavailable',
      greetingEnhancement: 'Namaste!',
      foodSuggestionPrompt: 'Suggest popular local dishes.',
    };
  }

  /**
   * Generate a contextual greeting message
   */
  async generateContextualGreeting(userId?: string): Promise<string> {
    const context = await this.getEnhancedContext(userId);
    
    const parts: string[] = [];
    
    // Festival greeting first
    if (context.festival.isToday && context.festival.greeting) {
      parts.push(context.festival.greeting);
    }
    
    // Time-based greeting
    const timeGreetings: Record<string, string> = {
      morning: 'Good morning! ☀️',
      afternoon: 'Good afternoon!',
      evening: 'Good evening! 🌆',
      night: 'Good night! 🌙',
    };
    if (!context.festival.isToday) {
      parts.push(timeGreetings[context.time.timeOfDay] || 'Namaste!');
    }
    
    // Weather-aware message
    if (context.weather.isHot) {
      parts.push(`Garmi bahut hai (${context.weather.temperature}°C)! Kuch thanda order karo? 🥤`);
    } else if (context.weather.isCold) {
      parts.push(`Thandi hai aaj (${context.weather.temperature}°C)! Garam chai ya coffee? ☕`);
    } else if (context.weather.isRainy) {
      parts.push('Baarish ho rahi hai! Perfect weather for pakode! 🌧️');
    }
    
    // Meal-time suggestion
    if (!context.weather.isHot && !context.weather.isCold && !context.weather.isRainy) {
      parts.push(context.suggestions.timeMessage || 'Kya order karoge aaj?');
    }
    
    return parts.join(' ');
  }

  /**
   * Get context for LLM system prompt injection
   */
  async getContextForPrompt(userId?: string): Promise<string> {
    const context = await this.getEnhancedContext(userId);
    
    return `
== CURRENT CONTEXT (Use this to personalize responses) ==
${context.contextSummary}

== SUGGESTED FOODS ==
${context.foodSuggestionPrompt}

== LOCAL KNOWLEDGE (Nashik) ==
Popular Dishes: ${context.local.popularDishes.slice(0, 5).join(', ')}
Local Specialties: ${context.local.localSpecialties.join(', ')}
`;
  }
}
