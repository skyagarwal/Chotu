# 🧪 MULTI-CHANNEL TESTING PLAN - MANGWALE AI

**Date:** January 27, 2025  
**Project:** Mangwale Super App - Multi-Channel Conversational AI  
**Version:** Phase 2C - Module Agents Complete

---

## 📊 SYSTEM OVERVIEW

### Channels Supported
- ✅ **WhatsApp** - Via WhatsApp Business API
- ✅ **Telegram** - Via Telegram Bot API
- ✅ **Web Chat** - Via Dashboard Interface (Port 3000)
- ✅ **Voice** - ASR (Speech-to-Text) + TTS (Text-to-Speech)
- ✅ **RCS** - Rich Communication Services
- ✅ **SMS** - Text Messaging
- 🔄 **Future:** Facebook Messenger, Instagram, Slack, MS Teams

### Services Status
| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| Admin Backend | 8080 | ❌ Check | AI Operations Platform |
| Mangwale AI | 3200 | ✅ Running | Multi-Channel Orchestration |
| Search API | 3100 | ✅ Running | Multi-Module Search |
| Dashboard | 3000 | 🔄 Setup | Admin + Customer Interface |
| PHP Backend | 80 | ✅ Production | Business Logic |

### Current Training Status
- **Datasets:** 12 created
- **Training Jobs:** 25 total, 21 succeeded (84% success rate)
- **Module Agents:** 12 configured with NLU providers
- **Training Examples:** 950+ across all modules

---

## 🎯 TESTING PHASES

### Phase 1: Infrastructure Testing (30 mins)
**Objective:** Verify all services are running and communicating

#### Test 1.1: Service Health Checks
```bash
# Admin Backend
curl http://localhost:8080/health

# Mangwale AI (Multi-Channel Service)
curl http://localhost:3200/health

# Search API
curl http://localhost:3100/health

# Check all channels configured
curl http://localhost:3200/channels
```

**Expected Results:**
- ✅ All services respond with 200 OK
- ✅ Health status: "ok" or "healthy"
- ✅ Channel configurations present

#### Test 1.2: Database Connectivity
```bash
# Verify Redis sessions
docker exec mangwale_redis redis-cli -n 1 PING

# Verify PostgreSQL (Admin Backend)
curl http://localhost:8080/training/datasets | jq 'length'

# Verify MySQL (PHP Backend)
curl http://testing.mangwale.com/api/health
```

**Expected Results:**
- ✅ Redis: PONG
- ✅ PostgreSQL: Returns dataset count
- ✅ MySQL: Returns health status

#### Test 1.3: Inter-Service Communication
```bash
# Admin Backend → Mangwale AI
# Mangwale AI calls Admin Backend for NLU classification
# Test via agent endpoint

curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "from": "+919876543210",
    "message": "I want to order pizza"
  }'
```

**Expected Results:**
- ✅ Message processed by Mangwale AI
- ✅ NLU classification via Admin Backend
- ✅ Intent detected: "order_food"
- ✅ Response generated

---

### Phase 2: Module Agent Testing (1-2 hours)
**Objective:** Test all 8 module-specific agents

#### Test 2.1: Food Module Agent
```bash
# Test intent classification
curl -X POST http://localhost:8080/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I want veg pizza",
    "provider": "nlu.trained.food"
  }'

# Test via agent (end-to-end)
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_food",
    "message": "Show me veg pizzas near me",
    "metadata": {
      "location": {"lat": 19.99, "lng": 73.78}
    }
  }'
```

**Test Cases:**
- ✅ Search restaurant: "Show me pizza places"
- ✅ View menu: "What's the menu at Dominos"
- ✅ Place order: "I want to order large margherita pizza"
- ✅ Track order: "Where is my order #12345"
- ✅ Modify order: "Change my order to extra cheese"

**Expected Results:**
- Intent classification accuracy: >90%
- Entity extraction: food_type, cuisine, location, quantity
- Search API integration: Returns relevant restaurants
- Session management: Maintains conversation context

#### Test 2.2: E-commerce Module Agent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_ecom",
    "message": "Show me Amul milk products"
  }'
```

**Test Cases:**
- ✅ Search product: "Show me milk products"
- ✅ Add to cart: "Add Amul 1L milk to cart"
- ✅ View cart: "What's in my cart"
- ✅ Checkout: "I want to checkout"
- ✅ Track order: "Track order #67890"

**Expected Results:**
- Intent: search_product, add_to_cart, checkout
- Entities: product_type, brand, quantity
- Cart management: Add/remove items
- Search API: Returns products from OpenSearch

#### Test 2.3: Parcel Module Agent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_parcel",
    "message": "I want to send a package from Nashik to Mumbai"
  }'
```

**Test Cases:**
- ✅ Book parcel: "Send package from X to Y"
- ✅ Track parcel: "Track my parcel #ABC123"
- ✅ Modify booking: "Change pickup time"
- ✅ Get pricing: "How much to send 5kg to Mumbai"

**Expected Results:**
- Intent: book_parcel, track_parcel, modify_booking
- Entities: pickup_location, drop_location, weight
- Zone check: Verify service availability
- PHP Backend integration: Calculate pricing

#### Test 2.4: Payment Module Agent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_payment",
    "message": "Recharge my mobile with 200 rupees"
  }'
```

**Test Cases:**
- ✅ Recharge: "Recharge mobile 9876543210 with ₹200"
- ✅ Pay bill: "Pay electricity bill"
- ✅ Check balance: "What's my wallet balance"
- ✅ Transaction history: "Show my last 5 transactions"

#### Test 2.5: Ride Module Agent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_ride",
    "message": "Book a cab from Nashik Road to CBS",
    "metadata": {
      "location": {"lat": 19.99, "lng": 73.78}
    }
  }'
```

**Test Cases:**
- ✅ Book ride: "Book cab from X to Y"
- ✅ Track ride: "Where is my cab"
- ✅ Cancel ride: "Cancel my ride"
- ✅ Get pricing: "How much to CBS"

#### Test 2.6: Health Module Agent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_health",
    "message": "Book doctor appointment for general checkup"
  }'
```

**Test Cases:**
- ✅ Book doctor: "Book appointment with cardiologist"
- ✅ Book lab test: "Book blood test at home"
- ✅ Order medicine: "Order paracetamol 500mg"
- ✅ Track order: "Where is my medicine order"

#### Test 2.7: Rooms Module Agent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_rooms",
    "message": "Book a hotel room in Nashik for 2 nights"
  }'
```

**Test Cases:**
- ✅ Book room: "Book hotel in Nashik"
- ✅ Check availability: "Available rooms on Jan 30"
- ✅ Modify booking: "Change checkout to Feb 2"

#### Test 2.8: Movies Module Agent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_movies",
    "message": "Book tickets for latest action movie"
  }'
```

**Test Cases:**
- ✅ Search movies: "Show action movies near me"
- ✅ Book tickets: "Book 2 tickets for Avengers"
- ✅ Check shows: "Show timings for today"

#### Test 2.9: Services Module Agent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_user_services",
    "message": "Book spa appointment for massage"
  }'
```

**Test Cases:**
- ✅ Book service: "Book salon appointment"
- ✅ Schedule: "Available slots tomorrow"
- ✅ Track service: "Status of my booking"

---

### Phase 3: Multi-Channel Testing (1-2 hours)
**Objective:** Test same conversation across different channels

#### Test 3.1: WhatsApp Channel
```bash
# Send message via WhatsApp API simulation
curl -X POST http://localhost:3200/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "919876543210",
            "text": {
              "body": "I want to order pizza"
            }
          }]
        }
      }]
    }]
  }'
```

**Expected Results:**
- ✅ Message processed
- ✅ NLU classifies intent
- ✅ Response sent back via WhatsApp
- ✅ Session stored in Redis (DB 1)

#### Test 3.2: Telegram Channel
```bash
curl -X POST http://localhost:3200/webhooks/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "chat": {"id": 123456789},
      "from": {"id": 123456789, "first_name": "Test"},
      "text": "Show me restaurants"
    }
  }'
```

#### Test 3.3: Web Chat Channel
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "web_user_123",
    "message": "Order food"
  }'
```

#### Test 3.4: Voice Channel (ASR → Agent → TTS)
```bash
# Step 1: Upload audio file
curl -X POST http://localhost:8080/asr/transcribe \
  -F "audio=@test_audio.wav" \
  -F "provider=asr_whisper"

# Step 2: Process transcription
# (Response from ASR: "I want to order pizza")

# Step 3: Send to agent
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "voice",
    "from": "voice_user_123",
    "message": "I want to order pizza"
  }'

# Step 4: Generate TTS response
curl -X POST http://localhost:8080/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Sure! Which restaurant would you like to order from?",
    "provider": "tts_elevenlabs"
  }'
```

**Expected Results:**
- ✅ ASR transcription accurate (>95%)
- ✅ Agent processes transcription
- ✅ TTS generates natural audio
- ✅ End-to-end latency: <2 seconds

---

### Phase 4: Search Integration Testing (30 mins)
**Objective:** Verify multi-module search functionality

#### Test 4.1: Food Search
```bash
curl "http://localhost:3100/search/food?q=pizza&veg=1&lat=19.99&lon=73.78&radius_km=5"
```

**Expected Results:**
- ✅ Returns food items from OpenSearch
- ✅ Filters applied correctly (veg only)
- ✅ Geo-distance sorted
- ✅ Response time: <50ms

#### Test 4.2: E-commerce Search
```bash
curl "http://localhost:3100/search/ecom?q=milk&brand=amul&price_min=50&price_max=200"
```

#### Test 4.3: Multi-Module Search (Typeahead)
```bash
curl "http://localhost:3100/search/food/suggest?q=pi"
curl "http://localhost:3100/search/ecom/suggest?q=mi"
```

**Expected Results:**
- ✅ Auto-complete suggestions
- ✅ Response time: <20ms
- ✅ Relevant suggestions per module

---

### Phase 5: Flow Testing (30 mins)
**Objective:** Test conversation flows

#### Test 5.1: Food Ordering Flow
```
User: "I want pizza"
Bot: "Sure! Which restaurant? [Dominos] [Pizza Hut] [Others]"
User: "Dominos"
Bot: "What would you like? [Margherita] [Peppy Paneer] [View Menu]"
User: "Margherita large"
Bot: "Added to cart. Total: ₹399. [Checkout] [Add More]"
User: "Checkout"
Bot: "Enter delivery address"
User: "123 Main St, Nashik"
Bot: "Payment method? [Cash] [Card] [UPI]"
User: "UPI"
Bot: "Order placed! Order ID: #12345. ETA: 30 mins"
```

**Verification:**
- ✅ Flow follows defined steps
- ✅ Option chips displayed correctly
- ✅ Context maintained across messages
- ✅ Order created in PHP Backend
- ✅ Session persisted in Redis

---

### Phase 6: Performance Testing (30 mins)
**Objective:** Load testing and performance benchmarks

#### Test 6.1: Concurrent Users
```bash
# Use Apache Bench or similar
ab -n 1000 -c 50 -T application/json -p test_message.json \
  http://localhost:3200/conversation/message
```

**Targets:**
- ✅ Handle 50 concurrent conversations
- ✅ Response time: <200ms (p95)
- ✅ No session conflicts
- ✅ No dropped messages

#### Test 6.2: NLU Classification Speed
```bash
for i in {1..100}; do
  time curl -X POST http://localhost:8080/nlu/classify \
    -H "Content-Type: application/json" \
    -d '{"text": "order pizza", "provider": "nlu.trained.food"}'
done | grep real | awk '{sum+=$2; count++} END {print "Average:", sum/count, "ms"}'
```

**Target:** <50ms average

#### Test 6.3: Search API Performance
```bash
ab -n 1000 -c 20 \
  "http://localhost:3100/search/food?q=pizza&lat=19.99&lon=73.78"
```

**Target:** <50ms (p95)

---

### Phase 7: Edge Case Testing (30 mins)
**Objective:** Test error handling and edge cases

#### Test 7.1: Unknown Intent
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_edge_case",
    "message": "asdfghjkl random gibberish"
  }'
```

**Expected:** Bot asks for clarification or offers help

#### Test 7.2: Mixed Language (Hindi + English)
```bash
curl -X POST http://localhost:3200/conversation/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "from": "test_hindi",
    "message": "Mujhe pizza order karna hai"
  }'
```

**Expected:** Bot understands and responds appropriately

#### Test 7.3: Context Switching
```bash
# Start in food module
curl -X POST http://localhost:3200/conversation/message \
  -d '{"channel": "web", "from": "test_context", "message": "order pizza"}'

# Switch to parcel module
curl -X POST http://localhost:3200/conversation/message \
  -d '{"channel": "web", "from": "test_context", "message": "send a package"}'
```

**Expected:** Bot handles module switch gracefully

#### Test 7.4: Session Timeout
```bash
# Send message, wait 30 mins (or simulate), send another
# Verify session expiry and recreation
```

---

## 📊 SUCCESS CRITERIA

### Functional Requirements
- ✅ All 8 module agents respond correctly
- ✅ NLU accuracy >90% per module
- ✅ Multi-channel support (WhatsApp, Web, Telegram, Voice)
- ✅ Search API integration working
- ✅ Session management across channels
- ✅ Flow execution as designed

### Performance Requirements
- ✅ API response time: <100ms (p95)
- ✅ NLU classification: <50ms
- ✅ Search query: <50ms (p95)
- ✅ Message processing: <200ms end-to-end
- ✅ Concurrent users: 50+ without degradation

### Quality Requirements
- ✅ No critical bugs
- ✅ No session conflicts
- ✅ No data loss
- ✅ Graceful error handling
- ✅ Proper logging and monitoring

---

## 🛠️ TESTING TOOLS

### Automated Testing
```bash
# Create test suite script
cd /home/ubuntu/Devs/mangwale-unified-dashboard
mkdir -p tests

# Install testing dependencies
npm install --save-dev jest @testing-library/react axios

# Run tests
npm test
```

### Manual Testing
- Dashboard: http://localhost:3000
- Admin Backend API: http://localhost:8080
- Mangwale AI API: http://localhost:3200
- Search API: http://localhost:3100

### Monitoring
- Logs: `docker logs mangwale_ai_service`
- Redis: `docker exec mangwale_redis redis-cli -n 1 KEYS "wa:session:*"`
- Metrics: `curl http://localhost:8080/metrics`

---

## 📝 TEST EXECUTION LOG

### Session: [Date/Time]
**Tester:** [Name]  
**Environment:** [Development/Staging/Production]

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Service Health | ⏳ Pending | |
| 1.2 | Database Connectivity | ⏳ Pending | |
| 1.3 | Inter-Service Comm | ⏳ Pending | |
| 2.1 | Food Agent | ⏳ Pending | |
| 2.2 | Ecom Agent | ⏳ Pending | |
| 2.3 | Parcel Agent | ⏳ Pending | |
| 2.4 | Payment Agent | ⏳ Pending | |
| 2.5 | Ride Agent | ⏳ Pending | |
| 2.6 | Health Agent | ⏳ Pending | |
| 2.7 | Rooms Agent | ⏳ Pending | |
| 2.8 | Movies Agent | ⏳ Pending | |
| 2.9 | Services Agent | ⏳ Pending | |
| 3.1 | WhatsApp Channel | ⏳ Pending | |
| 3.2 | Telegram Channel | ⏳ Pending | |
| 3.3 | Web Chat | ⏳ Pending | |
| 3.4 | Voice Channel | ⏳ Pending | |
| 4.1-4.3 | Search Integration | ⏳ Pending | |
| 5.1 | Food Flow | ⏳ Pending | |
| 6.1-6.3 | Performance | ⏳ Pending | |
| 7.1-7.4 | Edge Cases | ⏳ Pending | |

---

## 🚀 NEXT STEPS

1. **Start Admin Backend** - Fix port 8080 service
2. **Run Phase 1 Tests** - Infrastructure verification
3. **Run Phase 2 Tests** - Module agent testing
4. **Run Phase 3 Tests** - Multi-channel testing
5. **Create Automated Test Suite** - Jest + integration tests
6. **Deploy to Staging** - Test in staging environment
7. **User Acceptance Testing** - Real user feedback
8. **Production Deployment** - Full rollout

**Ready to begin testing! 🎯**
