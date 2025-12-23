#!/bin/bash

# Direct Agent System Test - Bypassing authentication
# This tests the agent orchestrator directly

echo "🤖 DIRECT AGENT ORCHESTRATOR TEST"
echo "===================================="
echo ""

# Test with a properly authenticated session in Redis
TEST_PHONE="+919999888877"

echo "🔧 Setting up test session in Redis..."
redis-cli <<EOF
DEL "session:${TEST_PHONE}"
HSET "session:${TEST_PHONE}" currentStep "main_menu"
HSET "session:${TEST_PHONE}" data.authenticated "true"
HSET "session:${TEST_PHONE}" data.auth_token "test_token"
HSET "session:${TEST_PHONE}" data.user_name "Test User"
HSET "session:${TEST_PHONE}" data.module_name "food"
HSET "session:${TEST_PHONE}" data.module_id "1"
EOF

echo "✅ Session created"
echo ""

# Verify session
echo "📋 Verifying session..."
redis-cli HGETALL "session:${TEST_PHONE}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test 1: Search Query"
echo "💬 Message: 'show me pizza under 500'"
echo ""

curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\": \"${TEST_PHONE}\", \"text\": \"show me pizza under 500\"}"

echo ""
echo ""
sleep 3

# Check logs for agent activity
echo "📊 Checking logs for agent activity..."
pm2 logs mangwale-ai --lines 100 --nostream 2>/dev/null | \
  grep -i "routing to agent\|agent generated\|processing message.*${TEST_PHONE}" | \
  tail -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get bot response
echo "🤖 Bot Response:"
curl -s "http://localhost:3200/chat/messages/${TEST_PHONE}" | jq -r '.messages[] | "  \(.)"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ Test complete!"
echo ""
echo "🧹 Cleanup:"
echo "  redis-cli DEL session:${TEST_PHONE}"
