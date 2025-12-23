#!/bin/bash
# Final Comprehensive Smoke Test

BASE_URL="http://localhost:3200"
API="$BASE_URL/api/gamification"
CHAT="$BASE_URL/chat/send"

GREEN='\033[0;32m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
PASSED=0; FAILED=0

test() { echo -ne "${BLUE}TEST:${NC} $1... "; }
pass() { echo -e "${GREEN}✓${NC}"; PASSED=$((PASSED + 1)); }
fail() { echo -e "${RED}✗${NC}"; FAILED=$((FAILED + 1)); }

echo -e "${BLUE}=== GAMIFICATION COMPREHENSIVE SMOKE TEST ===${NC}\n"

# Core APIs
test "Stats API"; curl -s "$API/stats" | jq -e '.success' >/dev/null && pass || fail
test "Settings API"; curl -s "$API/settings" | jq -e '.data.byCategory.rewards' >/dev/null && pass || fail  
test "Training Samples API"; curl -s "$API/training-samples/stats" | jq -e '.data.total >= 0' >/dev/null && pass || fail

# CRUD Operations
test "Update Setting"; curl -s -X PUT "$API/settings" -H "Content-Type: application/json" -d '{"settings":[{"key":"reward_intent_quest","value":"20"}]}' | jq -e '.success' >/dev/null && pass || fail
test "Verify Update"; [ "$(curl -s "$API/settings" | jq -r '.data.all[]|select(.key=="reward_intent_quest")|.value')" == "20" ] && pass || fail
test "Restore"; curl -s -X PUT "$API/settings" -H "Content-Type: application/json" -d '{"settings":[{"key":"reward_intent_quest","value":"15"}]}' >/dev/null && pass || fail

# Export
test "JSON Export"; curl -s "$API/training-samples/export?format=json" | jq -e '.success' >/dev/null && pass || fail
test "JSONL Export"; curl -s "$API/training-samples/export?format=jsonl" | jq -e '.success' >/dev/null && pass || fail

# Webchat  
test "Chat Endpoint"; curl -s -X POST "$CHAT" -H "Content-Type: application/json" -d '{"recipientId":"test","text":"hi"}' | jq -e '.success' >/dev/null && pass || fail
test "Game Trigger"; curl -s -X POST "$CHAT" -H "Content-Type: application/json" -d '{"recipientId":"test","text":"play game"}' | jq -e '.response' >/dev/null && pass || fail

# Config
test "System Enabled"; [ "$(curl -s "$API/stats" | jq -r '.data.systemStatus.enabled')" == "true" ] && pass || fail
test "11 Settings"; [ "$(curl -s "$API/settings" | jq -r '.meta.total')" == "11" ] && pass || fail

# Performance
test "Response < 1s"; START=$(date +%s%N); curl -s "$API/stats" >/dev/null; [ $((($(date +%s%N)-START)/1000000)) -lt 1000 ] && pass || fail

# Integration
test "Frontend Client"; grep -q "getGamificationStats" /home/ubuntu/Devs/mangwale-unified-dashboard/src/lib/api/mangwale-ai.ts && pass || fail
test "Admin Pages"; [ $(find /home/ubuntu/Devs/mangwale-unified-dashboard/src/app/admin/gamification -name "page.tsx" | wc -l) -eq 3 ] && pass || fail

echo -e "\n${BLUE}=== RESULTS ===${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
[ $FAILED -gt 0 ] && echo -e "${RED}Failed: $FAILED${NC}" || echo -e "${GREEN}Failed: 0${NC}"
TOTAL=$((PASSED + FAILED))
RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")
echo "Success: ${RATE}%"

[ $FAILED -eq 0 ] && echo -e "\n${GREEN}✅ ALL TESTS PASSED - Production Ready!${NC}" && exit 0
echo -e "\n${RED}❌ Some tests failed${NC}" && exit 1
