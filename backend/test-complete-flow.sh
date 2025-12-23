#!/bin/bash

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
BASE_URL="http://localhost:3200"

echo -e "${BLUE}=== COMPLETE GAMIFICATION FLOW TEST ===${NC}\n"

# Step 1: Check system status
echo -e "${BLUE}[1/6] Checking system status...${NC}"
STATS=$(curl -s "$BASE_URL/api/gamification/stats")
echo "$STATS" | jq -r '
  "System Enabled: \(.data.systemStatus.enabled)",
  "Games Played: \(.data.gamesPlayed)",
  "Training Samples: \(.data.trainingSamples.total)"
'

# Step 2: Start conversation
echo -e "\n${BLUE}[2/6] Starting webchat conversation...${NC}"
HELLO=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"game_test_user","text":"hello"}')
echo "$HELLO" | jq -r '.response' | head -c 200
echo "..."

# Step 3: Trigger game
echo -e "\n${BLUE}[3/6] Triggering game 'play game'...${NC}"
GAME=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"game_test_user","text":"play game"}')
echo -e "${YELLOW}Response:${NC}"
echo "$GAME" | jq -r '.response'

# Step 4: Check what games are available
echo -e "\n${BLUE}[4/6] Checking available games...${NC}"
GAMES=$(curl -s -X POST "$BASE_URL/chat/send" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"game_test_user","text":"show me games"}')
echo "$GAMES" | jq -r '.response'

# Step 5: Try specific game commands
echo -e "\n${BLUE}[5/6] Testing game commands...${NC}"
for cmd in "intent quest" "start intent quest" "game menu"; do
  echo -e "\n${YELLOW}Command: $cmd${NC}"
  RESP=$(curl -s -X POST "$BASE_URL/chat/send" \
    -H "Content-Type: application/json" \
    -d "{\"recipientId\":\"game_test_user\",\"text\":\"$cmd\"}")
  echo "$RESP" | jq -r '.response' | head -c 300
  echo "..."
done

# Step 6: Check training samples generated
echo -e "\n${BLUE}[6/6] Checking training samples...${NC}"
SAMPLES=$(curl -s "$BASE_URL/api/gamification/training-samples/stats")
echo "$SAMPLES" | jq -r '
  "Total Samples: \(.data.total)",
  "Pending: \(.data.pending)",
  "Auto-Approved: \(.data.autoApproved)"
'

echo -e "\n${GREEN}=== Test Complete ===${NC}"
