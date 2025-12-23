#!/bin/bash

# 🧪 E2E Chat Testing Script for Mangwale AI
# Tests complete conversation flow from greeting to order placement

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3200"
SESSION_ID="e2e-test-$(date +%s)"
TEST_PHONE="9158886329"
SLEEP_BETWEEN_MSGS=3

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         MANGWALE AI - E2E CHAT TESTING                      ║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║ Session ID: ${SESSION_ID}${NC}"
echo -e "${BLUE}║ Test Phone: ${TEST_PHONE}${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to send message and display response
send_message() {
    local message="$1"
    local step_name="$2"
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}👤 USER: ${NC}$message"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Send request and capture response
    local response=$(curl -s -X POST "$BACKEND_URL/api/chat/send" \
        -H "Content-Type: application/json" \
        -d "{\"recipientId\": \"$SESSION_ID\", \"text\": \"$message\", \"type\": \"text\"}")
    
    # Check if response is valid
    if [ -z "$response" ]; then
        echo -e "${RED}❌ No response received${NC}"
        return 1
    fi
    
    # Extract and display bot response
    local bot_message=$(echo "$response" | jq -r '.response.message // .response // "No message"' 2>/dev/null)
    local buttons=$(echo "$response" | jq -r '.response.buttons[]?.label // empty' 2>/dev/null)
    local success=$(echo "$response" | jq -r '.success' 2>/dev/null)
    
    echo -e "${BLUE}🤖 CHOTU: ${NC}"
    echo "$bot_message" | fold -s -w 70
    
    if [ -n "$buttons" ]; then
        echo -e "\n${YELLOW}📋 Buttons:${NC}"
        echo "$buttons" | while read -r btn; do
            echo "  • $btn"
        done
    fi
    
    # Check success status
    if [ "$success" = "true" ]; then
        echo -e "\n${GREEN}✅ Step: $step_name - SUCCESS${NC}"
    else
        echo -e "\n${RED}❌ Step: $step_name - FAILED${NC}"
    fi
    
    echo ""
    sleep $SLEEP_BETWEEN_MSGS
}

# Function to get OTP from database
get_otp() {
    echo -e "${YELLOW}🔐 Fetching OTP from database for $TEST_PHONE...${NC}"
    local otp=$(curl -s "$BACKEND_URL/api/user-context/test/otp?phone=$TEST_PHONE" | jq -r '.otp // empty')
    
    if [ -n "$otp" ]; then
        echo -e "${GREEN}✅ OTP Retrieved: $otp${NC}"
        echo "$otp"
    else
        echo -e "${RED}❌ Failed to retrieve OTP${NC}"
        echo ""
    fi
}

# Function to monitor backend logs
monitor_logs() {
    echo -e "${YELLOW}📝 Recent Backend Logs (Last 20 lines):${NC}"
    tail -20 /tmp/nest.log 2>/dev/null | grep -iE "(llm|gpt|claude|generating|response|error)" || echo "No recent logs"
    echo ""
}

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                  STARTING E2E TEST FLOW                       ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
sleep 2

# ═════════════════════════════════════════════════════════════════
# STEP 1: Initial Greeting
# ═════════════════════════════════════════════════════════════════
echo -e "${BLUE}╔═══ STEP 1: GREETING ═══╗${NC}"
send_message "Hello" "Greeting"

# ═════════════════════════════════════════════════════════════════
# STEP 2: Trigger Food Order Flow
# ═════════════════════════════════════════════════════════════════
echo -e "${BLUE}╔═══ STEP 2: FOOD ORDER REQUEST ═══╗${NC}"
send_message "I want to order food" "Order Food Trigger"

# ═════════════════════════════════════════════════════════════════
# STEP 3: Specify Food Preferences
# ═════════════════════════════════════════════════════════════════
echo -e "${BLUE}╔═══ STEP 3: FOOD SEARCH ═══╗${NC}"
send_message "I want vada pav and misal pav" "Food Search"

# ═════════════════════════════════════════════════════════════════
# STEP 4: Check if Authentication Required
# ═════════════════════════════════════════════════════════════════
echo -e "${BLUE}╔═══ STEP 4: CHECK AUTH STATUS ═══╗${NC}"
send_message "Add to cart" "Add to Cart"

# Wait for potential auth prompt
sleep 3

# ═════════════════════════════════════════════════════════════════
# STEP 5: Login with Phone Number
# ═════════════════════════════════════════════════════════════════
echo -e "${BLUE}╔═══ STEP 5: LOGIN WITH PHONE ═══╗${NC}"
send_message "$TEST_PHONE" "Provide Phone Number"

# Wait for OTP to be generated
sleep 2

# ═════════════════════════════════════════════════════════════════
# STEP 6: Get OTP and Submit
# ═════════════════════════════════════════════════════════════════
echo -e "${BLUE}╔═══ STEP 6: OTP VERIFICATION ═══╗${NC}"
OTP=$(get_otp)
if [ -n "$OTP" ]; then
    send_message "$OTP" "OTP Verification"
else
    echo -e "${RED}⚠️  Cannot proceed without OTP${NC}"
fi

# ═════════════════════════════════════════════════════════════════
# STEP 7: Provide Address
# ═════════════════════════════════════════════════════════════════
echo -e "${BLUE}╔═══ STEP 7: ADDRESS COLLECTION ═══╗${NC}"
send_message "MG Road, College Road, Nashik 422005" "Provide Address"

# ═════════════════════════════════════════════════════════════════
# STEP 8: Proceed to Checkout
# ═════════════════════════════════════════════════════════════════
echo -e "${BLUE}╔═══ STEP 8: CHECKOUT ═══╗${NC}"
send_message "Proceed to checkout" "Checkout"

# ═════════════════════════════════════════════════════════════════
# FINAL: Summary
# ═════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                      TEST SUMMARY                             ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Session ID: ${SESSION_ID}${NC}"
echo -e "${GREEN}Test Phone: ${TEST_PHONE}${NC}"
echo ""

# Show recent logs
monitor_logs

echo -e "${GREEN}✅ E2E Test Complete!${NC}"
echo -e "${YELLOW}💡 Next: Check order status in PHP backend${NC}"
echo -e "${YELLOW}💡 Then: Test same flow on WhatsApp channel${NC}"
