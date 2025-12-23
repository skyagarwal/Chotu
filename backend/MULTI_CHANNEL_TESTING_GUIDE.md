# 🧪 MULTI-CHANNEL TESTING GUIDE

**Purpose**: Test the same conversation flow across ALL channels  
**Date**: November 5, 2025

---

## 🎯 Available Test Channels

The system supports **4 active channels** for testing:

1. ✅ **WhatsApp** - Production messaging channel
2. ✅ **Telegram** - Secondary messaging channel
3. ✅ **Web Chat** - Browser-based WebSocket chat
4. ✅ **Test API** - REST endpoint for testing

All channels use the **SAME** conversation engine and business logic!

---

## 🚀 QUICK START: Test Parcel Flow

### Option 1: Test via Test API (Easiest)

```bash
# Start conversation
curl -X POST http://localhost:3201/test/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "test_user_001",
    "message": "I want to send a parcel"
  }'

# Response should trigger parcel flow
# Check session:
curl http://localhost:3201/test/session/test_user_001 | jq

# Continue conversation
curl -X POST http://localhost:3201/test/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "test_user_001",
    "message": "From Bangalore"
  }'

# And so on...
```

**Pros**: Simple, no external services needed  
**Cons**: No real message delivery (just processes through system)

---

### Option 2: Test via WhatsApp Webhook

```bash
# Simulate WhatsApp incoming message
curl -X POST http://localhost:3201/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "id": "wamid_test_001",
            "from": "919876543210",
            "type": "text",
            "timestamp": "1699178400",
            "text": {
              "body": "I want to send a parcel"
            }
          }],
          "contacts": [{
            "profile": {
              "name": "Test User"
            },
            "wa_id": "919876543210"
          }]
        }
      }]
    }]
  }'

# Check session
curl http://localhost:3201/webhook/whatsapp/session/919876543210 | jq

# Check stored messages (if test mode enabled)
curl http://localhost:3201/webhook/whatsapp/messages/919876543210 | jq

# Send next message
curl -X POST http://localhost:3201/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "id": "wamid_test_002",
            "from": "919876543210",
            "type": "text",
            "timestamp": "1699178405",
            "text": {
              "body": "From Bangalore, MG Road"
            }
          }]
        }
      }]
    }]
  }'
```

**Pros**: Tests actual WhatsApp format, validates webhook parsing  
**Cons**: More verbose payload structure

---

### Option 3: Test via Telegram Webhook

```bash
# Simulate Telegram incoming message
curl -X POST http://localhost:3201/webhook/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 10000,
    "message": {
      "message_id": 1,
      "from": {
        "id": 123456789,
        "first_name": "Test",
        "last_name": "User"
      },
      "chat": {
        "id": 123456789,
        "first_name": "Test",
        "last_name": "User",
        "type": "private"
      },
      "date": 1699178400,
      "text": "I want to send a parcel"
    }
  }'

# Check session
curl http://localhost:3201/test/session/123456789 | jq

# Send next message
curl -X POST http://localhost:3201/webhook/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 10001,
    "message": {
      "message_id": 2,
      "from": {"id": 123456789, "first_name": "Test"},
      "chat": {"id": 123456789, "type": "private"},
      "date": 1699178405,
      "text": "From Bangalore"
    }
  }'
```

**Pros**: Tests Telegram format, different identifier (chatId vs phoneNumber)  
**Cons**: Need to track numeric chatId

---

### Option 4: Test via Web Chat (WebSocket)

**Using Browser Console**:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3201');

// Join session
socket.emit('session:join', { sessionId: 'web-test-001' });

// Listen for messages
socket.on('session:joined', (data) => {
  console.log('Joined session:', data);
});

socket.on('message', (msg) => {
  console.log('Bot:', msg.content);
});

socket.on('typing', (data) => {
  console.log('Typing:', data.isTyping);
});

// Send message
socket.emit('message:send', {
  sessionId: 'web-test-001',
  message: 'I want to send a parcel'
});

// Continue conversation
socket.emit('message:send', {
  sessionId: 'web-test-001',
  message: 'From Bangalore'
});
```

**Using cURL (WebSocket upgrade is complex, use Test API instead for CLI)**

**Pros**: Real-time, bidirectional, matches production web chat  
**Cons**: Requires WebSocket client (browser or Socket.IO client library)

---

## 📝 Complete Test Scenario: Parcel Delivery

### Expected Flow (Works on ALL Channels)

**Step 1: Initiate Parcel**
```
User: "I want to send a parcel"
Bot: "Great! Let me help you send a parcel. Where should we pick up from?"
[System: Session created, step set to parcel_delivery_ai]
```

**Step 2: Provide Pickup Address**
```
User: "From Bangalore, MG Road, near Metro"
Bot: "Got it. Where should we deliver it to?"
[System: Pickup address stored]
```

**Step 3: Provide Delivery Address**
```
User: "To Mumbai, Andheri West, 400053"
Bot: "What's the approximate weight of the parcel in kg?"
[System: Delivery address stored]
```

**Step 4: Provide Weight**
```
User: "2 kg"
Bot: "Estimated cost: ₹120. Shall I book this parcel? (yes/no)"
[System: Weight stored, price calculated via OSRM + PHP backend]
```

**Step 5: Confirm**
```
User: "yes"
Bot: "Great! Your parcel has been booked. Order ID: PCL001234"
[System: Order created in PHP backend database]
```

### Verify in Database

```bash
# Check if order was created in PHP backend
# (Assuming PHP backend has API endpoint)
curl http://testing.mangwale.com/api/v1/parcel/orders/latest | jq

# Or check PostgreSQL (if parcel orders stored there)
psql -h localhost -p 5433 -U postgres -d mangwale \
  -c "SELECT * FROM parcel_orders ORDER BY created_at DESC LIMIT 5;"
```

---

## 🧪 Test Script: All Channels

**Save as `test_all_channels.sh`**:

```bash
#!/bin/bash

echo "🧪 Testing Parcel Flow Across All Channels"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Test API
echo -e "\n${BLUE}Test 1: Test API${NC}"
curl -s -X POST http://localhost:3201/test/message \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"test_001","message":"I want to send a parcel"}' | jq
echo -e "${GREEN}✅ Test API tested${NC}"

# Test 2: WhatsApp
echo -e "\n${BLUE}Test 2: WhatsApp${NC}"
curl -s -X POST http://localhost:3201/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "id": "test_wa_001",
            "from": "919999999999",
            "type": "text",
            "text": {"body": "I want to send a parcel"}
          }]
        }
      }]
    }]
  }' | jq
echo -e "${GREEN}✅ WhatsApp tested${NC}"

# Test 3: Telegram
echo -e "\n${BLUE}Test 3: Telegram${NC}"
curl -s -X POST http://localhost:3201/webhook/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "chat": {"id": 999999999},
      "text": "I want to send a parcel"
    }
  }' | jq
echo -e "${GREEN}✅ Telegram tested${NC}"

# Check sessions
echo -e "\n${BLUE}Checking Sessions${NC}"
echo "Test API session:"
curl -s http://localhost:3201/test/session/test_001 | jq '.currentStep, .conversationMode'

echo -e "\nWhatsApp session:"
curl -s http://localhost:3201/webhook/whatsapp/session/919999999999 | jq '.currentStep, .conversationMode'

echo -e "\nTelegram session:"
curl -s http://localhost:3201/test/session/999999999 | jq '.currentStep, .conversationMode'

echo -e "\n${GREEN}✅ All channels tested!${NC}"
```

**Run**:
```bash
chmod +x test_all_channels.sh
./test_all_channels.sh
```

---

## 🔍 Debugging Multi-Channel Issues

### Check Logs by Channel

```bash
# All mangwale-ai logs
pm2 logs mangwale-ai --lines 100

# Filter for specific channel
pm2 logs mangwale-ai | grep "whatsapp\|WhatsApp"
pm2 logs mangwale-ai | grep "telegram\|Telegram"
pm2 logs mangwale-ai | grep "web\|WebSocket"

# Check which platform user is on
pm2 logs mangwale-ai | grep "platform"
```

### Check Platform in Session

```bash
# Redis CLI (if direct access)
redis-cli -p 6379
> GET "session:919876543210"
> GET "session:123456789"
> GET "session:web-test-001"

# Via session endpoint
curl http://localhost:3201/test/session/919876543210 | jq '.platform'
```

### Verify Message Routing

```bash
# Watch logs in real-time
pm2 logs mangwale-ai --raw --lines 0

# In another terminal, send test message
curl -X POST http://localhost:3201/test/message \
  -d '{"phoneNumber":"debug_test","message":"test routing"}'

# You should see:
# - "Processing message from debug_test"
# - "Current step: welcome" (or current step)
# - "[Channel] Sending text message to debug_test"
```

---

## ⚡ Quick Tests

### 1. Verify System is Up
```bash
curl http://localhost:3201/health
```

### 2. Test Simple Message (Any Channel)
```bash
# Test API
curl -X POST http://localhost:3201/test/message \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"quick_test","message":"hello"}'
```

### 3. Check Active Sessions
```bash
curl http://localhost:3201/webhook/whatsapp/sessions | jq '.total'
```

### 4. Clear Session (Reset)
```bash
# WhatsApp
curl -X DELETE http://localhost:3201/webhook/whatsapp/session/919876543210

# Test API
curl -X DELETE http://localhost:3201/test/session/test_user_001
```

---

## 🎯 Success Criteria

### ✅ Test Passes If:

1. **Message Processing**
   - All 4 channels accept messages
   - ConversationService processes correctly
   - No errors in logs

2. **Session Management**
   - Session created on first message
   - Session persists across messages
   - Platform stored correctly in session

3. **Response Routing**
   - Responses sent to correct channel
   - Message format appropriate for platform
   - No cross-channel leakage

4. **Business Logic**
   - Same parcel flow works on all channels
   - State management consistent
   - AI/LLM integration works universally

5. **Database Integration**
   - Orders created regardless of channel
   - User identified correctly
   - Order history accessible

---

## 📊 Monitoring Dashboard (Future)

Create a simple monitoring page:

```bash
# Create monitor.html
cat > /home/ubuntu/Devs/mangwale-ai/public/monitor.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Mangwale Multi-Channel Monitor</title>
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
  <h1>🌐 Multi-Channel Status</h1>
  
  <div id="health"></div>
  <div id="sessions"></div>
  
  <h2>Test Channels</h2>
  <button onclick="testWhatsApp()">Test WhatsApp</button>
  <button onclick="testTelegram()">Test Telegram</button>
  <button onclick="testAPI()">Test API</button>
  
  <div id="results"></div>
  
  <script>
    async function checkHealth() {
      const res = await axios.get('http://localhost:3201/health');
      document.getElementById('health').innerHTML = 
        `<p>✅ System: ${res.data.status} | Uptime: ${res.data.uptime}s</p>`;
    }
    
    async function checkSessions() {
      const res = await axios.get('http://localhost:3201/webhook/whatsapp/sessions');
      document.getElementById('sessions').innerHTML = 
        `<p>📊 Active Sessions: ${res.data.total}</p>`;
    }
    
    async function testWhatsApp() {
      const res = await axios.post('http://localhost:3201/webhook/whatsapp', {
        object: "whatsapp_business_account",
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: "test_" + Date.now(),
                from: "919999999999",
                type: "text",
                text: { body: "test from monitor" }
              }]
            }
          }]
        }]
      });
      document.getElementById('results').innerHTML = 
        `<p>WhatsApp: ${JSON.stringify(res.data)}</p>`;
    }
    
    async function testTelegram() {
      const res = await axios.post('http://localhost:3201/webhook/telegram', {
        message: {
          chat: { id: 999999999 },
          text: "test from monitor"
        }
      });
      document.getElementById('results').innerHTML = 
        `<p>Telegram: ${JSON.stringify(res.data)}</p>`;
    }
    
    async function testAPI() {
      const res = await axios.post('http://localhost:3201/test/message', {
        phoneNumber: "monitor_test",
        message: "test from monitor"
      });
      document.getElementById('results').innerHTML = 
        `<p>Test API: ${JSON.stringify(res.data)}</p>`;
    }
    
    checkHealth();
    checkSessions();
    setInterval(() => {
      checkHealth();
      checkSessions();
    }, 5000);
  </script>
</body>
</html>
EOF

# Access: http://localhost:3201/monitor.html
```

---

## 🎓 Best Practices

### 1. **Use Unique Identifiers**
- WhatsApp: Real phone numbers (919876543210)
- Telegram: Numeric chat IDs (123456789)
- Web Chat: Prefixed session IDs (web-test-001)
- Test API: Descriptive names (test_user_parcel_001)

### 2. **Clean Sessions Between Tests**
```bash
# Always start fresh for accurate testing
curl -X DELETE http://localhost:3201/webhook/whatsapp/session/YOUR_ID
```

### 3. **Check Logs Actively**
```bash
# Run in separate terminal during testing
pm2 logs mangwale-ai --raw --lines 0
```

### 4. **Test Edge Cases**
- Empty messages
- Very long messages
- Special characters
- Rapid successive messages
- Simultaneous multi-user (different IDs)

### 5. **Verify Cross-Channel Independence**
- User A on WhatsApp
- User B on Telegram  
- Both should have separate sessions
- No state leakage

---

## 📚 Related Documentation

- **MULTI_CHANNEL_ARCHITECTURE.md** - Architecture deep dive
- **AI_SERVICES_COMPLETE_AUDIT.md** - AI infrastructure details
- **SYSTEM_READINESS_SUMMARY.md** - Overall system status

---

**Happy Testing!** 🚀

Remember: **Same business logic, different entry points!**
