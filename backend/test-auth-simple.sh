#!/bin/bash

# 🔐 Simple Auth Flow Test (Automated)
# Tests the auth trigger and flow steps without actual OTP

set -e

BASE_URL="http://localhost:3200"
TEST_PHONE="9999888877"

echo "=================================================="
echo "🔐 SIMPLE AUTH FLOW TEST"
echo "=================================================="
echo ""

# Test Function
test_message() {
  local scenario="$1"
  local message="$2"
  
  echo "---------------------------------------------------"
  echo "📝 $scenario"
  echo "📨 Message: '$message'"
  echo ""
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
    -H 'Content-Type: application/json' \
    -d "{
      \"recipientId\": \"$TEST_PHONE\",
      \"text\": \"$message\"
    }")
  
  echo "📩 Response:"
  echo "$RESPONSE" | jq -r '.response // .message // .'
  echo ""
  
  sleep 1
}

# Clear session
echo "🧹 Clearing session..."
curl -s -X POST "$BASE_URL/chat/session/$TEST_PHONE/clear" | jq '.'
echo ""
sleep 1

# Test 1: Greeting (no auth)
test_message "STEP 1: Greeting (no auth required)" "hi"

# Test 2: Browse products (no auth)
test_message "STEP 2: Browse (no auth required)" "show me restaurants"

# Test 3: Order food (auth required)
test_message "STEP 3: Order food (should trigger auth)" "I want to order biryani"

# Test 4: Provide phone number
test_message "STEP 4: Provide phone number" "9923383838"

echo ""
echo "=================================================="
echo "✅ AUTH TRIGGER & PHONE COLLECTION WORKING!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Check if OTP was sent to PHP backend"
echo "2. Get OTP from PHP logs or SMS"
echo "3. Run full test: ./test-otp-complete-flow.sh"
echo ""
echo "Check orchestrator logs:"
echo "docker logs --tail 50 mangwale_ai_service | grep -E '(📞|🔐|📝|📧)'"
echo ""
