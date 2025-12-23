# Gamification System - Complete Flow Documentation

## 🎮 System Overview

The Mangwale.AI Gamification System is a fully functional game-based data collection platform that:
- Provides 4 engaging game types for users to play
- Collects high-quality training data for AI/NLU improvement
- Rewards users with points and wallet credits
- Manages game sessions, progress tracking, and analytics

**Status**: ✅ **FULLY IMPLEMENTED & TESTED** (Phase 6 Complete)

---

## 📊 Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│           Layer 1: REST API (GameController)        │
│  POST /games/start  POST /games/answer  GET /stats  │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│      Layer 2: Orchestrator (GameOrchestratorService)│
│       Coordinates game flow & business logic        │
└─────────────────────┬───────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│  Layer 3: Game Logic │  │ Layer 3: Session Mgmt│
│  - IntentQuest       │  │  GameSessionService  │
│  - LanguageMaster    │  │                      │
│  - ToneDetective     │  │  - Track progress    │
│  - ProfileBuilder    │  │  - Store questions   │
└──────────┬───────────┘  └──────────┬───────────┘
           │                         │
           ▼                         ▼
┌─────────────────────────────────────────────────────┐
│        Layer 4: Support Services                    │
│  TrainingSample  GameReward  ConversationLogging    │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│       Layer 5: Data Persistence (PostgreSQL)        │
│  game_sessions  game_questions  training_samples    │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Complete Game Flow (Step-by-Step)

### Step 1: User Starts Game

**API Request**:
```bash
POST /api/gamification/games/start
Content-Type: application/json

{
  "userId": 12345,
  "gameType": "intent_quest",  # or language_master, tone_detective, profile_builder
  "language": "en",
  "difficulty": "medium"
}
```

**What Happens**:
1. `GameController.startGame()` receives request
2. Validates gameType (must be one of 4 supported types)
3. Calls `GameOrchestratorService.startGame()`
4. Orchestrator routes to specific game service:
   - `IntentQuestService.getQuestions()` for intent_quest
   - `LanguageMasterService.getQuestions()` for language_master
   - `ToneDetectiveService.getQuestions()` for tone_detective
   - `ProfileBuilderService.getQuestions()` for profile_builder

**Game Service Logic**:
```typescript
// Example: IntentQuestService.getQuestions()
async getQuestions(language: string, difficulty: string, count: number) {
  // 1. Query database for questions
  const questions = await this.prisma.gameQuestion.findMany({
    where: {
      gameType: 'intent_quest',
      difficulty: difficulty,
      enabled: true,
    },
    take: count,
    orderBy: { id: 'asc' },  // Random in production
  });

  // 2. Format for game play
  return questions.map(q => ({
    id: q.id,
    text: q.questionText,
    correctIntent: q.correctAnswer,
    options: q.answerOptions,  // JSON array of 4 choices
    rewardPoints: q.rewardAmount,
    category: q.category,
    difficulty: q.difficulty,
  }));
}
```

5. **Session Creation**: `GameSessionService.startSession()` stores:
```typescript
{
  sessionId: 'game_1763719350336_20xid2dib',  // Unique ID
  userId: 12345,
  gameType: 'intent_quest',
  language: 'en',
  difficulty: 'medium',
  status: 'active',
  currentRound: 1,
  totalRounds: 5,
  score: 0,
  missionData: {  // JSON field storing all questions
    questions: [
      {
        id: 1,
        text: "User says: 'मुझे पिज़्ज़ा चाहिए'",
        correctAnswer: 'order_food',
        options: ['order_food', 'search_product', 'cancel_order', 'track_parcel'],
        reward: 3,
        category: 'food_ordering'
      },
      // ... 4 more questions
    ]
  },
  startedAt: '2025-11-21T10:00:00Z'
}
```

**API Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "game_1763719350336_20xid2dib",
    "question": {
      "text": "User says: 'मुझे पिज़्ज़ा चाहिए'\n\nWhat's the user's intent?",
      "options": ["order_food", "search_product", "cancel_order", "track_parcel"]
    },
    "progress": {
      "currentRound": 1,
      "totalRounds": 5,
      "score": 0
    }
  }
}
```

---

### Step 2: User Submits Answer

**API Request**:
```bash
POST /api/gamification/games/answer
Content-Type: application/json

{
  "sessionId": "game_1763719350336_20xid2dib",
  "answer": "order_food",
  "timeSpent": 5000  # milliseconds
}
```

**What Happens**:
1. `GameController.submitAnswer()` receives request
2. Calls `GameOrchestratorService.processAnswer()`
3. **Session Retrieval**:
```typescript
const session = await this.sessionService.getSessionById(sessionId);
// Critical: Uses sessionId (unique key), not userId
```

4. **Get Current Question**:
```typescript
const questions = session.missionData.questions;
const currentQuestion = questions[session.currentRound - 1];
```

5. **Field Mapping** (Critical for validation):
```typescript
// Database stores correctAnswer, but services expect specific field names
private mapQuestionFields(question: any, gameType: string) {
  if (gameType === 'intent_quest') {
    return { ...question, correctIntent: question.correctAnswer };
  } else if (gameType === 'language_master') {
    return { ...question, correctLanguage: question.correctAnswer };
  } else if (gameType === 'tone_detective') {
    return { ...question, correctTone: question.correctAnswer };
  }
  return question;
}

const mappedQuestion = this.mapQuestionFields(currentQuestion, session.gameType);
```

6. **Answer Validation** (Game Service):
```typescript
// Route to correct game service
let result;
if (session.gameType === 'intent_quest') {
  result = await this.intentQuest.validateAnswer(mappedQuestion, userAnswer);
} else if (session.gameType === 'language_master') {
  result = await this.languageMaster.validateAnswer(mappedQuestion, userAnswer);
}
// ... etc

// Example: IntentQuestService.validateAnswer()
async validateAnswer(question: any, userAnswer: string) {
  const isCorrect = userAnswer.toLowerCase() === question.correctIntent.toLowerCase();
  
  return {
    correct: isCorrect,
    feedback: isCorrect 
      ? '🎉 Correct! You identified the intent perfectly.'
      : `❌ Incorrect. The correct intent was: ${question.correctIntent}`,
    score: isCorrect ? question.rewardPoints : 0,
    correctAnswer: question.correctIntent,
    explanation: `Users saying "${question.text}" typically mean "${question.correctIntent}"`
  };
}
```

7. **Score Update**:
```typescript
const newScore = session.score + result.score;
await this.sessionService.updateSession(sessionId, {
  score: newScore,
  currentRound: session.currentRound + 1,
});
```

8. **Training Sample Creation** (Critical for AI):
```typescript
await this.saveTrainingSample(
  session.userId,
  session.gameType,
  sessionId,
  currentQuestion,
  userAnswer,
  result
);

// saveTrainingSample() method
private async saveTrainingSample(...) {
  const sampleData = {
    userId: session.userId,
    sessionId: sessionId,
    gameSessionId: sessionId,
    text: userAnswer,  // What user answered
    intent: result.correctAnswer,  // Correct classification
    confidence: result.correct ? 1.0 : 0.0,
    source: 'game',
    context: {  // JSON field with metadata
      gameType: 'intent_quest',
      questionId: 1,
      questionText: "User says: 'मुझे पिज़्ज़ा चाहिए'",
      userAnswer: 'order_food',
      correct: true
    },
    reviewStatus: 'pending',
    approved: false
  };

  // Stored in training_samples table
  await this.trainingSample.createTrainingSample(sampleData);
}
```

**Training Sample Record in Database**:
```sql
SELECT * FROM training_samples WHERE id = 1;

id: 1
text: 'order_food'
intent: 'order_food'
confidence: 1.0
language: 'en'
tone: 'neutral'
context: '{"gameType":"intent_quest","questionId":1,"correct":true}'
user_id: 12345
session_id: 'game_1763719350336_20xid2dib'
game_session_id: 'game_1763719350336_20xid2dib'
source: 'game'
review_status: 'pending'
approved: false
created_at: '2025-11-21T10:00:15Z'
```

9. **Check if Game Complete**:
```typescript
const isComplete = session.currentRound >= session.totalRounds;

if (isComplete) {
  await this.sessionService.updateSession(sessionId, {
    status: 'completed',
    completedAt: new Date(),
  });
  
  // Credit reward to user's wallet
  await this.rewardService.creditGameReward(
    session.userId,
    session.gameType,
    session.score
  );
}
```

**API Response (Mid-Game)**:
```json
{
  "success": true,
  "data": {
    "correct": true,
    "feedback": "🎉 Correct! You identified the intent perfectly.",
    "score": 3,
    "totalScore": 3,
    "nextQuestion": {
      "text": "User says: 'Cancel my parcel delivery'\n\nWhat's the intent?",
      "options": ["order_food", "cancel_parcel", "search_product", "track_parcel"]
    },
    "progress": {
      "currentRound": 2,
      "totalRounds": 5,
      "score": 3
    }
  }
}
```

**API Response (Game Complete)**:
```json
{
  "success": true,
  "data": {
    "correct": false,
    "feedback": "❌ Incorrect. The correct intent was: track_parcel",
    "score": 0,
    "totalScore": 12,
    "gameComplete": true,
    "finalStats": {
      "totalScore": 12,
      "correctAnswers": 4,
      "incorrectAnswers": 1,
      "reward": "₹12",
      "message": "🎉 Congratulations! You completed Intent Quest with 12 points!"
    }
  }
}
```

---

### Step 3: Training Data Usage

**How Training Samples Are Used**:

1. **Admin Review**:
   - Admin visits `/admin/gamification/training-samples`
   - Reviews pending samples: `SELECT * FROM training_samples WHERE review_status = 'pending'`
   - Approves/rejects: `UPDATE training_samples SET approved = true, review_status = 'approved' WHERE id = ?`

2. **AI Training Pipeline**:
```typescript
// Export approved samples for IndicBERT fine-tuning
const approvedSamples = await prisma.trainingSample.findMany({
  where: { approved: true, reviewStatus: 'approved' },
  select: { text, intent, entities, language, tone }
});

// Format for IndicBERT
const trainingData = approvedSamples.map(s => ({
  text: s.text,
  label: s.intent,
  metadata: { language: s.language, tone: s.tone }
}));

// Save to JSONL for training
fs.writeFileSync('training_data.jsonl', 
  trainingData.map(d => JSON.stringify(d)).join('\n')
);
```

3. **NLU Classification Improvement**:
   - Training data used to fine-tune IndicBERT model
   - Model deployed to Admin Backend (port 3002)
   - Conversation AI uses improved model for better intent detection
   - Better intent detection → Better user experience → More orders

---

## 🎮 4 Game Types in Detail

### 1. Intent Quest 🎯

**Purpose**: Train users to recognize user intents from messages

**Sample Questions** (20 in database):
```
Question: "मुझे पिज़्ज़ा चाहिए"
Correct Answer: order_food
Options: [order_food, search_product, cancel_order, track_parcel]

Question: "Cancel my parcel delivery"
Correct Answer: cancel_parcel
Options: [order_food, cancel_parcel, search_product, track_parcel]

Question: "My food never arrived, this is frustrating!"
Correct Answer: complaint
Options: [complaint, refund_request, help, greeting]
```

**Reward**: ₹3 per correct answer (₹15 for perfect game)

**Training Value**: HIGH - Direct NLU intent classification data

---

### 2. Language Master 🌍

**Purpose**: Train language detection for multilingual support

**Sample Questions** (15 in database):
```
Question: "Hello, I need help with my order"
Correct Answer: english

Question: "मुझे मदद चाहिए"
Correct Answer: hindi

Question: "मला हे उत्पादन पाहिजे"
Correct Answer: marathi

Question: "Hi, mujhe pizza chahiye please"
Correct Answer: mixed (code-switching)
```

**Reward**: ₹3 per correct answer (₹15 for perfect game)

**Training Value**: HIGH - Multilingual NLU improvement

---

### 3. Tone Detective 😊

**Purpose**: Train emotion/tone detection for better response handling

**Sample Questions** (15 in database):
```
Question: "Yay! My order arrived early! Thank you so much! 😊"
Correct Answer: happy

Question: "This is the third time I'm calling! Still no response!"
Correct Answer: frustrated

Question: "I need this delivered ASAP, it's urgent"
Correct Answer: urgent

Question: "Could you please help me with my delivery address?"
Correct Answer: polite
```

**Reward**: ₹3 per correct answer (₹15 for perfect game)

**Training Value**: MEDIUM - Improves response tone matching

---

### 4. Profile Builder 📝

**Purpose**: Collect user preferences for personalization

**Sample Questions** (12 in database):
```
Question: "Do you prefer vegetarian food?"
Options: [Yes, No]

Question: "Do you order food more during weekends?"
Options: [Yes, No]

Question: "Would you like notifications about new restaurants?"
Options: [Yes, No]
```

**Reward**: ₹1 per answer (₹12 for all questions)

**Training Value**: LOW - Personalization data, not NLU

---

## 📊 Data Collection Stats (Current)

```bash
# Check training samples created
curl http://localhost:3200/api/gamification/training-samples/stats

Response:
{
  "total": 15,
  "pending": 14,
  "approved": 1,
  "rejected": 0,
  "autoApproved": 1
}

# View sample breakdown
curl http://localhost:3200/api/gamification/training-samples?limit=10

[
  {
    "id": 10,
    "text": "ढूंढो मेरे पास के रेस्टोरेंट",
    "intent": "search_product",
    "confidence": 0.0,
    "language": "en",
    "reviewStatus": "pending",
    "context": {
      "gameType": "intent_quest",
      "questionId": 3,
      "correct": false
    }
  },
  // ... more samples
]
```

---

## 🗄️ Database Schema

### game_sessions Table
```sql
CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  game_type VARCHAR(50) NOT NULL,
  language VARCHAR(10),
  difficulty VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 5,
  score DECIMAL(10,2) DEFAULT 0,
  mission_data JSONB,  -- Stores all questions
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_session ON game_sessions(session_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
```

### game_questions Table
```sql
CREATE TABLE game_questions (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer VARCHAR(200) NOT NULL,
  answer_options JSONB,  -- Array of 4 choices
  difficulty VARCHAR(20) DEFAULT 'medium',
  reward_amount DECIMAL(10,2) DEFAULT 3.00,
  category VARCHAR(100),
  tags TEXT[],
  context_required BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Current data: 72 questions
SELECT game_type, COUNT(*) FROM game_questions GROUP BY game_type;
/*
intent_quest      | 20
language_master   | 15
tone_detective    | 15
profile_builder   | 12
mixed             | 10
*/
```

### training_samples Table
```sql
CREATE TABLE training_samples (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  intent VARCHAR(100) NOT NULL,
  entities JSONB,
  confidence DECIMAL(5,3),
  language VARCHAR(50),
  tone VARCHAR(50),
  context JSONB,  -- Game metadata
  user_id INTEGER,
  session_id VARCHAR(100),
  game_session_id VARCHAR(100),
  source VARCHAR(50),
  approved BOOLEAN DEFAULT FALSE,
  review_status VARCHAR(50) DEFAULT 'pending',
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_training_samples_status ON training_samples(review_status);
CREATE INDEX idx_training_samples_user ON training_samples(user_id);
CREATE INDEX idx_training_samples_game ON training_samples(game_session_id);
```

---

## 🔧 Key Technical Fixes Applied

### Fix 1: Session Retrieval Bug
**Problem**: `getActiveSession(0)` was querying by userId=0 instead of sessionId
**Solution**: Changed to `getSessionById(sessionId)`
**Impact**: CRITICAL - Without this, no answers could be processed

### Fix 2: Field Name Mapping
**Problem**: Database stores `correctAnswer` but services expect `correctIntent/correctLanguage/correctTone`
**Solution**: Added `mapQuestionFields()` helper to translate field names
**Impact**: HIGH - Enabled answer validation across all game types

### Fix 3: Training Sample Creation
**Problem**: Data not formatted correctly for `TrainingSampleService`
**Solution**: Completely rewrote `saveTrainingSample()` method with proper field mapping
**Impact**: HIGH - Core functionality for AI training data collection

### Fix 4: Context Field Missing
**Problem**: Training samples had `context.gameType = null`
**Solution**: Added context object with gameType, questionId, userAnswer, correct
**Impact**: MEDIUM - Improves training data quality and traceability

---

## 🧪 Testing Commands

### Test Single Game
```bash
BASE_URL="http://localhost:3200"

# Start game
START=$(curl -s -X POST "$BASE_URL/api/gamification/games/start" \
  -H "Content-Type: application/json" \
  -d '{"userId":12345,"gameType":"intent_quest","language":"en","difficulty":"medium"}')

SID=$(echo "$START" | jq -r '.data.sessionId')
echo "Session: $SID"

# Answer 5 questions
for i in {1..5}; do
  curl -s -X POST "$BASE_URL/api/gamification/games/answer" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$SID\",\"answer\":\"order_food\"}" | \
    jq '{correct:.data.correct, score:.data.totalScore}'
done

# Check training samples
curl -s "$BASE_URL/api/gamification/training-samples/stats" | jq
```

### Test All Game Types
```bash
for GAME in intent_quest language_master tone_detective profile_builder; do
  echo "Testing $GAME..."
  START=$(curl -s -X POST "http://localhost:3200/api/gamification/games/start" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":99999,\"gameType\":\"$GAME\",\"language\":\"en\",\"difficulty\":\"medium\"}")
  
  SID=$(echo "$START" | jq -r '.data.sessionId')
  
  for i in {1..5}; do
    curl -s -X POST "http://localhost:3200/api/gamification/games/answer" \
      -H "Content-Type: application/json" \
      -d "{\"sessionId\":\"$SID\",\"answer\":\"test\"}" > /dev/null
  done
  
  echo "  Completed session: $SID"
done

# Check stats
curl -s "http://localhost:3200/api/gamification/games/stats/99999" | jq
curl -s "http://localhost:3200/api/gamification/training-samples/stats" | jq
```

---

## 📈 Next Steps (Phase 7 & Beyond)

### Phase 7: Admin UI for Question Management
- [ ] Questions list page with filters
- [ ] Add/Edit question forms
- [ ] Question usage analytics
- [ ] Difficulty adjustment recommendations

### Phase 8: Frontend Game UI
- [ ] Game selection screen
- [ ] Interactive game play interface
- [ ] Real-time score display
- [ ] Leaderboard

### Phase 9: Conversation Integration
- [ ] Trigger games from chat ("play a game")
- [ ] Send game links via WhatsApp/Telegram
- [ ] Game completion notifications
- [ ] Reward redemption

---

## 📝 Summary

✅ **Backend Implementation**: 100% Complete
- 4 game types fully functional
- Session management working
- Training sample collection verified
- 72 questions seeded in database
- All API endpoints tested

✅ **Training Data Collection**: Working
- 15+ samples collected in initial testing
- Proper field mapping (text, intent, confidence, context)
- Context includes gameType, questionId, correct answer
- Ready for admin review and AI training pipeline

✅ **Testing**: All Critical Flows Verified
- Game start → Question retrieval → Answer validation → Score update → Training sample creation → Game completion
- All 4 game types tested
- Session persistence confirmed
- Database queries validated

🎉 **Phase 6 Complete** - Ready for Phase 7 (Admin UI)
