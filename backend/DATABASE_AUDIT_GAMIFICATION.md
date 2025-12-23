# 🔍 Database Audit - Gamification System Implementation

**Date:** November 20, 2025  
**Purpose:** Analyze existing tables before adding new gamification tables

---

## 📊 EXISTING TABLES ANALYSIS

### Core Tables (Currently in Use)

#### 1. **users** table ✅ ACTIVE
```sql
Columns:
- id (PK)
- php_user_id (UNIQUE) - Links to PHP backend users
- phone (UNIQUE)
- email
- first_name, last_name
- preferred_language (default: 'en')
- preferences (jsonb)
- interests (jsonb)
- total_games_played (default: 0) ⭐ Already tracking games!
- total_rewards_earned (decimal 10,2, default: 0) ⭐ Already tracking rewards!
- loyalty_points (default: 0) ⭐ Already exists!
- created_at, updated_at, last_active_at

Row count: 0 (empty - no users yet)

Used by:
- src/personalization/user-profiling.service.ts
- Relations: ConversationMemory[], GameSession[]
```

**✅ DECISION:** REUSE this table - already has gamification fields!

---

#### 2. **flows** table ✅ ACTIVE
```sql
Columns:
- id (text, PK)
- name
- description
- module (default: 'general')
- trigger
- version (default: '1.0.0')
- states (jsonb)
- initialState
- finalStates (jsonb)
- contextSchema (jsonb)
- metadata (jsonb)
- enabled (boolean, default: true) ⭐ Already has enable/disable!
- status (default: 'active')
- created_at, updated_at

Row count: 9 flows
Missing: system_critical column (need to add)

Used by:
- src/flow-engine/ services
- Admin dashboard flow management UI
```

**✅ DECISION:** ALTER table to add `system_critical BOOLEAN DEFAULT FALSE`

---

#### 3. **game_sessions** table ✅ ACTIVE
```sql
Columns:
- id (PK)
- session_id (varchar 100, NOT NULL)
- user_id (integer, NOT NULL)
- game_type (varchar 50, NOT NULL)
- difficulty (varchar 20, default: 'medium')
- language (varchar 10, default: 'en')
- mission_id (varchar 100)
- mission_data (jsonb)
- status (varchar 20, default: 'active')
- score (integer, default: 0)
- completion_time_seconds (integer)
- rewards_earned (jsonb)
- started_at (timestamp, default: CURRENT_TIMESTAMP)
- completed_at (timestamp)
- updated_at (timestamp, default: CURRENT_TIMESTAMP)

Row count: 0 (empty)

Used by:
- _gamification_archived/ (currently disabled)
- Prisma model: GameSession
```

**✅ DECISION:** ALTER table to add:
- `training_sample_id` (foreign key to training_samples)
- `conversation_log_id` (foreign key to conversation_logs)
- `reward_transaction_id` (varchar 100) - Link to PHP wallet_transactions
- `reward_status` (varchar 20, default: 'pending') - 'pending', 'credited', 'failed'

---

#### 4. **conversation_memory** table ✅ ACTIVE
```sql
Columns:
- id (PK)
- user_id (integer, NOT NULL)
- role (varchar 10) - 'user' or 'assistant'
- content (text, NOT NULL)
- turn_number (integer)
- session_id (varchar 100)
- created_at (timestamp, default: CURRENT_TIMESTAMP)

Indexes:
- idx_conversation_memory_session
- idx_conversation_memory_user_id

Row count: 0 (empty)

Used by:
- src/personalization/user-profiling.service.ts
- Stores conversation history for context
```

**✅ DECISION:** KEEP AS IS - good for conversation history, but we need separate `conversation_logs` table for detailed analytics

**Why separate?**
- conversation_memory = Simple turn-by-turn storage (lightweight)
- conversation_logs = Full NLU analysis, routing data, training metadata (heavy)

---

#### 5. **flow_runs** table ✅ ACTIVE
```sql
Columns:
- id (uuid, PK)
- flow_id (references flows)
- session_id
- phone_number
- current_state
- context (jsonb, default: '{}')
- status (default: 'active')
- error
- started_at, completed_at, updated_at

Row count: 106 runs

Used by:
- src/flow-engine/ - Tracks active flow executions
```

**✅ DECISION:** KEEP AS IS - no changes needed

---

### Training-Related Tables

#### 6. **ml_mlbackendtrainjob** table (Label Studio)
```sql
Columns:
- id (PK)
- job_id (varchar 128, NOT NULL)
- model_version (text)
- created_at, updated_at
- ml_backend_id (integer, NOT NULL)

Purpose: Label Studio integration for model training
Used by: Admin backend (port 3002) - NLU training service
```

**✅ DECISION:** KEEP AS IS - used by Label Studio, not our game system

---

### Tables We DON'T Need to Worry About

**Django/Label Studio Tables (67 tables):**
- auth_*, django_*, htx_*, io_storages_*, labels_*, ml_*, organization*, prediction*, project*, task*, webhook*
- **Purpose:** Label Studio admin interface, user management, data labeling
- **Used by:** Admin backend (port 3002) for NLU training UI
- **Action:** IGNORE - completely separate system

---

## 🆕 NEW TABLES NEEDED

### 1. **gamification_settings** ⭐ NEW
**Purpose:** Store all configurable game/reward settings (no hardcoded values)

**Why new table?**
- Could use environment variables, but user requirement: "database-driven"
- Need admin UI to modify settings without code deployment
- Settings should persist and be auditable

**Schema:**
```sql
CREATE TABLE gamification_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'number', 'boolean', 'json', 'string'
  description TEXT,
  category VARCHAR(50), -- 'rewards', 'limits', 'gameplay', 'training'
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100)
);
```

---

### 2. **game_questions** ⭐ NEW
**Purpose:** Question bank for games (mix of personalized + general)

**Why new table?**
- Currently questions are HARDCODED in game-simple-api.controller.ts
- Need database storage for admin to add/edit questions
- Track usage stats and success rates

**Schema:**
```sql
CREATE TABLE game_questions (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  question_context TEXT,
  correct_answer TEXT NOT NULL,
  answer_options JSONB,
  difficulty VARCHAR(20) DEFAULT 'medium',
  reward_amount DECIMAL(10,2), -- Can override default
  context_required BOOLEAN DEFAULT FALSE, -- Needs user conversation?
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  enabled BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,4)
);
```

---

### 3. **training_samples** ⭐ NEW
**Purpose:** High-quality training data for IndicBERT

**Why new table? (vs using conversation_memory)**
- conversation_memory = Raw conversation storage (simple)
- training_samples = Labeled, verified, training-ready data (structured)
- Need confidence scores, approval status, entity extraction
- Need to track which samples used in which training batches

**Schema:**
```sql
CREATE TABLE training_samples (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  session_id VARCHAR(100),
  game_session_id VARCHAR(100), -- Link to game
  
  -- Training data
  text TEXT NOT NULL,
  intent VARCHAR(100) NOT NULL,
  entities JSONB,
  confidence DECIMAL(5,4),
  language VARCHAR(10),
  tone VARCHAR(50),
  context JSONB,
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'game', -- 'game', 'conversation', 'manual'
  nlu_provider VARCHAR(50),
  
  -- Quality control
  approved BOOLEAN DEFAULT FALSE,
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  review_status VARCHAR(20) DEFAULT 'pending',
  review_priority INTEGER DEFAULT 0,
  
  -- Training tracking
  used_in_training BOOLEAN DEFAULT FALSE,
  training_batch_id VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. **conversation_logs** ⭐ NEW
**Purpose:** Detailed conversation analytics with full NLU breakdown

**Why new table? (vs using conversation_memory)**
- conversation_memory = Lightweight conversation history (6 columns)
- conversation_logs = Full analytics and debugging data (25+ columns)
- Need routing decisions, processing times, alternate intents, confidence buckets
- Used for system monitoring, debugging, training data identification

**Schema:**
```sql
CREATE TABLE conversation_logs (
  id SERIAL PRIMARY KEY,
  
  -- Session
  user_id INTEGER,
  session_id VARCHAR(100) NOT NULL,
  phone_number VARCHAR(50),
  channel VARCHAR(50) DEFAULT 'web',
  
  -- Message
  user_message TEXT NOT NULL,
  bot_response TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  
  -- NLU Analysis (DETAILED)
  nlu_intent VARCHAR(100),
  nlu_confidence DECIMAL(5,4),
  nlu_alternate_intents JSONB, -- All intents with scores
  nlu_entities JSONB,
  nlu_language VARCHAR(10),
  nlu_tone VARCHAR(50),
  nlu_provider VARCHAR(50),
  nlu_processing_time_ms INTEGER,
  
  -- Routing
  routed_to VARCHAR(100), -- 'agent', 'flow', 'direct_api'
  routing_reason TEXT,
  flow_id VARCHAR(100),
  agent_id VARCHAR(100),
  
  -- Response
  response_type VARCHAR(50),
  response_success BOOLEAN DEFAULT TRUE,
  response_time_ms INTEGER,
  
  -- Context
  conversation_context JSONB,
  turn_number INTEGER,
  
  -- Training
  is_training_candidate BOOLEAN DEFAULT FALSE,
  training_confidence_bucket VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Relationship with conversation_memory:**
- conversation_memory: Keep for quick conversation context retrieval
- conversation_logs: Use for analytics, debugging, training data mining

---

## 📋 MIGRATION PLAN

### Phase 1: Alter Existing Tables

```sql
-- 1. Add system_critical to flows table
ALTER TABLE flows ADD COLUMN system_critical BOOLEAN DEFAULT FALSE;

-- Mark critical flows
UPDATE flows SET system_critical = TRUE 
WHERE id IN ('greeting_v1', 'help_v1', 'farewell_v1');

-- 2. Add columns to game_sessions table
ALTER TABLE game_sessions 
  ADD COLUMN training_sample_id INTEGER,
  ADD COLUMN conversation_log_id INTEGER,
  ADD COLUMN reward_transaction_id VARCHAR(100),
  ADD COLUMN reward_status VARCHAR(20) DEFAULT 'pending';
```

### Phase 2: Create New Tables

```sql
-- Create gamification_settings
-- Create game_questions
-- Create training_samples
-- Create conversation_logs

-- (Full SQL in Prisma migration)
```

### Phase 3: Seed Initial Data

```sql
-- Insert gamification_settings
-- Insert game_questions
-- Mark critical flows
```

---

## ✅ SUMMARY OF DECISIONS

| Table | Action | Reason |
|-------|--------|--------|
| users | ✅ REUSE | Already has gamification fields! |
| flows | ✅ ALTER | Add system_critical column |
| game_sessions | ✅ ALTER | Add reward tracking columns |
| conversation_memory | ✅ KEEP | Simple conversation history |
| flow_runs | ✅ KEEP | No changes needed |
| ml_mlbackendtrainjob | ✅ IGNORE | Label Studio only |
| Django tables (67) | ✅ IGNORE | Label Studio UI |
| **gamification_settings** | 🆕 CREATE | Config storage |
| **game_questions** | 🆕 CREATE | Question bank |
| **training_samples** | 🆕 CREATE | Labeled training data |
| **conversation_logs** | 🆕 CREATE | Detailed analytics |

---

## 🎯 NEXT STEPS

1. ✅ Create Prisma schema updates
2. ✅ Generate migration file
3. ✅ Run migration on database
4. ✅ Seed initial data
5. ✅ Update TypeScript services

**Ready to proceed with Prisma migration!** 🚀
