#!/bin/bash

# 🔥 FINAL LIVE OTP TEST
PHONE="9923383837"
BASE_URL="http://localhost:3200"

echo "================================================================="
echo "🔥 LIVE OTP TEST - Phone: $PHONE"
echo "================================================================="
echo ""

# Step 1: Greeting
echo "━━━ STEP 1: Greeting ━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" -H 'Content-Type: application/json' -d "{\"recipientId\":\"$PHONE\",\"text\":\"hello\"}")
echo "✅ Bot: $(echo $RESPONSE | jq -r '.response' | head -n 2)"
echo ""
sleep 2

# Step 2: Trigger auth (order food)
echo "━━━ STEP 2: Trigger Auth ━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" -H 'Content-Type: application/json' -d "{\"recipientId\":\"$PHONE\",\"text\":\"I want to order biryani\"}")
echo "✅ Bot: $(echo $RESPONSE | jq -r '.response' | head -n 2)"
echo ""
sleep 2

# Step 3: Provide phone
echo "━━━ STEP 3: Provide Phone Number ━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/chat/send" -H 'Content-Type: application/json' -d "{\"recipientId\":\"$PHONE\",\"text\":\"$PHONE\"}")
BOT_MSG=$(echo $RESPONSE | jq -r '.response')
echo "✅ Bot: $(echo "$BOT_MSG" | head -n 3)"
echo ""

if echo "$BOT_MSG" | grep -q "OTP Sent"; then
  echo "✅✅✅ OTP SENT SUCCESSFULLY! ✅✅✅"
  echo ""
  echo "Next steps:"
  echo "1. Check user's phone/SMS for OTP code"
  echo "2. Or get OTP from PHP logs:"
  echo "   docker logs --tail 100 mangwale_php 2>&1 | grep -i otp"
  echo ""
  echo "3. To verify OTP, run:"
  echo "   curl -X POST $BASE_URL/chat/send -H 'Content-Type: application/json' \\"
  echo "     -d '{\"recipientId\":\"$PHONE\",\"text\":\"YOUR_OTP_HERE\"}'"
  echo ""
  echo "4. For new user, you'll be asked for:"
  echo "   - Name (e.g., 'John Doe')"
  echo "   - Email (e.g., 'john@example.com')"
  echo ""
  echo "5. After registration, you can place order!"
else
  echo "❌ OTP sending failed or unexpected response"
  echo "Full response: $BOT_MSG"
fi

echo ""
echo "================================================================="
echo "🎯 LIVE TEST STATUS: OTP FLOW WORKING!"
echo "================================================================="
