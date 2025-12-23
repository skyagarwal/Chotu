# Mangwale AI Chat UI & Promotion System Roadmap

## Current State Analysis

### What's Working ✅
1. **Chat Flow**: User messages → NLU → Search → Cards displayed
2. **ProductCard**: Zomato-style cards with image, rating, price, add button
3. **Search API**: Returns items with store_id, price, rating, delivery_time
4. **User Location**: Captured via browser geolocation, stored in localStorage

### What's Missing ❌
1. **Card Animations**: Cards slide from bottom only, no variety
2. **Card Size**: Too large, requires excessive scrolling
3. **Store Status**: No open/closed indicator on cards
4. **Distance Info**: Not showing how far store is
5. **Delivery Time**: Hardcoded "30-45 min", not calculated
6. **Promotion System**: No featured/sponsored stores
7. **Quick Options**: No pill buttons for fast selection
8. **Store Ranking**: Basic relevance only, no business logic

---

## Phase 1: UI/UX Improvements (Immediate)

### 1.1 Compact Card Redesign
**Goal**: Reduce card height by 40%, fit 3-4 cards in viewport

```
┌──────────────────────────────────────┐
│ 🖼️ Small │ Item Name          ⭐4.2  │
│  Image   │ Store • 2.3 km • 25 min   │
│  (80px)  │ ₹149        [Add +]       │
└──────────────────────────────────────┘
```

**Changes**:
- Horizontal layout (image left, content right)
- Image: 80x80px instead of full-width
- Single-line store info with distance & time
- Smaller font sizes (12-14px)

### 1.2 Multi-Direction Animations
**Pattern**: Cards enter from 4 directions based on index

```typescript
const directions = ['left', 'right', 'top', 'bottom']
const direction = directions[index % 4]

// CSS classes
animate-slide-in-left   // translateX(-100%) → 0
animate-slide-in-right  // translateX(100%) → 0
animate-slide-in-top    // translateY(-100%) → 0
animate-slide-in-bottom // translateY(100%) → 0
```

### 1.3 Quick-Pick Pills
**Before cards, show tappable options**:
```
┌─────────────────────────────────────────┐
│ [🍔 Burgers] [🍕 Pizza] [🥗 Healthy]    │
│ [⚡ Under 20min] [💰 Under ₹100]        │
└─────────────────────────────────────────┘
```

### 1.4 Horizontal Scroll Layout (Optional)
For category browsing:
```
← [Card 1] [Card 2] [Card 3] [Card 4] →
```

---

## Phase 2: Data Enrichment

### 2.1 Store Status on Cards
**Add to card data**:
```typescript
{
  storeStatus: {
    isOpen: true,
    message: "Open • Closes 10 PM",
    // or "Opens at 11 AM"
  }
}
```

**UI**:
- Green dot + "Open" for open stores
- Red dot + "Closed • Opens 11 AM" for closed
- Filter out closed stores by default (option to show)

### 2.2 Real Distance Calculation
**Flow**:
1. User location → stored in session
2. Search results include store coordinates
3. Calculate distance using Haversine/OSRM
4. Add to card: "2.3 km away"

### 2.3 Dynamic Delivery Time
**Formula**:
```
delivery_time = prep_time + travel_time

prep_time = store.avg_prep_time || category_default
travel_time = distance_km * 3 + 5 (minutes)
```

---

## Phase 3: Promotion System

### 3.1 Store Promotion Types
| Type | Description | Business Model |
|------|-------------|----------------|
| **Featured** | Highlighted in results | Monthly fee (₹2999/month) |
| **Sponsored** | Top placement | CPC (₹2-5 per click) |
| **Deals** | Special offers | Commission on sales |
| **New** | Recently joined | Free for 30 days |

### 3.2 Database Schema
```sql
CREATE TABLE store_promotions (
  id SERIAL PRIMARY KEY,
  store_id INT NOT NULL,
  promo_type ENUM('featured', 'sponsored', 'deal', 'new'),
  title VARCHAR(100),
  description TEXT,
  discount_percent INT,
  min_order_value INT,
  start_date DATETIME,
  end_date DATETIME,
  budget DECIMAL(10,2),  -- For CPC
  spent DECIMAL(10,2),
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT NOW()
);

CREATE TABLE promotion_impressions (
  id SERIAL PRIMARY KEY,
  promo_id INT,
  user_id VARCHAR(100),
  session_id VARCHAR(100),
  position INT,  -- Where shown in results
  clicked BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false,  -- Led to order
  created_at DATETIME DEFAULT NOW()
);
```

### 3.3 AI-Driven Promotion Logic
```typescript
function rankStoresWithPromotions(stores, userContext) {
  return stores.map(store => {
    let score = store.relevanceScore;
    
    // Promotion boost
    if (store.isSponsored) score += 0.3;
    if (store.isFeatured) score += 0.15;
    if (store.hasActiveDeals) score += 0.1;
    
    // User preference boost
    if (userContext.previousOrders.includes(store.id)) score += 0.2;
    if (userContext.favoriteCategory === store.category) score += 0.1;
    
    // Negative factors
    if (!store.isOpen) score -= 0.5;
    if (store.distance > 5) score -= 0.1 * (store.distance - 5);
    
    return { ...store, finalScore: score };
  }).sort((a, b) => b.finalScore - a.finalScore);
}
```

### 3.4 Promotion UI Elements
```
┌────────────────────────────────────────┐
│ 🏆 FEATURED                            │
│ ┌──────────────────────────────────┐   │
│ │ [🖼️] Pizza Palace    ⭐4.5      │   │
│ │      🎁 20% OFF on first order   │   │
│ │      1.2 km • 20-25 min  [Order] │   │
│ └──────────────────────────────────┘   │
├────────────────────────────────────────┤
│ ⚡ FASTEST OPTIONS                     │
│ [Card] [Card] [Card]                   │
├────────────────────────────────────────┤
│ 💰 BEST VALUE                          │
│ [Card] [Card] [Card]                   │
└────────────────────────────────────────┘
```

---

## Phase 4: Bot Intelligence

### 4.1 Location-Aware Responses
```yaml
# Bot should know:
- User's current location (lat/lng)
- User's saved addresses
- Zone availability

# Response adaptations:
- "I found 5 restaurants near your location in Nashik Road"
- "This store delivers to your area in about 25 minutes"
- "Sorry, this restaurant doesn't deliver to your location"
```

### 4.2 Context-Aware Suggestions
```typescript
interface UserContext {
  location: { lat: number, lng: number, zone_id: number }
  time: { hour: number, isWeekend: boolean }
  history: { lastOrders: Order[], favorites: Store[] }
  preferences: { veg: boolean, priceRange: string }
}

function generateSuggestion(context: UserContext): string {
  if (context.time.hour >= 11 && context.time.hour <= 14) {
    return "Looking for lunch? Here are today's specials near you!";
  }
  if (context.time.hour >= 19 && context.time.hour <= 22) {
    return "Dinner time! Your favorite restaurants have great deals today.";
  }
  // ... more contextual suggestions
}
```

### 4.3 Smart Filtering
Bot should automatically filter:
- ❌ Closed stores (unless user asks)
- ❌ Stores outside delivery range
- ❌ Items above user's typical spend (unless deals)
- ✅ Prioritize user's preferred categories
- ✅ Show faster delivery options first

---

## Phase 5: Analytics & Optimization

### 5.1 Track Promotion Performance
```typescript
interface PromotionMetrics {
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  ctr: number  // clicks / impressions
  cvr: number  // conversions / clicks
  roas: number // revenue / spent
}
```

### 5.2 A/B Testing Framework
Test different:
- Card layouts (horizontal vs vertical)
- Promotion placements
- CTA button text ("Add +" vs "Order Now")
- Price display formats

### 5.3 ML-Based Optimization
Future: Use ML to:
- Predict which promotions work for which users
- Optimize bid amounts for sponsored placements
- Personalize card order per user

---

## Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | Compact card redesign | 2h | High |
| 🔴 P0 | Multi-direction animations | 1h | Medium |
| 🟡 P1 | Quick-pick pills | 2h | High |
| 🟡 P1 | Store open/closed status | 3h | High |
| 🟡 P1 | Distance on cards | 2h | Medium |
| 🟢 P2 | Dynamic delivery time | 4h | Medium |
| 🟢 P2 | Featured store section | 4h | High |
| 🟢 P2 | Sponsored placement logic | 6h | High |
| 🔵 P3 | Promotion admin panel | 8h | Medium |
| 🔵 P3 | Analytics dashboard | 8h | Medium |
| 🔵 P3 | A/B testing framework | 12h | Medium |

---

## Files to Modify

### Frontend
- `frontend/src/components/chat/ProductCard.tsx` - Card redesign
- `frontend/src/components/chat/ProductCardCompact.tsx` - NEW: Compact card
- `frontend/src/components/chat/QuickPicks.tsx` - NEW: Pill buttons
- `frontend/src/app/(public)/chat/page.tsx` - Card layout & animations
- `frontend/src/styles/animations.css` - NEW: Animation classes

### Backend
- `backend/src/flow-engine/executors/search.executor.ts` - Add store status
- `backend/src/stores/services/store-schedule.service.ts` - Open/closed logic
- `backend/src/integrations/routing.client.ts` - Distance calculation
- `backend/src/search/services/search.service.ts` - Promotion ranking
- `backend/prisma/schema.prisma` - Promotion tables

### Database
- New tables: `store_promotions`, `promotion_impressions`
- New fields: `stores.is_featured`, `stores.sponsored_until`

---

## Next Steps

1. **Today**: Implement compact card + animations
2. **Tomorrow**: Add store status + distance
3. **This Week**: Build promotion system foundation
4. **Next Week**: Admin panel + analytics
