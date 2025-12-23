# Complete Parcel Booking Flow - Authentication & Session Management

## Overview
This document explains how authentication, session management, and the complete parcel booking flow work in mangwale-ai.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    User Journey                              │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Welcome & Authentication                                 │
│     - Session created in Redis                               │
│     - User chooses login method (OTP or Facebook)            │
│     - Phone number validation & OTP verification             │
│     - Auth token stored in session                           │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Module Selection                                         │
│     - User authenticated → shown available modules           │
│     - Modules: Parcel, Food, Grocery, etc.                   │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Parcel Booking Flow (AI-Powered)                         │
│     - Session step: parcel_delivery_ai                       │
│     - ParcelService handles conversation                     │
│     - Calls Admin Backend Agent for responses                │
│     - Collects: pickup, delivery, details                    │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Order Creation                                           │
│     - Validates zones (pickup & delivery)                    │
│     - Creates order in PHP backend                           │
│     - Uses auth_token from session                           │
│     - Returns order confirmation                             │
└─────────────────────────────────────────────────────────────┘
```

## Session Flow States

### State Machine

```
welcome
  ↓ (user says "hi")
login_method
  ↓ (user selects "1" for OTP)
awaiting_phone_number
  ↓ (user enters phone: 9876543210)
awaiting_otp
  ↓ (user enters OTP: 123456)
  ├─→ awaiting_name (if new user/no name in DB)
  │    ↓ (user provides name)
  │   awaiting_email
  │    ↓ (user provides email)
  └─→ main_menu / modules (if existing user)
       ↓ (user selects parcel)
      parcel_delivery_ai
       ↓ (AI conversation + data collection)
      checkout
       ↓ (user confirms)
      order_created
```

## Authentication Flow Details

### Step 1: Welcome
**Session Step:** `welcome`

**User Action:** Types "hi", "hello", "hey", or "start"

**Bot Response:**
```
👋 Welcome to Mangwale Parcel Service!

Please choose how you want to continue:

1️⃣ Login with OTP 📱
2️⃣ Login with Facebook 📘

Reply with 1 or 2:
```

### Step 2: Login Method Selection
**Session Step:** `login_method`

**User Action:** Types "1" (OTP) or "2" (Facebook)

**For OTP (Option 1):**
Bot requests phone number and moves to `awaiting_phone_number`

### Step 3: Phone Number Input
**Session Step:** `awaiting_phone_number`

**Phone Number Normalization:**
- User enters: `9876543210` (10 digits)
- System normalizes to: `+919876543210`
- Handles: 10-digit, 12-digit (91...), international formats

**Backend Actions:**
1. **Database Check:** Queries PHP MySQL for existing user
   - Checks `users` table
   - Checks `customer_addresses` table
   - Updates `users.phone` if found in addresses only

2. **Send OTP:** Calls PHP backend `/api/v1/auth/send-otp`
   - PHP handles both new and existing users
   - OTP sent via SMS

**Bot Response:**
```
✅ **OTP Sent**

📲 We've sent a verification code to +919876543210

🔢 Please enter the 6-digit OTP code:
```

### Step 4: OTP Verification
**Session Step:** `awaiting_otp`

**User Action:** Enters 6-digit OTP (e.g., `123456`)

**Backend Actions:**
1. **Verify OTP:** Calls PHP `/api/v1/auth/verify-otp`
2. **Check User Status:**
   - `is_personal_info = 0` → New user or missing name → collect name/email
   - `is_personal_info = 1` → Existing user → get JWT token

**For New User (is_personal_info = 0):**
```
🎉 Welcome to Mangwale!

To complete your registration, please tell me your full name:
```
Session moves to `awaiting_name`

**For Existing User (is_personal_info = 1):**
- JWT token stored: `session.auth_token`
- User profile fetched
- Shows modules menu

### Step 5: Complete Registration (New Users Only)
**Session Step:** `awaiting_name` → `awaiting_email`

**Collect Name:**
```
User: John Doe
Bot: ✅ Got it, John Doe!

Please provide your email address:
```

**Collect Email:**
```
User: john@example.com
Bot: ✅ Email saved!

[Shows modules menu]
```

**Backend Actions:**
- Updates user profile via PHP API
- Stores JWT token in session
- User is now fully authenticated

## Session Data Structure

### Key Session Fields

```typescript
{
  // Authentication
  auth_token: "eyJhbGc...",        // JWT from PHP backend
  auth_phone: "+919876543210",     // Normalized phone
  user_name: "John Doe",           // User's full name
  authenticated: true,             // Auth status
  
  // OTP Flow
  otp_phone: "+919876543210",      // Phone for OTP
  awaiting_personal_info: false,   // New user flag
  
  // Session Management
  currentStep: "parcel_delivery_ai", // Current flow step
  platform: "whatsapp",              // Channel (whatsapp, telegram, http)
  
  // Order Data (collected during flow)
  pickup_location: "...",
  delivery_location: "...",
  pickup_coordinates: { lat, lng },
  delivery_coordinates: { lat, lng },
  pickup_zone_id: 1,
  delivery_zone_id: 2,
  module_id: 3,                      // Module (3 = parcel)
  parcel_description: "...",
  recipient_name: "...",
  recipient_phone: "...",
  payment_method: "cash_on_delivery",
  
  // Redis TTL: 24 hours (86400 seconds)
}
```

## Parcel AI Flow

### Starting the Flow

**Method 1: From Main Menu**
User navigates through authentication → modules → selects parcel

**Method 2: Direct Start (Testing)**
```bash
curl -X POST http://localhost:3200/chat/start/parcel/USER_ID
```
Directly sets session step to `parcel_delivery_ai`

### Parcel Conversation States

The parcel flow uses AI agent responses from admin backend:

**Intent Recognition (Mock Agent):**
- **Parcel/Ship keywords** → "Great, let's book a parcel. Where should we pick up from?"
- **Track keywords** → "Please provide your order or tracking ID."
- **Generic** → "How can I help you with parcel delivery today?"

### Full Parcel Booking Conversation Example

```
User: I want to send a parcel
Bot: Great, let's book a parcel. Where should we pick up from?

User: MG Road, Pune
Bot: [Validates location, gets coordinates]
    Got it! Pickup from MG Road, Pune.
    
    Now, where should we deliver it?

User: FC Road, Pune
Bot: [Validates delivery location]
    Perfect! We'll deliver to FC Road, Pune.
    
    What are you sending?

User: Documents
Bot: What's the approximate weight?

User: Less than 1kg
Bot: Great! Who is the recipient?

User: Rahul Kumar
Bot: What's the recipient's phone number?

User: 9123456789
Bot: How would you like to pay?
    1️⃣ Cash on Delivery
    2️⃣ Online Payment
    3️⃣ Wallet

User: 1
Bot: [Creates order via PHP backend]
    ✅ Order placed successfully!
    
    Order ID: #ORD-12345
    Pickup: MG Road, Pune
    Delivery: FC Road, Pune
    Estimated charge: ₹50
    
    We'll send a driver shortly!
```

## Testing the Complete Flow

### Test Script Usage

```bash
cd /home/ubuntu/Devs/mangwale-ai

# Run interactive test
./test-parcel-booking.sh

# Or test individual steps
RECIPIENT="test-$(date +%s)"

# 1. Welcome
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$RECIPIENT\",\"text\":\"hi\"}"

# 2. Select OTP
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$RECIPIENT\",\"text\":\"1\"}"

# 3. Enter phone
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$RECIPIENT\",\"text\":\"9876543210\"}"

# 4. Get OTP from PHP logs, then verify
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$RECIPIENT\",\"text\":\"123456\"}"

# 5. Skip to parcel flow
curl -X POST "http://localhost:3200/chat/start/parcel/$RECIPIENT"

# 6. Start conversation
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$RECIPIENT\",\"text\":\"I want to send a parcel\"}"

# 7. Check responses
curl http://localhost:3200/chat/messages/$RECIPIENT | jq .
```

### Testing via Web UI

1. Open: `file:///home/ubuntu/Devs/Mangwale AI Front end/index.html`
2. Enter recipient ID
3. Set API URL: `http://localhost:3200`
4. Click "Connect"
5. Start conversation with "hi"

## Authentication Services

### PHP Auth Service (PhpAuthService)

```typescript
// Send OTP
await phpAuthService.sendOtp('+919876543210')
// Returns: { success: true, message: "OTP sent" }

// Verify OTP
await phpAuthService.verifyOtp('+919876543210', '123456')
// Returns: { 
//   success: true, 
//   data: { 
//     token: "eyJhbGc...", 
//     is_personal_info: 1 
//   } 
// }

// Get User Profile
await phpAuthService.getUserProfile(token)
// Returns: { firstName, lastName, phone, email }
```

### Session Service

```typescript
// Create session
await sessionService.createSession(phoneNumber)

// Get session
const session = await sessionService.getSession(phoneNumber)

// Set step
await sessionService.setStep(phoneNumber, 'parcel_delivery_ai')

// Store data
await sessionService.setData(phoneNumber, { 
  auth_token: token,
  authenticated: true 
})

// Get specific data
const token = await sessionService.getData(phoneNumber, 'auth_token')
```

## Order Creation Flow

### Prerequisites
- User authenticated (`auth_token` in session)
- Pickup & delivery locations validated
- Zone IDs determined
- Module selected (module_id = 3 for parcel)

### Order Payload
```typescript
{
  // Authentication
  // Uses auth_token from session as Bearer token
  
  // Payment
  payment_method: 'cash_on_delivery' | 'digital_payment' | 'wallet',
  partial_payment: 0 | 1,
  
  // Recipient
  receiver_name: "Rahul Kumar",
  receiver_phone: "+919123456789",
  receiver_email: "user@email.com",
  
  // Delivery
  delivery_address: "FC Road, Pune",
  delivery_latitude: 18.5204,
  delivery_longitude: 73.8567,
  delivery_zone_id: 2,
  delivery_landmark: "Near XYZ Mall",
  receiver_floor: "3rd Floor",
  receiver_road: "FC Road",
  receiver_house: "Building A",
  
  // Pickup
  pickup_address: "MG Road, Pune",
  pickup_latitude: 18.5314,
  pickup_longitude: 73.8446,
  pickup_zone_id: 1,
  pickup_landmark: "Near ABC Store",
  pickup_floor: "Ground",
  pickup_road: "MG Road",
  pickup_house: "Shop 15",
  
  // Module & Zone
  module_id: 3,              // From config: DEFAULT_PARCEL_MODULE_ID
  zone_ids: [1, 2],          // Pickup zones (JSON array)
  
  // Pricing
  distance: 5.2,             // km
  delivery_charge: 78,       // ₹15/km, min ₹50
  dm_tips: 0,
  
  // Order details
  order_note: "Parcel: Documents. Weight: <1kg",
  order_type: 'delivery',
}
```

### PHP Endpoint
```
POST https://testing.mangwale.com/api/v1/customer/order/place
Authorization: Bearer {auth_token}
Content-Type: application/json
```

## Common Issues & Solutions

### Issue 1: "Error processing your request"
**Cause:** PHP backend or MySQL not accessible
**Solution:** 
- Check PHP backend: `curl https://testing.mangwale.com/health`
- Verify MySQL connection in PHP backend

### Issue 2: OTP not received
**Cause:** SMS gateway not configured or phone not valid
**Solution:**
- Check PHP backend logs for OTP code
- Use test phone numbers if available
- Verify SMS service credentials

### Issue 3: "Session expired"
**Cause:** Redis session TTL expired (24 hours)
**Solution:**
- Start new conversation with "hi"
- Sessions auto-create on first message

### Issue 4: Mock agent not responding
**Cause:** Admin backend not running or wrong endpoint
**Solution:**
- Check admin backend: `curl http://localhost:3002/health`
- Verify ADMIN_BACKEND_URL and API key
- Check server routing (agents router before agentExecute router)

### Issue 5: WhatsApp errors in logs
**Cause:** WhatsApp credentials not configured (expected in test mode)
**Solution:**
- Ignore if using HTTP chat endpoints
- These are warning logs, not blocking errors
- Configure WHATSAPP_ACCESS_TOKEN for real WhatsApp integration

## Environment Variables

```bash
# mangwale-ai
TEST_MODE=true                              # Enable test mode (stores replies in Redis)
REDIS_HOST=127.0.0.1                        # Redis server
REDIS_PORT=6379
PORT=3200                                   # Server port

# Authentication & Backend
PHP_API_BASE_URL=https://testing.mangwale.com
ADMIN_BACKEND_URL=http://localhost:3002
ADMIN_BACKEND_API_KEY=bootstrap_key_12345

# Module Configuration
DEFAULT_PARCEL_MODULE_ID=3                  # Default module for parcel orders

# Optional (for full WhatsApp integration)
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
```

## Next Steps

1. **Test Full Flow:** Run through authentication → module selection → parcel booking
2. **Verify Order Creation:** Check PHP backend for created orders
3. **Configure LLM:** Set up full admin backend with LLM models for smarter responses
4. **Add Training Data:** Use conversation logger to improve NLU
5. **Deploy Channels:** Configure WhatsApp/Telegram webhooks for production use

## Files Reference

- **Conversation Flow:** `src/conversation/services/conversation.service.ts`
- **Session Management:** `src/session/session.service.ts`
- **PHP Auth:** `src/php-integration/services/php-auth.service.ts`
- **Parcel Service:** `src/parcel/services/parcel.service.ts`
- **Order Creation:** `src/php-integration/services/php-order.service.ts`
- **Test Scripts:** `test-integration.sh`, `test-parcel-booking.sh`
- **Documentation:** `TESTING.md`, `FLOWS.md` (this file)
