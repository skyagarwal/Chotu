#!/bin/bash
# ============================================
# Mangwale AI - 100 User Journey Test Script
# Tests: Greeting, General, Parcel, Food flows
# ============================================

API_URL="http://localhost:3200/api/test-chat/send"
REDIS_CONTAINER="e5dd96282159_mangwale_redis"
RESULTS_FILE="/tmp/journey_results.json"
PASS_COUNT=0
FAIL_COUNT=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize results
echo "[]" > $RESULTS_FILE

send_message() {
    local session_id=$1
    local message=$2
    local expected_pattern=$3
    local test_name=$4
    
    # Send message
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"recipientId\": \"$session_id\", \"text\": \"$message\"}" 2>&1)
    
    sleep 1
    
    # Get bot response from Redis
    bot_response=$(docker exec $REDIS_CONTAINER redis-cli -n 1 LRANGE "bot_messages:web-$session_id" -1 -1 2>/dev/null | head -1)
    
    if echo "$bot_response" | grep -qi "$expected_pattern"; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} $test_name"
        echo "  Expected: $expected_pattern"
        echo "  Got: ${bot_response:0:100}..."
        ((FAIL_COUNT++))
        return 1
    fi
}

clear_session() {
    local session_id=$1
    docker exec $REDIS_CONTAINER redis-cli -n 1 DEL "session:web-$session_id" "bot_messages:web-$session_id" > /dev/null 2>&1
}

echo "============================================"
echo "  MANGWALE AI - 100 USER JOURNEY TESTS"
echo "============================================"
echo ""

# ============================================
# SECTION 1: GREETING FLOWS (20 tests)
# ============================================
echo -e "${BLUE}━━━ SECTION 1: GREETING FLOWS (20 tests) ━━━${NC}"

GREETINGS=(
    "hi"
    "hello"
    "hey"
    "namaste"
    "namaskar"
    "hii"
    "helo"
    "hiiii"
    "good morning"
    "good afternoon"
    "good evening"
    "sup"
    "yo"
    "kem cho"
    "kya haal"
    "kaise ho"
    "hello ji"
    "hii there"
    "hey there"
    "greetings"
)

for i in "${!GREETINGS[@]}"; do
    session="greeting-test-$i"
    clear_session "$session"
    send_message "$session" "${GREETINGS[$i]}" "welcome\|help\|assist\|Hello\|Hi\|how can" "Greeting #$((i+1)): '${GREETINGS[$i]}'"
done

echo ""

# ============================================
# SECTION 2: HELP/FAQ FLOWS (15 tests)
# ============================================
echo -e "${BLUE}━━━ SECTION 2: HELP/FAQ FLOWS (15 tests) ━━━${NC}"

HELP_QUERIES=(
    "help"
    "what can you do"
    "kya kar sakte ho"
    "options"
    "menu"
    "services"
    "help me"
    "I need help"
    "mujhe madad chahiye"
    "what services do you offer"
    "tell me about mangwale"
    "kya kya hai"
    "features"
    "how does this work"
    "guide me"
)

for i in "${!HELP_QUERIES[@]}"; do
    session="help-test-$i"
    clear_session "$session"
    send_message "$session" "${HELP_QUERIES[$i]}" "food\|parcel\|delivery\|help\|service\|assist" "Help #$((i+1)): '${HELP_QUERIES[$i]}'"
done

echo ""

# ============================================
# SECTION 3: PARCEL INTENT DETECTION (20 tests)
# ============================================
echo -e "${BLUE}━━━ SECTION 3: PARCEL INTENT DETECTION (20 tests) ━━━${NC}"

PARCEL_INTENTS=(
    "I want to send a parcel"
    "parcel bhejni hai"
    "delivery karni hai"
    "send something"
    "pickup and drop"
    "genie service"
    "courier chahiye"
    "mujhe parcel bhejna hai"
    "document deliver karna hai"
    "keys bhejni hai"
    "tiffin delivery"
    "bike delivery chahiye"
    "auto delivery"
    "tempo booking"
    "nashik me parcel"
    "gangapur road se college road"
    "cbs se satpur delivery"
    "same day delivery"
    "urgent delivery"
    "parcel ka rate kya hai"
)

for i in "${!PARCEL_INTENTS[@]}"; do
    session="parcel-intent-$i"
    clear_session "$session"
    send_message "$session" "${PARCEL_INTENTS[$i]}" "phone\|pickup\|location\|delivery\|parcel\|OTP" "Parcel Intent #$((i+1)): '${PARCEL_INTENTS[$i]}'"
done

echo ""

# ============================================
# SECTION 4: FOOD INTENT DETECTION (20 tests)
# ============================================
echo -e "${BLUE}━━━ SECTION 4: FOOD INTENT DETECTION (20 tests) ━━━${NC}"

FOOD_INTENTS=(
    "I want to order food"
    "khana order karna hai"
    "pizza chahiye"
    "biryani mangwao"
    "misal pav"
    "hungry"
    "bhook lagi hai"
    "dinner order"
    "lunch karna hai"
    "breakfast"
    "chinese food"
    "south indian"
    "thali chahiye"
    "burger"
    "momos"
    "sandwich"
    "coffee"
    "juice"
    "ice cream"
    "best restaurant nearby"
)

for i in "${!FOOD_INTENTS[@]}"; do
    session="food-intent-$i"
    clear_session "$session"
    send_message "$session" "${FOOD_INTENTS[$i]}" "food\|order\|restaurant\|phone\|eat\|menu\|OTP\|location" "Food Intent #$((i+1)): '${FOOD_INTENTS[$i]}'"
done

echo ""

# ============================================
# SECTION 5: CHITCHAT/SMALL TALK (10 tests)
# ============================================
echo -e "${BLUE}━━━ SECTION 5: CHITCHAT/SMALL TALK (10 tests) ━━━${NC}"

CHITCHAT=(
    "how are you"
    "aap kaise ho"
    "what's your name"
    "tumhara naam kya hai"
    "who made you"
    "are you a robot"
    "tell me a joke"
    "I'm bored"
    "what's the weather"
    "thank you"
)

for i in "${!CHITCHAT[@]}"; do
    session="chitchat-$i"
    clear_session "$session"
    send_message "$session" "${CHITCHAT[$i]}" "." "Chitchat #$((i+1)): '${CHITCHAT[$i]}'"
done

echo ""

# ============================================
# SECTION 6: EDGE CASES (10 tests)
# ============================================
echo -e "${BLUE}━━━ SECTION 6: EDGE CASES (10 tests) ━━━${NC}"

EDGE_CASES=(
    "asdfghjkl"
    "123456"
    ""
    "   "
    "😀😀😀"
    "HELP ME NOW!!!"
    "cancel"
    "stop"
    "reset"
    "start over"
)

for i in "${!EDGE_CASES[@]}"; do
    session="edge-$i"
    clear_session "$session"
    # For edge cases, any response is acceptable
    send_message "$session" "${EDGE_CASES[$i]}" "." "Edge Case #$((i+1)): '${EDGE_CASES[$i]:0:20}'"
done

echo ""

# ============================================
# SECTION 7: MULTI-TURN PARCEL FLOW (5 full journeys)
# ============================================
echo -e "${BLUE}━━━ SECTION 7: MULTI-TURN PARCEL FLOW (5 journeys) ━━━${NC}"

for journey in {1..5}; do
    session="parcel-journey-$journey"
    clear_session "$session"
    
    echo -e "${YELLOW}Journey $journey:${NC}"
    
    # Step 1: Initial request
    send_message "$session" "I want to send a parcel" "phone\|OTP" "  Step 1: Initial request"
    
    # Step 2: Phone number
    send_message "$session" "8888777766" "OTP" "  Step 2: Phone number"
    
    # Step 3: OTP
    send_message "$session" "123456" "pickup\|location\|Login" "  Step 3: OTP verification"
    
    # Step 4: Pickup location
    send_message "$session" "Nashik Road Railway Station" "delivery\|drop\|where" "  Step 4: Pickup location"
    
    # Step 5: Delivery location
    send_message "$session" "CBS Bus Stand" "same\|recipient\|name\|confirm" "  Step 5: Delivery location"
    
    echo ""
done

# ============================================
# SUMMARY
# ============================================
echo "============================================"
echo -e "  ${GREEN}PASSED: $PASS_COUNT${NC}"
echo -e "  ${RED}FAILED: $FAIL_COUNT${NC}"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
PERCENT=$((PASS_COUNT * 100 / TOTAL))
echo "  TOTAL: $TOTAL tests"
echo "  SUCCESS RATE: $PERCENT%"
echo "============================================"

# Save summary
echo "{\"passed\": $PASS_COUNT, \"failed\": $FAIL_COUNT, \"total\": $TOTAL, \"percent\": $PERCENT}" > /tmp/test_summary.json
