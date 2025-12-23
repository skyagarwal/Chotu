# Database Analysis - Delivery Time System

**Date**: October 29, 2025  
**Database**: `mangwale_db`  
**Analysis**: Existing fields for delivery time calculation

---

## 🎯 Key Discovery: All Data Already Exists! ✅

**NO DATABASE CHANGES NEEDED** - Everything is already in MySQL!

---

## 📊 Database Structure Analysis

### 1. **STORES Table** - ✅ Complete

```sql
-- Key fields for delivery calculation:
id              bigint
name            varchar(255)
latitude        varchar(255)     -- Store location ✅
longitude       varchar(255)     -- Store location ✅
zone_id         bigint           -- Zone 4 = Nashik New ✅
delivery_time   varchar(100)     -- Store's delivery estimate ✅
active          tinyint(1)       -- Store status ✅
```

**Sample Data** (Zone 4 - Nashik New):
```
ID   Name                        Zone  Delivery Time  Location
3    Inayat Cafe-Since 1958      4     20-30 min     19.98, 73.78
9    Sadhana Chulivarchi Misal   4     40-50 min     20.02, 73.72
13   Ganesh Sweet Mart           4     35-45 min     20.01, 73.76
```

**Key Insight**: `delivery_time` field contains **VENDOR-SET TIME RANGES** like "20-30 min", "40-50 min"!

---

### 2. **STORE_SCHEDULE Table** - ✅ Complete

```sql
-- Opening/closing hours by day:
id              bigint
store_id        bigint           -- Foreign key to stores
day             int              -- 0=Sunday, 1=Monday, ..., 6=Saturday
opening_time    time             -- Store opens ✅
closing_time    time             -- Store closes ✅
```

**Sample Data**:
```
Store  Day  Opening    Closing
3      0    10:00:00   23:00:59   (Sunday)
3      1    10:00:00   23:00:59   (Monday)
9      0    08:00:00   15:00:59   (Breakfast place)
13     0    10:30:00   21:30:59
```

**Key Insight**: Full weekly schedule with different hours per day! ✅

---

### 3. **ORDERS Table** - ✅ Historical Processing Time Data

```sql
-- Key fields for learning processing patterns:
id                  bigint
store_id            bigint           -- Which store
processing_time     varchar(10)      -- ACTUAL time taken (minutes) ✅
delivery_time       varchar(255)     -- Estimated at order time
distance            double(16,3)     -- Actual delivery distance ✅
order_status        varchar(255)     -- pending, processing, delivered, etc.
created_at          timestamp        -- Order placed time
accepted            timestamp        -- Store accepted
processing          timestamp        -- Started preparing
handover            timestamp        -- Ready for delivery
delivered           timestamp        -- Completed
```

**Sample Historical Data**:
```
Order    Status      Processing Time  Distance  
100005   delivered   30 min          6.437 km
100016   delivered   20 min          6.437 km
100017   delivered   20 min          4.802 km
100036   delivered   1 min           2.422 km  (Quick item!)
100053   delivered   10 min          6.437 km
100075   delivered   5 min           7.922 km  (Beverage?)
```

**Key Insight**: We have **REAL HISTORICAL PROCESSING TIMES** from completed orders! 🎯

---

## 💡 Smart Delivery Time Strategy

### Phase 1: Use Existing Store `delivery_time` ✅ **IMMEDIATE**

**Implementation**:
```typescript
// In OSRMService.enrichWithDistance()

// Parse store's delivery_time field: "20-30 min"
const storeDeliveryTime = item.delivery_time || "30-40"; // e.g., "20-30 min"
const [minTime, maxTime] = storeDeliveryTime
  .replace(/\s*min.*/, '')
  .split('-')
  .map(t => parseInt(t) || 30);

// Calculate actual travel time from OSRM
const travelTime = osrmDuration; // e.g., 3 minutes

// Estimate prep time from store's range
const estimatedPrepTime = (minTime + maxTime) / 2; // e.g., 25 minutes

// Total estimate
const totalMin = travelTime + minTime;
const totalMax = travelTime + maxTime;
const estimate = `${Math.ceil(totalMin/5)*5}-${Math.ceil(totalMax/5)*5} mins`;
```

**Example**:
```
Store: "Inayat Cafe" (delivery_time: "20-30 min")
User Location: 0.5 km away
OSRM Travel Time: 2 minutes

Calculation:
- Store prep range: 20-30 mins (from delivery_time field)
- Travel time: 2 mins (OSRM actual)
- Total: 22-32 mins
- Formatted: "20-35 mins" (rounded to 5-min increments)
```

---

### Phase 2: Learn from Historical Orders ✅ **SMART**

**Implementation**:
```sql
-- Get average processing time per store
SELECT 
  store_id,
  AVG(CAST(processing_time AS UNSIGNED)) as avg_prep_time,
  MIN(CAST(processing_time AS UNSIGNED)) as min_prep_time,
  MAX(CAST(processing_time AS UNSIGNED)) as max_prep_time,
  COUNT(*) as order_count
FROM orders
WHERE 
  processing_time IS NOT NULL
  AND order_status = 'delivered'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY store_id;
```

**Expected Results**:
```
Store ID  Avg Prep  Min   Max   Orders
3         22 min    15    30    150
9         18 min    10    25    80
13        28 min    20    35    120
```

**Usage**:
```typescript
// Cache store processing stats (update every 6 hours)
const storeStats = await getStoreProcessingStats(storeId);

if (storeStats.orderCount > 10) {
  // Use learned data (reliable)
  prepTime = storeStats.avgPrepTime;
  prepRange = [storeStats.minPrepTime, storeStats.maxPrepTime];
} else {
  // Fallback to store's delivery_time field
  prepTime = parseStoreDeliveryTime(store.delivery_time);
}
```

---

### Phase 3: Check Store Hours ✅ **ACCURATE**

**Implementation**:
```typescript
async function getStoreSchedule(storeId: number, date: Date) {
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
  
  const schedule = await db.query(`
    SELECT opening_time, closing_time 
    FROM store_schedule 
    WHERE store_id = ? AND day = ?
  `, [storeId, dayOfWeek]);
  
  return schedule[0];
}

function isStoreOpen(schedule: StoreSchedule, currentTime: Date): boolean {
  const current = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  const openTime = parseTime(schedule.opening_time);   // e.g., 10:00:00 → 600 mins
  const closeTime = parseTime(schedule.closing_time);  // e.g., 23:00:59 → 1380 mins
  
  // Handle overnight stores
  if (closeTime < openTime) {
    return current >= openTime || current <= closeTime;
  }
  
  return current >= openTime && current <= closeTime;
}
```

**Example**:
```
Store: Inayat Cafe
Today: Tuesday (day = 2)
Schedule: 10:00 AM - 11:00 PM

Current Time: 9:30 AM → Status: "Opens at 10:00 AM"
Current Time: 2:00 PM → Status: "Open now • Closes at 11:00 PM"
Current Time: 11:30 PM → Status: "Closed • Opens tomorrow at 10:00 AM"
```

---

## 🚀 Implementation Plan

### Step 1: Update OSRMService to Use Store `delivery_time` ⏳

**File**: `/src/routing/services/osrm.service.ts`

**Changes**:
```typescript
async enrichWithDistance<T extends { 
  store_id?: number;
  delivery_time?: string;      // ✨ ADD THIS - from stores.delivery_time
  store_latitude?: number;
  store_longitude?: number;
}>(items: T[], userLocation: Location) {
  
  // ... existing OSRM distance calculation ...
  
  return items.map(item => {
    const travelMin = distanceData.duration_min;
    
    // Parse store's delivery_time: "20-30 min" → [20, 30]
    const [prepMin, prepMax] = this.parseStoreDeliveryTime(item.delivery_time);
    
    // Calculate total delivery range
    const totalMin = travelMin + prepMin;
    const totalMax = travelMin + prepMax;
    
    return {
      ...item,
      distance_km: distanceData.distance_km,
      travel_time_min: travelMin,
      prep_time_range: `${prepMin}-${prepMax} mins`,
      total_delivery_min: totalMin,
      total_delivery_max: totalMax,
      delivery_time_estimate: this.formatDeliveryTimeRange(totalMin, totalMax)
    };
  });
}

private parseStoreDeliveryTime(deliveryTime?: string): [number, number] {
  if (!deliveryTime) return [15, 25]; // Default range
  
  // Parse "20-30 min" or "30-40" or "40 min"
  const match = deliveryTime.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return [15, 25];
  
  const min = parseInt(match[1]);
  const max = match[2] ? parseInt(match[2]) : min + 10;
  
  return [min, max];
}

private formatDeliveryTimeRange(minMinutes: number, maxMinutes: number): string {
  // Round to nearest 5
  const roundMin = Math.ceil(minMinutes / 5) * 5;
  const roundMax = Math.ceil(maxMinutes / 5) * 5;
  return `${roundMin}-${roundMax} mins`;
}
```

---

### Step 2: Add Store Schedule Check Service ⏳

**File**: `/src/stores/services/store-schedule.service.ts` (NEW)

```typescript
@Injectable()
export class StoreScheduleService {
  
  async getStoreSchedule(storeId: number, date: Date = new Date()) {
    const dayOfWeek = date.getDay();
    
    // Query MySQL store_schedule table
    const schedule = await this.db.query(`
      SELECT opening_time, closing_time 
      FROM store_schedule 
      WHERE store_id = ? AND day = ?
    `, [storeId, dayOfWeek]);
    
    return schedule[0];
  }
  
  isStoreOpen(schedule: StoreSchedule, time: Date = new Date()): {
    open: boolean;
    message: string;
    opensAt?: string;
    closesAt?: string;
  } {
    const currentMinutes = time.getHours() * 60 + time.getMinutes();
    const openMinutes = this.parseTimeToMinutes(schedule.opening_time);
    const closeMinutes = this.parseTimeToMinutes(schedule.closing_time);
    
    // Check if currently open
    const isOpen = closeMinutes < openMinutes 
      ? (currentMinutes >= openMinutes || currentMinutes <= closeMinutes)
      : (currentMinutes >= openMinutes && currentMinutes <= closeMinutes);
    
    if (isOpen) {
      return {
        open: true,
        message: "Open now",
        closesAt: this.formatTime(schedule.closing_time)
      };
    }
    
    if (currentMinutes < openMinutes) {
      return {
        open: false,
        message: `Opens at ${this.formatTime(schedule.opening_time)}`,
        opensAt: this.formatTime(schedule.opening_time)
      };
    }
    
    return {
      open: false,
      message: "Closed for today",
      opensAt: "Opens tomorrow"
    };
  }
}
```

---

### Step 3: Update Generate Embeddings to Include `delivery_time` ⏳

**File**: `/home/ubuntu/Devs/Search/generate-embeddings.py`

**Changes**:
```python
# Line ~50-70: Add delivery_time to _source fields

"_source": [
    "id", "name", "description", "category_name", "price", 
    "veg", "avg_rating", "rating_count", "store_name", 
    "store_location", "module_id", "brand", "discount",
    "image", "images", "order_count",
    "created_at", "available_time_starts", "available_time_ends",
    "delivery_time",  # ✨ ADD THIS - from stores.delivery_time
]
```

**Then regenerate**:
```bash
cd /home/ubuntu/Devs/Search
python3 generate-embeddings.py --module food
```

---

## 📊 Expected Output

### Before (Current):
```json
{
  "name": "Paneer Banjara Tikka",
  "price": 289,
  "distance_km": 0.35,
  "delivery_time_estimate": "20-25 mins"  // Generic estimate
}
```

### After (With Store Data):
```json
{
  "name": "Paneer Banjara Tikka",
  "price": 289,
  "store_name": "Inayat Cafe-Since 1958",
  "store_delivery_time": "20-30 min",     // From MySQL stores.delivery_time
  "distance_km": 0.35,
  "travel_time": "2 mins",                // OSRM actual
  "prep_time": "20-30 mins",              // Store's estimate
  "total_delivery_time": "22-32 mins",    // Travel + Prep
  "delivery_time_estimate": "20-35 mins", // Formatted
  "is_open": true,
  "store_hours": "10:00 AM - 11:00 PM",
  "closes_at": "11:00 PM"
}
```

---

## 🎯 Summary

### ✅ What We Have in Database:

1. **stores.delivery_time** - Vendor-set delivery ranges ("20-30 min") ✅
2. **store_schedule** - Opening/closing hours per day ✅
3. **orders.processing_time** - Historical actual prep times ✅
4. **stores.latitude/longitude** - Store locations ✅
5. **orders.distance** - Historical delivery distances ✅

### 🚀 What We Need to Do:

1. ✅ Parse `stores.delivery_time` field (vendor estimates)
2. ✅ Add `delivery_time` to OpenSearch index
3. ✅ Update OSRMService to use store delivery ranges
4. ✅ Create StoreScheduleService for opening hours
5. ✅ Regenerate embeddings with new field

### 🎉 No Database Changes Required!

Everything we need is **already in MySQL**. We just need to:
- Read the data properly
- Combine it intelligently (travel + prep time)
- Display it in a user-friendly format

---

**Next Action**: Update OSRMService to parse and use `stores.delivery_time` field! 🚀
