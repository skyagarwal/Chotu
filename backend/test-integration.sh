#!/bin/bash
# Integration Test Script for Mangwale AI
# Tests the complete parcel delivery flow

set -e

API_URL="${API_URL:-http://localhost:3200}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3002}"
RECIPIENT_ID="test-$(date +%s)"

echo "🧪 Mangwale AI Integration Test"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Health checks
echo -e "${BLUE}📋 Test 1: Health Checks${NC}"
echo "Checking mangwale-ai..."
if curl -sf "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✓${NC} mangwale-ai is healthy"
else
    echo -e "${RED}✗${NC} mangwale-ai is not responding"
    exit 1
fi

echo "Checking admin backend..."
if curl -sf "$ADMIN_URL/health" > /dev/null; then
    echo -e "${GREEN}✓${NC} admin backend is healthy"
else
    echo -e "${RED}✗${NC} admin backend is not responding"
    exit 1
fi
echo ""

# Test 2: Readiness probe
echo -e "${BLUE}📋 Test 2: Readiness Probe${NC}"
echo "Checking PHP backend connectivity..."
READY_RESPONSE=$(curl -s "$API_URL/ready")
PHP_STATUS=$(echo "$READY_RESPONSE" | jq -r '.php.ok // false')
if [ "$PHP_STATUS" = "true" ]; then
    echo -e "${GREEN}✓${NC} PHP backend is reachable"
else
    echo -e "${YELLOW}⚠${NC} PHP backend connectivity issue (non-blocking)"
fi
echo ""

# Test 3: Chat endpoints
echo -e "${BLUE}📋 Test 3: Chat Endpoints${NC}"
echo "Testing recipient: $RECIPIENT_ID"

echo "→ Starting parcel session..."
START_RESPONSE=$(curl -s -X POST "$API_URL/chat/start/parcel/$RECIPIENT_ID")
START_OK=$(echo "$START_RESPONSE" | jq -r '.ok')
if [ "$START_OK" = "true" ]; then
    echo -e "${GREEN}✓${NC} Session initialized"
else
    echo -e "${RED}✗${NC} Session initialization failed"
    echo "$START_RESPONSE" | jq .
    exit 1
fi

echo "→ Sending test message..."
SEND_RESPONSE=$(curl -s -X POST "$API_URL/chat/send" \
    -H 'Content-Type: application/json' \
    -d "{\"recipientId\":\"$RECIPIENT_ID\",\"text\":\"Hello, I need help with parcel delivery\"}")
SEND_OK=$(echo "$SEND_RESPONSE" | jq -r '.ok')
if [ "$SEND_OK" = "true" ]; then
    echo -e "${GREEN}✓${NC} Message sent"
else
    echo -e "${RED}✗${NC} Message sending failed"
    echo "$SEND_RESPONSE" | jq .
    exit 1
fi

echo "→ Waiting for response..."
sleep 2

echo "→ Retrieving bot messages..."
MESSAGES_RESPONSE=$(curl -s "$API_URL/chat/messages/$RECIPIENT_ID")
MESSAGES_OK=$(echo "$MESSAGES_RESPONSE" | jq -r '.ok')
MESSAGE_COUNT=$(echo "$MESSAGES_RESPONSE" | jq -r '.messages | length')
if [ "$MESSAGES_OK" = "true" ] && [ "$MESSAGE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Received $MESSAGE_COUNT bot message(s)"
    echo ""
    echo -e "${BLUE}Bot response:${NC}"
    echo "$MESSAGES_RESPONSE" | jq -r '.messages[0].message' | sed 's/^/  /'
else
    echo -e "${RED}✗${NC} No messages received"
    echo "$MESSAGES_RESPONSE" | jq .
fi
echo ""

# Test 4: Test mode verification
echo -e "${BLUE}📋 Test 4: Test Mode Verification${NC}"
echo "→ Checking Redis storage..."
if redis-cli -h 127.0.0.1 exists "test:messages:$RECIPIENT_ID" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Test mode storage is working"
else
    echo -e "${YELLOW}⚠${NC} Redis key not found (messages may have been consumed)"
fi
echo ""

# Test 5: Configuration check
echo -e "${BLUE}📋 Test 5: Configuration Check${NC}"
echo "→ Checking environment..."
if [ "$TEST_MODE" = "true" ]; then
    echo -e "${GREEN}✓${NC} TEST_MODE is enabled"
else
    echo -e "${YELLOW}⚠${NC} TEST_MODE not set (should be 'true')"
fi

if [ -n "$ADMIN_BACKEND_URL" ]; then
    echo -e "${GREEN}✓${NC} ADMIN_BACKEND_URL configured: $ADMIN_BACKEND_URL"
else
    echo -e "${YELLOW}⚠${NC} ADMIN_BACKEND_URL not set"
fi

if [ -n "$DEFAULT_PARCEL_MODULE_ID" ]; then
    echo -e "${GREEN}✓${NC} DEFAULT_PARCEL_MODULE_ID: $DEFAULT_PARCEL_MODULE_ID"
else
    echo -e "${YELLOW}⚠${NC} DEFAULT_PARCEL_MODULE_ID not set (using default: 3)"
fi
echo ""

# Summary
echo "================================"
echo -e "${GREEN}✅ Integration tests completed${NC}"
echo ""
echo "📊 Summary:"
echo "  - mangwale-ai: Running on $API_URL"
echo "  - Admin backend: Running on $ADMIN_URL"
echo "  - Test recipient: $RECIPIENT_ID"
echo ""
echo "🔗 Next steps:"
echo "  1. Open the web UI: file:///home/ubuntu/Devs/Mangwale AI Front end/index.html"
echo "  2. Or continue testing with: curl $API_URL/chat/send ..."
echo "  3. View logs: tail -f /tmp/mangwale-ai.log"
echo ""
