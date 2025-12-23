#!/bin/bash
# Complete API Testing Script for Mangwale Dashboard
# Tests all backend endpoints to verify deployment

set -e

BASE_URL="http://localhost:3200"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Mangwale Dashboard API Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Dashboard Stats API
echo -e "${BLUE}[1/6] Testing Dashboard Stats API...${NC}"
RESPONSE=$(curl -s ${BASE_URL}/stats/dashboard)
if echo "$RESPONSE" | jq -e '.todayMessages' > /dev/null 2>&1; then
    MESSAGES=$(echo "$RESPONSE" | jq -r '.todayMessages')
    SUCCESS_RATE=$(echo "$RESPONSE" | jq -r '.successRate')
    echo -e "${GREEN}✅ Dashboard Stats API: ${MESSAGES} messages, ${SUCCESS_RATE}% success rate${NC}"
else
    echo -e "${RED}❌ Dashboard Stats API failed${NC}"
fi
echo ""

# Test 2: Agents Stats API
echo -e "${BLUE}[2/6] Testing Agents Stats API...${NC}"
RESPONSE=$(curl -s ${BASE_URL}/stats/agents)
if echo "$RESPONSE" | jq -e '.agents' > /dev/null 2>&1; then
    AGENT_COUNT=$(echo "$RESPONSE" | jq '.agents | length')
    echo -e "${GREEN}✅ Agents Stats API: ${AGENT_COUNT} agents${NC}"
else
    echo -e "${RED}❌ Agents Stats API failed${NC}"
fi
echo ""

# Test 3: Flows Stats API
echo -e "${BLUE}[3/6] Testing Flows Stats API...${NC}"
RESPONSE=$(curl -s ${BASE_URL}/stats/flows)
if echo "$RESPONSE" | jq -e 'length' > /dev/null 2>&1; then
    FLOW_COUNT=$(echo "$RESPONSE" | jq 'length')
    echo -e "${GREEN}✅ Flows Stats API: ${FLOW_COUNT} flows${NC}"
else
    echo -e "${RED}❌ Flows Stats API failed${NC}"
fi
echo ""

# Test 4: Agents API (New)
echo -e "${BLUE}[4/6] Testing Agents API...${NC}"
RESPONSE=$(curl -s ${BASE_URL}/agents)
if echo "$RESPONSE" | jq -e 'length' > /dev/null 2>&1; then
    AGENT_COUNT=$(echo "$RESPONSE" | jq 'length')
    AGENT_NAMES=$(echo "$RESPONSE" | jq -r '.[].name' | tr '\n' ', ' | sed 's/,$//')
    echo -e "${GREEN}✅ Agents API: ${AGENT_COUNT} agents (${AGENT_NAMES})${NC}"
else
    echo -e "${RED}❌ Agents API failed${NC}"
fi
echo ""

# Test 5: Agents Detail API
echo -e "${BLUE}[5/6] Testing Agents Detail API...${NC}"
RESPONSE=$(curl -s ${BASE_URL}/agents/agent_general)
if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    AGENT_NAME=$(echo "$RESPONSE" | jq -r '.name')
    ACCURACY=$(echo "$RESPONSE" | jq -r '.accuracy')
    MESSAGES=$(echo "$RESPONSE" | jq -r '.messagesHandled')
    echo -e "${GREEN}✅ Agent Detail API: ${AGENT_NAME} - ${ACCURACY}% accuracy, ${MESSAGES} messages${NC}"
else
    echo -e "${RED}❌ Agent Detail API failed${NC}"
fi
echo ""

# Test 6: LLM Chat API
echo -e "${BLUE}[6/6] Testing LLM Chat API...${NC}"
RESPONSE=$(curl -s -X POST ${BASE_URL}/llm/chat \
    -H "Content-Type: application/json" \
    -d '{"provider":"vllm","messages":[{"role":"user","content":"Say hello"}],"maxTokens":10}')
if echo "$RESPONSE" | jq -e '.content' > /dev/null 2>&1; then
    CONTENT=$(echo "$RESPONSE" | jq -r '.content' | cut -c 1-50)
    LATENCY=$(echo "$RESPONSE" | jq -r '.processingTimeMs')
    echo -e "${GREEN}✅ LLM Chat API: Response in ${LATENCY}ms${NC}"
    echo -e "${GREEN}   Response: \"${CONTENT}...\"${NC}"
else
    echo -e "${RED}❌ LLM Chat API failed${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Suite Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "1. Restart frontend: ${BLUE}cd /home/ubuntu/Devs/mangwale-unified-dashboard && npm run dev${NC}"
echo -e "2. Visit dashboard: ${BLUE}http://localhost:3000/admin/dashboard${NC}"
echo -e "3. Test Agents page: ${BLUE}http://localhost:3000/admin/agents${NC}"
echo -e "4. Test LLM Chat: ${BLUE}http://localhost:3000/admin/llm-chat${NC}"
echo ""
