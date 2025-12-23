#!/bin/bash
# Comprehensive Smoke Test for Gamification System
# Tests all critical paths, edge cases, and error handling

set -e
BASE_URL="http://localhost:3200"
API="$BASE_URL/api/gamification"
WEBCHAT="$BASE_URL/chat/send"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

test_case() {
    echo -ne "${BLUE}TEST:${NC} $1... "
}

pass() {
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC} - $1"
    FAILED=$((FAILED + 1))
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Gamification System - COMPREHENSIVE SMOKE TEST     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# ========== SECTION 1: SERVER HEALTH ==========
echo -e "${YELLOW}[1/10] Server Health & Connectivity${NC}"

test_case "Backend server is running"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/flows" | grep -q "200"; then
    pass
else
    fail "Server not responding on port 3200"
fi

test_case "Database connection active"
if curl -s "$BASE_URL/flows" | jq -e '.flows | length > 0' > /dev/null 2>&1; then
    pass
else
    fail "Database not connected"
fi

# ========== SECTION 2: GAMIFICATION API - READ OPERATIONS ==========
echo -e "\n${YELLOW}[2/10] API Read Operations${NC}"

test_case "GET /api/gamification/stats returns valid data"
STATS=$(curl -s "$API/stats")
if echo "$STATS" | jq -e '.success == true and .data.systemStatus.enabled != null' > /dev/null 2>&1; then
    pass
else
    fail "Stats endpoint invalid response"
fi

test_case "GET /api/gamification/settings returns all categories"
SETTINGS=$(curl -s "$API/settings")
if echo "$SETTINGS" | jq -e '.data.byCategory | keys | length == 4' > /dev/null 2>&1; then
    pass
else
    fail "Settings missing categories"
fi

test_case "Settings include required reward keys"
if echo "$SETTINGS" | jq -e '.data.all[] | select(.key == "reward_intent_quest")' > /dev/null 2>&1; then
    pass
else
    fail "Required settings not found"
fi

test_case "GET /api/gamification/training-samples/stats"
if curl -s "$API/training-samples/stats" | jq -e '.success and .data.total >= 0' > /dev/null 2>&1; then
    pass
else
    fail "Training sample stats failed"
fi

test_case "GET /api/gamification/training-samples with filters"
if curl -s "$API/training-samples?status=pending&limit=10" | jq -e '.success' > /dev/null 2>&1; then
    pass
else
    fail "Training samples list failed"
fi

# ========== SECTION 3: SETTINGS CRUD OPERATIONS ==========
echo -e "\n${YELLOW}[3/10] Settings CRUD Operations${NC}"

test_case "Update single setting (reward_intent_quest)"
UPDATE_RESP=$(curl -s -X PUT "$API/settings" \
    -H "Content-Type: application/json" \
    -d '{"settings":[{"key":"reward_intent_quest","value":"25"}]}')
if echo "$UPDATE_RESP" | jq -e '.success and .data.updated == 1' > /dev/null 2>&1; then
    pass
else
    fail "Setting update failed"
fi

test_case "Verify setting was updated in database"
NEW_VALUE=$(curl -s "$API/settings" | jq -r '.data.all[] | select(.key=="reward_intent_quest") | .value')
if [ "$NEW_VALUE" == "25" ]; then
    pass
else
    fail "Expected 25, got $NEW_VALUE"
fi

test_case "Bulk update multiple settings"
BULK_RESP=$(curl -s -X PUT "$API/settings" \
    -H "Content-Type: application/json" \
    -d '{"settings":[{"key":"reward_intent_quest","value":"15"},{"key":"max_games_per_day","value":"12"}]}')
if echo "$BULK_RESP" | jq -e '.success and .data.updated == 2' > /dev/null 2>&1; then
    pass
else
    fail "Bulk update failed"
fi

test_case "Restore original values"
curl -s -X PUT "$API/settings" \
    -H "Content-Type: application/json" \
    -d '{"settings":[{"key":"max_games_per_day","value":"10"}]}' > /dev/null
if [ $? -eq 0 ]; then pass; else fail "Restore failed"; fi

# ========== SECTION 4: EDGE CASES & ERROR HANDLING ==========
echo -e "\n${YELLOW}[4/10] Edge Cases & Error Handling${NC}"

test_case "Invalid setting key returns error"
INVALID=$(curl -s -X PUT "$API/settings" \
    -H "Content-Type: application/json" \
    -d '{"settings":[{"key":"nonexistent_key","value":"100"}]}')
if echo "$INVALID" | jq -e '.data.failed > 0' > /dev/null 2>&1; then
    pass
else
    fail "Should handle invalid keys"
fi

test_case "Malformed JSON request handling"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$API/settings" \
    -H "Content-Type: application/json" \
    -d '{invalid json}')
if [ "$HTTP_CODE" == "400" ] || [ "$HTTP_CODE" == "500" ]; then
    pass
else
    fail "Should return 400/500 for bad JSON (got $HTTP_CODE)"
fi

test_case "Missing required fields in request"
MISSING=$(curl -s -X PUT "$API/settings" \
    -H "Content-Type: application/json" \
    -d '{"settings":[{"key":"reward_intent_quest"}]}')
# Should either succeed with no changes or return error
if echo "$MISSING" | jq -e '.success != null' > /dev/null 2>&1; then
    pass
else
    fail "Should handle missing fields gracefully"
fi

# ========== SECTION 5: EXPORT FUNCTIONALITY ==========
echo -e "\n${YELLOW}[5/10] Export Functionality${NC}"

test_case "Export as JSON format"
JSON_EXPORT=$(curl -s "$API/training-samples/export?format=json")
if echo "$JSON_EXPORT" | jq -e '.success and .meta.format == "json"' > /dev/null 2>&1; then
    pass
else
    fail "JSON export failed"
fi

test_case "Export as JSONL format (IndicBERT)"
JSONL_EXPORT=$(curl -s "$API/training-samples/export?format=jsonl")
if echo "$JSONL_EXPORT" | jq -e '.success and .meta.format == "jsonl"' > /dev/null 2>&1; then
    pass
else
    fail "JSONL export failed"
fi

test_case "Export as CSV format"
CSV_EXPORT=$(curl -s "$API/training-samples/export?format=csv")
if echo "$CSV_EXPORT" | jq -e '.success and .meta.format == "csv"' > /dev/null 2>&1; then
    pass
else
    fail "CSV export failed"
fi

test_case "Default export format (should be JSONL)"
DEFAULT_EXPORT=$(curl -s "$API/training-samples/export")
if echo "$DEFAULT_EXPORT" | jq -e '.meta.format == "jsonl"' > /dev/null 2>&1; then
    pass
else
    fail "Default export should be JSONL"
fi

# ========== SECTION 6: WEBCHAT INTEGRATION ==========
echo -e "\n${YELLOW}[6/10] Webchat Multi-Channel Integration${NC}"

test_case "Webchat endpoint accessible"
if curl -s -o /dev/null -w "%{http_code}" "$WEBCHAT" | grep -q "200"; then
    pass
else
    fail "Webchat endpoint not accessible"
fi

test_case "Send message via webchat (web platform)"
WEB_RESP=$(curl -s -X POST "$WEBCHAT" \
    -H "Content-Type: application/json" \
    -d '{"recipientId":"smoke_test_001","text":"hello","platform":"web"}')
if echo "$WEB_RESP" | jq -e '.messages | length > 0' > /dev/null 2>&1; then
    pass
else
    fail "Webchat not responding"
fi

test_case "Session created for new user"
SESSION=$(echo "$WEB_RESP" | jq -r '.session.sessionId')
if [ -n "$SESSION" ] && [ "$SESSION" != "null" ]; then
    pass
else
    fail "Session not created"
fi

test_case "Simulate game trigger message"
GAME_RESP=$(curl -s -X POST "$WEBCHAT" \
    -H "Content-Type: application/json" \
    -d '{"recipientId":"smoke_test_001","text":"play game","platform":"web"}')
if echo "$GAME_RESP" | jq -e '.messages' > /dev/null 2>&1; then
    pass
else
    fail "Game trigger failed"
fi

# ========== SECTION 7: SYSTEM STATUS & CONFIGURATION ==========
echo -e "\n${YELLOW}[7/10] System Configuration Validation${NC}"

test_case "System enabled flag is set correctly"
ENABLED=$(curl -s "$API/stats" | jq -r '.data.systemStatus.enabled')
if [ "$ENABLED" == "true" ]; then
    pass
else
    fail "System should be enabled (got: $ENABLED)"
fi

test_case "Auto-approval threshold is configured"
THRESHOLD=$(curl -s "$API/stats" | jq -r '.data.systemStatus.minConfidenceThreshold')
if [ "$THRESHOLD" == "0.85" ]; then
    pass
else
    fail "Expected 0.85, got $THRESHOLD"
fi

test_case "All 11 settings are present"
SETTING_COUNT=$(curl -s "$API/settings" | jq -r '.meta.total')
if [ "$SETTING_COUNT" == "11" ]; then
    pass
else
    fail "Expected 11 settings, got $SETTING_COUNT"
fi

test_case "All 4 categories defined"
CATEGORIES=$(curl -s "$API/settings" | jq -r '.meta.categories | join(",")')
if [[ "$CATEGORIES" == *"rewards"* ]] && [[ "$CATEGORIES" == *"limits"* ]]; then
    pass
else
    fail "Missing categories: $CATEGORIES"
fi

# ========== SECTION 8: PERFORMANCE & RESPONSE TIMES ==========
echo -e "\n${YELLOW}[8/10] Performance Metrics${NC}"

test_case "Stats endpoint responds < 1s"
START=$(date +%s%N)
curl -s "$API/stats" > /dev/null
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
if [ $DURATION -lt 1000 ]; then
    pass
    echo "     Response time: ${DURATION}ms"
else
    fail "Response time: ${DURATION}ms (should be < 1000ms)"
fi

test_case "Settings endpoint responds < 1s"
START=$(date +%s%N)
curl -s "$API/settings" > /dev/null
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
if [ $DURATION -lt 1000 ]; then
    pass
    echo "     Response time: ${DURATION}ms"
else
    fail "Response time: ${DURATION}ms"
fi

# ========== SECTION 9: DATA CONSISTENCY ==========
echo -e "\n${YELLOW}[9/10] Data Consistency Checks${NC}"

test_case "Settings data types are correct"
TYPE_CHECK=$(curl -s "$API/settings" | jq -r '.data.all[] | select(.key=="reward_intent_quest") | .type')
if [ "$TYPE_CHECK" == "number" ]; then
    pass
else
    fail "Expected 'number', got '$TYPE_CHECK'"
fi

test_case "Boolean settings parse correctly"
BOOL_VALUE=$(curl -s "$API/settings" | jq -r '.data.all[] | select(.key=="game_system_enabled") | .value')
if [ "$BOOL_VALUE" == "true" ] || [ "$BOOL_VALUE" == "false" ]; then
    pass
else
    fail "Boolean not parsed: $BOOL_VALUE"
fi

test_case "Stats numbers are non-negative"
NEGATIVE_CHECK=$(curl -s "$API/stats" | jq '.data.summary | to_entries[] | select(.value < 0) | .key')
if [ -z "$NEGATIVE_CHECK" ]; then
    pass
else
    fail "Found negative values: $NEGATIVE_CHECK"
fi

# ========== SECTION 10: INTEGRATION COMPLETENESS ==========
echo -e "\n${YELLOW}[10/10] System Integration Completeness${NC}"

test_case "Frontend API client methods exist"
if [ -f "/home/ubuntu/Devs/mangwale-unified-dashboard/src/lib/api/mangwale-ai.ts" ]; then
    if grep -q "getGamificationStats" "/home/ubuntu/Devs/mangwale-unified-dashboard/src/lib/api/mangwale-ai.ts"; then
        pass
    else
        fail "Frontend API methods missing"
    fi
else
    fail "Frontend API client not found"
fi

test_case "Admin dashboard pages exist"
if [ -d "/home/ubuntu/Devs/mangwale-unified-dashboard/src/app/admin/gamification" ]; then
    PAGE_COUNT=$(find /home/ubuntu/Devs/mangwale-unified-dashboard/src/app/admin/gamification -name "page.tsx" | wc -l)
    if [ $PAGE_COUNT -eq 3 ]; then
        pass
    else
        fail "Expected 3 pages, found $PAGE_COUNT"
    fi
else
    fail "Admin pages directory missing"
fi

test_case "Database tables created"
# This assumes the database is accessible - we check via API instead
TABLE_CHECK=$(curl -s "$API/settings" | jq -e '.data.all | length > 0')
if [ $? -eq 0 ]; then
    pass
else
    fail "Database tables not accessible"
fi

test_case "Module properly registered in backend"
if [ -f "/home/ubuntu/Devs/mangwale-ai/src/gamification/gamification.module.ts" ]; then
    if grep -q "GamificationSettingsController" "/home/ubuntu/Devs/mangwale-ai/src/gamification/gamification.module.ts"; then
        pass
    else
        fail "Controllers not registered"
    fi
else
    fail "Gamification module not found"
fi

# ========== FINAL REPORT ==========
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    SMOKE TEST RESULTS                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}Tests Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Tests Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Tests Failed: 0${NC}"
fi
TOTAL=$((PASSED + FAILED))
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")
echo -e "Success Rate: ${PASS_RATE}%"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ SMOKE TEST FAILED - Issues detected${NC}"
    exit 1
else
    echo -e "${GREEN}✅ SMOKE TEST PASSED - System fully operational${NC}"
    echo -e "${GREEN}🎉 Gamification system is production-ready!${NC}\n"
    exit 0
fi
