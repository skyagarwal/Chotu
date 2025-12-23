# 🧠 INTENT & SLOT COLLECTION SYSTEM

**Date**: November 5, 2025  
**Status**: ✅ Fully Implemented - Auto-Training Data Collection  
**Purpose**: Collect conversation data to continuously improve AI models

---

## 📊 SYSTEM OVERVIEW

The system has **2-layer AI** for understanding user messages:

### Layer 1: **NLU (Intent Classification)** 
- **Purpose**: Understand WHAT the user wants
- **Model**: IndicBERT v2 (8 trained datasets)
- **Output**: Intent + Confidence + Entities

### Layer 2: **Conversation Logging (Training Data Collection)**
- **Purpose**: Collect all conversations for continuous learning
- **Storage**: Admin Backend API → Database
- **Output**: Training dataset for model improvement

---

## 🎯 INTENTS DETECTED

The system can classify these intents:

| Intent | Confidence | Examples | Trained Dataset |
|--------|------------|----------|-----------------|
| `order_food` | 0.78-0.95 | "I want pizza", "hungry", "order food" | nlu.trained.food |
| `create_parcel_order` | 0.78-0.95 | "send parcel", "delivery", "courier" | nlu.trained.parcel |
| `track_order` | 0.78-0.90 | "where is my order", "track parcel" | Common |
| `browse_menu` | 0.78-0.85 | "show menu", "what restaurants" | nlu.trained.food |
| `support_request` | 0.78-0.90 | "help", "problem", "refund", "cancel" | Common |
| `greeting` | 0.85-0.95 | "hi", "hello", "namaste" | Common |
| `create_order` | 0.65-0.80 | "order", "buy", "book" (generic) | Common |
| `book_movie` | 0.78-0.90 | "movie ticket", "book show" | nlu.trained.movies |
| `book_room` | 0.78-0.90 | "hotel", "room booking" | nlu.trained.rooms |
| `book_ride` | 0.78-0.90 | "need cab", "book taxi" | nlu.trained.ride |
| `book_service` | 0.78-0.90 | "electrician", "plumber" | nlu.trained.services |
| `unknown` | 0.35 | Unrecognized messages | Fallback |

---

## 🔍 HOW IT WORKS

### Step 1: User Sends Message
```
User: "I want to order pizza"
Platform: WhatsApp/Telegram/Web Chat
```

### Step 2: NLU Classification
```typescript
// NluClientService classifies the message
const result = await nluClientService.classify("I want to order pizza");

// Result:
{
  intent: "order_food",
  confidence: 0.92,
  entities: [
    { type: "food_item", value: "pizza", confidence: 0.88 }
  ],
  raw: { 
    source: "nlu_model", // or "fallback_heuristic_enhanced"
    latency: 45 // ms
  }
}
```

### Step 3: Conversation Logging
```typescript
// ConversationLoggerService logs the interaction
await conversationLoggerService.logConversation({
  phoneNumber: "9876543210",
  messageText: "I want to order pizza",
  intent: "order_food",
  confidence: 0.92,
  currentStep: "main_menu",
  timestamp: Date.now(),
  sessionData: { /* session context */ }
});
```

### Step 4: Data Collection
```
Logs buffered in memory (batch of 10)
    ↓
After 30 seconds OR buffer full
    ↓
POST /training/conversations/bulk → Admin Backend
    ↓
Stored in database for training
    ↓
Low confidence (<0.7) flagged for human review
```

---

## 📝 DATA COLLECTED

### **Conversation Log Structure**

```typescript
interface ConversationLog {
  phoneNumber: string;      // User identifier
  messageText: string;      // What user said
  intent: string;           // Classified intent
  confidence: number;       // 0.0 - 1.0
  currentStep: string;      // Conversation state
  timestamp: number;        // Unix timestamp
  sessionData?: {          // Optional context
    platform: 'whatsapp' | 'telegram' | 'web';
    previousIntent: string;
    orderDetails: any;
    // ... more context
  }
}
```

### **Example Collected Data**

```json
{
  "phoneNumber": "919876543210",
  "messageText": "I want to order pizza",
  "intent": "order_food",
  "confidence": 0.92,
  "currentStep": "main_menu",
  "timestamp": 1699178400000,
  "sessionData": {
    "platform": "whatsapp",
    "previousIntent": "greeting",
    "authenticated": true
  }
}
```

---

## 🎓 TRAINING DATA USAGE

### **How Collected Data Improves AI**

1. **Intent Classification Improvement**
   ```
   User says: "mangwao khana" (Hindi slang)
   Current: unknown (confidence: 0.35)
   
   After training with real data:
   User says: "mangwao khana"
   Improved: order_food (confidence: 0.88)
   ```

2. **Entity Extraction**
   ```
   User says: "send parcel from Bangalore to Mumbai"
   Entities extracted:
   - pickup_city: "Bangalore"
   - delivery_city: "Mumbai"
   ```

3. **Context Understanding**
   ```
   User: "I want pizza"
   Context: Previous step = browsing restaurants
   Enhanced Understanding: User wants pizza from specific restaurant
   ```

4. **Confidence Calibration**
   ```
   Before: Many false positives at 0.75 confidence
   After: Threshold adjusted to 0.70 based on real data
   ```

---

## ⚙️ CONFIGURATION

### **Enable/Disable Conversation Logging**

```bash
# /home/ubuntu/Devs/mangwale-ai/.env

# Enable conversation logging (default: true)
CONVERSATION_LOGGING_ENABLED=true

# Admin Backend endpoint
ADMIN_BACKEND_URL=http://localhost:3002

# API Key (optional)
ADMIN_BACKEND_API_KEY=your_secret_key

# Confidence threshold for human review (default: 0.7)
CONFIDENCE_THRESHOLD_FOR_REVIEW=0.7

# Enable NLU AI (default: true)
NLU_AI_ENABLED=true
```

### **Current Status**
```bash
# Check if enabled
docker logs mangwale_ai_service 2>&1 | grep "Conversation Logger"
# Expected: "✅ Conversation Logger initialized"

# Check stats
curl http://localhost:3201/test/session/any_user | jq
```

---

## 🔄 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    USER MESSAGE                          │
│         "I want to order pizza from my area"            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              NLU CLASSIFICATION                          │
│   1. Admin Backend NLU (IndicBERT) - if available      │
│   2. Fallback Heuristics - if NLU unavailable          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  RESULT                                  │
│  {                                                       │
│    intent: "order_food",                                │
│    confidence: 0.92,                                    │
│    entities: [                                          │
│      {type: "food_item", value: "pizza"},              │
│      {type: "location", value: "my area"}              │
│    ]                                                    │
│  }                                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           CONVERSATION LOGGING                           │
│   Buffer in memory (batch of 10 or 30 seconds)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          SEND TO ADMIN BACKEND                          │
│  POST /training/conversations/bulk                      │
│  {conversations: [/* 10 logs */]}                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            STORE IN DATABASE                            │
│  - conversation_logs table                              │
│  - Flag low confidence (<0.7) for review                │
│  - Generate training dataset periodically               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         CONTINUOUS MODEL IMPROVEMENT                     │
│  - Retrain models monthly/weekly                        │
│  - Update intent classifiers                            │
│  - Improve entity extraction                            │
│  - Adjust confidence thresholds                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 LOW CONFIDENCE FLAGGING

Messages with confidence < 0.7 are **flagged for human review**:

### **Why Low Confidence Matters**

```
User: "mangwao khana thoda spicy"
Current Classification:
  intent: unknown
  confidence: 0.35
  ❌ FLAGGED FOR HUMAN REVIEW

Human Reviews and Labels:
  ✅ Correct intent: order_food
  ✅ Language: Hindi + English mix
  ✅ Add to training dataset

Next Time:
  intent: order_food
  confidence: 0.88
  ✅ Works correctly!
```

### **Flagging Statistics**

```typescript
// In logs
📤 Sent 10 conversation logs to Admin Backend (3 flagged for review, latency: 45ms)

// Meaning:
// - 10 conversations logged
// - 3 had confidence < 0.7 (need human review)
// - 7 had confidence >= 0.7 (good)
```

---

## 🧪 TESTING THE SYSTEM

### **Test 1: Check NLU is Working**

```bash
# Via Admin Backend
curl -X POST http://localhost:3002/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "I want to order pizza"}'

# Expected:
{
  "intent": "order_food",
  "confidence": 0.92,
  "entities": [{"type": "food_item", "value": "pizza"}]
}
```

### **Test 2: Verify Logging Enabled**

```bash
# Check logs
docker logs mangwale_ai_service 2>&1 | grep "Conversation Logger"

# Should see:
# ✅ Conversation Logger initialized - Admin Backend: http://localhost:3002
# 📊 Confidence threshold for human review: 70%
```

### **Test 3: Send Test Message and Check Logs**

```bash
# Send message
curl -X POST http://localhost:3201/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "test_logging_001",
    "text": "I want to order pizza"
  }'

# Check logs (after 30 seconds or 10 messages)
docker logs mangwale_ai_service 2>&1 | grep "📤 Sent"

# Should see:
# 📤 Sent 10 conversation logs to Admin Backend (0 flagged for review)
```

### **Test 4: Test Fallback Classification**

```bash
# Disable NLU temporarily
# .env: NLU_AI_ENABLED=false

# Restart and test
curl -X POST http://localhost:3201/chat/send \
  -d '{"recipientId":"test","text":"send parcel"}'

# Logs should show:
# ⚠️  NLU AI disabled - using fallback heuristics
# 📊 NLU Classification: "send parcel" → intent: create_parcel_order, confidence: 0.78
```

---

## 📈 ANALYTICS & MONITORING

### **Check Logger Stats**

```typescript
// In code
const stats = conversationLoggerService.getStats();
console.log(stats);

// Output:
{
  bufferSize: 3,                    // 3 logs waiting to be sent
  enabled: true,                    // Logging enabled
  confidenceThreshold: 0.7,         // Flag threshold
  adminBackendUrl: "http://localhost:3002"
}
```

### **Query Collected Data** (Admin Backend)

```bash
# Get all conversations
curl http://localhost:3002/training/conversations?limit=100

# Get flagged conversations (low confidence)
curl http://localhost:3002/training/conversations?flagged=true

# Get conversations by intent
curl http://localhost:3002/training/conversations?intent=order_food

# Get conversations by date
curl "http://localhost:3002/training/conversations?from=2025-11-01&to=2025-11-05"
```

---

## 🎯 REAL-WORLD EXAMPLES

### **Example 1: Food Ordering**

```
User: "I want to order pizza"

NLU Classification:
  intent: order_food
  confidence: 0.92
  entities: [{type: "food_item", value: "pizza"}]
  
Logged Data:
  phoneNumber: "919876543210"
  messageText: "I want to order pizza"
  intent: "order_food"
  confidence: 0.92
  currentStep: "main_menu"
  timestamp: 1699178400000
  
Action: ✅ Sent to Admin Backend after 30 seconds
```

### **Example 2: Parcel Delivery**

```
User: "send parcel from Bangalore to Mumbai"

NLU Classification:
  intent: create_parcel_order
  confidence: 0.88
  entities: [
    {type: "pickup_city", value: "Bangalore"},
    {type: "delivery_city", value: "Mumbai"}
  ]
  
Logged Data:
  phoneNumber: "919876543211"
  messageText: "send parcel from Bangalore to Mumbai"
  intent: "create_parcel_order"
  confidence: 0.88
  currentStep: "parcel_delivery_ai"
  
Action: ✅ Sent to Admin Backend after 30 seconds
```

### **Example 3: Low Confidence - Needs Review**

```
User: "bhukh lagi hai kuch mangwao" (Hindi slang)

NLU Classification:
  intent: unknown
  confidence: 0.35
  entities: []
  
Logged Data:
  phoneNumber: "919876543212"
  messageText: "bhukh lagi hai kuch mangwao"
  intent: "unknown"
  confidence: 0.35  ⚠️ LOW CONFIDENCE
  currentStep: "main_menu"
  
Action: 🔴 FLAGGED FOR HUMAN REVIEW
Human labels it as: order_food
Added to training dataset
```

---

## 🔧 TROUBLESHOOTING

### **Problem: Logs Not Being Sent**

```bash
# Check if logging is enabled
docker logs mangwale_ai_service 2>&1 | grep "Conversation Logger"

# Should see: ✅ Conversation Logger initialized
# If you see: ⚠️  Conversation logging disabled
# Solution: Set CONVERSATION_LOGGING_ENABLED=true in .env
```

### **Problem: NLU Always Returns Unknown**

```bash
# Check NLU status
docker logs mangwale_ai_service 2>&1 | grep "NLU Client"

# Should see: ✅ NLU Client initialized
# If you see: ⚠️  NLU AI disabled
# Solution: Set NLU_AI_ENABLED=true in .env
```

### **Problem: Admin Backend Not Receiving Logs**

```bash
# Test Admin Backend endpoint
curl -X POST http://localhost:3002/training/conversations/bulk \
  -H "Content-Type: application/json" \
  -d '{"conversations":[]}'

# Should return: 200 OK
# If 404: Admin Backend doesn't have training endpoint
# If timeout: Admin Backend not reachable
```

---

## 📚 SUMMARY

### **What You Have**:

✅ **2-Layer AI System**:
  1. NLU (IndicBERT) - Intent classification
  2. LLM (vLLM/Qwen) - Response generation

✅ **8 Trained Datasets**:
  - Food, Parcel, Movies, Health, Ride, Services, Rooms, Ecom

✅ **Automatic Logging**:
  - All conversations logged
  - Buffered and batch-sent
  - Low confidence flagged

✅ **Multi-Language Support**:
  - English, Hindi, Hinglish
  - Fallback heuristics for robustness

✅ **Continuous Improvement**:
  - Real conversation data collected
  - Models retrained periodically
  - Confidence thresholds adjusted

### **Current Status**:

- 🟢 **NLU Service**: Running (IndicBERT v2)
- 🟢 **Conversation Logger**: Enabled
- 🟢 **Fallback Heuristics**: Working
- 🟢 **Multi-Channel Support**: WhatsApp, Telegram, Web Chat

### **Next Steps**:

1. ✅ System is collecting data automatically
2. ⏳ Review flagged conversations (low confidence)
3. ⏳ Retrain models with collected data
4. ⏳ Monitor classification accuracy
5. ⏳ Add more intents as needed

---

**The system is actively learning from every conversation! 🚀**
