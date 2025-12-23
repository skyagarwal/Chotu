#!/bin/bash
# Complete Parcel Booking Flow Test
# Tests authentication and full parcel delivery booking

set -e

API_URL="${API_URL:-http://localhost:3200}"
RECIPIENT_ID="parcel-flow-$(date +%s)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📦 Mangwale AI - Complete Parcel Booking Flow Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Recipient ID: ${YELLOW}$RECIPIENT_ID${NC}"
echo ""

# Helper function to send message and get response
send_and_wait() {
    local message="$1"
    local step_name="$2"
    
    echo -e "${BLUE}→ $step_name${NC}"
    echo -e "  User: ${CYAN}$message${NC}"
    
    # Send message
    curl -sS -X POST "$API_URL/chat/send" \
        -H "Content-Type: application/json" \
        -d "{\"recipientId\":\"$RECIPIENT_ID\",\"text\":\"$message\"}" > /dev/null
    
    # Wait for processing
    sleep 2
    
    # Get response
    local response=$(curl -sS "$API_URL/chat/messages/$RECIPIENT_ID")
    local bot_message=$(echo "$response" | jq -r '.messages[0].message // "No response"')
    
    echo -e "  Bot: ${GREEN}$bot_message${NC}"
    echo ""
}

# Initialize session - start with regular welcome flow
echo -e "${YELLOW}═══ Phase 1: Session Initialization ═══${NC}"
echo ""

send_and_wait "hi" "Step 1: Initial greeting"

# Select login method (OTP)
send_and_wait "1" "Step 2: Select OTP login"

# Enter phone number
echo -e "${YELLOW}═══ Phase 2: Authentication ═══${NC}"
echo ""

send_and_wait "9876543210" "Step 3: Enter phone number"

echo -e "${RED}⚠ Note: In real flow, you would receive an OTP SMS${NC}"
echo -e "${YELLOW}For testing, you can check PHP backend logs for the OTP code${NC}"
echo ""
read -p "Enter the 6-digit OTP code (or press Enter to skip OTP test): " otp_code

if [ -n "$otp_code" ]; then
    send_and_wait "$otp_code" "Step 4: Verify OTP"
    
    # If new user, might need to provide name and email
    read -p "Did bot ask for your name? (y/n): " needs_name
    if [ "$needs_name" = "y" ]; then
        send_and_wait "John Doe" "Step 5a: Provide name"
        send_and_wait "john@example.com" "Step 5b: Provide email"
    fi
fi

echo -e "${YELLOW}═══ Phase 3: Module Selection ═══${NC}"
echo ""

# At this point, user should see modules menu
# For parcel delivery, user might see options or we can directly start parcel flow
echo -e "${CYAN}Now let's directly test the parcel AI flow...${NC}"
echo ""

# Start parcel flow directly
echo -e "${YELLOW}═══ Phase 4: Parcel AI Flow (Direct) ═══${NC}"
echo ""

curl -sS -X POST "$API_URL/chat/start/parcel/$RECIPIENT_ID" > /dev/null
echo -e "${GREEN}✓${NC} Initialized parcel_delivery_ai session"
echo ""

# Test various parcel intents
send_and_wait "I want to send a parcel" "Step 6: Express parcel intent"

send_and_wait "I need to ship a package to Mumbai" "Step 7: Provide destination hint"

send_and_wait "It's urgent" "Step 8: Add urgency context"

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Test flow completed${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}📊 Summary:${NC}"
echo "  - Recipient: $RECIPIENT_ID"
echo "  - API: $API_URL"
echo ""
echo -e "${CYAN}🔍 Next steps:${NC}"
echo "  1. Check conversation logs: tail -f /tmp/mangwale-ai.log"
echo "  2. View all messages: curl $API_URL/chat/messages/$RECIPIENT_ID | jq ."
echo "  3. Test web UI for interactive conversation"
echo ""
