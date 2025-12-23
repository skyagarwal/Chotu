# Gamification System Status & Data Collection Strategy

## Current Status (After Investigation)

### ✅ What's Working
1. **NLU Model**: IndicBERTv3_final deployed with 48% accuracy
   - Model: ai4bharat/IndicBERTv2-MLM-Back-TLM
   - Training Data: 122 clean samples, 13 balanced intents
   - Training: 20 epochs, GPU-enabled, ~2.5 minutes
   - Location: `/models/indicbert_v3_final` (11GB)

2. **Data Collection Infrastructure**: 
   - `ConversationLoggerService` exists and working
   - `conversation_logs` table ready (currently 0 rows - not used in production yet)
   - `nlu_training_data` table has 122 curated samples

3. **Conversation Platform**: 
   - WhatsApp, Telegram, Web channels working
   - Agent system operational
   - Session management functional

### ❌ What's Broken (Gamification)
The gamification system (`src/gamification/`) has **82 TypeScript compilation errors**:

**Critical Issues**:
1. **Prisma Schema Mismatch**:
   ```typescript
   // Code expects:
   this.prisma.nluTrainingData.create()  // ❌ Doesn't exist
   this.prisma.trainingSample.findMany() // ❌ Doesn't exist
   
   // Actual schema has:
   prisma.gameSession // ✅ EXISTS
   prisma.nlu_training_data // ❌ Wrong name (snake_case vs camelCase)
   ```

2. **Session Structure Mismatch**:
   ```typescript
   // Code expects:
   session.auth_token  // ❌ Property doesn't exist
   session.user_id     // ❌ Property doesn't exist
   session.metadata    // ❌ Property doesn't exist
   
   // Actual Session model (see libs/database/prisma/schema.prisma):
   session.id
   session.phoneNumber
   session.data (JSON)
   session.step
   ```

3. **Flow Type Errors**:
   - `training-game.flow.ts` uses unsupported step types: `'message'`, `'execute'`, `'branch'`, `'final'`
   - Actual flow engine only supports: `'wait'`, `'end'`, `'action'`, `'decision'`, `'parallel'`

4. **Module Enum Mismatch**:
   ```typescript
   // Flow defines:
   module: 'gamification'  // ❌ Not in allowed enum
   
   // Allowed values:
   'food' | 'parcel' | 'general' | 'ecommerce'
   ```

## Why This Happened

Looking at the documentation in `docs-latest/`, the gamification system was designed but:
1. **Prisma schema was never updated** to match the code
2. **Flow engine was refactored** after gamification was written
3. **Session model changed** but gamification code wasn't updated

The system is **95% built but incompatible** with current architecture.

## Data Collection Reality Check

### Current Dataset
```sql
SELECT intent, COUNT(*) 
FROM nlu_training_data 
GROUP BY intent;
```
Expected output:
- create_parcel_order: 10 samples
- order_food: 10 samples  
- track_order: 10 samples
- cancel_order: 8 samples
- etc. (13 intents total, 122 samples)

### Why 48% Accuracy?
With 122 samples across 13 intents (~9 samples per intent), the model is **severely undertrained**:
- **Minimum needed**: 50-100 samples per intent (650-1300 total)
- **Optimal**: 200+ samples per intent (2600+ total)
- **Current**: 9 samples per intent (122 total)

Random chance for 13 intents = 7.7%. We're at 48%, which means the model is learning patterns but lacks data diversity.

## Recommended Strategy (Instead of Fixing Gamification)

### Option A: Real User Conversations (RECOMMENDED)
1. **Deploy current system to production** (48% is better than nothing)
2. **Enable conversation logging** (already built):
   ```typescript
   // Already happening in ConversationService.handleNaturalLanguageMainMenu():
   await this.conversationLoggerService.logConversation({
     phoneNumber,
     messageText,
     intent: 'agent_response',
     confidence: agentResult.response ? 0.9 : 0.3,
     currentStep: 'main_menu',
     timestamp: Date.now(),
   });
   ```

3. **Invite 50-100 beta users** to use the system naturally
4. **Label Studio pipeline** to review and label conversations:
   - Export `conversation_logs` to Label Studio
   - Human annotators review and correct intents
   - Import back to `nlu_training_data`
   - Retrain model weekly

**Expected timeline**: 
- Week 1-2: 500 conversations
- Week 3-4: 1000 conversations  
- Month 2: 5000+ conversations
- Accuracy: 75-85% by Month 2

### Option B: Fix Gamification (NOT RECOMMENDED)
Would require:
1. Update Prisma schema:
   ```prisma
   model NluTrainingData { ... }  // Rename from nlu_training_data
   model TrainingSample { ... }    // Create new model
   ```
2. Run migrations (affects production DB)
3. Fix 82 TypeScript errors
4. Update flow definitions to match new flow engine
5. Test gamification flows
6. Invite users to play games

**Estimated effort**: 2-3 days
**Risk**: High (schema migrations on production DB)
**Benefit**: Questionable (games feel artificial compared to real usage)

### Option C: Hybrid Approach
1. Deploy current system (Option A)
2. Create **simple web form** for data collection:
   ```
   /training-game-simple
   
   "Help train our AI! Type how you would ask for:
   - Food delivery
   - Parcel booking
   - Order tracking
   etc."
   ```

3. Reward users with Mangwale points (use existing reward system)
4. Much simpler than full gamification, no schema changes needed

**Estimated effort**: 4-6 hours
**Risk**: Low
**Benefit**: Targeted data collection

## Immediate Next Steps

### 1. Build and Deploy Current System ✅
```bash
# Gamification is already disabled, should build clean
cd /home/ubuntu/Devs/mangwale-ai
npm run build
pm2 restart mangwale-ai
```

### 2. Verify NLU Is Working
```bash
curl http://localhost:3200/health/nlu
```
Expected:
```json
{
  "status": "healthy",
  "model": "ai4bharat/IndicBERTv2-MLM-Back-TLM",
  "encoder_loaded": true,
  "classifier_loaded": true,
  "model_path": "/models/indicbert_v3_final"
}
```

### 3. Test End-to-End Flow
```bash
# Test via WhatsApp webhook
curl -X POST http://localhost:3200/webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "text": {"body": "mujhe pizza order karna hai"}
          }]
        }
      }]
    }]
  }'
```

Expected: Intent classification logged to `conversation_logs`

### 4. Enable Production Logging
Check `.env`:
```bash
grep -E "LOG_LEVEL|CONVERSATION_LOGGING" .env
```

If not set:
```bash
echo "LOG_LEVEL=info" >> .env
echo "CONVERSATION_LOGGING_ENABLED=true" >> .env
```

### 5. Invite Beta Users
Create simple onboarding:
1. WhatsApp Business message: "Join Mangwale AI Beta"
2. User sends "hi" → Gets menu
3. Every conversation logged automatically
4. Review logs weekly in Label Studio

## Training Data Collection Metrics

### Current State
- **Samples**: 122
- **Intents**: 13
- **Samples/Intent**: 9.4 (avg)
- **Model Accuracy**: 48%

### Target State (Month 1)
- **Samples**: 500-1000
- **Intents**: 13-15
- **Samples/Intent**: 38-77
- **Model Accuracy**: 65-70%

### Target State (Month 3)
- **Samples**: 2000-5000
- **Intents**: 15-20
- **Samples/Intent**: 100-333
- **Model Accuracy**: 80-85%

## Gamification: To Fix or Not to Fix?

### Arguments AGAINST Fixing:
1. **Real data is better**: Actual user conversations > artificial game data
2. **Time investment**: 2-3 days to fix 82 errors
3. **Risk**: Prisma migrations on production DB
4. **Maintenance burden**: Complex codebase that doesn't match architecture

### Arguments FOR Fixing:
1. **Bootstrapping**: Games could collect initial diverse data
2. **Engagement**: Gamification increases user participation
3. **Quality control**: Game prompts ensure intent diversity
4. **Already built**: 95% complete, just needs schema alignment

### Decision: **DON'T FIX (for now)**
- Collect 500-1000 real samples first (4-8 weeks)
- Retrain model (likely 65-70% accuracy)
- THEN decide if gamification is worth it
- By then, we'll have real usage patterns to inform game design

## Files Changed (This Session)

### Reverted (Disabled Gamification)
1. `src/app.module.ts` - GamificationModule commented out
2. `src/flow-engine/flow-engine.module.ts` - Game executors commented out
3. `src/conversation/services/conversation.service.ts` - Game trigger commented out

### Original Gamification Code (Preserved)
- `src/gamification/` - All services intact (just not imported)
- `src/flow-engine/executors/game-scorer.executor.ts` - Has Prisma errors
- `src/flow-engine/executors/reward-points.executor.ts` - Has Prisma errors
- `src/flow-engine/flows/training-game.flow.ts` - Has type errors

## Conclusion

**Original Goal**: Use gamification to collect training data  
**Current Reality**: Gamification has 82 TypeScript errors due to schema mismatches  
**Recommended Path**: Deploy current system → Collect real conversations → Label with Label Studio → Retrain

**Next Immediate Action**: Build and restart application, verify NLU health, invite beta users.

---
**Last Updated**: $(date)  
**Model Status**: IndicBERTv3_final - 48% accuracy - 122 samples  
**Gamification Status**: Disabled (82 compilation errors)  
**Recommended**: Real user conversations > games
