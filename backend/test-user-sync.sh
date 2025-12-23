#!/bin/bash
# Test User Sync Functionality
# Tests the complete authentication and user persistence flow

set -e

echo "🧪 Testing User Sync System"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TEST_PHONE="9876543210"
AI_SERVICE="http://localhost:3201"

echo -e "${YELLOW}Step 1: Check if users table exists${NC}"
docker exec 0be38ce3e675_mangwale_postgres psql -U mangwale_config -d headless_mangwale -c "\d users" | head -20

echo ""
echo -e "${YELLOW}Step 2: Current users in database${NC}"
docker exec 0be38ce3e675_mangwale_postgres psql -U mangwale_config -d headless_mangwale -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo -e "${YELLOW}Step 3: Send test message to trigger conversation${NC}"
curl -X POST "$AI_SERVICE/chat/send" \
  -H 'Content-Type: application/json' \
  -d "{
    \"recipientId\": \"$TEST_PHONE\",
    \"text\": \"hi\"
  }" 2>/dev/null | jq '.'

echo ""
echo -e "${YELLOW}Step 4: Check conversation response${NC}"
sleep 2
curl -X GET "$AI_SERVICE/chat/messages/$TEST_PHONE" 2>/dev/null | jq '.messages | .[-3:]'

echo ""
echo -e "${YELLOW}Step 5: Check PM2 logs for user sync activity${NC}"
pm2 logs mangwale-ai-game --lines 50 --nostream 2>&1 | grep -i "user sync\|syncUser\|✅ User synced" | tail -5 || echo "No user sync logs found yet"

echo ""
echo -e "${YELLOW}Step 6: Query users table for new records${NC}"
docker exec 0be38ce3e675_mangwale_postgres psql -U mangwale_config -d headless_mangwale -c "
SELECT 
  id, 
  php_user_id, 
  phone, 
  email,
  CONCAT(first_name, ' ', last_name) as name,
  total_games_played,
  loyalty_points,
  created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
"

echo ""
echo -e "${GREEN}✅ Test Complete!${NC}"
echo ""
echo "Expected Behavior:"
echo "1. ✅ Users table exists with 15 columns"
echo "2. ⏳ After real user login via OTP, user record should appear in users table"
echo "3. ⏳ PM2 logs should show: '✅ User synced to AI DB: ai_user_id=X, php_user_id=Y'"
echo ""
echo "Note: Full test requires:"
echo "  - Real PHP backend user (with phone number)"
echo "  - Complete OTP verification flow"
echo "  - Valid auth token from PHP backend"
echo ""
