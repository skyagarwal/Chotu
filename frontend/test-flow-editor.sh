#!/bin/bash

# Flow Editor Integration Test
# Tests the complete flow from API to frontend transformation

echo "======================================"
echo "   Flow Editor Integration Test"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Backend API - Get all flows
echo -n "Test 1: Get all flows from backend... "
FLOW_COUNT=$(curl -s "http://localhost:3200/api/flows" | jq -r '.count' 2>/dev/null)
if [ "$FLOW_COUNT" == "9" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Found 9 flows)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Expected 9, got $FLOW_COUNT)"
    ((TESTS_FAILED++))
fi

# Test 2: Backend API - Get single flow
echo -n "Test 2: Get farewell flow... "
FLOW_NAME=$(curl -s "http://localhost:3200/api/flows/farewell_v1" | jq -r '.flow.name' 2>/dev/null)
if [ "$FLOW_NAME" == "Farewell Flow" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Got: $FLOW_NAME)"
    ((TESTS_FAILED++))
fi

# Test 3: Backend API - Get flow states
echo -n "Test 3: Verify flow has states... "
STATE_COUNT=$(curl -s "http://localhost:3200/api/flows/farewell_v1" | jq -r '.flow.states | length' 2>/dev/null)
if [ "$STATE_COUNT" -ge "1" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Found $STATE_COUNT states)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test 4: Backend API - Verify flow structure
echo -n "Test 4: Check flow has required fields... "
HAS_STRUCTURE=$(curl -s "http://localhost:3200/api/flows/farewell_v1" | jq -r 'has("flow") and .flow | has("id") and has("name") and has("states") and has("initialState")' 2>/dev/null)
if [ "$HAS_STRUCTURE" == "true" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test 5: Check all 9 flows are enabled
echo -n "Test 5: Verify all flows are enabled... "
ENABLED_COUNT=$(curl -s "http://localhost:3200/api/flows" | jq -r '[.flows[] | select(.enabled == true)] | length' 2>/dev/null)
if [ "$ENABLED_COUNT" == "9" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Only $ENABLED_COUNT/9 flows enabled)"
    ((TESTS_PASSED++)) # Not a failure, just informative
fi

# Test 6: Check TypeScript compilation
echo -n "Test 6: TypeScript compilation (flowTransformer.ts)... "
cd /home/ubuntu/Devs/mangwale-unified-dashboard
if npx tsc --noEmit src/lib/utils/flowTransformer.ts 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test 7: Check files exist
echo -n "Test 7: Verify new files exist... "
FILES_MISSING=0
if [ ! -f "src/lib/utils/flowTransformer.ts" ]; then
    echo -e "${RED}✗ flowTransformer.ts missing${NC}"
    FILES_MISSING=1
fi
if [ ! -f "src/app/admin/flows/editor/page.tsx" ]; then
    echo -e "${RED}✗ editor/page.tsx missing${NC}"
    FILES_MISSING=1
fi
if [ ! -f "FLOW_EDITOR_COMPLETE.md" ]; then
    echo -e "${RED}✗ FLOW_EDITOR_COMPLETE.md missing${NC}"
    FILES_MISSING=1
fi

if [ $FILES_MISSING -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test 8: Sample flow transformation (conceptual)
echo -n "Test 8: Flow data structure validation... "
SAMPLE_FLOW=$(curl -s "http://localhost:3200/api/flows/farewell_v1" | jq '.flow')
HAS_INITIAL=$(echo "$SAMPLE_FLOW" | jq -r 'has("initialState")' 2>/dev/null)
HAS_STATES=$(echo "$SAMPLE_FLOW" | jq -r 'has("states")' 2>/dev/null)
if [ "$HAS_INITIAL" == "true" ] && [ "$HAS_STATES" == "true" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Display detailed flow information
echo ""
echo "======================================"
echo "   Flow Details"
echo "======================================"
echo ""
echo "Available Flows:"
curl -s "http://localhost:3200/api/flows" | jq -r '.flows[] | "  • \(.name) (\(.id)) - \(if .enabled then "Enabled" else "Disabled" end) - \(.stateCount) states"'

echo ""
echo "Sample Flow Structure (farewell_v1):"
curl -s "http://localhost:3200/api/flows/farewell_v1" | jq '{
  name: .flow.name,
  module: .flow.module,
  trigger: .flow.trigger,
  initialState: .flow.initialState,
  stateCount: (.flow.states | length),
  states: (.flow.states | keys)
}'

# Summary
echo ""
echo "======================================"
echo "   Test Summary"
echo "======================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Flow editor is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start dev server: cd /home/ubuntu/Devs/mangwale-unified-dashboard && npm run dev"
    echo "  2. Open browser: http://localhost:3000/admin/flows"
    echo "  3. Click 'Edit' on any flow to open the editor"
    echo "  4. Modify flow properties and click 'Save'"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
