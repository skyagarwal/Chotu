# Dashboard Visual Guide - What You'll See

## 🎯 Complete System Overview

### **System Status (Current)**
```
Backend: ✅ Running on port 3200
Dashboard: ✅ Running on port 3000 (Docker)
Database: ✅ PostgreSQL connected
```

### **Database Contents**
```
✅ gamification_settings: 11 rows (configured)
⏳ training_samples: 0 rows (will be created during gameplay)
⏳ games_played: 0 rows (will be created when game completes)
⏳ rewards_credited: 0 rows (will be created when rewards given)
```

---

## 📱 Dashboard Pages Tour

### **Page 1: Main Dashboard**
**URL:** `http://localhost:3000/admin/gamification`

**What You'll See:**

```
╔══════════════════════════════════════════════════════════╗
║         🎮 Gamification System Dashboard                 ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ║
║  │ 🎮 Games     │  │ 🎁 Rewards   │  │ 👥 Active    │  ║
║  │              │  │              │  │    Users     │  ║
║  │      0       │  │      0       │  │      0       │  ║
║  │    Played    │  │   Credited   │  │              │  ║
║  └──────────────┘  └──────────────┘  └──────────────┘  ║
║                                                          ║
║  ┌──────────────────────────────────────────────────┐  ║
║  │ 📊 Training Samples                              │  ║
║  │                                                   │  ║
║  │  Total: 0  |  Pending: 0  |  Approved: 0        │  ║
║  │                                                   │  ║
║  │  Auto-Approval Threshold: 85%                    │  ║
║  │  Min Confidence Score: 60%                       │  ║
║  └──────────────────────────────────────────────────┘  ║
║                                                          ║
║  ┌──────────────────────────────────────────────────┐  ║
║  │ ⚙️ System Status                                  │  ║
║  │                                                   │  ║
║  │  Gamification: ✅ ENABLED                        │  ║
║  │  Last Updated: Nov 20, 2025 10:31 AM            │  ║
║  └──────────────────────────────────────────────────┘  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

**Quick Actions:**
- Click "View Settings" → Go to settings page
- Click "Review Samples" → Go to training samples page
- View real-time statistics

---

### **Page 2: Settings Management**
**URL:** `http://localhost:3000/admin/gamification/settings`

**What You'll See:**

```
╔══════════════════════════════════════════════════════════╗
║         ⚙️ Gamification Settings                         ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  🎁 REWARDS                                              ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ Intent Quest Reward          [  15  ] credits      │ ║
║  │ Entity Hunt Reward           [  20  ] credits      │ ║
║  │ Tone Detector Reward         [  10  ] credits      │ ║
║  │ Language Master Reward       [  25  ] credits      │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  🎮 GAMEPLAY                                             ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ Difficulty Level         [▼ Medium ]               │ ║
║  │ Hints Enabled            [✓] Yes  [ ] No           │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  📊 LIMITS                                               ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ Daily Games Limit            [  10  ] games        │ ║
║  │ Game Timeout                 [  5   ] minutes      │ ║
║  │ Min Score for Reward         [  70  ] points       │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  🤖 TRAINING                                             ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ Auto-Approve Threshold       [  0.85 ]             │ ║
║  │ Min Confidence Score         [  0.60 ]             │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  [ Cancel ]  [ Undo Changes ]  [ 💾 Save Changes ]     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

**What You Can Do:**
- ✏️ Modify any setting value
- 💾 Save all changes at once (bulk update)
- ↩️ Undo changes before saving
- 📊 See settings grouped by category
- ⏱️ Changes take effect immediately after save

**Example Test:**
1. Change "Intent Quest Reward" from `15` to `20`
2. Click "Save Changes"
3. See success notification: "✅ Settings saved successfully!"
4. Refresh page → Value still shows `20` (persisted to database)

---

### **Page 3: Training Samples Review**
**URL:** `http://localhost:3000/admin/gamification/training-samples`

**What You'll See (Before Gameplay):**

```
╔══════════════════════════════════════════════════════════╗
║         📝 Training Samples Review                       ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Filters: [▼ All Status ]  [ 🔍 Search...           ]  ║
║                                                          ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │                                                     │ ║
║  │            📭 No training samples yet               │ ║
║  │                                                     │ ║
║  │     Play some games to generate training data!     │ ║
║  │                                                     │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  [ 📥 Export ] (disabled until samples exist)           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

**What You'll See (After Gameplay):**

```
╔══════════════════════════════════════════════════════════╗
║         📝 Training Samples Review                       ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Filters: [▼ Pending ]  [ 🔍 Search...           ]      ║
║                                                          ║
║  Total: 5 samples  |  Pending: 5  |  Approved: 0        ║
║                                                          ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ Sample #1                           🟡 PENDING     │ ║
║  │ ─────────────────────────────────────────────────  │ ║
║  │ Text: "I want to order pizza"                      │ ║
║  │ Intent: order_food                                 │ ║
║  │ Entities: [food_item: "pizza"]                     │ ║
║  │ Confidence: 78%                                    │ ║
║  │ Language: en  |  Tone: neutral  |  Source: game   │ ║
║  │                                                     │ ║
║  │ [ ✅ Approve ]  [ ❌ Reject ]  [ 👁️ Details ]      │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ Sample #2                           🟡 PENDING     │ ║
║  │ ─────────────────────────────────────────────────  │ ║
║  │ Text: "send parcel to delhi"                       │ ║
║  │ Intent: send_parcel                                │ ║
║  │ Entities: [location: "delhi"]                      │ ║
║  │ Confidence: 89%                                    │ ║
║  │ Language: en  |  Tone: neutral  |  Source: game   │ ║
║  │                                                     │ ║
║  │ [ ✅ Approve ]  [ ❌ Reject ]  [ 👁️ Details ]      │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  [ 📥 Export as JSONL ]  [ 📊 View Stats ]              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

**What You Can Do:**
- ✅ **Approve** samples → Mark as ready for training
- ❌ **Reject** samples → Exclude from training data
- 🔍 **Search** by text or intent
- 🎛️ **Filter** by status (pending/approved/rejected)
- 📥 **Export** approved samples as JSONL for IndicBERT

**Export Example (JSONL format):**
```jsonl
{"text":"I want to order pizza","intent":"order_food","entities":[{"type":"food_item","value":"pizza"}],"language":"en","tone":"neutral","confidence":0.92}
{"text":"send parcel to delhi","intent":"send_parcel","entities":[{"type":"location","value":"delhi"}],"language":"en","tone":"neutral","confidence":0.89}
```

---

## 🎮 Complete Game Flow Example

### **Step-by-Step: Playing Intent Quest**

**1. Start Conversation (via Webchat or API)**
```bash
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"user123","text":"hello"}'
```

**Response:**
```json
{
  "success": true,
  "response": "Hello! Welcome to Mangwale. How can I help you today?"
}
```

---

**2. Request Game**
```bash
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"user123","text":"play intent quest"}'
```

**Response:**
```json
{
  "success": true,
  "response": "🎮 Welcome to Intent Quest!\n\nI'll show you sentences and you identify the intent. Ready?\n\nRound 1/5: 'I need to send a package to Mumbai'\nWhat is the intent? (order_food, send_parcel, book_ride, etc.)"
}
```

---

**3. Answer Question**
```bash
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"user123","text":"send_parcel"}'
```

**Response:**
```json
{
  "success": true,
  "response": "✅ Correct! Score: 20/100\n\nRound 2/5: 'Book me a cab to the airport'\nWhat is the intent?"
}
```

**What Happens Behind the Scenes:**
1. ✅ User answer evaluated
2. ✅ Training sample created:
   ```sql
   INSERT INTO training_samples (
     user_id, text, intent, confidence, 
     language, tone, source, review_status
   ) VALUES (
     'user123', 
     'I need to send a package to Mumbai',
     'send_parcel',
     0.78,
     'en',
     'neutral',
     'game',
     'pending'
   );
   ```
3. ✅ Score updated in session

---

**4. Complete Game (After 5 rounds)**
```json
{
  "success": true,
  "response": "🎉 Game Complete!\n\nFinal Score: 80/100\n\nYou earned 15 credits! 🎁\n\nStats:\n- Correct: 4/5\n- Accuracy: 80%\n- Time: 2m 30s"
}
```

**What Happens:**
1. ✅ Game recorded:
   ```sql
   INSERT INTO games_played (
     user_id, game_type, score, 
     questions_total, questions_correct, status
   ) VALUES (
     'user123', 'intent_quest', 80, 5, 4, 'completed'
   );
   ```

2. ✅ Reward credited (if score ≥ 70):
   ```sql
   INSERT INTO rewards_credited (
     user_id, amount, reason, source
   ) VALUES (
     'user123', 15, 'Intent Quest completion', 'game'
   );
   ```

3. ✅ Dashboard updates automatically!

---

## 📊 Dashboard After Gameplay

### **Updated Main Dashboard**
```
╔══════════════════════════════════════════════════════════╗
║         🎮 Gamification System Dashboard                 ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ║
║  │ 🎮 Games     │  │ 🎁 Rewards   │  │ 👥 Active    │  ║
║  │              │  │              │  │    Users     │  ║
║  │      1       │  │     15       │  │      1       │  ║  ← UPDATED!
║  │    Played    │  │   Credited   │  │              │  ║
║  └──────────────┘  └──────────────┘  └──────────────┘  ║
║                                                          ║
║  ┌──────────────────────────────────────────────────┐  ║
║  │ 📊 Training Samples                              │  ║
║  │                                                   │  ║
║  │  Total: 5  |  Pending: 5  |  Approved: 0        │  ║  ← NEW!
║  │                                                   │  ║
║  │  Average Confidence: 82%                         │  ║
║  │  Ready for Review: 5 samples                     │  ║
║  └──────────────────────────────────────────────────┘  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🧪 Testing Checklist

### **Phase 1: Backend APIs** ✅
```bash
# Test all endpoints
curl http://localhost:3200/api/gamification/stats
curl http://localhost:3200/api/gamification/settings
curl http://localhost:3200/api/gamification/training-samples/stats
```

### **Phase 2: Dashboard Access** ✅
1. ✅ Open `http://localhost:3000/admin/gamification`
2. ✅ See dashboard with stats
3. ✅ Navigate to Settings page
4. ✅ Navigate to Training Samples page

### **Phase 3: Settings Management** ⏳
1. ⏳ Change "Intent Quest Reward" from 15 to 20
2. ⏳ Click "Save Changes"
3. ⏳ Refresh page and verify change persisted

### **Phase 4: Game Flow** ⏳
1. ⏳ Send messages via webchat/API
2. ⏳ Play complete game (5 rounds)
3. ⏳ Verify score > 70 triggers reward

### **Phase 5: Training Samples** ⏳
1. ⏳ See samples appear in dashboard
2. ⏳ Approve/reject samples
3. ⏳ Export as JSONL

---

## 🎯 Success Criteria

**All Green = Production Ready!**

- ✅ Backend: All 9 APIs working
- ✅ Dashboard: All 3 pages loading
- ⏳ Settings: Can modify and save
- ⏳ Games: Complete flow working
- ⏳ Samples: Generated, reviewed, exported
- ⏳ Rewards: Credited automatically

---

## 🚀 Quick Start Commands

```bash
# 1. Check backend
curl http://localhost:3200/api/gamification/stats | jq

# 2. Open dashboard
open http://localhost:3000/admin/gamification
# or
xdg-open http://localhost:3000/admin/gamification

# 3. Run complete test
cd /home/ubuntu/Devs/mangwale-ai
./test-flow-complete.sh

# 4. Test game manually
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"test_user","text":"hello"}'
```

---

## 📝 What to Expect

### **Right Now (Before Gameplay)**
- ✅ Dashboard shows 0 games, 0 rewards, 0 samples
- ✅ Settings page shows 11 configured settings
- ✅ Training samples page is empty

### **After Playing One Game**
- ✅ Dashboard shows 1 game played
- ✅ Dashboard shows rewards credited (if score > 70)
- ✅ Training samples page shows 5 new samples
- ✅ Can approve/reject samples
- ✅ Can export approved samples

---

**🎉 Ready to test! Open your browser to: http://localhost:3000/admin/gamification**
