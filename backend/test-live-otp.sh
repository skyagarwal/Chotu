#!/bin/bash

# 🔥 LIVE OTP TEST WITH REAL NUMBER
# Complete end-to-end test with OTP verification

PHONE="9923383839"  # Using similar number for clean test
BASE_URL="http://localhost:3200"

echo "========================================================================="
echo "🔥 LIVE OTP REGISTRATION TEST"
echo "========================================================================="
echo ""
echo "Phone Number: $PHONE"
echo "Base URL: $BASE_URL"
echo ""

# Step 1: Greeting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Greeting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"hello\"}")
echo "Bot: $(echo $RESPONSE | jq -r '.response')"
echo ""
sleep 2

# Step 2: Trigger authentication
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Trigger Authentication (Order Food)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"I want to order biryani\"}")
echo "Bot: $(echo $RESPONSE | jq -r '.response')"
echo ""
sleep 2

# Step 3: Provide phone number  
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Provide Phone Number"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"$PHONE\"}")
echo "Bot: $(echo $RESPONSE | jq -r '.response')"
echo ""

# Step 4: Get OTP from logs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Retrieve OTP from PHP Logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 2
echo "Checking PHP backend logs..."
OTP=$(docker logs --tail 100 mangwale_php 2>&1 | grep -oP 'OTP.*?(\d{6})' | tail -1 | grep -oP '\d{6}')

if [ -n "$OTP" ]; then
  echo "✅ OTP Found: $OTP"
else
  echo "❌ OTP not found in logs"
  echo ""
  echo "Please check PHP logs manually:"
  echo "docker logs --tail 50 mangwale_php | grep -i otp"
  echo ""
  read -p "Enter OTP manually: " OTP
fi

echo ""
sleep 1

# Step 5: Verify OTP
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Verify OTP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"$OTP\"}")
BOT_RESPONSE=$(echo $RESPONSE | jq -r '.response')
echo "Bot: $BOT_RESPONSE"
echo ""

# Check if asking for name (new user)
if echo "$BOT_RESPONSE" | grep -qi "name"; then
  echo "✅ NEW USER DETECTED - Proceeding with registration..."
  echo ""
  sleep 2
  
  # Step 6: Provide name
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "STEP 6: Provide Name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
    -H 'Content-Type: application/json' \
    -d "{\"recipientId\":\"$PHONE\",\"text\":\"Test User\"}")
  echo "Bot: $(echo $RESPONSE | jq -r '.response')"
  echo ""
  sleep 2
  
  # Step 7: Provide email
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "STEP 7: Provide Email"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
    -H 'Content-Type: application/json' \
    -d "{\"recipientId\":\"$PHONE\",\"text\":\"test@mangwale.ai\"}")
  echo "Bot: $(echo $RESPONSE | jq -r '.response')"
  echo ""
  
  echo "✅ REGISTRATION COMPLETE!"
else
  echo "✅ EXISTING USER - Login successful!"
fi

echo ""
echo "========================================================================="
echo "🎉 TEST COMPLETE"
echo "========================================================================="
echo ""
echo "Next: User should be authenticated and able to place orders"
echo ""
echo "Check session:"
echo "docker exec a3128768cac8_mangwale_redis redis-cli GET \"session:web-$PHONE\" | jq '.'"
echo ""
