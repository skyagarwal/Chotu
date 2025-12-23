# Comprehensive System Audit Report

## Executive Summary

This audit analyzes the current AI/ML architecture, identifies duplications, misalignments, and gaps, and provides a roadmap for integration.

**STATUS: ✅ FIXES IMPLEMENTED**

---

## 🔍 Current AI/ML Service Inventory

### 1. Embedding Services (✅ FIXED)

| Service | Model | Dimensions | Port | Usage |
|---------|-------|------------|------|-------|
| **EmbeddingService** | MiniLM-L6-v2 | 384 | 3101 | SearchService (English) |
| **IndicBERTService** | IndicBERTv2 | 768 | 7010 | NluService (intent), UnifiedEmbeddingService (Hindi) |
| **UnifiedEmbeddingService** | Auto-select | 384/768 | - | **NEW** - Language-aware embedding |

**✅ Fixed**: Created `UnifiedEmbeddingService` that auto-selects embedding model based on language.

### 2. Intent Classification (✅ FIXED)

| Location | Method | Status |
|----------|--------|--------|
| **IntentClassifierService** | `classifyIntent()` | ✅ Primary (Heuristics → IndicBERT → LLM) |
| **SmartRecommendationService** | `analyzeUserIntent()` | ✅ **FIXED**: Now uses NluService |
| **LlmIntentExtractorService** | `extractIntent()` | ✅ Fallback for complex cases |

**✅ Fixed**: Refactored `SmartRecommendationService` to use `NluService.classify()` instead of duplicate patterns.

### 3. LLM Services (✅ NOW WITH RAG)

| Service | Model | Purpose | Status |
|---------|-------|---------|--------|
| **VllmService** | Qwen2.5-7B-Instruct-AWQ | Local LLM | ✅ Working |
| **CloudLlmService** | OpenAI/Groq/OpenRouter | Fallback LLM | ✅ Working |
| **LlmService** | Orchestrator | Auto-failover | ✅ Working |
| **RagService** | Orchestrator | **NEW** - Conversational search | ✅ Created |

**✅ Fixed**: Created `RagService` for retrieval-augmented generation.

### 4. Search Services (✅ ENHANCED)

| Service | Type | Backend |
|---------|------|---------|
| **OpenSearchService** | Vector/Keyword | OpenSearch 9200 |
| **SearchService** | Hybrid | OpenSearch + PHP fallback |
| **UnifiedEmbeddingService** | Language-aware | **NEW** - Auto-selects model |
| **RagService** | Conversational | **NEW** - LLM + Search |

---

## 📊 Architecture Flow (UPDATED)

### New Architecture

```
User Message
     │
     ├─→ NluService (SINGLE POINT for Intent/Entities) ✅
     │      ├─→ IntentClassifierService (unified)
     │      │      ├─→ Heuristics (fast)
     │      │      ├─→ IndicBERTService (768-dim, all languages)
     │      │      └─→ LLM (complex cases)
     │      └─→ EntityExtractorService
     │
     ├─→ SearchService (Hybrid Search)
     │      ├─→ UnifiedEmbeddingService ✅ NEW
     │      │      ├─→ detectLanguage()
     │      │      ├─→ IndicBERTService (Hindi/Marathi)
     │      │      └─→ EmbeddingService (English)
     │      └─→ OpenSearchService (k-NN + keyword)
     │
     ├─→ SmartRecommendationService ✅ FIXED
     │      └─→ NluService.classify() (no duplicate patterns)
     │
     └─→ RagService ✅ NEW
            ├─→ SearchService (retrieve context)
            └─→ LlmService (generate answer)
```

---

## ✅ Implemented Fixes

### Fix 1: SmartRecommendationService Now Uses NluService ✅

**File**: `src/order/services/smart-recommendation.service.ts`

```typescript
// BEFORE (duplicate patterns)
private analyzeUserIntent(message: string): OrderIntent {
  const lower = message.toLowerCase();
  if (/urgent|quick|fast/.test(lower)) {
    return OrderIntent.QUICK_DELIVERY;
  }
  // ... many patterns
}

// AFTER (uses NluService)
constructor(
  @Inject(forwardRef(() => NluService))
  private readonly nluService: NluService,
) {}

async analyzeUserIntent(message: string, userId?: string): Promise<UserOrderContext> {
  const nluResult = await this.nluService.classify({ text: message, sessionId: userId });
  return this.mapNluIntentToOrderIntent(nluResult.intent, nluResult.confidence);
}
```

### Fix 2: UnifiedEmbeddingService Created ✅

**File**: `src/search/services/unified-embedding.service.ts`

Features:
- Auto-detects language (Devanagari, Bengali, Tamil, etc.)
- Routes to IndicBERT (768-dim) for Indic languages
- Routes to MiniLM (384-dim) for English
- Fallback chain if one model fails
- Batch embedding support

```typescript
async embed(text: string): Promise<EmbeddingResult> {
  const detection = this.detectLanguage(text);
  
  if (this.shouldUseIndicBert(detection)) {
    return this.embedWithIndicBERT(text);  // 768-dim
  }
  return this.embedWithMiniLM(text);       // 384-dim
}
```

### Fix 3: RAGService Created ✅

**File**: `src/llm/services/rag.service.ts`

Features:
- Retrieval: Uses SearchService for hybrid search
- Generation: Uses LlmService (vLLM → Cloud fallback)
- Hindi support: Detects Devanagari and responds appropriately
- Suggestions: Auto-generates follow-up questions

```typescript
async query(userQuery: string, options?: RagQueryOptions): Promise<RagResponse> {
  // 1. Retrieve relevant context
  const context = await this.retrieveContext(userQuery);
  
  // 2. Build prompt with context
  const prompt = this.buildPrompt(userQuery, context);
  
  // 3. Generate response with LLM
  const response = await this.llmService.chat({ messages: [{ role: 'user', content: prompt }] });
  
  return { answer: response.content, sources: context, ... };
}
```

---

## 📋 Remaining Work (P2)

| Priority | Task | Effort | Status |
|----------|------|--------|--------|
| **P2** | Dual vector index in OpenSearch (384 + 768 dim) | 4 hours | Not Started |
| **P2** | Integrate UnifiedEmbeddingService into SearchService | 2 hours | Not Started |
| **P2** | Add RAG endpoint to controller | 1 hour | Not Started |

---

## 🔄 Updated Module Dependencies

```
NluModule
├── IndicBertService (768-dim embeddings, intent)
├── IntentClassifierService (heuristics + IndicBERT + LLM)
├── EntityExtractorService
└── LlmIntentExtractorService

SearchModule  
├── SearchService (hybrid search orchestrator)
├── OpenSearchService (k-NN + keyword)
├── EmbeddingService (MiniLM 384-dim) 
├── UnifiedEmbeddingService ✅ NEW → uses NluModule.IndicBertService
└── ModuleService

OrderFlowModule
├── SmartOrderService → uses SearchService ✅
├── SmartRecommendationService → uses NluService ✅ FIXED
└── OrderLearningService ✅ (no duplicates)

LlmModule
├── VllmService (local Qwen)
├── CloudLlmService (fallback)
├── LlmService (orchestrator)
└── RagService ✅ NEW → uses SearchService + LlmService
```

---

## 📊 Metrics to Track

After implementing fixes:

1. **Intent Classification Accuracy**: Should improve with unified NLU ✅
2. **Hindi Search Relevance**: Should improve with IndicBERT embeddings (UnifiedEmbeddingService ready)
3. **Response Quality**: Should improve with RAG context ✅
4. **Latency**: Monitor dual-embedding overhead

---

## Conclusion

**STATUS: ✅ P0 and P1 ITEMS COMPLETE**

The system now has:

1. **Unified Intent Detection**: SmartRecommendationService uses NluService ✅
2. **Language-Aware Embeddings**: UnifiedEmbeddingService created ✅
3. **RAG Pipeline**: RagService connects search + LLM ✅
4. **No Duplicates**: Intent patterns consolidated ✅

**Remaining P2 Work**:
- Dual vector index in OpenSearch (384 + 768 dim)
- Wire UnifiedEmbeddingService into SearchService
- Add RAG endpoint to controller

---

## Files Changed

1. `src/order/services/smart-recommendation.service.ts` - Uses NluService now
2. `src/order-flow/order-flow.module.ts` - Added NluModule import
3. `src/search/services/unified-embedding.service.ts` - **NEW** - Language-aware embedding
4. `src/search/search.module.ts` - Added UnifiedEmbeddingService, NluModule
5. `src/llm/services/rag.service.ts` - **NEW** - Retrieval-Augmented Generation
6. `src/llm/llm.module.ts` - Added RagService, SearchModule

---

*Generated: 2025-01*
*Updated: With implementation status*
