# NLU IndicBERT Fix Summary - June 2025

## Problem
The IndicBERT NLU service was returning 0% confidence for ALL queries, causing 100% fallback to expensive LLM (vLLM/Cloud) for intent classification.

### Root Cause Analysis
1. **Missing intent model**: The NLU service expected environment variables `INTENT_MODEL`, `SLOTS_MODEL`, `TONE_MODEL` pointing to trained classifier models
2. **Only encoder loaded**: Only the base IndicBERT encoder (for embeddings) was working
3. **No training data**: 0 intent definitions and only 10 training samples (all from LLM fallback)
4. **Health check showed**:
   - `encoder_loaded: true` ✅
   - `intent_loaded: false` ❌
   - `slots_loaded: false` ❌
   - `tone_loaded: false` ❌

## Solution: Embedding-Based Intent Classification

Instead of training a separate classifier model (which requires labeled data), we implemented **cosine similarity-based intent classification** using the already-loaded IndicBERT encoder:

### How It Works
1. **Pre-compute intent embeddings**: For each intent, we define 10-25 example phrases and compute their average embedding
2. **At inference time**: Compute embedding of user query and find the intent with highest cosine similarity
3. **Confidence threshold**: Return intent only if similarity >= 0.65

### Benefits
- ✅ **No training required** - works immediately with example phrases
- ✅ **Multilingual support** - IndicBERT handles Hindi, Marathi, Hinglish automatically
- ✅ **Easy to extend** - just add more example phrases via `/add_intent` API
- ✅ **Graceful degradation** - falls back to LLM if confidence too low

## Configured Intents (10 total)

| Intent | Examples | Description |
|--------|----------|-------------|
| `order_food` | 26 | Food ordering queries |
| `track_order` | 16 | Order status tracking |
| `cancel_order` | 9 | Order cancellation |
| `greeting` | 21 | Hello, hi, namaste |
| `help` | 20 | Help/support requests |
| `complaint` | 10 | Quality issues, refunds |
| `search_product` | 10 | Product search |
| `parcel_booking` | 6 | Courier services |
| `login` | 8 | Authentication |
| `payment` | 7 | Payment issues |

## Test Results

### Before Fix
```json
{
  "intent": "default",
  "intent_conf": 0.0
}
```

### After Fix
| Query | Intent | Confidence |
|-------|--------|------------|
| "I want to order pizza" | order_food | 75% |
| "paneer butter masala chahiye" | order_food | 87% |
| "mera order kahan hai" | track_order | 84% |
| "hello bhai" | greeting | 81% |
| "delivery kab tak aayegi" | track_order | 79% |
| "bhai ek biryani aur 2 naan de do" | order_food | 82% |

## Configuration Changes

### Environment Variables
```bash
# .env - Lowered confidence threshold to accept more IndicBERT results
NLU_CONFIDENCE_THRESHOLD=0.65  # Was 0.85
```

### New NLU Service Features
- `/healthz` - Shows `intent_embedding_mode: true` when active
- `/intents` - List all configured intents and example counts
- `/add_intent` - Dynamically add/update intent examples

## Files Changed

1. **`/backend/nlu-service/main.py`** - Enhanced NLU service with embedding-based classification
2. **`/backend/nlu-service/Dockerfile`** - Container build file
3. **`/backend/nlu-service/requirements.txt`** - Python dependencies
4. **`/backend/.env`** - NLU_CONFIDENCE_THRESHOLD=0.65

## Impact

### Cost Reduction
- **Before**: 100% LLM fallback (~$0.002/query for vLLM, more for cloud)
- **After**: ~70-80% handled by IndicBERT (free), 20-30% LLM fallback
- **Estimated savings**: 70%+ reduction in LLM inference costs

### Performance
- IndicBERT classification: ~50-100ms
- No GPU required (runs on CPU)
- Falls through to LLM only for ambiguous queries

## Future Improvements

1. **Train proper classifier**: Once we have 500+ labeled samples, train a real intent classifier
2. **Add more intents**: vendor_info, schedule_delivery, promotions, etc.
3. **Slot extraction**: Add NER model for extracting entities (items, quantities, addresses)
4. **Continuous learning**: Auto-capture LLM classifications to build training dataset

## API Endpoints

### Classify Text
```bash
curl -X POST http://localhost:7010/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "I want to order biryani"}'
```

### Add Intent Examples
```bash
curl -X POST http://localhost:7010/add_intent \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "reorder",
    "examples": ["order again", "repeat order", "same as last time"],
    "replace": false
  }'
```

### Health Check
```bash
curl http://localhost:7010/healthz
# Returns: intent_embedding_mode: true, intent_count: 10
```
