#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PHONE="+919876543210"
BASE_URL="http://localhost:3200"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}║        🤖 AGENT SYSTEM INTERACTIVE TEST                        ║${NC}"
echo -e "${BLUE}║        Multi-Channel AI-Powered Conversation                   ║${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Testing User: ${PHONE}${NC}"
echo ""

# Function to send message and get response
send_message() {
    local message="$1"
    local description="$2"
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📝 Test: ${description}${NC}"
    echo -e "${BLUE}💬 User: ${message}${NC}"
    echo ""
    
    # Send message
    curl -s "${BASE_URL}/chat/send" \
      -H "Content-Type: application/json" \
      -d "{\"recipientId\": \"${PHONE}\", \"text\": \"${message}\"}" | jq '.'
    
    echo ""
    sleep 2
    
    # Get bot responses
    echo -e "${GREEN}🤖 Bot Response:${NC}"
    curl -s "${BASE_URL}/chat/messages/${PHONE}" | jq -r '.messages[]? | "   \(.)"'
    echo ""
    sleep 1
}

# Test 1: Initial greeting (should show welcome or main menu)
send_message "hi" "Initial Greeting"

# Test 2: Search query (should trigger SearchAgent)
send_message "show me pizza under 500 rupees" "Search Query - SearchAgent with function calling"

# Test 3: Another search query
send_message "find restaurants near me with biryani" "Natural Language Search - SearchAgent"

# Test 4: Order tracking query
send_message "where is my order" "Order Tracking - Should use agent intelligence"

# Test 5: Complaint (should trigger ComplaintsAgent)
send_message "my food was cold and tasted bad, I want a refund" "Complaint - ComplaintsAgent with empathy"

# Test 6: Booking query (should trigger BookingAgent)
send_message "I need to send a package from Nashik to Mumbai" "Parcel Booking - BookingAgent"

# Test 7: General help
send_message "I need help with my order" "General Help Query"

# Test 8: Wallet query
send_message "what is my wallet balance" "Wallet Balance Query"

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    ✅ TESTING COMPLETE                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📊 Test Summary:${NC}"
echo -e "   • 8 test scenarios executed"
echo -e "   • Testing SearchAgent, ComplaintsAgent, BookingAgent"
echo -e "   • Testing function calling and LLM responses"
echo ""
echo -e "${GREEN}🔍 Check logs for detailed agent execution:${NC}"
echo -e "   ${BLUE}pm2 logs mangwale-ai --lines 200${NC}"
echo ""
echo -e "${YELLOW}📝 View all bot responses:${NC}"
echo -e "   ${BLUE}curl http://localhost:3200/chat/messages/${PHONE}${NC}"
echo ""
