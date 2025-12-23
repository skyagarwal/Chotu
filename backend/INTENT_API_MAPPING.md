# Complete Intent-to-API Mapping
## Mangwale NLU System - Nashik Hyperlocal Model

**Generated:** November 13, 2025  
**Total Intents:** 35  
**API Coverage:** 94.3% (33/35 mapped)  
**Missing APIs:** 2 (parcel creation endpoints)

---

## 📊 Summary

| Category | Count | Percentage |
|----------|-------|------------|
| ✅ Mapped to APIs | 33 | 94.3% |
| ✅ No API needed (conversational) | 6 | 17.1% |
| ❌ Missing APIs | 2 | 5.7% |

---

## 🍔 Food Module (11 Intents)

### intent.food.item.search
- **Status:** ✅ MAPPED
- **API:** `GET /items/search?name={query}`
- **Description:** Search for food items by name
- **Example:** "pizza dhundo", "biryani dikha"
- **Response:** List of matching food items with prices, ratings

### intent.food.item.details
- **Status:** ✅ MAPPED
- **API:** `GET /items/details/{item_id}`
- **Description:** Get detailed information about a specific food item
- **Example:** "is pizza ki details batao"
- **Response:** Item name, description, price, variants, add-ons, store info

### intent.food.store.search
- **Status:** ✅ MAPPED
- **API:** `GET /stores/search?name={query}`
- **Description:** Search for restaurants/food stores
- **Example:** "restaurant dhundo", "KFC kaha hai"
- **Response:** List of matching stores with ratings, delivery time

### intent.food.store.menu
- **Status:** ✅ MAPPED
- **API:** `GET /stores/details/{store_id}` + `GET /stores/popular-items/{store_id}`
- **Description:** View restaurant menu and popular items
- **Example:** "store ka menu dikhao", "popular items kya hai"
- **Response:** Store details + list of items/popular items

### intent.food.cart.add
- **Status:** ✅ MAPPED
- **API:** `POST /customer/cart/add`
- **Body:** `{item_id, quantity, variant, addon_ids, addon_quantities}`
- **Description:** Add food item to cart
- **Example:** "cart mein add karo", "2 pizza daal do"
- **Response:** Updated cart with total

### intent.food.cart.view
- **Status:** ✅ MAPPED
- **API:** `GET /customer/cart/list`
- **Description:** View current cart contents
- **Example:** "cart dikhao", "mere cart mein kya hai"
- **Response:** List of cart items with quantities, total price

### intent.food.cart.update
- **Status:** ✅ MAPPED
- **API:** `POST /customer/cart/update`
- **Body:** `{cart_id, quantity}`
- **Description:** Update quantity or remove items from cart
- **Example:** "quantity 3 karo", "ye item nikalo"
- **Response:** Updated cart

### intent.food.order.place
- **Status:** ✅ MAPPED
- **API:** `POST /customer/order/place`
- **Body:** `{store_id, delivery_address_id, payment_method, delivery_instruction}`
- **Description:** Place food order from cart
- **Example:** "order karo", "place order"
- **Response:** Order ID, estimated delivery time

### intent.food.order.track
- **Status:** ✅ MAPPED
- **API:** `GET /customer/order/running-orders` + `PUT /customer/order/track?order_id={id}`
- **Description:** Track specific food order status
- **Example:** "food order kaha hai", "mere order ka status"
- **Response:** Order status, driver location, ETA

### intent.food.price
- **Status:** ✅ MAPPED
- **API:** `GET /items/details/{item_id}` (extract price field)
- **Description:** Get price of food item
- **Example:** "pizza ka price kya hai", "kitne ka hai"
- **Response:** Item price (with variants if applicable)

### intent.food.delivery_status
- **Status:** ✅ MAPPED
- **API:** `GET /customer/order/running-orders` + `GET /customer/order/details?order_id={id}`
- **Description:** Check current delivery status of food order
- **Example:** "delivery kab hogi", "kitni der lagegi"
- **Response:** Current status (preparing/on_the_way/delivered), ETA

---

## 📦 Parcel Module (6 Intents)

### intent.parcel.create
- **Status:** ❌ MISSING API
- **API:** ⚠️ NOT FOUND - Need parcel booking endpoint
- **Description:** Create new parcel delivery booking
- **Example:** "parcel send karna hai", "courier chahiye"
- **Expected API:** `POST /customer/parcel/create` with pickup/delivery addresses

### intent.parcel.price
- **Status:** ❌ MISSING API
- **API:** ⚠️ NOT FOUND - Need parcel pricing endpoint
- **Description:** Get parcel delivery price estimate
- **Example:** "parcel ka rate kya hai", "cost estimate do"
- **Expected API:** `GET /customer/parcel/price-estimate?distance={km}&weight={kg}`

### intent.parcel.track
- **Status:** ✅ MAPPED (unified order API)
- **API:** `GET /customer/order/running-orders` + `PUT /customer/order/track?order_id={id}`
- **Description:** Track parcel delivery status
- **Example:** "parcel kaha hai", "delivery status check karo"
- **Response:** Parcel location, driver info, ETA

### intent.parcel.delivery_eta
- **Status:** ✅ MAPPED
- **API:** `GET /customer/order/details?order_id={id}` (extract estimated_delivery_time)
- **Description:** Get estimated delivery time for parcel
- **Example:** "parcel kab aayega", "kitni der mein pahunchega"
- **Response:** Estimated delivery time

### intent.parcel.contact_driver
- **Status:** ✅ MAPPED
- **API:** `GET /customer/order/details?order_id={id}` (extract delivery_man.phone)
- **Description:** Get delivery driver contact from order details
- **Example:** "driver ka number do", "driver se baat karni hai"
- **Response:** Driver name, phone number

### intent.parcel.cancel
- **Status:** ✅ MAPPED
- **API:** `PUT /customer/order/cancel`
- **Body:** `{order_id, reason}`
- **Description:** Cancel parcel delivery
- **Example:** "parcel cancel karo", "order cancel kar do"
- **Response:** Cancellation confirmation, refund info

---

## 🛒 Ecommerce Module (8 Intents)

### intent.ecommerce.item.search
- **Status:** ✅ MAPPED
- **API:** `GET /items/search?name={query}`
- **Description:** Search shop/ecommerce items
- **Example:** "mobile phone dhundo", "headphones dikha"
- **Response:** List of matching products

### intent.ecommerce.item.details
- **Status:** ✅ MAPPED
- **API:** `GET /items/details/{item_id}`
- **Description:** Get shop item details
- **Example:** "is product ki details batao", "specifications kya hai"
- **Response:** Product details, specs, reviews

### intent.ecommerce.cart.add
- **Status:** ✅ MAPPED
- **API:** `POST /customer/cart/add`
- **Description:** Add item to shopping cart
- **Example:** "cart mein add karo", "ye le lo"
- **Response:** Updated cart

### intent.ecommerce.cart.view
- **Status:** ✅ MAPPED
- **API:** `GET /customer/cart/list`
- **Description:** View shopping cart
- **Example:** "cart dikhao", "shopping cart check karo"
- **Response:** Cart items, total

### intent.ecommerce.order.place
- **Status:** ✅ MAPPED
- **API:** `POST /customer/order/place`
- **Description:** Place ecommerce order
- **Example:** "order karo", "buy kar lo"
- **Response:** Order confirmation, delivery ETA

### intent.ecommerce.order.track
- **Status:** ✅ MAPPED
- **API:** `GET /customer/order/running-orders` + `PUT /customer/order/track?order_id={id}`
- **Description:** Track ecommerce order
- **Example:** "order kaha hai", "tracking dikhao"
- **Response:** Order status, tracking info

### intent.ecommerce.payment_info
- **Status:** ✅ MAPPED
- **API:** `GET /config/get-PaymentMethods`
- **Description:** Get available payment methods
- **Example:** "payment kaise karu", "payment options kya hai"
- **Response:** List of payment methods (COD, card, wallet, UPI)

### intent.ecommerce.return_policy
- **Status:** ✅ MAPPED
- **API:** `GET /refund-policy`
- **Description:** Get return/refund policy information
- **Example:** "return policy kya hai", "refund milega kya"
- **Response:** Return policy text, refund conditions

---

## 🌐 Common/General Intents (10 Intents)

### intent.greeting
- **Status:** ✅ NO API NEEDED (conversational)
- **Description:** Handle greetings like hi, hello, namaste
- **Example:** "hello", "hi", "namaste"
- **Response:** "Namaste! Main aapki kaise madad kar sakta hoon?"

### intent.help
- **Status:** ✅ NO API NEEDED (conversational)
- **API (optional):** `GET /config` for capabilities
- **Description:** User needs help/assistance
- **Example:** "help chahiye", "kya kar sakte ho"
- **Response:** List of available features/services

### intent.order.track
- **Status:** ✅ MAPPED (HYPERLOCAL UNIFIED)
- **API:** `GET /customer/order/running-orders` + `PUT /customer/order/track?order_id={id}`
- **Description:** Track ANY order (food/parcel/ecom) - hyperlocal unified
- **Example:** "mera order kaha hai", "order check karna hai"
- **Response:** All running orders across modules, tracking details
- **Note:** Module-independent for Nashik hyperlocal model

### intent.order.status
- **Status:** ✅ MAPPED (HYPERLOCAL UNIFIED)
- **API:** `GET /customer/order/running-orders`
- **Description:** Get status of all running orders
- **Example:** "order check karna hai", "status batao"
- **Response:** List of all active orders with statuses
- **Note:** Searches food + parcel + ecommerce orders

### intent.general.acknowledge
- **Status:** ✅ NO API NEEDED (conversational)
- **Description:** Acknowledgment like okay, thik hai
- **Example:** "thik hai", "okay", "haan"
- **Response:** Continue conversation flow

### intent.general.confirm
- **Status:** ✅ NO API NEEDED (conversational)
- **Description:** Confirm action
- **Example:** "haan kar do", "confirm karo", "yes"
- **Response:** Proceed with confirmed action

### intent.general.deny
- **Status:** ✅ NO API NEEDED (conversational)
- **Description:** Reject/cancel action
- **Example:** "nahi", "cancel karo", "mat karo"
- **Response:** Cancel current action

### intent.general.stop
- **Status:** ✅ NO API NEEDED (conversational)
- **Description:** Stop current action
- **Example:** "bas karo", "stop", "band karo"
- **Response:** End current conversation flow

### intent.general.continue
- **Status:** ✅ NO API NEEDED (conversational)
- **Description:** Continue conversation
- **Example:** "aur kuch", "continue", "aage batao"
- **Response:** Prompt for next action/query

### intent.general.capabilities
- **Status:** ✅ MAPPED
- **API:** `GET /config` + `GET /module`
- **Description:** What can the system do
- **Example:** "tum kya kar sakte ho", "features kya hai"
- **Response:** List of modules (food, parcel, ecom) and capabilities

---

## 🎯 Hyperlocal Unified APIs (Nashik Single-City Model)

These APIs work **across ALL modules** (food/parcel/ecommerce) without module-specific separation:

### 1. GET /customer/order/list
- **Purpose:** Returns all customer orders (food + parcel + ecom)
- **Use Case:** "mujhe apne sare orders dikhao"
- **Response:** Complete order history across all modules

### 2. GET /customer/order/running-orders
- **Purpose:** Returns currently active orders across modules
- **Use Case:** "mere running orders kya hai", "current orders dikhao"
- **Response:** All pending/in-progress orders
- **Intent Mapping:** intent.order.status, intent.order.track

### 3. PUT /customer/order/track?order_id={id}
- **Purpose:** Track any order by ID (module-independent)
- **Use Case:** "order 12345 kaha hai"
- **Response:** Real-time location, driver info, ETA
- **Intent Mapping:** intent.order.track, intent.food.order.track, intent.parcel.track, intent.ecommerce.order.track

### 4. GET /customer/order/details?order_id={id}
- **Purpose:** Get full order details (module-independent)
- **Use Case:** "order ki puri details batao"
- **Response:** Items, price, status, driver, delivery address, timestamps
- **Intent Mapping:** intent.parcel.delivery_eta, intent.parcel.contact_driver, intent.food.delivery_status

### 5. PUT /customer/order/cancel
- **Purpose:** Cancel any order (module-independent)
- **Body:** `{order_id, reason}`
- **Use Case:** "order cancel karna hai"
- **Response:** Cancellation confirmation, refund timeline
- **Intent Mapping:** intent.parcel.cancel

### 6. GET /customer/cart/list
- **Purpose:** View cart (contains items from all modules)
- **Use Case:** "cart dikhao"
- **Response:** Unified cart with food + ecommerce items
- **Intent Mapping:** intent.food.cart.view, intent.ecommerce.cart.view

### 7. POST /customer/cart/add
- **Purpose:** Add items to cart (food/parcel/ecom)
- **Body:** `{item_id, quantity, variant, addon_ids}`
- **Use Case:** "cart mein add karo"
- **Response:** Updated unified cart
- **Intent Mapping:** intent.food.cart.add, intent.ecommerce.cart.add

---

## ⚠️ Critical Gaps - Missing API Endpoints

### 1. Parcel Creation API ❌

**Intent:** `intent.parcel.create`

**Expected Endpoint:** `POST /customer/parcel/create`

**Expected Body:**
```json
{
  "pickup_address_id": 1,
  "delivery_address_id": 2,
  "package_type": "small|medium|large",
  "package_weight": 2.5,
  "package_description": "Books and documents",
  "delivery_urgency": "standard|express",
  "payment_method": "cash_on_delivery"
}
```

**User Examples:**
- "parcel send karna hai"
- "courier book karo"
- "pickup arrange karo"

**Workaround:** Currently no parcel booking via API - may need manual intervention

---

### 2. Parcel Pricing API ❌

**Intent:** `intent.parcel.price`

**Expected Endpoint:** `GET /customer/parcel/price-estimate?distance={km}&weight={kg}&urgency={type}`

**Expected Response:**
```json
{
  "base_price": 50,
  "distance_charge": 30,
  "weight_charge": 20,
  "urgency_charge": 10,
  "total_estimate": 110,
  "currency": "INR"
}
```

**User Examples:**
- "parcel ka rate kya hai"
- "cost estimate do"
- "kitna lagega parcel bhejne mein"

**Workaround:** May need to fetch pricing from general config or hardcoded rates

---

## 🔄 Shared/Unified Endpoints

These endpoints serve **multiple intents** across different modules:

### GET /items/search?name={query}
- **Serves:** intent.food.item.search, intent.ecommerce.item.search
- **Note:** Same API for food and ecommerce item search
- **Filter:** Backend likely filters by module/category

### GET /items/details/{item_id}
- **Serves:** intent.food.item.details, intent.ecommerce.item.details, intent.food.price
- **Note:** Returns complete item info including price

### POST /customer/cart/add
- **Serves:** intent.food.cart.add, intent.ecommerce.cart.add
- **Note:** Unified cart across modules

### GET /customer/cart/list
- **Serves:** intent.food.cart.view, intent.ecommerce.cart.view
- **Note:** Shows all items regardless of module

### POST /customer/order/place
- **Serves:** intent.food.order.place, intent.ecommerce.order.place
- **Note:** Unified order placement

---

## 📝 Usage Guidelines for NLU System

### Intent Classification Logic

1. **Module-Specific Intents** (Food, Parcel, Ecommerce)
   - Use when user explicitly mentions module ("food order", "parcel bhejo")
   - Map to specific endpoints with module context

2. **Module-Independent Intents** (General)
   - Use for unified queries ("mera order", "cart dikhao")
   - Leverage hyperlocal unified APIs
   - Backend searches across all modules

3. **Conversational Intents**
   - No API calls needed
   - Handle via dialogue management
   - Maintain conversation state

### Confidence Thresholds

- **High confidence (> 0.85):** Direct API call
- **Medium confidence (0.70-0.85):** Confirm with user before API call
- **Low confidence (< 0.70):** Send to Label Studio for review

### Hyperlocal Optimization (Nashik Model)

- **Single City:** No need for zone/location disambiguation
- **Unified Orders:** Customer doesn't care about module separation
- **Simplified UX:** "mera order" searches everything automatically
- **Fast Response:** Fewer API calls due to unified architecture

---

## 🚀 Next Steps

### For Missing APIs
1. **Parcel Creation:** Check if admin panel has parcel booking, reverse-engineer API
2. **Parcel Pricing:** Extract pricing logic from database or config

### For Training
1. ✅ Use this mapping to validate annotations
2. ✅ Ensure examples in training data match API capabilities
3. ✅ Add more hyperlocal examples (Nashik-specific phrases)
4. ✅ Test edge cases where module is ambiguous

### For Production
1. ✅ Cache frequently used APIs (config, payment methods)
2. ✅ Implement fallback for missing parcel APIs
3. ✅ Monitor intent-to-API success rates
4. ✅ Log mismatches for continuous improvement

---

**Document Version:** 1.0  
**Last Updated:** November 13, 2025  
**Maintained By:** Mangwale AI Team  
**Review Required:** When new APIs are added or intents change
