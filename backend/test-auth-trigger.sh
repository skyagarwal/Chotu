#!/bin/bash

# Test Auth Trigger Integration
# Tests that auth is triggered on transaction intents

BASE_URL="http://localhost:3200"
PHONE="9923383838"

echo "🧪 Testing Auth Trigger Integration"
echo "======================================"
echo ""

# Step 1: Clear session
echo "1️⃣ Clearing session..."
curl -s -X POST "$BASE_URL/chat/clear" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\"}" | jq '.success, .message'
echo ""

# Step 2: Send greeting (should NOT trigger auth)
echo "2️⃣ Sending greeting (should NOT need auth)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"hi\"}")

echo "$RESPONSE" | jq -r '.response' | head -3
echo ""

# Step 3: Intent that triggers auth (place order)
echo "3️⃣ Sending order intent (SHOULD trigger auth)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"I want to order food\"}")

echo "Response:"
echo "$RESPONSE" | jq -r '.response'
echo ""

# Check if auth was triggered
if echo "$RESPONSE" | grep -iq "login\|phone\|number\|authenticate\|otp"; then
  echo "✅ AUTH TRIGGERED! Response contains authentication request"
else
  echo "❌ AUTH NOT TRIGGERED - No authentication request in response"
fi

echo ""
echo "Full response object:"
echo "$RESPONSE" | jq '.'
echo ""

# Step 4: Test another transaction intent
echo "4️⃣ Testing track order intent (SHOULD trigger auth)..."
curl -s -X POST "$BASE_URL/chat/clear" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\"}" > /dev/null

RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"track my order\"}")

echo "Response:"
echo "$RESPONSE" | jq -r '.response'
echo ""

if echo "$RESPONSE" | grep -iq "login\|phone\|number\|authenticate\|otp"; then
  echo "✅ AUTH TRIGGERED for track_order"
else
  echo "❌ AUTH NOT TRIGGERED for track_order"
fi

echo ""
echo "======================================"
echo "🏁 Auth trigger test complete!"
echo ""
echo "Expected behavior:"
echo "  - Greeting: No auth required ✓"
echo "  - Place order: Auth required ✓"
echo "  - Track order: Auth required ✓"
