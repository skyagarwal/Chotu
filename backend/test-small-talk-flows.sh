#!/bin/bash
# Test script for new small talk flows
# Tests farewell, chitchat, and feedback flows

echo "🧪 Testing New Small Talk Flows"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
AI_SERVICE_URL="http://localhost:3200"
SESSION_ID="test-$(date +%s)"
POSTGRES_CONTAINER="685225a33ea5_mangwale_postgres"
DB_NAME="headless_mangwale"
DB_USER="mangwale_config"

echo "📊 Test Configuration:"
echo "  AI Service: $AI_SERVICE_URL"
echo "  Session ID: $SESSION_ID"
echo "  Database: $DB_NAME"
echo ""

# Function to send test message
send_message() {
    local message="$1"
    local description="$2"
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Message: \"$message\""
    
    # Send message via testing endpoint
    response=$(curl -s -X POST "$AI_SERVICE_URL/testing/chat" \
        -H "Content-Type: application/json" \
        -d "{
            \"message\": \"$message\",
            \"sessionId\": \"$SESSION_ID\",
            \"phoneNumber\": \"+255700000001\"
        }")
    
    echo "Response:"
    echo "$response" | jq -r '.response // .message // .' 2>/dev/null || echo "$response"
    echo ""
}

# Function to check database
check_db() {
    local query="$1"
    echo -e "${YELLOW}Database Check:${NC}"
    docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "$query"
    echo ""
}

echo "================================"
echo "Test 1: Greeting Flow (Existing)"
echo "================================"
send_message "hi" "Greeting trigger"
sleep 2

echo "================================"
echo "Test 2: Farewell Flow (NEW)"
echo "================================"
send_message "goodbye" "Farewell trigger"
sleep 2

echo "================================"
echo "Test 3: Farewell Flow Variations"
echo "================================"
send_message "bye" "Farewell variation 1"
sleep 2

send_message "see you later" "Farewell variation 2"
sleep 2

echo "================================"
echo "Test 4: Chitchat Flow (NEW)"
echo "================================"
send_message "how are you?" "Chitchat trigger"
sleep 2

echo "================================"
echo "Test 5: Chitchat Flow Variations"
echo "================================"
send_message "thank you" "Chitchat variation 1"
sleep 2

send_message "what's up" "Chitchat variation 2"
sleep 2

echo "================================"
echo "Test 6: Feedback Flow (NEW)"
echo "================================"
send_message "I want to give feedback" "Feedback trigger"
sleep 3

echo "================================"
echo "Test 7: Help Flow (Existing)"
echo "================================"
send_message "help" "Help trigger"
sleep 2

echo "================================"
echo "Test 8: Game Introduction"
echo "================================"
send_message "I want to play a game" "Game intro trigger"
sleep 2

echo ""
echo "================================"
echo "📈 DATABASE VERIFICATION"
echo "================================"

echo ""
echo "1️⃣ Check all flows are enabled:"
check_db "SELECT id, name, enabled FROM flows WHERE id IN ('greeting_v1', 'farewell_v1', 'chitchat_v1', 'feedback_v1') ORDER BY name;"

echo ""
echo "2️⃣ Check conversation logging (last 10 messages):"
check_db "SELECT id, user_message, LEFT(bot_message, 50) as bot_resp, created_at FROM conversation_memory ORDER BY created_at DESC LIMIT 10;"

echo ""
echo "3️⃣ Count conversations by date:"
check_db "SELECT DATE(created_at) as date, COUNT(*) as count FROM conversation_memory GROUP BY DATE(created_at) ORDER BY date DESC;"

echo ""
echo "4️⃣ Check flow runs:"
check_db "SELECT flow_id, status, COUNT(*) as count FROM flow_runs GROUP BY flow_id, status ORDER BY flow_id;"

echo ""
echo "================================"
echo "🎯 SUMMARY"
echo "================================"

# Count flows
TOTAL_FLOWS=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM flows WHERE enabled = true;")
NEW_FLOWS=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM flows WHERE id IN ('farewell_v1', 'chitchat_v1', 'feedback_v1');")
CONVERSATIONS=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM conversation_memory WHERE created_at > NOW() - INTERVAL '5 minutes';")

echo -e "${GREEN}✅ Total flows enabled: $TOTAL_FLOWS${NC}"
echo -e "${GREEN}✅ New flows created: $NEW_FLOWS / 3${NC}"
echo -e "${GREEN}✅ Conversations logged (last 5 min): $CONVERSATIONS${NC}"

echo ""
if [ "$NEW_FLOWS" -eq 3 ]; then
    echo -e "${GREEN}🎉 SUCCESS! All 3 new flows are active!${NC}"
else
    echo -e "${RED}❌ ISSUE: Only $NEW_FLOWS/3 new flows found${NC}"
fi

echo ""
echo "================================"
echo "📝 NEXT STEPS"
echo "================================"
echo "1. Test flows on chat.mangwale.ai frontend"
echo "2. Monitor NLU classification logs"
echo "3. Set up Label Studio integration"
echo "4. Create data export script"
echo ""
echo "Test completed at: $(date)"
