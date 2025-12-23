# 🚀 Complete Training System - Setup & Usage Guide

**Status:** ✅ PRODUCTION READY  
**Date:** November 13, 2025

---

## 📦 What's Included

### 1. **Database Infrastructure** ✅
- 6 PostgreSQL tables for training workflow
- 3 helper views for analytics
- Automatic conversation logging
- Model version tracking

### 2. **Automation Scripts** ✅
- `label-studio-sync.ts` - Sync with Label Studio for human review
- `export-training-data.ts` - Export approved samples to JSONL
- `daily-training-capture.ts` - Daily cron job for data collection
- `weekly-model-training.ts` - Weekly automated training
- `train-router.ts` - Core training pipeline

### 3. **Integration** ✅
- NLU service auto-captures all conversations
- Intelligent auto-filtering (confidence-based)
- OpenSearch/PHP routing decisions logged
- User feedback tracking

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Environment Setup

```bash
# 1. Copy Label Studio template
cp .env.labelstudio.template .env.labelstudio

# 2. Edit configuration
nano .env.labelstudio

# Add your Label Studio details:
# LABEL_STUDIO_URL=http://localhost:8080
# LABEL_STUDIO_API_KEY=<your_api_key>
# LABEL_STUDIO_PROJECT_ID=1
```

### Step 2: Install Cron Jobs

```bash
# 1. Edit crontab
crontab -e

# 2. Add these lines (from crontab.conf):
0 2 * * * cd /home/ubuntu/Devs/mangwale-ai && npm run daily:training-capture >> logs/cron-daily.log 2>&1
0 3 * * 0 cd /home/ubuntu/Devs/mangwale-ai && npm run weekly:model-training >> logs/cron-weekly.log 2>&1
0 */6 * * * cd /home/ubuntu/Devs/mangwale-ai && npm run label-studio:sync >> logs/cron-labelstudio.log 2>&1

# 3. Save and exit
```

### Step 3: Setup Label Studio (Optional but Recommended)

```bash
# 1. Access Label Studio
open http://localhost:8080

# 2. Create new project
#    - Name: "Mangwale NLU Training"
#    - Click "Create"

# 3. Configure labeling interface
#    - Settings → Labeling Interface → Code
#    - Copy contents of label-studio-config.xml
#    - Paste and Save

# 4. Get API key
#    - Settings → Account & Settings
#    - Copy "Access Token"
#    - Add to .env.labelstudio

# 5. Get Project ID
#    - Look at URL: /projects/1/ (ID is 1)
#    - Add to .env.labelstudio
```

### Step 4: Test the System

```bash
# 1. Check database tables
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale \
  -c "\dt" | grep -E "(conversation_logs|training_samples|model_versions)"

# 2. Check current stats (will be empty until users start talking)
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale \
  -c "SELECT * FROM training_queue LIMIT 10;"

# 3. Run daily capture manually (test)
npm run daily:training-capture

# 4. Export training data (test)
npm run export:training-data -- --output test-export.jsonl --limit 100

# 5. Check Label Studio sync (if configured)
npm run label-studio:sync -- --limit 10
```

---

## 📊 Available Commands

### Data Collection
```bash
# Daily training data capture (auto-approves high confidence)
npm run daily:training-capture

# Sync with Label Studio (push/pull annotations)
npm run label-studio:sync
npm run label-studio:sync -- --limit 100 --project-id 2
```

### Data Export
```bash
# Export all approved samples
npm run export:training-data

# Export with filters
npm run export:training-data -- \
  --output training/batch-2.jsonl \
  --limit 2000 \
  --languages en,hinglish \
  --min-confidence 0.7
```

### Model Training
```bash
# Weekly automated training (checks if 500+ samples available)
npm run weekly:model-training

# Manual incremental training
npm run train:incremental

# Train router from scratch
npm run train:router -- \
  --input training/production-samples.jsonl \
  --output models/router-v1.1.0 \
  --epochs 50 \
  --target-accuracy 0.85
```

### Database Queries
```bash
# View training queue
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale \
  -c "SELECT * FROM training_queue WHERE review_status='needs-review' LIMIT 20;"

# Daily statistics
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale \
  -c "SELECT * FROM daily_training_stats ORDER BY date DESC LIMIT 7;"

# Model versions
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale \
  -c "SELECT version, status, test_accuracy, traffic_percentage FROM model_versions;"

# Recent conversations
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale \
  -c "SELECT user_message, nlu_intent, nlu_confidence, review_status FROM conversation_logs ORDER BY created_at DESC LIMIT 20;"
```

---

## 🔄 Automated Workflows

### Daily (2 AM)
```
1. Query last 24 hours of conversations
2. Auto-approve samples with confidence > 0.85 + IndicBERT
3. Create training_samples for auto-approved
4. Flag low-confidence for Label Studio review
5. Generate daily report
6. Check if 1000+ samples accumulated → alert for training
```

**Output:** `logs/daily-report-YYYY-MM-DD.json`

### Every 6 Hours
```
1. Push pending samples to Label Studio (needs-review)
2. Fetch completed human annotations
3. Update training_samples with human corrections
4. Mark samples as approved
```

**Output:** Console logs in `logs/cron-labelstudio.log`

### Weekly (Sunday 3 AM)
```
1. Check if 500+ unused samples available
2. If yes:
   - Export all approved samples to JSONL
   - Determine new version number (v1.X.0)
   - Train new router model
   - Evaluate on test set
   - Compare with current production
   - If better → create model version record
   - Mark samples as used
   - Generate training report
```

**Output:** `logs/training-router-vX.X.X.json`

---

## 📈 Expected Data Flow

### Week 1 (Current)
```
Day 1-7: 100 users/day = 700 conversations
  ↓
Auto-filtering:
  - 420 auto-approved (60%, confidence > 0.85)
  - 280 needs review (40%, confidence < 0.85)
  ↓
Label Studio:
  - Human reviews 280 samples
  - Approves ~200 (71%)
  - Rejects ~80 (29%)
  ↓
Total approved: 420 + 200 = 620 samples
```

### Week 2
```
Total accumulated: 1,240 approved samples
  ↓
Threshold reached (>1000)
  ↓
Trigger: weekly-model-training
  ↓
Train router-v1.1.0
  - Training samples: 1,240
  - Expected accuracy: 86-88%
  - Status: testing
  ↓
Manual review → Deploy to canary (10% traffic)
```

### Month 1
```
Conversations: 3,000
Approved samples: 2,500
Model versions: v1.0.0, v1.1.0, v1.2.0
Current accuracy: 90-92%
LLM fallback rate: 15% → 8%
```

---

## 🎓 Understanding the System

### Auto-Approval Logic
```typescript
if (confidence >= 0.85 && provider === 'indicbert') {
  review_status = 'auto-approved'
  → Creates training_sample immediately
  → No human review needed
}
else if (confidence >= 0.70) {
  review_status = 'needs-review'
  review_priority = 5 (medium)
  → Sent to Label Studio
}
else {
  review_status = 'needs-review'
  review_priority = 2 (high - model struggling)
  → Sent to Label Studio (priority queue)
}
```

### Version Numbering
```
router-v1.0.0  - Initial (1500 synthetic samples)
router-v1.1.0  - First real data (+1000 samples = 2500 total)
router-v1.2.0  - Second increment (+1000 = 3500 total)
router-v2.0.0  - Major change (architecture update)
```

### Model Lifecycle
```
training → testing → canary (10%) → production (100%)
            ↓           ↓                ↓
         Manual     Monitor 48h      Gradual
         review     metrics          rollout
```

---

## 🔍 Monitoring & Debugging

### Check if Conversations Are Being Captured
```sql
-- Latest 10 conversations
SELECT
  user_message,
  nlu_intent,
  nlu_confidence,
  nlu_provider,
  review_status,
  created_at
FROM conversation_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** New rows every time a user talks

### Check Training Queue
```sql
-- Samples waiting for review
SELECT COUNT(*) as needs_review_count
FROM training_queue
WHERE review_status = 'needs-review';
```

**Expected:** Grows with low-confidence conversations

### Check Auto-Approval Rate
```sql
-- Today's auto-approval rate
SELECT
  COUNT(*) FILTER (WHERE review_status = 'auto-approved') * 100.0 / COUNT(*) as auto_approval_rate
FROM conversation_logs
WHERE created_at >= CURRENT_DATE;
```

**Expected:** 60-70% (if model is good)

### Check Model Performance
```sql
-- Current production model
SELECT
  version,
  test_accuracy,
  production_accuracy,
  fallback_rate,
  traffic_percentage
FROM model_versions
WHERE status = 'production';
```

**Expected:** test_accuracy > 0.82, fallback_rate < 0.20

---

## 🚨 Troubleshooting

### No conversations being captured
```bash
# 1. Check if NLU service is running
curl http://localhost:3200/health

# 2. Check if DATABASE_URL is correct
cat .env | grep DATABASE_URL

# 3. Test manually
curl -X POST http://localhost:3200/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "pizza delivery", "phoneNumber": "test123"}'

# 4. Check database
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale \
  -c "SELECT COUNT(*) FROM conversation_logs;"
```

### Label Studio sync failing
```bash
# 1. Check Label Studio is running
curl http://localhost:8080/api/projects

# 2. Check API key
echo $LABEL_STUDIO_API_KEY

# 3. Test manually
npm run label-studio:sync -- --limit 1

# 4. Check logs
tail -f logs/cron-labelstudio.log
```

### Weekly training not running
```bash
# 1. Check crontab
crontab -l | grep weekly

# 2. Check cron logs
tail -f logs/cron-weekly.log

# 3. Check sample count
docker exec mangwale_postgres psql -U mangwale_config -d headless_mangwale \
  -c "SELECT COUNT(*) FROM training_samples WHERE review_status='approved' AND model_version_target IS NULL;"

# 4. Run manually
npm run weekly:model-training
```

---

## 📚 Files Reference

### Scripts
- `scripts/label-studio-sync.ts` - Label Studio integration
- `scripts/export-training-data.ts` - Export to JSONL
- `scripts/daily-training-capture.ts` - Daily data collection
- `scripts/weekly-model-training.ts` - Weekly training automation
- `scripts/train-router.ts` - Core training pipeline

### Configuration
- `.env.labelstudio` - Label Studio settings
- `label-studio-config.xml` - Annotation UI config
- `crontab.conf` - Cron job examples

### Database
- `prisma/migrations/20251113_add_training_workflow_tables.sql` - Schema

### Logs
- `logs/daily-report-YYYY-MM-DD.json` - Daily statistics
- `logs/training-router-vX.X.X.json` - Training reports
- `logs/cron-*.log` - Cron execution logs

---

## ✅ Success Checklist

### Initial Setup
- [ ] Database tables created (6 tables, 3 views)
- [ ] Cron jobs installed
- [ ] Label Studio configured (optional)
- [ ] .env.labelstudio configured
- [ ] Test data collection working

### Week 1
- [ ] Conversations being captured (check database)
- [ ] Auto-approval working (60%+ rate)
- [ ] Daily reports generating
- [ ] 500+ samples collected

### Week 2
- [ ] 1000+ samples accumulated
- [ ] Weekly training triggered
- [ ] New model version created
- [ ] Accuracy improved

### Production
- [ ] A/B testing configured
- [ ] Monitoring dashboards setup
- [ ] Alert system for low accuracy
- [ ] Backup/export automation

---

**System is READY! Start capturing real user data immediately.** 🚀
