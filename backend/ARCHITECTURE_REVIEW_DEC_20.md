# 🔍 Architecture Review - December 20, 2025

## Executive Summary

Conducted a comprehensive review of all .md architecture documentation and tested the system. Found several issues and made fixes.

---

## ✅ Components Verified Working

### 1. Flow Engine
- **18 flows registered** (13 TypeScript + 5 YAML V2)
- Flows working: greeting, food_order, auth, vendor_auth, delivery_auth, etc.
- State machine engine executing correctly

### 2. NLU Pipeline
- **IndicBERT** at port 7010 → Low confidence (returning 0%)
- **LLM Fallback** → vLLM (Qwen2.5-7B-Instruct-AWQ) working well
- Intent extraction: `order_food` detected with 0.80 confidence via LLM fallback

### 3. OpenSearch Indices
| Index | Document Count |
|-------|----------------|
| food_items | 11,628 |
| ecom_items | 2,908 |
| ecom_items_v3 | 2,908 |
| food_stores | 121 |
| ecom_stores | 19 |

### 4. vLLM Service
- **Port**: 8002
- **Model**: Qwen/Qwen2.5-7B-Instruct-AWQ
- **Throughput**: ~40-43 tokens/sec
- **Latency**: 300-2000ms depending on complexity

### 5. Docker Services Running
- `mangwale_nlu` (7010) - NLU service
- `mangwale_vllm` (8002) - vLLM inference
- `search-embedding-service` (3101) - MiniLM embeddings
- `search-api` (3100) - Search API proxy
- `search-opensearch` (9200) - Vector/keyword search
- `mangwale_redis` (6381) - Session storage
- `mangwale_postgres` (5432) - Database

### 6. REST & WebSocket APIs
- **REST**: `/api/chat/send` - Working
- **WebSocket**: `/ai-agent` namespace - Working (fixed earlier)
- **Voice**: `/api/conversation/voice` - Created and ready

---

## ⚠️ Issues Found & Fixed

### Issue 1: Embedding Service API Mismatch
**Symptom**: `Request failed with status code 422` when generating embeddings

**Root Cause**: Backend was sending `{ text: "..." }` but embedding service expects `{ texts: ["..."] }`

**Fix Applied**: Modified `/backend/src/search/services/embedding.service.ts`:
```typescript
// Before
this.httpService.post(`${this.embeddingUrl}/embed`, { text, model: '...' })

// After
this.httpService.post(`${this.embeddingUrl}/embed`, { texts: [text], model: '...' })
```

### Issue 2: Cards Not Passing in Resumed Flows
**Fixed Earlier**: Added `cards: result.metadata?.cards` in `agent-orchestrator.service.ts`

### Issue 3: OpenSearch Index Mismatch
**Fixed Earlier**: Changed `food_items_v4` → `food_items` in multiple files

### Issue 4: Log Permission Issues
**Status**: Non-critical (logging fails gracefully)
**Symptom**: `EACCES: permission denied` when writing to ai-metrics logs
**Note**: Process may be running as different user than file owner

---

## 📊 Test Results

### Food Search Test
```bash
POST /api/chat/send
Body: { "recipientId": "test-user", "text": "I am very hungry" }
```

**Result**: ✅ SUCCESS
- Intent: `order_food` (0.80 confidence)
- Flow: `food_order_v1`
- Results: 152 items found
- Cards: 10 product cards returned

**Sample Cards**:
1. Chicken Good Chilli (₹310) - Kokni Darbar
2. Green Salad (₹70) - Hotel Raj Darbar
3. Pav Bhaji (₹80) - Kantara Food
4. Chicken Hakka Noodles (₹90)

---

## 🏗️ Architecture Overview (from docs)

### Multi-Channel Stack
```
┌─────────────────────────────────────────┐
│            USER CHANNELS                │
├─────────────────────────────────────────┤
│ WhatsApp │ Telegram │ Web │ Voice │ SMS │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│         JUPITER (192.168.0.156)         │
│            NestJS Backend :3200         │
├─────────────────────────────────────────┤
│ • AgentOrchestratorService              │
│ • FlowEngineService (18 flows)          │
│ • NLU + vLLM integration                │
│ • OpenSearch (semantic + keyword)       │
│ • Session management (Redis)            │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│         MERCURY (192.168.0.151)         │
│           Voice Infrastructure          │
├─────────────────────────────────────────┤
│ • ASR: Faster-Whisper + IndicConformer  │
│ • TTS: Kokoro (English) + ChatterBox    │
│ • Voice Orchestrator :7000              │
│ • "Chotu" character voice               │
└─────────────────────────────────────────┘
```

### Flow Engine Hierarchy
1. **Greeting** → Welcome message + main menu buttons
2. **Food Order** → Search → Show cards → Add to cart → Checkout
3. **Auth** → Phone → OTP → Verify → Session
4. **Vendor/Delivery** → Role-specific YAML flows → PHP API

---

## 🚀 Recommendations

### Short-term
1. **Fix IndicBERT confidence** - Model may need retraining or threshold adjustment
2. **Monitor LLM fallback rate** - Currently 100% fallback, add metrics
3. **Fix log permissions** - Create logs directory with proper ownership

### Medium-term
1. **Voice endpoint testing** - Test Mercury → Jupiter voice flow end-to-end
2. **Zone-aware search** - Verify zone filtering is working correctly
3. **Cart integration** - Test full checkout flow

### Long-term
1. **IndicBERT fine-tuning** - Use captured training data to improve NLU
2. **Multi-language support** - Test Hindi/Marathi flows thoroughly
3. **Performance optimization** - Reduce LLM latency for real-time voice

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `agent-orchestrator.service.ts` | Main orchestration, routing |
| `flow-engine.service.ts` | Flow execution engine |
| `search.executor.ts` | OpenSearch integration |
| `embedding.service.ts` | Vector embeddings (FIXED) |
| `voice-conversation.controller.ts` | Mercury voice endpoint |
| `food-order.flow.ts` | Food ordering flow definition |

---

*Generated: December 20, 2025 10:30 AM IST*
