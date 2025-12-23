#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PHONE="+919999999999"  # Using a different test number
BASE_URL="http://localhost:3200"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}║        🤖 AGENT SYSTEM TEST (Authenticated User)               ║${NC}"
echo -e "${BLUE}║        Testing LLM-Powered Agents with Function Calling       ║${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Setup authenticated session
echo -e "${YELLOW}🔧 Setting up authenticated test session...${NC}"
redis-cli DEL "session:${PHONE}" > /dev/null 2>&1
redis-cli HSET "session:${PHONE}" \
  currentStep "main_menu" \
  "data.authenticated" "true" \
  "data.auth_token" "test_token_123" \
  "data.user_name" "Test User" \
  "data.module_name" "food" \
  > /dev/null 2>&1

echo -e "${GREEN}✅ Session created: Authenticated user at main_menu step${NC}"
echo ""
sleep 1

# Function to send message and show response
test_agent() {
    local message="$1"
    local agent_name="$2"
    local description="$3"
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📝 Test ${TEST_NUM}: ${description}${NC}"
    echo -e "${BLUE}🎯 Expected Agent: ${agent_name}${NC}"
    echo -e "${BLUE}💬 User Query: \"${message}\"${NC}"
    echo ""
    
    # Send message
    RESULT=$(curl -s "${BASE_URL}/chat/send" \
      -H "Content-Type: application/json" \
      -d "{\"recipientId\": \"${PHONE}\", \"text\": \"${message}\"}")
    
    echo "$RESULT" | jq '.'
    
    # Wait for processing
    sleep 3
    
    # Get bot response
    echo ""
    echo -e "${GREEN}🤖 Bot Response:${NC}"
    MESSAGES=$(curl -s "${BASE_URL}/chat/messages/${PHONE}")
    echo "$MESSAGES" | jq -r '.messages[-1]? | "   📨 \(.)"'
    
    echo ""
    echo -e "${BLUE}📊 Agent Execution (check logs):${NC}"
    pm2 logs mangwale-ai --lines 50 --nostream 2>/dev/null | \
      grep -A 3 "Routing to Agent\|Agent generated\|Functions called" | \
      tail -10 | sed 's/^/   /'
    
    echo ""
    sleep 2
    TEST_NUM=$((TEST_NUM + 1))
}

TEST_NUM=1

# Test 1: Search Query (SearchAgent)
test_agent \
  "show me pizza under 500 rupees" \
  "SearchAgent" \
  "Product Search with Price Filter"

# Test 2: Natural Language Search (SearchAgent)
test_agent \
  "I'm craving biryani, find me good restaurants" \
  "SearchAgent" \
  "Natural Language Restaurant Search"

# Test 3: Complaint (ComplaintsAgent)
test_agent \
  "my food was cold and quality was bad, I want a refund" \
  "ComplaintsAgent" \
  "Complaint with Refund Request"

# Test 4: Order Tracking (Generic query)
test_agent \
  "where is my order?" \
  "General NLU" \
  "Order Status Query"

# Test 5: Package Booking (BookingAgent)
test_agent \
  "I need to send a package to Mumbai" \
  "BookingAgent" \
  "Parcel Delivery Booking"

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    ✅ TESTING COMPLETE                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📊 Test Summary:${NC}"
echo -e "   • ${TEST_NUM} agent tests executed"
echo -e "   • Tested SearchAgent, ComplaintsAgent, BookingAgent"
echo -e "   • Tested LLM function calling"
echo ""
echo -e "${GREEN}🔍 View detailed logs:${NC}"
echo -e "   ${BLUE}pm2 logs mangwale-ai --lines 200 | grep -i agent${NC}"
echo ""
echo -e "${YELLOW}📝 View all bot responses:${NC}"
echo -e "   ${BLUE}curl http://localhost:3200/chat/messages/${PHONE} | jq '.messages'${NC}"
echo ""
echo -e "${GREEN}🧹 Cleanup test session:${NC}"
echo -e "   ${BLUE}redis-cli DEL session:${PHONE}${NC}"
echo ""
