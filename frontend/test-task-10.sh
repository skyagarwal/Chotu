#!/bin/bash

# Task 10 Validation: Add Model Button Complete Testing
echo "=========================================="
echo "Task 10: Add Model Button - Test Suite"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_api() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    echo -n "Testing: $test_name ... "
    
    result=$(eval "$command" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$result" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Expected: $expected_pattern"
        echo "  Got: $result"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "🔧 Backend API Tests"
echo "===================="

# Test 1: GET /models returns array
test_api "GET /models (list)" \
    "curl -s http://localhost:3200/models" \
    '\['

# Test 2: GET /models returns models with correct fields
test_api "GET /models (has required fields)" \
    "curl -s http://localhost:3200/models | python3 -c 'import sys,json; data=json.load(sys.stdin); print(\"hasApiKey\" in data[0] if data else \"empty\")'" \
    "True"

# Test 3: POST /models creates model
echo -n "Testing: POST /models (create) ... "
MODEL_ID=$(curl -s -X POST http://localhost:3200/models \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Model","provider":"openai","providerModelId":"test-model","modelType":"llm","apiKey":"sk-test"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])' 2>/dev/null)

if [ ! -z "$MODEL_ID" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (ID: $MODEL_ID)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test 4: GET /models/:id returns single model
if [ ! -z "$MODEL_ID" ]; then
    test_api "GET /models/:id (get one)" \
        "curl -s http://localhost:3200/models/$MODEL_ID" \
        "Test Model"
fi

# Test 5: PATCH /models/:id/toggle changes status
if [ ! -z "$MODEL_ID" ]; then
    echo -n "Testing: PATCH /models/:id/toggle ... "
    INITIAL_STATUS=$(curl -s http://localhost:3200/models/$MODEL_ID | python3 -c 'import sys,json; print(json.load(sys.stdin)["status"])')
    curl -s -X PATCH http://localhost:3200/models/$MODEL_ID/toggle > /dev/null
    NEW_STATUS=$(curl -s http://localhost:3200/models/$MODEL_ID | python3 -c 'import sys,json; print(json.load(sys.stdin)["status"])')
    
    if [ "$INITIAL_STATUS" != "$NEW_STATUS" ]; then
        echo -e "${GREEN}✓ PASSED${NC} ($INITIAL_STATUS → $NEW_STATUS)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Status didn't change)"
        ((TESTS_FAILED++))
    fi
fi

# Test 6: PATCH /models/:id updates model
if [ ! -z "$MODEL_ID" ]; then
    test_api "PATCH /models/:id (update)" \
        "curl -s -X PATCH http://localhost:3200/models/$MODEL_ID \
          -H 'Content-Type: application/json' \
          -d '{\"name\":\"Updated Test Model\"}'" \
        "Updated Test Model"
fi

# Test 7: DELETE /models/:id removes model
if [ ! -z "$MODEL_ID" ]; then
    echo -n "Testing: DELETE /models/:id ... "
    curl -s -X DELETE http://localhost:3200/models/$MODEL_ID > /dev/null
    RESULT=$(curl -s http://localhost:3200/models/$MODEL_ID 2>&1)
    
    if echo "$RESULT" | grep -q "Not Found\|404"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Model still exists)"
        ((TESTS_FAILED++))
    fi
fi

echo ""
echo "🎨 Frontend Tests"
echo "================="

# Test 8: Dashboard is running
test_api "Dashboard container running" \
    "docker ps --filter 'name=mangwale-dashboard' --format '{{.Status}}'" \
    "Up"

# Test 9: Frontend page accessible
test_api "Models page accessible" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/admin/models" \
    "200"

# Test 10: AddModelModal component exists
test_api "AddModelModal component exists" \
    "ls /home/ubuntu/Devs/mangwale-unified-dashboard/src/components/admin/AddModelModal.tsx" \
    "AddModelModal.tsx"

echo ""
echo "📋 File Validation"
echo "=================="

# Test 11: TypeScript compiles without errors
echo -n "Testing: TypeScript compilation ... "
cd /home/ubuntu/Devs/mangwale-unified-dashboard
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -E "(models/page\.tsx|AddModelModal\.tsx)" | wc -l)
if [ "$TS_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (0 errors)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} ($TS_ERRORS errors)"
    ((TESTS_FAILED++))
fi

echo ""
echo "🔍 Integration Tests"
echo "===================="

# Test 12: Create model via API and verify in list
echo -n "Testing: Create → List integration ... "
INTEGRATION_MODEL=$(curl -s -X POST http://localhost:3200/models \
  -H "Content-Type: application/json" \
  -d '{"name":"Integration Test","provider":"groq","providerModelId":"llama-3.1-8b","modelType":"llm"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])' 2>/dev/null)

if [ ! -z "$INTEGRATION_MODEL" ]; then
    FOUND=$(curl -s http://localhost:3200/models | python3 -c "import sys,json; data=json.load(sys.stdin); print(any(m['id']=='$INTEGRATION_MODEL' for m in data))")
    if [ "$FOUND" == "True" ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        # Cleanup
        curl -s -X DELETE http://localhost:3200/models/$INTEGRATION_MODEL > /dev/null
    else
        echo -e "${RED}✗ FAILED${NC} (Model not in list)"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${RED}✗ FAILED${NC} (Couldn't create model)"
    ((TESTS_FAILED++))
fi

# Test 13: API key sanitization
echo -n "Testing: API key sanitization ... "
SANITIZED_MODEL=$(curl -s -X POST http://localhost:3200/models \
  -H "Content-Type: application/json" \
  -d '{"name":"Security Test","provider":"openai","providerModelId":"gpt-4","modelType":"llm","apiKey":"sk-secret123"}' \
  | python3 -c 'import sys,json; data=json.load(sys.stdin); print("apiKey" not in data and data.get("hasApiKey",False))' 2>/dev/null)

if [ "$SANITIZED_MODEL" == "True" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (apiKey hidden, hasApiKey=true)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (Security issue: apiKey exposed)"
    ((TESTS_FAILED++))
fi

# Cleanup security test model
SECURITY_MODEL_ID=$(curl -s http://localhost:3200/models | python3 -c 'import sys,json; data=json.load(sys.stdin); print(next((m["id"] for m in data if m["name"]=="Security Test"), ""))' 2>/dev/null)
if [ ! -z "$SECURITY_MODEL_ID" ]; then
    curl -s -X DELETE http://localhost:3200/models/$SECURITY_MODEL_ID > /dev/null
fi

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Task 10 is complete.${NC}"
    echo ""
    echo "🎉 Next Steps:"
    echo "  1. Open http://localhost:3000/admin/models in browser"
    echo "  2. Click 'Add Model' button"
    echo "  3. Fill out form and create a model"
    echo "  4. Verify model appears in grid"
    echo "  5. Test toggle status and delete operations"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
