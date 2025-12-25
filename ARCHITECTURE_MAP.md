# MangwaleAI System Architecture Map

> **Generated**: December 25, 2024  
> **Version**: Comprehensive Analysis v1.0

---

## 📁 Project Structure Overview

```
MangwaleAI/
├── frontend/                   # Next.js Frontend (Port 3005)
├── backend/                    # NestJS Backend (Port 3200)
├── scraper-service/            # Competitor Data Scraper (Port 3300)
├── docker-compose.dev.yml      # Development Docker Configuration
└── docs/                       # Documentation
```

---

## 🖥️ 1. FRONTEND ARCHITECTURE

**Location**: `/home/ubuntu/Devs/MangwaleAI/frontend`  
**Framework**: Next.js 14 (App Router)  
**Port**: 3005

### 1.1 Page Structure (`/frontend/src/app/`)

| Route | Purpose | Key File |
|-------|---------|----------|
| `/(public)/chat/` | **Main Chat UI** - Customer-facing conversational AI | [page.tsx](frontend/src/app/(public)/chat/page.tsx) |
| `/(public)/orders/` | Order history & tracking | page.tsx |
| `/(public)/profile/` | User profile management | page.tsx |
| `/(public)/search/` | Search functionality | page.tsx |
| `/(public)/wallet/` | Wallet/payments | page.tsx |
| `/(auth)/` | Authentication routes (login/register) | - |
| `/admin/` | **Admin Dashboard** - Full management console | layout.tsx |
| `/landing/` | Landing page | page.tsx |

### 1.2 Admin Dashboard Pages (`/frontend/src/app/admin/`)

| Page | Purpose |
|------|---------|
| `/admin/dashboard` | Main analytics dashboard |
| `/admin/agents` | AI Agent management |
| `/admin/flows` | Visual flow builder |
| `/admin/intents` | Intent management |
| `/admin/nlu` | NLU training & testing |
| `/admin/nlu-testing` | NLU test interface |
| `/admin/llm-models` | LLM model configuration |
| `/admin/llm-providers` | LLM provider settings |
| `/admin/voice` | Voice/TTS configuration |
| `/admin/channels` | Channel management (WhatsApp, Telegram) |
| `/admin/training` | ML training pipeline |
| `/admin/gamification` | Game & rewards system |
| `/admin/analytics` | Detailed analytics |
| `/admin/monitoring` | System monitoring |
| `/admin/settings` | System settings |
| `/admin/tenants` | Multi-tenant management |
| `/admin/zones` | Delivery zone configuration |
| `/admin/search-config` | Search configuration |
| `/admin/semantic-cache` | Semantic cache management |
| `/admin/webhooks` | Webhook configuration |

### 1.3 Chat Interface Architecture

**Main Chat Component**: [/frontend/src/app/(public)/chat/page.tsx](frontend/src/app/(public)/chat/page.tsx)

```
Chat UI Components (/frontend/src/components/chat/)
├── ProductCard.tsx         # Product display cards
├── CompactProductCard.tsx  # Compact product cards
├── AddressForm.tsx         # Address input form
├── InlineLogin.tsx         # Inline authentication
├── VoiceInput.tsx          # Voice input (browser-based)
├── EnhancedVoiceInput.tsx  # Enhanced voice (upload-based)
├── TTSButton.tsx           # Text-to-speech button
├── ProfileCompletionForm.tsx # Profile completion
├── PaymentButton.tsx       # Payment integration
└── ParcelCard.tsx          # Parcel delivery card
```

### 1.4 Frontend → Backend Communication

**WebSocket Client**: [/frontend/src/lib/websocket/chat-client.ts](frontend/src/lib/websocket/chat-client.ts)

```typescript
// Connection URL detection (auto-detects environment)
const getWsUrl = () => {
  // Production: https://chat.mangwale.ai (via Traefik)
  // Development: http://localhost:3200
}

// Socket.IO Namespace: /ai-agent
// Events:
// - session:join      → Join a chat session
// - send_message      → Send user message
// - request_location  → Location request
// - auth:sync         → Auth synchronization
// - auth:logout       → Logout across channels
```

**Key Events Flow**:
```
User Input → WebSocket → ChatGateway → FlowEngine → Response → WebSocket → UI Update
```

---

## ⚙️ 2. BACKEND ARCHITECTURE

**Location**: `/home/ubuntu/Devs/MangwaleAI/backend`  
**Framework**: NestJS  
**Port**: 3200

### 2.1 Entry Point

**Main File**: [/backend/src/main.ts](backend/src/main.ts)

```typescript
// Key Configuration:
- WebSocket adapter (Socket.IO)
- Global validation pipe
- API prefix: /api (except /health, /ready, /metrics)
- CORS for localhost:3000, 3001, 3005, *.mangwale.ai
```

### 2.2 Module Structure ([/backend/src/app.module.ts](backend/src/app.module.ts))

```
Core Modules:
├── DatabaseModule          # Prisma + PostgreSQL
├── ConversationModule      # 🔴 CORE - Conversation logic
├── FlowEngineModule        # 🔴 CORE - State machine flows
├── ChatModule              # WebSocket gateway
├── NluModule               # Intent classification
├── LlmModule               # LLM orchestration (vLLM + Cloud)
├── SearchModule            # OpenSearch integration
├── AgentsModule            # AI agent system
├── SessionModule           # Redis session management

AI/ML Modules:
├── AsrModule               # Speech-to-Text
├── TtsModule               # Text-to-Speech
├── TrainingModule          # ML training pipeline
├── PersonalizationModule   # User profiling
├── LearningModule          # Self-learning
├── VisionModule            # Image AI (disabled)

Business Modules:
├── OrderFlowModule         # Order orchestration
├── ParcelModule            # Parcel delivery
├── GamificationModule      # Rewards & games
├── ZonesModule             # Delivery zones
├── RoutingModule           # OSRM distance calc
├── StoresModule            # Store schedules
├── PricingModule           # Pricing logic

Channel Modules:
├── WhatsAppModule          # WhatsApp integration
├── TelegramModule          # Telegram integration
├── VoiceModule             # Voice IVR (Twilio/Exotel)

Integration Modules:
├── PhpIntegrationModule    # PHP backend integration
├── IntegrationsModule      # External APIs
```

### 2.3 Conversation Handling

#### ChatGateway (WebSocket Entry)
**File**: [/backend/src/chat/chat.gateway.ts](backend/src/chat/chat.gateway.ts)

```typescript
@WebSocketGateway({ namespace: '/ai-agent' })
export class ChatGateway {
  // Key Events:
  @SubscribeMessage('session:join')    // User joins session
  @SubscribeMessage('send_message')    // User sends message
  @SubscribeMessage('option_click')    // User clicks button
  @SubscribeMessage('location:share')  // User shares location
  @SubscribeMessage('auth:sync')       // Auth sync across channels
}
```

#### ConversationService (Channel-Agnostic Logic)
**File**: [/backend/src/conversation/services/conversation.service.ts](backend/src/conversation/services/conversation.service.ts)

```typescript
// Core conversation orchestrator
// Works across ALL channels: WhatsApp, Telegram, Web, Mobile, Voice
// Key Methods:
- processMessage(phoneNumber, message)
- handleAgentResponse()
- handleAuthFlow()
```

#### SessionService (Redis-Based Sessions)
**File**: [/backend/src/session/session.service.ts](backend/src/session/session.service.ts)

```typescript
interface Session {
  phoneNumber: string;
  currentStep: string;
  data: Record<string, any>;  // Cart, auth, location, etc.
  createdAt: number;
  updatedAt: number;
}
// TTL: Configurable (default 24 hours)
// Key format: session:{phoneNumber}
```

---

## 🔄 3. FLOW ENGINE (State Machine)

**Location**: `/home/ubuntu/Devs/MangwaleAI/backend/src/flow-engine/`

### 3.1 Core Components

| File | Purpose |
|------|---------|
| [flow-engine.service.ts](backend/src/flow-engine/flow-engine.service.ts) | Main flow orchestrator |
| [state-machine.engine.ts](backend/src/flow-engine/state-machine.engine.ts) | State transition engine |
| [flow-context.service.ts](backend/src/flow-engine/flow-context.service.ts) | Context management |
| [executor-registry.service.ts](backend/src/flow-engine/executor-registry.service.ts) | Executor registry |

### 3.2 Available Flows (`/backend/src/flow-engine/flows/`)

| Flow | Trigger | Purpose |
|------|---------|---------|
| [food-order.flow.ts](backend/src/flow-engine/flows/food-order.flow.ts) | `order_food`, `browse_menu` | Complete food ordering |
| [auth.flow.ts](backend/src/flow-engine/flows/auth.flow.ts) | `login` | Authentication & OTP |
| [address-management.flow.ts](backend/src/flow-engine/flows/address-management.flow.ts) | `manage_address` | Address CRUD |
| [parcel-delivery.flow.ts](backend/src/flow-engine/flows/parcel-delivery.flow.ts) | `send_parcel` | Parcel booking |
| [order-tracking.flow.ts](backend/src/flow-engine/flows/order-tracking.flow.ts) | `track_order` | Order tracking |
| [ecommerce-order.flow.ts](backend/src/flow-engine/flows/ecommerce-order.flow.ts) | `shop`, `buy` | E-commerce orders |
| [greeting.flow.ts](backend/src/flow-engine/flows/greeting.flow.ts) | `greeting` | Welcome messages |
| [help.flow.ts](backend/src/flow-engine/flows/help.flow.ts) | `help` | Help & support |
| [chitchat.flow.ts](backend/src/flow-engine/flows/chitchat.flow.ts) | `chitchat` | Casual conversation |
| [farewell.flow.ts](backend/src/flow-engine/flows/farewell.flow.ts) | `farewell` | Goodbye messages |
| [feedback.flow.ts](backend/src/flow-engine/flows/feedback.flow.ts) | `feedback` | User feedback |
| [profile.flow.ts](backend/src/flow-engine/flows/profile.flow.ts) | `profile` | Profile management |
| [support.flow.ts](backend/src/flow-engine/flows/support.flow.ts) | `support` | Customer support |
| game-intro.flow.ts | `game` | Gamification intro |

### 3.3 Flow Executors (`/backend/src/flow-engine/executors/`)

| Executor | Purpose |
|----------|---------|
| **search.executor.ts** | OpenSearch product search |
| **cart-manager.executor.ts** | Cart operations (add/remove/validate) |
| **nlu.executor.ts** | NLU intent/entity extraction |
| **llm.executor.ts** | LLM response generation |
| **auth.executor.ts** | Authentication operations |
| **address.executor.ts** | Address management |
| **order.executor.ts** | Order creation & management |
| **pricing.executor.ts** | Price calculations |
| **distance.executor.ts** | Distance calculations (OSRM) |
| **zone.executor.ts** | Zone detection |
| **inventory.executor.ts** | Inventory checks |
| **selection.executor.ts** | Item selection logic |
| **session.executor.ts** | Session management |
| **response.executor.ts** | Response formatting |
| **adaptive.executor.ts** | Adaptive responses |
| **php-api.executor.ts** | PHP backend calls |
| **parcel.executor.ts** | Parcel operations |
| **preference.executor.ts** | User preferences |
| **game.executor.ts** | Gamification actions |
| **external-search.executor.ts** | External search APIs |
| **group-order-search.executor.ts** | Group order search |
| **auto-cart.executor.ts** | Auto-add to cart |
| **complex-order-parser.executor.ts** | Parse complex orders |
| **value-proposition.executor.ts** | Value props display |

### 3.4 Flow State Types

```typescript
type StateType = 'action' | 'wait' | 'decision' | 'end';

// action: Execute actions immediately, then transition
// wait: Display prompt, wait for user input
// decision: Evaluate conditions, route accordingly
// end: Flow completion
```

---

## 🧠 4. NLU & INTENT CLASSIFICATION

**Location**: `/home/ubuntu/Devs/MangwaleAI/backend/src/nlu/`

### 4.1 NLU Service
**File**: [/backend/src/nlu/services/nlu.service.ts](backend/src/nlu/services/nlu.service.ts)

```typescript
// Pipeline:
1. IntentClassifierService  → IndicBERT model (GPU)
2. EntityExtractorService   → Entity extraction
3. ToneAnalyzerService      → 7-emotion analysis
4. LlmIntentExtractorService → LLM fallback (if low confidence)

// External Service: http://localhost:7010 (mangwale_dev_nlu container)
```

### 4.2 Supported Intents

```
Core Intents:
├── greeting              # Hello, Hi, Namaste
├── farewell              # Bye, goodbye
├── order_food            # Food ordering
├── track_order           # Order tracking
├── parcel_booking        # Send parcel
├── search_product        # Product search
├── browse_menu           # Browse categories
├── browse_category       # Specific category
├── ask_recommendation    # Get suggestions
├── login                 # Authentication
├── help                  # Get help
├── chitchat              # Casual chat
├── feedback              # Give feedback
├── support               # Customer support
└── unknown               # Fallback
```

---

## 🔐 5. AUTHENTICATION SYSTEM

### 5.1 Centralized Auth Service
**File**: [/backend/src/auth/centralized-auth.service.ts](backend/src/auth/centralized-auth.service.ts)

```typescript
// Cross-channel authentication
// Phone number = Universal identifier
// Syncs auth across: Web, WhatsApp, Telegram, SMS, Mobile

interface AuthenticatedUser {
  userId: number;
  phone: string;
  email?: string;
  firstName: string;
  token: string;
  channels: string[];  // ['web', 'whatsapp', 'telegram']
}

// Storage: Redis with 7-day TTL
// Key format: auth:{phoneNumber}
```

### 5.2 Auth Flow
**File**: [/backend/src/flow-engine/flows/auth.flow.ts](backend/src/flow-engine/flows/auth.flow.ts)

```
1. check_auth_status → Already authenticated?
2. collect_phone → Get phone number
3. send_otp → Send OTP via SMS
4. verify_otp → Verify OTP
5. collect_name → Get name (new users)
6. collect_email → Get email (optional)
7. auth_complete → Success!
```

---

## 🛒 6. CART & CHECKOUT FLOW

### 6.1 Cart Manager
**File**: [/backend/src/flow-engine/executors/cart-manager.executor.ts](backend/src/flow-engine/executors/cart-manager.executor.ts)

```typescript
// Operations: add, remove, clear, validate
// Constraint: Single-store only (no multi-restaurant orders)

interface CartItem {
  itemId: number;
  itemName: string;
  quantity: number;
  price: number;
  storeId: number;
  storeName: string;
}
```

### 6.2 Order Flow
**File**: [/backend/src/flow-engine/flows/food-order.flow.ts](backend/src/flow-engine/flows/food-order.flow.ts)

```
1. check_trigger → Has query or needs greeting?
2. check_location → Has user location?
3. request_location → Ask for location (if needed)
4. understand_request → NLU processing
5. search_products → OpenSearch query
6. display_results → Show products
7. await_selection → Wait for selection
8. add_to_cart → Add to cart
9. confirm_cart → Cart confirmation
10. check_auth → User logged in?
11. select_address → Choose/add address
12. calculate_pricing → Distance + delivery fees
13. show_payment_options → Payment selection
14. process_payment → Payment processing
15. order_complete → Confirmation
```

### 6.3 Order Orchestrator
**File**: [/backend/src/order-flow/services/order-orchestrator.service.ts](backend/src/order-flow/services/order-orchestrator.service.ts)

```typescript
// Coordinates:
- AddressService (address management)
- OrderHistoryService (past orders)
- PaymentService (payment processing)
- PhpOrderService (PHP backend integration)
```

---

## 🏗️ 7. SERVICES & INFRASTRUCTURE

### 7.1 Docker Services (docker-compose.dev.yml)

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| **postgres** | mangwale_dev_postgres | 5432 | PostgreSQL 16 database |
| **redis** | mangwale_dev_redis | 6381→6379 | Session storage, caching |
| **vllm** | mangwale_dev_vllm | 8002→8000 | LLM inference (Qwen2.5-7B) |
| **nlu** | mangwale_dev_nlu | 7010 | IndicBERT NLU model |
| **backend** | mangwale_dev_backend | 3200 | NestJS API server |
| **frontend** | mangwale_dev_frontend | 3005 | Next.js frontend |
| **scraper** | mangwale_dev_scraper | 3300 | Competitor data scraper |

### 7.2 External Dependencies

| Service | URL | Purpose |
|---------|-----|---------|
| OpenSearch | search-opensearch:9200 | Product search index |
| Search API | search-api:3100 | Search microservice |
| PHP Backend | configurable | Legacy backend |

### 7.3 Network Architecture

```
                                ┌─────────────────┐
                                │   Frontend      │
                                │   (Next.js)     │
                                │   :3005         │
                                └────────┬────────┘
                                         │
                                         │ WebSocket/HTTP
                                         ▼
┌─────────────┐    ┌─────────────────────────────────────────┐
│   Traefik   │───▶│           Backend (NestJS)              │
│   (Proxy)   │    │              :3200                       │
└─────────────┘    │                                          │
                   │  ┌─────────┐  ┌─────────┐  ┌──────────┐ │
                   │  │FlowEngine│ │ NLU Svc │  │ SearchSvc│ │
                   │  └────┬────┘  └────┬────┘  └────┬─────┘ │
                   └───────┼───────────┼────────────┼────────┘
                           │           │            │
              ┌────────────┼───────────┼────────────┼───────────┐
              │            ▼           ▼            ▼           │
              │      ┌─────────┐ ┌─────────┐  ┌───────────┐    │
              │      │  Redis  │ │   NLU   │  │ OpenSearch│    │
              │      │  :6381  │ │  :7010  │  │   :9200   │    │
              │      └─────────┘ └─────────┘  └───────────┘    │
              │                                                 │
              │      ┌─────────┐ ┌─────────┐  ┌───────────┐    │
              │      │Postgres │ │  vLLM   │  │ PHP Backend│   │
              │      │  :5432  │ │  :8002  │  │   :8000   │    │
              │      └─────────┘ └─────────┘  └───────────┘    │
              └─────────────────────────────────────────────────┘
```

---

## 🔁 8. MESSAGE FLOW (End-to-End)

### 8.1 Chat Message Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                                │
│    User types "I want biryani" in chat interface                            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. WEBSOCKET TRANSPORT                                                       │
│    Frontend ChatClient → Socket.IO → /ai-agent namespace                    │
│    Event: 'send_message' with { message, sessionId, platform }              │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. CHAT GATEWAY (chat.gateway.ts)                                           │
│    - Deduplication check                                                     │
│    - Session validation                                                      │
│    - Route to FlowEngineService                                             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. FLOW ENGINE (flow-engine.service.ts)                                     │
│    - Load active flow or start new one                                       │
│    - Inject session context (location, auth, cart)                          │
│    - Inject enhanced context (weather, time, festivals)                      │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. NLU PROCESSING (via nlu.executor.ts)                                     │
│    - Call IndicBERT model at :7010                                          │
│    - Extract intent: "order_food"                                           │
│    - Extract entities: { dish: "biryani" }                                  │
│    - Analyze tone/sentiment                                                  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. FLOW STATE EXECUTION                                                      │
│    food-order.flow.ts:                                                       │
│    - check_location → Has location? YES                                      │
│    - understand_request → Intent: order_food                                 │
│    - search_products → OpenSearch query                                      │
│    - display_results → Format response with product cards                    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. SEARCH EXECUTION (search.executor.ts)                                    │
│    - Query OpenSearch with geo-filter (user location)                       │
│    - Filter by distance (5km default)                                        │
│    - Sort by relevance + rating                                              │
│    - Return top N products                                                   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. RESPONSE FORMATTING (response.executor.ts)                               │
│    - Format as conversational message                                        │
│    - Add product cards with images, prices                                   │
│    - Add quick action buttons                                                │
│    - Apply voice character personality (if configured)                       │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 9. WEBSOCKET RESPONSE                                                        │
│    ChatGateway emits 'assistant_message' with:                              │
│    { text, cards?, buttons?, responseType }                                  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 10. UI UPDATE                                                                │
│    Frontend renders:                                                         │
│    - Assistant message bubble                                                │
│    - ProductCard components                                                  │
│    - Quick action buttons                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 9. PHP INTEGRATION LAYER

**Location**: `/home/ubuntu/Devs/MangwaleAI/backend/src/php-integration/services/`

| Service | Purpose |
|---------|---------|
| php-auth.service.ts | User authentication with PHP backend |
| php-address.service.ts | Address CRUD operations |
| php-order.service.ts | Order creation & management |
| php-payment.service.ts | Payment processing |
| php-store.service.ts | Store data & schedules |
| php-wallet.service.ts | Wallet operations |
| php-loyalty.service.ts | Loyalty points |
| php-coupon.service.ts | Coupon validation |
| php-review.service.ts | Review management |
| parcel.service.ts | Parcel booking |

---

## 🔧 10. KEY CONFIGURATION

### Environment Variables (Backend)

```env
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/headless_mangwale

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=1

# AI Services
NLU_ENDPOINT=http://nlu:7010
VLLM_URL=http://vllm:8000
VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct-AWQ
NLU_AI_ENABLED=true
LLM_MODE=hybrid

# Search
OPENSEARCH_URL=http://opensearch:9200
SEARCH_API_URL=http://search-api:3100

# PHP Backend
PHP_API_BASE_URL=http://php-backend:8000

# Session
SESSION_TTL=86400
```

### Environment Variables (Frontend)

```env
NEXT_PUBLIC_WS_URL=ws://localhost:3200
NEXT_PUBLIC_MANGWALE_AI_URL=http://localhost:3200
NEXT_PUBLIC_ADMIN_BACKEND_URL=http://localhost:3200
```

---

## 📝 11. DEVELOPMENT COMMANDS

```bash
# Start full stack
docker compose -f docker-compose.dev.yml --profile ai --profile backend --profile frontend up -d

# Start backend only (with AI)
docker compose -f docker-compose.dev.yml --profile ai --profile backend up -d

# Start frontend only (dev mode)
cd frontend && npm run dev

# Check backend health
curl http://localhost:3200/health

# View logs
docker logs mangwale_ai_dev --tail 100 -f

# Rebuild backend
docker exec -d mangwale_ai_dev bash -c "cd /app && npm run build && npx pm2 restart main"
```

---

## 🎯 12. KEY FILES QUICK REFERENCE

| Component | File Path |
|-----------|-----------|
| Backend Entry | [/backend/src/main.ts](backend/src/main.ts) |
| Module Config | [/backend/src/app.module.ts](backend/src/app.module.ts) |
| WebSocket Gateway | [/backend/src/chat/chat.gateway.ts](backend/src/chat/chat.gateway.ts) |
| Flow Engine | [/backend/src/flow-engine/flow-engine.service.ts](backend/src/flow-engine/flow-engine.service.ts) |
| State Machine | [/backend/src/flow-engine/state-machine.engine.ts](backend/src/flow-engine/state-machine.engine.ts) |
| Conversation Service | [/backend/src/conversation/services/conversation.service.ts](backend/src/conversation/services/conversation.service.ts) |
| Session Service | [/backend/src/session/session.service.ts](backend/src/session/session.service.ts) |
| NLU Service | [/backend/src/nlu/services/nlu.service.ts](backend/src/nlu/services/nlu.service.ts) |
| Auth Service | [/backend/src/auth/centralized-auth.service.ts](backend/src/auth/centralized-auth.service.ts) |
| Food Order Flow | [/backend/src/flow-engine/flows/food-order.flow.ts](backend/src/flow-engine/flows/food-order.flow.ts) |
| Auth Flow | [/backend/src/flow-engine/flows/auth.flow.ts](backend/src/flow-engine/flows/auth.flow.ts) |
| Chat Page | [/frontend/src/app/(public)/chat/page.tsx](frontend/src/app/(public)/chat/page.tsx) |
| WS Client | [/frontend/src/lib/websocket/chat-client.ts](frontend/src/lib/websocket/chat-client.ts) |
| Docker Config | [docker-compose.dev.yml](docker-compose.dev.yml) |

---

*This document provides a comprehensive map of the MangwaleAI system architecture. For specific implementation details, refer to the linked source files.*
