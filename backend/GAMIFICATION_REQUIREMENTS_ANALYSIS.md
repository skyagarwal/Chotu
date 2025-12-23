# 🎯 Gamification System - Complete Requirements Analysis

**Date:** November 20, 2025  
**Purpose:** Clarify requirements before implementation

---

## ✅ WHAT WE HAVE VERIFIED

### 1. Admin Dashboard EXISTS ✅
- **Location:** `/home/ubuntu/Devs/mangwale-unified-dashboard/`
- **Running:** `mangwale-dashboard` container (internal only, needs port mapping)
- **Flow Management Page:** `/admin/flows/page.tsx` ✅ EXISTS
- **Features:**
  - ✅ List all flows
  - ✅ Filter by module (food, parcel, ecommerce, etc.)
  - ✅ Enable/Disable flows (toggle button)
  - ✅ Delete flows
  - ✅ Create new flows
  - ✅ Edit flows

### 2. Flow Management API EXISTS ✅
- **Controller:** `src/flow-engine/flows.controller.ts`
- **Endpoints:**
  - `GET /flows` - List all flows with filtering
  - `GET /flows/:id` - Get single flow
  - `POST /flows` - Create new flow
  - `PUT /flows/:id` - Update flow
  - `DELETE /flows/:id` - Soft delete (disables flow)
  - `PATCH /flows/:id/toggle` - Enable/disable toggle ✅
- **Database:** Uses Prisma → `flows` table in PostgreSQL

### 3. Flow Database Structure ✅
```sql
flows table:
- id (string, PK)
- name (string)
- description (string, nullable)
- module (string) - food/parcel/ecommerce/general
- trigger (string) - keywords to activate flow
- enabled (boolean) - can be toggled ✅
- status (string) - active/inactive
- states (json) - flow definition
- initialState (string)
- finalStates (json array)
- createdAt (timestamp)
- updatedAt (timestamp)
```

### 4. Current Flows in Database ✅
```
1. greeting_v1 (general) - ENABLED
2. game_intro_v1 (general) - ENABLED ⭐
3. chitchat_v1 (general) - ENABLED
4. farewell_v1 (general) - ENABLED
5. feedback_v1 (general) - ENABLED
6. help_v1 (general) - ENABLED
7. food_order_v1 (food) - ENABLED
8. parcel_delivery_v1 (parcel) - ENABLED
9. ecommerce_order_v1 (ecommerce) - ENABLED
```

### 5. Gamification System Status ❌
- **Location:** `_gamification_archived/`
- **Status:** DISABLED (commented out in app.module.ts)
- **Reason:** "Prisma schema mismatch" (but schema looks fine!)
- **Tables:** game_sessions table EXISTS in Prisma schema ✅
- **API:** Complete but archived

### 6. Training Data Collection 🟡
- **conversation_memory table** - EXISTS ✅
  - Stores: user_id, role, content, turn_number, session_id, created_at
  - Used for: Turn-by-turn conversation tracking
- **training_samples table** - DOES NOT EXIST ❌
  - **NEEDS TO BE CREATED** for labeled training data
- **conversation_logs** - Mentioned in docs but NOT in database ❌
  - **NEEDS TO BE CREATED** for full conversation tracking with NLU data

---

## 🎯 YOUR REQUIREMENTS

### 1. Admin Dashboard Control Panel
**Requirement:** "Admin dashboard to set rewards for questions, game limits, and all variables"

**What needs to be built:**
```
Admin page: /admin/gamification/settings

Settings to configure:
1. Reward amounts per game type:
   - Intent Quest: ₹____ (default: 15)
   - Language Master: ₹____ (default: 15)
   - Tone Detective: ₹____ (default: 15)
   - Entity Hunter: ₹____ (default: 10)
   - Profile Builder: ₹____ (default: 1)

2. Game limits:
   - Max games per day: ____ (default: 10)
   - Max games per hour: ____ (default: 5)
   - Cooldown between games: ____ minutes (default: 0)

3. Question pool:
   - Questions come from: [Database ✓] [AI-generated ✗]
   - Question context: [User conversation ✓] [Random ✗]
   - Difficulty levels: [Easy/Medium/Hard ✓]

4. Flow control:
   - Force game before services: [Yes/No]
   - Game introduction timing: [After login/Random/On-demand]
   - Minimum games for service access: ____ (default: 0)
```

### 2. Database-Driven Configuration
**Requirement:** "Nothing hardcoded, everything from database"

**Tables needed:**
```sql
-- 1. Gamification Settings
CREATE TABLE gamification_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,  -- 'reward_intent_quest', 'max_games_per_day', etc.
  value TEXT NOT NULL,                 -- JSON or plain value
  type VARCHAR(20) NOT NULL,           -- 'number', 'boolean', 'json', 'string'
  description TEXT,
  category VARCHAR(50),                -- 'rewards', 'limits', 'gameplay', 'flows'
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- 2. Game Questions Pool
CREATE TABLE game_questions (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(50) NOT NULL,      -- 'intent_quest', 'language_master', etc.
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  answer_options JSONB,                -- For multiple choice
  difficulty VARCHAR(20),              -- 'easy', 'medium', 'hard'
  reward_amount DECIMAL(10,2),         -- Can override default reward
  context_required BOOLEAN DEFAULT FALSE, -- Needs user conversation context?
  tags TEXT[],                         -- ['food', 'delivery', 'hindi']
  created_at TIMESTAMP DEFAULT NOW(),
  enabled BOOLEAN DEFAULT TRUE
);

-- 3. Training Samples (for IndicBERT)
CREATE TABLE training_samples (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  text TEXT NOT NULL,                  -- User's natural language input
  intent VARCHAR(100) NOT NULL,        -- Classified intent
  entities JSONB,                      -- Extracted entities
  confidence DECIMAL(5,4),             -- NLU confidence score
  language VARCHAR(10),                -- 'en', 'hi', 'mr', 'hinglish'
  tone VARCHAR(50),                    -- 'casual', 'urgent', 'formal', 'angry'
  context JSONB,                       -- Conversation context
  source VARCHAR(50),                  -- 'game', 'conversation', 'manual'
  approved BOOLEAN DEFAULT FALSE,      -- Human-verified?
  approved_by VARCHAR(100),
  game_session_id VARCHAR(100),       -- Link to game if from game
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Conversation Logs (for analytics)
CREATE TABLE conversation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  session_id VARCHAR(100),
  phone_number VARCHAR(50),
  user_message TEXT NOT NULL,
  bot_response TEXT,
  intent VARCHAR(100),
  nlu_confidence DECIMAL(5,4),
  nlu_provider VARCHAR(50),            -- 'indicbert', 'openai', 'heuristic'
  entities JSONB,
  routing_decision VARCHAR(100),       -- Which flow/agent handled it
  flow_id VARCHAR(100),
  agent_id VARCHAR(100),
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  channel VARCHAR(50)                  -- 'whatsapp', 'telegram', 'web'
);
```

### 3. Flow Control Requirements
**Requirement:** "Check which flows can be disabled, which cannot"

**Analysis:**
```
CANNOT BE DISABLED (Core system flows):
1. greeting_v1 - First interaction, must always work
2. help_v1 - Users must always get help
3. farewell_v1 - Polite goodbye, should always work

CAN BE DISABLED (Feature flows):
4. game_intro_v1 - Can disable if game system down
5. chitchat_v1 - Can disable for focused experience
6. feedback_v1 - Optional feature
7. food_order_v1 - Can disable for maintenance
8. parcel_delivery_v1 - Can disable for maintenance
9. ecommerce_order_v1 - Can disable for maintenance

IMPLEMENTATION:
- Add `system_critical` boolean to flows table
- Add validation in toggle endpoint:
  if (flow.system_critical && !flow.enabled) {
    throw new Error("Cannot disable critical system flow");
  }
```

### 4. Multi-Channel Priority
**Requirement:** "Building multi-channel, web chat first priority"

**Strategy:**
```
Phase 1: Web Chat (chat.mangwale.ai) ✅ FIRST
- Test all game flows
- Validate data collection
- Debug user experience
- Perfect reward system

Phase 2: WhatsApp
- Use SAME flows (already channel-agnostic)
- Test button interactions (WhatsApp has limitations)
- Verify inline game works

Phase 3: Telegram
- Use SAME flows
- Test inline keyboards
- Verify game interactions

Channel-specific settings:
- Create `channel_settings` table if needed
- For now: ALL channels use SAME flows ✅
```

### 5. IndicBERT Training Data Collection
**Requirement:** "Collect maximum data to train IndicBERT, make it very smart"

**IndicBERT Can Be Trained On:**

**A. Intent Classification (PRIMARY)**
```
Intents to collect:
1. Food ordering intents:
   - order_food, browse_menu, search_restaurant
   - modify_order, cancel_order, track_order
   - restaurant_timing, restaurant_location
   
2. Parcel delivery intents:
   - create_parcel_order, track_parcel
   - cancel_parcel, modify_pickup
   - estimate_delivery_cost
   
3. E-commerce intents:
   - search_product, browse_category
   - add_to_cart, checkout
   - track_shipment, return_product
   
4. General intents:
   - greeting, farewell, help
   - complaint, feedback, chitchat
   - payment_query, wallet_balance
   
5. Game/Reward intents:
   - play_game, check_rewards
   - redeem_points, leaderboard

Total: 30-50 distinct intents
```

**B. Entity Extraction (SECONDARY)**
```
Entities to extract:
1. Location entities:
   - city, area, landmark, address
   - pincode, state
   
2. Restaurant/Store entities:
   - restaurant_name, brand_name
   - cuisine_type, category
   
3. Item entities:
   - food_item, product_name
   - quantity, size, variant
   
4. Time entities:
   - delivery_time, pickup_time
   - date, time_of_day
   
5. Person entities:
   - customer_name, contact_number
   
6. Payment entities:
   - payment_method, amount
   - promo_code, discount

Total: 15-20 entity types
```

**C. Language Detection (TERTIARY)**
```
Languages to detect:
1. English (en)
2. Hindi (hi)
3. Marathi (mr)
4. Hinglish (hi-en) - Mixed Hindi+English
5. Manglish (mr-en) - Mixed Marathi+English

IndicBERT is PERFECT for this! (Indic languages)
```

**D. Tone/Sentiment Detection (ADVANCED)**
```
Tones to classify:
1. Casual/Friendly
2. Urgent/Impatient
3. Formal/Polite
4. Angry/Frustrated
5. Confused/Asking
6. Happy/Satisfied

This helps personalize responses!
```

**E. Conversation Context (ADVANCED)**
```
Context features:
1. Is user ordering for first time?
2. Does user have dietary restrictions?
3. What's user's preferred cuisine?
4. What's typical order time (lunch/dinner)?
5. Is user price-sensitive or quality-focused?

This improves recommendations!
```

---

## ❓ CRITICAL QUESTIONS FOR YOU

### Question 1: Game Question Source
**Current:** Game questions are HARDCODED in `game-simple-api.controller.ts`

**Options:**
- **A.** Move questions to `game_questions` table (database-driven) ✅ RECOMMENDED
- **B.** Keep hardcoded for now, migrate later
- **C.** AI-generated questions on-the-fly (more dynamic but less control)

**If A, should we:**
1. Create admin UI to add/edit questions?
2. Bulk import questions from CSV/JSON?
3. Both?

**Your choice:** A / B / C ?

---

### Question 2: Reward Configuration
**Where to store reward settings?**

**Options:**
- **A.** `gamification_settings` table (one row per setting)
  ```sql
  INSERT INTO gamification_settings VALUES
  ('reward_intent_quest', '15', 'number', 'Reward for Intent Quest game'),
  ('reward_language_master', '15', 'number', 'Reward for Language Master game'),
  ('max_games_per_day', '10', 'number', 'Maximum games user can play per day');
  ```

- **B.** Single JSON config in `gamification_settings`
  ```sql
  INSERT INTO gamification_settings VALUES
  ('game_config', '{"rewards": {"intent_quest": 15, ...}, "limits": {"daily": 10}}', 'json', 'All game config');
  ```

- **C.** Environment variables (`.env` file)
  ```bash
  REWARD_INTENT_QUEST=15
  REWARD_LANGUAGE_MASTER=15
  MAX_GAMES_PER_DAY=10
  ```

**Pros/Cons:**
- A: Easy to query, easy admin UI, flexible
- B: Compact, version-controlled, single source
- C: Fast, no DB needed, but requires restart to change

**Your choice:** A / B / C / D (describe alternative)?

---

### Question 3: Flow Protection Rules
**Which flows should be protected from disabling?**

**Current suggestion:**
```
CANNOT DISABLE:
1. greeting_v1 (users must get welcomed)
2. help_v1 (users must get help)
3. farewell_v1 (polite goodbyes)

CAN DISABLE:
- All service flows (food, parcel, ecommerce)
- All game flows
- All optional flows (chitchat, feedback)
```

**Your preference:**
- **A.** Agree with above
- **B.** Only greeting cannot be disabled
- **C.** ALL flows can be disabled (admin has full control)
- **D.** Add game_intro_v1 to protected list (game system core)

**Your choice:** A / B / C / D?

---

### Question 4: Training Data Priority
**What data matters MOST for IndicBERT training?**

**Rank these 1-5 (1=highest priority):**
- ____ Intent classification (order_food, track_order, etc.)
- ____ Entity extraction (restaurant names, locations, items)
- ____ Language detection (English, Hindi, Hinglish, Marathi)
- ____ Tone/sentiment (urgent, casual, angry, happy)
- ____ User preferences (dietary, cuisines, habits)

**This determines:**
- Which games to prioritize
- Which data to collect first
- Which features to build

**Your ranking:** 1.______  2.______  3.______  4.______  5.______

---

### Question 5: Game Question Context
**Requirement:** "Questions come from things users have answered or in context"

**Interpretation A:** Questions based on user's OWN conversation
```
Example:
User: "I want pizza from Dominos"
Game Question: "What did you just order?" 
Expected Answer: "pizza" or "food"
Intent: order_food ✓

Pro: Highly relevant to user
Con: Limited question variety per user
```

**Interpretation B:** Questions based on COMMON conversations
```
Example:
Game shows: "User says: 'I want biryani'. What is the intent?"
Options: A) order_food  B) track_order  C) cancel_order
Expected: A

Pro: Can create large question bank
Con: Not personalized to user
```

**Interpretation C:** Mix of both
```
50% personalized (from user's conversation)
50% general (from question bank)
```

**Your preference:** A / B / C?

---

### Question 6: Admin Dashboard Features Priority
**What admin features matter MOST?**

**Rank these features 1-10 (1=must have now, 10=can wait):**
- ____ View/Edit game rewards
- ____ View/Edit game limits (max per day)
- ____ View/Edit game questions
- ____ Enable/Disable flows
- ____ View conversation logs
- ____ View training data collected
- ____ View user game statistics
- ____ View leaderboard
- ____ Export training data (JSONL/CSV)
- ____ Manually label/approve training samples

**This determines implementation order.**

**Your ranking:** (provide numbers 1-10 for each)

---

### Question 7: Critical Flows List
**Which flows are ABSOLUTELY CRITICAL and must NEVER be disabled?**

**Current flows:**
1. greeting_v1 - Welcome new users
2. game_intro_v1 - Introduce games/rewards
3. chitchat_v1 - Handle casual talk
4. farewell_v1 - Say goodbye
5. feedback_v1 - Collect feedback
6. help_v1 - Provide help
7. food_order_v1 - Food ordering
8. parcel_delivery_v1 - Parcel delivery
9. ecommerce_order_v1 - E-commerce

**Your critical list (select all that apply):**
- [ ] greeting_v1
- [ ] game_intro_v1
- [ ] chitchat_v1
- [ ] farewell_v1
- [ ] feedback_v1
- [ ] help_v1
- [ ] food_order_v1
- [ ] parcel_delivery_v1
- [ ] ecommerce_order_v1
- [ ] Other: __________

---

### Question 8: Data Collection Granularity
**How detailed should we track conversations?**

**Option A: Basic (Fast, Less storage)**
```
conversation_logs:
- user_message
- bot_response
- intent
- confidence
- timestamp
```

**Option B: Detailed (Slower, More storage)**
```
conversation_logs:
- user_message
- bot_response
- intent + ALL alternate intents with scores
- entities + ALL extracted entities
- confidence + confidence_breakdown
- nlu_provider + fallback_chain
- routing_decision + why
- processing_time_ms
- context (full session state snapshot)
- channel + platform + device
- timestamp
```

**Option C: Both (Hybrid)**
```
- Basic logs for ALL messages (fast writes)
- Detailed logs for LOW-confidence messages (need review)
- Detailed logs for GAME messages (training data)
```

**Your choice:** A / B / C?

**Storage consideration:**
- 1000 users × 50 messages/day = 50,000 messages/day
- Option A: ~5 MB/day
- Option B: ~50 MB/day
- Option C: ~15 MB/day

---

### Question 9: Game vs Service Balance
**When should we push game vs service?**

**Scenario 1: New user (never played game)**
```
User: "I want pizza"

Option A: Force game first
Bot: "Great! But first, earn ₹15 in 30 seconds by playing a game! 
     You can use it towards your pizza order 🎮"

Option B: Soft nudge
Bot: "Sure! Before we proceed, want to earn ₹15 quickly? 
     [Play Game] [Order Now]"

Option C: No interruption
Bot: "Sure! Let me help you order pizza. 
     (BTW, you can earn rewards by playing games later! 💰)"
```

**Scenario 2: User played 5 games today**
```
User: "I want to play more games"

Option A: Allow unlimited
Bot: "Great! Here's your next mission..."

Option B: Soft limit
Bot: "You've played 5 games today (earning ₹75!). 
     Want to use your rewards to order something? 
     [Order Food] [Play Anyway]"

Option C: Hard limit
Bot: "You've reached your daily limit of 10 games. 
     Come back tomorrow or use your ₹75 to order! 
     [Order Food] [View Leaderboard]"
```

**Your preferences:**
- Scenario 1: A / B / C / Other: __________
- Scenario 2: A / B / C / Other: __________

---

### Question 10: Training Data Quality vs Quantity
**What matters more?**

**Option A: Quantity (Collect fast, verify later)**
- Save ALL user responses immediately
- Mark as "needs_review"
- Human verification happens in batch (weekly)
- **Goal:** 10,000 samples in 1 month

**Option B: Quality (Verify as we go)**
- Show user what we classified
- Ask "Is this correct?" after each game
- Only save human-verified samples
- **Goal:** 1,000 high-quality samples in 1 month

**Option C: Hybrid (Smart filtering)**
- High confidence (>0.85): Auto-save ✓
- Medium confidence (0.60-0.85): Needs review ?
- Low confidence (<0.60): Human verification required ✗
- **Goal:** 5,000 auto + 500 verified in 1 month

**Your choice:** A / B / C?

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Database Foundation (2 hours)
1. Create tables:
   - [ ] gamification_settings
   - [ ] game_questions
   - [ ] training_samples
   - [ ] conversation_logs
2. Add system_critical column to flows table
3. Seed initial data (questions, settings)

### Phase 2: Backend APIs (3 hours)
1. Settings API:
   - [ ] GET /api/gamification/settings
   - [ ] PUT /api/gamification/settings/:key
2. Questions API:
   - [ ] GET /api/gamification/questions
   - [ ] POST /api/gamification/questions
   - [ ] PUT /api/gamification/questions/:id
3. Training Data API:
   - [ ] GET /api/training/samples
   - [ ] POST /api/training/samples/approve
   - [ ] GET /api/training/export (JSONL)

### Phase 3: Admin Dashboard Pages (4 hours)
1. Gamification Settings page:
   - [ ] /admin/gamification/settings
   - [ ] Edit rewards, limits, configs
2. Game Questions page:
   - [ ] /admin/gamification/questions
   - [ ] Add/edit/delete questions
3. Training Data page:
   - [ ] /admin/training/samples
   - [ ] View, approve, export samples
4. Enhanced Flow Management:
   - [ ] Mark critical flows
   - [ ] Warning when disabling critical flows

### Phase 4: Enable Gamification Module (2 hours)
1. Move _gamification_archived/ → src/gamification/
2. Uncomment in app.module.ts
3. Update services to read from database (not hardcoded)
4. Test all game APIs

### Phase 5: Integrate with Chat Flow (3 hours)
1. Connect game_intro flow to actual game play
2. Implement inline game in AgentOrchestrator
3. Save responses to training_samples
4. Save conversations to conversation_logs
5. Test complete flow

### Phase 6: Testing & Launch (2 hours)
1. Test on chat.mangwale.ai
2. Test with real users
3. Verify data collection
4. Monitor performance

**Total: ~16 hours = 2 days of focused work**

---

## 📝 NEXT IMMEDIATE ACTION

**I need your answers to Questions 1-10 above.**

Once you answer, I will:
1. Create database migration scripts
2. Build admin dashboard pages
3. Enable gamification system
4. Integrate with conversation flow
5. Test and deploy

**Please provide your decisions on all 10 questions! 🎯**
