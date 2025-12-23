#!/bin/bash

# Quick fresh test with new phone number

BASE_URL="http://localhost:3200"
PHONE="7777666655"

echo "Testing with fresh user: $PHONE"
echo ""

# Step 1
echo "1. Greeting..."
curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"hi\"}" | jq -r '.response'

sleep 2

# Step 2
echo ""
echo "2. Order food (trigger auth)..."
curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"I want to order pizza\"}" | jq -r '.response'

sleep 2

# Step 3
echo ""
echo "3. Provide phone..."
curl -s -X POST "$BASE_URL/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientId\":\"$PHONE\",\"text\":\"$PHONE\"}" | jq -r '.response'

echo ""
echo "✅ If you see 'OTP sent', the flow is working!"
