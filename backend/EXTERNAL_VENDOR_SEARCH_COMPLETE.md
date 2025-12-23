# External Vendor Search - Smart Pickup Feature

## 🎯 Feature Overview

When a user searches for a restaurant/vendor not in our database, the system now:

1. **Searches internally** (OpenSearch) first
2. If not found → **Searches Google Places** via PHP Backend API
3. Shows results with **Google Maps links**
4. Allows user to **select for pickup** via parcel service

### Example Scenario
User: "मुझे Nashik का Tushar Missal खाना है" (I want to eat Tushar Missal from Nashik)

System Response:
```
I found these locations for "tushar missal":

1. **Hotel Tushar Misal**
   📍 College Road, Patil Colony, Canada Corner, Nashik, Maharashtra, India

Reply with a number (1-1) to select, or tell me the exact address.
```

---

## 🏗️ Architecture

### New Files Created

1. **ExternalVendorService** (`/src/search/services/external-vendor.service.ts`)
   - Searches Google Places via PHP Backend's `place-api-autocomplete`
   - Caches results for 30 minutes
   - Generates Google Maps links
   - Formats results for chat display

2. **ExternalSearchExecutor** (`/src/flow-engine/executors/external-search.executor.ts`)
   - Flow executor for `external_search` action type
   - Resolves template variables like `{{_failure_analysis.restaurant_name}}`
   - Returns UI cards with selection actions
   - Events: `found`, `not_found`, `error`

### Modified Files

1. **SearchModule** (`/src/search/search.module.ts`)
   - Added `ExternalVendorService` to providers/exports

2. **SearchController** (`/src/search/controllers/search.controller.ts`)
   - Added `GET /api/search/external` endpoint for testing

3. **FlowEngineModule** (`/src/flow-engine/flow-engine.module.ts`)
   - Registered `ExternalSearchExecutor`

4. **Food Order Flow** (`/src/flow-engine/flows/food-order.flow.ts`)
   - Added new states for external vendor search flow:
     - `search_external_vendor`
     - `show_external_results`
     - `handle_external_selection`
     - `check_external_selection`
     - `confirm_external_pickup`
     - `collect_external_order_items`

---

## 🔄 Flow Updates

### New States in `food_order_v1`

```
analyze_no_results → check_custom_offer → search_external_vendor
                                              ↓
                                        [found] → show_external_results
                                              ↓
                                        [user selects] → confirm_external_pickup
                                              ↓
                                        [collect items] → collect_address (existing)
```

### State Transitions

| State | On Event | Next State |
|-------|----------|------------|
| `check_custom_offer` | `search_external` | `search_external_vendor` |
| `search_external_vendor` | `found` | `show_external_results` |
| `search_external_vendor` | `not_found` / `error` | `offer_custom_pickup` |
| `show_external_results` | `user_message` | `handle_external_selection` |
| `show_external_results` | `select_external` | `confirm_external_pickup` |
| `confirm_external_pickup` | `user_message` | `collect_external_order_items` |
| `collect_external_order_items` | `success` | `collect_address` |

---

## 🧪 Testing

### API Endpoint Test

```bash
# Search for external vendor
curl "http://localhost:3200/api/search/external?q=tushar%20missal&city=Nashik"

# Response
{
  "success": true,
  "results": [{
    "place_id": "ChIJkc_VeJrr3TsR5m1s9J-HCEA",
    "name": "Hotel Tushar Misal",
    "address": "College Road, Patil Colony, Canada Corner, Nashik",
    "maps_link": "https://www.google.com/maps/search/?api=1&query=..."
  }],
  "chatMessage": "I found these locations for \"tushar missal\"..."
}
```

### Chat Flow Test

1. User: "I want tushar missal from nashik"
2. System searches OpenSearch → No results
3. System searches Google Places → Found "Hotel Tushar Misal"
4. System shows results with selection options
5. User selects restaurant
6. System asks for specific items
7. User provides items
8. System continues to address collection
9. Parcel pickup order is created

---

## 📝 Context Variables

When external vendor is selected, these context variables are set:

```typescript
{
  is_custom_order: true,
  is_external_vendor: true,
  external_vendor_name: "Hotel Tushar Misal",
  external_vendor_address: "College Road, Patil Colony, Canada Corner, Nashik",
  maps_link: "https://www.google.com/maps/search/...",
  custom_pickup_location: {
    name: "Hotel Tushar Misal",
    address: "College Road, Patil Colony, Canada Corner, Nashik",
    lat: 19.9975,
    lng: 73.7898
  },
  custom_item_details: "2 plates of missal pav"
}
```

---

## 🔧 Configuration

### Environment Variables

```env
# PHP Backend (provides Google Places API)
PHP_BACKEND_URL=https://new.mangwale.com

# Optional: Direct Google API (not currently used)
GOOGLE_MAPS_API_KEY=your_key_here
```

### PHP Backend Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/config/place-api-autocomplete` | Search places by text |
| `/api/v1/config/geocode-api` | Get coordinates (reverse geocode) |

---

## 🚀 Future Improvements

1. **Distance Calculation**: When user location is known, calculate actual distance
2. **Rating Display**: Show Google ratings when available
3. **Operating Hours**: Check if place is currently open
4. **Price Estimation**: Estimate delivery cost based on distance
5. **Place Details**: Add Google API key for full place details

---

## ✅ Status

- [x] ExternalVendorService created
- [x] ExternalSearchExecutor created  
- [x] Flow engine updated
- [x] Food order flow updated with external search states
- [x] API endpoint tested
- [x] Backend restarted and working

**Date**: December 20, 2025
