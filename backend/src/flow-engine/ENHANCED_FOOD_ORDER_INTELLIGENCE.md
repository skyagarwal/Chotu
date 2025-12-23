# Enhanced Food Order Intelligence System

## Overview

This document outlines the enhancements needed to handle complex food ordering scenarios like:
- **Group Orders**: "We are 3 people, very hungry, make a good order under ₹1000"
- **Contextual Orders**: "Veg food that can reach in 45 mins"
- **Restaurant-Specific**: "Order from Dominos" or "I love Peshwa Pavilion"
- **Value Communication**: "Why is Mangwale better?"

## 1. Character System Enhancements (Chotu & Beyond)

### Current State
- Chotu is defined in `voice_characters` table with:
  - Personality JSON (background, style)
  - Traits array
  - Emotions presets
  - Language settings (Hindi, English, Marathi)

### Enhanced Character Schema

```sql
-- Character modules/contexts (when to use which personality mode)
CREATE TABLE voice_character_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES voice_characters(id),
  context_name VARCHAR(50) NOT NULL,  -- 'food_order', 'support', 'greeting', 'complaint'
  system_prompt_modifier TEXT,         -- Additional prompt for this context
  tone_adjustment JSONB DEFAULT '{}',  -- {exaggeration: +0.1, speed: -0.05}
  greeting_templates TEXT[],
  farewell_templates TEXT[],
  error_templates TEXT[],
  upsell_templates TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Character knowledge base (what Chotu knows about)
CREATE TABLE voice_character_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES voice_characters(id),
  topic VARCHAR(100),           -- 'local_food', 'nashik_specialties', 'pricing'
  knowledge_text TEXT,          -- Facts Chotu can reference
  use_in_prompts BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Character responses bank (curated responses)
CREATE TABLE voice_character_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES voice_characters(id),
  intent VARCHAR(100),          -- 'group_order', 'budget_constraint', 'hurry'
  language VARCHAR(10),
  response_template TEXT,       -- "Arey {{user_name}}, 3 log hungry hai? Main set kar deta hoon!"
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  use_count INT DEFAULT 0
);
```

### New Characters to Add

```typescript
// In voice-characters.service.ts - seedDefaultCharacters()

const characters = [
  {
    name: 'chotu',
    displayName: 'छोटू - The Helpful Assistant',
    description: 'A sweet, innocent village boy working in the city. Eager to help.',
    personality: {
      background: 'Young village boy from Nashik, knows local food well',
      style: 'Warm, friendly, speaks Hinglish naturally',
      expertise: ['nashik_food', 'local_restaurants', 'quick_service'],
      quirks: ['Says "Sahab/Didi" respectfully', 'Gets excited about good deals'],
    },
    traits: ['helpful', 'innocent', 'enthusiastic', 'local-expert'],
  },
  {
    name: 'meera',
    displayName: 'मीरा - The Food Expert',
    description: 'Sophisticated food connoisseur who knows cuisines and nutrition.',
    personality: {
      background: 'Food blogger and nutrition enthusiast from Mumbai',
      style: 'Polished, knowledgeable, speaks mix of Hindi/English',
      expertise: ['nutrition', 'cuisines', 'dietary_restrictions', 'portions'],
      quirks: ['Mentions calorie info', 'Suggests healthy swaps'],
    },
    traits: ['knowledgeable', 'health-conscious', 'sophisticated', 'detail-oriented'],
  },
  {
    name: 'raju',
    displayName: 'राजू - The Deal Hunter',
    description: 'Street-smart guy who knows all the best deals and value options.',
    personality: {
      background: 'Experienced delivery partner, knows all shortcuts and deals',
      style: 'Casual, street-smart, value-focused',
      expertise: ['deals', 'combos', 'value_for_money', 'quick_delivery'],
      quirks: ['Always finds a discount', 'Knows fastest routes'],
    },
    traits: ['savvy', 'practical', 'deal-finder', 'efficient'],
  }
];
```

## 2. Group Order Intelligence

### Enhanced Context Extraction

```typescript
// src/order/interfaces/group-order.interface.ts

export interface GroupOrderContext {
  // People
  groupSize: number;              // "3 people"
  hungerLevel: 'light' | 'normal' | 'hungry' | 'very_hungry' | 'starving';
  
  // Budget
  totalBudget: number;            // "under 1000"
  perPersonBudget?: number;       // Calculated: 1000/3 = ~333
  
  // Time constraint
  maxDeliveryTime?: number;       // "in 45 mins"
  
  // Preferences
  dietaryTypes: ('veg' | 'non_veg' | 'egg' | 'vegan' | 'jain')[];
  cuisinePreferences?: string[];
  
  // Restaurant constraint
  specificRestaurant?: string;
  excludeRestaurants?: string[];
  
  // Special requests
  portionSize: 'small' | 'normal' | 'large';
  shareability: boolean;          // Can items be shared?
  variety: boolean;               // Want variety or same items?
}

export interface GroupOrderRecommendation {
  restaurant: {
    id: string;
    name: string;
    deliveryTime: number;
    rating: number;
  };
  items: GroupOrderItem[];
  totalCost: number;
  perPersonCost: number;
  reasoning: string;              // "This combo feeds 3 hungry people well"
  savingsNote?: string;           // "You save ₹150 vs ordering separately"
}

export interface GroupOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  servesPersons: number;          // "Serves 2-3"
  isShareable: boolean;
  dietary: string;
  category: 'main' | 'side' | 'drink' | 'dessert';
}
```

### Smart Portion Calculator

```typescript
// src/order/services/portion-calculator.service.ts

@Injectable()
export class PortionCalculatorService {
  
  // Hunger level to calorie multiplier
  private readonly hungerMultipliers = {
    light: 0.7,      // ~500 cal/person
    normal: 1.0,     // ~700 cal/person
    hungry: 1.3,     // ~900 cal/person
    very_hungry: 1.6, // ~1100 cal/person
    starving: 2.0,   // ~1400 cal/person
  };

  // Category requirements per person (hungry level = normal)
  private readonly basePortions = {
    main: 1,         // 1 main course per person
    side: 0.5,       // 1 side per 2 people
    drink: 1,        // 1 drink per person
    dessert: 0.33,   // 1 dessert per 3 people
  };

  calculateGroupRequirements(context: GroupOrderContext): GroupRequirements {
    const multiplier = this.hungerMultipliers[context.hungerLevel];
    const { groupSize } = context;
    
    return {
      mainCourses: Math.ceil(groupSize * this.basePortions.main * multiplier),
      sides: Math.ceil(groupSize * this.basePortions.side * multiplier),
      drinks: groupSize, // Always 1 per person
      desserts: context.hungerLevel === 'light' ? 0 : Math.ceil(groupSize * this.basePortions.dessert),
      
      // Budget allocation
      budgetAllocation: {
        mains: 0.55,      // 55% on mains
        sides: 0.20,      // 20% on sides
        drinks: 0.15,     // 15% on drinks
        desserts: 0.10,   // 10% on desserts
      },
      
      // Per-category budget
      mainBudget: context.totalBudget * 0.55,
      sideBudget: context.totalBudget * 0.20,
      drinkBudget: context.totalBudget * 0.15,
      dessertBudget: context.totalBudget * 0.10,
    };
  }

  // Find items that fit the group
  async findOptimalItems(
    requirements: GroupRequirements,
    dietary: string[],
    restaurant?: string
  ): Promise<GroupOrderItem[]> {
    // Implementation: Search OpenSearch with:
    // 1. Filter by dietary
    // 2. Sort by "serves" field and value
    // 3. Optimize for shareability
    // 4. Stay within budget
  }
}
```

## 3. Enhanced NLU Extraction

### Complex Query Parser

```typescript
// src/nlu/services/complex-order-parser.service.ts

export interface ParsedComplexOrder {
  // Core extraction
  intent: 'group_order' | 'budget_order' | 'time_constrained' | 'specific_restaurant';
  confidence: number;
  
  // Group info
  groupSize?: number;
  hungerLevel?: string;
  
  // Constraints
  budget?: {
    amount: number;
    type: 'total' | 'per_person';
  };
  timeConstraint?: {
    minutes: number;
    type: 'max_delivery' | 'arrive_by';
  };
  
  // Preferences
  dietary?: string[];
  cuisines?: string[];
  restaurant?: string;
  
  // Mood/occasion
  occasion?: string;
  mood?: string;
  
  // Original entities for context
  rawEntities: Record<string, any>;
}

@Injectable()
export class ComplexOrderParserService {
  
  // Patterns for group detection
  private readonly groupPatterns = [
    /(\d+)\s*(?:log|logon|people|persons|banda|bandey)/i,
    /hum\s*(\d+)\s*(?:log|hai)/i,
    /we\s*are\s*(\d+)/i,
    /(\d+)\s*of\s*us/i,
    /(?:family|group)\s*of\s*(\d+)/i,
  ];
  
  // Hunger patterns
  private readonly hungerPatterns = {
    starving: /bhook\s*lag\s*rahi|starving|dying\s*of\s*hunger/i,
    very_hungry: /bahut\s*bhook|very\s*hungry|famished/i,
    hungry: /bhook|hungry/i,
    light: /halka|light|thoda\s*sa/i,
  };
  
  // Budget patterns (₹, Rs, rupees, under, max, within)
  private readonly budgetPatterns = [
    /under\s*[₹rs]?\s*(\d+)/i,
    /(\d+)\s*(?:rs|rupees|₹)\s*(?:mein|me|tak|ke\s*andar|under)/i,
    /budget\s*(?:hai|is)?\s*[₹rs]?\s*(\d+)/i,
    /max(?:imum)?\s*[₹rs]?\s*(\d+)/i,
    /within\s*[₹rs]?\s*(\d+)/i,
  ];
  
  // Time patterns
  private readonly timePatterns = [
    /(\d+)\s*(?:mins?|minutes?)\s*(?:mein|me|tak|ke\s*andar|within)/i,
    /(\d+)\s*(?:mins?|minutes?)/i,
    /jaldi|quick(?:ly)?|fast|asap|urgent/i,
  ];

  async parseComplexOrder(message: string): Promise<ParsedComplexOrder> {
    const result: ParsedComplexOrder = {
      intent: 'group_order',
      confidence: 0,
      rawEntities: {},
    };
    
    // Extract group size
    for (const pattern of this.groupPatterns) {
      const match = message.match(pattern);
      if (match) {
        result.groupSize = parseInt(match[1]);
        result.confidence += 0.2;
        break;
      }
    }
    
    // Extract hunger level
    for (const [level, pattern] of Object.entries(this.hungerPatterns)) {
      if (pattern.test(message)) {
        result.hungerLevel = level;
        result.confidence += 0.15;
        break;
      }
    }
    
    // Extract budget
    for (const pattern of this.budgetPatterns) {
      const match = message.match(pattern);
      if (match) {
        result.budget = {
          amount: parseInt(match[1]),
          type: 'total', // Assume total unless "per person" mentioned
        };
        result.confidence += 0.2;
        break;
      }
    }
    
    // Extract time constraint
    for (const pattern of this.timePatterns) {
      if (typeof pattern === 'object') {
        const match = message.match(pattern);
        if (match && match[1]) {
          result.timeConstraint = {
            minutes: parseInt(match[1]),
            type: 'max_delivery',
          };
          result.confidence += 0.15;
          break;
        }
      }
    }
    
    // Extract dietary preferences
    result.dietary = this.extractDietary(message);
    if (result.dietary.length > 0) result.confidence += 0.1;
    
    // Extract restaurant name
    result.restaurant = await this.extractRestaurantName(message);
    if (result.restaurant) result.confidence += 0.2;
    
    // Determine primary intent
    result.intent = this.determineIntent(result);
    
    return result;
  }
  
  private extractDietary(message: string): string[] {
    const dietary: string[] = [];
    const lower = message.toLowerCase();
    
    if (/\b(veg|vegetarian|shakahari)\b/.test(lower) && !/non[\s-]?veg/.test(lower)) {
      dietary.push('veg');
    }
    if (/\b(non[\s-]?veg|meat|chicken|mutton)\b/.test(lower)) {
      dietary.push('non_veg');
    }
    if (/\b(jain|no[\s-]?onion|no[\s-]?garlic)\b/.test(lower)) {
      dietary.push('jain');
    }
    if (/\b(vegan|plant[\s-]?based)\b/.test(lower)) {
      dietary.push('vegan');
    }
    if (/\b(egg|anda|ande)\b/.test(lower)) {
      dietary.push('egg');
    }
    
    return dietary;
  }
  
  private async extractRestaurantName(message: string): Promise<string | undefined> {
    // Common restaurant patterns
    const patterns = [
      /(?:from|se)\s+([A-Za-z\s]+?)(?:\s+(?:ka|ki|ke|se|from)|\s*$)/i,
      /([A-Za-z\s]+?)\s+(?:ka|ki|ke)\s+(?:khana|food|pizza|burger)/i,
      /order\s+(?:from\s+)?([A-Za-z\s]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const name = match[1].trim();
        // Validate it's a restaurant name (not common words)
        if (!['the', 'a', 'some', 'any', 'good'].includes(name.toLowerCase())) {
          return name;
        }
      }
    }
    
    return undefined;
  }
}
```

## 4. Enhanced Food Order Flow States

### New States to Add

```typescript
// Additional states for food-order.flow.ts

// NEW: Understand complex group orders
understand_group_order: {
  type: 'action',
  description: 'Parse complex group order request',
  actions: [
    {
      id: 'parse_complex',
      executor: 'complex_order_parser',  // New executor
      config: {},
      output: 'group_context',
    },
    {
      id: 'validate_constraints',
      executor: 'llm',
      config: {
        systemPrompt: 'You validate food order constraints and ask clarifying questions if needed.',
        prompt: `Parsed order:
Group size: {{group_context.groupSize || 'not specified'}}
Budget: {{group_context.budget?.amount || 'not specified'}}
Time: {{group_context.timeConstraint?.minutes || 'not specified'}} mins
Dietary: {{group_context.dietary || 'any'}}

If any critical info is missing, ask ONE clarifying question.
If all info present, respond with "COMPLETE".`,
        temperature: 0.3,
        maxTokens: 100,
      },
      output: '_validation_result',
    }
  ],
  transitions: {
    complete: 'build_group_order',
    needs_clarification: 'clarify_group_details',
  },
},

// NEW: Clarify missing group details
clarify_group_details: {
  type: 'wait',
  description: 'Ask for missing group order details',
  actions: [
    {
      id: 'ask_clarification',
      executor: 'response',
      config: {
        message: '{{_validation_result}}',
      },
      output: '_last_response',
    }
  ],
  transitions: {
    user_message: 'understand_group_order',
  },
},

// NEW: Build optimal group order
build_group_order: {
  type: 'action',
  description: 'Find optimal items for group',
  actions: [
    {
      id: 'calculate_portions',
      executor: 'portion_calculator',  // New executor
      config: {
        groupSizePath: 'group_context.groupSize',
        hungerLevelPath: 'group_context.hungerLevel',
        budgetPath: 'group_context.budget.amount',
      },
      output: 'portion_requirements',
    },
    {
      id: 'search_optimal_items',
      executor: 'group_order_search',  // New executor
      config: {
        requirementsPath: 'portion_requirements',
        dietaryPath: 'group_context.dietary',
        restaurantPath: 'group_context.restaurant',
        maxDeliveryTimePath: 'group_context.timeConstraint.minutes',
      },
      output: 'group_recommendations',
    }
  ],
  transitions: {
    found: 'show_group_recommendations',
    partial_match: 'show_alternatives',
    no_match: 'no_results',
  },
},

// NEW: Show curated group recommendations
show_group_recommendations: {
  type: 'wait',
  description: 'Display group order recommendations with Chotu personality',
  actions: [
    {
      id: 'format_recommendations',
      executor: 'llm',
      config: {
        systemPrompt: `You are Chotu, a helpful food assistant. Present the group order recommendation enthusiastically.
Use Hinglish naturally. Show total cost, per-person cost, and why these items are good for the group.`,
        prompt: `Group: {{group_context.groupSize}} people, {{group_context.hungerLevel}} hunger
Budget: ₹{{group_context.budget.amount}}
Time: {{group_context.timeConstraint.minutes || 45}} mins

Recommended from {{group_recommendations.restaurant.name}}:
{{#each group_recommendations.items}}
- {{quantity}}x {{name}} - ₹{{price}} (serves {{servesPersons}})
{{/each}}

Total: ₹{{group_recommendations.totalCost}}
Per person: ₹{{group_recommendations.perPersonCost}}

Present this attractively. Mention why it's a good deal.`,
        temperature: 0.7,
        maxTokens: 300,
      },
      output: '_last_response',
    },
    {
      id: 'show_cards',
      executor: 'response',
      config: {
        dynamicMetadata: {
          cards: 'group_recommendations.cards',
          summary: {
            totalCost: '{{group_recommendations.totalCost}}',
            perPerson: '{{group_recommendations.perPersonCost}}',
            restaurant: '{{group_recommendations.restaurant.name}}',
            deliveryTime: '{{group_recommendations.restaurant.deliveryTime}}',
          }
        }
      }
    }
  ],
  transitions: {
    user_message: 'handle_group_response',
    confirm: 'check_auth_for_checkout',
    modify: 'modify_group_order',
    different_restaurant: 'build_group_order',
  },
},
```

## 5. Review & Rating Intelligence

### Review Data Enhancement

```sql
-- Enhanced item metadata for reviews/ratings
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS
  review_highlights JSONB DEFAULT '{}';
  -- {
  --   "positive": ["Fast delivery", "Fresh taste", "Good portions"],
  --   "negative": ["Sometimes spicy"],
  --   "mention_count": {"taste": 45, "quantity": 30, "speed": 25}
  -- }

-- Aggregated review stats (updated periodically)
CREATE TABLE item_review_stats (
  item_id VARCHAR(100) PRIMARY KEY,
  total_reviews INT DEFAULT 0,
  avg_rating DECIMAL(3,2),
  rating_distribution JSONB,  -- {5: 100, 4: 50, 3: 20, 2: 10, 1: 5}
  sentiment_score DECIMAL(3,2),  -- -1 to 1
  top_keywords TEXT[],
  common_complaints TEXT[],
  repeat_order_rate DECIMAL(3,2),  -- % of customers who reorder
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### Review Scraper (if needed)

For now, focus on internal review collection:

```typescript
// src/reviews/services/review-aggregator.service.ts

@Injectable()
export class ReviewAggregatorService {
  
  // Collect review after order completion
  async collectOrderReview(orderId: string, userId: string): Promise<void> {
    // Send review request 30 mins after delivery
    // In-app prompt or WhatsApp message
  }
  
  // Aggregate reviews for search ranking
  async aggregateItemReviews(itemId: string): Promise<ItemReviewStats> {
    const reviews = await this.getItemReviews(itemId);
    
    // Calculate sentiment from review text
    const sentiments = await this.analyzeSentiments(reviews);
    
    // Extract common keywords
    const keywords = this.extractKeywords(reviews);
    
    // Calculate repeat order rate
    const repeatRate = await this.calculateRepeatRate(itemId);
    
    return {
      totalReviews: reviews.length,
      avgRating: this.calculateAverage(reviews),
      sentimentScore: sentiments.average,
      topKeywords: keywords.positive,
      commonComplaints: keywords.negative,
      repeatOrderRate: repeatRate,
    };
  }
}
```

## 6. Pricing Transparency & Value Communication

### Why Mangwale is Better

```typescript
// src/pricing/services/value-proposition.service.ts

export interface ValueProposition {
  ourPrice: number;
  competitorEstimate: number;
  savings: number;
  savingsPercent: number;
  reasons: string[];
  displayMessage: string;  // Hinglish message
}

@Injectable()
export class ValuePropositionService {
  
  // Compare our pricing vs typical competitors
  calculateValueProposition(
    itemTotal: number,
    deliveryDistance: number,
    itemCount: number
  ): ValueProposition {
    // Our pricing
    const ourDeliveryFee = Math.max(deliveryDistance * 10, 30);
    const ourPackaging = 0;  // Free
    const ourTax = (itemTotal + ourDeliveryFee) * 0.05;
    const ourTotal = itemTotal + ourDeliveryFee + ourTax;
    
    // Typical competitor pricing (Zomato/Swiggy estimates)
    const competitorDeliveryFee = Math.max(deliveryDistance * 15, 40);
    const competitorPackaging = itemCount * 10;
    const competitorPlatformFee = 5;
    const competitorTax = (itemTotal + competitorDeliveryFee + competitorPackaging) * 0.05;
    const competitorTotal = itemTotal + competitorDeliveryFee + competitorPackaging + competitorPlatformFee + competitorTax;
    
    const savings = competitorTotal - ourTotal;
    const savingsPercent = (savings / competitorTotal) * 100;
    
    const reasons: string[] = [];
    if (ourDeliveryFee < competitorDeliveryFee) {
      reasons.push(`Lower delivery (₹${ourDeliveryFee} vs ₹${competitorDeliveryFee})`);
    }
    if (ourPackaging === 0) {
      reasons.push('No packaging charges');
    }
    reasons.push('No platform fee');
    reasons.push('Local Nashik business - supports community');
    
    return {
      ourPrice: ourTotal,
      competitorEstimate: competitorTotal,
      savings,
      savingsPercent,
      reasons,
      displayMessage: this.generateValueMessage(savings, reasons),
    };
  }
  
  private generateValueMessage(savings: number, reasons: string[]): string {
    if (savings > 50) {
      return `🎉 Mangwale se order karke ₹${Math.round(savings)} bachao! Humara delivery charge kam hai aur koi platform fee nahi.`;
    } else if (savings > 20) {
      return `💰 Good choice! You save ₹${Math.round(savings)} compared to other apps.`;
    }
    return '✨ Direct restaurant pricing, no hidden charges!';
  }
}
```

### Value Communication States

```typescript
// Add to food-order.flow.ts

show_value_proposition: {
  type: 'action',
  description: 'Show why Mangwale pricing is better',
  actions: [
    {
      id: 'calculate_value',
      executor: 'value_proposition',
      config: {
        itemTotalPath: 'pricing.itemsTotal',
        distancePath: 'distance',
        itemCountPath: 'selected_items.length',
      },
      output: 'value_comparison',
    },
    {
      id: 'show_value_message',
      executor: 'llm',
      config: {
        systemPrompt: 'You are Chotu. Explain pricing benefits naturally, not salesy.',
        prompt: `Our total: ₹{{pricing.total}}
Estimated on other apps: ₹{{value_comparison.competitorEstimate}}
Savings: ₹{{value_comparison.savings}}

Reasons:
{{#each value_comparison.reasons}}
- {{this}}
{{/each}}

Casually mention the savings in 1-2 sentences. Be genuine, not pushy.`,
        temperature: 0.7,
        maxTokens: 100,
      },
      output: '_value_message',
    }
  ],
  transitions: {
    success: 'show_order_summary',
  },
},
```

## 7. Implementation Priority

### Phase 1: Core Intelligence (Week 1-2)
1. ✅ Complex order parser service
2. ✅ Portion calculator service
3. ✅ Enhanced NLU for group orders
4. ✅ Group order search executor

### Phase 2: Character Enhancement (Week 2-3)
1. Add character context tables
2. Add knowledge base for Chotu
3. Create response bank
4. Add more characters (Meera, Raju)

### Phase 3: Value & Reviews (Week 3-4)
1. Value proposition service
2. Review aggregation
3. Pricing transparency messaging
4. Review-based ranking boost

### Phase 4: Data Enrichment (Ongoing)
1. Internal review collection after orders
2. Menu data enrichment (portions, serves)
3. Restaurant metadata (peak hours, specialties)

## 8. Database Migrations Needed

See: `prisma/migrations/enhanced_food_ordering.sql`

## 9. New Executors Required

1. `complex_order_parser` - Parse group/complex orders
2. `portion_calculator` - Calculate group requirements
3. `group_order_search` - Find optimal items for groups
4. `value_proposition` - Calculate and display pricing value

## 10. Testing Scenarios

```typescript
const testCases = [
  // Group orders
  "We are 3 people, very hungry, under 1000 ka order karo",
  "4 log hai, jaldi chahiye 45 mins mein, veg only",
  "Office lunch for 5 people, budget 2000, mix veg non-veg",
  
  // Restaurant specific
  "Dominos se pizza mangao",
  "Order from Peshwa Pavilion, 2 people",
  
  // Time constrained
  "Kuch bhi jaldi do 30 mins mein",
  "Quick lunch, office se order kar raha hoon",
  
  // Budget focused
  "Sasta aur acha khana, under 200 per person",
  "Best value biryani batao",
  
  // Dietary specific
  "Jain food for 3 people",
  "Pure veg, no onion garlic, quick delivery",
  
  // Value questions
  "Why should I order from Mangwale?",
  "How is your pricing different?",
];
```
