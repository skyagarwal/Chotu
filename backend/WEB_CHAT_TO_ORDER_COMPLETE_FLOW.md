# 🌐 WEB CHAT TO ORDER - COMPLETE FLOW

**Date**: November 5, 2025  
**Status**: ✅ System Ready - Needs Testing  
**Purpose**: Complete end-to-end flow from web chat to order creation

---

## 🎯 SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│                    USER (Web Chat Interface)                      │
│                    chat.mangwale.ai/chat                         │
└─────────────────────────────┬────────────────────────────────────┘
                              │ WebSocket (Socket.IO)
                              │ ws://100.121.40.69:3200
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│               MANGWALE-AI (Conversation Engine)                   │
│                 Port 3201 → 3200 (Docker)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ChatGateway (WebSocket Handler)                          │  │
│  │  - Receives: message:send                                 │  │
│  │  - Emits: message (bot response)                          │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        ▼                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ConversationService (Channel-Agnostic Logic)             │  │
│  │  - Session management (Redis)                             │  │
│  │  - Authentication flow                                    │  │
│  │  - Main menu routing                                      │  │
│  │  - Parcel flow orchestration                              │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        ▼                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ParcelService (AI + Guidelines)                          │  │
│  │  - AI mode: Agent-based responses (vLLM)                  │  │
│  │  - Fallback: Structured questions                         │  │
│  │  - Address collection, validation                         │  │
│  │  - Price calculation (OSRM + PHP)                         │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Admin Backend│  │  PHP Backend │  │    Redis     │
│  Port 3002   │  │testing.mang..│  │  Port 6379   │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ • Conversation│  │ • Auth/OTP   │  │ • Sessions   │
│   Logging     │  │ • User mgmt  │  │ • State      │
│ • NLU (AI)    │  │ • Order      │  │ • Cache      │
│ • vLLM proxy  │  │   creation   │  │              │
│ • Training    │  │ • Address    │  │              │
│   data        │  │   storage    │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
                         │
                         ▼
                ┌──────────────┐
                │  PostgreSQL  │
                │  Port 5433   │
                ├──────────────┤
                │ • Users      │
                │ • Orders     │
                │ • Addresses  │
                └──────────────┘
```

---

## 📋 COMPLETE FLOW BREAKDOWN

### **Phase 1: Initial Connection**

```
User Action: Opens chat.mangwale.ai/chat
├─ Chat interface loads (chat-ws.html)
├─ Socket.IO connects to ws://100.121.40.69:3200
├─ Session ID: web-{phone} (e.g., "web-+919876543210")
└─ Status: "Connected"
```

**Code**: `/home/ubuntu/Devs/Mangwale AI Front end/chat-ws.html`
```javascript
socket = io('http://100.121.40.69:3200', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  socket.emit('join', { sessionId: currentPhone });
});
```

**Backend**: `/home/ubuntu/Devs/mangwale-ai/src/chat/chat.gateway.ts`
```typescript
@SubscribeMessage('session:join')
async handleJoinSession(@MessageBody() data: { sessionId: string }) {
  await this.sessionService.setData(sessionId, { platform: 'web' });
  await client.join(sessionId);
  // Load history...
}
```

---

### **Phase 2: Authentication Flow**

#### **Step 1: Welcome** (`currentStep: welcome`)

```
User: "hi"
Bot: "👋 Welcome to Mangwale Parcel Service!
      
      Please choose how you want to continue:
      
      1️⃣ Login with OTP 📱
      2️⃣ Login with Facebook 📘
      
      Reply with 1 or 2:"

Session: { currentStep: "login_method", authenticated: null }
```

**Code**: `ConversationService.handleWelcome()` → `showLoginOptions()`

#### **Step 2: Select Login Method** (`currentStep: login_method`)

```
User: "1"
Bot: "📱 **Phone Number Verification**
      
      Please enter your 10-digit mobile number:
      
      📝 Examples:
        • 9923383838
        • 9158886329
      
      (Don't add +91 or country code - we'll add it automatically)"

Session: { currentStep: "awaiting_phone_number" }
```

**Code**: `ConversationService.handleLoginMethod()` → `requestPhoneNumber()`

#### **Step 3: Enter Phone Number** (`currentStep: awaiting_phone_number`)

```
User: "9876543210"
System: 
  ├─ Normalizes: "9876543210" → "+919876543210"
  ├─ Stores: session.otp_phone = "+919876543210"
  ├─ Calls: PhpAuthService.sendOtp("+919876543210")
  └─ PHP Backend: POST /api/v1/customer/auth/send-otp

Bot: "✅ **OTP Sent**
      
      📲 We've sent a verification code to +919876543210
      
      🔢 Please enter the 6-digit OTP code:"

Session: { currentStep: "awaiting_otp", otp_phone: "+919876543210" }
```

**Code**: `ConversationService.handlePhoneNumberInput()` → `PhpAuthService.sendOtp()`

**PHP Endpoint**: `POST /api/v1/customer/auth/send-otp`
```json
{
  "phone": "+919876543210"
}
```

#### **Step 4: Enter OTP** (`currentStep: awaiting_otp`)

```
User: "123456"
System:
  ├─ Calls: PhpAuthService.verifyOtp("+919876543210", "123456")
  ├─ PHP Backend: POST /api/v1/customer/auth/verify-otp
  └─ Response: { access_token, user: {id, name, email, phone} }

Bot: "✅ Login successful! Welcome back, John!
      
      🏠 **Main Menu**
      
      What would you like to do?"
      [Buttons: 📦 New Order | 📋 History | 🚚 Track | ...]

Session: { 
  currentStep: "main_menu",
  authenticated: true,
  auth_token: "Bearer xyz...",
  user_id: 123,
  user_name: "John"
}
```

**Code**: `ConversationService.handleOtpVerification()` → `PhpAuthService.verifyOtp()` → `showMainMenu()`

**PHP Endpoint**: `POST /api/v1/customer/auth/verify-otp`
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response**:
```json
{
  "access_token": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "Bearer",
  "expires_in": 31536000,
  "user": {
    "id": 123,
    "f_name": "John",
    "l_name": "Doe",
    "email": "john@example.com",
    "phone": "+919876543210"
  }
}
```

---

### **Phase 3: Main Menu** (`currentStep: main_menu`)

```
Bot shows menu with buttons:
┌─────────────────────────────────┐
│ 1. 📦 New Order                 │
│ 2. 📋 History                   │
│ 3. 🚚 Track                     │
│ 4. 📍 Addresses                 │
│ 5. 👛 Wallet                    │
│ 6. 💬 Help                      │
└─────────────────────────────────┘

User: Clicks "📦 New Order" or types "1"

Session: {
  currentStep: "pickup_location_method",
  module_id: 1,
  transport_type: "bike"
}
```

**Code**: `ConversationService.handleMainMenu()`
```typescript
case '1':
  // New Order - Start bike delivery flow
  await this.sessionService.setData(phoneNumber, 'module_id', 1);
  await this.sessionService.setData(phoneNumber, 'transport_type', 'bike');
  
  await this.messagingService.sendTextMessage(...,
    '🚴‍♂️ **New Bike Delivery**\n\n' +
    '📦 Fast and reliable delivery within city limits.\n\n' +
    '📍 Let\'s start with your pickup location:\n\n' +
    '1️⃣ Share GPS Location 📍\n' +
    '2️⃣ Select from Saved Addresses 🏠\n\n' +
    'Reply with 1 or 2:'
  );
  await this.sessionService.setStep(phoneNumber, 'pickup_location_method');
  break;
```

---

### **Phase 4: Parcel Ordering Flow**

#### **Transition to AI Mode**

```
System automatically transitions to parcel_delivery_ai step

Session: {
  currentStep: "parcel_delivery_ai",
  conversationMode: { mode: "ai", confidence_history: [] }
}
```

**Code**: After user responds, system enters `ParcelService.handleParcelDelivery()`

#### **AI-Powered Conversation** (`parcel_delivery_ai`)

The system uses **AI + Guidelines** architecture:
- **High confidence (>0.7)**: Use AI Agent (vLLM via admin backend)
- **Low confidence (<0.7)**: Fallback to structured questions

```
User: "I need to send a parcel from Bangalore to Mumbai"

System:
  ├─ Calls: AgentOrchestratorService
  ├─ Admin Backend: POST /agents/agent.parcel/execute
  ├─ vLLM generates response
  └─ Confidence: 0.92

Bot (AI): "Great! I'll help you send a parcel from Bangalore to Mumbai.
           
           Could you provide the full pickup address in Bangalore?
           Include street, landmark, and pin code."

User: "MG Road, near Metro Station, Bangalore 560001"

Bot (AI): "Perfect! And what's the delivery address in Mumbai?"

User: "Andheri West, Mumbai 400053"

Bot (AI): "Got it! What's the approximate weight of your parcel?"

User: "2 kg"

System:
  ├─ Parcel details collected
  ├─ Calls: OSRM for distance calculation
  ├─ Calls: PHP Backend for price calculation
  └─ Returns: Estimated price

Bot: "📦 **Order Summary**
      
      Pickup: MG Road, Bangalore 560001
      Delivery: Andheri West, Mumbai 400053
      Weight: 2 kg
      Distance: ~980 km
      
      💰 Estimated Cost: ₹450
      
      Confirm order? (yes/no)"

User: "yes"
```

**Code Flow**:
```
ConversationService
  └─> case 'parcel_delivery_ai':
       └─> ParcelService.handleParcelDelivery()
            ├─> Check confidence
            ├─> HIGH: ParcelAgentService.executeAgent()
            │         └─> Admin Backend: POST /agents/agent.parcel/execute
            │             └─> vLLM generates response
            └─> LOW: ParcelFallbackService.handleFallback()
                  └─> Structured questions
```

---

### **Phase 5: Order Submission**

#### **Order Creation**

```
System:
  ├─ Collects all required data:
  │   • sender_address, sender_latitude, sender_longitude
  │   • receiver_address, receiver_latitude, receiver_longitude
  │   • weight, distance, delivery_charge
  │   • module_id, zone_ids, user_id
  │
  ├─ Calls: PhpParcelService.createOrder(orderData)
  │
  └─> PHP Backend: POST /api/v1/customer/order/place
      Headers: {
        "Authorization": "Bearer {auth_token}",
        "moduleId": "1",
        "zoneId": "[1]"
      }
      Body: {
        "order_amount": 450,
        "receiver_details": JSON.stringify({
          "name": "John Doe",
          "phone": "+919876543210",
          "address": "Andheri West, Mumbai 400053",
          "address_type": "Delivery"
        }),
        "distance": 980,
        "address": "MG Road, Bangalore 560001",
        "longitude": "77.6033",
        "latitude": "12.9716",
        "order_type": "delivery"
      }
```

**PHP Endpoint**: `POST /api/v1/customer/order/place`

**Response**:
```json
{
  "order_id": 103099,
  "message": "Order placed successfully",
  "delivery_charge": 450,
  "estimated_delivery_time": "2-3 days"
}
```

**Bot Response**:
```
Bot: "🎉 **Order Confirmed!**
      
      Order ID: #103099
      Status: Order Placed
      
      Estimated Delivery: 2-3 days
      
      📲 You can track your order anytime by selecting 
      'Track' from the main menu.
      
      Thank you for using Mangwale! 🙏"

Session: { currentStep: "main_menu" }
```

---

### **Phase 6: Conversation Logging (Training Data)**

**Throughout the entire conversation**, every interaction is logged:

```typescript
await conversationLoggerService.logConversation({
  phoneNumber: "web-+919876543210",
  messageText: "I need to send a parcel from Bangalore to Mumbai",
  intent: "create_parcel_order",
  confidence: 0.92,
  currentStep: "parcel_delivery_ai",
  timestamp: Date.now(),
  sessionData: {
    platform: "web",
    authenticated: true,
    user_id: 123,
    orderDetails: {...}
  }
});
```

**Data Flow**:
```
ConversationService logs interaction
  └─> ConversationLoggerService buffers logs (batch of 10 or 30 seconds)
       └─> POST /training/conversations/bulk → Admin Backend
            └─> Stored in PostgreSQL for training
                 └─> Low confidence (<0.7) flagged for human review
```

**Stored Data**:
```sql
INSERT INTO conversation_logs (
  phone_number,
  message_text,
  intent,
  confidence,
  current_step,
  session_data,
  timestamp,
  flagged_for_review
) VALUES (
  'web-+919876543210',
  'I need to send a parcel from Bangalore to Mumbai',
  'create_parcel_order',
  0.92,
  'parcel_delivery_ai',
  '{"platform":"web","authenticated":true,...}',
  1699178400000,
  false
);
```

---

## 🔄 COMPLETE DATA FLOW

```
Web Chat User Input
  ↓
WebSocket (Socket.IO)
  ↓
ChatGateway (mangwale-ai)
  ↓
ConversationService
  ├─> SessionService (Redis)         [Session State]
  ├─> MessagingService               [Send Responses]
  ├─> NluClientService               [Intent Classification]
  ├─> ConversationLoggerService      [Training Data]
  ├─> AgentOrchestratorService       [AI Responses]
  │    └─> Admin Backend              [vLLM, NLU, Logging]
  └─> PhpAuthService/PhpParcelService
       └─> PHP Backend                [Auth, Orders, Database]
```

---

## 🧪 TESTING CHECKLIST

### **Test 1: Web Chat Connection**
- [ ] Open http://chat.mangwale.ai/chat
- [ ] WebSocket connects successfully
- [ ] Session ID created with `web-` prefix
- [ ] "Connected" status shown

### **Test 2: Authentication Flow**
- [ ] Send "hi" → Sees login options
- [ ] Select "1" (OTP) → Asked for phone
- [ ] Enter "9876543210" → OTP sent message
- [ ] Enter OTP → Login successful, see main menu
- [ ] Session persists (refresh page, still logged in)

### **Test 3: Parcel Order Flow**
- [ ] Click "📦 New Order" → Parcel flow starts
- [ ] AI asks for pickup address
- [ ] Provide address → AI asks for delivery address
- [ ] Provide delivery → AI asks for weight
- [ ] Provide weight → AI shows price estimate
- [ ] Confirm → Order created successfully
- [ ] Receive order ID

### **Test 4: Order Verification**
- [ ] Check PHP database for order
- [ ] Order status: "pending" or "confirmed"
- [ ] All details correct (addresses, weight, price)
- [ ] User ID matches logged-in user

### **Test 5: Conversation Logging**
- [ ] Check admin backend logs
- [ ] All messages logged with intents
- [ ] Low confidence messages flagged
- [ ] Session data captured correctly

---

## 🚀 DEPLOYMENT CHECKLIST

### **Web Chat Frontend**
- [ ] Update WebSocket URL in chat-ws.html to production
- [ ] Deploy to chat.mangwale.ai
- [ ] SSL certificate configured
- [ ] CORS headers allow chat.mangwale.ai

### **Mangwale-AI Backend**
- [ ] Verify .env configuration:
  ```bash
  PORT=3200
  NODE_ENV=production
  ADMIN_BACKEND_URL=http://localhost:3002
  PHP_API_BASE_URL=https://testing.mangwale.com
  REDIS_HOST=localhost
  CONVERSATION_LOGGING_ENABLED=true
  NLU_AI_ENABLED=true
  ```
- [ ] Docker container running and healthy
- [ ] Port 3201 accessible (mapped to 3200 internal)
- [ ] Redis connected (localhost:6379)

### **Admin Backend**
- [ ] Port 3002 accessible
- [ ] vLLM connected (localhost:8002)
- [ ] NLU service available
- [ ] Logging endpoint `/training/conversations/bulk` working
- [ ] Agent `agent.parcel` configured with `local.qwen8b`

### **PHP Backend**
- [ ] testing.mangwale.com accessible
- [ ] Auth endpoints working:
  - POST /api/v1/customer/auth/send-otp
  - POST /api/v1/customer/auth/verify-otp
- [ ] Order endpoint working:
  - POST /api/v1/customer/order/place
- [ ] Database accessible (PostgreSQL)

---

## 📊 KEY ENDPOINTS SUMMARY

### **Mangwale-AI**
- WebSocket: `ws://100.121.40.69:3200` (or `wss://chat.mangwale.ai`)
- Health: `GET http://localhost:3201/health`
- Test Chat: `POST http://localhost:3201/chat/send`

### **Admin Backend**
- Health: `GET http://localhost:3002/health`
- NLU Classify: `POST http://localhost:3002/nlu/classify`
- Agent Execute: `POST http://localhost:3002/agents/agent.parcel/execute`
- Log Conversations: `POST http://localhost:3002/training/conversations/bulk`
- vLLM Proxy: `POST http://localhost:3002/llm/chat/completions`

### **PHP Backend**
- Send OTP: `POST https://testing.mangwale.com/api/v1/customer/auth/send-otp`
- Verify OTP: `POST https://testing.mangwale.com/api/v1/customer/auth/verify-otp`
- Place Order: `POST https://testing.mangwale.com/api/v1/customer/order/place`
- Track Order: `GET https://testing.mangwale.com/api/v1/customer/order/track?order_id={id}`

---

## 🎯 SUCCESS CRITERIA

✅ **System is successful when**:
1. User can connect to web chat interface
2. Full authentication works (OTP flow)
3. User can navigate main menu
4. Parcel order can be placed end-to-end
5. Order appears in PHP database
6. All conversations logged for training
7. System handles errors gracefully
8. Sessions persist across reconnects

---

## 📝 NEXT STEPS

1. **Test locally first**:
   - Use localhost for all components
   - Verify each phase works
   - Check logs at each step

2. **Deploy to production**:
   - Update URLs to production domains
   - Configure SSL/TLS
   - Set up monitoring

3. **Open to users**:
   - Announce chat.mangwale.ai
   - Monitor conversations
   - Collect training data

4. **Continuous improvement**:
   - Review logged conversations
   - Retrain AI models
   - Improve response quality
   - Add more features

---

**System Status**: ✅ Ready for Testing  
**Last Updated**: November 5, 2025  
**Architecture**: Multi-Channel, AI-Powered, Production-Ready
