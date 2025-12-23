# 🧠 Comprehensive User Context & Self-Learning System

## What Chotu Now Knows About Users

### 1. **Weather & Climate Awareness**
```typescript
// Chotu can now say:
"Aaj bahut garmi hai (38°C)! Kuch thanda le lo? 🥤"
"Baarish ho rahi hai! Pakode aur chai ka mood hai? 🌧️"
"Thandi hai aaj! Garam chai chalegi? ☕"
```

**Free APIs Used:**
- **Open-Meteo** (Primary) - No API key needed
- **wttr.in** (Fallback) - No API key needed
- **OpenWeatherMap** (Optional) - Free tier: 1000 calls/day

### 2. **Date/Time Context**
```typescript
// Chotu knows:
- Current time of day (morning/afternoon/evening/night)
- Meal time (breakfast/lunch/snacks/dinner/late_night)
- Weekend vs weekday
- Upcoming festivals (within 7 days)
- Special days (Mango season, Monsoon, etc.)
```

### 3. **Festival Awareness**
```typescript
// Pre-loaded festivals for 2025:
"Diwali aa rahi hai! Mithai ka order lagayein?"
"Ganesh Chaturthi ki shubhkamnayein! Modak try karein?"
"Holi hai! Gujiya aur Thandai available hai!"
```

### 4. **User Preferences**
```typescript
// Learned from order history:
- Dietary type (veg/non-veg/egg/vegan/jain)
- Favorite cuisines
- Spice level preference
- Favorite items & stores
- Average order value
- Preferred payment method
```

### 5. **City Knowledge & Local Slang**
```typescript
// Nashik knowledge:
Slang: "झकास", "एकदम भारी", "पेटपूजा"
Popular: Misal Pav, Vada Pav, Poha
Specialties: Nashik Grapes, Sula Wines
Tips: "Try Misal at Sadhana for authentic taste"
```

---

## Flexible Multi-Source Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA SOURCE REGISTRY                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  data_sources table                                      │    │
│  │  ┌────────────┬──────────┬──────────┬─────────┐        │    │
│  │  │ Type       │ Provider │ Priority │ Active  │        │    │
│  │  ├────────────┼──────────┼──────────┼─────────┤        │    │
│  │  │ weather    │open_meteo│    1     │   ✓     │        │    │
│  │  │ weather    │wttr_in   │    2     │   ✓     │        │    │
│  │  │ weather    │openweather│   3     │   ✓     │        │    │
│  │  │ reviews    │google    │    1     │   ✓     │        │    │
│  │  │ reviews    │zomato    │    2     │   ○     │        │    │
│  │  └────────────┴──────────┴──────────┴─────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  FALLBACK FLOW:                                                  │
│  1. Try priority 1 source                                        │
│  2. If fails → Try priority 2                                    │
│  3. If fails → Try priority 3                                    │
│  4. If all fail → Use cached database data                       │
│  5. All successful fetches → Cache with timestamp                │
└─────────────────────────────────────────────────────────────────┘
```

### Adding New Sources (Database-Driven)

```sql
-- Add Zomato as review source (example)
INSERT INTO data_sources (name, type, provider, endpoint, api_key, priority, is_active)
VALUES ('Zomato Reviews', 'reviews', 'zomato', 'https://api.zomato.com', 'your-key', 2, true);

-- Add new weather source
INSERT INTO data_sources (name, type, provider, endpoint, priority, is_active)
VALUES ('Weather API', 'weather', 'weatherapi', 'https://api.weatherapi.com', 3, true);
```

---

## Store Review Enrichment (Clarified!)

### The Correct Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   STORE REVIEW ENRICHMENT                        │
│                                                                  │
│  ❌ NOT: Showing restaurants from Google                        │
│  ✅ YES: Enriching OUR restaurants with Google reviews          │
│                                                                  │
│  Flow:                                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. User searches "Pizza" on Mangwale                      │  │
│  │         ↓                                                  │  │
│  │ 2. We return OUR stores from OpenSearch                   │  │
│  │    (Only stores in our database)                          │  │
│  │         ↓                                                  │  │
│  │ 3. For each store, check store_external_mapping           │  │
│  │    - If Google Place ID exists → Get Google reviews       │  │
│  │    - If not matched → Try to match by name + location     │  │
│  │         ↓                                                  │  │
│  │ 4. Combine ratings:                                       │  │
│  │    Mangwale: 4.2★ (50 reviews)                           │  │
│  │    Google:   4.5★ (200 reviews)                          │  │
│  │    Combined: 4.4★ (250 reviews)                          │  │
│  │         ↓                                                  │  │
│  │ 5. Show enriched data to user                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Matching Algorithm

```typescript
// StoreReviewEnrichmentService.matchStoreToGoogle()

1. Text Search: "Dominos Nashik Road" → Find on Google
2. Nearby Search: Within 200m of our store coordinates
3. String Similarity: Compare store names (Levenshtein)
4. If confidence > 0.6 → Save mapping
5. Cache Google reviews for 7 days
```

---

## Self-Learning System

### Mistake Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-LEARNING PIPELINE                        │
│                                                                  │
│  Every Conversation:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Log conversation with:                                │   │
│  │    - User message                                        │   │
│  │    - Predicted intent                                    │   │
│  │    - Confidence score                                    │   │
│  │    - Outcome (success/failure)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. Classify:                                             │   │
│  │    HIGH CONFIDENCE (>0.9) + SUCCESS → Auto-approve       │   │
│  │    MEDIUM CONFIDENCE (0.7-0.9) → Needs review            │   │
│  │    LOW CONFIDENCE (<0.7) or FAILURE → Priority review    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. Pattern Detection (hourly):                           │   │
│  │    Same mistake 3+ times → Alert team                    │   │
│  │    Generate training samples from corrections            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4. Auto-Training (daily at 2 AM):                        │   │
│  │    - Collect approved samples                            │   │
│  │    - If 50+ new samples → Trigger retraining             │   │
│  │    - Deploy if accuracy improves                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### User Correction Learning

```typescript
// When user corrects Chotu:
User: "Mujhe pizza chahiye"
Chotu: "Aapko parcel book karna hai?" (Wrong!)
User: "Nahi, khana order karna hai"

// System logs:
{
  mistakeType: 'user_correction',
  predictedIntent: 'parcel_booking',
  actualIntent: 'food_order',
  userMessage: 'Mujhe pizza chahiye',
  userCorrection: 'Nahi, khana order karna hai'
}

// Auto-generates training sample:
{
  text: 'Mujhe pizza chahiye',
  intent: 'food_order',
  source: 'user_correction'
}
```

---

## Files Created

| File | Purpose |
|------|---------|
| [user-context.service.ts](src/context/services/user-context.service.ts) | Weather, preferences, city knowledge |
| [store-review-enrichment.service.ts](src/reviews/services/store-review-enrichment.service.ts) | Match stores to Google, enrich reviews |
| [mistake-tracker.service.ts](src/learning/services/mistake-tracker.service.ts) | Pattern detection, self-learning |
| [migration.sql](prisma/migrations/20241221_user_context_data_sources/migration.sql) | Database tables |
| [context.module.ts](src/context/context.module.ts) | Context module |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `data_sources` | Registry of external APIs with fallback |
| `user_preferences` | User food/communication preferences |
| `city_knowledge` | Local slang, dishes, tips per city |
| `weather_cache` | Cached weather data |
| `store_external_mapping` | Our store → Google Place ID mapping |
| `google_reviews_cache` | Cached Google reviews |
| `store_combined_ratings` | Combined Mangwale + Google ratings |
| `conversation_mistakes` | Logged mistakes for learning |
| `nlu_training_data` | Auto-generated training samples |
| `festivals` | Festival calendar for context |

---

## Free APIs Used

| Service | API | Cost | Limit |
|---------|-----|------|-------|
| Weather | Open-Meteo | FREE | Unlimited |
| Weather | wttr.in | FREE | Unlimited |
| Weather | OpenWeatherMap | FREE | 1000/day |
| Places | Google Places | Paid | $17/1000 |
| Reviews | Google Places | Paid | Included |

**Note**: Google Places API requires payment but has $200/month free credit for new accounts.

---

## What Chotu Can Now Do

1. **Weather-aware suggestions**: "Garmi hai, thanda piyo!"
2. **Time-aware suggestions**: "Good morning! Nashta kar liya?"
3. **Festival-aware**: "Diwali ki Mithai order karein?"
4. **Local slang**: "Arey ekdum झकास biryani hai!"
5. **User favorites**: "Aapka favorite Paneer Butter Masala phir se?"
6. **Combined reviews**: "4.5★ rating (Mangwale + Google reviews)"
7. **Self-correcting**: Learns from mistakes and user corrections

---

## Setup Steps

```bash
# 1. Run migration
psql -U your_user -d mangwale_ai \
  -f prisma/migrations/20241221_user_context_data_sources/migration.sql

# 2. (Optional) Add Google Places API key
# In database:
UPDATE data_sources 
SET api_key = 'your-google-key', is_active = true 
WHERE provider = 'google_places';

# Or in .env:
GOOGLE_PLACES_API_KEY=your-key

# 3. Restart backend
npm run start:dev
```

---

## Flow Summary

```
User Message
    │
    ▼
┌────────────────────┐
│ Get User Context   │ ← Weather, Preferences, City, Festivals
└────────────────────┘
    │
    ▼
┌────────────────────┐
│ Process with NLU   │ ← Intent + Entities
└────────────────────┘
    │
    ▼
┌────────────────────┐
│ Search OUR Stores  │ ← OpenSearch (only our database)
└────────────────────┘
    │
    ▼
┌────────────────────┐
│ Enrich with Reviews│ ← Match to Google, combine ratings
└────────────────────┘
    │
    ▼
┌────────────────────┐
│ Generate Response  │ ← Weather + Festival + User context
└────────────────────┘
    │
    ▼
┌────────────────────┐
│ Log & Learn        │ ← Track mistakes, detect patterns
└────────────────────┘
```
