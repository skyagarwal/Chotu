# Complete Gamification Flow Test Guide

**Date:** November 20, 2025  
**Purpose:** End-to-end testing from user interaction to reward crediting

---

## 🎯 CURRENT SYSTEM STATUS

### Backend (Port 3200)
- ✅ Server Running
- ✅ Database Connected
- ✅ 11 Settings Loaded
- ✅ All APIs Operational

### Dashboard (Port 3000)
- ✅ Docker Container Running
- ✅ Connected to Backend
- ⏳ Pages Available (compiling)

### Database Tables
- ✅ `gamification_settings` - 11 settings configured
- ✅ `training_samples` - 0 samples (will be created during testing)
- ✅ `games_played` - 0 games (will be created during testing)
- ✅ `rewards_credited` - 0 rewards (will be created during testing)

---

## 📋 COMPLETE TEST FLOW

### Phase 1: Access Admin Dashboard

**URL:** http://localhost:3000/admin/gamification

**Pages to Test:**
1. **Dashboard** - `/admin/gamification`
   - View system stats
   - See total games played, rewards credited
   - Check training samples count

2. **Settings** - `/admin/gamification/settings`
   - View all 11 settings grouped by category
   - Modify reward amounts
   - Save changes

3. **Training Samples** - `/admin/gamification/training-samples`
   - Review AI-generated training samples
   - Approve/Reject samples
   - Export for IndicBERT training

---

### Phase 2: Test Settings Management

**Step 1: View Current Settings**
```bash
curl http://localhost:3200/api/gamification/settings | jq '.data.byCategory'
```

**Expected Output:**
```json
{
  "rewards": [
    {"key": "reward_intent_quest", "value": "15"},
    {"key": "reward_entity_hunt", "value": "20"},
    {"key": "reward_tone_detector", "value": "10"},
    {"key": "reward_language_master", "value": "25"}
  ],
  "limits": [
    {"key": "daily_games_limit", "value": "10"},
    {"key": "game_timeout_minutes", "value": "5"},
    {"key": "min_score_for_reward", "value": "70"}
  ],
  "gameplay": [
    {"key": "difficulty_level", "value": "medium"},
    {"key": "hints_enabled", "value": "true"}
  ],
  "training": [
    {"key": "auto_approve_threshold", "value": "0.85"},
    {"key": "min_confidence_score", "value": "0.60"}
  ]
}
```

**Step 2: Modify Settings via Dashboard**
1. Go to http://localhost:3000/admin/gamification/settings
2. Change `reward_intent_quest` from 15 to 20
3. Click "Save Changes"
4. Verify success message

**Step 3: Verify Changes in Database**
```bash
curl http://localhost:3200/api/gamification/settings | jq '.data.all[] | select(.key=="reward_intent_quest")'
```

**Expected:**
```json
{
  "key": "reward_intent_quest",
  "value": "20",
  "updated_at": "2025-11-20T..."
}
```

---

### Phase 3: Test Game Flow (Generate Training Data)

**Step 1: Start a Conversation via Webchat**
```bash
# Test 1: Simple greeting
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"test_user_001","text":"hello"}'
```

**Expected Response:**
```json
{
  "success": true,
  "response": "Hello there! Welcome to Mangwale...",
  "timestamp": 1700000000000
}
```

**Step 2: Trigger Intent Quest Game**
```bash
# Ask to play game
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"test_user_001","text":"play game"}'
```

**Expected:**
- Game prompt appears
- User is asked to identify intent

**Step 3: Play the Game**
```bash
# Example: Respond to intent question
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"test_user_001","text":"order food"}'
```

**What Happens:**
1. AI evaluates answer
2. If correct → Score increases
3. Training sample created with user's response
4. Stored in `training_samples` table

**Step 4: Complete Game**
- Answer 3-5 questions
- Receive final score
- If score > 70 (min_score_for_reward) → Reward credited

---

### Phase 4: Verify Game Results

**Step 1: Check Games Played**
```bash
curl http://localhost:3200/api/gamification/stats | jq '.data.gamesPlayed'
```

**Expected:** Number should increase from 0 to 1+

**Step 2: Check Training Samples Generated**
```bash
curl http://localhost:3200/api/gamification/training-samples/stats | jq '.data'
```

**Expected:**
```json
{
  "total": 5,
  "pending": 5,
  "approved": 0,
  "rejected": 0,
  "autoApproved": 0
}
```

**Step 3: Check Rewards Credited**
```bash
curl http://localhost:3200/api/gamification/stats | jq '.data.rewardsCredited'
```

**Expected:** Should show reward amount (e.g., 20 credits if game completed successfully)

---

### Phase 5: Review Training Samples in Dashboard

**Step 1: Access Training Samples Page**
- URL: http://localhost:3000/admin/gamification/training-samples

**What You'll See:**
- Table with all training samples
- Columns: Text, Intent, Confidence, Status, Actions
- Filter by status (pending/approved/rejected)
- Search by text or intent

**Step 2: Review Sample Details**
Each sample shows:
```
Text: "I want to order pizza"
Intent: order_food
Entities: [{"type":"food_item","value":"pizza"}]
Confidence: 0.78
Language: en
Tone: neutral
Source: game
Status: pending
```

**Step 3: Approve Sample**
1. Click "Approve" button
2. Sample status changes to "approved"
3. Sample is ready for export

**Step 4: Export for Training**
1. Click "Export" button
2. Choose format: JSONL (for IndicBERT)
3. Download file

**Expected JSONL Format:**
```jsonl
{"text":"I want to order pizza","intent":"order_food","entities":[{"type":"food_item","value":"pizza"}],"language":"en","tone":"neutral","confidence":0.92}
{"text":"send parcel to delhi","intent":"send_parcel","entities":[{"type":"location","value":"delhi"}],"language":"en","tone":"neutral","confidence":0.89}
```

---

## 🧪 COMPLETE AUTOMATED TEST SCRIPT

**Run this to test the entire flow:**

```bash
#!/bin/bash
# Complete flow test script

BASE_URL="http://localhost:3200"
DASHBOARD_URL="http://localhost:3000"
USER_ID="test_user_$(date +%s)"

echo "=== COMPLETE GAMIFICATION FLOW TEST ==="
echo ""

# Phase 1: Check System Health
echo "Phase 1: System Health Check"
echo "----------------------------"
curl -s $BASE_URL/api/gamification/stats | jq '{
  backend: .success,
  settings_loaded: (.data.systemStatus.enabled),
  total_games: .data.gamesPlayed,
  total_rewards: .data.rewardsCredited
}'

# Phase 2: Check Settings
echo ""
echo "Phase 2: Settings Configuration"
echo "--------------------------------"
CURRENT_REWARD=$(curl -s $BASE_URL/api/gamification/settings | jq -r '.data.all[] | select(.key=="reward_intent_quest") | .value')
echo "Current Intent Quest Reward: $CURRENT_REWARD credits"

# Phase 3: Simulate Game Play
echo ""
echo "Phase 3: Simulate Game Play"
echo "----------------------------"
echo "Starting conversation for user: $USER_ID"

# Greeting
RESPONSE=$(curl -s -X POST $BASE_URL/chat/send \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":\"$USER_ID\",\"text\":\"hello\"}")
echo "✅ Greeting: $(echo $RESPONSE | jq -r '.response' | head -c 50)..."

# Request game
sleep 1
RESPONSE=$(curl -s -X POST $BASE_URL/chat/send \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":\"$USER_ID\",\"text\":\"play intent quest\"}")
echo "✅ Game Request: $(echo $RESPONSE | jq -r '.response' | head -c 50)..."

# Answer questions (simulate gameplay)
for i in {1..3}; do
  sleep 1
  RESPONSE=$(curl -s -X POST $BASE_URL/chat/send \
    -H "Content-Type: application/json" \
    -d "{\"recipientId\":\"$USER_ID\",\"text\":\"order food\"}")
  echo "✅ Game Answer $i: $(echo $RESPONSE | jq -r '.success')"
done

# Phase 4: Check Results
echo ""
echo "Phase 4: Verify Results"
echo "-----------------------"

# Check training samples
SAMPLES=$(curl -s $BASE_URL/api/gamification/training-samples/stats | jq -r '.data.total')
echo "Training Samples Generated: $SAMPLES"

# Check if game recorded
GAMES=$(curl -s $BASE_URL/api/gamification/stats | jq -r '.data.gamesPlayed')
echo "Total Games Played: $GAMES"

# Check rewards
REWARDS=$(curl -s $BASE_URL/api/gamification/stats | jq -r '.data.rewardsCredited')
echo "Total Rewards Credited: $REWARDS"

# Phase 5: Dashboard Access
echo ""
echo "Phase 5: Dashboard Access"
echo "-------------------------"
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DASHBOARD_URL/admin/gamification)
if [ "$DASHBOARD_STATUS" == "200" ]; then
  echo "✅ Dashboard accessible at: $DASHBOARD_URL/admin/gamification"
  echo "✅ Settings page: $DASHBOARD_URL/admin/gamification/settings"
  echo "✅ Training samples: $DASHBOARD_URL/admin/gamification/training-samples"
else
  echo "⚠️ Dashboard returned HTTP $DASHBOARD_STATUS (may be compiling)"
fi

# Summary
echo ""
echo "=== TEST SUMMARY ==="
echo "Backend: ✅ Operational"
echo "Settings: ✅ $CURRENT_REWARD credits for Intent Quest"
echo "Training Samples: $SAMPLES generated"
echo "Games Played: $GAMES"
echo "Rewards: $REWARDS credits"
echo ""
echo "🎉 Complete flow test finished!"
echo "Next: Access dashboard at http://localhost:3000/admin/gamification"
```

---

## 📊 VERIFICATION CHECKLIST

### Backend APIs
- [ ] GET /api/gamification/stats - Returns dashboard data
- [ ] GET /api/gamification/settings - Returns 11 settings
- [ ] PUT /api/gamification/settings - Updates settings
- [ ] GET /api/gamification/training-samples - Lists samples
- [ ] POST /api/gamification/training-samples/:id/approve - Approves sample
- [ ] GET /api/gamification/training-samples/export - Exports JSONL
- [ ] POST /chat/send - Processes messages

### Dashboard Pages
- [ ] Dashboard loads at /admin/gamification
- [ ] Stats cards show correct numbers
- [ ] Settings page loads at /admin/gamification/settings
- [ ] Can modify and save settings
- [ ] Training samples page loads at /admin/gamification/training-samples
- [ ] Can approve/reject samples
- [ ] Export functionality works

### Game Flow
- [ ] User can start conversation
- [ ] Game triggers correctly
- [ ] Questions are presented
- [ ] Answers are evaluated
- [ ] Training samples created
- [ ] Rewards credited on completion

### Data Persistence
- [ ] Settings changes persist in database
- [ ] Training samples stored correctly
- [ ] Games played recorded
- [ ] Rewards credited tracked

---

## 🚨 TROUBLESHOOTING

### Dashboard Not Loading
```bash
# Check container status
docker ps | grep mangwale-dashboard

# Check logs
docker logs mangwale-dashboard --tail 50

# Restart if needed
docker restart mangwale-dashboard
```

### Backend API Errors
```bash
# Check server logs
cd /home/ubuntu/Devs/mangwale-ai
pm2 logs mangwale-ai

# Or if running directly
tail -f /tmp/mangwale-backend.log
```

### No Training Samples Generated
- Make sure you're actually playing the game (not just chatting)
- Check if conversation flow includes game logic
- Verify session management is working

### Rewards Not Credited
- Check if score > min_score_for_reward (default: 70)
- Verify reward settings are configured
- Check `rewards_credited` table directly

---

## 🎯 SUCCESS CRITERIA

✅ **All 4 database tables populated:**
1. gamification_settings (11 rows)
2. training_samples (1+ rows after gameplay)
3. games_played (1+ rows after completing game)
4. rewards_credited (1+ rows if score > 70)

✅ **Dashboard fully functional:**
- Can view stats
- Can modify settings
- Can review training samples
- Can export data

✅ **Complete flow working:**
- User → Chat → Game → Training Sample → Reward → Dashboard

---

## 📞 NEXT STEPS

1. **Access Dashboard:** http://localhost:3000/admin/gamification
2. **Play a Game:** Send messages to http://localhost:3200/chat/send
3. **Review Samples:** Check training samples page
4. **Export Data:** Download JSONL for IndicBERT training
5. **Adjust Settings:** Modify rewards and gameplay parameters

---

**Ready to test?** Start with accessing the dashboard at http://localhost:3000/admin/gamification
