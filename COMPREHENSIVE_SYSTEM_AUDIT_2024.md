# 🏪 MangwaleAI - Comprehensive System Audit Report
**Date:** December 20, 2024  
**Version:** 1.0  
**Status:** Native Mode Active (Backend: 3200, Frontend: 3005)

---

## 📋 Executive Summary

MangwaleAI is a multi-tenant, multi-channel food delivery and parcel delivery platform with AI-powered conversational capabilities. The system supports **3 distinct user types**:
1. **Customers** - Order food, parcels, track orders
2. **Vendors** (Restaurant owners) - Manage orders, update status
3. **Delivery Partners** - Accept orders, deliver, track earnings

---

## 🏗️ Architecture Overview

### Core Components

| Component | Technology | Port | Status |
|-----------|------------|------|--------|
| Backend (NestJS) | NestJS v10, TypeScript | 3200 | ✅ Running |
| Frontend (Next.js) | Next.js v16, Turbopack | 3005 | ✅ Running |
| vLLM (AI) | Qwen2.5-7B-Instruct-AWQ | 8002 | ✅ Running |
| NLU | IndicBERTv2-MLM-Back-TLM | 7010 | ✅ Running |
| PostgreSQL | v16-alpine | 5432 | ✅ Healthy |
| Redis | v7-alpine | 6381 | ✅ Healthy |
| PHP Backend | Laravel (external) | HTTPS | 🌐 External |

### Backend Module Count: **47 modules**

```
agents/          ai/              analytics/       asr/
auth/            chat/            common/          config/
conversation/    database/        exotel/          flow-engine/
flow-management/ flows/           gamification/    health/
instagram/       integrations/    llm/             messaging/
models/          monitoring/      nlu/             notification/
orchestrator/    order/           order-flow/      parcel/
personalization/ php-integration/ psychology/      routing/
search/          services/        session/         settings/
sms/             stats/           stores/          telegram/
tenant/          testing/         training/        tts/
user/            vision/          voice/           whatsapp/
zones/
```

---

## 🔄 Flow Engine Architecture

### Flow Types

#### 1. TypeScript Flows (13 flows - Customer Focused)
Located in: `backend/src/flow-engine/flows/*.ts`

| Flow | Purpose | Status |
|------|---------|--------|
| `auth.flow.ts` | Customer authentication (phone/OTP) | ✅ Active |
| `greeting.flow.ts` | Initial greeting | ✅ Active |
| `food-order.flow.ts` | Food ordering flow | ✅ Active |
| `ecommerce-order.flow.ts` | E-commerce/grocery ordering | ✅ Active |
| `order-tracking.flow.ts` | Track customer orders | ✅ Active |
| `parcel-delivery.flow.ts` | Parcel delivery booking | ✅ Active |
| `help.flow.ts` | Help & FAQ | ✅ Active |
| `profile.flow.ts` | User profile management | ✅ Active |
| `chitchat.flow.ts` | Casual conversation | ✅ Active |
| `feedback.flow.ts` | Collect feedback | ✅ Active |
| `farewell.flow.ts` | Session end | ✅ Active |
| `support.flow.ts` | Customer support | ✅ Active |
| `game-intro.flow.ts` | Gamification intro | ⚠️ Disabled |

#### 2. YAML V2 Flows (8 flows - Vendor/Driver Focused)
Located in: `backend/src/flow-engine/flows/yaml-v2/*.yaml`

| Flow | Purpose | Status |
|------|---------|--------|
| `vendor-auth.flow.yaml` | Vendor login (email/OTP) | 📝 Defined |
| `vendor-orders.flow.yaml` | Vendor order management | 📝 Defined |
| `delivery-auth.flow.yaml` | Driver login | 📝 Defined |
| `delivery-orders.flow.yaml` | Driver order management | 📝 Defined |
| `user-type-detection.flow.yaml` | Detect user role | 📝 Defined |
| `customer-order-status.flow.yaml` | Customer order tracking | 📝 Defined |
| `location-collection.flow.yaml` | Location/address collection | 📝 Defined |
| `payment-completion.flow.yaml` | Payment flow | 📝 Defined |

#### 3. YAML V1 Flows (7 flows - Legacy)
Located in: `backend/src/flows/yaml/*.yaml`

| Flow | Purpose | Status |
|------|---------|--------|
| `greeting.yaml` | Legacy greeting | 🔶 Legacy |
| `smart-order.yaml` | Smart ordering | 🔶 Legacy |
| `auth.yaml` | Legacy auth | 🔶 Legacy |
| `search.yaml` | Search flow | 🔶 Legacy |
| `parcel.yaml` | Parcel flow | 🔶 Legacy |
| `order.yaml` | Order flow | 🔶 Legacy |
| `complaints.yaml` | Complaints flow | 🔶 Legacy |

---

## 👥 User Type Features

### 🛒 CUSTOMER FEATURES

#### ✅ Implemented
| Feature | Implementation | PHP Endpoints |
|---------|---------------|---------------|
| Phone OTP Auth | `auth.flow.ts`, `PhpAuthService` | `/api/v1/auth/verify-phone` |
| View Profile | `PhpAuthService.getProfile()` | `/api/v1/customer/info` |
| Browse Restaurants | `PhpStoreService` | `/api/v1/store/list` |
| Search Items | `SearchOrchestrator`, OpenSearch | `/api/v1/items/search` |
| Place Order | `PhpOrderService.createFoodOrder()` | `/api/v1/customer/order/place` |
| Track Order | `PhpOrderService.trackOrder()` | `/api/v1/customer/order/track` |
| Order History | `PhpOrderService.getOrders()` | `/api/v1/customer/order/list` |
| Cancel Order | `PhpOrderService.cancelOrder()` | `/api/v1/customer/order/cancel` |
| Manage Addresses | `PhpAddressService` | `/api/v1/customer/address/*` |
| Wallet Balance | `PhpWalletService` | `/api/v1/customer/wallet/*` |
| Apply Coupons | `PhpCouponService` | `/api/v1/coupon/*` |
| Leave Reviews | `PhpReviewService` | `/api/v1/review/*` |
| Parcel Delivery | `PhpParcelService`, `ParcelService` | `/api/v1/customer/order/place` |

#### ⚠️ Gaps/Not Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Real-time Order Tracking Map | 🔴 Missing | WebSocket for live location needed |
| In-app Chat with Driver | 🔴 Missing | Driver-Customer chat |
| Re-order (Quick Order) | 🔴 Missing | One-tap re-order from history |
| Schedule Orders | 🔴 Missing | Future order scheduling |
| Split Payment | 🔴 Missing | Multiple payment methods |
| Group Orders | 🔴 Missing | Multiple people ordering together |

---

### 🏪 VENDOR FEATURES

#### ✅ Implemented (Services)
| Feature | Service | PHP Endpoints |
|---------|---------|---------------|
| OTP Login | `PhpVendorAuthService.sendVendorOtp()` | `/api/v1/auth/vendor/send-otp` |
| OTP Verify | `PhpVendorAuthService.verifyVendorOtp()` | `/api/v1/auth/vendor/verify-otp` |
| Email Login | `PhpVendorAuthService.vendorLogin()` | `/api/v1/auth/vendor/login` |
| Get Profile | `PhpVendorAuthService.getVendorProfile()` | (Implemented) |
| Update Profile | `PhpVendorAuthService.updateVendorProfile()` | (Implemented) |
| Get Orders | `PhpVendorAuthService.getCurrentOrders()` | (Implemented) |
| Update Order Status | `PhpVendorAuthService.updateOrderStatus()` | (Implemented) |
| Get Menu Items | `PhpVendorAuthService.getItemsList()` | `/api/v1/vendor/get-items-list` |
| Toggle Item | `PhpVendorAuthService.toggleItemStatus()` | (Implemented) |

#### 📝 Defined in YAML (Not Active)
| Feature | YAML Flow | Actions Used |
|---------|-----------|--------------|
| Vendor Auth Flow | `vendor-auth.flow.yaml` | `vendor_login`, `get_vendor_profile` |
| Order Management | `vendor-orders.flow.yaml` | `vendor_get_current_orders`, `vendor_update_order_status` |
| Order Status Updates | Confirm/Preparing/Ready | Status: confirmed, processing, handover |
| Cancel Order | With reason | Status: canceled |

#### ⚠️ Gaps/Not Fully Integrated
| Feature | Status | Notes |
|---------|--------|-------|
| YAML Flow Executor | 🟡 Partial | YAML V2 parser exists, but `php_api` executor needs mapping |
| Menu Management (Add/Edit) | 🔴 Missing | Only toggle implemented |
| Pricing Updates | 🔴 Missing | No endpoint |
| Order Notifications | 🟡 Partial | `VendorNotificationService` exists |
| Analytics Dashboard | 🔴 Missing | No vendor analytics |
| Settlement Reports | 🔴 Missing | No financial reports |
| Operating Hours | 🔴 Missing | No schedule management |
| Auto Accept Orders | 🔴 Missing | Manual only |

---

### 🚴 DELIVERY PARTNER FEATURES

#### ✅ Implemented (Services)
| Feature | Service | PHP Endpoints |
|---------|---------|---------------|
| Email Login | `PhpDeliveryAuthService.deliveryManLogin()` | `/api/v1/auth/delivery-man/login` |
| Get Profile | `PhpDeliveryAuthService.getDeliveryManProfile()` | `/api/v1/delivery-man/profile` |
| Update Profile | `PhpDeliveryAuthService.updateProfile()` | (Implemented) |
| Online/Offline Status | `PhpDeliveryAuthService.updateActiveStatus()` | (Implemented) |
| Get Current Orders | `PhpDeliveryAuthService.getCurrentOrders()` | (Implemented) |
| Get Order History | `PhpDeliveryAuthService.getOrderHistory()` | (Implemented) |
| Accept Order | `PhpDeliveryAuthService.acceptOrder()` | (Implemented) |
| Update Order Status | `PhpDeliveryAuthService.updateOrderStatus()` | (Implemented) |
| Record Location | `PhpDeliveryAuthService.recordLocation()` | `/api/v1/delivery-man/record-location-data` |
| Get Order Details | `PhpDeliveryAuthService.getOrderDetails()` | `/api/v1/delivery-man/order-details` |
| Get Earnings | `PhpDeliveryAuthService.getEarnings()` | `/api/v1/delivery-man/earnings` |

#### 📝 Defined in YAML (Not Active)
| Feature | YAML Flow | Actions Used |
|---------|-----------|--------------|
| Driver Auth | `delivery-auth.flow.yaml` | `delivery_man_login`, `get_delivery_man_profile` |
| Order Management | `delivery-orders.flow.yaml` | All order operations |
| Status Updates | picked_up, on_way, delivered | `dm_update_order_status` |
| Earnings View | `dm_get_earnings` | Today/Week/Month |
| Order History | `dm_get_order_history` | Past deliveries |
| Navigation | Navigate to pickup/delivery | Google Maps links |
| Call Restaurant/Customer | Phone links | Direct calling |
| OTP Verification | Delivery OTP check | Customer confirmation |

#### ⚠️ Gaps/Not Integrated
| Feature | Status | Notes |
|---------|--------|-------|
| YAML Flow Active | 🔴 Not Active | Flow defined but not connected |
| OTP Login (Driver) | 🔴 Missing | Only email/password exists |
| Batch Order Accept | 🔴 Missing | Single order only |
| Earnings Withdrawal | 🔴 Missing | No payout feature |
| Performance Stats | 🔴 Missing | No driver performance dashboard |
| Route Optimization | 🔴 Missing | No smart routing |
| Support Chat | 🔴 Missing | No driver support |

---

## 🔗 PHP Integration Layer

### All PHP API Endpoints Used

```
Customer APIs:
├── /api/v1/auth/verify-phone
├── /api/v1/auth/login
├── /api/v1/auth/check-phone
├── /api/v1/auth/update-info
├── /api/v1/customer/info
├── /api/v1/customer/address/list
├── /api/v1/customer/address/add
├── /api/v1/customer/address/delete
├── /api/v1/customer/cart/add
├── /api/v1/customer/cart/remove
├── /api/v1/customer/order/place
├── /api/v1/customer/order/list
├── /api/v1/customer/order/running-orders
├── /api/v1/customer/order/details
├── /api/v1/customer/order/track
├── /api/v1/customer/order/cancel
├── /api/v1/customer/order/payment-method
├── /api/v1/customer/order/get-Tax
├── /api/v1/customer/order/offline-payment
├── /api/v1/customer/wallet/list
├── /api/v1/customer/wallet/transactions
├── /api/v1/customer/wallet/bonuses
├── /api/v1/coupon/list/all
├── /api/v1/config/get-PaymentMethods
├── /api/v1/module

Vendor APIs:
├── /api/v1/auth/vendor/send-otp
├── /api/v1/auth/vendor/verify-otp
├── /api/v1/auth/vendor/login
├── /api/v1/vendor/get-items-list
├── /api/v1/vendor/orders/current (Assumed)
├── /api/v1/vendor/order/status (Assumed)

Delivery APIs:
├── /api/v1/auth/delivery-man/login
├── /api/v1/delivery-man/profile
├── /api/v1/delivery-man/orders/current (Assumed)
├── /api/v1/delivery-man/order-details
├── /api/v1/delivery-man/record-location-data
├── /api/v1/delivery-man/earnings
├── /api/v1/delivery-man/accept-order (Assumed)
├── /api/v1/delivery-man/update-status (Assumed)
```

---

## 🤖 AI Services

### NLU (Natural Language Understanding)
- **Model:** IndicBERTv2-MLM-Back-TLM
- **Port:** 7010
- **Purpose:** Intent classification, Entity extraction
- **Languages:** English, Hindi, Marathi
- **Intents:** ~25 (greeting, order_food, track_order, etc.)

### vLLM (Large Language Model)
- **Model:** Qwen/Qwen2.5-7B-Instruct-AWQ
- **Port:** 8002
- **Purpose:** Natural conversation, Smart responses
- **Context:** 8192 tokens
- **Quantization:** AWQ 4-bit

### Agent System
| Agent | Purpose | Status |
|-------|---------|--------|
| `order.agent.ts` | Order placement | ✅ Active |
| `search.agent.ts` | Product search | ✅ Active |
| `booking.agent.ts` | Table booking | ✅ Active |
| `complaints.agent.ts` | Handle complaints | ✅ Active |
| `faq.agent.ts` | FAQ responses | ✅ Active |

---

## 📱 Multi-Channel Support

| Channel | Status | Implementation |
|---------|--------|----------------|
| WhatsApp | ✅ Active | `whatsapp/` module, webhook handlers |
| Telegram | ✅ Active | `telegram/` module, bot commands |
| Web Chat | ✅ Active | WebSocket, REST API |
| SMS | 🟡 Partial | `sms/` module exists |
| Voice | 🟡 Partial | `voice/`, `asr/`, `tts/` modules |
| Instagram | 🟡 Partial | Enum added, module basic |
| RCS | 📝 Planned | Not implemented |

---

## 🔍 Critical Gaps Analysis

### 1. **YAML V2 Flows Not Active**
The vendor and driver flows are **defined** but **not connected**:
```yaml
# These exist but aren't being executed:
- vendor-auth.flow.yaml
- vendor-orders.flow.yaml
- delivery-auth.flow.yaml
- delivery-orders.flow.yaml
- user-type-detection.flow.yaml
```

**Required:**
- Connect `php_api` executor actions to `PhpVendorAuthService` / `PhpDeliveryAuthService`
- Implement YAML V2 flow loader in `flow-engine.service.ts`
- Add trigger detection for vendor/driver users

### 2. **User Type Detection Not Integrated**
`user-type-detection.flow.yaml` exists but isn't called on conversation start.

**Current Flow:**
```
User → WhatsApp → ConversationService → Legacy Auth Flow → Customer Only
```

**Required Flow:**
```
User → WhatsApp → UserTypeDetectorService → user-type-detection.flow.yaml
    ↳ Customer → customer flows
    ↳ Vendor → vendor flows
    ↳ Driver → delivery flows
```

### 3. **Missing PHP API Executor**
The `php_api` executor referenced in YAML flows doesn't have action mappings:

```yaml
# YAML uses:
action: vendor_get_current_orders
action: dm_accept_order

# But no executor maps these to:
PhpVendorAuthService.getCurrentOrders()
PhpDeliveryAuthService.acceptOrder()
```

### 4. **Gamification System Disabled**
- 82 TypeScript errors
- Prisma schema issues
- Module archived to `_gamification_archived/`

### 5. **Vision Module Disabled**
- onnxruntime-node webpack issues
- Excluded from build

---

## ✅ Recommendations

### Immediate (P0)
1. **Connect User Type Detection**
   - Add `UserTypeDetectorService.detectUserType()` call on new conversation
   - Route to appropriate flows based on user type

2. **Implement PHP API Executor**
   - Create `php-api.executor.ts` that maps YAML actions to PHP services
   - Example mapping:
   ```typescript
   {
     'vendor_get_current_orders': (ctx) => this.vendorAuth.getCurrentOrders(ctx.token),
     'dm_accept_order': (ctx) => this.deliveryAuth.acceptOrder(ctx.token, ctx.orderId),
   }
   ```

3. **Activate YAML V2 Flow Loader**
   - Load `yaml-v2/*.yaml` on startup
   - Register triggers for vendor/driver detection

### Short-term (P1)
4. **Real-time Order Tracking**
   - WebSocket for location updates
   - Push notifications for status changes

5. **Fix Gamification Module**
   - Resolve Prisma schema issues
   - Re-enable for customer engagement

6. **Complete Driver OTP Auth**
   - Add OTP-based login for drivers (like vendors)

### Medium-term (P2)
7. **Vendor Analytics Dashboard**
8. **Driver Performance Stats**
9. **Route Optimization**
10. **Support Chat System**

---

## 📁 File References

### Key Service Files
- [php-vendor-auth.service.ts](backend/src/php-integration/services/php-vendor-auth.service.ts) - Vendor PHP APIs
- [php-delivery-auth.service.ts](backend/src/php-integration/services/php-delivery-auth.service.ts) - Driver PHP APIs
- [user-type-detector.service.ts](backend/src/php-integration/services/user-type-detector.service.ts) - User detection
- [flow-engine.service.ts](backend/src/flow-engine/flow-engine.service.ts) - Flow execution
- [conversation.service.ts](backend/src/conversation/services/conversation.service.ts) - Message routing

### Key Flow Files
- [vendor-orders.flow.yaml](backend/src/flow-engine/flows/yaml-v2/vendor-orders.flow.yaml) - Vendor flow
- [delivery-orders.flow.yaml](backend/src/flow-engine/flows/yaml-v2/delivery-orders.flow.yaml) - Driver flow (753 lines!)
- [user-type-detection.flow.yaml](backend/src/flow-engine/flows/yaml-v2/user-type-detection.flow.yaml) - Role detection

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Backend Modules | 47 |
| TypeScript Flows | 13 |
| YAML V2 Flows | 8 |
| YAML V1 Flows | 7 |
| PHP Endpoints Used | ~40 |
| Flow Executors | 18 |
| AI Agents | 5 |
| Channels | 7 |

---

**Report Generated:** December 20, 2024  
**Author:** System Audit Agent  
**Next Review:** January 2025
