#!/bin/bash

# 🧪 Phase 2 User Preference System Test
# Tests personalized conversation responses

echo "🧠 Testing User Preference Personalization System"
echo "=================================================="

BASE_URL="http://localhost:3200"

echo ""
echo "Step 1: Creating test user with preferences..."
curl -s -X POST "$BASE_URL/testing/chat" \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "+919876543210",
    "message": "hi"
  }' | jq -r '.response' || echo "❌ Failed to create session"

echo ""
echo "Step 2: Simulating order history (to build profile)..."
echo "   [In production, this happens automatically via recordInteraction()]"

echo ""
echo "Step 3: Testing personalized food recommendation..."
echo "User: 'pizza chahiye'"
echo ""
RESPONSE=$(curl -s -X POST "$BASE_URL/testing/chat" \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "+919876543210",
    "message": "pizza chahiye"
  }' | jq -r '.response')

echo "Bot Response:"
echo "$RESPONSE"
echo ""

# Check if response is personalized
if echo "$RESPONSE" | grep -qi "veg\|vegetarian"; then
    echo "✅ Response shows vegetarian personalization"
else
    echo "⚠️ No dietary personalization detected (user may be new)"
fi

if echo "$RESPONSE" | grep -qi "budget\|₹"; then
    echo "✅ Response includes pricing (good for price-conscious users)"
else
    echo "⚠️ No price information shown"
fi

if echo "$RESPONSE" | grep -qi "college road\|gangapur\|nashik"; then
    echo "✅ Response includes Nashik local knowledge"
else
    echo "⚠️ No local area references"
fi

echo ""
echo "Step 4: Testing another query..."
echo "User: 'kuch spicy khana hai'"
echo ""
RESPONSE2=$(curl -s -X POST "$BASE_URL/testing/chat" \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "+919876543210",
    "message": "kuch spicy khana hai"
  }' | jq -r '.response')

echo "Bot Response:"
echo "$RESPONSE2"
echo ""

echo "=================================================="
echo "🧠 Test Complete!"
echo ""
echo "📊 Expected Behavior (with profile):"
echo "- Should automatically filter veg options (if dietary_type='veg')"
echo "- Should highlight budget options (if price_sensitivity='budget')"
echo "- Should use casual Hinglish (if communication_tone='casual')"
echo "- Should avoid allergenic items (if allergies present)"
echo ""
echo "⚠️ Note: Full personalization requires user profile in database"
echo "   Run: npm run test:preferences (after implementing test data setup)"
echo ""
echo "📝 To manually create test profile, connect to PostgreSQL:"
echo "   psql postgresql://mangwale_user:mangwale_secure_2024@localhost:5433/mangwale_ai"
echo ""
echo "   Then insert test data:"
echo "   INSERT INTO user_profiles (user_id, phone, dietary_type, price_sensitivity, communication_tone)"
echo "   VALUES (1, '+919876543210', 'veg', 'budget', 'casual');"
