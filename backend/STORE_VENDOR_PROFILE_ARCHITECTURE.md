# Store/Vendor/Rider Profile Architecture

## Overview

This document describes how stores, vendors, and riders are identified and managed across the PHP/MySQL backend and PostgreSQL backend with scraper data enrichment.

**NOTE:** User profiles/preferences are handled by the **PersonalizationModule** (`user_profiles` table)
to avoid duplication. See `src/personalization/` for user preference management.

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PHP/MySQL (MASTER)                             │
│  - stores table (store_id INTEGER PRIMARY KEY)                          │
│  - vendors table (vendor_id INTEGER PRIMARY KEY)                        │
│  - users table (user_id INTEGER PRIMARY KEY)                            │
│  - delivery_men table (deliveryman_id INTEGER PRIMARY KEY)              │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           │ Sync via NestJS Services
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL (ENHANCED)                             │
│  - stores table (UUID PK, php_store_id FK)                              │
│  - vendor_profiles table (UUID PK, php_vendor_id FK)                    │
│  - users table (UUID PK, php_user_id FK)                                │
│  - rider_profiles table (UUID PK, php_rider_id FK)                      │
│  + competitor_data JSONB, external_ratings JSONB                        │
│  + learned_preferences JSONB, ai_insights JSONB                         │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           │ Enrichment via Scraper
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Scraper Service                                  │
│  - Zomato scraper (ratings, FSSAI, GST, reviews, pricing)               │
│  - Swiggy scraper (ratings, FSSAI, GST, reviews, pricing)               │
│  - FSSAI/GST numbers for 100% confidence store matching                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## Entity Identification

### Stores

| System | Identifier | Format |
|--------|-----------|--------|
| PHP/MySQL | `store_id` | INTEGER AUTO_INCREMENT |
| PostgreSQL | `id` | UUID |
| PostgreSQL | `php_store_id` | INTEGER (FK to PHP) |
| FSSAI | `fssai_number` | 14-digit numeric |
| GST | `gst_number` | 15-character alphanumeric |

**Key Matching Logic:**
- FSSAI number match = 100% confidence (unique per food business)
- GST number match = 100% confidence (unique per business)
- Name + Location match = fuzzy matching (requires verification)

### Vendors

| System | Identifier | Format |
|--------|-----------|--------|
| PHP/MySQL | `vendor_id` | INTEGER AUTO_INCREMENT |
| PostgreSQL | `id` | UUID |
| PostgreSQL | `php_vendor_id` | INTEGER (FK to PHP) |
| Store Link | `store_id` | UUID (FK to stores) |
| Store Link | `php_store_id` | INTEGER (for quick lookups) |

**Vendor Types:**
- `owner` - Full access to store management
- `employee` - Limited access, works under an owner

### Users (Customers)

| System | Identifier | Format |
|--------|-----------|--------|
| PHP/MySQL | `user_id` | INTEGER AUTO_INCREMENT |
| PostgreSQL | `id` | UUID |
| PostgreSQL | `php_user_id` | INTEGER (FK to PHP) |
| Phone | `phone` | VARCHAR (normalized +91XXXXXXXXXX) |

**Enhanced Data:**
- `learned_preferences` - Cuisine preferences, dietary restrictions, favorites
- `ai_insights` - Customer segment, churn risk, engagement score
- `order_history` - Summary stats from PHP orders

### Riders (Delivery Partners)

| System | Identifier | Format |
|--------|-----------|--------|
| PHP/MySQL | `deliveryman_id` | INTEGER AUTO_INCREMENT |
| PostgreSQL | `id` | UUID |
| PostgreSQL | `php_rider_id` | INTEGER (FK to PHP) |
| Phone | `phone` | VARCHAR |

**Enhanced Data:**
- `external_platforms` - JSONB with Zomato/Swiggy profiles if they work multi-platform
- Performance metrics - delivery time, ratings, completion rate

## PostgreSQL Tables

### stores

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  php_store_id INTEGER UNIQUE NOT NULL,       -- FK to PHP MySQL
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  module_id INTEGER DEFAULT 1,
  module_type VARCHAR(50) DEFAULT 'food',
  zone_id INTEGER,
  fssai_number VARCHAR(20),                   -- 14-digit FSSAI License
  gst_number VARCHAR(20),                     -- 15-char GST Number
  is_active BOOLEAN DEFAULT true,
  avg_rating DECIMAL(3, 2),
  total_reviews INTEGER DEFAULT 0,
  competitor_data JSONB DEFAULT '{}',         -- Zomato/Swiggy data
  external_ratings JSONB DEFAULT '{}',        -- {zomato: 4.2, swiggy: 4.1}
  php_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_stores_php_id ON stores(php_store_id);
CREATE INDEX idx_stores_fssai ON stores(fssai_number) WHERE fssai_number IS NOT NULL;
CREATE INDEX idx_stores_gst ON stores(gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX idx_stores_location ON stores USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
```

### vendor_profiles

```sql
CREATE TABLE vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  php_vendor_id INTEGER UNIQUE NOT NULL,
  store_id UUID REFERENCES stores(id),
  php_store_id INTEGER,
  name VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  vendor_type VARCHAR(20) DEFAULT 'owner',
  role VARCHAR(50) DEFAULT 'owner',
  is_active BOOLEAN DEFAULT true,
  is_primary_owner BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}',
  -- Performance metrics
  total_orders INTEGER DEFAULT 0,
  avg_order_value DECIMAL(10, 2) DEFAULT 0,
  avg_preparation_time INTEGER,               -- minutes
  positive_ratings INTEGER DEFAULT 0,
  negative_ratings INTEGER DEFAULT 0,
  cancellation_rate DECIMAL(5, 2) DEFAULT 0,
  monthly_revenue DECIMAL(12, 2) DEFAULT 0,
  last_order_at TIMESTAMP,
  zone_wise_topic VARCHAR(255),               -- FCM topic
  profile_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### rider_profiles

```sql
CREATE TABLE rider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  php_rider_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  vehicle_type VARCHAR(20) DEFAULT 'bike',
  vehicle_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  zone_ids INTEGER[] DEFAULT '{}',
  -- Performance metrics
  total_deliveries INTEGER DEFAULT 0,
  avg_delivery_time INTEGER,                  -- minutes
  avg_rating DECIMAL(3, 2),
  positive_ratings INTEGER DEFAULT 0,
  negative_ratings INTEGER DEFAULT 0,
  completion_rate DECIMAL(5, 2) DEFAULT 100,
  monthly_earnings DECIMAL(12, 2) DEFAULT 0,
  active_hours INTEGER DEFAULT 0,
  last_delivery_at TIMESTAMP,
  external_platforms JSONB DEFAULT '[]',      -- [{platform: "zomato", rating: 4.5}]
  profile_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### users (Extended)

```sql
-- Extend existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS php_user_id INTEGER UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS learned_preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_order_value DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;
```

## NestJS Services

### StoreSyncService

```typescript
// Sync store from PHP to PostgreSQL
await storeSyncService.syncStoreFromPhp(phpStoreId);

// Get store with competitor data
const store = await storeSyncService.getEnrichedStoreProfile(phpStoreId);

// Match store by FSSAI/GST (100% confidence)
const matched = await storeSyncService.matchStoreByIdentifiers(fssaiNumber, gstNumber);

// Update competitor data from scraper
await storeSyncService.updateCompetitorData(phpStoreId, {
  source: 'zomato',
  rating: 4.2,
  reviewCount: 150,
  offers: ['50% off up to ₹100'],
  fssaiNumber: '12345678901234',
});
```

### VendorProfileService

```typescript
// Sync vendor on login
await vendorProfileService.onVendorLogin(vendorUser);

// Get vendor profile
const vendor = await vendorProfileService.getVendorByPhpId(phpVendorId);

// Update performance metrics
await vendorProfileService.updatePerformanceMetrics(phpVendorId, {
  totalOrders: 150,
  avgOrderValue: 320,
  avgPreparationTime: 25,
});
```

### RiderProfileService

```typescript
// Sync rider from PHP
await riderProfileService.syncRiderFromPhp(phpRiderId);

// Update external platform info
await riderProfileService.updateExternalPlatform(phpRiderId, {
  platform: 'zomato',
  rating: 4.8,
  deliveryCount: 500,
  isActive: true,
});

// Get top performers
const topRiders = await riderProfileService.getTopPerformers('rating', 10);
```

### UserProfileService

```typescript
// Sync user on login
await userProfileService.onUserLogin(phpUserId, phone);

// Update learned preferences from order
await userProfileService.updateLearnedPreferences(phpUserId, {
  cuisinePreferences: [{ cuisine: 'North Indian', score: 85 }],
  spiceLevel: 'medium',
});

// Update AI insights
await userProfileService.updateAIInsights(phpUserId, {
  customerSegment: 'frequent_orderer',
  churnRisk: 'low',
  engagementScore: 85,
});
```

## API Endpoints

### Stores

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/profiles/stores/sync/:phpStoreId` | Sync store from PHP |
| GET | `/api/profiles/stores/:phpStoreId` | Get enriched store profile |
| GET | `/api/profiles/stores/:phpStoreId/prices` | Get price comparison |
| POST | `/api/profiles/stores/:phpStoreId/scrape` | Queue for scraping |
| GET | `/api/profiles/stores/match?fssai=&gst=` | Match by identifiers |
| POST | `/api/profiles/stores/batch-sync` | Batch sync stores |

### Vendors

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/profiles/vendors/sync/:phpVendorId` | Sync vendor |
| GET | `/api/profiles/vendors/:phpVendorId` | Get vendor profile |
| GET | `/api/profiles/vendors/by-phone/:phone` | Get by phone |
| GET | `/api/profiles/stores/:phpStoreId/vendors` | Get store vendors |
| PUT | `/api/profiles/vendors/:phpVendorId/metrics` | Update metrics |

### Riders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/profiles/riders/sync/:phpRiderId` | Sync rider |
| GET | `/api/profiles/riders/:phpRiderId` | Get rider profile |
| GET | `/api/profiles/riders/zone/:zoneId` | Get riders in zone |
| GET | `/api/profiles/riders/top-performers` | Get top performers |
| PUT | `/api/profiles/riders/:phpRiderId/external-platform` | Update external platform |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/profiles/users/sync/:phpUserId` | Sync user |
| GET | `/api/profiles/users/:phpUserId` | Get user profile |
| PUT | `/api/profiles/users/:phpUserId/preferences` | Update preferences |
| GET | `/api/profiles/users/:phpUserId/top-preferences` | Get top preferences |
| GET | `/api/profiles/users/:phpUserId/churn-risk` | Analyze churn risk |

## Scraper Integration

The scraper service enriches store data with:

1. **Ratings & Reviews** from Zomato/Swiggy
2. **FSSAI & GST Numbers** for exact store matching
3. **Competitor Pricing** for menu items
4. **Offers & Discounts** currently active on platforms

**Matching Flow:**
```
Scraper extracts FSSAI/GST → PostgreSQL lookup by FSSAI/GST → 
100% match → Update competitor_data JSONB → 
Store price comparison available
```

## Migration

Run the migration to create tables:

```bash
psql -U mangwale_config -d headless_mangwale -f backend/prisma/migrations/20241221_enhanced_profiles/migration.sql
```

## Files Created

| File | Description |
|------|-------------|
| `src/profiles/profiles.module.ts` | Module definition |
| `src/profiles/services/store-sync.service.ts` | Store sync & competitor data |
| `src/profiles/services/vendor-profile.service.ts` | Vendor profile management |
| `src/profiles/services/rider-profile.service.ts` | Rider profile management |
| `src/profiles/services/user-profile.service.ts` | User profile & preferences |
| `src/profiles/controllers/profiles.controller.ts` | REST API endpoints |
| `prisma/migrations/20241221_enhanced_profiles/migration.sql` | Database schema |
