# Label Studio Human Review Workflow

## Overview

This is the complete workflow where low-confidence AI predictions go through human review before training:

```
User Query
    ↓
NLU Classification (IndicBERT/LLM)
    ↓
Check Confidence
    ↓
    ├─── > 0.85 confidence? ────→ Auto-approved ────→ training_samples
    │                                                         ↓
    └─── < 0.85 confidence? ────→ Label Studio ────→ Human Review
                                        ↓                     ↓
                                   Annotate           Approve/Correct
                                        ↓                     ↓
                                   training_samples ←────────┘
                                        ↓
                                   1000+ samples?
                                        ↓
                                   Train Model
                                        ↓
                                   Deploy (router-v1.X.0)
```

## Setup (One-time)

### Step 1: Access Label Studio
- URL: http://localhost:8080
- Login with your credentials

### Step 2: Run Setup Script
```bash
cd /home/ubuntu/Devs/mangwale-ai
./scripts/setup-labelstudio.sh
```

The script will prompt for:
- **API Key**: Get from Label Studio → Account & Settings → Access Token
- **Project ID**: From project URL (e.g., `/projects/1/` → ID is `1`)

This automatically:
- ✅ Configures connection
- ✅ Uploads annotation interface
- ✅ Imports initial tasks
- ✅ Tests connection

## Daily Workflow

### 1. Import Low-Confidence Samples to Label Studio

Run daily to push samples needing review:

```bash
npm run label-studio:sync -- --push
```

This queries:
```sql
SELECT * FROM conversation_logs 
WHERE nlu_confidence < 0.85 
  AND labelstudio_task_id IS NULL
LIMIT 100;
```

### 2. Human Review in Label Studio

1. Open: http://localhost:8080/projects/YOUR_PROJECT_ID
2. Click on a task to review
3. See AI suggestion (highlighted in yellow)
4. Correct if needed:
   - ✅ Intent (dropdown with 20+ options)
   - ✅ Module (3=Parcel, 4=Food, 5=Ecommerce)
   - ✅ Language (en, hinglish, hi, mr)
   - ✅ Quality rating (1-5 stars)
   - ✅ Notes (optional)
5. Click "Submit"

### 3. Sync Approved Annotations Back

Pull human corrections into database:

```bash
npm run label-studio:sync -- --pull
```

This:
- Fetches completed annotations from Label Studio
- Inserts approved samples into `training_samples`
- Marks as `review_status='approved'`

### 4. Check Progress

```sql
-- Total approved samples
SELECT COUNT(*) FROM training_samples 
WHERE review_status = 'approved';

-- By module
SELECT module_type, COUNT(*) 
FROM training_samples 
WHERE review_status = 'approved'
GROUP BY module_type;

-- Ready for training?
SELECT 
  COUNT(*) as total,
  COUNT(*) >= 1000 as ready_to_train
FROM training_samples 
WHERE review_status = 'approved';
```

### 5. When 1000+ Samples → Train

Manual trigger:
```bash
npm run train:router
```

Or automated (cron - Sunday 3 AM):
```bash
npm run weekly:model-training
```

## Annotation Interface

Human reviewers see:

```
┌────────────────────────────────────────────────┐
│ User Message:                                  │
│ "I want to order biryani from nearby"          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ AI Suggestion: (Yellow highlight)             │
│ Intent: intent.food.item.search (0.78)         │
│ Module: 4 - food                               │
│ Provider: indicbert                            │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 1. Select Correct Intent: ▼                    │
│   ☐ intent.food.item.search                    │
│   ☑ intent.food.store.search  ← Human corrects │
│   ☐ intent.food.order.place                    │
│   ...                                          │
│                                                │
│ 2. Module: ▼                                   │
│   ☑ 4 - Food                                   │
│                                                │
│ 3. Language: ▼                                 │
│   ☑ hinglish                                   │
│                                                │
│ 4. Quality: ★★★★☆ (4/5)                        │
│                                                │
│ 5. Notes: Changed from item search to store   │
│           search - user wants restaurant       │
│                                                │
│         [Submit]  [Skip]                       │
└────────────────────────────────────────────────┘
```

## API Commands

### Push samples to Label Studio
```bash
npm run label-studio:sync -- --push --limit 50
```

### Pull annotations back
```bash
npm run label-studio:sync -- --pull
```

### Bi-directional sync (both)
```bash
npm run label-studio:sync
```

## Database Schema

### conversation_logs
Captures every user interaction:
```sql
- user_message: "I want biryani"
- nlu_intent: "intent.food.item.search"
- nlu_confidence: 0.78 ← Low confidence
- nlu_module_type: "food"
- labelstudio_task_id: 123 ← Created in Label Studio
```

### training_samples
Approved training data:
```sql
- text: "I want biryani"
- intent: "intent.food.store.search" ← Human corrected
- module_id: 4
- module_type: "food"
- review_status: 'approved'
- reviewed_by: "user@example.com"
- quality_score: 4.0
- labelstudio_annotation_id: 456
```

## Metrics to Track

### Quality Metrics
```sql
-- Average quality score
SELECT AVG(quality_score) FROM training_samples 
WHERE review_status = 'approved';

-- Low quality samples (need re-review)
SELECT * FROM training_samples 
WHERE quality_score < 3.0;
```

### Review Efficiency
```sql
-- Human review rate
SELECT 
  COUNT(*) FILTER (WHERE labelstudio_task_id IS NOT NULL) as sent_to_review,
  COUNT(*) FILTER (WHERE review_status = 'approved') as reviewed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE review_status = 'approved') / 
         NULLIF(COUNT(*) FILTER (WHERE labelstudio_task_id IS NOT NULL), 0), 2) as review_rate_percent
FROM conversation_logs;
```

### Confidence Distribution
```sql
-- How many samples at each confidence level
SELECT 
  CASE 
    WHEN nlu_confidence >= 0.90 THEN '90-100%'
    WHEN nlu_confidence >= 0.85 THEN '85-90%'
    WHEN nlu_confidence >= 0.70 THEN '70-85%'
    ELSE '<70%'
  END as confidence_bucket,
  COUNT(*) as count
FROM conversation_logs
GROUP BY confidence_bucket
ORDER BY confidence_bucket DESC;
```

## Troubleshooting

### Label Studio not connecting
```bash
# Check if running
curl http://localhost:8080

# Restart
docker-compose restart labelstudio
```

### No tasks appearing
```sql
-- Check if samples exist needing review
SELECT COUNT(*) FROM conversation_logs 
WHERE nlu_confidence < 0.85;

-- Manually create task
npm run label-studio:sync -- --push --limit 10
```

### Annotations not syncing back
```bash
# Check Label Studio logs
docker-compose logs labelstudio | tail -50

# Test API manually
curl -H "Authorization: Token YOUR_KEY" \
  http://localhost:8080/api/projects/1/tasks
```

## Complete Example

```bash
# 1. Setup (one-time)
./scripts/setup-labelstudio.sh

# 2. Push 50 low-confidence samples
npm run label-studio:sync -- --push --limit 50

# 3. Human reviews in browser (http://localhost:8080)
#    Reviews 30 samples, corrects 10

# 4. Pull approved annotations
npm run label-studio:sync -- --pull

# 5. Check results
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale -c \
  "SELECT COUNT(*), AVG(quality_score) FROM training_samples WHERE source='label-studio';"

# Output: 30 samples, avg quality 4.2 ✅

# 6. If 1000+ samples total → train
npm run train:router
```

## Automation (Optional)

Add to crontab:
```bash
# Sync every 6 hours
0 */6 * * * cd /home/ubuntu/Devs/mangwale-ai && npm run label-studio:sync

# Or manual daily
0 9 * * * cd /home/ubuntu/Devs/mangwale-ai && npm run label-studio:sync -- --push --limit 100
0 17 * * * cd /home/ubuntu/Devs/mangwale-ai && npm run label-studio:sync -- --pull
```

## Success Criteria

✅ **Week 1:**
- Label Studio configured
- 100+ samples reviewed
- Quality score > 4.0
- 60%+ auto-approval rate

✅ **Week 2:**
- 500+ total approved samples
- 80%+ of reviewed samples approved
- Ready for first training run

✅ **Month 1:**
- 1000+ approved samples
- First model trained (router-v1.1.0)
- Accuracy improved by 5%+
- Auto-approval rate increased to 75%

## Summary

This human-in-the-loop system ensures:
1. **Quality**: Low-confidence predictions are human-verified
2. **Continuous Learning**: Model improves with real corrections
3. **Efficiency**: 60%+ auto-approved, only 40% need human review
4. **Tracking**: Full audit trail of who reviewed what
5. **Scalability**: Automated sync, automated training triggers

**Result**: Better model accuracy + reduced manual work over time! 🚀
