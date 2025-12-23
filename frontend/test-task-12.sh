#!/bin/bash

# Task 12 Backend Enhancement - Test Script
# Tests all 6 new agent endpoints

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3200"
AGENT_ID="agent_food"

echo -e "${YELLOW}=== Task 12: Agent Backend Enhancement Tests ===${NC}\n"

# Counter for passed tests
PASSED=0
TOTAL=0

# Test 1: GET /agents/:id - Check enhanced fields
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 1: GET /agents/:id - Enhanced with nluModel, config fields${NC}"
RESPONSE=$(curl -s "$API_URL/agents/$AGENT_ID")
if echo "$RESPONSE" | jq -e '.nluModel' > /dev/null && \
   echo "$RESPONSE" | jq -e '.confidenceThreshold' > /dev/null && \
   echo "$RESPONSE" | jq -e '.maxTokens' > /dev/null && \
   echo "$RESPONSE" | jq -e '.temperature' > /dev/null && \
   echo "$RESPONSE" | jq -e '.systemPrompt' > /dev/null && \
   echo "$RESPONSE" | jq -e '.createdAt' > /dev/null && \
   echo "$RESPONSE" | jq -e '.updatedAt' > /dev/null; then
    echo -e "${GREEN}✓ PASSED${NC} - All enhanced fields present"
    echo "$RESPONSE" | jq '{nluModel, confidenceThreshold, maxTokens, temperature}'
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Missing enhanced fields"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 2: PATCH /agents/:id - Update agent configuration
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 2: PATCH /agents/:id - Update agent configuration${NC}"
UPDATE_DATA='{"status":"active","temperature":0.9,"maxTokens":4096}'
RESPONSE=$(curl -s -X PATCH "$API_URL/agents/$AGENT_ID" \
    -H 'Content-Type: application/json' \
    -d "$UPDATE_DATA")
if echo "$RESPONSE" | jq -e '.id' > /dev/null && \
   echo "$RESPONSE" | jq -e '.status' > /dev/null; then
    echo -e "${GREEN}✓ PASSED${NC} - Agent updated successfully"
    echo "$RESPONSE" | jq '{id, status, flows: .flows | length}'
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Update failed"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 3: GET /agents/:id/metrics - Get performance metrics
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 3: GET /agents/:id/metrics - Performance metrics${NC}"
RESPONSE=$(curl -s "$API_URL/agents/$AGENT_ID/metrics")
if echo "$RESPONSE" | jq -e '.successRate' > /dev/null && \
   echo "$RESPONSE" | jq -e '.avgResponseTime' > /dev/null && \
   echo "$RESPONSE" | jq -e '.conversationsToday' > /dev/null && \
   echo "$RESPONSE" | jq -e '.conversationsThisWeek' > /dev/null && \
   echo "$RESPONSE" | jq -e '.topIntents' > /dev/null && \
   echo "$RESPONSE" | jq -e '.recentActivity' > /dev/null; then
    echo -e "${GREEN}✓ PASSED${NC} - Metrics endpoint working"
    echo "$RESPONSE" | jq '{successRate, avgResponseTime, conversationsToday, topIntentsCount: .topIntents | length}'
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Missing metrics fields"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 4: GET /agents/:id/metrics with timeRange parameter
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 4: GET /agents/:id/metrics?timeRange=24h - Time range filter${NC}"
RESPONSE=$(curl -s "$API_URL/agents/$AGENT_ID/metrics?timeRange=24h")
if echo "$RESPONSE" | jq -e '.successRate' > /dev/null; then
    echo -e "${GREEN}✓ PASSED${NC} - Time range parameter working"
    echo "$RESPONSE" | jq '{successRate, conversationsToday}'
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Time range failed"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 5: GET /agents/:id/conversations - Get conversation history
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 5: GET /agents/:id/conversations - Conversation history${NC}"
RESPONSE=$(curl -s "$API_URL/agents/$AGENT_ID/conversations?limit=10")
if echo "$RESPONSE" | jq -e 'type == "array"' > /dev/null; then
    COUNT=$(echo "$RESPONSE" | jq 'length')
    echo -e "${GREEN}✓ PASSED${NC} - Conversations endpoint working (returned $COUNT items)"
    if [ "$COUNT" -gt 0 ]; then
        echo "$RESPONSE" | jq '.[0] | {id, userId, intent, confidence, success}'
    fi
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Expected array response"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 6: GET /agents/:id/flows - Get agent flows
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 6: GET /agents/:id/flows - Agent flows${NC}"
RESPONSE=$(curl -s "$API_URL/agents/$AGENT_ID/flows")
if echo "$RESPONSE" | jq -e 'type == "array"' > /dev/null && \
   echo "$RESPONSE" | jq -e '.[0].id' > /dev/null && \
   echo "$RESPONSE" | jq -e '.[0].enabled' > /dev/null && \
   echo "$RESPONSE" | jq -e '.[0].steps' > /dev/null && \
   echo "$RESPONSE" | jq -e '.[0].usageCount' > /dev/null; then
    COUNT=$(echo "$RESPONSE" | jq 'length')
    echo -e "${GREEN}✓ PASSED${NC} - Flows endpoint working (returned $COUNT flows)"
    echo "$RESPONSE" | jq '.[0] | {id, name, enabled, steps, usageCount}'
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Invalid flows response"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 7: POST /agents/:id/test - Test agent with message
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 7: POST /agents/:id/test - Test agent response${NC}"
TEST_MESSAGE='{"message":"I want to order pizza"}'
RESPONSE=$(curl -s -X POST "$API_URL/agents/$AGENT_ID/test" \
    -H 'Content-Type: application/json' \
    -d "$TEST_MESSAGE")
if echo "$RESPONSE" | jq -e '.message' > /dev/null && \
   echo "$RESPONSE" | jq -e '.intent' > /dev/null && \
   echo "$RESPONSE" | jq -e '.confidence' > /dev/null; then
    echo -e "${GREEN}✓ PASSED${NC} - Test endpoint working"
    echo "$RESPONSE" | jq '{intent, confidence, messagePreview: .message | .[0:60]}'
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Invalid test response"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 8: POST /agents/:id/test - Different message
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 8: POST /agents/:id/test - Second test message${NC}"
TEST_MESSAGE='{"message":"What is the status of my order?"}'
RESPONSE=$(curl -s -X POST "$API_URL/agents/$AGENT_ID/test" \
    -H 'Content-Type: application/json' \
    -d "$TEST_MESSAGE")
if echo "$RESPONSE" | jq -e '.confidence' > /dev/null; then
    CONFIDENCE=$(echo "$RESPONSE" | jq -r '.confidence')
    if (( $(echo "$CONFIDENCE >= 0.0 && $CONFIDENCE <= 1.0" | bc -l) )); then
        echo -e "${GREEN}✓ PASSED${NC} - Confidence in valid range"
        echo "$RESPONSE" | jq '{intent, confidence}'
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} - Confidence out of range: $CONFIDENCE"
    fi
else
    echo -e "${RED}✗ FAILED${NC} - Missing confidence field"
fi
echo ""

# Test 9: Error handling - Invalid agent ID
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 9: Error Handling - Non-existent agent${NC}"
RESPONSE=$(curl -s "$API_URL/agents/agent_nonexistent")
if echo "$RESPONSE" | jq -e '.statusCode == 404' > /dev/null || \
   echo "$RESPONSE" | grep -q "not found"; then
    echo -e "${GREEN}✓ PASSED${NC} - 404 error handled correctly"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Error handling not working"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 10: Check routes are registered
TOTAL=$((TOTAL + 1))
echo -e "${YELLOW}Test 10: Routes Registration Check${NC}"
cd /home/ubuntu/Devs/mangwale-ai
ROUTES_CHECK=$(docker logs mangwale_ai_service 2>&1 | grep -c "/agents/:id")
if [ "$ROUTES_CHECK" -ge 6 ]; then
    echo -e "${GREEN}✓ PASSED${NC} - All 6 new agent routes registered"
    echo "  - PATCH /agents/:id"
    echo "  - GET /agents/:id/metrics"
    echo "  - GET /agents/:id/conversations"
    echo "  - GET /agents/:id/flows"
    echo "  - POST /agents/:id/test"
    echo "  - GET /agents/:id (enhanced)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Expected 6+ routes, found $ROUTES_CHECK"
fi
echo ""

# Summary
echo -e "${YELLOW}=== Test Summary ===${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC} / $TOTAL"
if [ $PASSED -eq $TOTAL ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
