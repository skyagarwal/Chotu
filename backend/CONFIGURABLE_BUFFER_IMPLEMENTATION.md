# Configurable Delivery Time Buffer System

**Date**: October 29, 2025  
**Status**: ✅ **IMPLEMENTED**

---

## 🎯 Overview

Delivery time calculation system that uses store's `delivery_time` field (vendor preparation time) with a configurable buffer percentage.

---

## 📐 Formula

```typescript
Total Delivery Time = Travel Time + (Avg Store Prep Time × (1 + Buffer %))

Components:
1. Travel Time: OSRM actual road distance (e.g., 3 minutes)
2. Store Prep Time: From MySQL stores.delivery_time (e.g., "20-30 min" → avg 25 min)
3. Buffer: Configurable percentage (default 10%)

Example:
Store prep time: "20-30 min" → average 25 minutes
Buffer: 10%
Prep time with buffer: 25 × 1.10 = 27.5 ≈ 28 minutes
Travel time: 3 minutes (OSRM)
Total: 31 minutes → Display as "30-35 mins"
```

---

## 🔧 Implementation

### 1. OSRMService Updates ✅

**File**: `/src/routing/services/osrm.service.ts`

**New Properties**:
```typescript
private deliveryTimeBufferPercent = 10; // Default 10% buffer
```

**New Methods**:
```typescript
// Get current buffer percentage
getDeliveryTimeBuffer(): number

// Set buffer percentage (0-100)
setDeliveryTimeBuffer(percent: number): void

// Parse store's delivery_time field ("20-30 min" → [20, 30])
private parseStoreDeliveryTime(deliveryTime?: string): [number, number]
```

**Updated Logic in `enrichWithDistance()`**:
```typescript
// Parse store's delivery_time: "20-30 min" → [20, 30]
const [prepMin, prepMax] = this.parseStoreDeliveryTime(item.delivery_time);

// Calculate average prep time
const avgPrepTime = (prepMin + prepMax) / 2; // e.g., 25 minutes

// Apply buffer
const bufferMultiplier = 1 + (this.deliveryTimeBufferPercent / 100);
const prepTimeWithBuffer = Math.round(avgPrepTime * bufferMultiplier);

// Add travel time
const totalTime = travelTime + prepTimeWithBuffer;
```

---

### 2. Configuration API ✅

**File**: `/src/routing/controllers/routing-config.controller.ts`

**Endpoints**:

#### GET `/routing/config/buffer` - Get Current Buffer
```bash
curl http://localhost:3200/routing/config/buffer
```

**Response**:
```json
{
  "success": true,
  "data": {
    "bufferPercent": 10,
    "description": "10% buffer added to store preparation times",
    "example": {
      "storeTime": "20-30 min",
      "withBuffer": "28 min average",
      "formula": "total_time = travel_time + avg(store_prep_time) * (1 + buffer/100)"
    }
  }
}
```

---

#### PUT `/routing/config/buffer` - Update Buffer
```bash
curl -X PUT http://localhost:3200/routing/config/buffer \
  -H "Content-Type: application/json" \
  -d '{"bufferPercent": 15}'
```

**Request**:
```json
{
  "bufferPercent": 15
}
```

**Response**:
```json
{
  "success": true,
  "message": "Delivery time buffer updated to 15%",
  "data": {
    "previousBuffer": 10,
    "newBuffer": 15,
    "example": {
      "storeTime": "20-30 min",
      "avgPrepTime": 25,
      "withBuffer": "29 min",
      "travelTime": "3 min (OSRM)",
      "totalEstimate": "32 min"
    }
  }
}
```

---

#### GET `/routing/config/status` - System Status
```bash
curl http://localhost:3200/routing/config/status
```

**Response**:
```json
{
  "success": true,
  "data": {
    "osrm": {
      "status": "active",
      "url": "http://localhost:5000",
      "dataset": "India OSM data"
    },
    "deliveryTimeBuffer": {
      "current": 10,
      "unit": "percent",
      "description": "Buffer added on top of store preparation time"
    },
    "calculation": {
      "formula": "total_delivery_time = travel_time + avg(store_prep_time) * (1 + buffer/100)",
      "components": {
        "travel_time": "OSRM actual road distance calculation",
        "store_prep_time": "From MySQL stores.delivery_time field",
        "buffer": "Configurable safety margin (default 10%)"
      }
    }
  }
}
```

---

## 🎨 Frontend Integration

### Admin Panel Configuration

**Component**: Delivery Time Settings Page

```tsx
// React/Vue example
import { useState, useEffect } from 'react';

function DeliveryTimeConfig() {
  const [buffer, setBuffer] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current buffer on mount
    fetch('http://localhost:3200/routing/config/buffer')
      .then(res => res.json())
      .then(data => setBuffer(data.data.bufferPercent));
  }, []);

  const updateBuffer = async () => {
    setLoading(true);
    await fetch('http://localhost:3200/routing/config/buffer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bufferPercent: buffer })
    });
    setLoading(false);
    alert(`Buffer updated to ${buffer}%`);
  };

  return (
    <div className="delivery-time-config">
      <h2>Delivery Time Buffer Configuration</h2>
      
      <div className="form-group">
        <label>Buffer Percentage: {buffer}%</label>
        <input 
          type="range" 
          min="0" 
          max="50" 
          value={buffer}
          onChange={(e) => setBuffer(Number(e.target.value))}
        />
        <small>Add {buffer}% buffer to vendor preparation times</small>
      </div>

      <div className="example">
        <h3>Example Calculation:</h3>
        <p>Store prep time: "20-30 min" → avg 25 minutes</p>
        <p>With {buffer}% buffer: {Math.round(25 * (1 + buffer/100))} minutes</p>
        <p>+ Travel time: 3 minutes (OSRM)</p>
        <p><strong>Total: {Math.round(3 + 25 * (1 + buffer/100))} minutes</strong></p>
      </div>

      <button onClick={updateBuffer} disabled={loading}>
        {loading ? 'Updating...' : 'Save Configuration'}
      </button>
    </div>
  );
}
```

---

## 📊 Real Examples

### Example 1: Inayat Cafe (Store ID 3)

**Database**:
```sql
SELECT id, name, delivery_time, latitude, longitude 
FROM stores WHERE id = 3;

Result:
id: 3
name: "Inayat Cafe-Since 1958"
delivery_time: "20-30 min"
location: 19.98, 73.78
```

**Calculation** (User at 19.96, 73.76):
```
1. Parse delivery_time: "20-30 min" → [20, 30]
2. Average prep time: (20 + 30) / 2 = 25 minutes
3. Apply 10% buffer: 25 × 1.10 = 27.5 ≈ 28 minutes
4. Calculate travel (OSRM): ~2 minutes
5. Total: 2 + 28 = 30 minutes
6. Format: "30-35 mins"
```

---

### Example 2: Sadhana Misal (Store ID 9)

**Database**:
```sql
id: 9
name: "Sadhana Chulivarchi Misal"
delivery_time: "40-50 min"
location: 20.02, 73.72
```

**Calculation** (User at 19.96, 73.76):
```
1. Parse: "40-50 min" → [40, 50]
2. Average: 45 minutes
3. With 10% buffer: 45 × 1.10 = 49.5 ≈ 50 minutes
4. Travel time: ~8 minutes (farther distance)
5. Total: 8 + 50 = 58 minutes
6. Format: "55-60 mins"
```

---

## 🔄 Buffer Adjustment Scenarios

### Scenario 1: Peak Hours (Increase Buffer)
```
Lunch rush: 12 PM - 2 PM
Dinner rush: 7 PM - 9 PM

Recommendation: Increase buffer to 15-20%
API Call:
PUT /routing/config/buffer
{ "bufferPercent": 20 }

Effect:
- Store time: "20-30 min" (avg 25)
- With 20% buffer: 30 minutes
- More realistic during peak hours
```

---

### Scenario 2: Late Night (Decrease Buffer)
```
Off-peak: 2 AM - 5 AM
Fewer orders, faster prep

Recommendation: Decrease buffer to 5%
API Call:
PUT /routing/config/buffer
{ "bufferPercent": 5 }

Effect:
- Store time: "20-30 min" (avg 25)
- With 5% buffer: 26 minutes
- Tighter estimates when less busy
```

---

### Scenario 3: Festival/Holiday (Increase Buffer)
```
Diwali, Holi, etc.
Higher demand, longer prep

Recommendation: Increase buffer to 25-30%
```

---

## 🎯 Buffer Percentage Guidelines

| Buffer % | Use Case | Example |
|----------|----------|---------|
| 0% | Testing only | No safety margin |
| 5% | Off-peak, experienced stores | Minimal buffer |
| 10% | **Default - Normal operations** | Balanced |
| 15% | Moderately busy periods | Lunch hours |
| 20% | Peak hours | Rush times |
| 25-30% | Festivals, holidays | High demand |
| 40-50% | Emergency situations | Store understaffed |

---

## 🧪 Testing

### Test 1: Check Current Buffer
```bash
curl http://localhost:3200/routing/config/buffer
```

### Test 2: Update Buffer to 15%
```bash
curl -X PUT http://localhost:3200/routing/config/buffer \
  -H "Content-Type: application/json" \
  -d '{"bufferPercent": 15}'
```

### Test 3: Search with Updated Buffer
```bash
curl -X POST http://localhost:3200/agents/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "show me food near me",
    "module": "food",
    "session": {
      "location": {"lat": 19.96, "lon": 73.76}
    }
  }'
```

**Expected**: Items should show delivery times calculated with 15% buffer

---

## 📝 Environment Variables

Add to `.env` (optional):
```env
# Default delivery time buffer percentage (0-100)
DELIVERY_TIME_BUFFER_PERCENT=10
```

If not set, defaults to 10%.

---

## 🔐 Security Considerations

### API Access Control
```typescript
// Add authentication to RoutingConfigController
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super-admin')
@Put('buffer')
updateDeliveryTimeBuffer(@Body() body: { bufferPercent: number }) {
  // ... implementation
}
```

### Validation
- Buffer must be between 0-100%
- Non-numeric values rejected
- Logged for audit trail

---

## 📊 Monitoring

### Logs to Watch
```typescript
// On buffer update:
✅ Delivery time buffer updated to 15%

// On calculation:
Parsed delivery_time "20-30 min" → [20, 30] mins
```

### Metrics to Track
- Average actual delivery time vs estimated
- Buffer effectiveness (over/under estimates)
- Customer satisfaction with timing accuracy

---

## 🚀 Next Steps

1. ✅ **Current**: Buffer configurable via API
2. ⏳ **Phase 2**: Auto-adjust buffer based on time of day
3. ⏳ **Phase 3**: Machine learning for optimal buffer per store
4. ⏳ **Phase 4**: Real-time traffic integration

---

## 📚 Related Files

- `/src/routing/services/osrm.service.ts` - Core calculation logic
- `/src/routing/controllers/routing-config.controller.ts` - Configuration API
- `/src/routing/routing.module.ts` - Module setup
- `DATABASE_ANALYSIS_DELIVERY_TIME.md` - Database structure
- `DELIVERY_TIME_SYSTEM_STATUS.md` - Overall system status

---

**Implementation**: ✅ Complete  
**API**: ✅ Ready for frontend integration  
**Testing**: ⏳ Ready to test with real data
