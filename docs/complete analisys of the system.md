# 🔍 COMPLETE ANALYSIS (Updated): Mangwale AI System

This document is the **current reality** of the system as it exists in the repo today.
It corrects earlier assumptions (especially around “flow sources” and chat ingress) and provides a **session-based TODO backlog** before we start the next implementation wave.

---

## 0) Executive Summary (What’s actually running)

**Core runtime components (NestJS AI service):**
- **Flow Engine** (DB-backed): runs state-machine flows with executors (response/php-api/llm/parcel/etc.).
- **Agent Orchestrator**: routes intent + manages auth + can resume flow engine runs; also contains legacy logic for “admin-backend flows”.
- **Chat ingress**: WebSocket gateway and REST controller both exist and do not behave identically.
- **Sessions**: stored in Redis (`session:<sessionIdOrPhone>`), TTL-based.

**Critical correction:** flows are not “only TypeScript objects”. TS/YAML are **sources of truth at build time**, but at runtime flows are **persisted in Postgres** and queried via Prisma.

---

## 1) Flow Sources & Priority (Corrected)

### 1.1 Flow sources that exist in practice

There are multiple “flow formats” in this codebase:

1) **TypeScript flows (code)**
- Defined in `backend/src/flow-engine/flows/*` and exported by `backend/src/flow-engine/flows/index.ts`.

2) **YAML flows (filesystem)**
- Loaded by `YamlFlowLoaderService` from:
   - v1: `backend/src/flow-engine/flows/yaml/`
   - v2: `backend/src/flow-engine/flows/yaml-v2/`
- v2 YAML takes priority over v1 YAML for duplicate IDs.

3) **DB flows (Postgres via Prisma)**
- `FlowEngineService.saveFlow()` stores flows in the DB.
- `FlowEngineService.getAllFlows()` and `FlowEngineService.getFlowById()` read from the DB.
- Therefore: **the DB is the runtime authority**.

### 1.2 What “flow source mode” actually means

`FlowInitializerService` loads flows into the DB on startup and also supports switching modes:

- `typescript` mode: loads TS definitions into DB.
- `yaml` mode: loads YAML definitions into DB.
- `mixed` mode: loads TS then overlays YAML flows by ID (YAML wins on duplicates).

Environment flag:
- `FLOW_SOURCE=typescript|yaml|mixed`.

**Admin endpoints (no guard enabled yet):**
- `GET /flow-admin/source`
- `POST /flow-admin/source` (set typescript/yaml/mixed)
- `POST /flow-admin/reload`
- `GET /flow-admin/yaml-flows`
- `GET /flow-admin/all-flows`

### 1.3 Operational risks / gaps

- `FlowInitializerService.reloadFlows()` comments mention clearing existing flows, but there is no `clearAllFlows()` in `FlowEngineService`.
   - Net effect: reloading is done by upserting, not by deleting. That’s usually fine, but it’s important to be explicit.
- Switching to `yaml` mode replaces the in-memory “load set”, but still writes to DB via `saveFlow()`.
- “DB-managed flows” are currently still sourced from TS/YAML at boot (not authored in DB), even though they are stored there.

---

## 2) Chat Ingress Paths (Reality)

There are two web chat entrypoints.

### 2.1 WebSocket chat (primary interactive UI)

`ChatGateway` (`/ai-agent` namespace) does:
- `session:join`: stores auth/session data in Redis; does **not** send history.
- `message:send`:
   - logs user message
   - clears `bot_messages:<sessionId>` queue
   - calls `AgentOrchestratorService.processMessage(sessionId, message, module)` directly
   - returns either structured response (`{message, buttons, cards}`) or parses button-ish text.

Key note:
- Session IDs here are whatever the frontend passes (not forced to `web-` prefix).

### 2.2 REST web chat (polling-style)

`ChatWebController` (`POST /chat/send`) does:
- Forces `web-` prefix on session IDs.
- Calls `ConversationService.processMessage()`.
- Polls responses via Redis bot message queue.

### 2.3 Why this matters

These two ingress paths **do not share the same execution path**:
- WebSocket → AgentOrchestrator directly
- REST → ConversationService → (often) a legacy step-based switch, with fallback to AgentOrchestrator

This can cause:
- Different “currentStep” behavior depending on entrypoint
- Different session IDs (`web-xxx` vs `xxx`) ⇒ two separate sessions in Redis
- Confusing bugs where one UI sees “stuck auth” but the other doesn’t

---

## 3) Agents & Orchestration (Reality)

### 3.1 “Agent types” exist, but not all are true agent classes

Earlier analysis still broadly holds: `AgentRegistryService` exists, but many “agent types” do not appear as clean, separate implementations.
The system largely relies on:
- `IntentRouterService` classification/heuristics
- `AgentOrchestratorService` to glue everything together
- `FlowEngineService` for deterministic journeys

### 3.2 AgentOrchestrator (cleaned up)

`AgentOrchestratorService` responsibilities:
- FlowEngine integration (resume suspended flows, run flows)
- Auth handling and reset logic
- Local LLM calls via `LlmService` (vLLM primary, cloud fallback)

**Resolved:** Legacy "Admin Backend flow" code (nodes/edges) was removed in Session 3.
Now all flows come from FlowEngineService in unified step-based format.

---

## 4) NLU / Routing / External Dependencies

### 4.1 NLU container wiring

`NluClientService` defaults:
- `NLU_ENDPOINT` default is `http://nlu:7010` (this matches docker-compose service name `nlu`).
- Uses `POST /classify`.

### 4.2 Routing client wiring

`RoutingClient` uses:
- `ADMIN_BACKEND_URL` default `http://localhost:3002`.

**Reality check needed:** production seems to use PHP backend (`https://new.mangwale.com`) for business data, but routing client is aiming at an “admin backend delivery-routing API”. If that service is not deployed, this client will always return `null` and the system must degrade gracefully.

---

## 5) Infra Ports & Health (Current contract)

From docker-compose.ai.yml:
- AI service: internal `3000`, external `3200` (healthcheck must hit `http://localhost:3000/health` inside container).
- vLLM: `8002` (`/health`), healthcheck via Python.
- NLU: `7010` (`/classify`), healthcheck via Python.
- ASR: host `7000` → container `8000`.
- TTS: host `8010` → container `5501`.
- MinIO: `9000/9001`.

---

## 6) TODO Backlog (Session-based)

### Session 1 — Make flow sourcing + runtime deterministic ✅ DECIDED
**Decision:** TS/YAML are **source of truth**, DB is **runtime cache**.

- Flows are version-controlled in code (TS) or config files (YAML)
- On service startup, `FlowInitializerService` upserts flows into Postgres
- Runtime reads from DB for fast access
- No "DB editing" UI needed — edit source files and redeploy/reload

**Implementation:**
- ✅ `FLOW_SOURCE` env var controls mode: `typescript` (default), `yaml`, or `mixed`
- ✅ Admin endpoints protected with API key guard (set `ADMIN_API_KEY`)
- Flow admin endpoints: `/flow-admin/source`, `/flow-admin/reload`, etc.

### Session 2 — Unify web chat entrypoints ✅ DONE
**Decision:** WebSocket `/ai-agent` is the **canonical entrypoint**.

- ✅ REST `/chat/send` marked as DEPRECATED (logs warning)
- ✅ Session ID convention unified (no more `web-` prefix split-brain)
- Both paths now use raw session IDs as-is

### Session 3 — Consolidate orchestrator responsibilities ✅ DONE
**Problem:** `AgentOrchestratorService` had legacy code for "admin backend node-flow" support that called external admin backend for LLM and used node/edge flow format.

**Resolution:**
1. ✅ Removed `adminBackendUrl` property and external LLM calls to admin backend
2. ✅ Injected local `LlmService` (vLLM + cloud fallbacks) into orchestrator
3. ✅ Updated `executeLlmStep()` to use local `LlmService.chat()` instead of HTTP to admin backend
4. ✅ Removed dead code: `convertNodeFlowToStepFlow()`, `mapNodeTypeToStepType()`, `normalizeFlow()`
5. ✅ Cleaned up unused imports: `HttpService`, `firstValueFrom` from rxjs

**Routing responsibility (clarified):**
- **IntentRouterService** → NLU-based intent classification, maps intent to agent type
- **FlowEngineService** → Deterministic state-machine execution with executors
- **AgentOrchestratorService** → Glue layer: routes to flow engine, handles auth, manages context

### Session 4 — External service contracts ✅ DONE

#### Findings: `ADMIN_BACKEND_URL` Usage

| File | Purpose | Status |
|------|---------|--------|
| `agents/services/llm.service.ts` | Legacy LLM client (port 8080) | ❌ DEAD CODE - not imported anywhere |
| `integrations/routing.client.ts` | Delivery routing API (port 3002) | ⚠️ Optional - gracefully degrades |
| `integrations/payment.client.ts` | Payment initiation API (port 3002) | ⚠️ Not actively used |
| `parcel/services/parcel-agent.service.ts` | External parcel agent (port 3002) | ⚠️ Legacy - not actively used |
| `agents/controllers/voice.controller.ts` | ASR/TTS proxy (port 3002) | ⚠️ Deprecated - direct services exist |

**Resolution:**
- `ADMIN_BACKEND_URL` points to `http://host.docker.internal:3002` but **no service runs on port 3002**
- `RoutingClient` is injected with `@Optional()` and logs warning when unavailable
- LLM is now handled by local `LlmService` (vLLM + cloud fallbacks)
- These clients can be deprecated or refactored to use existing services

#### Environment Variables Documentation

**mangwale-ai service (NestJS AI):**

| Variable | Docker DNS / Value | Purpose |
|----------|-------------------|---------|
| `DATABASE_URL` | `postgresql://..@mangwale_postgres:5432/headless_mangwale` | PostgreSQL (Prisma) |
| `REDIS_HOST` | `mangwale_redis` | Redis session store |
| `NLU_ENDPOINT` | `http://mangwale-ai-nlu:7010` | NLU classification |
| `VLLM_URL` | `http://mangwale-ai-vllm:8002` | Local LLM inference |
| `PHP_API_BASE_URL` | External URL | PHP backend for business data |
| `OSRM_URL` | `http://mangwale_osrm:5000` | OpenStreetMap routing |
| `ASR_SERVICE_URL` | `http://mangwale_asr:8000` | Speech-to-text |
| `TTS_SERVICE_URL` | `http://mangwale_tts:5501` | Text-to-speech |
| `LABEL_STUDIO_URL` | `http://mangwale_labelstudio:8080` | Training data annotation |
| `GROQ_API_KEY` | External | Cloud LLM fallback |
| `OPENROUTER_API_KEY` | External | Cloud LLM fallback |
| `ADMIN_BACKEND_URL` | ⚠️ `http://host.docker.internal:3002` | **NOT IN USE** - legacy |

**Dead code to remove (optional cleanup):**
- `/backend/src/agents/services/llm.service.ts` - Not imported anywhere
- Consider deprecating `RoutingClient`, `PaymentClient` if admin backend is not deployed

---

# Appendix: Older notes (kept for reference)

The rest of this file contains earlier analysis; treat it as historical and validate against the “Updated” sections above.

---

## PART 1: CURRENT AGENT ARCHITECTURE ANALYSIS (Historical)

## **PART 1: CURRENT AGENT ARCHITECTURE ANALYSIS**

### **1.1 Agent Types & Routing**

Your system has **5 core agent types** defined in agent.types.ts:

| Agent Type | Purpose | Primary Module |
|------------|---------|----------------|
| `SEARCH` | Product/restaurant/store discovery | Grocery, Food, Pharmacy, Ecom |
| `ORDER` | Order placement, tracking, management | All modules |
| `COMPLAINTS` | Refunds, quality issues, delivery complaints | All modules |
| `BOOKING` | Parcel booking, scheduling | Parcel |
| `FAQ` | General queries, help, fallback | All modules |
| `CUSTOM` | Special handlers (gamification, auth) | - |

### **1.2 Routing Logic Flow**

```
User Message
    ↓
IntentRouterService.route()
    ↓
[1] Gamification keywords check (bypass NLU)
    ↓
[2] Direct action payloads (order_item:, add_to_cart:)
    ↓
[3] NLU Classification (NluClientService)
    ↓
[4] Compound intent detection (greeting + action)
    ↓
[5] Map intent → agent type
    ↓
[6] Log to NluFeedbackService (self-learning)
    ↓
Return RoutingResult
```

### **1.3 Issues Found in Routing Logic ⚠️**

**Issue 1: No dedicated agent classes for most tasks**
- You have agent **types** (SEARCH, ORDER, BOOKING) but the actual agent **implementations** are missing
- The `AgentRegistryService` doesn't have real registered agents for most types
- Instead, everything falls through to the **Flow Engine** which handles the actual logic

**Issue 2: Intent-to-Agent mapping conflicts**
In module-agents.config.ts:
```typescript
// This is problematic:
order_food: AgentType.SEARCH, // Routes to search first, but then what?
```
The `order_food` intent routes to SEARCH agent, but search agent doesn't exist. It falls back to flow engine.

**Issue 3: Cancellation is handled at flow level, not agent level**
- The `cancel_order` intent is mapped to `AgentType.ORDER`
- But there's no ORDER agent implementation
- Cancellation only works WITHIN an active parcel flow (user says "no" or "cancel" mid-flow)
- There's **no way to cancel an EXISTING placed order** through the AI

---

### **1.4 Self-Learning Loop (NLU Feedback)**

The system has a proper self-learning loop in nlu-feedback.service.ts:

```
Confidence Thresholds:
├── > 85%: Auto-approve for training ✅
├── 50-85%: Log for optional review
├── 30-50%: Flag for mandatory review
└── < 30%: Flag as CRITICAL ⚠️
```

**What's working:**
- Predictions are logged to `NluTrainingData` table
- Low-confidence predictions trigger warnings
- Deduplication prevents duplicate training entries

**What's missing:**
- No active retraining pipeline (data is collected but not used)
- No human review UI for approving/rejecting predictions
- No accuracy tracking over time

---

### **1.5 Flow Engine Analysis**

Your flow engine is the **actual brain** of the system. Flows are defined in flows/index.ts:

| Flow | Trigger Intent | Module | Status |
|------|---------------|--------|--------|
| `greetingFlow` | greeting | general | ✅ Active |
| `authFlow` | login | general | ✅ Active |
| `parcelDeliveryFlow` | parcel_booking | parcel | ✅ Active |
| `foodOrderFlow` | order_food | food | ✅ Active |
| `ecommerceOrderFlow` | search_product | ecom | ✅ Active |
| `orderTrackingFlow` | track_order | tracking | ✅ Active |
| `supportFlow` | complaint | support | ✅ Active |

**Flow State Machine Pattern:**
Each flow uses a state machine with:
- `type`: 'action' | 'wait' | 'decision' | 'end'
- `actions`: Executors to run (response, llm, parcel, php_api, etc.)
- `transitions`: Event → next state mapping

---

### **1.6 Cancellation Handling Analysis**

**Current State:**
1. **Mid-flow cancellation** ✅ Works:
   - User says "cancel" or "no" during parcel flow → goes to `cancelled` state
   - Clean exit with friendly message

2. **Existing order cancellation** ❌ NOT IMPLEMENTED:
   - `cancel_order` intent exists in mapping
   - But no flow or handler actually processes it
   - User says "cancel my order #12345" → Falls to FAQ agent → No action taken

**Missing Components:**
```typescript
// This should exist but doesn't:
const orderCancellationFlow = {
  id: 'order_cancellation',
  trigger: 'cancel_order',
  states: {
    get_order_id: { /* collect order ID */ },
    verify_ownership: { /* check user owns order */ },
    check_cancellable: { /* order status allows cancellation */ },
    process_cancellation: { /* call PHP API to cancel */ },
    confirm_refund: { /* show refund info */ },
  }
}
```

---

## **PART 2: ONDC BLUEPRINT ANALYSIS**

### **2.1 Current vs Blueprint Reality Check**

| Blueprint Component | Current Status | Path |
|---------------------|----------------|------|
| PHP Backend | ✅ EXISTS | External (api.mangwale.ai) |
| AI Orchestrator | ✅ EXISTS | agents |
| Flow Engine | ✅ EXISTS | flow-engine |
| ONDC Gateway | ❌ NOT STARTED | - |
| Search Service | ⚠️ PARTIAL | OpenSearch wired but not for ONDC |
| Channels | ✅ EXISTS | WhatsApp + Web + Voice |

### **2.2 Your Actual Architecture (Corrected)**

```
┌─────────────────────────────────────────────────────────────────┐
│                       CHANNELS                                  │
│   WhatsApp (3005)  │  Web Chat (Next.js)  │  Voice (TODO)      │
└───────────────────────────────────────────────────────────────┬─┘
                                                                │
                        WebSocket / HTTP                        │
                                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MANGWALE AI SERVICE (NestJS - 3200)          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Chat Gateway   │  │  Agent Orchestr │  │  Flow Engine   │  │
│  │  (WebSocket)    │→ │  IntentRouter   │→ │  State Machine │  │
│  └─────────────────┘  │  NluFeedback    │  │  Executors     │  │
│                       └─────────────────┘  └────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              PHP INTEGRATION SERVICES                    │  │
│  │  PhpAuthService │ PhpOrderService │ PhpParcelService    │  │
│  │  PhpAddressService │ PhpStoreService │ PhpPaymentService│  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┬─┘
                                                                │
                        REST API                                │
                                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PHP BACKEND (External)                        │
│                   api.mangwale.ai / new.mangwale.com           │
│   Orders │ Users │ Vendors │ Riders │ Wallets │ Payments       │
│                   MySQL Database                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## **PART 3: MASTER PLAN FOR DISCUSSION**

### **Phase 0: Fix Critical Issues (1-2 weeks)**

| # | Issue | Priority | Effort |
|---|-------|----------|--------|
| 1 | **Add Order Cancellation Flow** | HIGH | 3 days |
| 2 | **Implement real ORDER agent** | MEDIUM | 2 days |
| 3 | **Fix check_payment to also show pending orders** | HIGH | 1 day |
| 4 | **Add refund request flow** | HIGH | 2 days |
| 5 | **Activate NLU retraining pipeline** | MEDIUM | 3 days |

### **Phase 1: Consolidate & Document (2-4 weeks)**

1. **Create `/docs/MANGWALE_ACTUAL_ARCHITECTURE.md`**
   - Document every API endpoint the AI uses from PHP
   - Document all flows and their triggers
   - Document all executors and their capabilities

2. **Implement missing agent handlers:**
   - `OrderAgent` - cancel, modify, repeat orders
   - `ComplaintsAgent` - file complaints, check refund status
   - `BookingAgent` - already mostly handled by parcel flow

3. **Add comprehensive error states to all flows**

### **Phase 2: ONDC Gateway (4-8 weeks)**

**Option A: Separate Service (Recommended)**
```
/services/ondc-gateway/
├── src/
│   ├── beckn/           # Beckn protocol handlers
│   │   ├── search.ts
│   │   ├── select.ts
│   │   ├── init.ts
│   │   ├── confirm.ts
│   │   ├── status.ts
│   │   ├── cancel.ts
│   │   └── track.ts
│   ├── adapters/        # Internal ↔ ONDC mapping
│   │   ├── order.adapter.ts
│   │   └── catalog.adapter.ts
│   └── webhooks/        # Callbacks to orchestrator
```

**Option B: Integrate into existing NestJS**
- Add `/backend/src/ondc/` module
- Reuse existing PHP integration services

### **Phase 3: Full Multi-Channel Stack (Ongoing)**

1. **Unified Session Management**
   - Already using Redis + PostgreSQL
   - Add ONDC session tracking

2. **Channel-Specific Adapters**
   - WhatsApp: ✅ Done (via Wati)
   - Web: ✅ Done
   - Voice: In progress
   - ONDC: Phase 2

3. **Analytics & Observability**
   - Add Grafana dashboards for:
     - Intent classification accuracy
     - Flow completion rates
     - Order success rates by channel
     - ONDC fulfillment SLAs

---

## **QUESTIONS FOR DISCUSSION**

1. **Order Cancellation Priority:**
   - Should users be able to cancel orders via AI? (Currently they can't)
   - What's the PHP API for cancellation?

2. **ONDC Scope:**
   - Are you acting as **Seller App** (your vendors' products on ONDC)?
   - Or as **TSP** (managing other sellers)?
   - Or both?

3. **Real Agent Implementations:**
   - Do you want real agent classes with LLM reasoning?
   - Or keep everything as flows (current approach)?

4. **Training Pipeline:**
   - You're collecting NLU feedback data but not using it
   - Should we set up automatic retraining?

5. **Voice Channel:**
   - What's the current status of voice/IVR integration?
   - Which provider (Exotel, Twilio)?

---

**What would you like to discuss first?** I recommend starting with:
1. Order cancellation (immediate user-facing gap)
2. ONDC architecture decision (strategic direction)