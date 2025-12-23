# PHP Laravel Backend API Integration

## Overview

The MangwaleAI NestJS backend connects to a PHP Laravel backend at `https://new.mangwale.com` for core e-commerce operations. This document provides complete documentation of all PHP API integrations.

---

## Table of Contents

1. [Configuration](#configuration)
2. [Authentication Flow](#authentication-flow)
3. [PHP Service Architecture](#php-service-architecture)
4. [Complete API Endpoints](#complete-api-endpoints)
5. [Data Sync Analysis](#data-sync-analysis)
6. [Error Handling](#error-handling)
7. [Known Issues & Recommendations](#known-issues--recommendations)

---

## Configuration

### Environment Variables

```env
# Primary PHP Backend URL
PHP_API_BASE_URL=https://new.mangwale.com
PHP_BACKEND_URL=https://new.mangwale.com

# API Configuration
PHP_API_TIMEOUT=30000
DEFAULT_PARCEL_MODULE_ID=3
```

### Configuration Module

**File**: `src/config/configuration.ts`

```typescript
php: {
  baseUrl: process.env.PHP_API_BASE_URL,
  timeout: parseInt(process.env.PHP_API_TIMEOUT, 10) || 30000,
  defaultModuleId: parseInt(process.env.DEFAULT_PARCEL_MODULE_ID, 10) || 3,
}
```

---

## Authentication Flow

### How NestJS Authenticates with PHP

The system uses **JWT Bearer tokens** for authenticated requests:

```typescript
// PhpApiService - Base authenticated request
protected async authenticatedRequest(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  token: string,  // Customer's JWT from PHP
  data?: any,
  customHeaders?: Record<string, string>,
): Promise<any> {
  return this.httpClient.request({
    method,
    url,
    data,
    headers: {
      Authorization: `Bearer ${token}`,
      ...customHeaders,
    },
  });
}
```

### Customer Authentication Flow

1. **Send OTP** → `POST /api/v1/auth/login`
2. **Verify OTP** → `POST /api/v1/auth/verify-phone`
3. **Update Info (new users)** → `POST /api/v1/auth/update-info`
4. **Get Profile** → `GET /api/v1/customer/info`

### Token Management

- PHP issues JWT tokens upon successful OTP verification
- Tokens are stored in Redis session for each WhatsApp user
- NestJS passes tokens in `Authorization: Bearer {token}` header
- Token expiry is handled by PHP backend

### Zone/Module Headers

Many endpoints require special headers:

```typescript
headers: {
  'moduleId': '3',                    // Module ID (e.g., 3 = Parcel)
  'zoneId': JSON.stringify([4]),      // Zone IDs as JSON array
}
```

---

## PHP Service Architecture

### Main Integration Module

**File**: `src/php-integration/php-integration.module.ts`

```
PhpIntegrationModule
├── PhpHttpClientService     (Base HTTP Client)
├── PhpApiService            (Base API Service with auth)
├── PhpAuthService           (Authentication)
├── PhpAddressService        (Address Management)
├── PhpOrderService          (Order Management)
├── PhpPaymentService        (Payment Processing)
├── PhpWalletService         (Wallet Operations)
├── PhpLoyaltyService        (Loyalty Points)
├── PhpCouponService         (Coupon Management)
├── PhpReviewService         (Reviews & Ratings)
├── PhpStoreService          (Store/Restaurant)
├── PhpParcelService         (Parcel Delivery)
```

### API Gateway Module (Additional Services)

**File**: `api-gateway/src/php-backend/php-backend.module.ts`

```
PhpBackendModule
├── PhpApiService
├── PhpAuthService
├── PhpOrderService
├── PhpAddressService
├── PhpPaymentService
├── PhpConfigService         (Zones, Modules, Config)
├── PhpStoreService
├── PhpItemService           (Menu Items)
├── PhpCategoryService
├── PhpCartService           (Shopping Cart)
├── PhpCouponService
├── PhpWalletService
├── PhpWishlistService
├── PhpLoyaltyService
├── PhpNotificationService   (Push Notifications)
├── PhpBannerService
├── PhpCustomerService       (Customer Profile)
```

---

## Complete API Endpoints

### 1. Authentication APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/auth/login` | POST | No | `{ phone, login_type: 'otp' }` | `{ token?, is_phone_verified, is_personal_info }` | `PhpAuthService.sendOtp()` |
| `/api/v1/auth/verify-phone` | POST | No | `{ phone, otp, verification_type: 'phone', login_type: 'otp' }` | `{ token, is_personal_info, is_phone_verified }` | `PhpAuthService.verifyOtp()` |
| `/api/v1/auth/update-info` | POST | No | `{ phone, name, email, login_type: 'otp' }` | `{ token }` | `PhpAuthService.updateUserInfo()` |

---

### 2. Customer APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/customer/info` | GET | Yes | - | `{ id, phone, email, f_name, l_name, wallet_balance, loyalty_point }` | `PhpAuthService.getUserProfile()` |
| `/api/v1/customer/update-profile` | POST | Yes | `{ f_name, l_name, email, phone, image }` | Success | `PhpCustomerService.updateProfile()` |
| `/api/v1/customer/update-interest` | POST | Yes | `{ interest: number[] }` | Success | `PhpCustomerService.updateInterest()` |
| `/api/v1/customer/update-zone` | GET | Yes | `{ latitude, longitude }` | Zone info | `PhpCustomerService.updateZone()` |
| `/api/v1/customer/get-data` | POST | Yes | - | Customer data | `PhpCustomerService.getCustomerData()` |
| `/api/v1/customer/suggested-items` | GET | Yes | `{ limit, offset }` | Items array | `PhpCustomerService.getSuggestedItems()` |
| `/api/v1/customer/review-reminder` | GET | Yes | - | Reminder data | `PhpCustomerService.getReviewReminder()` |
| `/api/v1/customer/review-reminder-cancel` | GET | Yes | `{ order_id }` | Success | `PhpCustomerService.cancelReviewReminder()` |
| `/api/v1/customer/remove-account` | DELETE | Yes | - | Success | `PhpCustomerService.removeAccount()` |

---

### 3. Address APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/customer/address/list` | GET | Yes | - | `{ addresses: [...], total_size }` | `PhpAddressService.getAddresses()` |
| `/api/v1/customer/address/add` | POST | Yes | `{ contact_person_name, contact_person_number, address_type, address, latitude, longitude, landmark?, floor?, road?, house? }` | `{ id, zone_ids }` | `PhpAddressService.addAddress()` |
| `/api/v1/customer/address/update/{id}` | PUT | Yes | Same as add | Success | `PhpAddressService.updateAddress()` |
| `/api/v1/customer/address/delete` | DELETE | Yes | `{ id }` or `{ address_id }` | Success | `PhpAddressService.deleteAddress()` |

---

### 4. Order APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/customer/order/place` | POST | Yes | See Order Payload below | `{ order_id, message }` | `PhpOrderService.createOrder()` |
| `/api/v1/customer/order/list` | GET | Yes | `{ limit }` | Orders array | `PhpOrderService.getOrders()` |
| `/api/v1/customer/order/running-orders` | GET | Yes | - | Active orders | `PhpOrderService.getRunningOrders()` |
| `/api/v1/customer/order/details` | GET | Yes | `{ order_id }` | Order object | `PhpOrderService.getOrderDetails()` |
| `/api/v1/customer/order/track` | GET | No | `{ order_id }` | `{ order_status, delivery_man_location }` | `PhpOrderService.trackOrder()` |
| `/api/v1/customer/order/cancel` | PUT | Yes | `{ order_id, reason }` | Success | `PhpOrderService.cancelOrder()` |
| `/api/v1/customer/order/payment-method` | PUT | Yes | `{ order_id, payment_method }` | Success | `PhpOrderService.updatePaymentMethod()` |
| `/api/v1/customer/order/verify-payment` | POST | Yes | `{ order_id, payment_id, signature }` | `{ verified }` | `PhpPaymentService.verifyRazorpayPayment()` |
| `/api/v1/customer/order/offline-payment` | PUT | Yes | `{ order_id, payment_method, transaction_id, note }` | Success | `PhpPaymentService.updateOfflinePayment()` |
| `/api/v1/customer/order/get-Tax` | POST | No | `{ items, delivery_charge, distance }` | `{ tax, total }` | `PhpPaymentService.calculateTax()` |

#### Order Placement Payload (Parcel)

```typescript
{
  order_type: 'parcel',
  payment_method: 'cash_on_delivery' | 'digital_payment',
  
  // Sender/Pickup - FLAT FIELDS
  address: string,           // Pickup address
  latitude: string,          // Must be string!
  longitude: string,         // Must be string!
  floor?: string,
  road?: string,
  house?: string,
  address_type: 'Pickup',
  
  // Receiver - JSON STRING
  receiver_details: JSON.stringify({
    contact_person_name: string,
    contact_person_number: string,
    address: string,
    latitude: string,
    longitude: string,
    landmark?: string,
    floor?: string,
    road?: string,
    house?: string,
    zone_id: number,        // Must be number!
    address_type: 'Delivery',
  }),
  
  parcel_category_id: number,
  charge_payer: 'sender',
  distance: number,
  order_amount: number,
  dm_tips?: number,
  order_note?: string,
  delivery_instruction?: string,
}
```

---

### 5. Cart APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/customer/cart/list` | GET | Yes | - | Cart items | `PhpCartService.getCart()` |
| `/api/v1/customer/cart/add` | POST | Yes | `{ item_id, quantity, variation?, addons?, instruction? }` | Success | `PhpCartService.addToCart()` |
| `/api/v1/customer/cart/update` | POST | Yes | `{ cart_id, quantity, variation?, addons? }` | Success | `PhpCartService.updateCart()` |
| `/api/v1/customer/cart/remove-item` | DELETE | Yes | `?cart_id={id}` | Success | `PhpCartService.removeCartItem()` |
| `/api/v1/customer/cart/remove` | DELETE | Yes | - | Success | `PhpCartService.clearCart()` |

---

### 6. Wallet APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/customer/wallet/list` | GET | Yes | `{ limit }` | `{ balance }` | `PhpAuthService.getWalletBalance()` |
| `/api/v1/customer/wallet/transactions` | GET | Yes | `{ limit, offset, type? }` | `{ data: [...], total_size }` | `PhpWalletService.getWalletTransactions()` |
| `/api/v1/customer/wallet/add-fund` | POST | Yes | `{ amount, payment_method, payment_platform }` | `{ redirect_link, wallet_payment_id }` | `PhpWalletService.initiateWalletRecharge()` |
| `/api/v1/customer/wallet/bonuses` | GET | Yes | - | Bonus offers | `PhpWalletService.getWalletBonuses()` |
| `/api/v1/customer/wallet/loyalty-point-to-wallet` | POST | Yes | `{ points }` | `{ amount, balance }` | `PhpLoyaltyService.convertPointsToWallet()` |

---

### 7. Coupon APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/coupon/list` | GET | Optional | - | Coupons array | `PhpCouponService.getCoupons()` |
| `/api/v1/coupon/list/all` | GET | No | - | All coupons | `PhpCouponService.getCoupons()` |
| `/api/v1/coupon/apply` | GET | Yes | `{ code, order_amount, store_id? }` | `{ coupon_id, discount_amount, discount_type }` | `PhpCouponService.applyCoupon()` |

---

### 8. Item/Product APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/items/details/{id}` | GET | No | - | Item object | `PhpItemService.getItemDetails()` |
| `/api/v1/items/latest` | GET | No | `{ store_id?, category_id?, limit?, offset? }` | Items array | `PhpItemService.getLatestItems()` |
| `/api/v1/items/new-arrival` | GET | No | `{ store_id?, limit?, offset? }` | Items array | `PhpItemService.getNewArrivalItems()` |
| `/api/v1/items/popular` | GET | No | `{ store_id?, category_id?, limit?, offset? }` | Items array | `PhpItemService.getPopularItems()` |
| `/api/v1/items/most-reviewed` | GET | No | `{ store_id?, limit?, offset? }` | Items array | `PhpItemService.getMostReviewedItems()` |
| `/api/v1/items/discounted` | GET | No | `{ store_id?, category_id?, limit?, offset? }` | Items array | `PhpItemService.getDiscountedItems()` |
| `/api/v1/items/set-menu` | GET | No | `{ store_id?, limit?, offset? }` | Items array | `PhpItemService.getSetMenuItems()` |
| `/api/v1/items/search` | GET | No | `{ name, store_id?, category_id?, limit?, offset? }` | Items array | `PhpItemService.searchItems()` |
| `/api/v1/items/search-suggestion` | GET | No | `{ name, store_id?, limit? }` | Suggestions | `PhpItemService.getSearchSuggestions()` |
| `/api/v1/items/related-items/{id}` | GET | No | - | Related items | `PhpItemService.getRelatedItems()` |
| `/api/v1/items/related-store-items/{id}` | GET | No | - | Store items | `PhpItemService.getRelatedStoreItems()` |
| `/api/v1/items/reviews/{id}` | GET | No | `{ limit?, offset? }` | Reviews | `PhpReviewService.getItemReviews()` |
| `/api/v1/items/rating/{id}` | GET | No | - | Rating summary | `PhpReviewService.getItemRating()` |
| `/api/v1/items/reviews/submit` | POST | Yes | `{ item_id, order_id, rating, comment }` | Success | `PhpReviewService.submitItemReview()` |
| `/api/v1/items/recommended` | GET | No | `{ store_id?, limit?, offset? }` | Items | `PhpItemService.getRecommendedItems()` |
| `/api/v1/items/basic` | GET | No | `{ limit?, offset? }` | Items | `PhpItemService.getBasicItems()` |
| `/api/v1/items/suggested` | GET | No | `{ store_id?, limit? }` | Items | `PhpItemService.getSuggestedItems()` |
| `/api/v1/items/item-or-store-search` | GET | No | `{ name, longitude?, latitude?, limit? }` | Combined results | `PhpItemService.itemOrStoreSearch()` |
| `/api/v1/items/common-conditions` | GET | No | `{ condition_id?, limit?, offset? }` | Items | `PhpItemService.getCommonConditionItems()` |
| `/api/v1/items/get-products` | GET | No | `{ store_id?, category_id?, type?, limit?, offset? }` | Products | `PhpItemService.getProducts()` |

---

### 9. Store/Restaurant APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/stores/details/{id}` | GET | No | `{ lat?, lng? }` | Store details | `PhpStoreService.getStoreDetails()` |
| `/api/v1/stores/search` | GET | No | `{ search }` | Stores array | `PhpStoreService.searchStores()` |
| `/api/v1/restaurants/{id}/menu` | GET | No | `{ lat?, lng? }` | Menu | `PhpStoreService.getStoreMenu()` |

---

### 10. Parcel/Delivery APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/parcel-category` | GET | No | Headers: `moduleId`, `zoneId` | Categories array | `PhpParcelService.getParcelCategories()` |
| `/api/v1/parcel/shipping-charge` | POST | No | `{ distance, parcel_category_id }` + Headers | `{ total_charge, delivery_charge, tax }` | `PhpParcelService.calculateShippingCharge()` |

---

### 11. Configuration/Zone APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/config/get-zone-id` | GET | No | `{ lat, lng }` | `{ zone_id, zone_data }` | `PhpParcelService.getZoneByLocation()` |
| `/api/v1/zone/list` | GET | No | - | Zones array | `PhpConfigService.getZones()` |
| `/api/v1/zone/check` | GET | No | `{ lat, lng }` | Zone info | `PhpConfigService.checkZone()` |
| `/api/v1/module` | GET | No | - | Modules array | `PhpParcelService.getAvailableModules()` |
| `/api/v1/configurations` | GET | No | - | App config | `PhpConfigService.getConfiguration()` |
| `/api/v1/get-vehicles` | GET | No | - | Vehicles | `PhpConfigService.getVehicles()` |
| `/api/v1/vehicle/extra_charge` | GET | No | `{ zone_id?, vehicle_id? }` | Charges | `PhpConfigService.getVehicleExtraCharge()` |
| `/api/v1/get-parcel-cancellation-reasons` | GET | No | - | Reasons | `PhpConfigService.getParcelCancellationReasons()` |
| `/api/v1/config/get-PaymentMethods` | GET | No | Headers: `moduleId`, `zoneId` | Payment methods | `PhpPaymentService.getPaymentMethods()` |

---

### 12. Location/Maps APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/config/place-api-autocomplete` | GET | No | `{ search_text }` | Places array | `PhpConfigService.placeApiAutocomplete()` |
| `/api/v1/config/distance-api` | GET | No | `{ origin_lat, origin_lng, destination_lat, destination_lng }` | Distance info | `PhpConfigService.calculateDistance()` |
| `/api/v1/config/direction-api` | GET | No | `{ origin_lat, origin_lng, destination_lat, destination_lng }` | Directions | `PhpConfigService.getDirections()` |
| `/api/v1/config/place-api-details` | GET | No | `{ placeid }` | Place details | `PhpConfigService.getPlaceDetails()` |
| `/api/v1/config/geocode-api` | GET | No | `{ lat?, lng?, address? }` | Geocode result | `PhpConfigService.geocodeAddress()` |

---

### 13. Review APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/delivery-man/reviews/{id}` | GET | No | - | Reviews | `PhpReviewService.getDeliveryManReviews()` |
| `/api/v1/delivery-man/rating/{id}` | GET | No | - | Rating | `PhpReviewService.getDeliveryManRating()` |
| `/api/v1/delivery-man/reviews/submit` | POST | Yes | `{ delivery_man_id, order_id, rating, comment }` | Success | `PhpReviewService.submitDeliveryManReview()` |

---

### 14. Notification APIs

| Endpoint | Method | Auth | Request | Response | NestJS Service |
|----------|--------|------|---------|----------|----------------|
| `/api/v1/customer/notifications` | GET | Yes | `{ limit?, offset? }` | Notifications | `PhpNotificationService.getNotifications()` |
| `/api/v1/customer/cm-firebase-token` | PUT | Yes | `{ fcm_token }` | Success | `PhpNotificationService.updateFcmToken()` |

---

## Data Sync Analysis

### Data Fetched FROM PHP

| Data Type | Source Endpoint | Caching | Refresh Frequency |
|-----------|----------------|---------|-------------------|
| User Profile | `/api/v1/customer/info` | Redis Session | Per conversation |
| Addresses | `/api/v1/customer/address/list` | None | Per request |
| Order History | `/api/v1/customer/order/list` | None | Per request |
| Wallet Balance | `/api/v1/customer/wallet/list` | Redis Session | Per order flow |
| Parcel Categories | `/api/v1/parcel-category` | None | Per parcel flow |
| Zone Info | `/api/v1/config/get-zone-id` | None | Per location |
| Menu Items | `/api/v1/items/*` | OpenSearch | Periodic sync |
| Stores | `/api/v1/stores/*` | OpenSearch | Periodic sync |
| Coupons | `/api/v1/coupon/list` | None | Per request |

### Data Sent TO PHP

| Data Type | Destination Endpoint | Trigger |
|-----------|---------------------|---------|
| OTP Request | `/api/v1/auth/login` | User login |
| OTP Verification | `/api/v1/auth/verify-phone` | User verification |
| User Info Update | `/api/v1/auth/update-info` | New user registration |
| New Address | `/api/v1/customer/address/add` | Address creation |
| Order Placement | `/api/v1/customer/order/place` | Checkout |
| Payment Method | `/api/v1/customer/order/payment-method` | Payment selection |
| Order Cancellation | `/api/v1/customer/order/cancel` | User cancellation |
| Cart Operations | `/api/v1/customer/cart/*` | Cart management |
| Reviews | `/api/v1/items/reviews/submit` | Post-order |

### OpenSearch Sync

**File**: `scripts/sync-items-to-opensearch.ts`

- Syncs menu items from PHP to OpenSearch for fast search
- Runs periodically or on-demand
- Source: `PHP_BACKEND_URL/api/v1/items/*`

---

## Error Handling

### PHP Error Response Format

```json
{
  "errors": [
    {
      "code": "zone",
      "message": "Out of coverage area"
    }
  ]
}
```

### NestJS Error Handling

```typescript
// PhpApiService interceptor extracts user-friendly messages
if (phpError?.errors && Array.isArray(phpError.errors)) {
  const userMessage = phpError.errors.map((e) => e.message).join(', ');
  const enhancedError = new Error(userMessage);
  enhancedError.code = phpError.errors[0].code;
  enhancedError.statusCode = error.response?.status;
  throw enhancedError;
}

// Also handles simple message format
if (phpError?.message) {
  const enhancedError = new Error(phpError.message);
  enhancedError.statusCode = error.response?.status;
  throw enhancedError;
}
```

---

## Known Issues & Recommendations

### ⚠️ Potential Issues

1. **Duplicate Service Implementations**
   - `src/php-integration/` and `api-gateway/src/php-backend/` have overlapping services
   - Recommendation: Consolidate to single module

2. **Coordinate String Conversion**
   - PHP requires lat/lng as **strings**, not numbers
   - Critical: `latitude.toString()` must be used

3. **Zone ID Format**
   - Headers: `zoneId: JSON.stringify([4])` (array as JSON string)
   - Body: `zone_id: 4` (integer)

4. **SSL Certificate Verification**
   - Currently disabled: `rejectUnauthorized: false`
   - Security concern for production

5. **Test Mode Mocking**
   - Several services return mock data for test numbers (8888777766, 9999888877)
   - Ensure `TEST_MODE=false` in production

### ✅ Working Integrations

- ✅ Authentication (OTP login/verify)
- ✅ Address management
- ✅ Order placement (parcel & food)
- ✅ Payment method selection
- ✅ Wallet operations
- ✅ Coupon application
- ✅ Zone detection
- ✅ Parcel category fetching
- ✅ Order tracking

### 📋 Recommended Improvements

1. **Add health check endpoint** - Monitor PHP backend connectivity
2. **Implement request retries** - Handle transient failures
3. **Add request caching** - Reduce PHP backend load for static data
4. **Centralize error codes** - Create mapping for PHP error codes
5. **Add request logging** - Better debugging for API failures
6. **Implement circuit breaker** - Prevent cascade failures

---

## Service Dependency Graph

```
ConversationService
    ├── PhpAuthService (login, profile)
    ├── PhpAddressService (addresses)
    ├── PhpOrderService (orders)
    ├── PhpPaymentService (payments)
    └── PhpParcelService (parcel flows)

SmartOrderService
    └── PhpStoreService (menu validation)

SearchService
    └── PhpStoreService (fallback search)

FlowEngine (AuthExecutor)
    └── PhpAuthService (OTP flows)
```

---

## Summary

| Category | Count |
|----------|-------|
| **Total PHP Endpoints** | 70+ |
| **Authenticated Endpoints** | ~40 |
| **Public Endpoints** | ~30 |
| **NestJS Service Files** | 22 |
| **Core Services** | 12 |

The integration is comprehensive and covers all core e-commerce functionality. The PHP Laravel backend serves as the source of truth for:
- User accounts and authentication
- Orders and payments
- Product catalog
- Delivery operations
- Business configuration

The NestJS layer acts as an intelligent middleware that:
- Handles WhatsApp conversations
- Provides AI-powered NLU
- Manages session state in Redis
- Orchestrates complex multi-step flows
