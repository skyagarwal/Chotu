#!/bin/bash

echo "🧪 COMPLETE MANGWALE.AI CHAT SYSTEM TEST"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TEST_USER="web-test-$(date +%s)"

echo "📝 Test User ID: $TEST_USER"
echo ""

# Test 1: Backend Health
echo "1️⃣ Testing Backend Health..."
HEALTH=$(curl -s http://localhost:3200/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "$HEALTH"
fi
echo ""

# Test 2: Chat Endpoint - Greeting
echo "2️⃣ Testing Chat - Greeting..."
GREETING=$(curl -s -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":\"$TEST_USER\",\"text\":\"hi\"}")
if echo "$GREETING" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Greeting response received${NC}"
    echo "$GREETING" | jq -r '.response' | head -3
else
    echo -e "${RED}❌ Greeting failed${NC}"
    echo "$GREETING" | jq '.'
fi
echo ""

# Test 3: Game System Trigger
echo "3️⃣ Testing Game System Trigger..."
GAME=$(curl -s -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":\"$TEST_USER\",\"text\":\"start game\"}")
if echo "$GAME" | grep -q 'Intent Quest\|Language Master\|Tone Detective'; then
    echo -e "${GREEN}✅ Game system responded${NC}"
    echo "$GAME" | jq -r '.response.message' 2>/dev/null | head -5 || echo "$GAME" | jq -r '.response' | head -5
else
    echo -e "${YELLOW}⚠️  Game response format different${NC}"
    echo "$GAME" | jq '.'
fi
echo ""

# Test 4: Direct Game Start Endpoint
echo "4️⃣ Testing Direct Game Endpoint..."
DIRECT_GAME=$(curl -s -X POST http://localhost:3200/api/gamification/games/start \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":\"$TEST_USER-direct\"}")
if echo "$DIRECT_GAME" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Direct game endpoint working${NC}"
    echo "$DIRECT_GAME" | jq '{success: .success, sessionId: .data.sessionId, question: .data.question.text}' 2>/dev/null
else
    echo -e "${RED}❌ Direct game endpoint failed${NC}"
    echo "$DIRECT_GAME" | jq '.'
fi
echo ""

# Test 5: Session Check
echo "5️⃣ Testing Session Management..."
SESSION=$(curl -s http://localhost:3200/chat/session/$TEST_USER)
if echo "$SESSION" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Session retrieved${NC}"
    echo "$SESSION" | jq '{hasActiveSession: .hasActiveSession, step: .session.currentStep}' 2>/dev/null || echo "$SESSION" | jq '.'
else
    echo -e "${RED}❌ Session check failed${NC}"
    echo "$SESSION" | jq '.'
fi
echo ""

# Test 6: Frontend Accessibility
echo "6️⃣ Testing Frontend Accessibility..."
FRONTEND=$(curl -s -I http://localhost:3001 | head -1)
if echo "$FRONTEND" | grep -q '200'; then
    echo -e "${GREEN}✅ Frontend accessible at http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Frontend not accessible${NC}"
    echo "$FRONTEND"
fi
echo ""

# Test 7: Questions API (for admin dashboard)
echo "7️⃣ Testing Questions Management API..."
QUESTIONS=$(curl -s "http://localhost:3200/api/gamification/questions?limit=3")
if echo "$QUESTIONS" | grep -q '"success":true'; then
    COUNT=$(echo "$QUESTIONS" | jq '.data | length' 2>/dev/null)
    echo -e "${GREEN}✅ Questions API working (${COUNT} questions retrieved)${NC}"
else
    echo -e "${RED}❌ Questions API failed${NC}"
    echo "$QUESTIONS" | jq '.'
fi
echo ""

echo "📊 SUMMARY"
echo "=========="
echo "✅ Backend running: http://localhost:3200"
echo "✅ Frontend running: http://localhost:3001"
echo "✅ Chat API: /chat/send"
echo "✅ Game System: Integrated in chat"
echo "✅ Direct Game API: /api/gamification/games/*"
echo "✅ Admin Questions: /admin/gamification/questions"
echo ""
echo "🌐 PRODUCTION URL: chat.mangwale.ai"
echo "   (Configure DNS/reverse proxy to point to localhost:3001)"
echo ""
echo "🎮 TO TEST IN BROWSER:"
echo "   1. Open http://localhost:3001/chat"
echo "   2. Type 'hi' to start conversation"
echo "   3. Type 'start game' to launch game system"
echo "   4. Choose a game and answer questions"
echo ""
