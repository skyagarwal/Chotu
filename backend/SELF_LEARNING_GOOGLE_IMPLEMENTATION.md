# Self-Learning & Google Integration - Implementation Summary

## Overview

This implementation adds two major capabilities to MangwaleAI:
1. **Google Places/Reviews Integration** - Access external restaurant data and reviews
2. **Self-Learning System** - Track mistakes, detect patterns, auto-generate training data

---

## Files Created

### 1. Google Places Service
**File:** [google-places.service.ts](src/integrations/google-places.service.ts)

Provides:
- `searchNearby()` - Find restaurants near user
- `textSearch()` - Search by text query  
- `getPlaceDetails()` - Get restaurant details
- `getPlaceReviews()` - Fetch Google reviews
- `matchStoreToGooglePlace()` - Match our stores to Google Places
- `getCombinedRating()` - Merge Mangwale + Google ratings

Daily cron sync at 4 AM for store-Google mappings.

### 2. Mistake Tracker Service  
**File:** [mistake-tracker.service.ts](src/learning/services/mistake-tracker.service.ts)

Provides:
- `logMistake()` - Log NLU/response errors
- `logUserCorrection()` - Track user corrections
- `checkForPatterns()` - Detect recurring mistakes (3+ occurrences)
- `alertForRetraining()` - Notify when retraining needed
- `generateTrainingSamples()` - Auto-create training data from corrections

Pattern detection hourly, training sample generation daily at 5 AM.

### 3. Enhanced Agent Tools
**File:** [enhanced-agent-tools.service.ts](src/agents/services/enhanced-agent-tools.service.ts)

New tools for LLM agents:
- `search_google_places` - Find restaurants via Google
- `get_external_reviews` - Fetch Google reviews
- `get_item_intelligence` - AI review insights
- `compare_with_competitors` - Value proposition
- `get_combined_rating` - Merged ratings
- `log_feedback` - Self-learning feedback

### 4. Database Migration
**File:** [20241221_self_learning_google/migration.sql](prisma/migrations/20241221_self_learning_google/migration.sql)

Tables:
- `conversation_mistakes` - Log all errors
- `model_performance` - Daily metrics
- `store_google_mapping` - Store to Google Place mapping
- `google_reviews_cache` - Cached Google reviews
- `nlu_training_data` - Generated training samples
- `voice_transcriptions` - Voice ASR logs

Views:
- `v_combined_store_ratings` - Merged ratings
- `v_mistake_patterns` - Pattern analysis
- `v_daily_model_accuracy` - Model performance

### 5. New Modules
- **LearningModule** - [learning.module.ts](src/learning/learning.module.ts)
- **ReviewsModule** - [reviews.module.ts](src/reviews/reviews.module.ts)  
- **PricingModule** - [pricing.module.ts](src/pricing/pricing.module.ts)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Enhanced Agent Tools                        │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │   │
│  │  │ Google Places   │  │ Mistake Tracker             │   │   │
│  │  │ Service         │  │ Service                     │   │   │
│  │  │                 │  │                             │   │   │
│  │  │ • searchNearby  │  │ • logMistake               │   │   │
│  │  │ • getReviews    │  │ • detectPatterns           │   │   │
│  │  │ • matchStore    │  │ • alertForRetraining       │   │   │
│  │  └────────┬────────┘  └─────────────┬───────────────┘   │   │
│  │           │                         │                    │   │
│  │           ▼                         ▼                    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              Database Layer                      │    │   │
│  │  │                                                  │    │   │
│  │  │  store_google_mapping  |  conversation_mistakes  │    │   │
│  │  │  google_reviews_cache  |  nlu_training_data      │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Self-Learning Flow

```
User Message → NLU Prediction → Response
                   │
                   ▼
             ┌───────────┐
             │ Confidence│──── Low (<0.7) ────→ Log Mistake
             │   Check   │
             └─────┬─────┘
                   │ High
                   ▼
          ┌────────────────┐
          │ User Satisfied │──── No ────→ Log User Correction
          │    Check       │
          └────────┬───────┘
                   │ Yes
                   ▼
               Success ✓

                    ┌───────────────────────┐
                    │  Hourly Pattern Check  │
                    │                        │
                    │  Same mistake 3+ times │
                    │  → Alert for retraining│
                    └───────────────────────┘

                    ┌───────────────────────┐
                    │  Daily Training Gen    │
                    │                        │
                    │  User corrections →    │
                    │  Training samples      │
                    └───────────────────────┘
```

---

## Setup Required

### 1. Environment Variables
```env
# Google APIs
GOOGLE_PLACES_API_KEY=your-api-key
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### 2. Run Migrations
```bash
# Run the self-learning/Google migration
psql -U your_user -d mangwale_ai \
  -f prisma/migrations/20241221_self_learning_google/migration.sql

# Run the review intelligence migration (if not already run)
psql -U your_user -d mangwale_ai \
  -f prisma/migrations/20241221_review_intelligence/migration.sql
```

### 3. Google Cloud Setup
1. Enable Google Places API in Google Cloud Console
2. Enable Cloud Natural Language API
3. Create service account and download credentials
4. Set up API key with restriction to Places API

### 4. Estimated API Costs
| API | Free Tier | Cost After |
|-----|-----------|------------|
| Places Text Search | 10K/month | $17/1K calls |
| Places Details | 10K/month | $17/1K calls |
| Places Reviews | Included with Details | - |
| Natural Language | 5K/month | $1/1K units |

Estimated monthly cost for active usage: **₹2,000-5,000**

---

## Agent Tool Usage Examples

### 1. Search Google Places
```typescript
// When user asks for a restaurant not in our database
const result = await tools.search_google_places({
  query: "Dominos Pizza",
  lat: 26.8467,
  lng: 80.9462,
  min_rating: 4.0
});
// Returns: Array of matching places with ratings, reviews
```

### 2. Get Item Intelligence
```typescript
// Before recommending an item, check reviews
const intel = await tools.get_item_intelligence({
  item_id: "item_123"
});
// Returns: { warnings: ["quantity kam hai"], sentiment: "mixed" }
```

### 3. Compare Pricing
```typescript
// Show value proposition to user
const comparison = await tools.compare_with_competitors({
  item_total: 350,
  delivery_distance: 3.5,
  item_count: 2
});
// Returns: { savings: 45, message: "₹45 cheaper than Swiggy!" }
```

---

## What Chotu Can Now Do

1. **"Dominos ka pizza chahiye"** - Can search Google Places if not in database
2. **"Kya reviews hai iska?"** - Can fetch combined Mangwale + Google reviews
3. **"Yeh oily hai kya?"** - Can check item intelligence from review analysis
4. **"Swiggy se sasta hai?"** - Can show pricing comparison

### Self-Learning Benefits
- Low confidence predictions → Logged for review
- User corrections → Auto-generate training samples
- Pattern detection → Alert team for model updates
- Voice transcription errors → Improve ASR accuracy

---

## Next Steps

1. **Configure Google Cloud** - Set up APIs and credentials
2. **Run Migrations** - Apply database changes
3. **Test Tools** - Verify each tool works correctly
4. **Train NLU** - Use generated training samples
5. **Monitor Patterns** - Review mistake dashboard weekly

---

## Questions for You

1. **Google Cloud** - Do you have an existing Google Cloud project, or need help setting one up?

2. **Review Sources** - Should we also integrate Zomato/Swiggy reviews, or Google only for now?

3. **Learning Aggressiveness** - Should mistakes auto-retrain daily, or wait for manual review?

4. **Voice Feedback** - Should Chotu ask "Did I understand correctly?" on low confidence?

5. **Budget** - What's the monthly API budget for Google services?
