#!/bin/bash

# Complete OTP test with test number that's known to work
PHONE="8888777766"
BASE_URL="http://localhost:3200"

echo "🔥 COMPLETE OTP TEST - Using Test Number: $PHONE"
echo "================================================================="
echo ""

# Step 1: Clear any existing session
echo "Step 1: Clear session..."
curl -s -X POST "$BASE_URL/chat/session/$PHONE/clear" | jq '.'
echo ""
sleep 1

# Step 2: Greeting
echo "Step 2: Send greeting..."
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"hi\"}")
echo "Bot: $(echo $RESPONSE | jq -r '.response')"
echo ""
sleep 2

# Step 3: Trigger auth
echo "Step 3: Trigger authentication..."
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"I want biryani\"}")
echo "Bot: $(echo $RESPONSE | jq -r '.response')"
echo ""
sleep 2

# Step 4: Provide phone
echo "Step 4: Provide phone number..."
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"$PHONE\"}")
echo "Bot: $(echo $RESPONSE | jq -r '.response')"
echo ""

echo "================================================================="
echo "✅ OTP should be sent!"
echo ""
echo "To complete test manually, use this OTP (check with user):"
echo "Then run:"
echo "  curl -X POST http://localhost:3200/chat/send -H 'Content-Type: application/json' -d '{\"recipientId\":\"$PHONE\",\"text\":\"YOUR_OTP\"}'"
echo ""
