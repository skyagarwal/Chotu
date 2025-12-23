# 🧠 User Preference Data Research & Strategy

**Date**: January 2025  
**Goal**: Collect valuable user data for personalized conversations & future business insights  
**Current Tables**: `user_profiles`, `user_insights`, `user_interactions`, `user_search_patterns`

---

## 🎯 Why User Preference Data Matters

### Immediate Value (Now)
1. **Personalized Conversations**: AI adapts tone/suggestions based on past behavior
2. **Better Recommendations**: "Last time you ordered veg pizza, try our new veg burger?"
3. **Reduced Friction**: Auto-fill preferences (spice level, veg/non-veg, address)
4. **Smarter Search**: Learn what "budget-friendly" means for each user

### Future Value (6-12 months)
1. **Predictive Ordering**: "Friday 8pm = usually pizza order"
2. **Dynamic Pricing**: Personalized coupons based on price sensitivity
3. **Inventory Optimization**: Know which products sell to which user segments
4. **Churn Prevention**: Detect users losing interest, engage them proactively
5. **New Service Testing**: Target early adopters vs conservatives

---

## 📊 User Preference Categories (Industry Research)

### 1. **Food Preferences** (Critical for Food Module)

**What to Track**:
```typescript
{
  // Dietary Profile
  dietary_type: "vegetarian" | "non-vegetarian" | "vegan" | "jain" | "eggetarian",
  dietary_restrictions: ["no-onion", "no-garlic", "halal", "kosher"],
  allergies: ["peanuts", "dairy", "gluten", "shellfish"],
  
  // Taste Profile
  spice_level: "mild" | "medium" | "hot" | "extra-hot",
  preferred_cuisines: ["indian", "chinese", "italian", "mexican", "fast-food"],
  favorite_dishes: ["biryani", "pizza", "burger", "thali"],
  disliked_ingredients: ["mushroom", "paneer", "coconut"],
  
  // Ordering Patterns
  meal_types: ["breakfast", "lunch", "dinner", "snacks", "late-night"],
  preferred_meal_times: { breakfast: "8-10am", lunch: "12-2pm", dinner: "8-10pm" },
  typical_order_size: "solo" | "couple" | "family" | "party",
  
  // Recent History (Last 30 days)
  recent_orders: [
    { dish: "margherita-pizza", frequency: 5, last_ordered: "2025-01-15" },
    { dish: "masala-dosa", frequency: 3, last_ordered: "2025-01-10" }
  ]
}
```

**How to Collect**:
- ✅ **Explicit**: "Veg ya non-veg pasand hai?" (during onboarding)
- ✅ **Implicit**: Track actual orders, infer from search queries
- ✅ **Conversational**: "Last time spice tez thi, iss baar medium karoge?"

**Value**: 80% - Most critical for food delivery business

---

### 2. **Shopping Behavior** (E-commerce Module)

**What to Track**:
```typescript
{
  // Price Sensitivity
  price_sensitivity: "budget" | "value" | "premium" | "luxury",
  avg_basket_value: 450.00, // in rupees
  max_willingness_to_pay: 2000.00,
  discount_threshold: 20, // won't buy without 20% discount
  
  // Product Interests
  product_categories: ["groceries", "electronics", "fashion", "home-kitchen"],
  favorite_brands: ["amul", "samsung", "levis"],
  preferred_sizes: { tshirt: "L", shoes: "9" },
  
  // Shopping Style
  shopping_frequency: "daily" | "weekly" | "monthly" | "impulse",
  decision_speed: "fast" | "moderate" | "researcher", // how quickly they buy
  comparison_shopper: true, // compares 3+ options before buying
  
  // Product Lifecycle
  repurchase_items: [
    { product: "milk-1l", frequency: "weekly", next_expected: "2025-01-20" }
  ]
}
```

**How to Collect**:
- ✅ **Implicit**: Track search patterns (clicks before buy)
- ✅ **Conversational**: "Budget mein kuch dikha du?"
- ✅ **Historical**: Analyze purchase frequency

**Value**: 70% - Important for e-commerce revenue

---

### 3. **Communication Style** (AI Personality Adaptation)

**What to Track**:
```typescript
{
  // Tone Preferences
  communication_tone: "formal" | "casual" | "friendly" | "direct",
  language_preference: "en" | "hi" | "hinglish" | "mr" | "marathlish",
  emoji_tolerance: "love" | "moderate" | "minimal" | "hate",
  
  // Conversation Patterns
  message_length: "short" | "medium" | "long", // user's typical response length
  response_speed: "immediate" | "normal" | "slow", // how fast they reply
  question_type: "yes-no" | "descriptive" | "visual", // prefers buttons vs typing
  
  // Patience Level
  patience_level: "low" | "medium" | "high",
  tolerance_for_errors: "low" | "medium" | "high",
  needs_confirmation: true, // likes "Are you sure?" prompts
  
  // Time Preferences
  preferred_contact_time: ["morning", "afternoon", "evening", "night"],
  timezone_offset: "+05:30",
  weekend_shopper: true
}
```

**How to Collect**:
- ✅ **Implicit**: Analyze message patterns (length, emoji usage)
- ✅ **Behavioral**: Track response times, error corrections
- ✅ **Direct**: "Formal language ya casual?"

**Value**: 90% - CRITICAL for conversational AI quality

---

### 4. **Delivery Preferences** (Parcel/Food)

**What to Track**:
```typescript
{
  // Address Management
  saved_addresses: [
    { 
      type: "home", 
      address: "...", 
      coordinates: { lat, lng },
      instructions: "Ring doorbell, don't call",
      usage_frequency: 45 // times used
    }
  ],
  default_address: "home",
  work_address_timing: "9am-6pm", // only deliver during work hours
  
  // Delivery Timing
  usual_delivery_windows: ["12-2pm", "8-10pm"],
  avoid_times: ["6-8am"], // sleeping
  weekend_pattern: "late-morning", // different from weekdays
  
  // Delivery Instructions
  common_instructions: "Leave at gate",
  contact_preference: "call" | "message" | "doorbell",
  tip_behavior: "always" | "sometimes" | "never",
  average_tip: 20.00
}
```

**How to Collect**:
- ✅ **Explicit**: During address creation
- ✅ **Historical**: Track successful delivery times
- ✅ **Feedback**: "Delivery timing theek thi?"

**Value**: 75% - Reduces delivery failures

---

### 5. **Personality Traits** (Psychographic Profiling)

**What to Track** (Based on Conversations):
```typescript
{
  // Decision Style
  decisive: true, // knows what they want vs exploratory
  detail_oriented: false, // wants full details vs quick decisions
  price_conscious: true, // always asks "kitna hai?"
  
  // Lifestyle Indicators
  health_conscious: false, // searches for "healthy", "low-cal"
  tech_savvy: true, // uses app features easily
  busy_professional: true, // orders during lunch/dinner rush
  family_person: true, // orders family packs
  
  // Social Indicators
  early_adopter: true, // tries new items first
  influencer: false, // shares reviews, refers friends
  complainer: false, // files complaints frequently
  
  // Emotional Triggers
  impatient: false, // gets upset about delays
  polite: true, // uses "please", "thank you"
  humorous: true, // uses jokes, casual language
  trusting: true // accepts suggestions without questioning
}
```

**How to Collect**:
- ✅ **NLP Analysis**: Analyze conversation sentiment/tone
- ✅ **Behavioral**: Track exploration vs direct purchase
- ✅ **Timing**: Order patterns indicate lifestyle

**Value**: 85% - Enables micro-personalization

---

### 6. **Contextual Preferences** (Situational)

**What to Track**:
```typescript
{
  // Day-of-Week Patterns
  monday_pattern: "light-lunch", // different for each day
  friday_pattern: "heavy-dinner-party", // weekend mode
  
  // Weather-Based
  rainy_day_preference: "soup", // comfort food
  hot_day_preference: "cold-drinks",
  
  // Occasion-Based
  birthday_orders: ["cake", "party-snacks"], // detected from past
  festival_preferences: { diwali: "sweets", holi: "snacks" },
  
  // Mood Indicators (from conversation)
  happy_mood_items: ["pizza", "dessert"],
  stressed_mood_items: ["comfort-food", "chocolate"],
  
  // Financial Context
  month_start_spending: "high", // salary just credited
  month_end_spending: "low", // waiting for salary
  payday: 1 // estimated salary date
}
```

**How to Collect**:
- ✅ **Historical**: Detect patterns in order history
- ✅ **Conversational**: "Friday hai, party mood?"
- ✅ **External**: Weather API, festival calendar

**Value**: 95% - Predictive power for proactive suggestions

---

## 🏗️ Current Schema Utilization

### Existing Tables (Your DB)

#### 1. **user_profiles** ✅
Already has excellent fields:
```sql
- dietary_type, dietary_restrictions, allergies ✅
- favorite_cuisines, disliked_ingredients ✅
- avg_order_value, order_frequency ✅
- preferred_meal_times ✅
- price_sensitivity ✅
- communication_tone, personality_traits ✅
```

**Missing** (Should Add):
- spice_level
- preferred_cuisines (array)
- shopping_preferences (JSON)
- delivery_preferences (JSON)

#### 2. **user_insights** ✅
Perfect for extracted insights:
```sql
- insight_type: "food_preference" | "shopping_behavior" | "personality"
- insight_key: "spice_level" | "price_sensitivity"
- insight_value: "hot" | "budget"
- confidence: 0.85
```

**Use Case**: Store AI-extracted insights from conversations

#### 3. **user_interactions** ✅
Track behavioral data:
```sql
- interaction_type: "search" | "click" | "order" | "view"
- item_id: product/restaurant ID
- metadata: { price: 250, category: "pizza", time_spent: 45 }
```

**Use Case**: Build recommendation engine

#### 4. **user_search_patterns** ✅
Analyze search behavior:
```sql
- search_query: "veg pizza under 200"
- search_filters: { veg: true, price_max: 200 }
- result_clicked: 15
- result_ordered: true
```

**Use Case**: Improve search relevance

---

## 🎯 Recommended Schema Additions

### Add to `user_profiles`:
```sql
ALTER TABLE user_profiles 
ADD COLUMN spice_level VARCHAR(20),
ADD COLUMN preferred_cuisines TEXT[],
ADD COLUMN shopping_preferences JSONB DEFAULT '{}',
ADD COLUMN delivery_preferences JSONB DEFAULT '{}',
ADD COLUMN food_preferences JSONB DEFAULT '{}';
```

### New Table: `user_context` (For Real-Time Context)
```sql
CREATE TABLE user_context (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  context_type VARCHAR(50), -- 'mood', 'weather', 'occasion', 'financial'
  context_value VARCHAR(255),
  detected_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  confidence DECIMAL(5,4),
  
  INDEX idx_user_context_user (user_id),
  INDEX idx_user_context_type (context_type)
);
```

---

## 📈 Data Collection Strategy

### Phase 1: Passive Collection (Week 1-2)
**No user input required** - Just observe:

1. **Order History Analysis**:
   - Detect dietary type from orders (all veg = vegetarian)
   - Identify favorite cuisines (60% orders are chinese)
   - Calculate avg_order_value, order_frequency
   - Map delivery time patterns

2. **Conversation Analysis**:
   - Detect language preference (hinglish vs english)
   - Analyze message length/tone
   - Extract emoji usage patterns
   - Identify patience level (complaints vs appreciations)

3. **Search Behavior Tracking**:
   - Track what they search vs what they order
   - Measure decision time (search → order duration)
   - Identify price sensitivity (clicks on discounts)

**Implementation**: `src/personalization/passive-collector.service.ts`

---

### Phase 2: Conversational Collection (Week 3-4)
**Casual questions in flow**:

```
Bot: "Btw, spice kitna tez pasand hai? Mild, medium ya hot?"
User: "medium"
Bot: ✅ "Got it! Medium spice saved. Agli baar auto-select karunga 😊"
```

**Smart Questions**:
- After 3 veg orders: "Veg preference hai? Profile mein save kar loon?"
- After 5 budget orders: "Budget-friendly options dikhana hai default?"
- After location saved: "Delivery instructions? Gate pe chhod do ya doorbell?"

**Implementation**: `src/personalization/conversational-collector.service.ts`

---

### Phase 3: Gamified Collection (Week 5+)
**Users earn rewards for completing profile**:

```
Bot: "🎮 Profile Game khelo! Har answer = ₹2 reward
Question 1/10: Veg ya non-veg?"
[User answers]
Bot: "✅ +₹2! Next: Spice level?"
[Continues...]
Bot: "🎉 Profile 100% complete! ₹20 wallet mein credited!"
```

**Incentivizes**:
- Complete dietary profile: ₹20
- Save 3 addresses: ₹15
- Set meal time preferences: ₹10
- Total possible: ₹50

**Implementation**: Integrate with gamification system

---

## 🚀 Phase 2 Implementation Plan

### Step 1: Create User Preference Service (30 min)
```typescript
// src/personalization/user-preference.service.ts

@Injectable()
export class UserPreferenceService {
  
  async getPreferences(userId: number) {
    // Fetch from user_profiles + user_insights
    // Return merged preference object
  }
  
  async updatePreference(userId: number, key: string, value: any) {
    // Update user_profiles or create user_insight
  }
  
  async inferPreferences(userId: number) {
    // Analyze order history, search patterns
    // Generate insights with confidence scores
  }
}
```

### Step 2: Integrate with Agent Prompts (30 min)
```typescript
// src/agents/services/agent-orchestrator.service.ts

const preferences = await this.userPreference.getPreferences(userId);

const enhancedPrompt = `${basePrompt}

USER PREFERENCES (USE THESE):
- Dietary: ${preferences.dietary_type} ${preferences.dietary_restrictions.join(', ')}
- Spice Level: ${preferences.spice_level}
- Favorite Cuisines: ${preferences.favorite_cuisines.join(', ')}
- Price Range: ${preferences.price_sensitivity}
- Tone: ${preferences.communication_tone}

PERSONALIZATION RULES:
1. Always suggest ${preferences.dietary_type} options first
2. Never recommend ${preferences.disliked_ingredients.join(', ')}
3. Use ${preferences.communication_tone} language
4. Keep responses ${preferences.message_length}
`;
```

### Step 3: Add Preference Collection Hooks (1 hour)
```typescript
// After successful order
await this.userPreference.recordInteraction(userId, {
  type: 'order',
  items: orderItems,
  total: orderTotal,
  time: new Date(),
});

// Infer preferences
await this.userPreference.inferPreferences(userId);
```

### Step 4: Create Preference UI (Dashboard) (2 hours)
**Admin view** to see user preferences:
- Dietary profile completeness: 80%
- Shopping behavior: Budget-conscious, fast decider
- Communication style: Casual Hinglish, emoji lover
- Confidence scores for each insight

---

## 💡 Quick Wins (Implement First)

### 1. Dietary Preference (Highest Impact)
**Why**: Eliminates 50% of menu for vegans/vegetarians  
**How**: After 2 veg orders, ask: "Veg preference lagta hai? Confirm karoge?"  
**Value**: 40% faster ordering

### 2. Language Preference (Best UX)
**Why**: Users comfortable in their language  
**How**: Auto-detect from first message, confirm  
**Value**: 30% better engagement

### 3. Price Sensitivity (Revenue)
**Why**: Show relevant options first  
**How**: Track avg order value, click patterns  
**Value**: 25% conversion boost

### 4. Spice Level (Friction Reducer)
**Why**: Avoids "spice tez tha" complaints  
**How**: Ask after first order, save for future  
**Value**: 20% fewer complaints

### 5. Favorite Cuisines (Personalization)
**Why**: Proactive suggestions  
**How**: Track order patterns, offer to save  
**Value**: 50% repeat orders

---

## 📊 Expected Results (3 Months)

### Metrics:
- **Profile Completion**: 60% users with 5+ preferences saved
- **Order Speed**: 30% faster checkout (auto-filled preferences)
- **Repeat Rate**: 40% increase (personalized suggestions)
- **Satisfaction**: 25% fewer "wrong order" complaints
- **Revenue**: 15% higher AOV (better recommendations)

### User Experience:
```
Before: "Pizza chahiye" → Bot shows 50 options → User confused
After: "Pizza chahiye" → Bot: "Veg margherita (medium spice) like last time? ₹199" → User: "haan" → Done!
```

---

## 🔐 Privacy & Ethics

### What We Should Do:
✅ Transparent: "Profile complete karne se better suggestions milenge"  
✅ Control: Users can view/edit/delete preferences anytime  
✅ Consent: "Location save karoge?" not "Location saved"  
✅ Secure: Preferences encrypted, not shared with third parties  

### What We Should NOT Do:
❌ Don't track without consent  
❌ Don't share dietary info with advertisers  
❌ Don't make assumptions (ask before inferring)  
❌ Don't discriminate based on price sensitivity  

---

## 🎯 Summary: Most Valuable Data

### Top 10 Preferences to Track (Priority Order):

1. **Dietary Type** (veg/non-veg) - Eliminates 50% options ⭐⭐⭐⭐⭐
2. **Language Preference** (en/hi/hinglish) - Better UX ⭐⭐⭐⭐⭐
3. **Price Sensitivity** (budget/value/premium) - Revenue impact ⭐⭐⭐⭐⭐
4. **Spice Level** (mild/medium/hot) - Reduces complaints ⭐⭐⭐⭐
5. **Favorite Cuisines** (chinese/italian/indian) - Personalization ⭐⭐⭐⭐
6. **Communication Tone** (casual/formal) - AI quality ⭐⭐⭐⭐
7. **Delivery Preferences** (timing/instructions) - Operations ⭐⭐⭐
8. **Shopping Behavior** (fast/researcher) - UX optimization ⭐⭐⭐
9. **Personality Traits** (patient/impatient) - Conversation style ⭐⭐⭐
10. **Contextual Patterns** (weekend shopper) - Predictive power ⭐⭐⭐

**Start with Top 5** → Massive impact with minimal effort!

---

**Next Steps**: Implement `UserPreferenceService` and integrate with agent prompts (Phase 2) 🚀
