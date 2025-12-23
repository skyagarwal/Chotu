# PHP Backend API Reference

## Base URL
https://new.mangwale.com

## Required Headers
- Content-Type: application/json
- moduleId: 3 (Local Delivery)
- zoneId: [4] (Zone ID array)

## Auth Endpoints

### Send OTP
POST /api/v1/auth/login
Body: {"phone": "+919158886329", "login_type": "otp", "guest_id": "xxx"}

### Verify OTP  
POST /api/v1/auth/verify-phone
Body: {"phone": "+919158886329", "otp": "1234", "login_type": "otp", "guest_id": "xxx"}

### Get Profile
GET /api/v1/customer/info (requires Bearer token)

## Parcel Endpoints

### Categories
GET /api/v1/parcel-category

### Place Order
POST /api/v1/customer/order/place (requires Bearer token)

## Test Numbers
- 8888777766 = Mock Existing (OTP: 123456)
- 9999888877 = Mock New User (OTP: 123456)
- 9158886329 = Real User (check phone/DB)

## Module IDs (VERIFIED)
| ID | Name | Type |
|----|------|------|
| 3 | Local Delivery | parcel |
| 4 | Food | food |
| 5 | Shop | ecommerce |

## Food Order Endpoints

### Get Stores
GET /api/v1/stores/get-stores/all?lat={lat}&lng={lng}
Headers: moduleId: 4, zoneId: [4]

### Get Store Categories  
GET /api/v1/categories?store_id={store_id}

### Get Items
GET /api/v1/items/latest?store_id={id}&category_id={cat_id}&limit=10

### Place Food Order
POST /api/v1/customer/order/place
Body: Similar to parcel, with cart items
