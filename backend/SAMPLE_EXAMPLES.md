# 📝 Training Sample Examples

Real examples from the generated dataset showing diversity and coverage.

---

## 🍕 Food Module Examples

### Item Search (OpenSearch)
```json
{
  "text": "Find Pizza near me",
  "intent": "intent.item.search",
  "module_id": 4,
  "entities": { "query": "Pizza", "veg": false, "locality": "Kothrud" },
  "routing": {
    "service": "opensearch",
    "endpoint": "GET /search/food",
    "params": { "q": "Pizza", "veg": "0", "module_id": 4 }
  }
}
```

```json
{
  "text": "Mujhe Biryani chahiye",
  "intent": "intent.item.search",
  "language": "hinglish",
  "routing": {
    "service": "opensearch",
    "endpoint": "GET /search/food"
  }
}
```

### Semantic Search (RAG Pipeline)
```json
{
  "text": "Something spicy for lunch",
  "intent": "intent.semantic.search",
  "entities": { "semantic": true, "flavor": "spicy", "meal_time": "lunch" },
  "routing": {
    "service": "opensearch",
    "endpoint": "GET /search/semantic/food",
    "params": { "q": "Something spicy for lunch", "module_id": 4 }
  },
  "use_case": "semantic_food_search"
}
```

### Order Placement (PHP)
```json
{
  "text": "Order Burger from McDonald's",
  "intent": "intent.order.place",
  "entities": { "item": "Burger", "store": "McDonald's", "order_type": "delivery" },
  "routing": {
    "service": "php",
    "endpoint": "POST /customer/order/place",
    "params": { "module_id": 4, "order_type": "delivery" }
  }
}
```

### Recommendations (OpenSearch)
```json
{
  "text": "What goes well with Biryani?",
  "intent": "intent.recommendations",
  "entities": { "item": "Biryani", "recommendation_type": "frequently_bought_together" },
  "routing": {
    "service": "opensearch",
    "endpoint": "GET /search/recommendations/{item_id}",
    "params": { "module_id": 4, "limit": 5 }
  }
}
```

---

## 🛒 E-commerce Module Examples

### Product Search (OpenSearch)
```json
{
  "text": "Buy Milk",
  "intent": "intent.item.search",
  "module_id": 5,
  "module_type": "ecommerce",
  "entities": { "query": "Milk", "product": "Milk", "search_type": "item" },
  "routing": {
    "service": "opensearch",
    "endpoint": "GET /search/ecom",
    "params": { "q": "Milk", "module_id": 5 }
  }
}
```

```json
{
  "text": "Atta kaha milega?",
  "intent": "intent.item.search",
  "language": "hinglish",
  "routing": {
    "service": "opensearch",
    "endpoint": "GET /search/ecom"
  }
}
```

### Store Search (OpenSearch)
```json
{
  "text": "D-Mart near me",
  "intent": "intent.store.search",
  "entities": { "store": "D-Mart", "search_type": "store" },
  "routing": {
    "service": "opensearch",
    "endpoint": "GET /search/ecom/stores",
    "params": { "q": "D-Mart", "module_id": 5 }
  }
}
```

---

## 📦 Parcel Module Examples

### Parcel Booking (PHP)
```json
{
  "text": "Send parcel from Pune to Mumbai",
  "intent": "intent.parcel.place",
  "module_id": 3,
  "module_type": "parcel",
  "entities": {
    "origin": "Pune",
    "destination": "Mumbai",
    "weight": "2kg",
    "vehicle": "bike"
  },
  "routing": {
    "service": "php",
    "endpoint": "POST /customer/order/place",
    "params": { "order_type": "parcel", "module_id": 3 }
  }
}
```

```json
{
  "text": "Pune se Delhi parcel bhejni hai",
  "intent": "intent.parcel.place",
  "language": "hinglish",
  "entities": {
    "origin": "Pune",
    "destination": "Delhi"
  }
}
```

### Parcel Tracking (PHP)
```json
{
  "text": "Track parcel PRC123456",
  "intent": "intent.parcel.track",
  "entities": { "parcel_id": "PRC123456" },
  "routing": {
    "service": "php",
    "endpoint": "GET /customer/order/details",
    "params": { "order_id": "PRC123456" }
  }
}
```

### Pricing Inquiry (PHP)
```json
{
  "text": "How much to send 5kg to Mumbai?",
  "intent": "tool.fees.quote",
  "entities": {
    "origin": "Pune",
    "destination": "Mumbai",
    "weight": "5kg",
    "query_type": "pricing"
  },
  "routing": {
    "service": "php",
    "endpoint": "POST /pricing/quote",
    "params": { "module_id": 3 }
  }
}
```

---

## 🌐 Language Diversity

### English (49%)
- "Find Pizza near me"
- "Order Burger from KFC"
- "Track order 123456"

### Hinglish (47%)
- "Mujhe Biryani chahiye"
- "Dominos se Pizza order karo"
- "Order 123456 kaha hai?"

### Hindi (2%)
- "पिज़्ज़ा कहाँ मिलेगा?"
- "मुझे दूध चाहिए"

### Marathi (2%)
- "पिझ्झा कुठे मिळेल?"
- "दुकान कुठे आहे?"

---

## 🎯 Entity Extraction Examples

### Food Entities
```javascript
{
  query: "Pizza",
  veg: true,
  locality: "Kothrud",
  search_type: "item",
  cuisine: "Italian",
  meal_time: "dinner"
}
```

### Semantic Entities
```javascript
{
  query: "Something spicy for lunch",
  semantic: true,
  flavor: "spicy",
  meal_time: "lunch"
}
```

### Parcel Entities
```javascript
{
  origin: "Pune",
  destination: "Mumbai",
  weight: "5kg",
  vehicle: "bike",
  parcel_id: "PRC123456"
}
```

### Order Entities
```javascript
{
  item: "Burger",
  store: "McDonald's",
  order_type: "delivery",
  order_id: "123456",
  payment_method: "cash_on_delivery"
}
```

---

## 🔀 Routing Decision Examples

### OpenSearch Primary
```
User: "Find veg Pizza near me"
  ↓
Router: intent.item.search, module_id=4
  ↓
Orchestrator: isSearchIntent() = true
  ↓
OpenSearch: GET /search/food?q=Pizza&veg=1&module_id=4
  ↓
Response: 15 results, 120ms
  ✅ SUCCESS
```

### OpenSearch → PHP Fallback
```
User: "Find rare item XYZ"
  ↓
Router: intent.item.search, module_id=5
  ↓
Orchestrator: routeToOpenSearch()
  ↓
OpenSearch: GET /search/ecom?q=XYZ&module_id=5
  ↓
Response: 0 results, 80ms
  ❌ EMPTY → Trigger fallback
  ↓
PHP: POST /Product/searchProduct
  ↓
Response: 3 results, 450ms
  ✅ FALLBACK SUCCESS
```

### Direct PHP (Transaction)
```
User: "Order Milk"
  ↓
Router: intent.order.place, module_id=5
  ↓
Orchestrator: isTransactionIntent() = true
  ↓
PHP: POST /customer/order/place
  ↓
Response: order_id=789, 380ms
  ✅ SUCCESS
```

### RAG Pipeline (Semantic)
```
User: "Something spicy for lunch"
  ↓
Router: intent.semantic.search, module_id=4
  ↓
Orchestrator: routeToOpenSearch()
  ↓
OpenSearch: GET /search/semantic/food (vector search)
  ↓
Response: Top 10 items, 280ms
  ↓
LLM Context Injection:
  "Based on these options: [Chicken Tikka, Paneer Tikka, ...],
   I recommend Chicken Tikka which is spicy and perfect for lunch..."
  ↓
User: Natural language response with recommendations
  ✅ RAG SUCCESS
```

---

## 📊 Coverage Matrix

| Intent | Module | Service | Samples | Language Mix |
|--------|--------|---------|---------|--------------|
| item.search | Food (4) | OpenSearch | 280 | en/hi/hinglish/mr |
| item.search | Ecom (5) | OpenSearch | 225 | en/hi/hinglish |
| store.search | Ecom (5) | OpenSearch | 50 | en/hinglish |
| semantic.search | Food (4) | OpenSearch+LLM | 105 | en/hinglish |
| recommendations | Food (4) | OpenSearch | 70 | en/hinglish |
| order.place | Food (4) | PHP | 175 | en/hinglish |
| order.place | Ecom (5) | PHP | 150 | en/hinglish |
| order.track | Food (4) | PHP | 70 | en/hinglish |
| order.track | Ecom (5) | PHP | 75 | en/hinglish |
| parcel.place | Parcel (3) | PHP | 150 | en/hinglish |
| parcel.track | Parcel (3) | PHP | 90 | en/hinglish |
| fees.quote | Parcel (3) | PHP | 60 | en/hinglish |

**Total:** 1,500 samples across 12 intent-module combinations

---

## 🎯 Quality Checklist

✅ **Complete module coverage** (3, 4, 5)  
✅ **Intent diversity** (9 unique intents)  
✅ **Multi-lingual** (en, hinglish, hi, mr)  
✅ **Realistic entities** (based on production data)  
✅ **Proper routing** (OpenSearch vs PHP decision tree)  
✅ **RAG samples** (semantic search with LLM context)  
✅ **Balanced distribution** (search 49%, transaction 51%)  
✅ **Production-ready format** (full metadata for training)

---

**Status:** ✅ Ready for Training  
**Next:** Train router model (Week 1)
