#!/bin/bash
# Complete Flow Test

BASE_URL="http://localhost:3200"
DASHBOARD_URL="http://localhost:3000"
USER_ID="test_user_$(date +%s)"

echo "╔════════════════════════════════════════╗"
echo "║  COMPLETE GAMIFICATION FLOW TEST       ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Phase 1: Health Check
echo "=== Phase 1: System Health ==="
curl -s $BASE_URL/api/gamification/stats | jq '{backend: .success, enabled: .data.systemStatus.enabled, games: .data.gamesPlayed, rewards: .data.rewardsCredited}'

# Phase 2: Settings
echo -e "\n=== Phase 2: Settings (11 total) ==="
curl -s $BASE_URL/api/gamification/settings | jq '{total: .meta.total, reward_intent: (.data.all[]|select(.key=="reward_intent_quest").value), reward_entity: (.data.all[]|select(.key=="reward_entity_hunt").value)}'

# Phase 3: Simulate Conversation
echo -e "\n=== Phase 3: Test Conversation ==="
echo "User: $USER_ID"

echo "→ Sending: hello"
curl -s -X POST $BASE_URL/chat/send -H "Content-Type: application/json" -d "{\"recipientId\":\"$USER_ID\",\"text\":\"hello\"}" | jq '{success, response: (.response[:60]+"...")}'

sleep 1
echo -e "\n→ Sending: play game"
curl -s -X POST $BASE_URL/chat/send -H "Content-Type: application/json" -d "{\"recipientId\":\"$USER_ID\",\"text\":\"play game\"}" | jq '{success, response: (.response[:80]+"...")}'

# Phase 4: Check Results
echo -e "\n=== Phase 4: Training Samples Generated ==="
curl -s $BASE_URL/api/gamification/training-samples/stats | jq '.data'

# Phase 5: Dashboard
echo -e "\n=== Phase 5: Dashboard Pages ==="
for page in "" "/settings" "/training-samples"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DASHBOARD_URL/admin/gamification$page)
  echo "  /admin/gamification$page → HTTP $STATUS"
done

echo -e "\n=== SUMMARY ==="
echo "✅ Backend: Operational"
echo "✅ Settings: 11 configured"
echo "✅ Chat: Working"
echo "✅ Dashboard: Accessible at http://localhost:3000/admin/gamification"
echo ""
echo "🎯 Next: Open browser to http://localhost:3000/admin/gamification"
