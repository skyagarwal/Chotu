# Mangwale API - Postman Collection Guide

## Files Created

1. **Mangwale_Postman_Collection.json** - Postman collection file (import into Postman)
2. **POSTMAN_COLLECTION_DOCUMENTATION.md** - Detailed documentation of all endpoints
3. **POSTMAN_COLLECTION_README.md** - This file (usage guide)

## Quick Start

1. **Import Collection**: Open Postman → Import → Select `Mangwale_Postman_Collection.json`
2. **Set Variables**: 
   - `base_url`: `https://new.mangwale.com`
   - `zoneId`: Your zone ID (e.g., `1`)
   - `moduleId`: Your module ID (e.g., `1`)
3. **Get Tokens**: 
   - Run "Customer Login" → Copy token → Set `customer_token`
   - Run "Vendor Login" → Copy token → Set `vendor_token`
   - Run "DM Login" → Copy token → Set `dm_token`

## Complete Flows Covered

### ✅ Customer Flow
1. **Authentication**
   - Sign Up / Login
   - Guest Request (for guest orders)
   - Password Reset
   - Social Login

2. **Profile Management**
   - Get/Update Profile
   - Address Management (CRUD)
   - Notifications

3. **Shopping Flow**
   - Browse Stores
   - Browse Items
   - Add to Cart
   - Apply Coupons
   - Place Order (Food/Ecommerce/Parcel)

4. **Order Management**
   - View Orders
   - Track Order
   - Cancel Order
   - Refund Request

5. **Wallet Journey**
   - View Transactions
   - Add Funds
   - Transfer Funds

6. **Additional Features**
   - Wishlist
   - Loyalty Points
   - Messages/Chat
   - Reviews

### ✅ Vendor Flow
1. **Authentication**
   - Vendor Login
   - Password Reset

2. **Store Management**
   - Profile Management
   - Store Setup
   - Schedule Management

3. **Order Management**
   - View Current Orders
   - Update Order Status
   - Order Details

4. **Item Management**
   - Create/Update Items
   - Stock Management
   - Item Reviews

5. **Business Operations**
   - Coupons Management
   - POS System
   - Reports
   - Wallet & Withdrawals
   - Subscriptions

### ✅ Delivery Man Flow
1. **Authentication**
   - DM Login
   - Password Reset

2. **Order Management**
   - View Available Orders
   - Accept Order
   - Update Order Status
   - Record Location

3. **Earnings**
   - View Earnings
   - Withdraw Requests
   - Wallet Management

4. **Additional**
   - Reviews
   - Messages

## Order Types & Status Flow

### Food/Ecommerce Orders
```
pending → confirmed → accepted → processing → picked_up → delivered
                                    ↓
                                canceled
```

### Parcel Orders
```
pending → confirmed → handover → picked_up → delivered
                        ↓
                    canceled
```

## Payment Methods
- `cash_on_delivery`
- `digital_payment`
- `wallet`
- `offline_payment`

## Order Types
- `delivery` - Home delivery
- `take_away` - Pickup from store
- `parcel` - Parcel delivery

## Common Request Headers

All authenticated requests require:
```
Authorization: Bearer {token}
zoneId: {zone_id}
moduleId: {module_id}
Content-Type: application/json
```

Vendor/DM endpoints also require:
```
actch: vendor_app (for vendor)
actch: deliveryman_app (for delivery man)
```

## Testing Complete Flows

### Complete Customer Order Flow
1. Get Configuration
2. Guest Request (or Customer Sign Up/Login)
3. Get Stores → Get Items
4. Add to Cart
5. Apply Coupon (optional)
6. Place Order
7. Track Order
8. Cancel/Complete Order

### Complete Vendor Flow
1. Vendor Login
2. Get Current Orders
3. Update Order Status (pending → processing → handover)
4. Manage Items
5. View Reports

### Complete Delivery Man Flow
1. DM Login
2. Get Latest Orders
3. Accept Order
4. Update Order Status (accepted → picked_up → delivered)
5. Record Location
6. View Earnings

## Expanding the Collection

The current collection includes the most commonly used endpoints. To add more endpoints:

1. Refer to `POSTMAN_COLLECTION_DOCUMENTATION.md` for complete endpoint list
2. Use the existing requests as templates
3. Add new requests following the same structure

## Important Notes

- **Guest Orders**: Use `guest_id` from "Guest Request" endpoint
- **Order IDs**: Use numeric order IDs from order responses
- **Store IDs**: Use store IDs from store listing responses
- **OTP Codes**: Typically 4-6 digits, sent via SMS/Email
- **Images**: Base64 encoded or uploaded separately
- **Timestamps**: ISO 8601 format

## Response Format

Most endpoints return:
```json
{
  "data": {...},
  "message": "Success"
}
```

Error responses:
```json
{
  "errors": [
    {
      "code": "error_code",
      "message": "Error message"
    }
  ]
}
```

## Support

For detailed endpoint documentation, see `POSTMAN_COLLECTION_DOCUMENTATION.md`.

For API support, contact the development team.

## Collection Structure

The collection is organized into folders:
1. Configuration & Setup
2. Customer Authentication
3. Customer Profile & Management
4. Customer Address Management
5. Stores & Items Browsing
6. Cart Management
7. Orders - Customer Flow
8. Wallet Journey
9. Vendor Authentication
10. Vendor Orders Management
11. Delivery Man Authentication
12. Delivery Man Orders

Each folder contains related endpoints with detailed descriptions and example requests.

