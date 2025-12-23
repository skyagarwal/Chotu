# Cards & Flow Fix Summary
Date: December 20, 2025

## Issues Fixed

### 1. Missing Cards in Resumed Flows
**Problem:** When a flow was resumed (user continuing an active flow), cards were not being passed through to the frontend.

**Root Cause:** In `agent-orchestrator.service.ts`, the resumed flow path didn't include `cards` in the metadata:
```typescript
// BEFORE (broken)
return {
  response: result.response,
  executionTime: Date.now() - startTime,
  metadata: { intent: 'resume_flow' }  // ❌ Missing cards!
};
```

**Fix:** Added cards to the metadata:
```typescript
// AFTER (fixed)
return {
  response: result.response,
  executionTime: Date.now() - startTime,
  metadata: { 
    intent: 'resume_flow',
    cards: result.metadata?.cards  // ✅ FIXED: Pass cards from resumed flow
  }
};
```

**File:** `/src/agents/services/agent-orchestrator.service.ts` (lines 583-594)

### 2. Wrong OpenSearch Index Name
**Problem:** The food order flow was configured to use `food_items_v4` index, but OpenSearch only had `food_items` index.

**Root Cause:** Index name mismatch - the flow was looking for an index that didn't exist:
```
ERROR [OpenSearchService] OpenSearch keyword search failed: 404
```

**Fix:** Updated index references from `food_items_v4` to `food_items` in:
1. `search.executor.ts` - default index
2. `food-order.flow.ts` - search_food state  
3. `food-order.flow.ts` - no_results state (fetch_categories)

### 3. Syntax Error in Settings Service
**Problem:** There was a string literal error in `settings.service.ts` preventing build.

**Fix:** Corrected the array syntax for `keysOfInterest`.

## Verification

After the fix, "very hungry" message flow:
1. ✅ Intent correctly classified as `order_food` (via LLM fallback since IndicBERT returned low confidence)
2. ✅ Flow engine finds and starts `food_order_v1` flow
3. ✅ Search executes against `food_items` index - **152 results found**
4. ✅ **10 cards generated** with proper data (name, price, image, store, etc.)
5. ✅ Cards included in response metadata

## Test Results
```
SearchExecutor] Found 152 results
Modern flow start result: {"cards":[
  {"id":3691,"name":"Chicken Good Chilli","price":"₹310",...},
  {"id":15750,"name":"Acana Classics Wild Coast Recipe","price":"₹550",...},
  {"id":491,"name":"Green Salad","price":"₹70",...},
  ...10 cards total
]}
```

## Related Components
- `ChatGateway` - Emits cards via WebSocket to frontend
- `ProductCard.tsx` - Frontend component that renders cards
- `chat/page.tsx` - Main chat interface that displays cards
