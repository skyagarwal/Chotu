#!/bin/bash

echo "🔥 AUTOMATED E2E TEST - Authentication + Profile Enrichment"
echo "============================================================="
echo ""
echo "Test User: 9923383838"
echo "Flow: Welcome → Auth Check → Profile Enrichment"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PHONE="9923383838"
BASE_URL="http://localhost:3200"
REDIS_CONTAINER="a3128768cac8_mangwale_redis"
POSTGRES_CONTAINER="685225a33ea5_mangwale_postgres"

# Clear session
echo -e "${YELLOW}🧹 Clearing existing session...${NC}"
docker exec $REDIS_CONTAINER redis-cli -n 1 DEL "session:$PHONE" >/dev/null 2>&1
echo ""

# Test 1: Welcome
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 1: Welcome Message${NC}"
echo "Message: 'hi'"

curl -s -X POST $BASE_URL/webhook/whatsapp \
  -H 'Content-Type: application/json' \
  -d "{
    \"entry\": [{
      \"changes\": [{
        \"value\": {
          \"messages\": [{
            \"from\": \"$PHONE\",
            \"text\": { \"body\": \"hi\" }
          }]
        }
      }]
    }]
  }" | jq -r '.status // .message // .' 2>/dev/null

echo ""
sleep 3

# Check session
echo -e "${YELLOW}Session after welcome:${NC}"
docker exec $REDIS_CONTAINER redis-cli -n 1 GET "session:$PHONE" 2>/dev/null | jq -c '{step:.currentStep, authenticated:.data.authenticated, user_id:.data.user_id}' 2>/dev/null
echo ""

# Test 2: Check if user exists in PHP database
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 2: Check User in PHP Database${NC}"

USER_EXISTS=$(docker exec -i mangwale-mysql mysql -u mangwale_user -pmangwale_pass mangwale_db -sN -e "SELECT COUNT(*) FROM users WHERE phone = '$PHONE' OR phone = '+91$PHONE';" 2>/dev/null || echo "0")

if [ "$USER_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✅ User exists in database${NC}"
    
    USER_DATA=$(docker exec -i mangwale-mysql mysql -u mangwale_user -pmangwale_pass mangwale_db -e "
        SELECT id, name, phone, email 
        FROM users 
        WHERE phone = '$PHONE' OR phone = '+91$PHONE' 
        LIMIT 1;" 2>/dev/null)
    
    echo "$USER_DATA"
    
    # Get user ID
    USER_ID=$(docker exec -i mangwale-mysql mysql -u mangwale_user -pmangwale_pass mangwale_db -sN -e "
        SELECT id FROM users WHERE phone = '$PHONE' OR phone = '+91$PHONE' LIMIT 1;" 2>/dev/null)
    
    echo ""
    echo "User ID: $USER_ID"
    
    # Sync to PostgreSQL user_profiles
    echo ""
    echo -e "${YELLOW}Syncing to user_profiles table...${NC}"
    docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -c "
        INSERT INTO user_profiles (user_id, phone, profile_completeness, created_at, updated_at)
        VALUES ($USER_ID, '$PHONE', 0, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();
    " 2>/dev/null
    
    echo "✅ Profile synced"
else
    echo -e "${RED}❌ User not found in database${NC}"
    echo "Note: For this test, user must exist in PHP database first"
    echo "Please register via: http://mangwale.ai or WhatsApp"
    exit 1
fi

echo ""

# Test 3: Extract dietary preference
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 3: Extract Dietary Preference${NC}"
echo "Message: 'main vegetarian hoon, spicy nahi pasand'"

curl -s -X POST $BASE_URL/webhook/whatsapp \
  -H 'Content-Type: application/json' \
  -d "{
    \"entry\": [{
      \"changes\": [{
        \"value\": {
          \"messages\": [{
            \"from\": \"$PHONE\",
            \"text\": { \"body\": \"main vegetarian hoon, spicy nahi pasand\" }
          }]
        }
      }]
    }]
  }" >/dev/null 2>&1

echo "Request sent..."
sleep 5

# Check if preferences were extracted
echo ""
echo -e "${YELLOW}Profile after extraction:${NC}"
docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -x -c "
    SELECT dietary_type, spice_level, profile_completeness, updated_at
    FROM user_profiles 
    WHERE user_id = $USER_ID;
" 2>/dev/null

echo ""
echo -e "${YELLOW}Insights (pending confirmations):${NC}"
docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -c "
    SELECT key, value, confidence, source
    FROM user_insights 
    WHERE user_id = $USER_ID 
    ORDER BY created_at DESC 
    LIMIT 3;
" 2>/dev/null

echo ""

# Test 4: Extract budget preference
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 4: Extract Budget Preference${NC}"
echo "Message: 'kuch budget mein dikhao, 500 rupaye ke andar'"

curl -s -X POST $BASE_URL/webhook/whatsapp \
  -H 'Content-Type: application/json' \
  -d "{
    \"entry\": [{
      \"changes\": [{
        \"value\": {
          \"messages\": [{
            \"from\": \"$PHONE\",
            \"text\": { \"body\": \"kuch budget mein dikhao, 500 rupaye ke andar\" }
          }]
        }
      }]
    }]
  }" >/dev/null 2>&1

echo "Request sent..."
sleep 5

echo ""
echo -e "${YELLOW}Profile after budget extraction:${NC}"
docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -x -c "
    SELECT dietary_type, spice_level, price_sensitivity, profile_completeness, updated_at
    FROM user_profiles 
    WHERE user_id = $USER_ID;
" 2>/dev/null

echo ""

# Test 5: Test personalized response
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 5: Personalized Response${NC}"
echo "Message: 'pizza chahiye'"

curl -s -X POST $BASE_URL/webhook/whatsapp \
  -H 'Content-Type: application/json' \
  -d "{
    \"entry\": [{
      \"changes\": [{
        \"value\": {
          \"messages\": [{
            \"from\": \"$PHONE\",
            \"text\": { \"body\": \"pizza chahiye\" }
          }]
        }
      }]
    }]
  }" >/dev/null 2>&1

echo "Request sent..."
sleep 5

# Check logs for personalization
echo ""
echo -e "${YELLOW}Checking logs for personalization:${NC}"
docker logs mangwale_ai_service --tail 50 | grep -E "🧠|🎯|🔍" | tail -5

echo ""

# Final summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ TEST COMPLETE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Final Profile State:"
docker exec $POSTGRES_CONTAINER psql -U mangwale_user -d headless_mangwale -c "
    SELECT 
        user_id,
        dietary_type,
        spice_level,
        price_sensitivity,
        profile_completeness,
        updated_at
    FROM user_profiles 
    WHERE user_id = $USER_ID;
" 2>/dev/null

echo ""
echo "Expected Results:"
echo "  ✓ dietary_type: veg"
echo "  ✓ spice_level: mild"
echo "  ✓ price_sensitivity: budget"
echo "  ✓ profile_completeness: > 0%"
echo ""
echo "Verify logs for:"
echo "  docker logs mangwale_ai_service | grep '🎯\\|🔍\\|🧠\\|💬'"
echo ""
