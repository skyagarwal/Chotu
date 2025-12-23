# 🧠 Mangwale AI - Agent Architecture & Self-Learning System

## Current Architecture Analysis

### 📊 How Agents & Routing Work Today

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MANGWALE AI ROUTING ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   User Message (WhatsApp/Voice/Web)                                             │
│         │                                                                       │
│         ▼                                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │  LAYER 1: Channel Gateway                                        │          │
│   │  • Deduplication (5-second window)                               │          │
│   │  • Session creation/restoration                                  │          │
│   └─────────────────────────────────────────────────────────────────┘          │
│         │                                                                       │
│         ▼                                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │  LAYER 2: Agent Orchestrator                                     │          │
│   │  • Check reset commands (restart, cancel)                        │          │
│   │  • Check active flow → Resume if exists                          │          │
│   │  • Check auth steps (OTP, phone)                                 │          │
│   └─────────────────────────────────────────────────────────────────┘          │
│         │                                                                       │
│         ▼                                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │  LAYER 3: Intent Router (NLU)                                    │          │
│   │  ┌─────────────────────────────────────────────────────┐        │          │
│   │  │ Tier 1: Heuristic Patterns (HIGH priority)          │        │          │
│   │  │         Regex: order_item:123, restart, OTP         │        │          │
│   │  │         → confidence ≥0.8 → Use immediately         │        │          │
│   │  ├─────────────────────────────────────────────────────┤        │          │
│   │  │ Tier 2: IndicBERT v2 Model (port 7010)             │        │          │
│   │  │         ai4bharat/IndicBERTv2-MLM-Back-TLM          │        │          │
│   │  │         → confidence ≥0.7 → Accept                  │        │          │
│   │  ├─────────────────────────────────────────────────────┤        │          │
│   │  │ Tier 3: LLM Fallback (Qwen2.5-7B)                  │        │          │
│   │  │         vLLM service, JSON structured output        │        │          │
│   │  │         → confidence ≥0.5 → Accept                  │        │          │
│   │  ├─────────────────────────────────────────────────────┤        │          │
│   │  │ Tier 4: Keyword Fallback                           │        │          │
│   │  │         → Returns 'unknown' if no match             │        │          │
│   │  └─────────────────────────────────────────────────────┘        │          │
│   └─────────────────────────────────────────────────────────────────┘          │
│         │                                                                       │
│         ▼                                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │  LAYER 4: Flow Selection                                         │          │
│   │  Intent → Flow Matching (trigger patterns)                       │          │
│   │  order_food → food_ordering_v1                                   │          │
│   │  parcel_booking → parcel_delivery_v1                             │          │
│   └─────────────────────────────────────────────────────────────────┘          │
│         │                                                                       │
│         ▼                                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │  LAYER 5: Flow Engine / Agent Execution                          │          │
│   │  State Machine with 23+ Executors                                │          │
│   │  • llm, nlu, search, auth, order, response, etc.                 │          │
│   └─────────────────────────────────────────────────────────────────┘          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Current Tools/Functions Available to Agents

| Tool Name | Service | Description |
|-----------|---------|-------------|
| `search_products` | FunctionExecutorService | OpenSearch semantic/keyword search |
| `check_order_status` | PhpOrderService | Get order status from PHP |
| `get_restaurant_menu` | PhpStoreService | Fetch store menu |
| `cancel_order` | PhpOrderService | Cancel order |
| `get_user_addresses` | PhpAddressService | User saved addresses |
| `calculate_parcel_cost` | PhpParcelService | Delivery pricing |
| `get_faq_answer` | Static | FAQ lookup |
| `escalate_to_human` | Support | Create ticket |

---

## 🚨 Gaps Identified

### 1. **No External Review Integration**
- Google Places API not integrated
- Zomato/Swiggy review data not available
- Only internal reviews from PHP backend

### 2. **Limited Self-Learning**
- Training data collected but not actively used
- No automatic mistake correction
- No feedback loop from failed conversations

### 3. **Missing Tools for Agents**
- No Google Places search tool
- No external review fetching tool
- No competitor price comparison tool
- No real-time analytics tools

### 4. **Voice Agent Limitations**
- NLU extracts but doesn't learn from voice errors
- No voice-specific training data collection

---

## 🎯 Proposed Enhancements

### A. Google APIs to Integrate

| API | Purpose | Cost | Priority |
|-----|---------|------|----------|
| **Google Cloud Natural Language** | Review sentiment analysis | $1/1000 units | ✅ HIGH |
| **Google Places API** | Restaurant discovery, external reviews | $17/1000 requests | ✅ HIGH |
| **Google Places Reviews** | External customer reviews | Included with Places | ✅ HIGH |
| **Google Maps Distance Matrix** | Accurate delivery time | $5/1000 elements | 🟡 MEDIUM |
| **Google Speech-to-Text** | Fallback ASR | $0.006/15 sec | 🟢 LOW (backup) |

### B. New Tools for LLM Agents

```typescript
// Proposed new tools for FunctionExecutorService

const newTools = [
  {
    name: 'search_google_places',
    description: 'Search for restaurants/stores via Google Places API',
    parameters: {
      query: 'string',      // "pizza near Nashik"
      type: 'restaurant|store|cafe',
      radius_meters: 'number',
    },
    execute: async (args) => {
      // Uses Google Places API
    }
  },
  {
    name: 'get_google_reviews',
    description: 'Fetch reviews from Google for a place',
    parameters: {
      place_id: 'string',   // Google Place ID
      min_rating: 'number',
    },
    execute: async (args) => {
      // Fetches Google reviews for sentiment comparison
    }
  },
  {
    name: 'analyze_review_sentiment',
    description: 'Analyze sentiment of review text using Google NL API',
    parameters: {
      text: 'string',
      language: 'hi|en|mr',
    },
    execute: async (args) => {
      // Uses Google Cloud NL API
    }
  },
  {
    name: 'get_item_intelligence',
    description: 'Get AI-analyzed insights about a food item',
    parameters: {
      item_id: 'string',
    },
    execute: async (args) => {
      // Returns review intelligence from PostgreSQL
      // Including warnings: "quantity kam hai", "bahut teekha"
    }
  },
  {
    name: 'compare_with_competitors',
    description: 'Compare Mangwale pricing with competitors',
    parameters: {
      item_total: 'number',
      delivery_distance: 'number',
    },
    execute: async (args) => {
      // Returns value proposition
    }
  },
  {
    name: 'log_conversation_feedback',
    description: 'Log feedback for self-learning',
    parameters: {
      conversation_id: 'string',
      outcome: 'success|failure|partial',
      reason: 'string',
    },
    execute: async (args) => {
      // Logs for learning pipeline
    }
  },
];
```

### C. Self-Learning Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SELF-LEARNING PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   Every Conversation                                                            │
│         │                                                                       │
│         ▼                                                                       │
│   ┌───────────────────────────────────────┐                                    │
│   │  Conversation Capture Service          │                                    │
│   │  • Message, Intent, Confidence         │                                    │
│   │  • Entities extracted                  │                                    │
│   │  • Flow outcome (success/failure)      │                                    │
│   │  • User feedback (if any)              │                                    │
│   └───────────────────────────────────────┘                                    │
│         │                                                                       │
│         ▼                                                                       │
│   ┌───────────────────────────────────────┐                                    │
│   │  Learning Classifier                   │                                    │
│   │                                        │                                    │
│   │  HIGH CONFIDENCE (>0.95) + SUCCESS     │                                    │
│   │  → AUTO-APPROVED for training          │                                    │
│   │                                        │                                    │
│   │  MEDIUM CONFIDENCE (0.7-0.95)          │                                    │
│   │  → NEEDS REVIEW (Label Studio)         │                                    │
│   │                                        │                                    │
│   │  LOW CONFIDENCE (<0.7) or FAILURE      │                                    │
│   │  → PRIORITY REVIEW + ERROR LOG         │                                    │
│   └───────────────────────────────────────┘                                    │
│         │                                                                       │
│         ▼                                                                       │
│   ┌───────────────────────────────────────┐                                    │
│   │  Mistake Tracker                       │                                    │
│   │  • Track repeated failures             │                                    │
│   │  • Pattern detection (same intent,     │                                    │
│   │    different phrasing)                 │                                    │
│   │  • Alert if same mistake 3+ times      │                                    │
│   └───────────────────────────────────────┘                                    │
│         │                                                                       │
│         ▼                                                                       │
│   ┌───────────────────────────────────────┐                                    │
│   │  Auto-Retrain Pipeline                 │                                    │
│   │  • Daily cron at 2 AM                  │                                    │
│   │  • Min 50 new approved samples         │                                    │
│   │  • Deploy if accuracy +2%              │                                    │
│   │  • A/B test new model                  │                                    │
│   └───────────────────────────────────────┘                                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Google Places API Integration

### Why Google Places?
1. **Restaurant Discovery** - Find restaurants not in our database
2. **External Reviews** - Get Google reviews to compare/combine
3. **Place Details** - Opening hours, photos, contact info
4. **Ratings** - Cross-reference with our ratings

### Implementation:

```typescript
// src/integrations/google-places.service.ts

@Injectable()
export class GooglePlacesService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('GOOGLE_PLACES_API_KEY');
  }

  /**
   * Search for places near a location
   */
  async searchNearby(query: string, lat: number, lng: number, radius: number = 5000): Promise<Place[]> {
    const url = `${this.baseUrl}/nearbysearch/json`;
    const params = {
      key: this.apiKey,
      location: `${lat},${lng}`,
      radius: radius.toString(),
      keyword: query,
      type: 'restaurant',
    };
    
    const response = await axios.get(url, { params });
    return response.data.results.map(this.mapPlace);
  }

  /**
   * Get reviews for a place
   */
  async getPlaceReviews(placeId: string): Promise<GoogleReview[]> {
    const url = `${this.baseUrl}/details/json`;
    const params = {
      key: this.apiKey,
      place_id: placeId,
      fields: 'reviews,rating,user_ratings_total',
    };
    
    const response = await axios.get(url, { params });
    return response.data.result.reviews || [];
  }

  /**
   * Match our restaurant to Google Place ID
   */
  async matchRestaurant(storeName: string, address: string, lat: number, lng: number): Promise<string | null> {
    const results = await this.searchNearby(storeName, lat, lng, 500);
    
    // Find best match using fuzzy matching
    const match = results.find(p => 
      this.similarity(p.name, storeName) > 0.8 ||
      this.similarity(p.vicinity, address) > 0.7
    );
    
    return match?.place_id || null;
  }
}
```

### Database Schema for Google Place Mapping:

```sql
-- Store Google Place ID mappings
CREATE TABLE store_google_mapping (
  store_id VARCHAR(100) PRIMARY KEY,
  google_place_id VARCHAR(100),
  google_rating DECIMAL(2,1),
  google_review_count INT,
  last_synced_at TIMESTAMP,
  match_confidence DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cache Google reviews
CREATE TABLE google_reviews_cache (
  id SERIAL PRIMARY KEY,
  google_place_id VARCHAR(100),
  author_name VARCHAR(255),
  rating INT,
  text TEXT,
  time TIMESTAMP,
  sentiment_score DECIMAL(3,2),
  aspects JSONB,
  synced_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_google_reviews_place ON google_reviews_cache(google_place_id);
```

---

## 🤖 Enhanced Agent with Tools

### Example: Search Agent with Google Places

```typescript
// Enhanced search.agent.ts

getFunctions(): FunctionDefinition[] {
  return [
    // Existing tool
    {
      name: 'search_products',
      description: 'Search our catalog for food items',
      parameters: { /* ... */ }
    },
    
    // NEW: Google Places search
    {
      name: 'search_google_places',
      description: 'Search Google for restaurants not in our database. Use when user asks for a specific restaurant we don\'t have.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Restaurant name or type' },
          location: { type: 'string', description: 'Location reference' },
        },
        required: ['query'],
      },
    },
    
    // NEW: Get external reviews
    {
      name: 'get_external_reviews',
      description: 'Get Google reviews for a restaurant to give user more confidence',
      parameters: {
        type: 'object',
        properties: {
          store_id: { type: 'string', description: 'Our store ID' },
        },
        required: ['store_id'],
      },
    },
    
    // NEW: Get item intelligence
    {
      name: 'get_item_intelligence',
      description: 'Get AI-analyzed review insights for a food item. Returns warnings about quantity, spiciness, etc.',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string' },
        },
        required: ['item_id'],
      },
    },
  ];
}
```

---

## 📚 Mistake Prevention System

### How It Works:

```typescript
// src/learning/mistake-tracker.service.ts

@Injectable()
export class MistakeTrackerService {
  
  /**
   * Log a conversation mistake
   */
  async logMistake(data: {
    messageId: string;
    userMessage: string;
    predictedIntent: string;
    actualIntent?: string;
    confidence: number;
    errorType: 'wrong_intent' | 'missed_entity' | 'bad_response' | 'flow_failure';
    userFeedback?: string;
  }) {
    // Store in mistakes table
    await this.prisma.conversationMistakes.create({
      data: {
        ...data,
        messageHash: this.hashMessage(data.userMessage),
        createdAt: new Date(),
      }
    });
    
    // Check if pattern exists
    await this.checkForPatterns(data.messageHash, data.errorType);
  }
  
  /**
   * Check if same mistake happened before
   */
  private async checkForPatterns(messageHash: string, errorType: string) {
    const similar = await this.prisma.conversationMistakes.findMany({
      where: {
        messageHash,
        errorType,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }
    });
    
    if (similar.length >= 3) {
      // Alert: Same mistake 3+ times!
      await this.alertForRetraining(messageHash, similar);
    }
  }
  
  /**
   * Get common mistakes for analysis
   */
  async getCommonMistakes(): Promise<MistakePattern[]> {
    return this.prisma.$queryRaw`
      SELECT 
        message_hash,
        error_type,
        COUNT(*) as occurrence_count,
        array_agg(DISTINCT user_message) as sample_messages,
        array_agg(DISTINCT predicted_intent) as predicted_intents,
        array_agg(DISTINCT actual_intent) as actual_intents
      FROM conversation_mistakes
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY message_hash, error_type
      HAVING COUNT(*) >= 2
      ORDER BY occurrence_count DESC
      LIMIT 50
    `;
  }
}
```

### Database Tables:

```sql
-- Track conversation mistakes for learning
CREATE TABLE conversation_mistakes (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(100),
  message_hash VARCHAR(64),  -- For pattern matching
  user_message TEXT,
  predicted_intent VARCHAR(50),
  actual_intent VARCHAR(50),
  confidence DECIMAL(3,2),
  error_type VARCHAR(30),  -- 'wrong_intent', 'missed_entity', 'bad_response', 'flow_failure'
  user_feedback TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_mistakes_hash ON conversation_mistakes(message_hash);
CREATE INDEX idx_mistakes_type ON conversation_mistakes(error_type);
CREATE INDEX idx_mistakes_unresolved ON conversation_mistakes(is_resolved) WHERE is_resolved = false;

-- Track model performance over time
CREATE TABLE model_performance (
  id SERIAL PRIMARY KEY,
  model_version VARCHAR(50),
  date DATE,
  total_predictions INT,
  correct_predictions INT,
  accuracy DECIMAL(5,4),
  avg_confidence DECIMAL(3,2),
  false_positives INT,
  false_negatives INT,
  intents_breakdown JSONB,  -- {order_food: {correct: 100, wrong: 5}, ...}
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎤 Voice-Specific Learning

### Voice Error Collection:

```typescript
// src/voice/services/voice-learning.service.ts

@Injectable()
export class VoiceLearningService {
  
  /**
   * Log voice transcription for quality improvement
   */
  async logTranscription(data: {
    audioId: string;
    transcription: string;
    asrProvider: 'whisper' | 'indicconformer' | 'google';
    confidence: number;
    language: string;
    nluResult: NLUResult;
    userCorrection?: string;  // If user said "no, I said..."
  }) {
    await this.prisma.voiceTranscriptions.create({ data });
    
    // If low confidence, flag for review
    if (data.confidence < 0.7) {
      await this.flagForReview(data.audioId, 'low_asr_confidence');
    }
    
    // If user corrected, learn from it
    if (data.userCorrection) {
      await this.learnFromCorrection(data);
    }
  }
  
  /**
   * Detect when user corrects the bot
   */
  detectCorrection(message: string): string | null {
    const patterns = [
      /no\s*,?\s*i\s*said\s+(.+)/i,
      /nahi\s*,?\s*maine\s+(.+)\s+bola/i,
      /not\s+(.+),\s*i\s*want\s+(.+)/i,
      /galat\s*,?\s*(.+)\s+chahiye/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
}
```

---

## 📋 Implementation Checklist

### Phase 1: Google APIs (Week 1)
- [ ] Set up Google Cloud project
- [ ] Enable Places API, Natural Language API
- [ ] Create GooglePlacesService
- [ ] Add store_google_mapping table
- [ ] Match existing stores to Google Place IDs

### Phase 2: Agent Tools (Week 2)
- [ ] Add `search_google_places` tool
- [ ] Add `get_external_reviews` tool
- [ ] Add `get_item_intelligence` tool
- [ ] Register tools in FunctionExecutorService
- [ ] Update agent prompts

### Phase 3: Self-Learning (Week 3)
- [ ] Create MistakeTrackerService
- [ ] Add conversation_mistakes table
- [ ] Implement pattern detection
- [ ] Create admin dashboard for mistakes
- [ ] Set up alerts for repeated errors

### Phase 4: Voice Learning (Week 4)
- [ ] Create VoiceLearningService
- [ ] Add voice_transcriptions table
- [ ] Implement correction detection
- [ ] Create voice-specific training pipeline

---

## ❓ Questions for You

1. **Google Cloud Setup**: Do you have a Google Cloud project? Should I help configure it?

2. **Review Sources Priority**: 
   - Google Reviews only? 
   - Or also Zomato/Swiggy (requires scraping)?

3. **Learning Aggressiveness**:
   - Auto-retrain daily?
   - Or wait for manual approval?

4. **Voice Feedback**:
   - Should we ask "Did I understand correctly?" after voice?
   - Or only learn from explicit corrections?

5. **Cost Budget**:
   - Google Places: ~$17/1000 requests
   - Google NL: ~$1/1000 units
   - What's the monthly budget?
