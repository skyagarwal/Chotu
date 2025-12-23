# PHP Backend API: Correct Usage Pattern (Guest User Issue SOLVED)

## Problem Summary

Orders placed via the NestJS API were being recorded as "Guest User" orders in the admin panel. This has been **RESOLVED**.

### Root Cause
The NestJS API was incorrectly sending `guest_id` field for authenticated users. The PHP backend correctly treats any request containing `guest_id` as a guest request.

### Solution
**DO NOT send `guest_id` field for authenticated users.** The PHP API works correctly when:
- Authenticated users: Send **only** the Bearer token (no `guest_id` field at all)
- Guest users: Send **only** `guest_id` (no Bearer token)

## Verified Working API Patterns

### ✅ Authenticated User - Cart Add
```bash
curl -X POST "https://new.mangwale.com/api/v1/customer/cart/add" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -H "zoneId: 4" \
  -H "moduleId: 4" \
  -d '{
    "item_id": 12998,
    "quantity": 1,
    "addon_ids": [],
    "addon_quantities": [],
    "model": "Item",
    "price": 50
  }'

# Result: user_id=13, is_guest=false ✅
```

### ❌ WRONG - Sending guest_id with token
```bash
curl -X POST "https://new.mangwale.com/api/v1/customer/cart/add" \
  -H "Authorization: Bearer {token}" \
  -d '{"guest_id": "null", ...}'  # ← DO NOT DO THIS!

# Result: user_id=0, is_guest=true ❌
```

## Database Evidence (After Fix)
```sql
-- Cart created with correct API call:
| id    | user_id | is_guest | item_id |
| 16807 |      13 |        0 |   12998 |  ← ✅ Correct!
```

## Location of Bug

**File:** `/var/www/html/app/Http/Middleware/APIGuestMiddleware.php`

## Required Request Fields for Cart/Order APIs

Based on Postman collections and database analysis, these fields are **required**:

### Cart Add
```json
{
  "item_id": 12998,      // Required: Item ID
  "quantity": 1,         // Required: Quantity  
  "addon_ids": [],       // Required: Array
  "addon_quantities": [], // Required: Array
  "model": "Item",       // Required: "Item" or "ItemCampaign"
  "price": 50            // Required: Item price
}
```

### Required Headers
```
Authorization: Bearer {token}  // For authenticated users
Content-Type: application/json
zoneId: {zone_id}             // Important!
moduleId: {module_id}         // Important!
```

## NestJS Code Status

The NestJS `php-order.service.ts` has been **correctly updated** to:
- NOT send `guest_id` for authenticated users
- Only send `guest_id` for true guest users (unauthenticated)

See lines 185-191:
```typescript
// CRITICAL: Do NOT include guest_id field for authenticated users
// PHP backend treats presence of guest_id as guest mode
// Only send guest_id for non-authenticated guest users
if (!isAuthenticated && orderData.guestId) {
  cartPayload.guest_id = orderData.guestId;  // Guest user with UUID
}
// For authenticated users: DO NOT include guest_id at all
```

## Summary

**The issue was on the NestJS side, not PHP.** The PHP API works correctly:
- If you send `guest_id` → It's a guest order
- If you send only Bearer token (no `guest_id`) → It's an authenticated order

The fix is to NOT send `guest_id` for authenticated users.

## Priority

**HIGH** - This bug prevents proper order attribution for API-placed orders, affecting:
- Order history visibility for customers
- Admin panel user tracking
- Analytics and reporting
- WhatsApp bot order integration

## Contact

For PHP backend access, contact the server administrator to apply the fix to:
- Server: `new.mangwale.com`
- File: `/var/www/html/app/Http/Middleware/APIGuestMiddleware.php`
