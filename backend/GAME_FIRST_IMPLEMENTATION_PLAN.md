# 🎮 Game-First User Journey - Implementation Plan

**Date:** November 20, 2025  
**Goal:** Introduce game/rewards FIRST, then food/parcel/ecommerce  
**Platform:** chat.mangwale.ai (works on WhatsApp/Telegram too)

---

## 🎯 YOUR VISION - User Journey

```
User arrives → "What is Mangwale?" 
    ↓
Bot explains: "We do food/parcel/shopping + YOU CAN EARN REWARDS!"
    ↓
User: "How to earn rewards?"
    ↓
Bot: "Play fun 30-second games, earn ₹5-₹15 per game!"
    ↓
User: "Yes, I want to earn!"
    ↓
🎮 GAME STARTS (inline in chat)
    ↓
User plays, we collect NLU training data
    ↓
User earns points → Can redeem to buy on Mangwale
    ↓
THEN → Food/Parcel/Ecommerce services
```

---

## ✅ WHAT WE ALREADY HAVE (Built & Working)

### 1. Authentication System ✅
- **Status:** 100% working (just tested with your number 9923383838)
- **Flow:** Phone → OTP → Verified → JWT token stored
- **Why needed:** To save user's rewards and track their games

### 2. Flow Engine ✅
- **Status:** Active in AgentOrchestrator
- **Flows in DB:** 9 flows (greeting, game_intro, food_order, parcel, etc.)
- **Can disable flows:** YES - `enabled` column in database
- **Location:** `src/flow-engine/`

### 3. Game Introduction Flow ✅
- **Flow ID:** `game_intro_v1`
- **Status:** EXISTS in database, ENABLED
- **Trigger keywords:** "earn", "game", "reward", "play game", "earn money"
- **Location:** `src/flow-engine/flows/game-intro.flow.ts`
- **What it does:**
  ```
  Shows 5 game options with buttons:
  1. 🎯 Intent Quest (earn ₹15)
  2. 🌍 Language Master (earn ₹15)
  3. 😊 Tone Detective (earn ₹15)
  4. 🏆 View Leaderboard
  5. ⏰ Maybe Later
  ```

### 4. Game API (Archived but Functional) ✅
- **Status:** EXISTS but module is DISABLED
- **Location:** `_gamification_archived/controllers/game-simple-api.controller.ts`
- **Endpoints:**
  - `GET /api/gamification/missions` - Get game missions
  - `POST /api/gamification/start` - Start game session
  - `POST /api/gamification/submit` - Submit answer + earn rewards
  - `GET /api/gamification/stats/:userId` - User stats
  - `GET /api/gamification/leaderboard` - Rankings
- **Mock missions ready:** Intent Quest, Language Master, Tone Detective, Entity Hunter, etc.

### 5. Database Tables ✅
- **game_sessions** - Track each game played
- **training_samples** - Store user responses for NLU training
- **conversation_logs** - Every message logged
- **users** table with:
  - `totalGamesPlayed`
  - `totalRewardsEarned`
  - `loyaltyPoints`

### 6. Greeting Flow ✅
- **Flow ID:** `greeting_v1`
- **Status:** Active, working
- **Current behavior:** Welcomes user, mentions earning rewards opportunity
- **LLM prompt:** Already instructs to mention games/rewards!

---

## 🔴 WHAT'S CURRENTLY DISABLED

### 1. GamificationModule ❌
- **Location:** `_gamification_archived/gamification.module.ts`
- **Status:** Commented out in `src/app.module.ts`
- **Reason:** "Prisma schema mismatch" (but schema looks fine to me!)
- **Services archived:**
  - IntentQuestService
  - LanguageMasterService
  - ToneDetectiveService
  - EntityHunterService
  - RewardService
  - LeaderboardService
  - GameWidgetService

---

## 🎯 HOLISTIC APPROACH - NEW USER JOURNEY

### Phase 1: Greeting (Already Working)
```
User: "hi"
Bot (greeting flow): "Hello! Welcome to Mangwale - food delivery, parcel delivery, 
shopping in Nashik. Did you know you can EARN REWARDS by playing fun games? 
How can I help you today?"
```

### Phase 2: User Asks About Mangwale
```
User: "What is Mangwale? What all you do?"

Bot (chitchat flow): "Great question! Mangwale has 3 main services:
🍕 Food Delivery - Order from local restaurants
📦 Parcel Delivery - Send packages anywhere in Nashik
🛒 E-commerce - Shop local products

BUT FIRST... 💰 Did you know you can earn money on chat.mangwale.ai?

We're currently giving REWARDS that you can redeem to buy anything on Mangwale!
Want to know how? 🎮"
```

### Phase 3: Introduce Rewards (Explicit Trigger)
```
User: "Yes! How to earn?" OR "Tell me about rewards"

Bot (game_intro flow): [Shows game introduction with buttons]
"Hey there! 👋 Welcome to the Mangwale AI assistant rewards system!

🎮 Play Quick Fun Games (30 sec - 2 min)
💰 Earn ₹5 to ₹15 per game
🏆 Compete on Leaderboards
📚 Help Train Our AI

Our Games:
- 🎯 Intent Quest (earn ₹15)
- 🌍 Language Master (earn ₹15)
- 😊 Tone Detective (earn ₹15)
- 📝 Profile Builder (earn ₹1 each)

Ready to Play? 🚀
[Button: 🎯 Play Intent Quest]
[Button: 🌍 Play Language Master]
[Button: 😊 Play Tone Detective]
[Button: 🏆 View Leaderboard]
[Button: ⏰ Maybe Later]"
```

### Phase 4: Game Play (Inline in Chat)
```
User clicks: "🎯 Play Intent Quest"

Bot: "🎮 Mission 1: Order Food Challenge
Say naturally how you would order pizza from Dominos.
Speak like you would in real life! 🍕"

User: "I want to order chicken pizza from Dominos"

Bot: "✅ Perfect! +15 points earned! 🎉
That was: Intent='order_food', Entity='chicken pizza', Store='Dominos'

Your Stats:
💰 Total Earned: ₹15
🏆 Rank: #42 (of 150 players)
🎮 Games Played: 1

[Button: 🎮 Play Another Game]
[Button: 💼 Redeem Points]
[Button: 📱 Use Mangwale Services]"
```

### Phase 5: After Multiple Games
```
After user plays 3-5 games...

Bot: "🎉 Awesome! You've earned ₹45 in rewards!
These can be redeemed as wallet balance to:
✅ Order food from any restaurant
✅ Send parcels anywhere
✅ Shop for products

Want to try our services now? 🚀
[Button: 🍕 Order Food]
[Button: 📦 Send Parcel]
[Button: 🛒 Shop Products]
[Button: 🎮 Play More Games]"
```

### Phase 6: Service Usage
```
User clicks: "🍕 Order Food"

Bot: "Great choice! Let me help you order food.
BTW, you have ₹45 in wallet balance! 💰

[Continue with existing food_order flow...]"
```

---

## 🔧 IMPLEMENTATION TASKS

### Task 1: Enable Gamification Module (30 min)
**Status:** ⏳ TODO

**Steps:**
1. Move `_gamification_archived/` to `src/gamification/`
2. Uncomment in `src/app.module.ts`
3. Fix any Prisma errors (if any)
4. Test API endpoints:
   ```bash
   GET http://localhost:3200/api/gamification/missions?userId=1
   POST http://localhost:3200/api/gamification/start
   ```

**Files to modify:**
- `src/app.module.ts` - Uncomment GamificationModule import
- Verify Prisma schema matches (looks fine to me)

---

### Task 2: Create "What is Mangwale?" Flow (45 min)
**Status:** ⏳ TODO - Need new flow

**Flow Definition:**
```typescript
// src/flow-engine/flows/platform-intro.flow.ts
export const platformIntroFlow: FlowDefinition = {
  id: 'platform_intro_v1',
  name: 'Platform Introduction Flow',
  trigger: 'what is mangwale|what do you do|about mangwale|mangwale services',
  module: 'general',
  
  states: {
    introduce_platform: {
      actions: [{
        executor: 'response',
        config: {
          message: `Great question! Mangwale has 3 main services:
          
🍕 **Food Delivery** - Order from 50+ local restaurants in Nashik
📦 **Parcel Delivery** - Send packages anywhere (bike/truck options)
🛒 **E-commerce** - Shop local products and groceries

**BUT FIRST... 💰** We're giving away REAL MONEY!

Play fun 30-second games on chat.mangwale.ai and earn ₹5-₹15 per game. Redeem your earnings to buy anything on Mangwale!

Want to earn some rewards first? 🎮`,
          buttons: [
            { id: 'earn_rewards', label: '💰 Yes! How to earn?', value: 'earn' },
            { id: 'use_service', label: '🍕 Order Food', value: 'food' },
            { id: 'send_parcel', label: '📦 Send Parcel', value: 'parcel' },
            { id: 'maybe_later', label: '⏰ Maybe Later', value: 'later' }
          ]
        }
      }]
    }
  }
};
```

**Database:**
```sql
INSERT INTO flows (id, name, trigger, module, enabled, initial_state, final_states, states, metadata)
VALUES (
  'platform_intro_v1',
  'Platform Introduction Flow',
  'what is mangwale|what do you do|about mangwale|mangwale services|tell me about|what all',
  'general',
  true,
  'introduce_platform',
  '["completed"]',
  '{...}',
  '{}'
);
```

---

### Task 3: Integrate Game Widget into Chat Flow (2 hours)
**Status:** ⏳ TODO - Core integration

**Approach:** Inline game in chat (no redirect)

**Flow:**
1. User clicks "Play Intent Quest" button
2. AgentOrchestrator detects button value
3. Calls `GameWidgetService.startGame(userId, gameType)`
4. Bot sends mission prompt
5. User responds
6. Bot validates answer, gives reward
7. Bot offers next mission

**Implementation:**
```typescript
// src/agents/services/agent-orchestrator.service.ts

async processMessage(phoneNumber, message, session) {
  // ... existing code ...
  
  // Check if user clicked a game button
  if (session.data.pendingGameStart) {
    const gameType = session.data.pendingGameStart; // 'intent_quest', etc.
    return await this.startInlineGame(phoneNumber, gameType);
  }
  
  // Check if user is in active game
  if (session.data.activeGame) {
    return await this.processGameAnswer(phoneNumber, message, session);
  }
  
  // ... rest of logic ...
}

async startInlineGame(phoneNumber, gameType) {
  const gameSession = await this.gamificationService.start({ 
    userId, 
    gameType 
  });
  
  const mission = await this.gamificationService.getMission(gameType);
  
  await this.sessionService.setData(phoneNumber, {
    activeGame: gameSession.sessionId,
    gameMission: mission
  });
  
  return {
    text: `🎮 ${mission.title}\n\n${mission.description}\n\n💡 Hints: ${mission.hints.join(', ')}`,
    buttons: [
      { id: 'skip_game', label: '⏭️ Skip', value: 'skip' }
    ]
  };
}

async processGameAnswer(phoneNumber, answer, session) {
  const result = await this.gamificationService.submit({
    sessionId: session.data.activeGame,
    userInput: answer
  });
  
  // Save to training_samples
  await this.trainingService.createSample({
    text: answer,
    intent: result.detectedIntent,
    entities: result.entities,
    confidence: result.confidence,
    source: 'game',
    user_id: session.data.userId
  });
  
  await this.sessionService.setData(phoneNumber, {
    activeGame: null,
    totalRewardsEarned: session.data.totalRewardsEarned + result.pointsEarned
  });
  
  return {
    text: `✅ ${result.feedback}\n\n💰 +₹${result.pointsEarned} earned!\n\nYour Stats:\n💰 Total: ₹${session.data.totalRewardsEarned}\n🎮 Games: ${session.data.totalGamesPlayed}\n🏆 Rank: #${result.rank}`,
    buttons: [
      { id: 'play_again', label: '🎮 Play Another', value: 'game_again' },
      { id: 'redeem', label: '💼 Redeem Points', value: 'redeem' },
      { id: 'use_service', label: '📱 Use Services', value: 'services' }
    ]
  };
}
```

---

### Task 4: Disable Food/Parcel Flows Until Game Played (30 min)
**Status:** ⏳ TODO - Optional gating

**Approach:** Soft encouragement vs hard block

**Option A: Soft (Recommended)**
```typescript
// Let users access services but remind them about rewards
if (intent === 'order_food' && user.totalGamesPlayed === 0) {
  return {
    text: "Sure! I can help you order food. But first... 👀\n\nDid you know you can earn ₹15 in just 30 seconds? Play a quick game and use your earnings towards your order! 💰",
    buttons: [
      { id: 'earn_first', label: '🎮 Earn ₹15 First', value: 'game' },
      { id: 'order_now', label: '🍕 Order Now', value: 'food_now' }
    ]
  };
}
```

**Option B: Hard Gate (Optional)**
```sql
-- Temporarily disable food/parcel flows for new users
UPDATE flows 
SET enabled = false 
WHERE module IN ('food', 'parcel', 'ecommerce');

-- Re-enable after user plays 1 game (in code)
await prisma.flows.updateMany({
  where: { module: { in: ['food', 'parcel', 'ecommerce'] } },
  data: { enabled: true }
});
```

---

### Task 5: Update Greeting Flow to Emphasize Rewards (15 min)
**Status:** ⏳ TODO - Enhance existing

**Current greeting:** Mentions rewards briefly  
**New greeting:** Make rewards THE MAIN HOOK

```typescript
// Modify src/flow-engine/flows/greeting.flow.ts
systemPrompt: `You are Mangwale AI assistant. This is user's first interaction.

PRIORITY: Hook them with earning opportunity FIRST!

Your response MUST:
1. Warmly greet them
2. IMMEDIATELY mention they can EARN REAL MONEY (₹5-₹15 per 30-second game)
3. Briefly mention services (food/parcel/shopping)
4. Ask if they want to earn rewards first

Keep it 2-3 sentences. Lead with EARNING opportunity!

Example: "Hey! 👋 Welcome to Mangwale! Quick question - want to earn ₹15 in the next 30 seconds? Play a fun game while I tell you about our food delivery, parcels, and shopping services! 💰🎮"
`
```

---

### Task 6: Add Rewards Summary After Multiple Games (1 hour)
**Status:** ⏳ TODO - Engagement loop

**Trigger:** After user completes 3 or 5 games

```typescript
if (user.totalGamesPlayed % 3 === 0 && user.totalGamesPlayed > 0) {
  return {
    text: `🎉 Milestone Reached! 🎉\n\nYou've played ${user.totalGamesPlayed} games and earned ₹${user.totalRewardsEarned}!\n\n💡 You can redeem this to:\n✅ Get discounts on food orders\n✅ Free parcel delivery\n✅ Shop for products\n\nReady to use Mangwale services? Or play more games? 🚀`,
    buttons: [
      { id: 'order_food', label: '🍕 Order Food', value: 'food' },
      { id: 'send_parcel', label: '📦 Send Parcel', value: 'parcel' },
      { id: 'play_more', label: '🎮 Play More', value: 'game' },
      { id: 'leaderboard', label: '🏆 Leaderboard', value: 'leaderboard' }
    ]
  };
}
```

---

## ❓ QUESTIONS FOR YOU

### 1. Game Access Control
**Question:** Should new users be REQUIRED to play at least 1 game before accessing food/parcel services?

**Option A (Soft):** Encourage but allow skip  
**Option B (Hard):** Must play 1 game to unlock services  
**Option C (Hybrid):** Show game first, allow skip after 30 seconds

**Your choice:** A / B / C / Other?

---

### 2. Rewards Redemption
**Question:** What can users do with earned money?

**Currently in game_intro flow:** "Redeem to buy anything on Mangwale"

**Options:**
- A. Wallet balance (usable on any order)
- B. Discount coupons (e.g., ₹50 earned = ₹50 off next order)
- C. Both
- D. Points system (100 points = ₹1)

**Your choice:** A / B / C / D?

---

### 3. Game Frequency Limits
**Question:** Should we limit how many games per day?

**Options:**
- A. Unlimited (users can play all day)
- B. Limited (e.g., 10 games per day to prevent abuse)
- C. Time-based cooldown (1 game per hour)

**Your choice:** A / B / C?

---

### 4. Flow Priority/Disabling Strategy
**Question:** When should we show game vs services?

**Current situation:**
- All 9 flows are enabled
- greeting_v1: Shows on "hi"
- game_intro_v1: Shows on "earn"/"game"/"reward"
- food_order_v1: Shows on "food"/"order"
- parcel_delivery_v1: Shows on "parcel"/"delivery"

**Your preferred approach:**
- A. Keep all enabled, let user choose
- B. Disable food/parcel for first 24 hours (game-only period)
- C. Show game popup after every greeting
- D. Something else?

**Your choice:** A / B / C / D (describe)?

---

### 5. Game Mode
**Question:** Inline chat game or separate page?

**Option A: Inline (Recommended)**
```
User: "Play game"
Bot: "🎮 Mission: Say how you'd order pizza"
User: "I want pizza from Dominos"
Bot: "✅ +₹15! Play another?"
```
✅ Works on WhatsApp/Telegram  
✅ No page redirect  
✅ Seamless experience

**Option B: Separate Page**
```
User: "Play game"
Bot: "🎮 Click here: http://chat.mangwale.ai/game.html?userId=123"
[User plays on separate page]
```
✅ Better UI/UX  
✅ More interactive  
❌ Only works on web  
❌ Doesn't work on WhatsApp

**Your choice:** A (inline) / B (separate page) / Both?

---

### 6. Training Data Collection Priority
**Question:** What data matters most?

**Options to collect from games:**
- Intent classification (order_food, track_order, cancel)
- Entity extraction (restaurant names, locations, items)
- Tone/sentiment (urgent, casual, angry)
- Language detection (English, Hindi, Hinglish, Marathi)
- User preferences (dietary, cuisines, habits)

**Your priority order:** 1, 2, 3, 4, 5?

---

### 7. Initial Rollout Strategy
**Question:** How to introduce this to users?

**Option A: Gradual**
- Week 1: Enable for 10 test users (you + team)
- Week 2: Enable for 100 users (friends/family)
- Week 3: Public launch

**Option B: Immediate**
- Enable for all users on chat.mangwale.ai today
- Monitor and fix issues live

**Your choice:** A (gradual) / B (immediate)?

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Enable Gamification (TODAY - 2 hours)
- [ ] Move `_gamification_archived/` to `src/gamification/`
- [ ] Uncomment GamificationModule in app.module.ts
- [ ] Fix any errors and test
- [ ] Verify API endpoints work
- [ ] Test game missions endpoint

### Phase 2: Create Platform Intro Flow (TODAY - 1 hour)
- [ ] Create `platform-intro.flow.ts`
- [ ] Insert into database
- [ ] Test trigger keywords
- [ ] Verify buttons work

### Phase 3: Integrate Inline Game (TOMORROW - 3 hours)
- [ ] Add game logic to AgentOrchestrator
- [ ] Handle button clicks
- [ ] Process game answers
- [ ] Calculate rewards
- [ ] Save to training_samples
- [ ] Test complete flow

### Phase 4: Enhance Greeting (TOMORROW - 30 min)
- [ ] Update greeting prompt
- [ ] Emphasize earning opportunity
- [ ] Test with fresh users

### Phase 5: Add Milestones (TOMORROW - 1 hour)
- [ ] After 3 games, show summary
- [ ] Offer service usage
- [ ] Track engagement

### Phase 6: Testing & Refinement (Day 3)
- [ ] Test on chat.mangwale.ai
- [ ] Test with your number (9923383838)
- [ ] Test WhatsApp channel
- [ ] Fix issues
- [ ] Launch!

---

## 🚀 NEXT IMMEDIATE ACTION

**I need your answers to questions 1-7 above, then I'll:**

1. Enable gamification module
2. Create platform intro flow
3. Integrate inline game into orchestrator
4. Test complete flow with you

**Estimated time to working prototype:** 6-8 hours of focused work

**Ready to proceed?** Answer the 7 questions and I'll start implementing! 🎮💰
