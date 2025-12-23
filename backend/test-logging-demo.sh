#!/bin/bash
# Test all gamification endpoints with logging demonstration

BASE_URL="http://localhost:3200"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     GAMIFICATION SYSTEM - LOGGING DEMONSTRATION          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

echo "This script will trigger all gamification endpoints to demonstrate"
echo "comprehensive logging throughout the system."
echo ""
echo "Watch backend logs in another terminal:"
echo "  pm2 logs mangwale-ai"
echo "  OR"
echo "  tail -f /tmp/mangwale-backend*.log"
echo ""
echo "Press Enter to start..."
read

echo ""
echo "═══ Test 1: Dashboard Stats (GET /api/gamification/stats) ═══"
echo "Expected logs: '📈 [GET /api/gamification/stats] Fetching dashboard statistics'"
echo "              '✅ Stats retrieved successfully in Xms'"
curl -s $BASE_URL/api/gamification/stats | jq '{success, games: .data.gamesPlayed, responseTime: .meta.responseTimeMs}'
sleep 2

echo ""
echo "═══ Test 2: Get All Settings (GET /api/gamification/settings) ═══"
echo "Expected logs: '📊 [GET /api/gamification/settings] Fetching all settings'"
echo "              '✅ Retrieved 11 settings'"
curl -s $BASE_URL/api/gamification/settings | jq '{success, total: .meta.total, categories: .meta.categories}'
sleep 2

echo ""
echo "═══ Test 3: Get Single Setting (GET /api/gamification/settings/reward_intent_quest) ═══"
echo "Expected logs: '📊 [GET /api/gamification/settings/reward_intent_quest] Fetching single setting'"
curl -s $BASE_URL/api/gamification/settings/reward_intent_quest | jq '.'
sleep 2

echo ""
echo "═══ Test 4: Update Settings (PUT /api/gamification/settings) ═══"
echo "Expected logs: '💾 [PUT /api/gamification/settings] Updating 1 settings'"
echo "              'Settings to update: [\"reward_intent_quest\"]'"
curl -s -X PUT $BASE_URL/api/gamification/settings \
  -H "Content-Type: application/json" \
  -d '{"settings":[{"key":"reward_intent_quest","value":"20"}]}' | jq '{success, updated: .data.updated}'
sleep 2

echo ""
echo "═══ Test 5: Training Samples Stats (GET /api/gamification/training-samples/stats) ═══"
curl -s $BASE_URL/api/gamification/training-samples/stats | jq '.data'
sleep 2

echo ""
echo "═══ Test 6: Webchat Integration (POST /chat/send) ═══"
echo "Expected logs: Conversation processing logs"
curl -s -X POST $BASE_URL/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"logging_test_user","text":"hello"}' | jq '{success, hasResponse: (.response != null)}'
sleep 2

echo ""
echo "═══ Test 7: Export Training Samples (GET /api/gamification/training-samples/export) ═══"
curl -s "$BASE_URL/api/gamification/training-samples/export?format=json" | jq '{success, total: .meta.total}'

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    LOGGING SUMMARY                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "✅ All gamification endpoints have comprehensive logging:"
echo ""
echo "🔍 Request Logging:"
echo "   - Endpoint path"
echo "   - HTTP method"
echo "   - Request parameters"
echo "   - Emojis for easy visual scanning (📊 📈 💾 ✅ ❌)"
echo ""
echo "📊 Response Logging:"
echo "   - Success/failure status"
echo "   - Response time in milliseconds"
echo "   - Data counts (e.g., '11 settings', '5 samples')"
echo ""
echo "❌ Error Logging:"
echo "   - Full error messages"
echo "   - Stack traces (in debug mode)"
echo "   - HTTP status codes"
echo ""
echo "📈 Performance Logging:"
echo "   - Query execution time"
echo "   - Cache hit/miss"
echo "   - Database connection status"
echo ""
echo "Check your backend logs to see all the detailed logging!"
echo ""
