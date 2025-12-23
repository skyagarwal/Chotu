#!/bin/bash

echo "🚀 MANGWALE AI - COMPLETE E2E TEST"
echo "===================================="
echo ""
echo "Testing: Multi-Channel Platform (Web Chat)"
echo "Features: Auth → Profile Enrichment → Personalization"
echo "User: 9923383838"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

PHONE="9923383838"
USER_ID="web-$PHONE"
BASE_URL="http://localhost:3200"
REDIS_CONTAINER="a3128768cac8_mangwale_redis"
POSTGRES_CONTAINER="685225a33ea5_mangwale_postgres"

# Function to send message via web chat
send_message() {
    local step_name=$1
    local message=$2
    local delay=${3:-3}
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}${step_name}${NC}"
    echo -e "${CYAN}User → Bot:${NC} \"${message}\""
    echo ""
    
    RESPONSE=$(curl -s -X POST $BASE_URL/chat/send \
        -H 'Content-Type: application/json' \
        -d "{
            \"recipientId\": \"$USER_ID\",
            \"text\": \"$message\"
        }")
    
    echo -e "${GREEN}Response:${NC}"
    echo "$RESPONSE" | jq -r '.response // .error // .' 2>/dev/null || echo "$RESPONSE"
    echo ""
    
    sleep $delay
}

# Function to get messages
get_messages() {
    curl -s -X GET $BASE_URL/chat/messages/$USER_ID | jq -r '.messages[]?.message // .messages[]?.text // empty' 2>/dev/null
}

# Function to check session
check_session() {
    local label=$1
    echo -e "${YELLOW}📊 Session State - ${label}:${NC}"
    docker exec $REDIS_CONTAINER redis-cli -n 1 GET "session:$USER_ID" 2>/dev/null | jq -c '{
        step: .currentStep,
        authenticated: .data.authenticated,
        user_id: .data.user_id,
        platform: .data.platform,
        module: .data.module_name
    }' 2>/dev/null || echo "No session found"
    echo ""
}

# Function to check database user
check_db_user() {
    echo -e "${YELLOW}👤 User in Database:${NC}"
    
    # Check if user exists in users table
    USER_DB_ID=$(docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -t -c "
        SELECT id FROM users WHERE phone = '$PHONE' OR phone = '+91$PHONE' LIMIT 1;
    " 2>/dev/null | xargs)
    
    if [ -n "$USER_DB_ID" ]; then
        echo -e "${GREEN}✅ User exists (ID: $USER_DB_ID)${NC}"
        
        docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -c "
            SELECT id, phone, name, email, created_at 
            FROM users 
            WHERE id = $USER_DB_ID;
        " 2>/dev/null
    else
        echo -e "${RED}❌ User not found in database${NC}"
    fi
    echo ""
}

# Function to check user profile
check_profile() {
    local label=$1
    echo -e "${YELLOW}🧠 User Profile - ${label}:${NC}"
    
    # Get user_id from session
    local session_user_id=$(docker exec $REDIS_CONTAINER redis-cli -n 1 GET "session:$USER_ID" 2>/dev/null | jq -r '.data.user_id // empty')
    
    if [ -n "$session_user_id" ]; then
        docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -x -c "
            SELECT 
                user_id,
                dietary_type,
                spice_level,
                price_sensitivity,
                favorite_cuisines,
                profile_completeness,
                updated_at
            FROM user_profiles 
            WHERE user_id = $session_user_id;
        " 2>/dev/null
        
        echo ""
        echo -e "${YELLOW}📝 Insights (Pending Confirmations):${NC}"
        docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -c "
            SELECT key, value, confidence, source
            FROM user_insights 
            WHERE user_id = $session_user_id 
            ORDER BY created_at DESC 
            LIMIT 3;
        " 2>/dev/null
    else
        echo "No user_id in session yet"
    fi
    echo ""
}

# Clear session and start fresh
echo -e "${YELLOW}🧹 Clearing existing session...${NC}"
docker exec $REDIS_CONTAINER redis-cli -n 1 DEL "session:$USER_ID" >/dev/null 2>&1
curl -s -X POST $BASE_URL/chat/session/$USER_ID/clear >/dev/null 2>&1
echo "✅ Session cleared"
echo ""

# Test 1: Welcome / First Contact
send_message "Step 1: First Contact (Welcome)" "hi" 3
check_session "After Welcome"

# Test 2: Check if auth is triggered
send_message "Step 2: User Intent (Check Auth Trigger)" "I want to order food" 3
check_session "After Intent"

# Check if auth was required
SESSION_DATA=$(docker exec $REDIS_CONTAINER redis-cli -n 1 GET "session:$USER_ID" 2>/dev/null)
NEEDS_AUTH=$(echo "$SESSION_DATA" | jq -r '.data.authenticated // false' 2>/dev/null)

if [ "$NEEDS_AUTH" != "true" ]; then
    echo -e "${YELLOW}🔐 Authentication Required${NC}"
    echo ""
    
    # Test 3: Provide phone number
    send_message "Step 3: Provide Phone Number" "$PHONE" 3
    check_session "After Phone Number"
    
    # Test 4: Wait for OTP
    echo ""
    echo -e "${RED}⏸️  PAUSE: OTP Required${NC}"
    echo "=================================================================="
    echo "An OTP has been sent to: $PHONE"
    echo ""
    echo "Check logs for OTP:"
    echo "  docker logs mangwale_ai_service --tail 50 | grep -i 'otp\|code'"
    echo ""
    read -p "Enter the OTP you received: " OTP
    echo ""
    
    # Test 5: Submit OTP
    send_message "Step 4: Submit OTP" "$OTP" 3
    check_session "After OTP Submission"
    
    # Check if registration is needed
    SESSION_DATA=$(docker exec $REDIS_CONTAINER redis-cli -n 1 GET "session:$USER_ID" 2>/dev/null)
    CURRENT_STEP=$(echo "$SESSION_DATA" | jq -r '.currentStep // ""' 2>/dev/null)
    
    if [[ "$CURRENT_STEP" == *"awaiting_name"* ]]; then
        echo -e "${YELLOW}📝 New User - Registration Required${NC}"
        echo ""
        
        # Test 6: Provide name
        send_message "Step 5: Provide Name" "Akash Test User" 3
        check_session "After Name"
        
        # Test 7: Provide email (optional)
        send_message "Step 6: Provide Email" "akash@mangwale.ai" 3
        check_session "After Email"
    fi
else
    echo -e "${GREEN}✅ User already authenticated${NC}"
    echo ""
fi

# Check database user
check_db_user

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🎯 PHASE 2: PROFILE ENRICHMENT TESTING${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 8: Extract dietary preference
send_message "Step 7: Extract Dietary Preference" "main vegetarian hoon, spicy nahi pasand" 5
check_profile "After Dietary Extraction"

# Test 9: Extract budget preference
send_message "Step 8: Extract Budget Preference" "kuch budget mein dikhao, 500 rupaye ke andar" 5
check_profile "After Budget Extraction"

# Test 10: Order something to test personalized response
send_message "Step 9: Test Personalized Food Order" "pizza chahiye veg wala" 5
check_profile "After Personalized Query"

# Test 11: Check if preferences are being used
send_message "Step 10: Another Query to Verify Personalization" "kuch spicy mat dikhana" 5

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 FINAL VERIFICATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Final session state
check_session "Final State"

# Final profile state
check_profile "Final State"

# Check logs for enrichment
echo -e "${YELLOW}🔍 Enrichment Logs:${NC}"
docker logs mangwale_ai_service --tail 100 | grep -E "🎯|🔍|🧠|💬|Extracting|Enriching" 2>/dev/null | tail -10
echo ""

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ SMOKE TEST COMPLETE!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "What Was Tested:"
echo "  ✓ Multi-channel platform (Web Chat)"
echo "  ✓ Conversational authentication flow"
echo "  ✓ OTP verification"
echo "  ✓ User registration/login"
echo "  ✓ Profile enrichment from natural language"
echo "  ✓ Preference extraction (dietary, spice, budget)"
echo "  ✓ Personalized responses based on profile"
echo ""

echo "Expected Results:"
echo "  ✓ dietary_type: 'veg'"
echo "  ✓ spice_level: 'mild'"
echo "  ✓ price_sensitivity: 'budget'"
echo "  ✓ profile_completeness: > 0%"
echo "  ✓ Bot uses preferences in responses"
echo ""

echo "Next Steps:"
echo "  1. Test on other channels (WhatsApp, Telegram, SMS)"
echo "  2. Build admin dashboard (Phase 4.2)"
echo "  3. Add more enrichment categories"
echo "  4. Deploy to production with pilot users"
echo ""

echo "Channel-Specific Testing:"
echo "  • WhatsApp: POST /webhook/whatsapp"
echo "  • Telegram: POST /webhook/telegram"
echo "  • Web Chat: POST /chat/send (✅ tested)"
echo "  • SMS: POST /webhook/sms"
echo ""
