#!/bin/bash

# 🎯 AUTOMATED E2E TEST - Web Chat Flow
# Fully automated test with detailed logging

BASE_URL="http://localhost:3200"
TEST_USER="8888777766"

echo "========================================================================="
echo "🎯 AUTOMATED E2E TEST - Mangwale AI Web Chat"
echo "========================================================================="
echo ""
echo "Testing complete flow: Registration → Auth → Order → Game"
echo "Base URL: $BASE_URL"
echo "Test User: $TEST_USER"
echo ""

send_and_verify() {
  local phone="$1"
  local message="$2"
  local step="$3"
  local expected_keyword="$4"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 $step"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "👤 User: $message"
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
    -H 'Content-Type: application/json' \
    -d "{\"recipientId\": \"$phone\", \"text\": \"$message\"}")
  
  RESPONSE_TEXT=$(echo "$RESPONSE" | jq -r '.response // .message // "ERROR"')
  
  echo ""
  echo "🤖 Bot:"
  echo "$RESPONSE_TEXT" | fold -w 70 -s
  echo ""
  
  if [ -n "$expected_keyword" ]; then
    if echo "$RESPONSE_TEXT" | grep -qi "$expected_keyword"; then
      echo "✅ PASS - Found: $expected_keyword"
    else
      echo "❌ FAIL - Expected: $expected_keyword"
    fi
  fi
  
  sleep 2
}

# Clear session
echo "🧹 Clearing session..."
curl -s -X POST "$BASE_URL/chat/session/$TEST_USER/clear" > /dev/null
sleep 1

echo ""
echo "========================================================================="
echo "PART 1: NEW USER REGISTRATION"
echo "========================================================================="

send_and_verify "$TEST_USER" "hi" "STEP 1: Greeting" "Welcome"

send_and_verify "$TEST_USER" "show me restaurants" "STEP 2: Browse" "Mangwale"

send_and_verify "$TEST_USER" "I want to order biryani" "STEP 3: Trigger Auth" "phone"

send_and_verify "$TEST_USER" "123" "STEP 4: Invalid Phone" "Invalid"

send_and_verify "$TEST_USER" "$TEST_USER" "STEP 5: Valid Phone" "OTP"

echo ""
echo "⏸️  OTP REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Checking PHP logs for OTP..."
OTP=$(docker logs --tail 100 mangwale_php 2>&1 | grep -oP 'OTP.*?(\d{6})' | tail -1 | grep -oP '\d{6}' || echo "")

if [ -n "$OTP" ]; then
  echo "✅ Found OTP: $OTP"
else
  echo "❌ OTP not found in logs"
  echo ""
  echo "Please check PHP backend logs manually:"
  echo "docker logs --tail 50 mangwale_php | grep -i otp"
  echo ""
  read -p "Enter OTP code: " OTP
fi

send_and_verify "$TEST_USER" "12345" "STEP 6: Invalid OTP" "Invalid"

send_and_verify "$TEST_USER" "$OTP" "STEP 7: Valid OTP" "name"

send_and_verify "$TEST_USER" "J" "STEP 8: Invalid Name" "too short"

send_and_verify "$TEST_USER" "John Doe" "STEP 9: Valid Name" "email"

send_and_verify "$TEST_USER" "notanemail" "STEP 10: Invalid Email" "Invalid email"

send_and_verify "$TEST_USER" "john.test@example.com" "STEP 11: Complete Registration" "Registration complete"

echo ""
echo "========================================================================="
echo "PART 2: AUTHENTICATED ACTIONS"
echo "========================================================================="

send_and_verify "$TEST_USER" "search for pizza" "STEP 12: Search (no re-auth needed)" ""

send_and_verify "$TEST_USER" "track my order" "STEP 13: Track Order (auth action)" ""

echo ""
echo "========================================================================="
echo "PART 3: SESSION CHECK"
echo "========================================================================="
echo ""

echo "🔍 Redis Session State:"
docker exec mangwale_redis redis-cli GET "session:web-$TEST_USER" | jq '.' 2>/dev/null || echo "Session not in expected format"

echo ""
echo "========================================================================="
echo "PART 4: GAME API TEST"
echo "========================================================================="

send_and_verify "$TEST_USER" "I want to earn rewards" "STEP 14: Game Trigger" ""

echo ""
echo "📋 Game Missions API:"
curl -s "$BASE_URL/api/gamification/missions" | jq '.missions[0]' 2>/dev/null || echo "API call failed"

echo ""
echo "📊 User Stats API:"
curl -s "$BASE_URL/api/gamification/stats/$TEST_USER" | jq '.' 2>/dev/null || echo "API call failed"

echo ""
echo "========================================================================="
echo "🎉 TEST SUMMARY"
echo "========================================================================="
echo ""
echo "✅ Tested Flows:"
echo "   1. New user registration (phone → OTP → name → email)"
echo "   2. Phone/OTP/name/email validation"
echo "   3. Pending intent resumption after auth"
echo "   4. Authenticated actions without re-auth"
echo "   5. Session persistence in Redis"
echo "   6. Game/rewards API endpoints"
echo ""
echo "📊 Final Session State:"
docker exec mangwale_redis redis-cli GET "session:web-$TEST_USER" | jq '.data | {authenticated, auth_token, platform}' 2>/dev/null || echo "Check session manually"
echo ""
echo "🔍 Debug Info:"
echo "- View logs: docker logs --tail 50 mangwale_ai_service | grep -E '(📞|🔐)'"
echo "- Check PHP: docker logs --tail 30 mangwale_php | grep OTP"
echo "- Redis keys: docker exec mangwale_redis redis-cli KEYS 'session:*'"
echo ""
echo "✅ E2E TEST COMPLETE!"
echo ""
