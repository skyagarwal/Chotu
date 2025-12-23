# 🏗️ MANGWALE SUPER APP - SCALABLE AI ARCHITECTURE

**Date:** October 27, 2025  
**Vision:** Build a world-class multi-module conversational AI super app  
**Decision:** Unified Dashboard at `dashboard.mangwale.ai`

---

## 📊 EXECUTIVE SUMMARY

### Current Ecosystem

| System | Domain | Port | Technology | Purpose | Status |
|--------|--------|------|------------|---------|--------|
| **Unified Dashboard** | `dashboard.mangwale.ai` | 3000 | Next.js 15 | Customer + Admin Interface | 🆕 TO BUILD |
| **Admin Backend** | `admin-backend:8080` | 8080 | Node + Express | AI Operations Platform | ✅ RUNNING |
| **Mangwale AI** | `mangwale-ai:3200` | 3200 | NestJS | Conversation Orchestration | ✅ RUNNING |
| **Search API** | `search.mangwale.ai` | 3100 | NestJS | Multi-module Search | ✅ RUNNING |
| **Image AI** | `image-ai:5500` | 5500 | FastAPI + Python | Vision Intelligence | 🔄 IN PROGRESS |
| **API Gateway** | `api-gateway:4001` | 4001 | NestJS | REST APIs for React | ✅ RUNNING |
| **PHP Backend** | `testing.mangwale.com` | - | Laravel | Legacy Business Logic | ✅ PRODUCTION |

---

## 🎯 ARCHITECTURE VISION

### The Super App Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED FRONTEND LAYER                            │
│                  dashboard.mangwale.ai (Next.js 15)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────┐         ┌──────────────────────────┐   │
│  │  CUSTOMER INTERFACE    │         │  ADMIN INTERFACE         │   │
│  │  (Public)              │         │  (Protected)             │   │
│  ├────────────────────────┤         ├──────────────────────────┤   │
│  │ /                      │         │ /admin/dashboard         │   │
│  │ ├─ Landing Page        │         │ ├─ Control Center        │   │
│  │ └─ Module Selection    │         │ ├─ AI Management         │   │
│  │                        │         │ │  ├─ Models Registry    │   │
│  │ /chat                  │         │ │  ├─ Agents (per module)│   │
│  │ ├─ 🍕 Food             │         │ │  ├─ NLU Training       │   │
│  │ ├─ 🛍️ Shop/Ecom       │         │ │  ├─ Flow Editor        │   │
│  │ ├─ 📦 Parcels          │         │ │  └─ Evaluation         │   │
│  │ ├─ 💳 Payments         │         │ ├─ Search Management    │   │
│  │ ├─ 🚗 Ride             │         │ │  ├─ Index Config       │   │
│  │ ├─ 🏥 Health           │         │ │  ├─ Analytics          │   │
│  │ ├─ 🏨 Rooms            │         │ │  └─ Trending           │   │
│  │ ├─ 🎬 Movies           │         │ ├─ Webhooks             │   │
│  │ └─ 💼 Services         │         │ ├─ API Keys             │   │
│  │                        │         │ ├─ Audit Logs           │   │
│  │ /search                │         │ └─ Billing              │   │
│  │ └─ Multi-module Search │         │                          │   │
│  │                        │         │ /admin/modules           │   │
│  │ /orders                │         │ └─ Per-module config     │   │
│  │ /profile               │         │    ├─ Food Agent         │   │
│  │ /wallet                │         │    ├─ Ecom Agent         │   │
│  │                        │         │    ├─ Parcel Agent       │   │
│  └────────────────────────┘         │    └─ ... (8 modules)    │   │
│                                      └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                    ↓                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ Admin Backend     │  │ Mangwale AI      │  │ Search API      │ │
│  │ (Port 8080)       │  │ (Port 3200)      │  │ (Port 3100)     │ │
│  ├───────────────────┤  ├──────────────────┤  ├─────────────────┤ │
│  │ 🧠 NLU Engine     │◄─┤ Conversation     │  │ OpenSearch      │ │
│  │ 📚 Training       │  │ Orchestration    │◄─┤ Multi-module    │ │
│  │ 🎯 Agents         │  │                  │  │ Indexes         │ │
│  │   └─ Food         │  │ Channel Router:  │  │                 │ │
│  │   └─ Ecom         │  │ ├─ WhatsApp      │  │ Modules:        │ │
│  │   └─ Parcel       │  │ ├─ Telegram      │  │ ├─ Food         │ │
│  │   └─ Payment      │  │ ├─ Web Chat      │  │ ├─ Ecom         │ │
│  │   └─ Ride         │  │ └─ Voice         │  │ ├─ Rooms        │ │
│  │   └─ Health       │  │                  │  │ ├─ Movies       │ │
│  │   └─ Room         │  │ Session Store:   │  │ └─ Services     │ │
│  │   └─ Movie        │  │ Redis DB 1       │  │                 │ │
│  │   └─ Service      │  │                  │  │ Analytics:      │ │
│  │                   │  │ Integrations:    │  │ ClickHouse      │ │
│  │ 🎤 ASR            │  │ ├─ Admin AI      │  │                 │ │
│  │ 🔊 TTS            │  │ ├─ Search API    │  │ CDC: Kafka      │ │
│  │ 👁️ Vision        │  │ └─ PHP Backend   │  │ Redpanda        │ │
│  │ 📝 Flows          │  │                  │  │                 │ │
│  │ 🔐 Auth/RBAC      │  └──────────────────┘  └─────────────────┘ │
│  └───────────────────┘                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA & INFRASTRUCTURE LAYER                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ PostgreSQL     │  │ Redis        │  │ OpenSearch Cluster   │   │
│  │ - AI Metadata  │  │ - Sessions   │  │ - Food Items/Stores  │   │
│  │ - Models       │  │ - Cache      │  │ - Ecom Items/Stores  │   │
│  │ - Datasets     │  │ - Rate Limit │  │ - 6 other modules    │   │
│  │ - Audit Logs   │  │              │  │ - Suggest Completion │   │
│  └────────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                      │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ MySQL (PHP)    │  │ ClickHouse   │  │ Kafka/Redpanda       │   │
│  │ - Orders       │  │ - Analytics  │  │ - CDC Events         │   │
│  │ - Users        │  │ - Trending   │  │ - Search Events      │   │
│  │ - Products     │  │ - Search     │  │ - Real-time Sync     │   │
│  │ - Stores       │  │   Queries    │  │                      │   │
│  └────────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎭 MODULE-WISE AGENT ARCHITECTURE

### Why Module-Specific Agents?

Each module (Food, Ecom, Parcel, etc.) has:
- **Different intents** - "order pizza" vs "book a ride" vs "send a package"
- **Different entities** - restaurant, cuisine vs product, brand vs pickup location
- **Different flows** - food ordering vs parcel booking vs ride hailing
- **Different capabilities** - search, voice, location, payments

### Agent Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                    MASTER ORCHESTRATOR                        │
│              (Admin Backend - Port 8080)                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Route Intent → Module-Specific Agent                        │
│                                                               │
│  Global Capabilities:                                         │
│  ├─ Language Detection (Hindi, English, Marathi)             │
│  ├─ Entity Extraction (locations, dates, numbers)            │
│  ├─ Sentiment Analysis                                        │
│  └─ Agent Handoff                                             │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ FOOD AGENT    │  │ ECOM AGENT    │  │ PARCEL AGENT  │
│ (agent_food)  │  │ (agent_ecom)  │  │ (agent_parcel)│
├───────────────┤  ├───────────────┤  ├───────────────┤
│ Intents:      │  │ Intents:      │  │ Intents:      │
│ - order_food  │  │ - search_     │  │ - book_parcel │
│ - search_     │  │   product     │  │ - track_      │
│   restaurant  │  │ - add_to_cart │  │   parcel      │
│ - modify_     │  │ - checkout    │  │ - modify_     │
│   order       │  │ - track_order │  │   booking     │
│ - track_order │  │               │  │               │
│               │  │ Capabilities: │  │ Capabilities: │
│ Capabilities: │  │ - Search API  │  │ - PHP Backend │
│ - Search API  │  │ - Inventory   │  │ - Zone Check  │
│ - Menu Fetch  │  │ - Pricing     │  │ - OSRM        │
│ - Cart Mgmt   │  │ - Cart        │  │ - Pricing     │
│ - Payments    │  │ - Payments    │  │ - Payments    │
│               │  │               │  │               │
│ NLU Model:    │  │ NLU Model:    │  │ NLU Model:    │
│ food_nlu_v1   │  │ ecom_nlu_v1   │  │ parcel_nlu_v1 │
└───────────────┘  └───────────────┘  └───────────────┘

        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ PAYMENT AGENT │  │ RIDE AGENT    │  │ HEALTH AGENT  │
│ (agent_pay)   │  │ (agent_ride)  │  │ (agent_health)│
├───────────────┤  ├───────────────┤  ├───────────────┤
│ Intents:      │  │ Intents:      │  │ Intents:      │
│ - recharge    │  │ - book_ride   │  │ - book_doctor │
│ - pay_bill    │  │ - track_ride  │  │ - book_lab    │
│ - check_      │  │ - cancel_ride │  │ - order_med   │
│   balance     │  │               │  │               │
│ - transaction │  │ Capabilities: │  │ Capabilities: │
│   history     │  │ - Maps API    │  │ - Clinic DB   │
│               │  │ - Driver Pool │  │ - Lab API     │
│ Capabilities: │  │ - Pricing     │  │ - Pharmacy    │
│ - Wallet API  │  │ - Tracking    │  │ - Payments    │
│ - Payment GW  │  │ - Payments    │  │               │
│ - UPI/Cards   │  │               │  │ NLU Model:    │
│               │  │ NLU Model:    │  │ health_nlu_v1 │
│ NLU Model:    │  │ ride_nlu_v1   │  │               │
│ payment_nlu   │  │               │  │               │
└───────────────┘  └───────────────┘  └───────────────┘

        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ ROOM AGENT    │  │ MOVIE AGENT   │  │ SERVICE AGENT │
│ (agent_room)  │  │ (agent_movie) │  │ (agent_svc)   │
├───────────────┤  ├───────────────┤  ├───────────────┤
│ Intents:      │  │ Intents:      │  │ Intents:      │
│ - book_room   │  │ - search_     │  │ - book_       │
│ - check_      │  │   movie       │  │   service     │
│   availability│  │ - book_ticket │  │ - schedule    │
│ - modify_     │  │ - check_      │  │ - track_      │
│   booking     │  │   shows       │  │   service     │
│               │  │               │  │               │
│ Capabilities: │  │ Capabilities: │  │ Capabilities: │
│ - Hotel DB    │  │ - Search API  │  │ - Provider DB │
│ - Booking API │  │ - Theater API │  │ - Scheduling  │
│ - Payments    │  │ - Seat Select │  │ - Payments    │
│               │  │ - Payments    │  │               │
│ NLU Model:    │  │               │  │ NLU Model:    │
│ room_nlu_v1   │  │ NLU Model:    │  │ service_nlu   │
│               │  │ movie_nlu_v1  │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
```

### Agent Configuration

```typescript
// Admin Backend - Agent Registry

{
  agents: [
    {
      id: "agent_food",
      name: "Food Ordering Agent",
      module: "food",
      defaultModel: "model_llama_3_8b",
      nluProvider: "nlu_food_v1",
      asrProvider: "asr_whisper",
      ttsProvider: "tts_elevenlabs",
      capabilities: {
        search: true,
        voice: true,
        payments: true,
        location: true,
        multilingual: ["en", "hi", "mr"]
      },
      intents: [
        { id: "order_food", confidence_threshold: 0.7 },
        { id: "search_restaurant", confidence_threshold: 0.75 },
        { id: "modify_order", confidence_threshold: 0.8 },
        { id: "track_order", confidence_threshold: 0.85 }
      ],
      flows: ["food_order_flow", "food_search_flow"],
      fallbackAgent: "agent_general"
    },
    
    {
      id: "agent_ecom",
      name: "E-commerce Agent",
      module: "ecom",
      defaultModel: "model_llama_3_8b",
      nluProvider: "nlu_ecom_v1",
      asrProvider: "asr_whisper",
      ttsProvider: "tts_elevenlabs",
      capabilities: {
        search: true,
        voice: true,
        payments: true,
        cart: true,
        wishlist: true,
        multilingual: ["en", "hi", "mr"]
      },
      intents: [
        { id: "search_product", confidence_threshold: 0.7 },
        { id: "add_to_cart", confidence_threshold: 0.8 },
        { id: "checkout", confidence_threshold: 0.85 },
        { id: "track_order", confidence_threshold: 0.85 }
      ],
      flows: ["ecom_browse_flow", "ecom_checkout_flow"],
      fallbackAgent: "agent_general"
    },
    
    // ... 7 more module agents
  ]
}
```

---

## 🔍 SEARCH API INTEGRATION

### Multi-Module Search Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    SEARCH API (Port 3100)                     │
│                   search.mangwale.ai                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  OpenSearch Cluster (Port 9200)                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Indices (8 Modules × 2 Types = 16 Indices)              │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  FOOD MODULE:                                            │ │
│  │  ├─ food_items     (menu items, dishes)                 │ │
│  │  └─ food_stores    (restaurants)                        │ │
│  │                                                          │ │
│  │  ECOM MODULE:                                            │ │
│  │  ├─ ecom_items     (products)                           │ │
│  │  └─ ecom_stores    (shops, groceries)                   │ │
│  │                                                          │ │
│  │  PARCEL MODULE:                                          │ │
│  │  ├─ parcel_zones   (service areas)                      │ │
│  │  └─ parcel_stores  (parcel centers)                     │ │
│  │                                                          │ │
│  │  RIDE MODULE:                                            │ │
│  │  ├─ ride_locations (pickup/drop points)                 │ │
│  │  └─ ride_drivers   (active drivers)                     │ │
│  │                                                          │ │
│  │  HEALTH MODULE:                                          │ │
│  │  ├─ health_services (doctors, labs, meds)               │ │
│  │  └─ health_providers (clinics, pharmacies)              │ │
│  │                                                          │ │
│  │  ROOM MODULE:                                            │ │
│  │  ├─ rooms_items    (room types)                         │ │
│  │  └─ rooms_stores   (hotels, properties)                 │ │
│  │                                                          │ │
│  │  MOVIE MODULE:                                           │ │
│  │  ├─ movies_items   (films, shows)                       │ │
│  │  └─ movies_stores  (theaters)                           │ │
│  │                                                          │ │
│  │  SERVICE MODULE:                                         │ │
│  │  ├─ services_items (spa, salon, etc.)                   │ │
│  │  └─ services_stores (service providers)                 │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Analytics: ClickHouse                                        │
│  ├─ Search Events (queries, clicks, results)                 │
│  ├─ Trending Queries (per module, time of day)               │
│  └─ User Behavior (search-to-order conversion)               │
│                                                               │
│  Real-time Sync: Kafka/Redpanda                              │
│  └─ CDC from MySQL → OpenSearch                              │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Search API Endpoints

```typescript
// Items Search (per module)
GET /search/food?q=pizza&veg=1&lat=19.99&lon=73.78&radius_km=5
GET /search/ecom?q=milk&brand=amul&price_min=50&price_max=200
GET /search/rooms?q=deluxe&lat=19.99&lon=73.78
GET /search/movies?q=action&genre=Action
GET /search/services?q=spa&category=Beauty&rating_min=4

// Stores Search (per module)
GET /search/food/stores?lat=19.99&lon=73.78&radius_km=5&delivery_time_max=30
GET /search/ecom/stores?lat=19.99&lon=73.78&radius_km=10
GET /search/rooms/stores?lat=19.99&lon=73.78
GET /search/movies/stores?lat=19.99&lon=73.78&radius_km=10

// Typeahead Suggestions
GET /search/food/suggest?q=pi
GET /search/ecom/suggest?q=mi
GET /search/rooms/suggest?q=de

// Category-Based Fast Search (Mobile Optimized)
GET /search/food/category?category_id=288&lat=19.99&lon=73.78&sort=distance
GET /search/ecom/category?category_id=5002&brand=amul&sort=price_asc

// Trending Analytics
GET /analytics/trending?window=7d&module=food&time_of_day=evening

// Natural Language Search Agent
GET /search/agent?q=veg pizza near me open now under 300&lat=19.99&lon=73.78

// ASR Integration
POST /search/asr (multipart/form-data: audio file)
```

### Search Integration in Conversations

```typescript
// Mangwale AI → Search API Integration
// src/conversation/services/conversation.service.ts

async handleFoodSearch(phoneNumber: string, query: string) {
  const session = await this.sessionService.getSession(phoneNumber);
  
  // 1. Get user location from session or ask
  const location = session.location || await this.askLocation(phoneNumber);
  
  // 2. Call Search API
  const results = await this.searchClient.post('/search/food', {
    q: query,
    lat: location.lat,
    lon: location.lng,
    radius_km: 5,
    open_now: true,
    page: 1,
    size: 10
  });
  
  // 3. Format results as cards
  const cards = results.items.map(item => ({
    id: item.id,
    title: item.name,
    subtitle: `₹${item.price} • ${item.store_name}`,
    image: item.image_url,
    action: `order:${item.id}`
  }));
  
  // 4. Send via messaging service
  await this.messagingService.sendCards(
    Platform.WHATSAPP,
    phoneNumber,
    `Found ${results.meta.total} items:`,
    cards
  );
}
```

---

## 🧠 ADMIN BACKEND DEEP DIVE

### Complete Capabilities Matrix

| Feature | Endpoints | Status | Integration Point |
|---------|-----------|--------|-------------------|
| **NLU** | `/nlu/*` | ✅ Production | Mangwale AI classifies all messages |
| **Training** | `/training/*` | ✅ Production | Real ML pipeline, datasets, jobs |
| **Agents** | `/agents/*` | ✅ Production | Module-wise agents, orchestration |
| **Models** | `/models/*` | ✅ Production | LLM registry, vLLM integration |
| **ASR** | `/asr/*` | ✅ Production | Whisper, Deepgram, Azure STT |
| **TTS** | `/tts/*` | ✅ Production | OpenTTS, XTTS, ElevenLabs, Azure |
| **Flows** | `/flows/*` | ✅ Production | Visual flow builder, execution |
| **Delegation** | `/delegation/*` | ✅ Production | Agent-to-agent handoff |
| **Webhooks** | `/webhooks/*` | ✅ Production | External integrations |
| **Metrics** | `/metrics/*` | ✅ Production | System monitoring |
| **Audit** | `/audits/*` | ✅ Production | Complete audit trail |
| **Auth** | `/auth/*` | ✅ Production | JWT, API keys, TOTP 2FA |

### Training System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  TRAINING PIPELINE                            │
│              (Admin Backend - Port 8080)                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Phase 1: Data Collection                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 1. Conversation Logging                                  ││
│  │    └─ Mangwale AI logs all user messages + bot responses││
│  │                                                           ││
│  │ 2. Auto-labeling (Weak Supervision)                      ││
│  │    ├─ High confidence predictions → auto-label          ││
│  │    └─ Low confidence → flag for human review            ││
│  │                                                           ││
│  │ 3. Dataset Creation                                      ││
│  │    POST /training/datasets                               ││
│  │    {                                                     ││
│  │      name: "food_nlu_dataset_v2",                        ││
│  │      type: "nlu",                                        ││
│  │      module: "food"                                      ││
│  │    }                                                     ││
│  │                                                           ││
│  │ 4. Add Examples (Bulk)                                   ││
│  │    POST /training/datasets/:id/examples/bulk             ││
│  │    {                                                     ││
│  │      examples: [                                         ││
│  │        { text: "I want pizza", intent: "order_food" },  ││
│  │        { text: "track my order", intent: "track_order" }││
│  │      ]                                                    ││
│  │    }                                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Phase 2: Training Execution                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 1. Queue Training Job                                    ││
│  │    POST /training/jobs                                   ││
│  │    {                                                     ││
│  │      type: "nlu-train",                                  ││
│  │      dataset_id: "ds_food_v2",                           ││
│  │      config: {                                           ││
│  │        epochs: 10,                                       ││
│  │        batch_size: 32,                                   ││
│  │        learning_rate: 0.001                              ││
│  │      }                                                    ││
│  │    }                                                     ││
│  │                                                           ││
│  │ 2. Background Training Loop                              ││
│  │    ├─ Load dataset from PostgreSQL                       ││
│  │    ├─ Split train/validation (80/20)                     ││
│  │    ├─ Train model (scikit-learn, transformers, or custom)││
│  │    ├─ Update progress in real-time                       ││
│  │    └─ Save model artifacts                               ││
│  │                                                           ││
│  │ 3. Progress Tracking                                     ││
│  │    GET /training/jobs/:id                                ││
│  │    {                                                     ││
│  │      status: "training",                                 ││
│  │      progress: 0.45,                                     ││
│  │      epoch: 5,                                           ││
│  │      loss: 0.234,                                        ││
│  │      accuracy: 0.89                                      ││
│  │    }                                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Phase 3: Deployment & Integration                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 1. Model Registration                                    ││
│  │    POST /nlu                                             ││
│  │    {                                                     ││
│  │      id: "nlu_food_v2",                                  ││
│  │      name: "Food NLU Model v2",                          ││
│  │      endpoint: "http://localhost:5000/classify",         ││
│  │      enabled: true                                       ││
│  │    }                                                     ││
│  │                                                           ││
│  │ 2. Agent Update                                          ││
│  │    PUT /agents/agent_food                                ││
│  │    {                                                     ││
│  │      nluProvider: "nlu_food_v2"  // Switch to new model ││
│  │    }                                                     ││
│  │                                                           ││
│  │ 3. A/B Testing (Optional)                                ││
│  │    ├─ Split traffic 50/50                               ││
│  │    ├─ Compare v1 vs v2 accuracy                         ││
│  │    └─ Gradual rollout                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Key Training Features

1. **Real Training Loop** - Not a mockup, actual ML training
2. **Multiple Model Types** - NLU, ASR fine-tuning, TTS
3. **Progress Tracking** - Real-time updates via WebSocket or polling
4. **Model Versioning** - Keep multiple versions, easy rollback
5. **A/B Testing** - Compare models side-by-side
6. **Auto-labeling** - Weak supervision for faster dataset creation
7. **Continuous Learning** - Production data → training → deployment

---

## 🚀 SCALABILITY STRATEGY

### Horizontal Scaling

```
┌──────────────────────────────────────────────────────────────┐
│                  KUBERNETES DEPLOYMENT                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Namespace: mangwale-production                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Frontend: dashboard.mangwale.ai                          ││
│  │ ├─ Deployment: mangwale-dashboard                        ││
│  │ ├─ Replicas: 3 (auto-scale 3-10)                        ││
│  │ ├─ Image: mangwale-dashboard:latest                      ││
│  │ ├─ Port: 3000                                            ││
│  │ └─ Resources: 512Mi RAM, 0.5 CPU                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Admin Backend: admin-backend                             ││
│  │ ├─ Deployment: admin-backend                             ││
│  │ ├─ Replicas: 2 (auto-scale 2-6)                         ││
│  │ ├─ Image: mangwale-admin-backend:latest                  ││
│  │ ├─ Port: 8080                                            ││
│  │ └─ Resources: 2Gi RAM, 1 CPU                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Mangwale AI: mangwale-ai                                 ││
│  │ ├─ Deployment: mangwale-ai                               ││
│  │ ├─ Replicas: 3 (auto-scale 3-10)                        ││
│  │ ├─ Image: mangwale-ai:latest                             ││
│  │ ├─ Port: 3200                                            ││
│  │ └─ Resources: 1Gi RAM, 0.5 CPU                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Search API: search-api                                   ││
│  │ ├─ Deployment: search-api                                ││
│  │ ├─ Replicas: 2 (auto-scale 2-8)                         ││
│  │ ├─ Image: mangwale-search-api:latest                     ││
│  │ ├─ Port: 3100                                            ││
│  │ └─ Resources: 1Gi RAM, 0.5 CPU                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ OpenSearch Cluster                                       ││
│  │ ├─ StatefulSet: opensearch-cluster                       ││
│  │ ├─ Replicas: 3 nodes (master, data, ingest)             ││
│  │ ├─ Storage: 100Gi SSD per node                          ││
│  │ └─ Resources: 4Gi RAM, 2 CPU per node                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Redis Cluster                                            ││
│  │ ├─ StatefulSet: redis-cluster                            ││
│  │ ├─ Replicas: 6 (3 master + 3 replica)                   ││
│  │ └─ Resources: 2Gi RAM, 0.5 CPU per node                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **API Response Time** | <100ms (p95) | Redis cache, CDN, connection pooling |
| **Search Latency** | <50ms (p95) | OpenSearch optimization, geo-sharding |
| **Chat Message** | <200ms (p95) | Async processing, WebSocket |
| **NLU Classification** | <50ms | Model optimization, batch inference |
| **Concurrent Users** | 100K+ | Horizontal scaling, load balancing |
| **Messages/sec** | 10K+ | Queue-based processing, Kafka |
| **Database Queries** | <20ms (p95) | Indexing, read replicas, caching |
| **Uptime** | 99.9% | Multi-region, auto-healing, monitoring |

---

## 📱 UNIFIED DASHBOARD IMPLEMENTATION

### Tech Stack Decision

```typescript
// Next.js 15 Project Structure

mangwale-unified-dashboard/
├── src/
│   ├── app/
│   │   ├── (public)/                    // Public routes
│   │   │   ├── page.tsx                 // Landing page
│   │   │   ├── chat/                    // Customer chat
│   │   │   │   ├── page.tsx             // Main chat interface
│   │   │   │   ├── [module]/            // Module-specific chats
│   │   │   │   └── layout.tsx
│   │   │   ├── search/                  // Multi-module search
│   │   │   ├── orders/                  // Order tracking
│   │   │   └── profile/                 // User profile
│   │   │
│   │   ├── (admin)/                     // Protected admin routes
│   │   │   ├── layout.tsx               // Admin layout with auth
│   │   │   ├── dashboard/               // Control center
│   │   │   ├── models/                  // Model registry
│   │   │   ├── agents/                  // Agent management
│   │   │   │   ├── page.tsx             // Agents list
│   │   │   │   ├── [id]/                // Agent detail
│   │   │   │   └── [id]/training/       // Training interface
│   │   │   ├── flows/                   // Flow editor
│   │   │   ├── training/                // Training dashboard
│   │   │   ├── search-config/           // Search management
│   │   │   ├── webhooks/                // Webhook config
│   │   │   ├── api-keys/                // API key management
│   │   │   └── modules/                 // Per-module config
│   │   │       ├── food/
│   │   │       ├── ecom/
│   │   │       ├── parcel/
│   │   │       └── ... (8 modules)
│   │   │
│   │   └── api/                         // Next.js API routes (optional)
│   │       ├── auth/[...nextauth].ts    // NextAuth.js
│   │       └── proxy/                   // Backend proxies
│   │
│   ├── components/
│   │   ├── admin/                       // Admin components
│   │   │   ├── ModelRegistry.tsx
│   │   │   ├── AgentConfig.tsx
│   │   │   ├── FlowEditor.tsx
│   │   │   ├── TrainingDashboard.tsx
│   │   │   └── SearchConfig.tsx
│   │   │
│   │   ├── chat/                        // Chat components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── ModuleTabs.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── OptionChips.tsx
│   │   │   └── Composer.tsx
│   │   │
│   │   ├── search/                      // Search components
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   ├── FoodCard.tsx
│   │   │   └── StoreCard.tsx
│   │   │
│   │   └── shared/                      // Shared UI components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── admin-backend.ts         // Admin Backend client
│   │   │   ├── mangwale-ai.ts           // Mangwale AI client
│   │   │   ├── search-api.ts            // Search API client
│   │   │   └── php-backend.ts           // PHP Backend client
│   │   │
│   │   ├── auth/
│   │   │   ├── next-auth.ts             // Auth config
│   │   │   └── middleware.ts            // Auth middleware
│   │   │
│   │   ├── websocket/
│   │   │   └── chat-client.ts           // WebSocket for chat
│   │   │
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       └── constants.ts
│   │
│   ├── hooks/
│   │   ├── useChat.ts
│   │   ├── useSearch.ts
│   │   ├── useAgent.ts
│   │   └── useTraining.ts
│   │
│   ├── types/
│   │   ├── agent.ts
│   │   ├── chat.ts
│   │   ├── search.ts
│   │   └── training.ts
│   │
│   └── styles/
│       └── globals.css
│
├── public/
│   ├── avatars/
│   ├── icons/
│   └── images/
│
├── .env.local
├── .env.production
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Key Libraries

```json
{
  "dependencies": {
    "next": "15.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    
    "next-auth": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    
    "socket.io-client": "^4.7.0",
    "@radix-ui/react-*": "latest",
    "framer-motion": "^11.0.0",
    "lucide-react": "latest",
    
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "latest",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    
    "zod": "^3.22.0",
    "react-hook-form": "^7.50.0"
  }
}
```

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-4)

**Week 1-2: Unified Dashboard Setup**
- [ ] Create Next.js 15 project
- [ ] Setup project structure
- [ ] Configure Tailwind + shadcn/ui
- [ ] Implement auth with NextAuth.js
- [ ] Setup API clients for all backends

**Week 2-3: Admin Features Migration**
- [ ] Port Model Registry
- [ ] Port Agent Management (with module-wise agents)
- [ ] Port Training Dashboard
- [ ] Port Flow Editor
- [ ] Add RBAC middleware

**Week 3-4: Chat Interface**
- [ ] Super Assistant UI
- [ ] Module tabs (8 modules)
- [ ] WebSocket integration
- [ ] Option chips & cards
- [ ] Voice input (ASR integration)

### Phase 2: Search Integration (Weeks 5-6)

- [ ] Search bar component
- [ ] Multi-module search results
- [ ] Category browsing
- [ ] Store listings
- [ ] Trending analytics display

### Phase 3: Module-Specific Agents (Weeks 7-10)

- [ ] Food Agent setup + training
- [ ] Ecom Agent setup + training
- [ ] Parcel Agent setup + training
- [ ] Payment Agent setup
- [ ] Ride Agent setup
- [ ] Health Agent setup
- [ ] Room Agent setup
- [ ] Movie Agent setup
- [ ] Service Agent setup

### Phase 4: Advanced Features (Weeks 11-14)

- [ ] Agent orchestration (handoffs)
- [ ] Multi-language support (Hindi, Marathi)
- [ ] Voice ordering (ASR + TTS)
- [ ] Payment integrations
- [ ] Order tracking
- [ ] Push notifications
- [ ] PWA configuration

### Phase 5: Training & Optimization (Weeks 15-16)

- [ ] Collect production data
- [ ] Train all 9 module NLU models
- [ ] A/B testing framework
- [ ] Performance optimization
- [ ] Load testing
- [ ] Security audit

### Phase 6: Deployment (Weeks 17-18)

- [ ] Kubernetes setup
- [ ] CI/CD pipeline
- [ ] Monitoring & alerts
- [ ] Staging deployment
- [ ] Production deployment
- [ ] DNS & SSL configuration

---

## 📊 SUCCESS METRICS

### Technical KPIs

- ✅ API Response Time: <100ms (p95)
- ✅ Search Latency: <50ms (p95)
- ✅ NLU Accuracy: >90% per module
- ✅ Uptime: 99.9%
- ✅ Chat Message Latency: <200ms
- ✅ Concurrent Users: 100K+

### Business KPIs

- ✅ Orders via chat: 30% of total orders
- ✅ Search-to-order conversion: >15%
- ✅ Module adoption: 8/8 modules active
- ✅ User satisfaction: >4.5/5
- ✅ Agent accuracy: >90% per module
- ✅ Cost reduction: 50% vs traditional app

---

## 🔐 SECURITY & COMPLIANCE

- ✅ JWT authentication
- ✅ API key management
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Data encryption (at rest & in transit)
- ✅ Audit logging
- ✅ GDPR compliance
- ✅ PCI DSS (for payments)
- ✅ Role-based access control

---

## 📝 NEXT STEPS

1. **Approve Architecture** - Review and approve this document
2. **Create Unified Dashboard** - Setup Next.js project
3. **Migrate Admin Features** - Port existing admin frontend
4. **Setup Module Agents** - Configure 9 module-specific agents
5. **Integrate Search API** - Connect multi-module search
6. **Train NLU Models** - One model per module
7. **Deploy to Production** - Kubernetes deployment

---

**Status:** ✅ **READY FOR IMPLEMENTATION**  
**Recommendation:** **Proceed with Option A - Unified Dashboard at dashboard.mangwale.ai**

This architecture provides:
- 🚀 Scalability (handle millions of users)
- 🧠 Intelligence (module-specific AI agents)
- 🔍 Search (multi-module OpenSearch)
- 🎯 Modularity (easy to add new modules)
- 💰 Cost-effective (unified codebase)
- 🌐 Multi-channel (WhatsApp, Web, Telegram, Voice)

**Let's build the future of conversational super apps! 🚀**
