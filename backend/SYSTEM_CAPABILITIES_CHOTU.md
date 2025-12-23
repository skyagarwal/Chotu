# 🤖 Mangwale AI - Complete System Capabilities & Enhancements

## Overview

This document summarizes what Chotu can do, what exists in the system, and proposed enhancements.

---

## 📊 Current System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           MANGWALE AI PLATFORM                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐                  │
│  │   WhatsApp  │    │   Web/App    │    │  Voice (IVR)   │                  │
│  │   Channel   │    │   Channel    │    │   Channel      │                  │
│  └──────┬──────┘    └──────┬───────┘    └───────┬────────┘                  │
│         │                  │                    │                            │
│         └──────────────────┼────────────────────┘                            │
│                            ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                    NestJS Backend                             │           │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │           │
│  │  │ Flow     │  │ NLU      │  │ Voice    │  │ PHP          │  │           │
│  │  │ Engine   │  │ Service  │  │ Chars    │  │ Integration  │  │           │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                            │                                                 │
│         ┌──────────────────┼──────────────────┐                             │
│         ▼                  ▼                  ▼                             │
│  ┌────────────┐    ┌────────────────┐   ┌────────────────┐                  │
│  │ PostgreSQL │    │   OpenSearch   │   │  PHP Backend   │                  │
│  │ (NestJS)   │    │  (Food Items)  │   │  (Orders/Users)│                  │
│  └────────────┘    └────────────────┘   └────────────────┘                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎭 What Chotu Can Do Today

### ✅ Food Ordering (food_order_flow)
| Capability | Status | Details |
|------------|--------|---------|
| Search food items | ✅ Working | OpenSearch with hybrid search |
| Restaurant recommendations | ✅ Working | Based on distance, rating, cuisine |
| Veg/Non-veg filtering | ✅ Working | Dietary filter in search |
| Group orders | 🆕 Implemented | "3 people, hungry, under 1000" |
| Budget constraints | ✅ Working | "Under 500 rupees" |
| Time constraints | 🆕 Implemented | "Deliver in 45 mins" |
| Value proposition | 🆕 Implemented | Compare vs Zomato/Swiggy pricing |
| Cart management | ✅ Working | Add, remove, modify items |
| Checkout + Payment | ✅ Working | COD, Online, Wallet |
| Address collection | ✅ Working | Saved addresses + Google Maps |
| Custom pickup | ✅ Working | Pick from restaurant |

### ✅ Vendor Management (vendor_auth_v1, vendor_orders_v1)
| Capability | Status | Details |
|------------|--------|---------|
| Vendor login | ✅ Working | Email/password or OTP |
| View orders | ✅ Working | Pending, processing, ready |
| Update order status | ✅ Working | Confirm → Preparing → Ready |
| Toggle offline | ✅ Working | Go offline mode |
| Multi-channel notifications | ✅ Working | FCM, WhatsApp, Voice, SMS |

### ✅ Local Dukan/Kirana (ecommerce_order_flow)
| Capability | Status | Details |
|------------|--------|---------|
| Grocery search | ✅ Working | Routes to ecom_items index |
| Kirana store ordering | ✅ Working | Module IDs: 16, 18 |
| Daily needs | ✅ Working | Atta, doodh, sabzi, etc. |
| Same flow as ecom | ✅ Working | Shared with electronics, general |

**Keywords that trigger dukan flow:**
```
dukan, kirana, grocery, shop, store, local, saman, 
atta, doodh, chawal, dal, sabzi, milk, rice, flour
```

### ✅ Parcel Delivery (parcel_delivery_v1)
| Capability | Status | Details |
|------------|--------|---------|
| Book parcel | ✅ Working | Pickup + Delivery addresses |
| Vehicle selection | ✅ Working | Bike, Auto, Truck categories |
| Distance pricing | ✅ Working | OSRM routing + zone charges |
| Recipient details | ✅ Working | Name + phone for delivery |
| Live tracking | ✅ Working | Rider location via delivery_tracking.flow |
| Contact rider | ✅ Working | Masked phone numbers |
| Cancel/modify | ✅ Working | With eligibility check |

### ✅ Delivery Partner (delivery_partner_order_flow)
| Capability | Status | Details |
|------------|--------|---------|
| Partner login | ✅ Working | OTP-based auth |
| View assigned orders | ✅ Working | Active deliveries |
| Update delivery status | ✅ Working | Picked → On way → Delivered |
| Navigation | ✅ Working | Google Maps integration |

### ✅ User Management
| Capability | Status | Details |
|------------|--------|---------|
| User type detection | ✅ Working | Customer, Vendor, Delivery |
| Multi-role handling | ✅ Working | User can be customer + vendor |
| Language preference | ✅ Working | Hindi, English, Marathi |
| Saved addresses | ✅ Working | Home, Office, custom |

---

## 📝 Review System (PHP + NestJS)

### Current Flow:
```
1. User completes order (PHP)
         ↓
2. Review reminder sent (WhatsApp/App)
         ↓
3. User rates + comments
         ↓
4. NestJS validates & sends to PHP API
         ↓
5. PHP stores in MySQL
         ↓
6. [NEW] NestJS syncs to PostgreSQL
         ↓
7. [NEW] Google NL API analyzes
         ↓
8. [NEW] Intelligence stored in PostgreSQL
```

### 🆕 New Review Intelligence System

**Created Files:**
- [review-intelligence.service.ts](src/reviews/services/review-intelligence.service.ts)
- [review-sync.service.ts](src/reviews/services/review-sync.service.ts)
- [migration.sql](prisma/migrations/20241221_review_intelligence/migration.sql)

**What It Does:**
1. **Syncs reviews** from PHP MySQL → PostgreSQL
2. **Analyzes with Google NL API** (or local fallback)
3. **Extracts aspects**: quantity, taste, spiciness, freshness, packaging, delivery, value, oiliness
4. **Generates warnings** for Chotu to mention:
   - "Sahab, kuch log bolte hain quantity thodi kam hai 😅"
   - "Yeh dish thodi teekhi hai, mirchi kam karwa sakte ho! 🌶️"

**Database Tables Created:**
| Table | Purpose |
|-------|---------|
| `item_review_intelligence` | AI-analyzed insights per item |
| `store_review_intelligence` | Aggregated store-level insights |
| `review_sync_log` | Tracks PHP → PG sync status |
| `review_aspect_keywords` | Configurable keywords (Hindi/English/Hinglish) |

---

## 🔧 Google Cloud Natural Language API

### Why Google NL API?
- **Sentiment Analysis**: -1 to +1 score per review
- **Entity Extraction**: Identifies "quantity", "taste", "delivery"
- **Aspect-Based Sentiment**: {quantity: negative, taste: positive}
- **Hindi/Hinglish Support**: Works well with mixed language

### Cost: ~₹75 per 1000 reviews analyzed

### Setup Required:
```bash
# 1. Enable Google Cloud NL API in console
# 2. Create service account & download JSON key
# 3. Set environment variables:
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"

# 4. Install package
npm install @google-cloud/language
```

### Fallback:
If Google API not configured, the system uses **local keyword-based analysis** which works well for Hindi/Hinglish without API costs.

---

## 🏪 Local Dukan Enhancement Opportunities

### Current State:
- Uses same flow as general e-commerce
- Module IDs: 16 (Local Kirana), 18 (Local Dukan)
- Search index: `ecom_items`

### Proposed Enhancements:

#### 1. **Dedicated Dukan Flow** (Optional)
```typescript
// local_dukan_order_v1
// Special handling for daily needs:
// - "Rozana ka saman" (daily essentials list)
// - Quick reorder from last order
// - Subscription for milk/bread
```

#### 2. **Kirana Bundle Deals**
```typescript
// "Mahine ka ration" bundles
// Auto-suggest based on family size
// Festival special combos (Diwali, Holi)
```

#### 3. **Local Shop Discovery**
```typescript
// "Mere area ki dukan"
// Walking distance shops
// Shop specialties (best for atta, best for sabzi)
```

---

## 📦 Parcel Flow Enhancement Opportunities

### Current State:
- Full parcel booking with vehicle selection
- Distance-based pricing
- Live tracking

### Proposed Enhancements:

#### 1. **Package Size Estimation**
```typescript
// "Yeh kitna bada hai?" → Auto-suggest vehicle
// Photo-based size detection (AI)
```

#### 2. **Scheduled Delivery**
```typescript
// "Kal subah 10 baje deliver karo"
// Recurring parcels (office courier)
```

#### 3. **Multi-Stop Delivery**
```typescript
// Pick from A → Deliver to B, C, D
// Route optimization
```

---

## 🚀 Chotu Enhancement Roadmap

### Phase 1: Review Intelligence (Ready to Deploy)
- [x] ReviewIntelligenceService created
- [x] ReviewSyncService created
- [x] Database migration ready
- [ ] Deploy migration
- [ ] Configure Google NL API (optional)
- [ ] Integrate with food ordering flow

### Phase 2: Smarter Recommendations
- [x] ComplexOrderParserService created
- [x] GroupOrderSearchService created
- [x] ValuePropositionService created
- [ ] Register services in modules
- [ ] Update food-order.flow.ts transitions

### Phase 3: Character Knowledge Base
- [x] Character context tables designed
- [x] Knowledge base schema ready
- [ ] Seed Nashik food knowledge
- [ ] Train Chotu with local expertise

### Phase 4: Local Dukan Intelligence
- [ ] Create dedicated dukan flow (optional)
- [ ] Add "rozana ka saman" bundles
- [ ] Subscription ordering for essentials

### Phase 5: Parcel Enhancements
- [ ] Package size estimation
- [ ] Scheduled delivery support
- [ ] Multi-stop routing

---

## 📋 Integration Checklist

### To Enable Review Intelligence:

```bash
# 1. Run database migration
cd backend
npx prisma db push
# OR
psql -f prisma/migrations/20241221_review_intelligence/migration.sql

# 2. Register services in module
# Add to src/reviews/reviews.module.ts:
providers: [
  ReviewIntelligenceService,
  ReviewSyncService,
]

# 3. (Optional) Configure Google NL API
# Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID

# 4. Trigger initial sync
# Call reviewSyncService.syncItemReviews(itemId, storeId)
```

### To Enable Group Order Intelligence:

```bash
# 1. Run enhanced food ordering migration
psql -f prisma/migrations/20241221_enhanced_food_ordering/migration.sql

# 2. Register services
# Add to src/order/order.module.ts:
providers: [
  ComplexOrderParserService,
  GroupOrderSearchService,
  ValuePropositionService,
]

# 3. Register executors
# Add to src/flow-engine/executors/executor.module.ts

# 4. Update food-order.flow.ts
# Import and merge enhancedFoodOrderStates
```

---

## 🎯 Summary of Today's Work

| Created | File | Purpose |
|---------|------|---------|
| ✅ | [review-intelligence.service.ts](src/reviews/services/review-intelligence.service.ts) | Google NL API / local sentiment analysis |
| ✅ | [review-sync.service.ts](src/reviews/services/review-sync.service.ts) | PHP → PostgreSQL review sync |
| ✅ | [migration.sql](prisma/migrations/20241221_review_intelligence/migration.sql) | Review intelligence tables |
| ✅ | [complex-order-parser.service.ts](src/order/services/complex-order-parser.service.ts) | Parse group orders |
| ✅ | [group-order-search.service.ts](src/order/services/group-order-search.service.ts) | Find optimal group items |
| ✅ | [value-proposition.service.ts](src/pricing/services/value-proposition.service.ts) | Compare vs competitors |
| ✅ | [enhanced executors](src/flow-engine/executors/) | Flow engine executors |
| ✅ | [enhanced-food-order-states.ts](src/flow-engine/flows/enhanced-food-order-states.ts) | New flow states |

---

## 💡 Questions for You

1. **Google NL API**: Should I set up the Google Cloud project credentials?
2. **Review Sync Frequency**: Daily at 2 AM ok, or more frequent?
3. **Local Dukan**: Want a dedicated flow or keep using ecom?
4. **Parcel Enhancements**: Priority for scheduled delivery?
5. **Character System**: Should we add Meera (nutrition expert) and Raju (deal hunter)?

---

## 🔗 Related Files

- [ENHANCED_FOOD_ORDER_INTELLIGENCE.md](src/flow-engine/ENHANCED_FOOD_ORDER_INTELLIGENCE.md) - Full design doc
- [ENHANCED_FOOD_ORDER_IMPLEMENTATION.md](ENHANCED_FOOD_ORDER_IMPLEMENTATION.md) - Implementation summary
- [food-order.flow.ts](src/flow-engine/flows/food-order.flow.ts) - Main food ordering flow
- [parcel.flow.ts](src/flow-engine/flows/parcel.flow.ts) - Parcel booking flow
- [vendor-orders.flow.ts](src/flow-engine/flows/vendor-orders.flow.ts) - Vendor management
