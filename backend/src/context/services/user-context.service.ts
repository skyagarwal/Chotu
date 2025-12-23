/**
 * User Context Service
 * 
 * Provides comprehensive user context for Chotu:
 * - Weather/Climate (free APIs)
 * - Current date/time/festivals
 * - City knowledge
 * - User preferences/favorites
 * - Local slang
 * - Zone-specific info
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { firstValueFrom } from 'rxjs';

export interface UserContext {
  // User Info
  userId: string;
  userName?: string;
  phoneNumber?: string;
  language: 'hi' | 'en' | 'mr';
  
  // Location
  zoneId?: number;
  zoneName?: string;
  cityName: string;
  stateName: string;
  lat?: number;
  lng?: number;
  
  // Weather & Climate
  weather: WeatherContext;
  
  // Time & Date
  dateTime: DateTimeContext;
  
  // User Preferences
  preferences: UserPreferences;
  
  // Local Knowledge
  localKnowledge: LocalKnowledge;
  
  // Computed Suggestions
  suggestions: ContextualSuggestions;
}

export interface WeatherContext {
  temperature: number;        // Celsius
  feelsLike: number;
  humidity: number;
  condition: string;          // "sunny", "rainy", "cloudy"
  conditionHindi: string;     // "धूप", "बारिश", "बादल"
  isHot: boolean;             // >35°C
  isCold: boolean;            // <15°C
  isRainy: boolean;
  lastUpdated: Date;
  source: string;             // Which API provided this
}

export interface DateTimeContext {
  currentDate: Date;
  dayOfWeek: string;
  dayOfWeekHindi: string;
  isWeekend: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  timeOfDayHindi: string;
  mealTime: 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'late_night';
  
  // Festivals & Events
  upcomingFestival?: string;
  upcomingFestivalHindi?: string;
  daysToFestival?: number;
  isFestivalToday: boolean;
  specialDay?: string;        // "Mango season", "IPL day"
}

export interface UserPreferences {
  // Food preferences
  dietaryType: 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain' | null;
  favoriteCuisines: string[];
  favoriteItems: FavoriteItem[];
  dislikedItems: string[];
  spiceLevel: 'mild' | 'medium' | 'spicy' | 'extra_spicy' | null;
  
  // Shopping preferences
  favoriteStores: FavoriteStore[];
  preferredPayment: string;
  avgOrderValue: number;
  orderFrequency: 'daily' | 'weekly' | 'occasional';
  
  // Communication
  preferredLanguage: string;
  usesVoice: boolean;
  responseStyle: 'brief' | 'detailed';
}

export interface FavoriteItem {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  orderCount: number;
  lastOrdered: Date;
}

export interface FavoriteStore {
  storeId: string;
  storeName: string;
  category: string;
  orderCount: number;
  lastOrdered: Date;
}

export interface LocalKnowledge {
  citySlang: CitySlang[];
  popularDishes: string[];
  localSpecialties: string[];
  famousPlaces: string[];
  localTips: string[];
}

export interface CitySlang {
  slang: string;
  meaning: string;
  usage: string;
}

export interface ContextualSuggestions {
  // Based on weather
  weatherBasedFood: string[];     // "Garam chai" when cold
  weatherBasedMessage: string;
  
  // Based on time
  timeBasedFood: string[];        // "Breakfast items" in morning
  timeBasedMessage: string;
  
  // Based on user history
  personalizedFood: string[];     // Based on favorites
  personalizedMessage: string;
  
  // Festival based
  festivalFood?: string[];
  festivalMessage?: string;
}

@Injectable()
export class UserContextService implements OnModuleInit {
  private readonly logger = new Logger(UserContextService.name);
  
  // Weather cache (zone-wise)
  private weatherCache = new Map<string, WeatherContext>();
  
  // City knowledge cache
  private cityKnowledgeCache = new Map<string, LocalKnowledge>();
  
  // Indian festivals 2024-2025
  private readonly festivals = [
    { name: 'Makar Sankranti', nameHindi: 'मकर संक्रांति', date: '2025-01-14', foods: ['Til ladoo', 'Gajak', 'Khichdi'] },
    { name: 'Republic Day', nameHindi: 'गणतंत्र दिवस', date: '2025-01-26', foods: ['Mithai', 'Samosa'] },
    { name: 'Holi', nameHindi: 'होली', date: '2025-03-14', foods: ['Gujiya', 'Thandai', 'Malpua'] },
    { name: 'Gudi Padwa', nameHindi: 'गुड़ी पड़वा', date: '2025-03-30', foods: ['Puran Poli', 'Shrikhand'] },
    { name: 'Eid ul-Fitr', nameHindi: 'ईद उल-फ़ित्र', date: '2025-03-31', foods: ['Biryani', 'Sewai', 'Kebabs'] },
    { name: 'Akshaya Tritiya', nameHindi: 'अक्षय तृतीया', date: '2025-05-01', foods: ['Puri', 'Halwa'] },
    { name: 'Raksha Bandhan', nameHindi: 'रक्षा बंधन', date: '2025-08-09', foods: ['Mithai', 'Kheer'] },
    { name: 'Janmashtami', nameHindi: 'जन्माष्टमी', date: '2025-08-16', foods: ['Makhan', 'Panjiri', 'Kheer'] },
    { name: 'Ganesh Chaturthi', nameHindi: 'गणेश चतुर्थी', date: '2025-08-27', foods: ['Modak', 'Puran Poli'] },
    { name: 'Navratri', nameHindi: 'नवरात्रि', date: '2025-09-22', foods: ['Sabudana Khichdi', 'Kuttu Puri', 'Fruits'] },
    { name: 'Dussehra', nameHindi: 'दशहरा', date: '2025-10-02', foods: ['Jalebi', 'Fafda'] },
    { name: 'Diwali', nameHindi: 'दीपावली', date: '2025-10-21', foods: ['Mithai', 'Chakli', 'Karanji', 'Dry Fruits'] },
    { name: 'Bhai Dooj', nameHindi: 'भाई दूज', date: '2025-10-23', foods: ['Mithai', 'Coconut Ladoo'] },
    { name: 'Christmas', nameHindi: 'क्रिसमस', date: '2025-12-25', foods: ['Cake', 'Plum Cake', 'Biryani'] },
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing User Context Service...');
    await this.loadCityKnowledge();
  }

  /**
   * Get complete user context
   */
  async getUserContext(userId: string, lat?: number, lng?: number, zoneId?: number): Promise<UserContext> {
    // Get user basic info
    const userInfo = await this.getUserInfo(userId);
    
    // Get weather
    const weather = await this.getWeather(lat, lng, zoneId);
    
    // Get date/time context
    const dateTime = this.getDateTimeContext();
    
    // Get user preferences
    const preferences = await this.getUserPreferences(userId);
    
    // Get local knowledge
    const localKnowledge = await this.getLocalKnowledge(userInfo.cityName || 'Nashik');
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(weather, dateTime, preferences, localKnowledge);

    return {
      userId,
      userName: userInfo.userName,
      phoneNumber: userInfo.phoneNumber,
      language: userInfo.language || 'hi',
      zoneId,
      zoneName: userInfo.zoneName,
      cityName: userInfo.cityName || 'Nashik',
      stateName: userInfo.stateName || 'Maharashtra',
      lat,
      lng,
      weather,
      dateTime,
      preferences,
      localKnowledge,
      suggestions,
    };
  }

  /**
   * Get weather from multiple free sources with fallback
   */
  async getWeather(lat?: number, lng?: number, zoneId?: number): Promise<WeatherContext> {
    const cacheKey = zoneId ? `zone_${zoneId}` : `${lat}_${lng}`;
    
    // Check cache (valid for 30 mins)
    const cached = this.weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.lastUpdated.getTime() < 30 * 60 * 1000) {
      return cached;
    }

    // Try multiple sources in order
    const sources = await this.getActiveDataSources('weather');
    
    for (const source of sources) {
      try {
        const weather = await this.fetchWeatherFromSource(source, lat, lng);
        if (weather) {
          this.weatherCache.set(cacheKey, weather);
          await this.cacheWeatherInDb(cacheKey, weather);
          return weather;
        }
      } catch (error) {
        this.logger.warn(`Weather source ${source.name} failed: ${error.message}`);
      }
    }

    // Fallback to cached DB data
    return this.getWeatherFromDb(cacheKey);
  }

  /**
   * Fetch weather from a specific source
   */
  private async fetchWeatherFromSource(
    source: DataSource,
    lat?: number,
    lng?: number
  ): Promise<WeatherContext | null> {
    if (!lat || !lng) {
      // Default to Nashik
      lat = 19.9975;
      lng = 73.7898;
    }

    switch (source.provider) {
      case 'open_meteo':
        return this.fetchOpenMeteo(lat, lng);
      case 'wttr_in':
        return this.fetchWttrIn(lat, lng);
      case 'openweathermap':
        return this.fetchOpenWeatherMap(lat, lng, source.apiKey);
      default:
        return null;
    }
  }

  /**
   * Open-Meteo API (FREE, no API key needed)
   */
  private async fetchOpenMeteo(lat: number, lng: number): Promise<WeatherContext> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code`;
    
    const response = await firstValueFrom(
      this.httpService.get(url, { timeout: 5000 })
    );

    const data = response.data.current;
    const condition = this.mapWeatherCode(data.weather_code);

    return {
      temperature: Math.round(data.temperature_2m),
      feelsLike: Math.round(data.apparent_temperature),
      humidity: data.relative_humidity_2m,
      condition: condition.en,
      conditionHindi: condition.hi,
      isHot: data.temperature_2m > 35,
      isCold: data.temperature_2m < 15,
      isRainy: [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(data.weather_code),
      lastUpdated: new Date(),
      source: 'open_meteo',
    };
  }

  /**
   * wttr.in API (FREE, no API key)
   */
  private async fetchWttrIn(lat: number, lng: number): Promise<WeatherContext> {
    const url = `https://wttr.in/${lat},${lng}?format=j1`;
    
    const response = await firstValueFrom(
      this.httpService.get(url, { timeout: 5000 })
    );

    const current = response.data.current_condition[0];
    
    return {
      temperature: parseInt(current.temp_C),
      feelsLike: parseInt(current.FeelsLikeC),
      humidity: parseInt(current.humidity),
      condition: current.weatherDesc[0].value.toLowerCase(),
      conditionHindi: this.translateCondition(current.weatherDesc[0].value),
      isHot: parseInt(current.temp_C) > 35,
      isCold: parseInt(current.temp_C) < 15,
      isRainy: current.weatherDesc[0].value.toLowerCase().includes('rain'),
      lastUpdated: new Date(),
      source: 'wttr_in',
    };
  }

  /**
   * OpenWeatherMap API (Free tier: 1000 calls/day)
   */
  private async fetchOpenWeatherMap(lat: number, lng: number, apiKey?: string): Promise<WeatherContext | null> {
    if (!apiKey) return null;
    
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    
    const response = await firstValueFrom(
      this.httpService.get(url, { timeout: 5000 })
    );

    const data = response.data;
    
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      condition: data.weather[0].main.toLowerCase(),
      conditionHindi: this.translateCondition(data.weather[0].main),
      isHot: data.main.temp > 35,
      isCold: data.main.temp < 15,
      isRainy: data.weather[0].main.toLowerCase().includes('rain'),
      lastUpdated: new Date(),
      source: 'openweathermap',
    };
  }

  /**
   * Get date/time context
   */
  getDateTimeContext(): DateTimeContext {
    const now = new Date();
    const hour = now.getHours();
    
    // Day names
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysHindi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
    
    // Time of day
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    let timeOfDayHindi: string;
    let mealTime: 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'late_night';
    
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
      timeOfDayHindi = 'सुबह';
      mealTime = hour < 10 ? 'breakfast' : 'lunch';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
      timeOfDayHindi = 'दोपहर';
      mealTime = hour < 15 ? 'lunch' : 'snacks';
    } else if (hour >= 17 && hour < 21) {
      timeOfDay = 'evening';
      timeOfDayHindi = 'शाम';
      mealTime = hour < 19 ? 'snacks' : 'dinner';
    } else {
      timeOfDay = 'night';
      timeOfDayHindi = 'रात';
      mealTime = hour < 23 ? 'dinner' : 'late_night';
    }

    // Check festivals
    const { festival, daysTo, isFestivalToday } = this.checkUpcomingFestival(now);

    return {
      currentDate: now,
      dayOfWeek: days[now.getDay()],
      dayOfWeekHindi: daysHindi[now.getDay()],
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      timeOfDay,
      timeOfDayHindi,
      mealTime,
      upcomingFestival: festival?.name,
      upcomingFestivalHindi: festival?.nameHindi,
      daysToFestival: daysTo,
      isFestivalToday,
      specialDay: this.getSpecialDay(now),
    };
  }

  /**
   * Check upcoming festival
   */
  private checkUpcomingFestival(date: Date): { festival: any; daysTo: number; isFestivalToday: boolean } {
    const today = date.toISOString().split('T')[0];
    
    for (const festival of this.festivals) {
      const festivalDate = new Date(festival.date);
      const diffTime = festivalDate.getTime() - date.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 7) {
        return {
          festival,
          daysTo: diffDays,
          isFestivalToday: diffDays === 0,
        };
      }
    }
    
    return { festival: null, daysTo: -1, isFestivalToday: false };
  }

  /**
   * Get special day info
   */
  private getSpecialDay(date: Date): string | undefined {
    const month = date.getMonth();
    
    // Mango season (April-June)
    if (month >= 3 && month <= 5) {
      return 'Mango season 🥭';
    }
    
    // Monsoon (July-September)
    if (month >= 6 && month <= 8) {
      return 'Monsoon season 🌧️';
    }
    
    // Winter (December-February)
    if (month === 11 || month <= 1) {
      return 'Winter season ❄️';
    }
    
    return undefined;
  }

  /**
   * Get user preferences from database
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Get from user_preferences table
    const prefs = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM user_preferences WHERE user_id = ${userId}
    `.catch(() => []);
    
    // Get favorite items from order history
    const favorites = await this.prisma.$queryRaw<any[]>`
      SELECT 
        item_id, item_name, store_id, store_name,
        COUNT(*) as order_count,
        MAX(created_at) as last_ordered
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = ${userId}
      GROUP BY item_id, item_name, store_id, store_name
      ORDER BY order_count DESC
      LIMIT 10
    `.catch(() => []);

    // Get favorite stores
    const favoriteStores = await this.prisma.$queryRaw<any[]>`
      SELECT 
        store_id, store_name, category,
        COUNT(*) as order_count,
        MAX(created_at) as last_ordered
      FROM orders
      WHERE user_id = ${userId}
      GROUP BY store_id, store_name, category
      ORDER BY order_count DESC
      LIMIT 5
    `.catch(() => []);

    const userPref = prefs[0] || {};

    return {
      dietaryType: userPref.dietary_type || null,
      favoriteCuisines: userPref.favorite_cuisines || [],
      favoriteItems: favorites.map(f => ({
        itemId: f.item_id,
        itemName: f.item_name,
        storeId: f.store_id,
        storeName: f.store_name,
        orderCount: parseInt(f.order_count),
        lastOrdered: f.last_ordered,
      })),
      dislikedItems: userPref.disliked_items || [],
      spiceLevel: userPref.spice_level || null,
      favoriteStores: favoriteStores.map(s => ({
        storeId: s.store_id,
        storeName: s.store_name,
        category: s.category,
        orderCount: parseInt(s.order_count),
        lastOrdered: s.last_ordered,
      })),
      preferredPayment: userPref.preferred_payment || 'cod',
      avgOrderValue: userPref.avg_order_value || 0,
      orderFrequency: userPref.order_frequency || 'occasional',
      preferredLanguage: userPref.language || 'hi',
      usesVoice: userPref.uses_voice || false,
      responseStyle: userPref.response_style || 'brief',
    };
  }

  /**
   * Get local knowledge for a city
   */
  async getLocalKnowledge(cityName: string): Promise<LocalKnowledge> {
    // Check cache
    const cached = this.cityKnowledgeCache.get(cityName.toLowerCase());
    if (cached) return cached;

    // Fetch from database
    const knowledge = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM city_knowledge WHERE LOWER(city_name) = LOWER(${cityName})
    `.catch(() => []);

    if (knowledge.length > 0) {
      const k = knowledge[0];
      const result: LocalKnowledge = {
        citySlang: k.slang || [],
        popularDishes: k.popular_dishes || [],
        localSpecialties: k.local_specialties || [],
        famousPlaces: k.famous_places || [],
        localTips: k.local_tips || [],
      };
      this.cityKnowledgeCache.set(cityName.toLowerCase(), result);
      return result;
    }

    // Return default Nashik knowledge
    return this.getDefaultNashikKnowledge();
  }

  /**
   * Default Nashik knowledge
   */
  private getDefaultNashikKnowledge(): LocalKnowledge {
    return {
      citySlang: [
        { slang: 'काय म्हणतोस', meaning: 'What do you say', usage: 'Greeting' },
        { slang: 'बरोबर', meaning: 'Correct/Right', usage: 'Agreement' },
        { slang: 'झकास', meaning: 'Awesome', usage: 'Appreciation' },
        { slang: 'एकदम भारी', meaning: 'Very good', usage: 'Appreciation' },
        { slang: 'पेटपूजा', meaning: 'Eating food', usage: 'Food context' },
      ],
      popularDishes: [
        'Misal Pav', 'Vada Pav', 'Poha', 'Sabudana Khichdi', 
        'Puran Poli', 'Modak', 'Thalipeeth', 'Pithla Bhakri',
        'Kolhapuri Chicken', 'Mutton Kolhapuri'
      ],
      localSpecialties: [
        'Nashik Grapes', 'Nashik Wine', 'Sula Wines',
        'Panchavati Thali', 'Godavari Fish'
      ],
      famousPlaces: [
        'Trimbakeshwar', 'Sula Vineyards', 'Pandavleni Caves',
        'Ramkund', 'Saptashrungi'
      ],
      localTips: [
        'Nashik is the wine capital of India',
        'Try Misal at Sadhana for authentic taste',
        'Grapes are best from February to April',
        'Kumbh Mela happens every 12 years here'
      ],
    };
  }

  /**
   * Generate contextual suggestions
   */
  private generateSuggestions(
    weather: WeatherContext,
    dateTime: DateTimeContext,
    preferences: UserPreferences,
    localKnowledge: LocalKnowledge
  ): ContextualSuggestions {
    const suggestions: ContextualSuggestions = {
      weatherBasedFood: [],
      weatherBasedMessage: '',
      timeBasedFood: [],
      timeBasedMessage: '',
      personalizedFood: [],
      personalizedMessage: '',
    };

    // Weather-based suggestions
    if (weather.isHot) {
      suggestions.weatherBasedFood = ['Cold Coffee', 'Lassi', 'Ice Cream', 'Chaas', 'Nimbu Pani'];
      suggestions.weatherBasedMessage = `Aaj bahut garmi hai (${weather.temperature}°C)! Kuch thanda le lo 🥤`;
    } else if (weather.isCold) {
      suggestions.weatherBasedFood = ['Garam Chai', 'Coffee', 'Soup', 'Pakode', 'Samosa'];
      suggestions.weatherBasedMessage = `Thandi hai aaj (${weather.temperature}°C)! Garam chai chalegi? ☕`;
    } else if (weather.isRainy) {
      suggestions.weatherBasedFood = ['Pakode', 'Chai', 'Bhajiya', 'Maggi', 'Corn'];
      suggestions.weatherBasedMessage = `Baarish ho rahi hai! Pakode aur chai ka mood hai? 🌧️`;
    }

    // Time-based suggestions
    switch (dateTime.mealTime) {
      case 'breakfast':
        suggestions.timeBasedFood = ['Poha', 'Upma', 'Paratha', 'Idli', 'Sandwich'];
        suggestions.timeBasedMessage = 'Good morning! Nashta kar liya?';
        break;
      case 'lunch':
        suggestions.timeBasedFood = ['Thali', 'Biryani', 'Rice', 'Roti Sabzi'];
        suggestions.timeBasedMessage = 'Lunch time! Kya khayenge aaj?';
        break;
      case 'snacks':
        suggestions.timeBasedFood = ['Samosa', 'Vada Pav', 'Chai', 'Bhel'];
        suggestions.timeBasedMessage = 'Snacks ka time! Kuch halka phulka?';
        break;
      case 'dinner':
        suggestions.timeBasedFood = ['Biryani', 'Paneer', 'Thali', 'Noodles'];
        suggestions.timeBasedMessage = 'Dinner time! Aaj kya special banaye?';
        break;
      case 'late_night':
        suggestions.timeBasedFood = ['Pizza', 'Burger', 'Maggi', 'Ice Cream'];
        suggestions.timeBasedMessage = 'Late night hunger? Quick bites available!';
        break;
    }

    // Personalized suggestions
    if (preferences.favoriteItems.length > 0) {
      suggestions.personalizedFood = preferences.favoriteItems.slice(0, 3).map(f => f.itemName);
      suggestions.personalizedMessage = `Aapka favorite ${preferences.favoriteItems[0].itemName} phir se order karein?`;
    }

    // Festival suggestions
    const festival = this.festivals.find(f => {
      const diff = Math.ceil((new Date(f.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 3;
    });
    
    if (festival) {
      suggestions.festivalFood = festival.foods;
      suggestions.festivalMessage = dateTime.isFestivalToday 
        ? `${festival.nameHindi} ki shubhkamnayein! 🎉 Special ${festival.foods[0]} try karein?`
        : `${festival.nameHindi} aa rahi hai! ${festival.foods.join(', ')} ka order lagayein?`;
    }

    return suggestions;
  }

  /**
   * Get active data sources from database
   */
  private async getActiveDataSources(type: string): Promise<DataSource[]> {
    try {
      const sources = await this.prisma.$queryRaw<DataSource[]>`
        SELECT * FROM data_sources 
        WHERE type = ${type} AND is_active = true
        ORDER BY priority ASC
      `;
      return sources;
    } catch {
      // Return default sources
      return this.getDefaultSources(type);
    }
  }

  /**
   * Default sources if database not set up
   */
  private getDefaultSources(type: string): DataSource[] {
    if (type === 'weather') {
      return [
        { id: '1', name: 'Open-Meteo', provider: 'open_meteo', type: 'weather', priority: 1, isActive: true },
        { id: '2', name: 'wttr.in', provider: 'wttr_in', type: 'weather', priority: 2, isActive: true },
      ];
    }
    return [];
  }

  /**
   * Cache weather in database
   */
  private async cacheWeatherInDb(cacheKey: string, weather: WeatherContext): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO weather_cache (cache_key, data, source, fetched_at)
      VALUES (${cacheKey}, ${JSON.stringify(weather)}::jsonb, ${weather.source}, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET 
        data = ${JSON.stringify(weather)}::jsonb,
        source = ${weather.source},
        fetched_at = NOW()
    `.catch(() => {});
  }

  /**
   * Get weather from DB cache
   */
  private async getWeatherFromDb(cacheKey: string): Promise<WeatherContext> {
    const cached = await this.prisma.$queryRaw<any[]>`
      SELECT data FROM weather_cache WHERE cache_key = ${cacheKey}
    `.catch(() => []);

    if (cached.length > 0) {
      return cached[0].data;
    }

    // Return default weather
    return {
      temperature: 28,
      feelsLike: 30,
      humidity: 60,
      condition: 'partly cloudy',
      conditionHindi: 'आंशिक बादल',
      isHot: false,
      isCold: false,
      isRainy: false,
      lastUpdated: new Date(),
      source: 'default',
    };
  }

  /**
   * Map Open-Meteo weather codes
   */
  private mapWeatherCode(code: number): { en: string; hi: string } {
    const codes: Record<number, { en: string; hi: string }> = {
      0: { en: 'clear sky', hi: 'साफ आसमान' },
      1: { en: 'mainly clear', hi: 'मुख्यतः साफ' },
      2: { en: 'partly cloudy', hi: 'आंशिक बादल' },
      3: { en: 'overcast', hi: 'घने बादल' },
      45: { en: 'foggy', hi: 'कोहरा' },
      48: { en: 'foggy', hi: 'कोहरा' },
      51: { en: 'light drizzle', hi: 'हल्की बूंदाबांदी' },
      53: { en: 'drizzle', hi: 'बूंदाबांदी' },
      55: { en: 'heavy drizzle', hi: 'तेज़ बूंदाबांदी' },
      61: { en: 'light rain', hi: 'हल्की बारिश' },
      63: { en: 'rain', hi: 'बारिश' },
      65: { en: 'heavy rain', hi: 'तेज़ बारिश' },
      80: { en: 'rain showers', hi: 'बौछार' },
      95: { en: 'thunderstorm', hi: 'आंधी-तूफान' },
    };
    return codes[code] || { en: 'unknown', hi: 'अज्ञात' };
  }

  /**
   * Translate condition to Hindi
   */
  private translateCondition(condition: string): string {
    const translations: Record<string, string> = {
      'clear': 'साफ',
      'sunny': 'धूप',
      'cloudy': 'बादल',
      'rain': 'बारिश',
      'drizzle': 'बूंदाबांदी',
      'fog': 'कोहरा',
      'mist': 'धुंध',
      'thunderstorm': 'आंधी',
      'snow': 'बर्फ',
      'haze': 'धुंधलका',
    };
    
    const lower = condition.toLowerCase();
    for (const [key, value] of Object.entries(translations)) {
      if (lower.includes(key)) return value;
    }
    return condition;
  }

  /**
   * Get user info
   */
  private async getUserInfo(userId: string): Promise<any> {
    const user = await this.prisma.$queryRaw<any[]>`
      SELECT u.*, z.zone_name, z.city_name, z.state_name
      FROM users u
      LEFT JOIN zones z ON u.zone_id = z.id
      WHERE u.id = ${userId}
    `.catch(() => []);
    
    return user[0] || { cityName: 'Nashik', stateName: 'Maharashtra', language: 'hi' };
  }

  /**
   * Load city knowledge on startup
   */
  private async loadCityKnowledge(): Promise<void> {
    // Pre-load Nashik knowledge
    this.cityKnowledgeCache.set('nashik', this.getDefaultNashikKnowledge());
    this.logger.log('City knowledge loaded');
  }

  /**
   * Refresh weather cache
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshWeatherCache(): Promise<void> {
    this.logger.log('Refreshing weather cache...');
    // Clear old cache entries
    for (const [key, value] of this.weatherCache.entries()) {
      if (Date.now() - value.lastUpdated.getTime() > 60 * 60 * 1000) {
        this.weatherCache.delete(key);
      }
    }
  }
}

interface DataSource {
  id: string;
  name: string;
  provider: string;
  type: string;
  priority: number;
  isActive: boolean;
  apiKey?: string;
  endpoint?: string;
}
