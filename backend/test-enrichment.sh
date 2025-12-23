#!/bin/bash

echo "🧪 PHASE 4.1 - CONVERSATIONAL ENRICHMENT TEST"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test user
USER_ID=1
PHONE="+919876543210"

echo "📋 Test Setup:"
echo "  User ID: $USER_ID"
echo "  Phone: $PHONE"
echo ""

# Test 1: Dietary preference extraction
echo -e "${YELLOW}Test 1: Extract dietary preference${NC}"
echo "Message: 'main vegetarian hoon, spicy bilkul nahi pasand'"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3200/test/message \
  -H 'Content-Type: application/json' \
  -d "{
    \"userId\": \"$PHONE\",
    \"message\": \"main vegetarian hoon, spicy bilkul nahi pasand\"
  }")

echo "Response: $RESPONSE"
echo ""
sleep 2

# Test 2: Budget preference
echo -e "${YELLOW}Test 2: Extract budget preference${NC}"
echo "Message: '500 ke andar kuch dikhao yaar, budget mein chahiye'"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3200/test/message \
  -H 'Content-Type: application/json' \
  -d "{
    \"userId\": \"$PHONE\",
    \"message\": \"500 ke andar kuch dikhao yaar, budget mein chahiye\"
  }")

echo "Response: $RESPONSE"
echo ""
sleep 2

# Test 3: Spice preference (different user)
echo -e "${YELLOW}Test 3: Extract spice preference${NC}"
echo "Message: 'mujhe extra spicy pasand hai, jitna teekha utna acha'"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3200/test/message \
  -H 'Content-Type: application/json' \
  -d "{
    \"userId\": \"+919999999999\",
    \"message\": \"mujhe extra spicy pasand hai, jitna teekha utna acha\"
  }")

echo "Response: $RESPONSE"
echo ""
sleep 2

# Test 4: Check profile completion
echo -e "${YELLOW}Test 4: Check profile after extractions${NC}"
echo "Querying database for user preferences..."
echo ""

docker exec mangwale_postgres psql -U mangwale_user -d headless_mangwale -c "
  SELECT 
    user_id,
    phone,
    dietary_type,
    allergies,
    price_sensitivity,
    profile_completeness
  FROM user_profiles 
  WHERE user_id = $USER_ID;
" 2>/dev/null

echo ""

# Test 5: Check user insights (low confidence extractions)
echo -e "${YELLOW}Test 5: Check user insights (pending confirmations)${NC}"
echo ""

docker exec mangwale_postgres psql -U mangwale_user -d headless_mangwale -c "
  SELECT 
    user_id,
    key,
    value,
    confidence,
    source,
    created_at
  FROM user_insights 
  WHERE user_id = $USER_ID 
  ORDER BY created_at DESC 
  LIMIT 5;
" 2>/dev/null

echo ""

# Test 6: Confirmation response
echo -e "${YELLOW}Test 6: Test confirmation response${NC}"
echo "Message: 'haan bilkul, vegetarian hi hoon'"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3200/test/message \
  -H 'Content-Type: application/json' \
  -d "{
    \"userId\": \"$PHONE\",
    \"message\": \"haan bilkul, vegetarian hi hoon\"
  }")

echo "Response: $RESPONSE"
echo ""

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Test Complete!${NC}"
echo ""
echo "Expected Results:"
echo "  ✓ dietary_type should be 'veg' (high confidence)"
echo "  ✓ spice_level might be 'mild' or pending confirmation"
echo "  ✓ price_sensitivity should be 'budget' (medium confidence)"
echo "  ✓ profile_completeness should increase"
echo "  ✓ user_insights table has pending confirmations"
echo ""
echo "Manual Verification:"
echo "  1. Check logs: docker logs mangwale_ai_service | grep '🎯\\|🔍\\|💬'"
echo "  2. View all profiles: docker exec mangwale_postgres psql -U mangwale_user -d headless_mangwale -c 'SELECT * FROM user_profiles;'"
echo "  3. View insights: docker exec mangwale_postgres psql -U mangwale_user -d headless_mangwale -c 'SELECT * FROM user_insights ORDER BY created_at DESC LIMIT 10;'"
echo ""
