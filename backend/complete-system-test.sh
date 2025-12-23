#!/bin/bash
echo "🧪 COMPLETE GAMIFICATION SYSTEM TEST"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

test() { echo -ne "${BLUE}TEST:${NC} $1... "; }
pass() { echo -e "${GREEN}✓${NC}"; PASSED=$((PASSED + 1)); }
fail() { echo -e "${RED}✗${NC} $2"; FAILED=$((FAILED + 1)); }

echo "📡 STEP 1: Verify Services Running"
echo "-----------------------------------"

test "Backend API (port 3200)"
if curl -s http://localhost:3200/api/gamification/stats > /dev/null 2>&1; then
  pass
else
  fail "Backend not responding"
fi

test "Frontend Dashboard (port 3000)"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  pass
else
  fail "Frontend not responding"
fi

test "Docker container: mangwale_ai_service"
if docker ps | grep -q mangwale_ai_service; then
  pass
else
  fail "Container not running"
fi

test "Docker container: mangwale-dashboard"
if docker ps | grep -q mangwale-dashboard; then
  pass
else
  fail "Container not running"
fi

echo ""
echo "🔌 STEP 2: Backend API Endpoints"
echo "---------------------------------"

test "GET /api/gamification/stats"
if curl -s http://localhost:3200/api/gamification/stats | jq -e '.success' > /dev/null 2>&1; then
  pass
else
  fail "Stats API failed"
fi

test "GET /api/gamification/settings"
if curl -s http://localhost:3200/api/gamification/settings | jq -e '.data.all | length == 11' > /dev/null 2>&1; then
  pass
else
  fail "Settings API failed"
fi

test "PUT /api/gamification/settings (update)"
if curl -s -X PUT http://localhost:3200/api/gamification/settings \
  -H "Content-Type: application/json" \
  -d '{"settings":[{"key":"reward_intent_quest","value":"25"}]}' | jq -e '.success' > /dev/null 2>&1; then
  pass
else
  fail "Update failed"
fi

test "Verify setting updated to 25"
VALUE=$(curl -s http://localhost:3200/api/gamification/settings | jq -r '.data.all[] | select(.key=="reward_intent_quest") | .value')
if [ "$VALUE" == "25" ]; then
  pass
else
  fail "Value is $VALUE, expected 25"
fi

test "Restore setting to 15"
curl -s -X PUT http://localhost:3200/api/gamification/settings \
  -H "Content-Type: application/json" \
  -d '{"settings":[{"key":"reward_intent_quest","value":"15"}]}' > /dev/null 2>&1
VALUE=$(curl -s http://localhost:3200/api/gamification/settings | jq -r '.data.all[] | select(.key=="reward_intent_quest") | .value')
if [ "$VALUE" == "15" ]; then
  pass
else
  fail "Restore failed"
fi

test "GET /api/gamification/training-samples/stats"
if curl -s http://localhost:3200/api/gamification/training-samples/stats | jq -e '.data.total >= 0' > /dev/null 2>&1; then
  pass
else
  fail "Training samples stats failed"
fi

test "GET /api/gamification/training-samples/export (JSON)"
if curl -s 'http://localhost:3200/api/gamification/training-samples/export?format=json' | jq -e '.success' > /dev/null 2>&1; then
  pass
else
  fail "Export failed"
fi

echo ""
echo "💬 STEP 3: Multi-Channel Integration"
echo "------------------------------------"

test "POST /chat/send (webchat)"
RESPONSE=$(curl -s -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"test_system","text":"hello"}')
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  pass
else
  fail "Chat endpoint failed"
fi

test "Chat response contains text"
if echo "$RESPONSE" | jq -e '.response | length > 10' > /dev/null 2>&1; then
  pass
else
  fail "No response text"
fi

echo ""
echo "🌐 STEP 4: Frontend Pages"
echo "-------------------------"

test "Dashboard page (/admin/gamification)"
if curl -s http://localhost:3000/admin/gamification | grep -q "Gamification" 2>/dev/null; then
  pass
else
  fail "Dashboard page not accessible"
fi

test "Settings page (/admin/gamification/settings)"
if curl -s http://localhost:3000/admin/gamification/settings | grep -q "Settings" 2>/dev/null; then
  pass
else
  fail "Settings page not accessible"
fi

test "Training samples page (/admin/gamification/training-samples)"
if curl -s http://localhost:3000/admin/gamification/training-samples | grep -q "Training" 2>/dev/null; then
  pass
else
  fail "Training samples page not accessible"
fi

echo ""
echo "⚡ STEP 5: Performance Check"
echo "---------------------------"

test "API response time < 1 second"
START=$(date +%s%N)
curl -s http://localhost:3200/api/gamification/stats > /dev/null
END=$(date +%s%N)
DURATION=$(((END - START) / 1000000))
if [ $DURATION -lt 1000 ]; then
  echo -e "${GREEN}✓${NC} ${DURATION}ms"
  PASSED=$((PASSED + 1))
else
  fail "${DURATION}ms (too slow)"
fi

echo ""
echo "📊 FINAL RESULTS"
echo "================"
echo ""
echo -e "${GREEN}Tests Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Tests Failed: $FAILED${NC}"
else
  echo -e "${GREEN}Tests Failed: 0${NC}"
fi
TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED - System Ready!${NC}"
  echo ""
  echo "🎯 Quick Access:"
  echo "   Dashboard: http://localhost:3000/admin/gamification"
  echo "   Settings:  http://localhost:3000/admin/gamification/settings"
  echo "   Training:  http://localhost:3000/admin/gamification/training-samples"
  echo ""
  echo "📚 Documentation: COMPLETE_GAMIFICATION_TESTING_GUIDE.md"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
