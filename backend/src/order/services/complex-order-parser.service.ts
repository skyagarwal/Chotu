/**
 * Complex Order Parser Service
 * 
 * Handles complex natural language orders like:
 * - "We are 3 people, very hungry, under 1000"
 * - "Order veg food for 4, deliver in 45 mins"
 * - "Dominos se pizza, 2 log hai"
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Parsed complex order context
 */
export interface ParsedComplexOrder {
  // Core extraction
  intent: 'group_order' | 'budget_order' | 'time_constrained' | 'specific_restaurant' | 'regular_order';
  confidence: number;
  
  // Group info
  groupSize?: number;
  hungerLevel?: 'light' | 'normal' | 'hungry' | 'very_hungry' | 'starving';
  
  // Constraints
  budget?: {
    amount: number;
    type: 'total' | 'per_person';
    currency: 'INR';
  };
  timeConstraint?: {
    minutes: number;
    type: 'max_delivery' | 'arrive_by';
    isUrgent: boolean;
  };
  
  // Preferences
  dietary?: string[];
  cuisines?: string[];
  restaurant?: {
    name: string;
    confidence: number;
  };
  
  // Meal context
  mealType?: 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'late_night';
  occasion?: string;
  
  // Portions
  portionPreference?: 'small' | 'normal' | 'large';
  wantsVariety?: boolean;
  isShareable?: boolean;
  
  // Extracted food items
  specificItems?: string[];
  
  // Raw for context
  originalMessage: string;
  detectedLanguage: 'hi' | 'en' | 'hinglish' | 'mr';
}

/**
 * Group requirements calculated from parsed order
 */
export interface GroupRequirements {
  mainCourses: number;
  sides: number;
  drinks: number;
  desserts: number;
  
  budgetAllocation: {
    mains: number;
    sides: number;
    drinks: number;
    desserts: number;
  };
  
  calorieEstimate: number;  // Total calories needed
  perPersonCalories: number;
}

@Injectable()
export class ComplexOrderParserService {
  private readonly logger = new Logger(ComplexOrderParserService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== PATTERN DEFINITIONS ====================
  
  // Group size patterns (Hindi, Hinglish, English)
  private readonly groupPatterns = [
    { pattern: /(\d+)\s*(?:log|logon|लोग|लोगों)/i, lang: 'hi' },
    { pattern: /hum\s*(\d+)\s*(?:log|hai|hain)/i, lang: 'hinglish' },
    { pattern: /(\d+)\s*(?:banda|bandey|bande)/i, lang: 'hinglish' },
    { pattern: /we\s*(?:are\s*)?(\d+)/i, lang: 'en' },
    { pattern: /(\d+)\s*(?:of\s*us|people|persons|members)/i, lang: 'en' },
    { pattern: /(?:family|group|party)\s*(?:of\s*)?(\d+)/i, lang: 'en' },
    { pattern: /for\s*(\d+)\s*(?:people|persons)?/i, lang: 'en' },
  ];

  // Hunger level patterns
  private readonly hungerPatterns: Record<string, RegExp[]> = {
    starving: [
      /bhook\s*(?:se\s*)?(?:mar|marna|die)/i,
      /starving|dying\s*of\s*hunger/i,
      /pet\s*(?:mein\s*)?choohe\s*daud/i,  // "rats running in stomach"
    ],
    very_hungry: [
      /bahut\s*(?:zyada\s*)?(?:bhook|bhukhe)/i,
      /very\s*hungry|super\s*hungry|famished/i,
      /बहुत\s*भूख/i,
    ],
    hungry: [
      /bhook(?:h)?(?:e|a)?\b/i,
      /hungry/i,
      /भूख/i,
    ],
    light: [
      /halka|thoda\s*sa|light/i,
      /हल्का/i,
      /not\s*(?:very\s*)?hungry/i,
    ],
  };

  // Budget patterns
  private readonly budgetPatterns = [
    { pattern: /under\s*[₹rs]?\s*(\d+)/i, type: 'total' },
    { pattern: /[₹rs]?\s*(\d+)\s*(?:ke?\s*andar|mein|me|tak)/i, type: 'total' },
    { pattern: /budget\s*(?:hai|is|:)?\s*[₹rs]?\s*(\d+)/i, type: 'total' },
    { pattern: /max(?:imum)?\s*[₹rs]?\s*(\d+)/i, type: 'total' },
    { pattern: /within\s*[₹rs]?\s*(\d+)/i, type: 'total' },
    { pattern: /[₹rs]?\s*(\d+)\s*(?:per\s*person|per\s*head|ek\s*ka)/i, type: 'per_person' },
    { pattern: /(\d+)\s*(?:rupees?|rs|₹)/i, type: 'total' },  // Fallback
  ];

  // Time constraint patterns
  private readonly timePatterns = [
    { pattern: /(\d+)\s*(?:mins?|minutes?)\s*(?:mein|me|ke?\s*andar|within|tak)/i, isUrgent: false },
    { pattern: /(\d+)\s*(?:mins?|minutes?)/i, isUrgent: false },
    { pattern: /(?:by\s*)?(\d{1,2}):?(\d{2})?\s*(?:pm|am)?/i, isUrgent: false },  // Time based
    { pattern: /jaldi|quick(?:ly)?|fast|asap|urgent|turant|abhi/i, isUrgent: true },
    { pattern: /जल्दी|तुरंत|अभी/i, isUrgent: true },
  ];

  // Dietary patterns
  private readonly dietaryPatterns = {
    veg: [/\b(?:veg|vegetarian|shakahari|शाकाहारी)\b/i, /(?<!non[\s-]?)veg\b/i],
    non_veg: [/\b(?:non[\s-]?veg|meat|chicken|mutton|fish|नॉन\s*वेज)\b/i],
    jain: [/\b(?:jain|जैन|no[\s-]?onion|no[\s-]?garlic|pyaaz[\s-]?nahi)\b/i],
    vegan: [/\b(?:vegan|plant[\s-]?based|dairy[\s-]?free)\b/i],
    egg: [/\b(?:egg(?:etarian)?|anda|ande|अंडा)\b/i],
    halal: [/\b(?:halal|हलाल)\b/i],
  };

  // Cuisine patterns
  private readonly cuisinePatterns: Record<string, RegExp> = {
    chinese: /\b(?:chinese|चाइनीज़|manchurian|chowmein|noodles)\b/i,
    indian: /\b(?:indian|desi|bharatiya)\b/i,
    north_indian: /\b(?:north\s*indian|punjabi|mughlai|पंजाबी)\b/i,
    south_indian: /\b(?:south\s*indian|dosa|idli|vada|साउथ\s*इंडियन)\b/i,
    italian: /\b(?:italian|pizza|pasta|इटालियन)\b/i,
    fast_food: /\b(?:fast\s*food|burger|fries|sandwich)\b/i,
    street_food: /\b(?:street\s*food|chaat|pani\s*puri|samosa)\b/i,
    biryani: /\b(?:biryani|biriyani|बिरयानी)\b/i,
    maharashtrian: /\b(?:maharashtrian|marathi|misal|vada\s*pav|महाराष्ट्रीयन)\b/i,
  };

  // Common restaurant name patterns (to extract from context)
  private readonly restaurantIndicators = [
    /(?:from|se)\s+([A-Za-z][A-Za-z\s']+?)(?:\s+(?:ka|ki|ke|se|from|order|mangao)|\s*[,.]|\s*$)/i,
    /([A-Za-z][A-Za-z\s']+?)\s+(?:ka|ki|ke)\s+(?:khana|food|pizza|burger|biryani)/i,
    /order\s+(?:from\s+)?([A-Za-z][A-Za-z\s']+)/i,
    /([A-Za-z][A-Za-z\s']+?)\s+(?:pe|par|mein|se)\s+order/i,
  ];

  // Words to exclude from restaurant names
  private readonly excludeFromRestaurant = new Set([
    'the', 'a', 'an', 'some', 'any', 'good', 'best', 'nice', 'great',
    'food', 'order', 'want', 'need', 'please', 'quick', 'fast', 'veg',
    'non', 'cheap', 'expensive', 'yummy', 'tasty', 'healthy', 'fresh',
    'kuch', 'koi', 'acha', 'achha', 'badia', 'mast',
  ]);

  // ==================== MAIN PARSING METHOD ====================

  async parseComplexOrder(message: string): Promise<ParsedComplexOrder> {
    const startTime = Date.now();
    this.logger.log(`Parsing complex order: "${message.substring(0, 100)}..."`);

    const result: ParsedComplexOrder = {
      intent: 'regular_order',
      confidence: 0,
      originalMessage: message,
      detectedLanguage: this.detectLanguage(message),
    };

    // Extract all components
    await this.extractGroupSize(message, result);
    this.extractHungerLevel(message, result);
    this.extractBudget(message, result);
    this.extractTimeConstraint(message, result);
    this.extractDietary(message, result);
    this.extractCuisines(message, result);
    await this.extractRestaurant(message, result);
    this.extractMealContext(message, result);
    this.extractSpecificItems(message, result);
    
    // Determine primary intent
    result.intent = this.determineIntent(result);
    
    // Calculate final confidence
    result.confidence = Math.min(result.confidence, 1.0);

    this.logger.log(`Parsed in ${Date.now() - startTime}ms: intent=${result.intent}, confidence=${result.confidence.toFixed(2)}`);
    
    return result;
  }

  // ==================== EXTRACTION METHODS ====================

  private detectLanguage(message: string): 'hi' | 'en' | 'hinglish' | 'mr' {
    const devanagariCount = (message.match(/[\u0900-\u097F]/g) || []).length;
    const latinCount = (message.match(/[a-zA-Z]/g) || []).length;
    
    if (devanagariCount > latinCount * 2) return 'hi';
    if (latinCount > devanagariCount * 2) return 'en';
    return 'hinglish';
  }

  private async extractGroupSize(message: string, result: ParsedComplexOrder): Promise<void> {
    for (const { pattern } of this.groupPatterns) {
      const match = message.match(pattern);
      if (match) {
        const size = parseInt(match[1]);
        if (size > 0 && size <= 20) {  // Reasonable group size
          result.groupSize = size;
          result.confidence += 0.2;
          return;
        }
      }
    }
    
    // Check for implicit group indicators
    if (/\b(?:hum|we|office|family|friends|dost)\b/i.test(message)) {
      result.groupSize = result.groupSize || 2;  // Default assumption
      result.confidence += 0.05;
    }
  }

  private extractHungerLevel(message: string, result: ParsedComplexOrder): void {
    for (const [level, patterns] of Object.entries(this.hungerPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          result.hungerLevel = level as ParsedComplexOrder['hungerLevel'];
          result.confidence += 0.15;
          return;
        }
      }
    }
    
    // Default based on group size
    if (result.groupSize && result.groupSize >= 3) {
      result.hungerLevel = 'hungry';  // Groups usually order more
    }
  }

  private extractBudget(message: string, result: ParsedComplexOrder): void {
    for (const { pattern, type } of this.budgetPatterns) {
      const match = message.match(pattern);
      if (match) {
        let amount = parseInt(match[1]);
        
        // Sanity check
        if (amount > 0 && amount <= 50000) {
          // Convert per-person to total if we know group size
          if (type === 'per_person' && result.groupSize) {
            result.budget = {
              amount: amount * result.groupSize,
              type: 'total',
              currency: 'INR',
            };
          } else {
            result.budget = {
              amount,
              type: type as 'total' | 'per_person',
              currency: 'INR',
            };
          }
          result.confidence += 0.2;
          return;
        }
      }
    }
  }

  private extractTimeConstraint(message: string, result: ParsedComplexOrder): void {
    for (const { pattern, isUrgent } of this.timePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (isUrgent) {
          result.timeConstraint = {
            minutes: 30,  // Default urgent time
            type: 'max_delivery',
            isUrgent: true,
          };
          result.confidence += 0.15;
          return;
        }
        
        if (match[1]) {
          const minutes = parseInt(match[1]);
          if (minutes > 0 && minutes <= 180) {
            result.timeConstraint = {
              minutes,
              type: 'max_delivery',
              isUrgent: minutes <= 30,
            };
            result.confidence += 0.15;
            return;
          }
        }
      }
    }
  }

  private extractDietary(message: string, result: ParsedComplexOrder): void {
    const dietary: string[] = [];
    const lower = message.toLowerCase();
    
    // Check for explicit non-veg first (to avoid false positive from "veg" in "non-veg")
    let hasNonVeg = false;
    for (const pattern of this.dietaryPatterns.non_veg) {
      if (pattern.test(lower)) {
        dietary.push('non_veg');
        hasNonVeg = true;
        break;
      }
    }
    
    // Check for veg only if non-veg not found
    if (!hasNonVeg) {
      for (const pattern of this.dietaryPatterns.veg) {
        if (pattern.test(lower)) {
          dietary.push('veg');
          break;
        }
      }
    }
    
    // Check other dietary restrictions
    for (const [type, patterns] of Object.entries(this.dietaryPatterns)) {
      if (type === 'veg' || type === 'non_veg') continue;
      
      for (const pattern of patterns) {
        if (pattern.test(lower)) {
          dietary.push(type);
          break;
        }
      }
    }
    
    if (dietary.length > 0) {
      result.dietary = dietary;
      result.confidence += 0.1;
    }
  }

  private extractCuisines(message: string, result: ParsedComplexOrder): void {
    const cuisines: string[] = [];
    
    for (const [cuisine, pattern] of Object.entries(this.cuisinePatterns)) {
      if (pattern.test(message)) {
        cuisines.push(cuisine);
      }
    }
    
    if (cuisines.length > 0) {
      result.cuisines = cuisines;
      result.confidence += 0.1;
    }
  }

  private async extractRestaurant(message: string, result: ParsedComplexOrder): Promise<void> {
    for (const pattern of this.restaurantIndicators) {
      const match = message.match(pattern);
      if (match) {
        const name = match[1].trim();
        const words = name.toLowerCase().split(/\s+/);
        
        // Check if it's a valid restaurant name (not common words)
        const validWords = words.filter(w => !this.excludeFromRestaurant.has(w));
        if (validWords.length > 0 && name.length >= 3) {
          // Try to verify restaurant exists in our database
          const verified = await this.verifyRestaurant(name);
          
          result.restaurant = {
            name: verified?.name || name,
            confidence: verified ? 0.9 : 0.6,
          };
          result.confidence += verified ? 0.2 : 0.1;
          return;
        }
      }
    }
  }

  private async verifyRestaurant(name: string): Promise<{ name: string } | null> {
    // Check against known restaurants in database
    // This would query OpenSearch or database for matching restaurant
    // For now, return null (will be implemented with search service)
    return null;
  }

  private extractMealContext(message: string, result: ParsedComplexOrder): void {
    const lower = message.toLowerCase();
    const hour = new Date().getHours();
    
    // Explicit meal mentions
    if (/\b(?:breakfast|nashta|नाश्ता)\b/i.test(lower)) {
      result.mealType = 'breakfast';
    } else if (/\b(?:lunch|khana|दोपहर\s*का\s*खाना)\b/i.test(lower)) {
      result.mealType = 'lunch';
    } else if (/\b(?:snacks?|evening\s*snack|chai\s*time)\b/i.test(lower)) {
      result.mealType = 'snacks';
    } else if (/\b(?:dinner|raat\s*ka\s*khana|रात\s*का\s*खाना)\b/i.test(lower)) {
      result.mealType = 'dinner';
    } else if (/\b(?:late\s*night|midnight|raat\s*mein)\b/i.test(lower)) {
      result.mealType = 'late_night';
    } else {
      // Infer from time of day
      if (hour >= 6 && hour < 11) result.mealType = 'breakfast';
      else if (hour >= 11 && hour < 15) result.mealType = 'lunch';
      else if (hour >= 15 && hour < 18) result.mealType = 'snacks';
      else if (hour >= 18 && hour < 22) result.mealType = 'dinner';
      else result.mealType = 'late_night';
    }
    
    // Occasion detection
    if (/\b(?:party|celebration|birthday|anniversary)\b/i.test(lower)) {
      result.occasion = 'party';
    } else if (/\b(?:office|meeting|work)\b/i.test(lower)) {
      result.occasion = 'office';
    } else if (/\b(?:date|romantic|special)\b/i.test(lower)) {
      result.occasion = 'special';
    }
  }

  private extractSpecificItems(message: string, result: ParsedComplexOrder): void {
    // Common food items to extract
    const foodItems = [
      'pizza', 'burger', 'biryani', 'dosa', 'idli', 'samosa', 'pav bhaji',
      'misal', 'vada pav', 'paneer', 'dal', 'roti', 'naan', 'rice', 'pulao',
      'manchurian', 'noodles', 'fried rice', 'momos', 'thali', 'combo',
      'shake', 'juice', 'lassi', 'chai', 'coffee', 'cold drink',
    ];
    
    const found: string[] = [];
    const lower = message.toLowerCase();
    
    for (const item of foodItems) {
      if (lower.includes(item)) {
        found.push(item);
      }
    }
    
    if (found.length > 0) {
      result.specificItems = found;
    }
  }

  private determineIntent(result: ParsedComplexOrder): ParsedComplexOrder['intent'] {
    // Priority based determination
    if (result.groupSize && result.groupSize > 1) {
      return 'group_order';
    }
    if (result.restaurant && result.restaurant.confidence > 0.7) {
      return 'specific_restaurant';
    }
    if (result.budget) {
      return 'budget_order';
    }
    if (result.timeConstraint?.isUrgent) {
      return 'time_constrained';
    }
    
    return 'regular_order';
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Calculate group requirements based on parsed order
   */
  calculateGroupRequirements(parsed: ParsedComplexOrder): GroupRequirements {
    const groupSize = parsed.groupSize || 1;
    const hungerMultiplier = this.getHungerMultiplier(parsed.hungerLevel);
    
    // Base portions per person
    const baseMain = 1;
    const baseSide = 0.5;
    const baseDrink = 1;
    const baseDessert = 0.3;
    
    // Calculate with hunger adjustment
    const mainCourses = Math.ceil(groupSize * baseMain * hungerMultiplier);
    const sides = Math.ceil(groupSize * baseSide * hungerMultiplier);
    const drinks = groupSize;  // Always 1 per person
    const desserts = parsed.hungerLevel === 'light' ? 0 : Math.ceil(groupSize * baseDessert);
    
    // Calorie estimates
    const baseCalories = 700;  // Per person normal meal
    const totalCalories = Math.round(groupSize * baseCalories * hungerMultiplier);
    
    // Budget allocation
    const budgetAllocation = {
      mains: 0.55,
      sides: 0.20,
      drinks: 0.15,
      desserts: 0.10,
    };
    
    return {
      mainCourses,
      sides,
      drinks,
      desserts,
      budgetAllocation,
      calorieEstimate: totalCalories,
      perPersonCalories: Math.round(totalCalories / groupSize),
    };
  }

  private getHungerMultiplier(level?: string): number {
    const multipliers: Record<string, number> = {
      light: 0.7,
      normal: 1.0,
      hungry: 1.3,
      very_hungry: 1.6,
      starving: 2.0,
    };
    return multipliers[level || 'normal'] || 1.0;
  }
}
