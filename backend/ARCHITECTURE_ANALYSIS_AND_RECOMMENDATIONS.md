# 🏗️ Mangwale Architecture Analysis & Recommendations

**Date**: October 28, 2025  
**Status**: Comprehensive System Review  
**Purpose**: Analyze current architecture and propose optimal solutions

---

## 📊 Current Architecture Analysis

### 1. **Communication Patterns**

#### Current Setup ❌
- **mangwale-ai → Admin Backend**: HTTP REST (POST /ai/chat)
- **No WebSockets**: Traditional request/response only
- **No Real-time Updates**: Polling-based or missing
- **Gateway Status**: Not responding (port 3000 down)

#### What We're NOT Using
```
❌ WebSockets for real-time chat
❌ Server-Sent Events (SSE) for streaming
❌ gRPC for service-to-service
❌ Message Queue (Redis Pub/Sub, RabbitMQ, Kafka)
❌ Event-driven architecture
```

#### Issues with Current Approach
1. **No streaming responses** - User waits for complete LLM response
2. **No real-time updates** - Order status changes require polling
3. **No bidirectional communication** - Can't push updates to users
4. **Tight coupling** - Direct HTTP between services
5. **No message reliability** - If request fails, message lost

---

### 2. **Database Architecture**

#### Current Databases 🔍

**Admin Backend (PostgreSQL - Port 5432)**
```sql
Purpose: Training data, models, agents, ASR/TTS providers
Tables:
  - Dataset, Example, TrainingJob
  - ModelEntry, Agent
  - ASRProvider, TTSProvider, NLUProvider
  - NO user data
  - NO conversation history
  - NO user preferences
```

**mangwale-ai/Gateway (PostgreSQL - Port 5433)**
```sql
Purpose: Multi-tenant channels, conversation flows, message logs
Tables:
  - Tenant, Channel, AdminUser
  - ConversationFlow, FlowTranslation
  - MessageLog, MediaLibrary
  - UserToken, UserContext (24hr cache)
  - ConversationMessage (for analytics)
  - PaymentTransaction
```

**PHP Backend (MySQL - Unknown Port)**
```sql
Purpose: ALL business data
Tables:
  - users, vendors, stores, orders
  - items, categories, modules
  - addresses, conversations, messages
  - wallets, loyalty_points
  - rides, rentals, bookings
  - deliverymen, zones
```

#### Problems with Current Database Architecture ❌

1. **No User Memory System**
   - User preferences scattered
   - No behavior tracking
   - No learning from interactions
   - Can't personalize responses

2. **No Vector Storage**
   - Can't do semantic search
   - No similarity matching
   - No context retrieval
   - Missing modern AI capabilities

3. **Data Duplication**
   - User data in MySQL (PHP)
   - User context cache in PostgreSQL (Gateway)
   - No single source of truth

4. **No Conversation Context**
   - Messages not linked to sessions
   - Can't track conversation flow
   - No multi-turn context
   - Limited to single request/response

5. **MySQL for AI Workload** ❌
   - Not optimized for embeddings
   - No vector operations
   - Slow text search
   - Missing AI-native features

---

### 6. Search API Integration Issues

**Current State - UPDATED:**
✅ **OpenSearch-based search system is FULLY OPERATIONAL!**
- **Infrastructure:** OpenSearch 2.13 + Redis + ClickHouse + MySQL CDC
- **Search API:** Running on port 3100 (NestJS)
- **Modules:** Food, E-commerce, Rooms, Movies, Services
- **Features:**
  * Full-text search with fuzzy matching
  * Geo-distance search and sorting
  * Faceted search (category, price, rating, brand)
  * Typeahead suggestions (items, stores, categories)
  * Enhanced search (searches items by name, category, AND store name)
  * Natural language agent (`/search/agent`)
  * ASR (speech-to-text) proxy to Admin AI
  * Analytics via ClickHouse (trending queries)
  * Fast category browsing (optimized for mobile)
  * Delivery time recalculation based on actual distance
  * Store enrichment (adds store names to items)
  
**Current Architecture:**
```
MySQL (new_mangwale) 
  ↓ (Debezium CDC via Redpanda)
  ↓
OpenSearch (9200) ← Search API (3100) → ClickHouse (8123)
  ↓                                         ↑
Redis (6379)                            Analytics
  ↓
Indexes: food_items, food_stores, food_categories
         ecom_items, ecom_stores, ecom_categories
         rooms_index, services_index, movies_catalog
```

**Problems:**
- ❌ **NOT integrated with agent system** (mangwale-ai doesn't call it)
- ❌ **NOT in dashboard UI** (users can't search)
- ⚠️ **No vector search** (OpenSearch has it, but not enabled)
- ⚠️ **Limited personalization** (ENABLE_PERSONALIZATION=true but not implemented)
- ⚠️ **No user memory** (search doesn't learn preferences)

**Requirements:**
- ✅ Connect search to agent system (add search function to agent functions)
- ✅ Show search results in dashboard
- 🆕 Enable OpenSearch vector search (k-NN plugin)
- 🆕 Implement user personalization (preferences, history)
- 🆕 Track search analytics for user memory

---

## 🎯 Recommended Architecture

### 1. **Communication Layer - Event-Driven Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    MESSAGE BROKER (Redis)                     │
│  Channels: user-messages, agent-responses, system-events     │
└─────────────────────────────────────────────────────────────┘
         ↑                    ↑                    ↑
         │                    │                    │
    ┌────┴────┐          ┌────┴────┐         ┌────┴────┐
    │WhatsApp │          │ Web Chat│         │Telegram │
    │ Channel │          │ Channel │         │ Channel │
    └────┬────┘          └────┬────┘         └────┬────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                            ↓
                    ┌──────────────┐
                    │  Gateway     │
                    │  (Port 3000) │
                    └──────┬───────┘
                           │
                  ┌────────┴────────┐
                  │   mangwale-ai   │
                  │   Agent System  │
                  └────────┬────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         ┌────▼─────┐            ┌─────▼────┐
         │ Admin    │            │ PHP API  │
         │ Backend  │            │ Backend  │
         │ (LLM)    │            │ (Data)   │
         └──────────┘            └──────────┘
```

#### Why Redis Pub/Sub + Streams?

**Pros:**
- ✅ Already have Redis (for cache)
- ✅ Super fast (microseconds)
- ✅ Lightweight (no heavy infra)
- ✅ Message persistence with Streams
- ✅ Consumer groups for scaling
- ✅ Works with existing stack

**Implementation:**
```typescript
// Gateway publishes user message
await redis.xadd(
  'user-messages',
  '*',
  'userId', user.id,
  'message', userMessage,
  'channel', 'whatsapp',
  'timestamp', Date.now()
);

// mangwale-ai consumes from stream
const messages = await redis.xread(
  'BLOCK', 0,
  'STREAMS', 'user-messages', lastId
);

// Agent publishes response
await redis.xadd(
  'agent-responses',
  '*',
  'userId', user.id,
  'response', agentResponse,
  'streaming', 'true'  // For token-by-token
);

// Gateway listens and forwards to channel
```

**Benefits:**
- Decouple services
- Message reliability
- Multi-consumer support
- Real-time updates
- Backpressure handling

---

### 2. **Database Architecture - Hybrid Approach**

#### Recommended Stack

```
┌───────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                          │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────┐│
│  │ PostgreSQL      │  │ Redis Vector DB  │  │  MySQL   ││
│  │ (Transactional) │  │ (AI/Embeddings)  │  │ (Legacy) ││
│  └─────────────────┘  └──────────────────┘  └──────────┘│
│         │                       │                  │     │
│    - User sessions         - Embeddings      - Orders   │
│    - Conversations         - Search index    - Items    │
│    - Agent state           - User memory     - Vendors  │
│    - Flows                 - Context cache   - Users    │
│    - Channels              - Similarity      - (Keep)   │
└───────────────────────────────────────────────────────────┘
```

#### Why This Hybrid?

##### **PostgreSQL** (Keep & Expand)
- Admin Backend: Models, agents, training
- Gateway: Channels, flows, sessions
- **NEW**: User behavior tracking

```sql
-- Add to Gateway PostgreSQL
CREATE TABLE user_behavior (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  phone VARCHAR(20) NOT NULL,
  
  -- Preferences
  favorite_cuisines JSONB,
  dietary_restrictions JSONB,
  preferred_payment_method VARCHAR(50),
  preferred_delivery_time VARCHAR(20),
  price_sensitivity VARCHAR(20), -- 'low', 'medium', 'high'
  
  -- Behavior
  avg_order_value DECIMAL(10,2),
  order_frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly'
  last_order_date TIMESTAMP,
  total_orders INTEGER DEFAULT 0,
  
  -- Communication
  preferred_channel VARCHAR(20), -- 'whatsapp', 'web', etc
  response_speed VARCHAR(20), -- 'fast', 'slow'
  interaction_style VARCHAR(20), -- 'brief', 'detailed'
  
  -- Context
  last_viewed_items JSONB,
  abandoned_carts JSONB,
  wishlist_items JSONB,
  search_history JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_behavior_user_id ON user_behavior(user_id);
CREATE INDEX idx_user_behavior_phone ON user_behavior(phone);
```

##### **Redis as Vector Database** ⭐ RECOMMENDED
- Use Redis Stack (free, already have Redis)
- Vector operations without new infra
- Fast semantic search
- User memory via embeddings

```python
# User Preference Embeddings
user_pref_embedding = embedder.encode(
  "User loves spicy food, vegetarian, budget-conscious, orders lunch"
)

# Store in Redis
redis.hset(
  f"user:embedding:{user_id}",
  mapping={
    "vector": user_pref_embedding.tobytes(),
    "user_id": user_id,
    "last_updated": datetime.now().isoformat()
  }
)

# Create vector index
redis.ft('idx:user_preferences').create_index([
  VectorField(
    "vector",
    "HNSW",
    {
      "TYPE": "FLOAT32",
      "DIM": 768,
      "DISTANCE_METRIC": "COSINE"
    }
  )
])

# Search for similar users
similar_users = redis.ft('idx:user_preferences').search(
  Query("*=>[KNN 5 @vector $query_vector]")
    .return_fields("user_id")
    .dialect(2),
  query_params={"query_vector": current_user_vector.tobytes()}
)
```

**Use Cases for Redis Vector:**
1. **User Memory**
   - Store user preference embeddings
   - Find similar users for recommendations
   - Personalize search results

2. **Semantic Search**
   - "Spicy vegetarian food" → Find restaurants
   - "Budget-friendly cab" → Find rides
   - "Movie for kids" → Find shows

3. **Context Retrieval**
   - Past conversations
   - Similar queries
   - Related products

4. **RAG (Retrieval Augmented Generation)**
   - Give LLM relevant context from past
   - "User previously complained about X"
   - "User's favorite restaurant is Y"

##### **MySQL** (Keep as-is)
- PHP Backend data (orders, vendors, etc.)
- Don't migrate - too risky
- Use as primary source via API
- Eventually consider read replicas

---

### 3. **User Memory & Personalization System**

#### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              USER MEMORY PIPELINE                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────┐
    │     1. Collect User Interactions           │
    │  - Every message, order, search, click     │
    └───────────────┬───────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────┐
    │     2. Extract Preferences & Behavior      │
    │  - NLU for intent & sentiment              │
    │  - Track patterns (time, frequency)        │
    └───────────────┬───────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────┐
    │     3. Generate User Profile Embedding     │
    │  - Encode preferences as vector            │
    │  - Update on every interaction             │
    └───────────────┬───────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────┐
    │     4. Store in Redis Vector DB            │
    │  - user:profile:{id}                       │
    │  - user:context:{id}:recent                │
    └───────────────┬───────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────┐
    │     5. Retrieve During Conversation        │
    │  - Inject context into LLM prompt          │
    │  - Personalize responses                   │
    └───────────────────────────────────────────┘
```

#### Implementation Example

```typescript
// UserMemoryService
class UserMemoryService {
  private embedder: SentenceTransformer;
  private redis: Redis;
  
  async buildUserProfile(userId: string) {
    // 1. Get user data from PostgreSQL
    const behavior = await this.db.query(`
      SELECT * FROM user_behavior WHERE user_id = $1
    `, [userId]);
    
    // 2. Get recent interactions
    const messages = await this.db.query(`
      SELECT * FROM conversation_messages 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId]);
    
    // 3. Extract preferences
    const preferences = {
      cuisines: behavior.favorite_cuisines,
      dietary: behavior.dietary_restrictions,
      priceRange: behavior.price_sensitivity,
      orderTime: behavior.preferred_delivery_time,
      frequency: behavior.order_frequency
    };
    
    // 4. Build natural language profile
    const profileText = `
      User preferences:
      - Likes: ${preferences.cuisines.join(', ')}
      - Dietary: ${preferences.dietary.join(', ')}
      - Budget: ${preferences.priceRange}
      - Orders ${preferences.frequency}
      - Preferred time: ${preferences.orderTime}
      
      Recent interests: ${messages.slice(0, 10).map(m => m.text).join('. ')}
    `;
    
    // 5. Generate embedding
    const embedding = await this.embedder.encode(profileText);
    
    // 6. Store in Redis
    await this.redis.hset(
      `user:profile:${userId}`,
      {
        vector: Buffer.from(embedding.buffer),
        preferences: JSON.stringify(preferences),
        updated_at: new Date().toISOString()
      }
    );
  }
  
  async getPersonalizedContext(userId: string, currentQuery: string) {
    // 1. Get user profile
    const profile = await this.redis.hgetall(`user:profile:${userId}`);
    
    // 2. Search similar past queries
    const queryEmbedding = await this.embedder.encode(currentQuery);
    const similarConversations = await this.redis.ft('idx:conversations')
      .search(
        Query("*=>[KNN 3 @vector $query_vector]")
          .return_fields("message_text", "response")
          .dialect(2),
        { query_vector: queryEmbedding.buffer }
      );
    
    // 3. Build context for LLM
    return {
      userPreferences: JSON.parse(profile.preferences),
      pastQueries: similarConversations.documents,
      profile: {
        isVegetarian: profile.preferences.dietary.includes('vegetarian'),
        budgetConscious: profile.preferences.priceRange === 'low',
        frequentOrderer: profile.preferences.frequency === 'daily'
      }
    };
  }
}
```

#### Agent Integration

```typescript
// Modify LLM Service to use memory
async chat(request: LLMRequest, userId: string) {
  // 1. Get personalized context
  const userContext = await this.userMemory.getPersonalizedContext(
    userId,
    request.messages[request.messages.length - 1].content
  );
  
  // 2. Enhance system prompt
  const enhancedPrompt = `
    ${request.messages[0].content}
    
    User Context:
    - Preferences: ${JSON.stringify(userContext.userPreferences)}
    - Is vegetarian: ${userContext.profile.isVegetarian}
    - Budget conscious: ${userContext.profile.budgetConscious}
    
    Past similar queries:
    ${userContext.pastQueries.map(q => `- ${q.message_text}`).join('\n')}
    
    Personalize your response based on this context.
  `;
  
  // 3. Call LLM with enhanced context
  return this.adminBackend.chat({
    ...request,
    messages: [
      { role: 'system', content: enhancedPrompt },
      ...request.messages.slice(1)
    ]
  });
}
```

---

### 4. **Search Integration Architecture**

#### Current vs Recommended

**Current** ❌
```
Search API (separate) ← Not integrated
    ↓
Dashboard (not connected)
    ↓
No agent integration
```

**Recommended** ✅
```
┌────────────────────────────────────────────┐
│          UNIFIED SEARCH SYSTEM              │
├────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐    ┌─────────────────┐ │
│  │ Vector Search│◄──►│ Keyword Search  │ │
│  │ (Redis)      │    │ (Elasticsearch?)│ │
│  └──────┬───────┘    └────────┬────────┘ │
│         │                     │           │
│         └──────────┬──────────┘           │
│                    │                      │
│         ┌──────────▼──────────┐          │
│         │  Search Orchestrator│          │
│         │  - Hybrid ranking   │          │
│         │  - Personalization  │          │
│         │  - A/B testing      │          │
│         └──────────┬──────────┘          │
│                    │                      │
└────────────────────┼──────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼────┐             ┌─────▼─────┐
   │ Search  │             │ Dashboard │
   │ Agent   │             │ (Admin)   │
   └─────────┘             └───────────┘
```

#### Implementation

```typescript
// SearchService with vector + keyword
class SearchService {
  async search(query: string, userId: string, options: SearchOptions) {
    // 1. Get user context
    const userContext = await this.userMemory.getPersonalizedContext(userId, query);
    
    // 2. Vector search (semantic)
    const queryEmbedding = await this.embedder.encode(query);
    const vectorResults = await this.redis.ft('idx:products').search(
      Query("*=>[KNN 20 @embedding $vec]")
        .return_fields("id", "name", "price", "category")
        .dialect(2),
      { vec: queryEmbedding.buffer }
    );
    
    // 3. Keyword search (exact match)
    const keywordResults = await this.phpBackend.get('/api/v1/items/search', {
      params: { query, limit: 20 }
    });
    
    // 4. Hybrid ranking (combine both)
    const rankedResults = this.rankResults(
      vectorResults,
      keywordResults,
      userContext.userPreferences
    );
    
    // 5. Personalize based on user
    return this.personalizeResults(rankedResults, userContext);
  }
  
  private rankResults(vectorResults, keywordResults, preferences) {
    // Combine scores
    const combined = {};
    
    // Vector results: semantic similarity
    vectorResults.forEach((item, i) => {
      combined[item.id] = {
        ...item,
        vectorScore: (20 - i) / 20, // Normalize rank
        keywordScore: 0
      };
    });
    
    // Keyword results: exact match
    keywordResults.forEach((item, i) => {
      if (combined[item.id]) {
        combined[item.id].keywordScore = (20 - i) / 20;
      } else {
        combined[item.id] = {
          ...item,
          vectorScore: 0,
          keywordScore: (20 - i) / 20
        };
      }
    });
    
    // Calculate hybrid score
    Object.values(combined).forEach(item => {
      item.finalScore = 
        (item.vectorScore * 0.7) +  // 70% semantic
        (item.keywordScore * 0.3);  // 30% exact
      
      // Boost based on preferences
      if (preferences.favorite_cuisines?.includes(item.category)) {
        item.finalScore *= 1.2; // 20% boost
      }
      
      if (preferences.price_sensitivity === 'low' && item.price < 500) {
        item.finalScore *= 1.15; // 15% boost for budget
      }
    });
    
    return Object.values(combined)
      .sort((a, b) => b.finalScore - a.finalScore);
  }
}
```

---

## 🚀 Migration Plan

### Phase 1: Event System (Week 1-2)
```
✅ Setup Redis Streams
✅ Implement message broker pattern
✅ Convert Gateway to publish messages
✅ Update mangwale-ai to consume from streams
✅ Add response streaming
```

### Phase 2: Vector Database (Week 2-3)
```
✅ Enable Redis Stack (docker)
✅ Create vector indices
✅ Generate embeddings for existing data
✅ Implement semantic search
✅ Test similarity queries
```

### Phase 3: User Memory (Week 3-4)
```
✅ Add user_behavior table (PostgreSQL)
✅ Build UserMemoryService
✅ Generate user profile embeddings
✅ Integrate with agent system
✅ Test personalization
```

### Phase 4: Search Integration (Week 4-5)
```
✅ Build SearchService
✅ Integrate vector + keyword search
✅ Add to agent functions
✅ Connect to dashboard
✅ Add analytics
```

### Phase 5: Real-time Features (Week 5-6)
```
✅ Implement WebSocket gateway
✅ Add SSE for streaming responses
✅ Real-time order updates
✅ Live agent status
✅ Push notifications
```

---

## 💰 Cost & Complexity Analysis

### Redis Vector DB
- **Cost**: $0 (use existing Redis, upgrade to Redis Stack)
- **Complexity**: Low (Python client simple)
- **Performance**: Excellent (microsecond queries)
- **Scalability**: Good (up to millions of vectors)

### Pinecone (Alternative)
- **Cost**: $70/month (starter), $200+/month (production)
- **Complexity**: Low (managed service)
- **Performance**: Excellent
- **Scalability**: Unlimited

### PostgreSQL pgvector (Alternative)
- **Cost**: $0 (already have PostgreSQL)
- **Complexity**: Medium (need to learn extension)
- **Performance**: Good (slower than specialized)
- **Scalability**: Moderate

**Recommendation**: **Redis Vector DB** ⭐
- Already have Redis
- No additional cost
- Easy to implement
- Fast enough for your scale
- Can always migrate to Pinecone later

---

## 🎯 Immediate Actions

1. **Fix Gateway** (Today)
   ```bash
   cd /home/ubuntu/Devs/mangwale-ai/api-gateway
   pm2 start dist/main.js --name mangwale-gateway --update-env
   ```

2. **Enable Redis Stack** (Today)
   ```bash
   # Install Redis Stack
   docker run -d --name redis-stack \
     -p 6379:6379 \
     -p 8001:8001 \
     redis/redis-stack:latest
   ```

3. **Create User Memory Schema** (Tomorrow)
   ```sql
   -- Run the user_behavior table creation
   -- Start tracking interactions
   ```

4. **Build UserMemoryService** (This Week)
   ```typescript
   // Implement basic user profiling
   // Generate embeddings
   // Store in Redis
   ```

5. **Integrate with Agents** (Next Week)
   ```typescript
   // Add context retrieval to LLM calls
   // Test personalization
   ```

---

## 📚 Learning Resources

1. **Redis as Vector DB**:
   - https://redis.io/docs/latest/develop/get-started/vector-database/
   - https://github.com/redis-developer/redis-ai-resources

2. **Event-Driven Architecture**:
   - https://redis.io/docs/latest/develop/interact/pubsub/
   - Redis Streams tutorial

3. **Semantic Search**:
   - https://www.sbert.net/ (SentenceTransformers)
   - https://huggingface.co/models?pipeline_tag=sentence-similarity

4. **RAG Pattern**:
   - https://python.langchain.com/docs/use_cases/question_answering/
   - https://www.pinecone.io/learn/retrieval-augmented-generation/

---

## 🎬 Conclusion

**Current State**: REST-based, no memory, no personalization  
**Recommended State**: Event-driven, vector-powered, user-aware

**Key Benefits**:
1. ✅ Real-time communication via Redis Streams
2. ✅ User memory & personalization via Vector DB
3. ✅ Semantic search via Redis vectors
4. ✅ Context-aware conversations
5. ✅ Minimal cost ($0 additional)
6. ✅ Use existing infrastructure

**Next Steps**:
1. Review this document with team
2. Approve architecture changes
3. Start Phase 1 (Event System)
4. Parallel work on User Memory schema
5. Test and iterate

---

**Questions? Concerns?**  
Let's discuss specific implementation details for any section.
