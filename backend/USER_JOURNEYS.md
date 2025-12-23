# MangwaleAI User Journeys - Complete Analysis

**Document Version:** 1.0  
**Analysis Date:** November 30, 2025  
**System Type:** WhatsApp-based Conversational AI for Food Delivery, Parcel Services & E-commerce

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Flow Definitions Analysis](#2-flow-definitions-analysis)
3. [User Journey Maps](#3-user-journey-maps)
4. [Integration Points](#4-integration-points)
5. [Gaps and Issues](#5-gaps-and-issues)
6. [Recommendations](#6-recommendations)

---

## 1. System Overview

### 1.1 Architecture Summary

MangwaleAI is a conversational AI platform built with:

- **Backend:** NestJS (TypeScript) with Flow Engine
- **PHP Backend:** Laravel-based API for orders, payments, stores
- **Search:** OpenSearch with hybrid (keyword + semantic) search
- **AI Services:** LLM (multi-provider), NLU, ASR (Whisper), TTS (XTTS)
- **Messaging:** WhatsApp Business API integration
- **Database:** PostgreSQL (Prisma ORM)

### 1.2 Flow Engine Components

| Component | Description |
|-----------|-------------|
| **FlowEngineService** | Main orchestrator for flow execution |
| **StateMachineEngine** | State transitions and decision logic |
| **ExecutorRegistryService** | Registry of all action executors |
| **FlowContextService** | Context management between states |

### 1.3 Available Executors

| Executor | Purpose |
|----------|---------|
| `llm` | LLM-based responses and extraction |
| `nlu` | Intent and entity extraction |
| `search` | OpenSearch product/food search |
| `address` | Address collection with saved addresses |
| `zone` | Service zone validation |
| `distance` | OSRM-based distance calculation |
| `pricing` | Order pricing calculation |
| `order` | Order creation via PHP backend |
| `parcel` | Parcel categories and shipping |
| `auth` | Phone/OTP authentication |
| `response` | Static message responses |
| `preference` | User preference storage |
| `game` | Gamification game orchestration |

---

## 2. Flow Definitions Analysis

### 2.1 Active Flows Summary

| Flow ID | Name | Module | Trigger | Priority |
|---------|------|--------|---------|----------|
| `greeting_v1` | Greeting Flow | general | `greeting` | 100 |
| `auth_v1` | Authentication Flow | general | `login` | 95 |
| `help_v1` | Help Flow | general | `help\|browse_menu\|...` | 90 |
| `game_intro_v1` | Gamification Master Flow | general | `earn\|game\|reward\|...` | 85 |
| `farewell_v1` | Farewell Flow | general | `goodbye\|bye\|...` | 80 |
| `chitchat_v1` | Chitchat Flow | general | `how are you\|thanks\|...` | 75 |
| `feedback_v1` | Feedback Flow | general | `feedback\|suggestion\|...` | 70 |
| `food_order_v1` | Food Order Flow | food | `order_food` | - |
| `parcel_delivery_v1` | Parcel Delivery Flow | parcel | `parcel_booking` | - |
| `ecommerce_order_v1` | E-commerce Order Flow | ecommerce | `search_product` | - |
| `profile_completion_v1` | Profile Completion Flow | personalization | `complete my profile\|...` | 100 |

### 2.2 Disabled Flows

| Flow | Status | Notes |
|------|--------|-------|
| `training-game.flow.ts.disabled` | Disabled | More detailed training game, replaced by `game-intro.flow.ts` |
| `game-scorer.executor.ts.disabled` | Disabled | Game scoring executor |
| `reward-points.executor.ts.disabled` | Disabled | Reward points executor |

---

## 3. User Journey Maps

### 3.1 Food Ordering Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FOOD ORDERING FLOW                               │
│                         (food_order_v1)                                  │
└─────────────────────────────────────────────────────────────────────────┘

User: "I want to order pizza"
         │
         ▼
┌─────────────────┐
│  check_trigger  │ ─────► Has query? ──YES──► understand_request
│   (decision)    │                           
└────────┬────────┘
         │ NO
         ▼
┌─────────────────┐
│   greet_user    │ "What would you like to eat today?"
│     (wait)      │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│understand_request│ ◄─── NLU: Extract intent & entities
│    (action)     │ ◄─── LLM: Extract {item, restaurant, search_query}
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│   search_food   │ ───► OpenSearch: food_items_v3 index
│    (action)     │      Fields: item_name, category, restaurant_name
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
items_found  no_items
    │         │
    ▼         ▼
┌─────────┐  ┌──────────────────┐
│show_    │  │analyze_no_results│ ─► LLM: Check if specific restaurant
│results  │  └────────┬─────────┘
│(action) │           │
└────┬────┘      ┌────┴────┐
     │           │         │
     │    specific    generic
     │    restaurant   failure
     │           │         │
     │           ▼         ▼
     │    ┌───────────┐  ┌─────────┐
     │    │offer_     │  │no_      │ ─► Show popular categories
     │    │custom_    │  │results  │
     │    │pickup     │  │(wait)   │
     │    │(wait)     │  └─────────┘
     │    └─────┬─────┘
     │          │ user accepts
     │          ▼
     │    ┌───────────────────┐
     │    │collect_custom_    │
     │    │pickup_details     │ ─► Get pickup location (for parcel-style delivery)
     │    └─────────┬─────────┘
     │              │
     └──────┬───────┘
            ▼
┌─────────────────┐
│process_selection│ ─► LLM: Parse "1x2, 3x1" format
│    (action)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│confirm_selection│ ─► Show cart with items, prices
│    (action)     │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│ check_cart_     │ ─► proceed_checkout | add_more | cancel
│ action          │
│   (decision)    │
└────────┬────────┘
         │ proceed_checkout
         ▼
┌─────────────────┐
│  upsell_offer   │ ─► "Would you like a drink or dessert?"
│    (action)     │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│ collect_address │ ─► AddressExecutor: Saved addresses or new
│     (wait)      │    Location share, Google Maps link support
└────────┬────────┘
         │ address_valid
         ▼
┌─────────────────┐
│ validate_zone   │ ─► ZoneExecutor: Check if in Nashik service area
│    (action)     │
└────────┬────────┘
         │ zone_valid
         ▼
┌─────────────────┐
│calculate_       │ ─► DistanceExecutor: OSRM routing
│distance         │
│    (action)     │
└────────┬────────┘
         │ calculated
         ▼
┌─────────────────┐
│calculate_pricing│ ─► PricingExecutor: items + delivery + tax
│    (action)     │
└────────┬────────┘
         │ calculated
         ▼
┌─────────────────┐
│collect_payment_ │ ─► "Cash on Delivery or Online?"
│method (wait)    │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│show_order_      │ ─► Full summary with prices, ETA
│summary (wait)   │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│check_final_     │ ─► user_confirms | user_cancels
│confirmation     │
│   (decision)    │
└────────┬────────┘
         │ user_confirms
         ▼
┌─────────────────┐
│  place_order    │ ─► OrderExecutor ─► PhpOrderService.createFoodOrder()
│    (action)     │    POST /api/v1/customer/order/place
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│   completed     │ ─► Order ID, confirmation, tracking info
│     (end)       │
└─────────────────┘
```

**External API Calls (Food Order):**

| Step | Service | PHP Endpoint | Purpose |
|------|---------|--------------|---------|
| search_food | SearchService | OpenSearch | Query food_items_v3 index |
| collect_address | PhpAddressService | GET /api/v1/customer/address/list | Fetch saved addresses |
| validate_zone | PhpParcelService | POST /api/v1/parcel/get-zone | Validate service area |
| calculate_distance | PhpParcelService | OSRM API | Calculate route distance |
| place_order | PhpOrderService | POST /api/v1/customer/order/place | Create order |

---

### 3.2 Parcel Delivery Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PARCEL DELIVERY FLOW                                │
│                     (parcel_delivery_v1)                                 │
└─────────────────────────────────────────────────────────────────────────┘

User: "I want to send a parcel"
         │
         ▼
┌─────────────────┐
│  check_trigger  │ ─► Has "from" or "send" in message?
│   (decision)    │
└────────┬────────┘
         │ NO
         ▼
┌─────────────────┐
│      init       │ "I can help you send items anywhere in Nashik.
│    (action)     │  Where should I pick it up from?"
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│ collect_pickup  │ ─► AddressExecutor (pickup_address)
│    (action)     │    Offer saved addresses, location share
└────────┬────────┘
         │ address_valid
         ▼
┌─────────────────┐
│validate_pickup_ │ ─► ZoneExecutor: Check pickup in Nashik
│zone (action)    │
└────────┬────────┘
         │ zone_valid
         ▼
┌─────────────────┐
│collect_delivery │ ─► AddressExecutor (delivery_address)
│    (action)     │
└────────┬────────┘
         │ address_valid
         ▼
┌─────────────────┐
│validate_delivery│ ─► ZoneExecutor: Check delivery in Nashik
│_zone (action)   │
└────────┬────────┘
         │ zone_valid
         ▼
┌─────────────────┐
│collect_recipient│ ─► LLM: Ask for recipient name & phone
│_details (action)│
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│extract_recipient│ ─► LLM: Parse {name, phone} from message
│_details (action)│
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│check_recipient_ │ ─► Both name and phone present?
│validity         │
│   (decision)    │
└────────┬────────┘
         │ details_valid
         ▼
┌─────────────────┐
│fetch_categories │ ─► ParcelExecutor: get_categories
│    (action)     │    PhpParcelService.getParcelCategories()
└────────┬────────┘
         │ categories_fetched
         ▼
┌─────────────────┐
│ show_categories │ ─► Display vehicle cards (Bike, Auto, Mini Truck)
│     (wait)      │    with images and pricing
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│handle_vehicle_  │ ─► LLM: Map "1", "bike", etc. to category ID
│selection        │
│    (action)     │
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│validate_vehicle │ ─► Valid selection?
│_selection       │
│   (decision)    │
└────────┬────────┘
         │ valid_selection
         ▼
┌─────────────────┐
│calculate_       │ ─► DistanceExecutor: OSRM
│distance (action)│
└────────┬────────┘
         │ calculated
         ▼
┌─────────────────┐
│calculate_pricing│ ─► ParcelExecutor: calculate_shipping
│    (action)     │    PhpParcelService.calculateShippingCharge()
└────────┬────────┘
         │ shipping_calculated
         ▼
┌─────────────────┐
│  show_summary   │ ─► Pickup, Delivery, Recipient, Distance, Pricing
│    (action)     │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│check_confirmation│ ─► user_confirms | user_cancels
│   (decision)    │
└────────┬────────┘
         │ user_confirms
         ▼
┌─────────────────┐
│  place_order    │ ─► OrderExecutor (type: parcel)
│    (action)     │    PhpOrderService.createOrder()
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│   completed     │ ─► Order ID, tracking info
│    (action)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│     finish      │
│     (end)       │
└─────────────────┘
```

**External API Calls (Parcel):**

| Step | Service | PHP Endpoint | Purpose |
|------|---------|--------------|---------|
| validate_*_zone | PhpParcelService | POST /api/v1/parcel/get-zone | Zone validation |
| fetch_categories | PhpParcelService | GET /api/v1/parcel/categories | Vehicle types |
| calculate_pricing | PhpParcelService | POST /api/v1/parcel/calculate-shipping | Pricing |
| place_order | PhpOrderService | POST /api/v1/customer/order/place | Create order |

---

### 3.3 E-commerce Shopping Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      E-COMMERCE ORDER FLOW                               │
│                     (ecommerce_order_v1)                                 │
└─────────────────────────────────────────────────────────────────────────┘

User: "I want to buy some groceries"
         │
         ▼
┌─────────────────┐
│  check_trigger  │ ─► Has query? (not just "hi", "shop")
│   (decision)    │
└────────┬────────┘
         │ has_query
         ▼
┌─────────────────┐
│understand_      │ ─► NLU: Extract shopping intent
│request (action) │
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│ search_products │ ─► OpenSearch: ecom_items_v3 index
│    (action)     │    Fields: title, category, brand, description
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
items_found  no_items
    │         │
    ▼         ▼
┌─────────┐  ┌─────────┐
│show_    │  │no_      │ ─► Suggest categories
│products │  │results  │
│(action) │  │(action) │
└────┬────┘  └─────────┘
     │ user_message
     ▼
┌─────────────────┐
│process_user_    │ ─► add_to_cart | view_cart | search_more
│action           │
│   (decision)    │
└────────┬────────┘
         │ add_to_cart
         ▼
┌─────────────────┐
│  add_to_cart    │ ─► LLM: Parse selections
│    (action)     │    Add to cart_items in context
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│  show_cart      │ ─► Display cart items, subtotal
│    (action)     │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│check_cart_action│ ─► proceed_checkout | continue_shopping | clear
│   (decision)    │
└────────┬────────┘
         │ proceed_checkout
         ▼
┌─────────────────┐
│ collect_address │ ─► AddressExecutor
│    (action)     │
└────────┬────────┘
         │ address_valid
         ▼
┌─────────────────┐
│ validate_zone   │ ─► ZoneExecutor
│    (action)     │
└────────┬────────┘
         │ zone_valid
         ▼
┌─────────────────┐
│calculate_pricing│ ─► PricingExecutor (type: ecommerce)
│    (action)     │    Free shipping > ₹500, 18% GST
└────────┬────────┘
         │ calculated
         ▼
┌─────────────────┐
│show_order_      │ ─► Full summary
│summary (action) │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│check_final_     │ ─► user_confirms | user_cancels
│confirmation     │
│   (decision)    │
└────────┬────────┘
         │ user_confirms
         ▼
┌─────────────────┐
│  place_order    │ ─► OrderExecutor (type: ecommerce)
│    (action)     │    ⚠️ NOT YET IMPLEMENTED
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│   completed     │
│     (end)       │
└─────────────────┘
```

**⚠️ CRITICAL GAP:** E-commerce order creation is NOT implemented in `OrderExecutor`:

```typescript
// From order.executor.ts
private async createEcommerceOrder(...): Promise<any> {
  this.logger.warn('E-commerce order creation not yet implemented');
  return {
    success: false,
    message: 'E-commerce order creation not yet implemented',
  };
}
```

---

### 3.4 Authentication Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                                 │
│                          (auth_v1)                                       │
└─────────────────────────────────────────────────────────────────────────┘

User: "Login" or triggered when auth required
         │
         ▼
┌─────────────────┐
│check_auth_status│ ─► already_authenticated? | has_phone? | need_phone?
│   (decision)    │
└────────┬────────┘
         │ need_phone
         ▼
┌─────────────────┐
│ collect_phone   │ ─► "Please enter your 10-digit mobile number"
│     (wait)      │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│ [validate_phone]│ ─► AuthExecutor: validate_phone
│                 │    Normalize to +91XXXXXXXXXX
└────────┬────────┘
         │ valid
         ▼
┌─────────────────┐
│    send_otp     │ ─► AuthExecutor: send_otp
│    (action)     │    PhpAuthService.sendOtp()
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│  collect_otp    │ ─► "OTP sent to +91XXXX. Enter 6-digit code"
│     (wait)      │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│ [verify_otp]    │ ─► AuthExecutor: verify_otp
│                 │    PhpAuthService.verifyOtp()
└────────┬────────┘
         │ valid
         ▼
┌─────────────────┐
│  check_profile  │ ─► is_personal_info = 0? ─► need_name
│   (decision)    │    profile complete? ─► auth_complete
└────────┬────────┘
         │ need_name
         ▼
┌─────────────────┐
│  collect_name   │ ─► "Welcome to Mangwale! Please tell me your name"
│     (wait)      │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│ [validate_name] │ ─► AuthExecutor: validate_name
└────────┬────────┘
         │ valid
         ▼
┌─────────────────┐
│ collect_email   │ ─► "Now please provide your email address"
│     (wait)      │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│[validate_email] │ ─► AuthExecutor: validate_email
└────────┬────────┘
         │ valid
         ▼
┌─────────────────┐
│ update_profile  │ ─► AuthExecutor: update_profile
│    (action)     │    PhpAuthService.updateUserInfo()
└────────┬────────┘
         │ success
         ▼
┌─────────────────┐
│  auth_complete  │ ─► "Welcome, {name}! How can I help?"
│     (end)       │    + Service buttons (Food, Parcel, Shop)
└─────────────────┘
```

**External API Calls (Auth):**

| Step | Service | PHP Endpoint | Purpose |
|------|---------|--------------|---------|
| send_otp | PhpAuthService | POST /api/v1/auth/verify-phone | Send OTP |
| verify_otp | PhpAuthService | POST /api/v1/auth/verify-otp | Verify OTP |
| update_profile | PhpAuthService | PUT /api/v1/customer/update-profile | Save name/email |
| getUserProfile | PhpAuthService | GET /api/v1/customer/info | Fetch profile |

---

### 3.5 Gamification Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GAMIFICATION FLOW                                   │
│                      (game_intro_v1)                                     │
└─────────────────────────────────────────────────────────────────────────┘

User: "I want to earn money" or "Play game"
         │
         ▼
┌─────────────────────┐
│  introduce_rewards  │ ─► Show game menu with buttons:
│      (action)       │    1. Intent Quest 🎯
│                     │    2. Language Master 🌍
│                     │    3. Tone Detective 😊
│                     │    4. Profile Builder 📝
│                     │    5. Leaderboard 🏆
└──────────┬──────────┘
           │ user_message
           ▼
┌─────────────────────┐
│   handle_selection  │ ─► Route based on input
│     (decision)      │
└──────────┬──────────┘
           │
     ┌─────┴─────┬─────────┬─────────┬────────┐
     ▼           ▼         ▼         ▼        ▼
 intent_   language_  tone_    profile_   leaderboard
 quest     master     detective builder
     │           │         │         │        │
     ▼           ▼         ▼         ▼        ▼
┌─────────────────────┐
│  start_<game_type>  │ ─► GameExecutor: action='start'
│      (action)       │    GameOrchestratorService.startGame()
└──────────┬──────────┘
           │ user_message
           ▼
┌─────────────────────┐
│     game_loop       │ ─► GameExecutor: action='answer'
│      (action)       │    GameOrchestratorService.processAnswer()
│                     │    ↺ Loop until game complete
└──────────┬──────────┘
           │ complete
           ▼
┌─────────────────────┐
│   game_finished     │ ─► "Would you like to play another game?"
│      (action)       │    + Yes/No buttons
└──────────┬──────────┘
           │ user_message
           ▼
┌─────────────────────┐
│ play_again_decision │ ─► yes ─► introduce_rewards
│     (decision)      │    no ─► completed
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│     completed       │
│       (end)         │
└─────────────────────┘
```

**Game Types & Services:**

| Game | Service | Reward | Purpose |
|------|---------|--------|---------|
| Intent Quest | IntentQuestService | ₹15 + 150pts | Train intent classification |
| Language Master | LanguageMasterService | ₹15 + 150pts | Train language detection |
| Tone Detective | ToneDetectiveService | ₹15 + 150pts | Train sentiment analysis |
| Profile Builder | ProfileBuilderService | ₹1/question | Collect user preferences |

**⚠️ GAP:** Leaderboard is hardcoded placeholder, not connected to real data.

---

### 3.6 Profile Completion Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROFILE COMPLETION FLOW                               │
│                   (profile_completion_v1)                                │
└─────────────────────────────────────────────────────────────────────────┘

User: "Complete my profile" or triggered after auth
         │
         ▼
┌─────────────────┐
│     welcome     │ ─► "Let's complete your profile..."
│    (action)     │    + "Let's Go" button
└────────┬────────┘
         ▼
┌─────────────────┐
│ask_dietary_type │ ─► Buttons: Vegetarian | Non-Veg | Vegan | Eggetarian
│    (action)     │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│save_dietary_type│ ─► PreferenceExecutor: save dietary_type
│    (action)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│  ask_allergies  │ ─► Buttons: None | Peanuts | Dairy | Gluten
│    (action)     │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│ save_allergies  │ ─► PreferenceExecutor: save allergies
│    (action)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│  ask_cuisines   │ ─► Buttons: Indian | Chinese | Italian | Mexican
│    (action)     │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│  save_cuisines  │ ─► PreferenceExecutor: save favorite_cuisines
│    (action)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ask_price_       │ ─► Buttons: Budget Friendly | Moderate | Premium
│sensitivity      │
│    (action)     │
└────────┬────────┘
         │ user_message
         ▼
┌─────────────────┐
│save_price_      │ ─► PreferenceExecutor: save price_sensitivity
│sensitivity      │
│    (action)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│    completed    │ ─► "Thanks! Your profile is updated"
│    (action)     │    + "Order Food Now" card
└────────┬────────┘
         ▼
┌─────────────────┐
│   end_state     │
│     (end)       │
└─────────────────┘
```

---

### 3.7 Order Tracking Journey (NOT A FLOW)

**⚠️ CRITICAL GAP:** Order tracking is NOT implemented as a flow. It exists only in:

1. `ConversationService.handleOrderHistory()` - Triggered by intent
2. `ConversationService.handleOrderHistorySelection()` - Handle selection
3. `PhpOrderService.getOrders()` / `getRunningOrders()` / `trackOrder()`

**Current Implementation (Legacy):**
```typescript
// conversation.service.ts
case 'order_history_selection':
  return this.handleOrderHistorySelection(phoneNumber, message);
```

**Suggested Flow Needed:** `order_tracking.flow.ts` with states for:
- `show_running_orders` - Display active orders
- `show_order_history` - Display past orders
- `track_specific_order` - Show detailed status + location
- `cancel_order` - Initiate cancellation
- `reorder` - Quick reorder from history

---

### 3.8 Support / Help Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HELP FLOW                                        │
│                        (help_v1)                                         │
└─────────────────────────────────────────────────────────────────────────┘

User: "Help" or "What can you do?"
         │
         ▼
┌─────────────────┐
│   show_help     │ ─► Display service cards:
│    (action)     │    🍕 Food Delivery
│                 │    📦 Parcel Delivery
│                 │    🛒 Shopping
│                 │    📞 Support
└────────┬────────┘
         ▼
┌─────────────────┐
│   completed     │ ─► Flow ends, user selects service
│     (end)       │
└─────────────────┘
```

**⚠️ GAP:** No actual "Contact Support" flow exists. The button triggers `contact_support` but no flow handles it.

---

## 4. Integration Points

### 4.1 NestJS Services

| Service | Module | Purpose |
|---------|--------|---------|
| FlowEngineService | flow-engine | Flow orchestration |
| SessionService | session | Context persistence |
| SearchService | search | OpenSearch queries |
| AsrService | asr | Voice to text |
| TtsService | tts | Text to voice |
| GameOrchestratorService | gamification | Game logic |
| SmartRecommendationService | order | Personalized suggestions |
| OrderHistoryService | order-flow | Order history formatting |

### 4.2 PHP Backend Endpoints

| Service | Endpoints | Purpose |
|---------|-----------|---------|
| PhpAuthService | `/auth/verify-phone`, `/auth/verify-otp` | Authentication |
| PhpOrderService | `/order/place`, `/order/list`, `/order/track` | Orders |
| PhpAddressService | `/address/list`, `/address/add` | Addresses |
| PhpParcelService | `/parcel/get-zone`, `/parcel/calculate-shipping` | Parcel |
| PhpStoreService | `/stores/search`, `/stores/popular` | Stores |
| PhpWalletService | `/wallet/balance`, `/wallet/transactions` | Wallet |
| PhpLoyaltyService | `/loyalty/points`, `/loyalty/redeem` | Loyalty |

### 4.3 OpenSearch Indices

| Index | Purpose | Key Fields |
|-------|---------|------------|
| `food_items_v3` | Food menu items | item_name, category, restaurant_name, price, veg |
| `ecom_items_v3` | E-commerce products | title, brand, category, mrp, images |
| `stores_v3` | Store information | name, type, zone_id, rating |

### 4.4 Voice Integration (ASR/TTS)

**ASR (Automatic Speech Recognition):**
- Whisper (local, vLLM)
- Google Cloud Speech-to-Text
- Azure Speech Services

**TTS (Text-to-Speech):**
- XTTS (local, neural)
- Google Cloud TTS
- Azure Speech Services

**Integration Points:**
- Voice messages from WhatsApp → ASR → Text for flow processing
- Flow responses → TTS → Voice reply (if requested)

---

## 5. Gaps and Issues

### 5.1 Critical Gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| 1 | **E-commerce order creation not implemented** | Users cannot complete e-commerce purchases | 🔴 CRITICAL |
| 2 | **No order tracking flow** | Users must use legacy code for tracking | 🔴 CRITICAL |
| 3 | **No support/contact flow** | "Contact Support" button does nothing | 🟠 HIGH |
| 4 | **Gamification leaderboard hardcoded** | Shows fake data | 🟠 HIGH |
| 5 | **No order cancellation flow** | Users cannot cancel via flow | 🟠 HIGH |

### 5.2 Missing Flows

| Flow | Trigger | Recommended States |
|------|---------|-------------------|
| `order_tracking.flow.ts` | `track_order\|where is my order` | show_orders, track_order, cancel_order |
| `support.flow.ts` | `contact_support\|help me\|complaint` | show_faq, collect_issue, create_ticket |
| `reorder.flow.ts` | `reorder\|order again\|same as last` | show_last_orders, confirm_reorder |
| `wallet.flow.ts` | `wallet\|balance\|add money` | show_balance, add_funds, transactions |

### 5.3 Hardcoded Values

| Location | Value | Should Be |
|----------|-------|-----------|
| `food-order.flow.ts` | Tax rate 0.05 (5%) | Config/DB based |
| `ecommerce-order.flow.ts` | Tax rate 0.18 (18%) | Config/DB based |
| `ecommerce-order.flow.ts` | Free shipping threshold ₹500 | Config/DB based |
| `parcel-delivery.flow.ts` | Zone ID 4 (Nashik) | Dynamic from zone service |
| `order.executor.ts` | senderZoneId: 4, deliveryZoneId: 4 | From zone lookup |
| `game-intro.flow.ts` | Leaderboard "User123 - 5000 pts" | Real data from DB |

### 5.4 Error Handling Gaps

| Flow | State | Issue |
|------|-------|-------|
| food-order | process_selection | LLM parsing can fail silently |
| parcel-delivery | extract_recipient_details | No validation of phone format |
| ecommerce-order | add_to_cart | Cart not actually persisted |
| all flows | distance_error | Fallback to 5km is misleading |

### 5.5 Integration Gaps

| Integration | Gap |
|-------------|-----|
| Payment Gateway | Only COD supported, no UPI/Card flow |
| Push Notifications | Not integrated with flows |
| Delivery Tracking | Real-time location not in flow |
| Coupons | No coupon application in flows |
| Wallet | No wallet payment option in flows |

---

## 6. Recommendations

### 6.1 Immediate Fixes (Priority 1)

1. **Implement E-commerce Order Creation**
   ```typescript
   // order.executor.ts - createEcommerceOrder()
   // Follow same pattern as createFoodOrder
   ```

2. **Create Order Tracking Flow**
   ```typescript
   // order-tracking.flow.ts
   {
     id: 'order_tracking_v1',
     trigger: 'track_order|where is my order|order status',
     states: {
       fetch_orders: { /* PhpOrderService.getRunningOrders() */ },
       show_orders: { /* Display list with tracking buttons */ },
       track_specific: { /* PhpOrderService.trackOrder() */ },
       show_location: { /* Map link + status */ }
     }
   }
   ```

3. **Create Support Flow**
   ```typescript
   // support.flow.ts
   {
     id: 'support_v1',
     trigger: 'contact_support|complaint|issue',
     states: {
       show_faq: { /* Common questions */ },
       collect_issue: { /* LLM: categorize issue */ },
       create_ticket: { /* PhpSupportService.createTicket() */ }
     }
   }
   ```

### 6.2 Configuration Improvements (Priority 2)

1. **Move hardcoded values to config/DB**
   - Tax rates per module
   - Shipping thresholds
   - Default zone IDs

2. **Create PricingConfigService**
   ```typescript
   // pricing-config.service.ts
   async getTaxRate(module: 'food' | 'ecommerce' | 'parcel'): Promise<number>
   async getFreeShippingThreshold(module: string): Promise<number>
   async getDeliveryRates(zoneId: number): Promise<RateConfig>
   ```

### 6.3 Flow Enhancements (Priority 3)

1. **Add payment method selection to all flows**
   - COD
   - UPI (Razorpay/PhonePe)
   - Wallet balance
   - Credit/Debit card

2. **Add coupon application state**
   ```typescript
   apply_coupon: {
     type: 'wait',
     actions: [{ executor: 'coupon', config: { action: 'validate' } }],
     transitions: { coupon_valid: 'show_discount', invalid: 'show_summary' }
   }
   ```

3. **Add reorder capability**
   - "Order again" button on order history
   - Pre-populate cart from previous order

### 6.4 Voice Integration Improvements

1. **Add voice-first states in flows**
   ```typescript
   // For voice interactions
   greet_voice: {
     type: 'wait',
     metadata: { preferVoice: true },
     actions: [{ executor: 'tts', config: { text: '...' } }]
   }
   ```

2. **Language detection for ASR**
   - Detect Hindi/Marathi/English automatically
   - Route to appropriate TTS voice

### 6.5 Monitoring & Analytics

1. **Add flow analytics**
   - Track drop-off rates per state
   - Measure time spent in each state
   - Identify common error states

2. **Add LLM quality metrics**
   - Track extraction accuracy
   - Monitor hallucination rates
   - Alert on repeated failures

---

## Appendix A: Flow State Types

| Type | Description | Auto-transition |
|------|-------------|-----------------|
| `action` | Execute actions, auto-proceed | Yes |
| `wait` | Execute actions, wait for user | No |
| `decision` | Evaluate conditions, route | Yes |
| `end` | Final state | N/A |

## Appendix B: Executor Reference

| Executor | Inputs | Outputs | Events |
|----------|--------|---------|--------|
| `llm` | prompt, systemPrompt, temperature | _last_response | success, error |
| `nlu` | extractEntities | {intent, entities} | success |
| `search` | index, query, filters | search_results | items_found, no_items |
| `address` | field, offerSaved | {address, lat, lng} | address_valid, waiting_for_input |
| `zone` | latPath, lngPath | zone_info | zone_valid, zone_invalid |
| `distance` | fromLatPath, toLngPath | distance (km) | calculated, error |
| `pricing` | type, items, distance | {total, tax, delivery} | calculated |
| `order` | type, itemsPath, addressPath | {orderId, status} | success, error |
| `parcel` | action (get_categories/calculate_shipping) | categories/pricing | *_fetched, *_calculated |
| `auth` | action (validate_phone/send_otp/etc) | result | valid, invalid, error |
| `game` | action (start/answer), gameType | question/result | complete |
| `response` | message, buttons, cards | _last_response | - |
| `preference` | key, valuePath | - | - |

---

*Document generated by comprehensive flow analysis*  
*Last updated: November 30, 2025*
