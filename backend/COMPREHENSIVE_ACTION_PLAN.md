# MangwaleAI - Comprehensive System Action Plan

## Executive Summary

After deep analysis of the complete system architecture, user journeys, integrations, and running services, this document provides a prioritized action plan to make all components work together correctly and enable continuous learning/improvement.

---

## ✅ COMPLETED IN THIS SESSION

### Voice Support Added to WhatsApp & Telegram
- **WhatsApp Webhook**: Now handles `audio` message type
  - Downloads audio from Meta API
  - Transcribes using Whisper ASR (local) with Google/Azure fallback
  - Processes transcribed text through normal conversation flow
  - File: `src/whatsapp/controllers/webhook.controller.ts`
  
- **Telegram Webhook**: Now handles voice messages
  - Downloads voice from Telegram API
  - Same ASR pipeline as WhatsApp
  - File: `src/telegram/controllers/telegram-webhook.controller.ts`

- **Platform Enum Extended**:
  - Added: `SMS`, `MOBILE_APP`, `VOICE` platforms
  - File: `src/common/enums/platform.enum.ts`

- **Module Dependencies Updated**:
  - WhatsApp & Telegram modules now import `AsrModule`
  - Files: `whatsapp.module.ts`, `telegram.module.ts`

---

## 🎯 MULTI-CHANNEL ARCHITECTURE (Key Insight!)

**MangwaleAI is a multi-channel conversational AI platform.** The same conversation flows work across ALL channels:

```
                    ┌─────────────────────────────────────────────────┐
                    │           Channel Entry Points                  │
                    ├──────────┬──────────┬──────────┬──────────┬─────┤
                    │ WhatsApp │ Web Chat │ Telegram │   App    │ SMS │
                    │ Webhook  │ WebSocket│ Webhook  │  API     │ API │
                    └────┬─────┴────┬─────┴────┬─────┴────┬─────┴──┬──┘
                         │          │          │          │        │
                         ▼          ▼          ▼          ▼        ▼
                    ┌─────────────────────────────────────────────────┐
                    │       AgentOrchestratorService (Unified)        │
                    │    Channel-agnostic conversation processing     │
                    └─────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
              ┌──────────┐         ┌──────────┐         ┌──────────┐
              │   NLU    │         │  Flows   │         │   LLM    │
              │ (7010)   │         │  Engine  │         │ (8002)   │
              └──────────┘         └──────────┘         └──────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
              ┌──────────┐         ┌──────────┐         ┌──────────┐
              │   PHP    │         │  Search  │         │  Session │
              │ Backend  │         │ (9200)   │         │  (Redis) │
              └──────────┘         └──────────┘         └──────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────────┐
                    │           MessagingService (Router)             │
                    │      Routes responses to correct channel        │
                    └─────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
              ┌──────────┐         ┌──────────┐         ┌──────────┐
              │ WhatsApp │         │   RCS    │         │ Telegram │
              │ Provider │         │ Provider │         │ Provider │
              └──────────┘         └──────────┘         └──────────┘
```

### Supported Channels (Current Status)

| Channel | Entry Point | Status | Voice Support |
|---------|-------------|--------|---------------|
| **WhatsApp** | `webhook/whatsapp` | ✅ Working | ❌ Audio ignored |
| **Web Chat** | WebSocket `/ai-agent` | ✅ Working | ✅ Via frontend |
| **Telegram** | `webhook/telegram` | ⚠️ Partial | ❌ Not implemented |
| **RCS** | Provider registered | ⚠️ Scaffold only | ❌ N/A |
| **Mobile App** | API Gateway | ⚠️ Uses WhatsApp webhook | ❌ N/A |
| **SMS** | Not implemented | ❌ Missing | ❌ N/A |

### Key Files for Multi-Channel

| Component | File |
|-----------|------|
| Platform Enum | `src/common/enums/platform.enum.ts` |
| Messaging Router | `src/messaging/services/messaging.service.ts` |
| Provider Interface | `src/messaging/interfaces/messaging-provider.interface.ts` |
| WhatsApp Provider | `src/messaging/providers/whatsapp.provider.ts` |
| Telegram Provider | `src/messaging/providers/telegram.provider.ts` |
| RCS Provider | `src/messaging/providers/rcs.provider.ts` |
| WhatsApp Webhook | `src/whatsapp/controllers/webhook.controller.ts` |
| Web Chat Gateway | `src/chat/chat.gateway.ts` |
| Telegram Webhook | `src/telegram/controllers/telegram-webhook.controller.ts` |

---

## Current System State

### ✅ Working Services
| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| NestJS Backend | 3200 | Healthy | Main AI/Conversation orchestrator |
| API Gateway | 4001 | Healthy | External API routing |
| PostgreSQL | 5432 | Healthy | Logs, sessions, feedback |
| Redis | 6381 | Healthy | Session state, caching |
| OpenSearch | 9200 | Healthy | Full-text + semantic search |
| Search API | 3100 | Healthy | Unified search microservice |
| Embedding (MiniLM) | 3101 | Healthy | 384-dim English embeddings |
| NLU (IndicBERT) | 7010 | Running | Intent classification, Hindi embeddings |
| vLLM | 8002 | Healthy | LLM for response generation |
| ASR (Whisper) | 7000 | Healthy | Speech-to-text |
| TTS (XTTS) | 8010 | Working* | Text-to-speech (*health check issue only) |
| OSRM | 5000 | Healthy | Distance/routing calculations |
| CDC Consumer | Running | Active | Change data capture |
| Kafka Connect | Healthy | - | Data streaming |

### ⚠️ Known Issues
1. **TTS Container** - Shows "unhealthy" but actually works (health check timing)
2. **food_items_v4 Index** - Created but empty (dual vectors ready, no data)
3. **food_items_v1764487265** - Has 14,869 docs but older schema
4. **WhatsApp Voice** - Not implemented in webhook (audio type ignored)
5. **GamificationModule** - Disabled (82 TypeScript errors)
6. **Telegram Voice** - Not implemented
7. **SMS Channel** - Not implemented

---

## Priority 1: Critical Path Issues (This Week)

### 1.1 Populate Dual Vector Search Index
**Problem**: `food_items_v4` index is empty. Search uses old `food_items_v1764487265`.
**Impact**: Semantic search for Hindi queries not working optimally.

**Action**:
```bash
# Option A: Sync via CDC consumer
docker logs search-cdc-consumer --tail 50  # Check if sync is working

# Option B: Manual migration
# Reindex from old to new with embedding updates
POST _reindex
{
  "source": { "index": "food_items_v1764487265" },
  "dest": { "index": "food_items_v4" }
}
```

**Files to modify**:
- `apps/search-api/src/services/opensearch.service.ts` - Point to `food_items_v4`
- `backend/src/search/services/search.service.ts` - Verify index name config

### 1.2 Fix E-commerce Order Placement
**Problem**: `createEcommerceOrder()` in PHP service just logs warning and returns failure.
**Impact**: Users cannot complete e-commerce purchases.

**Location**: `backend/src/php-integration/services/php-order.service.ts`

**Action**: Implement actual PHP API call:
```typescript
async createEcommerceOrder(orderData: EcommerceOrderDto): Promise<ApiResponse<OrderResponse>> {
  return this.httpService.post('/api/ecom/order/place', orderData);
}
```

### 1.3 Enable Voice Messages Across All Channels

**Problem**: Voice/audio messages are ignored on WhatsApp and Telegram.
**Impact**: Voice users can't interact via their preferred method.

#### WhatsApp Voice (Priority 1)

**Files to modify**:
1. `backend/src/whatsapp/interfaces/whatsapp-message.interface.ts` - Add audio type
2. `backend/src/whatsapp/controllers/webhook.controller.ts` - Handle audio messages
3. Create `backend/src/voice/services/whatsapp-voice.service.ts` - Download + transcribe

**Flow**:
```
WhatsApp Audio → Download from Meta API → Send to ASR (7000) → Get text → Process as text message
```

#### Telegram Voice (Priority 2)

**Files to modify**:
1. `backend/src/telegram/controllers/telegram-webhook.controller.ts` - Handle voice messages
2. Use same ASR service as WhatsApp

### 1.4 Add Missing Platform Types

**Problem**: Platform enum doesn't include all channels.

**File**: `backend/src/common/enums/platform.enum.ts`

**Add**:
```typescript
export enum Platform {
  WHATSAPP = 'whatsapp',
  RCS = 'rcs',
  TELEGRAM = 'telegram',
  WEB = 'web',
  SMS = 'sms',          // Add
  MOBILE_APP = 'app',   // Add
  VOICE = 'voice',      // Add - for IVR/call center
}
```

---

## Priority 2: User Experience & Channel Completion (Next 2 Weeks)

### 2.1 Create Order Tracking Flow
**Current**: Order tracking exists in legacy code, not as proper flow.

**Create**: `backend/src/flow-engine/flows/order-tracking.flow.ts`
```typescript
states: ['list_orders', 'order_details', 'cancel_order', 'reorder']
```

### 2.2 Create Support Flow
**Current**: "Contact Support" button triggers `contact_support` but nothing handles it.

**Create**: `backend/src/flow-engine/flows/support.flow.ts`
```typescript
states: ['faq', 'issue_select', 'issue_details', 'create_ticket', 'escalate']
```

### 2.3 Fix Hardcoded Values
| Value | Location | Should Be |
|-------|----------|-----------|
| Zone ID = 4 | Multiple executors | From user's location/address |
| Tax rate | Order flows | From PHP zone config |
| Leaderboard data | Gamification | From actual database |
| Distance = 5km fallback | Flow executors | Better error handling |

### 2.4 Payment Integration
**Current**: Only COD supported in flows.

**Add**: UPI/Card payment flow with Razorpay integration
- `backend/src/flow-engine/flows/payment.flow.ts`
- Connect to existing `PaymentService`

### 2.5 Complete Channel-Specific Features

Each channel has unique capabilities that should be utilized:

| Channel | Unique Features | Status |
|---------|-----------------|--------|
| **WhatsApp** | Interactive buttons, list messages, location sharing, media | ✅ Implemented |
| **Web Chat** | Rich cards, carousels, file upload, typing indicators | ✅ Implemented |
| **Telegram** | Inline keyboards, bot commands, stickers, channels | ⚠️ Partial |
| **RCS** | Rich cards, carousels, suggested replies, verified sender | ⚠️ Scaffold |
| **SMS** | Text-only, link shortening, delivery receipts | ❌ Missing |
| **Mobile App** | Push notifications, deep links, native UI | ⚠️ Via API |

### 2.6 Channel Capability Abstraction

Create a capability layer to auto-adapt responses:

```typescript
// src/messaging/interfaces/channel-capabilities.interface.ts
export interface ChannelCapabilities {
  supportsButtons: boolean;
  supportsCards: boolean;
  supportsImages: boolean;
  supportsVoice: boolean;
  supportsLocation: boolean;
  maxButtonCount: number;
  maxMessageLength: number;
}

// Auto-degrade responses for limited channels
// e.g., SMS gets text-only version of button messages
```

---

## Priority 3: Architecture Cleanup (Next Month)

### 3.1 Consolidate PHP Services
**Problem**: Duplicate implementations in two places:
- `backend/src/php-integration/` (12 services)
- `api-gateway/src/php-backend/` (17 services)

**Action**: Choose one as source of truth, have other import from it.

### 3.2 Fix GamificationModule
**Problem**: 82 TypeScript errors causing module to be disabled.

**Files with issues**:
- `backend/src/gamification/` - Multiple type errors
- Database migrations may be incomplete

**Action**: Run `npx tsc --noEmit` and fix errors one by one.

### 3.3 SSL Certificate Security
**Problem**: `rejectUnauthorized: false` in PHP HTTP client.
**Location**: `backend/src/php-integration/services/base-php.service.ts`

**Action**: Add proper CA certificates or use environment-based toggle.

### 3.4 Complete SMS Channel
**Files to create**:
```
src/sms/
  ├── sms.module.ts
  ├── controllers/
  │   └── sms-webhook.controller.ts  # Twilio/MSG91 webhook
  ├── services/
  │   └── sms.service.ts             # Send SMS via provider
  └── providers/
      ├── twilio.provider.ts
      └── msg91.provider.ts
```

### 3.5 Complete Mobile App Channel
**Already exists**: API Gateway at port 4001
**Need to add**: 
- Push notification service
- Deep linking support
- App-specific response formatting

---

## Priority 4: Learning & Improvement System

### 4.1 Feedback Loop Architecture
```
User Interaction → Log to PostgreSQL → Analyze in Label Studio → 
  → Fine-tune NLU model → Deploy updated model → Better responses
```

**Components**:
1. **Logging**: Already capturing to `conversation_messages` table ✅
2. **Label Studio**: Running at port 8080 ✅
3. **NLU Training Pipeline**: Needs creation
4. **Model Deployment**: Manual process → Automate

### 4.2 Search Relevance Improvement
```
Search Query → Log query + clicks → Analyze patterns → 
  → Update embeddings → Re-rank results → Better search
```

**Action**:
- Log search queries and user selections
- Create relevance feedback loop
- Periodic embedding model fine-tuning

### 4.3 Intent Classification Improvement
**Current**: IndicBERT with static training data.

**Improvement Loop**:
1. Export misclassified intents from logs
2. Add to training data in Label Studio
3. Retrain model
4. Deploy updated model

---

## Implementation Roadmap

### Week 1 (Critical Fixes)
- [ ] Verify CDC is populating `food_items_v4`
- [ ] Implement e-commerce order creation
- [ ] Add WhatsApp audio message handling (voice)
- [ ] Add Telegram voice message handling
- [ ] Create order tracking flow

### Week 2 (Channel Completion)
- [ ] Create support flow
- [ ] Fix hardcoded zone/tax values
- [ ] Add payment flow integration
- [ ] Fix TTS health check
- [ ] Create channel capabilities interface
- [ ] Implement response degradation for limited channels

### Week 3 (Architecture)
- [ ] Consolidate PHP services
- [ ] Start fixing GamificationModule errors
- [ ] Set up NLU training pipeline
- [ ] Begin SMS channel implementation

### Week 4 (Polish & Testing)
- [ ] Complete Gamification fixes
- [ ] Complete SMS channel
- [ ] Implement search feedback loop
- [ ] Set up automated model retraining
- [ ] End-to-end testing across ALL channels
- [ ] Load testing and optimization

---

## Testing Checklist

### Multi-Channel End-to-End Tests
| Journey | WhatsApp | Web | Telegram | SMS | App |
|---------|----------|-----|----------|-----|-----|
| Food ordering (text) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Food ordering (voice) | ⬜ | ⬜ | ⬜ | N/A | ⬜ |
| Parcel delivery | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| E-commerce purchase | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Order tracking | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Customer support | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Gamification | ⬜ | ⬜ | ⬜ | N/A | ⬜ |

### Integration Tests
- [ ] PHP API authentication
- [ ] OpenSearch hybrid search
- [ ] ASR → Conversation flow (all voice channels)
- [ ] TTS response generation
- [ ] NLU intent classification
- [ ] Channel-specific message formatting

### Performance Tests
- [ ] Search response time < 200ms
- [ ] Voice transcription < 2s
- [ ] Order placement < 1s
- [ ] Concurrent user handling (100+ per channel)

---

## Multi-Channel Service Communication Matrix

```
                              ENTRY POINTS
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│ WhatsApp  │  │  Web Chat │  │ Telegram  │  │    SMS    │  │Mobile App │
│  Webhook  │  │ WebSocket │  │  Webhook  │  │  Webhook  │  │    API    │
│webhook/wa │  │/ai-agent  │  │webhook/tg │  │webhook/sms│  │    4001   │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │              │              │              │
      └──────────────┴──────────────┴──────┬───────┴──────────────┘
                                           ▼
                    ┌─────────────────────────────────────────────────┐
                    │         AgentOrchestratorService                │
                    │    (Channel-agnostic conversation logic)        │
                    │    - Intent detection (NLU 7010)                │
                    │    - Flow selection & execution                 │
                    │    - LLM fallback (vLLM 8002)                  │
                    └─────────────────────────────────────────────────┘
                                           │
        ┌──────────────────────────────────┼──────────────────────────┐
        ▼                                  ▼                          ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    NLU      │     │   vLLM      │     │   Search    │     │    PHP      │
│   (7010)    │     │   (8002)    │     │   (3100)    │     │  Backend    │
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘
                                               │
        ┌──────────────────────────────────────┼──────────────────────┐
        ▼                                      ▼                      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  OpenSearch │     │   MiniLM    │     │ IndicBERT   │     │    OSRM     │
│   (9200)    │     │   (3101)    │     │   (7010)    │     │   (5000)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘

                              RESPONSE ROUTING
                    ┌─────────────────────────────────────────────────┐
                    │           MessagingService (Router)             │
                    │      Routes to correct provider based on        │
                    │         session.platform or recipientId         │
                    └─────────────────────────────────────────────────┘
                                           │
      ┌────────────────────────────────────┼────────────────────────────────┐
      ▼                    ▼               ▼               ▼                ▼
┌───────────┐       ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│ WhatsApp  │       │    RCS    │   │ Telegram  │   │    SMS    │   │  WebSocket│
│ Provider  │       │ Provider  │   │ Provider  │   │ Provider  │   │  (Redis)  │
│ Meta API  │       │ Jio/Airtel│   │ Bot API   │   │Twilio/MSG91   │  Queue    │
└───────────┘       └───────────┘   └───────────┘   └───────────┘   └───────────┘

Voice Pipeline (Cross-Channel):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Audio In   │────▶│    ASR      │────▶│  Process    │────▶│    TTS      │
│ (WA/TG/Web) │     │   (7000)    │     │  as Text    │     │   (8010)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │
                          └─── Whisper (local) → Google ASR (fallback) → Azure (fallback)
```

---

## Quick Reference: Key Files

### Multi-Channel Architecture
| Component | Primary File |
|-----------|-------------|
| Platform Enum | `src/common/enums/platform.enum.ts` |
| Messaging Router | `src/messaging/services/messaging.service.ts` |
| Provider Interface | `src/messaging/interfaces/messaging-provider.interface.ts` |
| WhatsApp Provider | `src/messaging/providers/whatsapp.provider.ts` |
| Telegram Provider | `src/messaging/providers/telegram.provider.ts` |
| RCS Provider | `src/messaging/providers/rcs.provider.ts` |

### Channel Entry Points
| Component | Primary File |
|-----------|-------------|
| WhatsApp Webhook | `src/whatsapp/controllers/webhook.controller.ts` |
| Web Chat Gateway | `src/chat/chat.gateway.ts` |
| Telegram Webhook | `src/telegram/controllers/telegram-webhook.controller.ts` |

### Core Services
| Component | Primary File |
|-----------|-------------|
| Conversation Entry | `src/conversation/services/agent-orchestrator.service.ts` |
| Flow Engine | `src/flow-engine/flow-engine.service.ts` |
| PHP Integration | `src/php-integration/services/*.service.ts` |
| Search | `src/search/services/search.service.ts` |
| OpenSearch | `src/search/services/opensearch.service.ts` |
| NLU | `src/nlu/services/nlu.service.ts` |
| Voice (ASR) | `src/asr/services/asr.service.ts` |
| Voice (TTS) | `src/tts/services/tts.service.ts` |
| Session | `src/session/session.service.ts` |

---

## Monitoring & Observability

### Current
- OpenSearch Dashboards (logs)
- Label Studio (annotations)
- Container health checks

### Recommended Additions
1. **Prometheus + Grafana** - Metrics dashboard
2. **Jaeger/Zipkin** - Distributed tracing
3. **Error tracking** - Sentry integration
4. **Alerting** - PagerDuty/Slack for critical errors

---

*Document created: Based on comprehensive system analysis*
*Last updated: Current session*
