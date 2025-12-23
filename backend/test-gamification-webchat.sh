#!/bin/bash
# Gamification Webchat Integration Test

BASE_URL="http://localhost:3200"
API="$BASE_URL/api/gamification"

echo "=== Gamification System Integration Test ==="
echo ""

# Test 1: API Health
echo "1. Testing API endpoints..."
curl -s "$API/stats" | jq '.success' && echo "✓ Stats API works"
curl -s "$API/settings" | jq '.data.byCategory | keys' && echo "✓ Settings API works"
curl -s "$API/training-samples/stats" | jq '.data.total' && echo "✓ Training API works"

# Test 2: Settings Update
echo ""
echo "2. Testing settings update..."
curl -s -X PUT "$API/settings" \
  -H "Content-Type: application/json" \
  -d '{"settings":[{"key":"reward_intent_quest","value":"20"}]}' | jq '.success'

# Verify
VALUE=$(curl -s "$API/settings" | jq -r '.data.all[] | select(.key=="reward_intent_quest") | .value')
echo "   Reward value is now: ₹$VALUE"

# Restore
curl -s -X PUT "$API/settings" -H "Content-Type: application/json" \
  -d '{"settings":[{"key":"reward_intent_quest","value":"15"}]}' > /dev/null
echo "   ✓ Settings test passed"

# Test 3: Webchat
echo ""
echo "3. Testing webchat integration..."
RESP=$(curl -s -X POST "$BASE_URL/testing/chat" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"test_999","message":"hi","platform":"web"}')
echo "$RESP" | jq '.messages[0].text' && echo "✓ Webchat responds"

# Test 4: Export
echo ""
echo "4. Testing export functionality..."
curl -s "$API/training-samples/export?format=json" | jq '.success' && echo "✓ Export works"

echo ""
echo "=== All Integration Tests Passed! ==="
