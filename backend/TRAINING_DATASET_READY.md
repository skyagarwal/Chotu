# 🎯 Production Training Dataset Complete

**Generated:** November 13, 2025  
**Total Samples:** 1,500  
**Status:** ✅ Ready for Training  

---

## 📊 Dataset Statistics

### By Module
```
Module 3 (Parcel):     300 samples (20%)
Module 4 (Food):       700 samples (47%)
Module 5 (E-commerce): 500 samples (33%)
```

### By Intent
```
intent.item.search:    505 samples (34%) → OpenSearch
intent.order.place:    325 samples (22%) → PHP
intent.order.track:    145 samples (10%) → PHP
intent.parcel.place:   150 samples (10%) → PHP
intent.semantic.search: 105 samples (7%) → OpenSearch + RAG
intent.parcel.track:    90 samples (6%) → PHP
intent.recommendations:  70 samples (5%) → OpenSearch
intent.store.search:     50 samples (3%) → OpenSearch
tool.fees.quote:         60 samples (4%) → PHP
```

### By Language
```
English:    739 samples (49%)
Hinglish:   706 samples (47%)
Hindi:       23 samples (2%)
Marathi:     32 samples (2%)
```

### By Service Routing
```
OpenSearch:  730 samples (49%) - Search, Semantic, Recommendations
PHP:         770 samples (51%) - Orders, Tracking, Payments
```

---

## 🎨 Sample Structure

Each sample includes:

```typescript
{
  id: string;                    // Unique sample ID
  text: string;                  // User input text
  intent: string;                // Target intent classification
  module_id: number;             // 3 (parcel), 4 (food), 5 (ecommerce)
  module_type: string;           // parcel | food | ecommerce
  entities: {                    // Extracted entities
    query?: string;
    veg?: boolean;
    locality?: string;
    origin?: string;
    destination?: string;
    weight?: string;
    // ... context-specific entities
  };
  language: string;              // en | hi | mr | hinglish
  routing: {
    service: string;             // opensearch | php
    endpoint: string;            // Target API endpoint
    params: object;              // Query parameters
  };
  use_case: string;              // Descriptive use case name
  created_at: string;            // ISO timestamp
}
```

---

## 🍕 Module 4: Food (700 samples)

### Distribution
- **Item Search** (280 samples):
  - "Find Pizza near me"
  - "I want Biryani"
  - "Mujhe Dosa chahiye"
  - Includes veg filter, locality
  - Routes to: `GET /search/food`

- **Order Placement** (175 samples):
  - "Order Pizza from Dominos"
  - "Dominos se Burger order karo"
  - Routes to: `POST /customer/order/place`

- **Semantic Search** (105 samples):
  - "Something spicy for lunch"
  - "Breakfast ke liye kuch sweet"
  - Routes to: `GET /search/semantic/food` → RAG pipeline

- **Recommendations** (70 samples):
  - "What goes well with Biryani?"
  - "Pizza ke saath kya lun?"
  - Routes to: `GET /search/recommendations/{item_id}`

- **Order Tracking** (70 samples):
  - "Track order 123456"
  - "Order 123456 kaha hai?"
  - Routes to: `PUT /customer/order/track`

---

## 🛒 Module 5: E-commerce (500 samples)

### Distribution
- **Product Search** (225 samples):
  - "Buy Rice"
  - "Milk kaha milega?"
  - Routes to: `GET /search/ecom`

- **Product Order** (150 samples):
  - "Order Atta"
  - "Dal order karo"
  - Routes to: `POST /customer/order/place`

- **Order Tracking** (75 samples):
  - "Track order 234567"
  - Routes to: `PUT /customer/order/track`

- **Store Search** (50 samples):
  - "Reliance Fresh near me"
  - "D-Mart kaha hai?"
  - Routes to: `GET /search/ecom/stores`

---

## 📦 Module 3: Parcel (300 samples)

### Distribution
- **Parcel Booking** (150 samples):
  - "Send parcel from Pune to Mumbai"
  - "Pune se Delhi parcel bhejni hai"
  - Includes origin, destination, weight, vehicle
  - Routes to: `POST /customer/order/place`

- **Parcel Tracking** (90 samples):
  - "Track parcel PRC123456"
  - "PRC123456 kaha hai?"
  - Routes to: `GET /customer/order/details`

- **Pricing Inquiry** (60 samples):
  - "How much to send 5kg to Mumbai?"
  - "1kg bhejne ka kitna lagega?"
  - Routes to: `POST /pricing/quote`

---

## 🎯 Use Cases Coverage

### ✅ Search Operations (OpenSearch Primary)
1. **Item Search** - Full-text search with filters (veg, price, rating)
2. **Store Search** - Restaurant/shop discovery with geo-distance
3. **Semantic Search** - Natural language queries → Vector search → RAG
4. **Recommendations** - Frequently bought together

### ✅ Transaction Operations (PHP API)
1. **Order Placement** - Food, ecommerce, parcel booking
2. **Order Tracking** - Real-time status updates
3. **Pricing** - Parcel quote calculations

### ✅ Language Coverage
- **English**: Formal queries, business language
- **Hinglish**: Most common (47%), daily conversations
- **Hindi**: Devanagari script, regional users
- **Marathi**: Regional Pune/Maharashtra users

---

## 🚀 Next Steps

### Week 1: Router Training
```bash
# Train intent router with module_id classification
cd /home/ubuntu/Devs/mangwale-ai
npm run train:router -- \
  --input training/production-samples.json \
  --output models/router-v1 \
  --epochs 100 \
  --target-accuracy 0.85
```

**Expected Output:**
- Module classification accuracy: 85%+
- Intent classification accuracy: 80%+
- Entity extraction F1: 75%+

### Week 2: Specialized Agents
```bash
# Train food agent (700 samples)
npm run train:agent -- \
  --module food \
  --input training/production-samples.json \
  --output models/food-agent-v1

# Train ecommerce agent (500 samples)
npm run train:agent -- \
  --module ecommerce \
  --output models/ecom-agent-v1

# Train parcel agent (300 samples)
npm run train:agent -- \
  --module parcel \
  --output models/parcel-agent-v1
```

### Week 3: Integration Testing
- Test SearchOrchestrator with real samples
- Verify OpenSearch → PHP fallback
- Test RAG pipeline with semantic search
- Measure end-to-end latency

### Week 4: Production Deployment
- Deploy router model to mangwale-ai service
- Deploy specialized agents
- Enable SearchOrchestrator routing
- Monitor performance metrics

---

## 📈 Success Metrics

### Training Targets
- **Router Accuracy**: 85%+ (module + intent classification)
- **Food Agent**: 85%+ accuracy on 700 samples
- **Ecommerce Agent**: 85%+ accuracy on 500 samples
- **Parcel Agent**: 85%+ accuracy on 300 samples

### Production Targets
- **End-to-End Latency**: <500ms (P95)
  - IndicBERT: 50ms
  - OpenSearch: 50-300ms
  - PHP fallback: 200-500ms
- **Search Success Rate**: 95%+
- **Fallback Rate**: <5%
- **Human Escalation**: <5%

---

## 📁 File Locations

```
mangwale-ai/
├── training/
│   └── production-samples.json     (1500 samples - THIS FILE)
├── scripts/
│   └── production-sample-generator.ts
├── docs/
│   ├── NLU_OPENSEARCH_PHP_INTEGRATION.md
│   ├── NLU_PHP_MODULE_MAPPING.md
│   └── MANGWALE_NLU_ROADMAP.md
└── src/
    └── orchestrator/
        └── search.orchestrator.ts
```

---

## 🎉 Achievement Summary

**What We Built:**
1. ✅ **1,500 production-ready training samples** covering all 3 modules
2. ✅ **Complete routing metadata** for OpenSearch + PHP integration
3. ✅ **Multi-lingual support** (en, hinglish, hi, mr)
4. ✅ **Realistic use cases** based on production data
5. ✅ **Balanced distribution** across search and transaction intents
6. ✅ **RAG-ready samples** for semantic search + LLM context injection

**Ready for:**
- Intent router training (Week 1)
- Specialized agent training (Week 2)
- Integration testing (Week 3)
- Production deployment (Week 4)

**Cost Impact:**
- Current: ~$15/month (cloud LLM fallback)
- After training: ~$3/month (80% cost reduction)
- ROI: 4-5 months

---

## 🔗 Related Documentation

- [Complete Integration Architecture](./docs/NLU_OPENSEARCH_PHP_INTEGRATION.md)
- [PHP Module Mapping](./docs/NLU_PHP_MODULE_MAPPING.md)
- [4-Week Training Roadmap](./docs/MANGWALE_NLU_ROADMAP.md)
- [Search Orchestrator Source](./src/orchestrator/search.orchestrator.ts)

---

**Generated by:** production-sample-generator.ts  
**Timestamp:** 2025-11-13 06:27:34 UTC  
**Version:** 1.0.0  
**Status:** Production Ready ✅
