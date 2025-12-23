#!/bin/bash

# 🔐 Complete OTP Authentication Flow Test
# Tests end-to-end authentication including:
# - Phone number input & OTP sending
# - OTP verification
# - New user registration (name/email)
# - Existing user login
# - Pending intent resumption

set -e

BASE_URL="http://localhost:3200"
TEST_PHONE="9999999999" # Test user phone number

echo "=================================================="
echo "🔐 COMPLETE OTP AUTHENTICATION FLOW TEST"
echo "=================================================="
echo ""
echo "Testing OTP flow with AgentOrchestrator..."
echo "Base URL: $BASE_URL"
echo "Test Phone: $TEST_PHONE"
echo ""

# Test Function
test_message() {
  local scenario="$1"
  local message="$2"
  local expected_contains="$3"
  
  echo "---------------------------------------------------"
  echo "📝 TEST: $scenario"
  echo "📨 Message: '$message'"
  echo ""
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/webhook" \
    -H 'Content-Type: application/json' \
    -d "{
      \"entry\": [{
        \"changes\": [{
          \"value\": {
            \"messages\": [{
              \"from\": \"$TEST_PHONE\",
              \"text\": {\"body\": \"$message\"}
            }]
          }
        }]
      }]
    }")
  
  echo "📩 Response:"
  echo "$RESPONSE" | jq -r '.response // .message // .'
  echo ""
  
  if echo "$RESPONSE" | grep -qi "$expected_contains"; then
    echo "✅ PASS: Response contains '$expected_contains'"
  else
    echo "❌ FAIL: Expected '$expected_contains' not found"
  fi
  echo ""
  
  sleep 2
}

echo "🧹 STEP 0: Clear session (start fresh)"
echo "---------------------------------------------------"
curl -s -X POST "$BASE_URL/testing/chat/session/$TEST_PHONE/clear" | jq '.'
echo ""
sleep 2

echo ""
echo "=================================================="
echo "🆕 SCENARIO 1: NEW USER REGISTRATION FLOW"
echo "=================================================="
echo ""

test_message \
  "Trigger auth (order food)" \
  "I want to order food" \
  "phone number"

test_message \
  "Provide invalid phone (too short)" \
  "123" \
  "Invalid phone number"

test_message \
  "Provide invalid phone (wrong format)" \
  "1234567890" \
  "Invalid phone number"

test_message \
  "Provide valid phone number" \
  "9923383838" \
  "OTP sent"

echo "⏸️  MANUAL STEP: Check your SMS/terminal for OTP code"
echo "Enter the OTP code you received (or use test OTP):"
read -p "OTP: " OTP_CODE

test_message \
  "Verify OTP (should ask for name if new user)" \
  "$OTP_CODE" \
  "name"

test_message \
  "Provide invalid name (too short)" \
  "J" \
  "too short"

test_message \
  "Provide valid name" \
  "John Doe" \
  "email"

test_message \
  "Provide invalid email" \
  "notanemail" \
  "Invalid email"

test_message \
  "Provide valid email (complete registration)" \
  "john@example.com" \
  "Registration complete"

echo ""
echo "=================================================="
echo "✅ NEW USER REGISTRATION COMPLETE!"
echo "=================================================="
echo ""
echo "Expected: User should now be authenticated and able to order food"
echo ""

sleep 3

echo ""
echo "=================================================="
echo "🔄 SCENARIO 2: PENDING INTENT RESUMPTION TEST"
echo "=================================================="
echo ""

echo "🧹 Clear session to test pending intent flow..."
curl -s -X POST "$BASE_URL/testing/chat/session/$TEST_PHONE/clear" | jq '.'
sleep 2

test_message \
  "Trigger auth with order intent" \
  "I want to order biryani" \
  "phone number"

test_message \
  "Provide phone number" \
  "9923383838" \
  "OTP sent"

echo "⏸️  Enter OTP to continue:"
read -p "OTP: " OTP_CODE2

test_message \
  "Verify OTP - should resume order intent automatically" \
  "$OTP_CODE2" \
  "biryani"

echo ""
echo "=================================================="
echo "✅ PENDING INTENT RESUMPTION COMPLETE!"
echo "=================================================="
echo ""

sleep 3

echo ""
echo "=================================================="
echo "👤 SCENARIO 3: EXISTING USER LOGIN FLOW"
echo "=================================================="
echo ""

echo "🧹 Clear session to simulate returning user..."
curl -s -X POST "$BASE_URL/testing/chat/session/$TEST_PHONE/clear" | jq '.'
sleep 2

test_message \
  "Trigger auth (track order)" \
  "Track my order" \
  "phone number"

test_message \
  "Provide phone number" \
  "9923383838" \
  "OTP sent"

echo "⏸️  Enter OTP for existing user:"
read -p "OTP: " OTP_CODE3

test_message \
  "Verify OTP - existing user should NOT be asked for name/email" \
  "$OTP_CODE3" \
  "logged in"

echo ""
echo "=================================================="
echo "✅ EXISTING USER LOGIN COMPLETE!"
echo "=================================================="
echo ""

sleep 2

echo ""
echo "=================================================="
echo "🎯 SCENARIO 4: GUEST BROWSING (NO AUTH REQUIRED)"
echo "=================================================="
echo ""

echo "🧹 Clear session to test guest browsing..."
curl -s -X POST "$BASE_URL/testing/chat/session/$TEST_PHONE/clear" | jq '.'
sleep 2

test_message \
  "Browse products (no auth needed)" \
  "Show me restaurants" \
  ""

test_message \
  "Search products (no auth needed)" \
  "Search for pizza" \
  ""

test_message \
  "Ask help (no auth needed)" \
  "Help me" \
  ""

echo ""
echo "=================================================="
echo "✅ GUEST BROWSING COMPLETE!"
echo "=================================================="
echo ""

echo ""
echo "=================================================="
echo "🎉 ALL TESTS COMPLETE!"
echo "=================================================="
echo ""
echo "Summary:"
echo "✅ New user registration flow (phone → OTP → name → email)"
echo "✅ Pending intent resumption after authentication"
echo "✅ Existing user login (skip name/email collection)"
echo "✅ Guest browsing without authentication"
echo ""
echo "Check logs at: src/agents/services/agent-orchestrator.service.ts"
echo "Check PHP backend logs for OTP generation/verification"
echo ""
echo "Next steps:"
echo "1. Test on WhatsApp channel"
echo "2. Test on Telegram channel"
echo "3. Test on Web chat (chat.mangwale.ai)"
echo "4. Monitor conversation logs in PostgreSQL"
echo ""
