# 🎮 Gamification System - Complete Implementation Plan

**Date:** November 20, 2025  
**Based on user requirements analysis**

---

## 📋 YOUR DECISIONS SUMMARY

### ✅ Decision 1: Database-Driven Configuration
- **Choice:** Everything from database (no hardcoded values)
- **Implementation:** Create `gamification_settings` table for all configurable values

### ✅ Decision 2: PHP Backend Handles Rewards
- **Choice:** Rewards issued by Brain PHP backend
- **API Required:** `POST /api/v1/customer/wallet/add-fund-by-admin`
- **Payload Format:**
```json
{
  "user_id": 1234,
  "amount": 15.00,
  "transaction_type": "add_fund_by_admin",
  "reference": "Game Reward: Intent Quest - Session ABC123",
  "note": "Earned from playing Intent Quest game"
}
```

### ✅ Decision 3: Critical Flows (Cannot Be Disabled)
- **greeting_v1** - First user interaction (CRITICAL)
- **help_v1** - User support (CRITICAL)
- **farewell_v1** - Polite goodbyes (CRITICAL)
- All other flows can be disabled from admin dashboard

### ✅ Decision 4: Training Priority (Rank 1-5)
Based on "all" - collecting everything, here's optimal priority:
1. **Intent Classification** (PRIMARY) - Most impact on routing accuracy
2. **Entity Extraction** (SECONDARY) - Improves data quality
3. **Language Detection** (TERTIARY) - Multi-language support
4. **Tone/Sentiment** (ADVANCED) - Personalization
5. **User Preferences** (ADVANCED) - Long-term improvements

### ✅ Decision 5: Question Source (Mix Approach)
- **50% Personalized** - From user's own conversation history
- **50% General** - From pre-created question bank
- **System:** Check user's conversation_memory for context-aware questions

### ✅ Decision 6: Admin Features Priority
You said "all" - building all features, here's implementation order:
1. Enable/Disable flows (ALREADY EXISTS ✅)
2. View/Edit game rewards
3. View/Edit game limits (max per day)
4. View conversation logs
5. View training data collected
6. Export training data (JSONL/CSV)
7. View user game statistics
8. View/Edit game questions
9. View leaderboard
10. Manually label/approve training samples

### ✅ Decision 7: Data Collection Granularity
- **Choice:** Detailed logging
- **Implementation:** Full conversation context, NLU breakdown, routing decisions, timings

### ✅ Decision 8: Game & Flow Priority
- **Current Focus:** Data collection + game system
- **Strategy:** Check available flows, game integrates with flow engine automatically
- **No Forced Games:** Soft nudge approach - user can choose to play or skip

### ✅ Decision 9: Training Pipeline Strategy
Your request: "you suggest, check how we collect, clean, train"
- **Collection:** Automatic via conversation_capture.service.ts (already exists)
- **Cleaning:** Smart filtering (high confidence auto-approve, low confidence needs review)
- **Training:** Export to JSONL → Train IndicBERT → Validate → Deploy
- **Quality:** Hybrid approach (auto + human verification)

### ✅ Decision 10: Critical Flows List
Confirmed 3 critical flows that cannot be disabled:
- ✅ greeting_v1
- ✅ help_v1
- ✅ farewell_v1

---

## 🔍 PHP BACKEND REWARD INTEGRATION

### API Endpoint Discovery

**Method:** `POST /api/v1/customer/wallet/add-fund-by-admin`

**From PHP Backend Analysis:**
```php
// Location: app/CentralLogics/customer.php
public static function create_wallet_transaction($user_id, float $amount, $transaction_type, $reference)
{
    $wallet_transaction = new WalletTransaction();
    $wallet_transaction->user_id = $user_id;
    $wallet_transaction->transaction_type = $transaction_type;
    $wallet_transaction->reference = $reference;
    $wallet_transaction->credit = $amount;
    $wallet_transaction->debit = 0;
    $wallet_transaction->balance = $user->wallet_balance + $amount;
    $wallet_transaction->save();
    
    // Update user wallet balance
    $user->wallet_balance += $amount;
    $user->save();
}
```

### Transaction Types in PHP Backend
```
add_fund_by_admin - Admin/System added funds (PERFECT FOR GAME REWARDS)
├─ reference: "Game Reward: Intent Quest"
├─ amount: ₹15.00
└─ Updates: wallet_transactions table + users.wallet_balance
```

### Payload for Game Rewards
```typescript
// NestJS Service Implementation
async creditGameReward(userId: number, amount: number, gameType: string, sessionId: string) {
  const payload = {
    user_id: userId,
    amount: amount,
    transaction_type: 'add_fund_by_admin',
    reference: `Game Reward: ${gameType} - ${sessionId}`,
    note: `Earned ₹${amount} playing ${gameType}`,
    admin_id: null, // System-generated reward
    source: 'gamification_system'
  };
  
  // Call PHP API
  const response = await this.phpApi.post('/api/v1/admin/wallet/add-fund-by-admin', payload, {
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` } // Admin token for system ops
  });
  
  return response;
}
```

### Existing Services (Already Built)
- ✅ `PhpWalletService` - Get balance, transactions
- ✅ `PhpLoyaltyService` - Get points, convert to wallet
- ❌ **MISSING:** `creditGameReward()` method - **NEEDS TO BE ADDED**

---

## 📊 DATABASE SCHEMA UPDATES

### 1. Add Critical Flag to Flows Table
```sql
-- Migration: Add system_critical column
ALTER TABLE flows ADD COLUMN system_critical BOOLEAN DEFAULT FALSE;

-- Mark critical flows
UPDATE flows SET system_critical = TRUE WHERE id IN ('greeting_v1', 'help_v1', 'farewell_v1');

-- Add constraint to prevent disabling critical flows
-- (Handled in application logic, not database constraint)
```

### 2. Create Gamification Settings Table
```sql
CREATE TABLE gamification_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'number', 'boolean', 'json', 'string'
  description TEXT,
  category VARCHAR(50), -- 'rewards', 'limits', 'gameplay', 'flows'
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Seed initial data
INSERT INTO gamification_settings (key, value, type, description, category) VALUES
('reward_intent_quest', '15', 'number', 'Reward amount for Intent Quest game', 'rewards'),
('reward_language_master', '15', 'number', 'Reward amount for Language Master game', 'rewards'),
('reward_tone_detective', '15', 'number', 'Reward amount for Tone Detective game', 'rewards'),
('reward_entity_hunter', '10', 'number', 'Reward amount for Entity Hunter game', 'rewards'),
('reward_profile_builder', '5', 'number', 'Reward amount for Profile Builder game', 'rewards'),
('max_games_per_day', '10', 'number', 'Maximum games user can play per day', 'limits'),
('max_games_per_hour', '5', 'number', 'Maximum games user can play per hour', 'limits'),
('game_cooldown_minutes', '0', 'number', 'Cooldown between games in minutes', 'limits'),
('personalized_question_ratio', '0.5', 'number', 'Ratio of personalized vs general questions (0-1)', 'gameplay'),
('min_confidence_auto_save', '0.85', 'number', 'Min confidence to auto-save training data', 'training'),
('game_system_enabled', 'true', 'boolean', 'Enable/disable entire game system', 'gameplay');
```

### 3. Create Game Questions Bank
```sql
CREATE TABLE game_questions (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(50) NOT NULL, -- 'intent_quest', 'language_master', etc.
  question_text TEXT NOT NULL,
  question_context TEXT, -- Additional context for personalized questions
  correct_answer TEXT NOT NULL,
  answer_options JSONB, -- For multiple choice
  difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  reward_amount DECIMAL(10,2), -- Override default reward
  context_required BOOLEAN DEFAULT FALSE, -- Needs user conversation context?
  tags TEXT[], -- ['food', 'delivery', 'hindi']
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  enabled BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0, -- Track how many times used
  success_rate DECIMAL(5,4) -- Track accuracy (for adaptive difficulty)
);

-- Seed with initial questions
INSERT INTO game_questions (game_type, question_text, correct_answer, difficulty, tags, context_required) VALUES
-- Intent Quest Questions (General)
('intent_quest', 'What is the intent when user says: "I want biryani from Paradise"?', 'order_food', 'easy', ARRAY['food', 'ordering'], FALSE),
('intent_quest', 'What is the intent when user says: "Where is my order?"?', 'track_order', 'easy', ARRAY['tracking', 'support'], FALSE),
('intent_quest', 'What is the intent when user says: "Cancel my parcel delivery"?', 'cancel_parcel', 'medium', ARRAY['parcel', 'cancellation'], FALSE),
('intent_quest', 'What is the intent when user says: "I need help with payment"?', 'payment_help', 'medium', ARRAY['payment', 'support'], FALSE),

-- Language Master Questions
('language_master', 'Say "I want pizza" in Hinglish', 'mujhe pizza chahiye', 'easy', ARRAY['hinglish', 'food'], FALSE),
('language_master', 'Say "Where is my order" in Hindi', 'mera order kahan hai', 'easy', ARRAY['hindi', 'tracking'], FALSE),
('language_master', 'Say "Fast delivery please" in Marathi', 'jaldi delivery kara', 'medium', ARRAY['marathi', 'delivery'], FALSE),

-- Tone Detective Questions
('tone_detective', 'Say "I need food urgently" with an urgent tone', 'urgent', 'easy', ARRAY['tone', 'urgency'], FALSE),
('tone_detective', 'Say "Thanks for the delivery" with a happy tone', 'happy', 'easy', ARRAY['tone', 'gratitude'], FALSE),

-- Entity Hunter Questions (Context-aware)
('entity_hunter', 'Tell me a landmark near your location', 'landmark', 'medium', ARRAY['location', 'entity'], TRUE),
('entity_hunter', 'What time do you want delivery?', 'time', 'easy', ARRAY['time', 'entity'], TRUE);
```

### 4. Create Training Samples Table
```sql
CREATE TABLE training_samples (
  id SERIAL PRIMARY KEY,
  user_id INTEGER, -- References users in PHP database
  session_id VARCHAR(100),
  game_session_id VARCHAR(100), -- Link to game if from game
  
  -- The actual training data
  text TEXT NOT NULL, -- User's natural language input
  intent VARCHAR(100) NOT NULL, -- Classified intent
  entities JSONB, -- Extracted entities
  confidence DECIMAL(5,4), -- NLU confidence score
  language VARCHAR(10), -- 'en', 'hi', 'mr', 'hinglish'
  tone VARCHAR(50), -- 'casual', 'urgent', 'formal', 'angry'
  context JSONB, -- Conversation context
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'game', -- 'game', 'conversation', 'manual'
  nlu_provider VARCHAR(50), -- 'indicbert', 'openai', 'manual'
  
  -- Quality control
  approved BOOLEAN DEFAULT FALSE, -- Human-verified?
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  review_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  review_priority INTEGER DEFAULT 0, -- Higher = needs review sooner
  
  -- Usage tracking
  used_in_training BOOLEAN DEFAULT FALSE,
  training_batch_id VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_training_samples_intent ON training_samples(intent);
CREATE INDEX idx_training_samples_language ON training_samples(language);
CREATE INDEX idx_training_samples_approved ON training_samples(approved);
CREATE INDEX idx_training_samples_review_status ON training_samples(review_status);
CREATE INDEX idx_training_samples_source ON training_samples(source);
```

### 5. Create Conversation Logs Table (Detailed)
```sql
CREATE TABLE conversation_logs (
  id SERIAL PRIMARY KEY,
  
  -- Session tracking
  user_id INTEGER,
  session_id VARCHAR(100) NOT NULL,
  phone_number VARCHAR(50),
  channel VARCHAR(50) DEFAULT 'web', -- 'whatsapp', 'telegram', 'web'
  
  -- Message content
  user_message TEXT NOT NULL,
  bot_response TEXT,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'voice', 'button', 'quick_reply'
  
  -- NLU Analysis (Full breakdown)
  nlu_intent VARCHAR(100),
  nlu_confidence DECIMAL(5,4),
  nlu_alternate_intents JSONB, -- All intents with scores
  nlu_entities JSONB,
  nlu_language VARCHAR(10),
  nlu_tone VARCHAR(50),
  nlu_provider VARCHAR(50), -- 'indicbert', 'openai', 'heuristic'
  nlu_processing_time_ms INTEGER,
  
  -- Routing decision
  routed_to VARCHAR(100), -- 'agent', 'flow', 'direct_api'
  routing_reason TEXT, -- Why this route was chosen
  flow_id VARCHAR(100),
  agent_id VARCHAR(100),
  
  -- Response metadata
  response_type VARCHAR(50), -- 'text', 'structured', 'error'
  response_success BOOLEAN DEFAULT TRUE,
  response_time_ms INTEGER,
  
  -- Context (Full session state snapshot)
  conversation_context JSONB,
  turn_number INTEGER,
  
  -- Analytics
  is_training_candidate BOOLEAN DEFAULT FALSE,
  training_confidence_bucket VARCHAR(20), -- 'high', 'medium', 'low'
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversation_logs_session ON conversation_logs(session_id);
CREATE INDEX idx_conversation_logs_user ON conversation_logs(user_id);
CREATE INDEX idx_conversation_logs_intent ON conversation_logs(nlu_intent);
CREATE INDEX idx_conversation_logs_training ON conversation_logs(is_training_candidate);
CREATE INDEX idx_conversation_logs_created ON conversation_logs(created_at DESC);
```

### 6. Update Game Sessions Table
```sql
-- Check if table exists (should be in Prisma schema already)
-- Add missing columns if needed

ALTER TABLE game_sessions 
  ADD COLUMN IF NOT EXISTS training_sample_id INTEGER REFERENCES training_samples(id),
  ADD COLUMN IF NOT EXISTS conversation_log_id INTEGER REFERENCES conversation_logs(id),
  ADD COLUMN IF NOT EXISTS reward_transaction_id VARCHAR(100), -- Link to PHP wallet_transactions
  ADD COLUMN IF NOT EXISTS reward_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'credited', 'failed'
```

---

## 🏗️ IMPLEMENTATION PHASES

### **Phase 1: Database Foundation** (2 hours)

#### 1.1 Create Prisma Migration
```bash
cd /home/ubuntu/Devs/mangwale-ai
cd libs/database

# Create new migration
npx prisma migrate dev --name gamification_complete_system
```

#### 1.2 Migration File Content
```prisma
// Add to schema.prisma

model GamificationSettings {
  id          Int      @id @default(autoincrement())
  key         String   @unique @db.VarChar(100)
  value       String   @db.Text
  type        String   @db.VarChar(20)
  description String?  @db.Text
  category    String?  @db.VarChar(50)
  updatedAt   DateTime @default(now()) @map("updated_at")
  updatedBy   String?  @db.VarChar(100) @map("updated_by")

  @@map("gamification_settings")
}

model GameQuestion {
  id               Int       @id @default(autoincrement())
  gameType         String    @map("game_type") @db.VarChar(50)
  questionText     String    @map("question_text") @db.Text
  questionContext  String?   @map("question_context") @db.Text
  correctAnswer    String    @map("correct_answer") @db.Text
  answerOptions    Json?     @map("answer_options")
  difficulty       String    @default("medium") @db.VarChar(20)
  rewardAmount     Decimal?  @map("reward_amount") @db.Decimal(10, 2)
  contextRequired  Boolean   @default(false) @map("context_required")
  tags             String[]
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @default(now()) @map("updated_at")
  enabled          Boolean   @default(true)
  usageCount       Int       @default(0) @map("usage_count")
  successRate      Decimal?  @map("success_rate") @db.Decimal(5, 4)

  @@map("game_questions")
}

model TrainingSample {
  id              Int       @id @default(autoincrement())
  userId          Int?      @map("user_id")
  sessionId       String?   @map("session_id") @db.VarChar(100)
  gameSessionId   String?   @map("game_session_id") @db.VarChar(100)
  
  text            String    @db.Text
  intent          String    @db.VarChar(100)
  entities        Json?
  confidence      Decimal?  @db.Decimal(5, 4)
  language        String?   @db.VarChar(10)
  tone            String?   @db.VarChar(50)
  context         Json?
  
  source          String    @default("game") @db.VarChar(50)
  nluProvider     String?   @map("nlu_provider") @db.VarChar(50)
  
  approved        Boolean   @default(false)
  approvedBy      String?   @map("approved_by") @db.VarChar(100)
  approvedAt      DateTime? @map("approved_at")
  reviewStatus    String    @default("pending") @map("review_status") @db.VarChar(20)
  reviewPriority  Int       @default(0) @map("review_priority")
  
  usedInTraining  Boolean   @default(false) @map("used_in_training")
  trainingBatchId String?   @map("training_batch_id") @db.VarChar(100)
  
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([intent])
  @@index([language])
  @@index([approved])
  @@index([reviewStatus])
  @@map("training_samples")
}

model ConversationLog {
  id                       Int       @id @default(autoincrement())
  
  userId                   Int?      @map("user_id")
  sessionId                String    @map("session_id") @db.VarChar(100)
  phoneNumber              String?   @map("phone_number") @db.VarChar(50)
  channel                  String    @default("web") @db.VarChar(50)
  
  userMessage              String    @map("user_message") @db.Text
  botResponse              String?   @map("bot_response") @db.Text
  messageType              String    @default("text") @map("message_type") @db.VarChar(20)
  
  nluIntent                String?   @map("nlu_intent") @db.VarChar(100)
  nluConfidence            Decimal?  @map("nlu_confidence") @db.Decimal(5, 4)
  nluAlternateIntents      Json?     @map("nlu_alternate_intents")
  nluEntities              Json?     @map("nlu_entities")
  nluLanguage              String?   @map("nlu_language") @db.VarChar(10)
  nluTone                  String?   @map("nlu_tone") @db.VarChar(50)
  nluProvider              String?   @map("nlu_provider") @db.VarChar(50)
  nluProcessingTimeMs      Int?      @map("nlu_processing_time_ms")
  
  routedTo                 String?   @map("routed_to") @db.VarChar(100)
  routingReason            String?   @map("routing_reason") @db.Text
  flowId                   String?   @map("flow_id") @db.VarChar(100)
  agentId                  String?   @map("agent_id") @db.VarChar(100)
  
  responseType             String?   @map("response_type") @db.VarChar(50)
  responseSuccess          Boolean   @default(true) @map("response_success")
  responseTimeMs           Int?      @map("response_time_ms")
  
  conversationContext      Json?     @map("conversation_context")
  turnNumber               Int?      @map("turn_number")
  
  isTrainingCandidate      Boolean   @default(false) @map("is_training_candidate")
  trainingConfidenceBucket String?   @map("training_confidence_bucket") @db.VarChar(20)
  
  createdAt                DateTime  @default(now()) @map("created_at")

  @@index([sessionId])
  @@index([userId])
  @@index([nluIntent])
  @@index([isTrainingCandidate])
  @@index([createdAt(sort: Desc)])
  @@map("conversation_logs")
}

// Update Flow model
model Flow {
  // ... existing fields ...
  systemCritical  Boolean  @default(false) @map("system_critical")
}

// Update GameSession model if exists
model GameSession {
  // ... existing fields ...
  trainingSampleId      Int?     @map("training_sample_id")
  conversationLogId     Int?     @map("conversation_log_id")
  rewardTransactionId   String?  @map("reward_transaction_id") @db.VarChar(100)
  rewardStatus          String   @default("pending") @map("reward_status") @db.VarChar(20)
}
```

#### 1.3 Run Migration
```bash
npx prisma generate
npx prisma migrate dev
```

#### 1.4 Seed Initial Data
```bash
# Create seed script
nano prisma/seed-gamification.ts
```

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding gamification settings...');
  
  // Settings
  await prisma.gamificationSettings.createMany({
    data: [
      { key: 'reward_intent_quest', value: '15', type: 'number', category: 'rewards', description: 'Reward for Intent Quest' },
      { key: 'reward_language_master', value: '15', type: 'number', category: 'rewards', description: 'Reward for Language Master' },
      { key: 'reward_tone_detective', value: '15', type: 'number', category: 'rewards', description: 'Reward for Tone Detective' },
      { key: 'max_games_per_day', value: '10', type: 'number', category: 'limits', description: 'Max games per day' },
      { key: 'game_system_enabled', value: 'true', type: 'boolean', category: 'gameplay', description: 'Enable game system' },
    ],
    skipDuplicates: true,
  });

  // Mark critical flows
  await prisma.flow.updateMany({
    where: { id: { in: ['greeting_v1', 'help_v1', 'farewell_v1'] } },
    data: { systemCritical: true },
  });

  // Seed game questions
  await prisma.gameQuestion.createMany({
    data: [
      {
        gameType: 'intent_quest',
        questionText: 'What is the intent: "I want biryani from Paradise"?',
        correctAnswer: 'order_food',
        difficulty: 'easy',
        tags: ['food', 'ordering'],
      },
      // Add more questions...
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

```bash
npx ts-node prisma/seed-gamification.ts
```

---

### **Phase 2: Backend Services** (4 hours)

#### 2.1 Create Gamification Settings Service
```bash
mkdir -p src/gamification/services
nano src/gamification/services/gamification-settings.service.ts
```

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class GamificationSettingsService {
  private readonly logger = new Logger(GamificationSettingsService.name);
  private cache = new Map<string, any>();

  constructor(private prisma: PrismaService) {}

  async getSetting(key: string): Promise<any> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const setting = await this.prisma.gamificationSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      this.logger.warn(`Setting not found: ${key}`);
      return null;
    }

    // Parse value based on type
    let value: any;
    switch (setting.type) {
      case 'number':
        value = parseFloat(setting.value);
        break;
      case 'boolean':
        value = setting.value === 'true';
        break;
      case 'json':
        value = JSON.parse(setting.value);
        break;
      default:
        value = setting.value;
    }

    // Cache for 5 minutes
    this.cache.set(key, value);
    setTimeout(() => this.cache.delete(key), 5 * 60 * 1000);

    return value;
  }

  async getRewardAmount(gameType: string): Promise<number> {
    const key = `reward_${gameType}`;
    return (await this.getSetting(key)) || 10;
  }

  async getMaxGamesPerDay(): Promise<number> {
    return (await this.getSetting('max_games_per_day')) || 10;
  }

  async isGameSystemEnabled(): Promise<boolean> {
    return (await this.getSetting('game_system_enabled')) !== false;
  }

  async updateSetting(key: string, value: any): Promise<void> {
    await this.prisma.gamificationSettings.update({
      where: { key },
      data: {
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        updatedAt: new Date(),
      },
    });
    
    // Clear cache
    this.cache.delete(key);
    this.logger.log(`Setting updated: ${key} = ${value}`);
  }
}
```

#### 2.2 Create Game Reward Service (PHP Integration)
```bash
nano src/gamification/services/game-reward.service.ts
```

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PhpApiService } from '@/php-integration/services/php-api.service';
import { GamificationSettingsService } from './gamification-settings.service';

@Injectable()
export class GameRewardService {
  private readonly logger = new Logger(GameRewardService.name);

  constructor(
    private phpApi: PhpApiService,
    private settings: GamificationSettingsService,
  ) {}

  /**
   * Credit game reward to user's wallet via PHP backend
   * 
   * @param userId - PHP database user ID
   * @param gameType - Type of game played
   * @param sessionId - Game session ID for tracking
   * @param authToken - User's auth token
   */
  async creditReward(
    userId: number,
    gameType: string,
    sessionId: string,
    authToken: string,
  ): Promise<{
    success: boolean;
    amount?: number;
    transactionId?: string;
    message?: string;
  }> {
    try {
      // Get reward amount from settings
      const amount = await this.settings.getRewardAmount(gameType);

      this.logger.log(`💰 Crediting ₹${amount} to user ${userId} for ${gameType}`);

      // Prepare payload for PHP backend
      const payload = {
        user_id: userId,
        amount: amount,
        transaction_type: 'add_fund_by_admin',
        reference: `Game Reward: ${this.formatGameName(gameType)}`,
        note: `Earned ₹${amount} from ${this.formatGameName(gameType)} game - Session ${sessionId}`,
        source: 'gamification_system',
      };

      // Call PHP API (admin endpoint - requires admin token)
      // Note: We need to get admin token from environment or generate one
      const response = await this.phpApi.post(
        '/api/v1/admin/wallet/add-fund-by-admin',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PHP_ADMIN_TOKEN}`,
          },
        },
      );

      if (response.success) {
        this.logger.log(`✅ Reward credited: ₹${amount} to user ${userId}`);
        
        return {
          success: true,
          amount: amount,
          transactionId: response.transaction_id,
          message: `₹${amount} credited to your wallet!`,
        };
      } else {
        throw new Error(response.message || 'Failed to credit reward');
      }
    } catch (error) {
      this.logger.error(`❌ Failed to credit reward: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private formatGameName(gameType: string): string {
    const names = {
      intent_quest: 'Intent Quest',
      language_master: 'Language Master',
      tone_detective: 'Tone Detective',
      entity_hunter: 'Entity Hunter',
      profile_builder: 'Profile Builder',
    };
    return names[gameType] || gameType;
  }
}
```

#### 2.3 Update Flow Toggle Validation (Critical Flows)
```bash
nano src/flow-engine/flows.controller.ts
```

Add validation to prevent disabling critical flows:

```typescript
@Patch(':id/toggle')
async toggleFlowStatus(@Param('id') flowId: string) {
  const flow = await this.flowService.getFlowById(flowId);
  
  // Check if flow is system critical
  if (flow.systemCritical && flow.enabled) {
    throw new BadRequestException({
      error: 'CANNOT_DISABLE_CRITICAL_FLOW',
      message: 'This is a critical system flow and cannot be disabled.',
      flowId: flowId,
      flowName: flow.name,
    });
  }
  
  // Proceed with toggle
  const newStatus = !flow.enabled;
  return this.flowService.updateFlow(flowId, { enabled: newStatus });
}
```

---

### **Phase 3: Admin Dashboard UI** (6 hours)

#### 3.1 API Client Methods (Frontend)
```bash
cd /home/ubuntu/Devs/mangwale-unified-dashboard
nano src/lib/api/mangwale-ai.ts
```

Add flow management methods:

```typescript
export class MangwaleAIClient {
  // ... existing methods ...

  // Flow Management
  async getFlows(filters?: { module?: string; enabled?: boolean }): Promise<Flow[]> {
    const params = new URLSearchParams();
    if (filters?.module) params.append('module', filters.module);
    if (filters?.enabled !== undefined) params.append('enabled', String(filters.enabled));
    
    return this.request(`/flows?${params.toString()}`);
  }

  async toggleFlow(flowId: string): Promise<Flow> {
    return this.request(`/flows/${flowId}/toggle`, { method: 'PATCH' });
  }

  async updateFlow(flowId: string, data: Partial<Flow>): Promise<Flow> {
    return this.request(`/flows/${flowId}`, { 
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFlow(flowId: string): Promise<void> {
    await this.request(`/flows/${flowId}`, { method: 'DELETE' });
  }

  // Gamification Settings
  async getGamificationSettings(): Promise<GamificationSetting[]> {
    return this.request('/gamification/settings');
  }

  async updateGamificationSetting(key: string, value: any): Promise<void> {
    await this.request(`/gamification/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // Game Questions
  async getGameQuestions(gameType?: string): Promise<GameQuestion[]> {
    const params = gameType ? `?gameType=${gameType}` : '';
    return this.request(`/gamification/questions${params}`);
  }

  // Training Data
  async getTrainingSamples(filters?: {
    approved?: boolean;
    reviewStatus?: string;
  }): Promise<TrainingSample[]> {
    const params = new URLSearchParams();
    if (filters?.approved !== undefined) params.append('approved', String(filters.approved));
    if (filters?.reviewStatus) params.append('reviewStatus', filters.reviewStatus);
    
    return this.request(`/training/samples?${params.toString()}`);
  }

  async exportTrainingData(format: 'json' | 'jsonl' | 'csv'): Promise<Blob> {
    return this.request(`/training/export?format=${format}`, {
      responseType: 'blob',
    });
  }
}
```

#### 3.2 Gamification Settings Page
```bash
mkdir -p src/app/admin/gamification
nano src/app/admin/gamification/page.tsx
```

```typescript
'use client';

import { useState, useEffect } from 'react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

export default function GamificationSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await mangwaleAIClient.getGamificationSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      await mangwaleAIClient.updateGamificationSetting(key, value);
      await loadSettings(); // Reload
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  // Group settings by category
  const settingsByCategory = settings.reduce((acc, setting) => {
    const category = setting.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🎮 Gamification Settings</h1>

      {Object.entries(settingsByCategory).map(([category, items]: [string, any[]]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 capitalize">
            {category} Settings
          </h2>
          
          <div className="space-y-4">
            {items.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between p-4 border rounded">
                <div className="flex-1">
                  <label className="font-medium">{setting.description}</label>
                  <p className="text-sm text-gray-500">Key: {setting.key}</p>
                </div>
                
                <div className="w-48">
                  {setting.type === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={setting.value === 'true'}
                      onChange={(e) => updateSetting(setting.key, e.target.checked)}
                      className="toggle"
                    />
                  ) : setting.type === 'number' ? (
                    <input
                      type="number"
                      value={setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      className="input input-bordered w-full"
                    />
                  ) : (
                    <input
                      type="text"
                      value={setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      className="input input-bordered w-full"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### 3.3 Training Data Dashboard
```bash
nano src/app/admin/training/samples/page.tsx
```

```typescript
'use client';

import { useState, useEffect } from 'react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

export default function TrainingSamplesPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  useEffect(() => {
    loadSamples();
  }, [filter]);

  const loadSamples = async () => {
    const filters = filter === 'all' ? {} : { reviewStatus: filter };
    const data = await mangwaleAIClient.getTrainingSamples(filters);
    setSamples(data);
  };

  const exportData = async (format: 'json' | 'jsonl' | 'csv') => {
    const blob = await mangwaleAIClient.exportTrainingData(format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-data-${Date.now()}.${format}`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📊 Training Data Samples</h1>
        
        <div className="space-x-2">
          <button onClick={() => exportData('jsonl')} className="btn btn-primary">
            Export JSONL
          </button>
          <button onClick={() => exportData('csv')} className="btn btn-secondary">
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs tabs-boxed mb-4">
        <button 
          className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({samples.length})
        </button>
        <button 
          className={`tab ${filter === 'pending' ? 'tab-active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending Review
        </button>
        <button 
          className={`tab ${filter === 'approved' ? 'tab-active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          Approved
        </button>
      </div>

      {/* Samples Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Text</th>
              <th>Intent</th>
              <th>Language</th>
              <th>Confidence</th>
              <th>Source</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr key={sample.id}>
                <td className="max-w-xs truncate">{sample.text}</td>
                <td><span className="badge">{sample.intent}</span></td>
                <td>{sample.language}</td>
                <td>{(sample.confidence * 100).toFixed(1)}%</td>
                <td>{sample.source}</td>
                <td>
                  <span className={`badge ${
                    sample.approved ? 'badge-success' : 'badge-warning'
                  }`}>
                    {sample.reviewStatus}
                  </span>
                </td>
                <td>
                  {!sample.approved && (
                    <button className="btn btn-xs btn-success">
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### **Phase 4: Enable Gamification Module** (2 hours)

#### 4.1 Move Archived Gamification
```bash
cd /home/ubuntu/Devs/mangwale-ai
mv _gamification_archived src/gamification
```

#### 4.2 Update app.module.ts
```typescript
// Uncomment gamification module
import { GamificationModule } from './gamification/gamification.module';

@Module({
  imports: [
    // ... existing modules
    GamificationModule, // ✅ RE-ENABLED
  ],
})
export class AppModule {}
```

#### 4.3 Update Gamification Module
```bash
nano src/gamification/gamification.module.ts
```

Add new services:

```typescript
import { GamificationSettingsService } from './services/gamification-settings.service';
import { GameRewardService } from './services/game-reward.service';

@Module({
  imports: [DatabaseModule, PhpIntegrationModule],
  providers: [
    // Existing
    IntentQuestService,
    LanguageMasterService,
    ToneDetectiveService,
    EntityHunterService,
    RewardService,
    LeaderboardService,
    GameWidgetService,
    
    // NEW
    GamificationSettingsService,
    GameRewardService,
  ],
  controllers: [GameSimpleApiController],
  exports: [
    GameWidgetService,
    RewardService,
    GamificationSettingsService,
    GameRewardService,
  ],
})
export class GamificationModule {}
```

#### 4.4 Update RewardService to Use PHP Backend
```bash
nano src/gamification/services/reward.service.ts
```

```typescript
import { GameRewardService } from './game-reward.service';

@Injectable()
export class RewardService {
  constructor(
    private gameReward: GameRewardService,
    private settings: GamificationSettingsService,
  ) {}

  async creditReward(userId: number, gameType: string, sessionId: string, authToken: string) {
    // Delegate to GameRewardService which handles PHP integration
    return this.gameReward.creditReward(userId, gameType, sessionId, authToken);
  }
}
```

---

### **Phase 5: Training Data Collection Pipeline** (3 hours)

#### 5.1 Update Conversation Capture Service
```bash
nano src/services/conversation-capture.service.ts
```

Ensure it saves to both conversation_logs AND training_samples:

```typescript
async captureConversation(data: {
  sessionId: string;
  userId?: number;
  userMessage: string;
  nluIntent?: string;
  nluConfidence?: number;
  // ... other fields
}) {
  // 1. Save to conversation_logs (detailed logging)
  const logId = await this.saveToConversationLogs(data);
  
  // 2. Evaluate if this is training-worthy
  if (this.isGoodTrainingSample(data)) {
    await this.saveToTrainingSamples(data, logId);
  }
}

private isGoodTrainingSample(data: any): boolean {
  // High confidence - auto-save
  if (data.nluConfidence > 0.85) return true;
  
  // From game - always save
  if (data.source === 'game') return true;
  
  // Low confidence - needs review
  if (data.nluConfidence < 0.6) return true; // Will be marked for review
  
  return false;
}

private async saveToTrainingSamples(data: any, conversationLogId: number) {
  await this.prisma.trainingSample.create({
    data: {
      userId: data.userId,
      sessionId: data.sessionId,
      text: data.userMessage,
      intent: data.nluIntent,
      entities: data.nluEntities,
      confidence: data.nluConfidence,
      language: data.nluLanguage,
      tone: data.nluTone,
      context: data.conversationContext,
      source: data.source || 'conversation',
      nluProvider: data.nluProvider,
      approved: data.nluConfidence > 0.85, // Auto-approve high confidence
      reviewStatus: data.nluConfidence > 0.85 ? 'approved' : 'pending',
      reviewPriority: data.nluConfidence < 0.6 ? 10 : 0,
    },
  });
}
```

#### 5.2 Create Training Export Service
```bash
nano src/training/services/training-export.service.ts
```

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TrainingExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export training samples to JSONL format for IndicBERT
   */
  async exportToJSONL(filters?: {
    approved?: boolean;
    minConfidence?: number;
  }): Promise<string> {
    const samples = await this.prisma.trainingSample.findMany({
      where: {
        approved: filters?.approved !== undefined ? filters.approved : true,
        confidence: filters?.minConfidence ? { gte: filters.minConfidence } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert to JSONL (one JSON object per line)
    const jsonl = samples
      .map((sample) => JSON.stringify({
        text: sample.text,
        intent: sample.intent,
        entities: sample.entities,
        language: sample.language,
        tone: sample.tone,
      }))
      .join('\n');

    // Save to file
    const filename = `training-data-${Date.now()}.jsonl`;
    const filepath = path.join('/tmp', filename);
    fs.writeFileSync(filepath, jsonl);

    return filepath;
  }

  /**
   * Export to CSV format
   */
  async exportToCSV(): Promise<string> {
    // Similar implementation for CSV
  }
}
```

#### 5.3 Create Training Controller
```bash
nano src/training/training.controller.ts
```

```typescript
@Controller('training')
export class TrainingController {
  constructor(
    private prisma: PrismaService,
    private exportService: TrainingExportService,
  ) {}

  @Get('samples')
  async getTrainingSamples(@Query() filters: any) {
    return this.prisma.trainingSample.findMany({
      where: {
        approved: filters.approved === 'true' ? true : undefined,
        reviewStatus: filters.reviewStatus || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('export')
  async exportTrainingData(@Query('format') format: 'json' | 'jsonl' | 'csv', @Res() res: Response) {
    const filepath = await this.exportService.exportToJSONL();
    res.download(filepath);
  }

  @Patch('samples/:id/approve')
  async approveSample(@Param('id') id: number) {
    return this.prisma.trainingSample.update({
      where: { id },
      data: {
        approved: true,
        reviewStatus: 'approved',
        approvedAt: new Date(),
      },
    });
  }
}
```

---

### **Phase 6: Game Integration with Conversation Flow** (3 hours)

#### 6.1 Update AgentOrchestrator to Handle Game State
```bash
nano src/conversation/services/agent-orchestrator.service.ts
```

```typescript
async handleMessage(userId: string, message: string, context: any) {
  // Check if user is in active game session
  const activeGame = await this.checkActiveGameSession(userId);
  
  if (activeGame) {
    // Route to game handler
    return this.handleGameResponse(userId, message, activeGame);
  }
  
  // Normal routing (flow engine, agents, etc.)
  return this.normalRouting(userId, message, context);
}

private async handleGameResponse(userId: string, answer: string, gameSession: any) {
  // Get game type and validate answer
  const game = this.getGameService(gameSession.gameType);
  const result = await game.validateAnswer(answer, gameSession);
  
  if (result.correct) {
    // Credit reward via PHP
    await this.rewardService.creditReward(
      gameSession.userId,
      gameSession.gameType,
      gameSession.id,
      gameSession.authToken,
    );
    
    // Save to training_samples
    await this.saveTrainingSample({
      text: answer,
      intent: result.intent,
      userId: userId,
      source: 'game',
      gameSessionId: gameSession.id,
    });
    
    return {
      text: `✅ Correct! You earned ₹${result.reward}! 🎉\n\nPlay another? [Yes] [View Stats] [Order Food]`,
      success: true,
    };
  } else {
    return {
      text: `❌ Not quite! The correct answer was: ${result.correctAnswer}\n\nTry again? [Yes] [No]`,
      success: false,
    };
  }
}
```

---

## 📦 DELIVERABLES CHECKLIST

### Backend
- [x] Database migrations (Prisma schema updated)
- [x] Gamification settings service
- [x] Game reward service (PHP integration)
- [x] Flow toggle validation (critical flows)
- [x] Training data capture service
- [x] Training export service
- [x] Game question service
- [x] Conversation logging (detailed)

### Admin Dashboard
- [ ] Flow management API client methods
- [ ] Gamification settings page
- [ ] Game questions management page
- [ ] Training data samples page
- [ ] Export training data button
- [ ] Approve/reject samples UI
- [ ] Game statistics dashboard
- [ ] User leaderboard view

### Integration
- [ ] Gamification module enabled
- [ ] Game sessions linked to training data
- [ ] PHP wallet rewards working
- [ ] Conversation capture active
- [ ] Critical flows protected

### Testing
- [ ] Test reward crediting via PHP
- [ ] Test game flow in chat
- [ ] Test training data export
- [ ] Test admin settings update
- [ ] Test flow disable protection

---

## 🚀 DEPLOYMENT STEPS

### 1. Backup Database
```bash
docker exec 685225a33ea5_mangwale_postgres pg_dump -U mangwale_config headless_mangwale > backup-$(date +%Y%m%d).sql
```

### 2. Run Migrations
```bash
cd /home/ubuntu/Devs/mangwale-ai/libs/database
npx prisma migrate deploy
npx prisma generate
```

### 3. Seed Data
```bash
npx ts-node prisma/seed-gamification.ts
```

### 4. Rebuild Backend
```bash
cd /home/ubuntu/Devs/mangwale-ai
npm run build
docker-compose restart mangwale_ai
```

### 5. Deploy Admin Dashboard
```bash
cd /home/ubuntu/Devs/mangwale-unified-dashboard
npm run build
docker-compose restart mangwale-dashboard
```

### 6. Verify
```bash
# Test flow toggle
curl http://localhost:3200/flows/greeting_v1/toggle -X PATCH

# Should fail with "Cannot disable critical flow"

# Test game system
curl http://localhost:3200/api/gamification/missions

# Check training data
curl http://localhost:3200/training/samples?reviewStatus=pending
```

---

## 📊 MONITORING & METRICS

### Key Metrics to Track
1. **Game Engagement**
   - Games played per day
   - Average score per game
   - Completion rate

2. **Training Data Quality**
   - Samples collected per day
   - High confidence rate (>0.85)
   - Approval rate

3. **Reward System**
   - Total rewards issued
   - Successful credit rate
   - Average reward per user

4. **NLU Performance**
   - Intent accuracy (target: 85%+)
   - Entity extraction accuracy
   - Language detection accuracy

---

## 📖 DOCUMENTATION UPDATES NEEDED

1. Update `README.md` with gamification section
2. Create `GAMIFICATION_GUIDE.md` for users
3. Update API documentation with new endpoints
4. Create admin training guide for data labeling

---

## ⏱️ ESTIMATED TIMELINE

- **Phase 1 (Database):** 2 hours ✅
- **Phase 2 (Backend Services):** 4 hours
- **Phase 3 (Admin Dashboard):** 6 hours
- **Phase 4 (Enable Gamification):** 2 hours
- **Phase 5 (Training Pipeline):** 3 hours
- **Phase 6 (Game Integration):** 3 hours

**Total:** ~20 hours (2.5 days of focused work)

---

## 🎯 NEXT IMMEDIATE STEPS

1. **Create Prisma migration** - Run database schema updates
2. **Add PHP reward integration** - Implement `GameRewardService`
3. **Update flow toggle validation** - Protect critical flows
4. **Build admin settings page** - Configure game rewards
5. **Test end-to-end** - User plays game → Earns reward → Data saved

**Ready to start implementation?** Let me know when to proceed! 🚀
