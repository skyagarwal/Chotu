#!/bin/bash
#
# Mangwale AI E2E Testing Script
# Usage: ./e2e-test.sh [staging|production] [--quick] [--verbose]
#

# DON'T use set -e, we handle errors ourselves

# Config
STAGING_URL="http://localhost:3200"
PRODUCTION_URL="https://api.mangwale.com"
TEST_SESSION="e2e-test-$(date +%s)"
QUICK_MODE=false
VERBOSE=false

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse args
ENV=${1:-staging}
for arg in "$@"; do
    case $arg in
        --verbose) VERBOSE=true;;
        --quick) QUICK_MODE=true;;
    esac
done

[[ "$ENV" == "production" ]] && BASE_URL=$PRODUCTION_URL || BASE_URL=$STAGING_URL

echo -e "${BLUE}🧪 Mangwale AI E2E Test Suite${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Environment: $ENV | Quick: $QUICK_MODE"
echo "Base URL: $BASE_URL"
echo ""

PASSED=0
FAILED=0

# Helper
test_api() {
    local name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="$4"
    local expect="$5"
    
    echo -n "  $name... "
    
    if [[ "$method" == "POST" ]]; then
        resp=$(curl -s --max-time 60 -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    else
        resp=$(curl -s --max-time 10 "$BASE_URL$endpoint" 2>&1)
    fi
    
    [[ "$VERBOSE" == "true" ]] && echo -e "\n    Response: $resp"
    
    if echo "$resp" | grep -qi "$expect"; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} (expected: $expect)"
        return 1
    fi
}

# 1. Infrastructure Tests (always run)
echo -e "${BLUE}1. Infrastructure${NC}"

if test_api "Health endpoint" "/health" "GET" "" "ok"; then
    ((PASSED++))
else
    ((FAILED++))
fi

if test_api "Chat endpoint exists" "/api/chat/send" "POST" '{"sessionId":"test","text":""}' "success\|error"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# 2. Quick API test (single LLM call)
if [[ "$QUICK_MODE" == "false" ]]; then
    echo ""
    echo -e "${BLUE}2. API Tests (with LLM)${NC}"
    TEST_SESSION="e2e-api-$(date +%s)"
    
    if test_api "Greeting response" "/api/chat/send" "POST" "{\"sessionId\":\"$TEST_SESSION\",\"text\":\"hi\"}" "Welcome\|Mangwale\|help"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
    
    TEST_SESSION="e2e-filter-$(date +%s)"
    if test_api "Content filter" "/api/chat/send" "POST" "{\"sessionId\":\"$TEST_SESSION\",\"text\":\"fuck you\"}" "respectful\|madad"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
    
    TEST_SESSION="e2e-order-$(date +%s)"
    if test_api "Order intent" "/api/chat/send" "POST" "{\"sessionId\":\"$TEST_SESSION\",\"text\":\"I want pizza\"}" "location\|food\|order"; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((PASSED + FAILED))
[[ $TOTAL -gt 0 ]] && PCT=$((PASSED * 100 / TOTAL)) || PCT=0

echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC} ($PCT%)"

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ Some tests failed${NC}"
    exit 1
fi
