# Quick Start: Testing & Training Guide

## 🚀 Immediate Actions

### 1. Run Human-in-the-Loop Test (NOW!)

Test the current NLU system and provide feedback:

```bash
cd /home/ubuntu/Devs/mangwale-ai
npx ts-node scripts/human-in-loop-tester.ts
```

**What it does:**
- You enter messages
- AI classifies them
- You give feedback (correct/incorrect)
- Builds accuracy metrics
- Saves corrections for retraining

**Example session:**
```
💬 Enter test message: I want to order biryani
🤖 AI Prediction:
Intent: order_food (85.0%)
Tone: neutral
👤 Is this correct? (y/n): y
✅ Great!
```

---

### 2. Generate Training Samples (Interactive)

Collect high-quality training data:

```bash
npx ts-node scripts/generate-training-samples.ts
```

**What it does:**
- Guides you through sample creation
- Asks about intent, entities, tone
- Builds `training/samples.json`
- Ready for model training

---

### 3. Test Current System (Automated)

Run the existing test suite:

```bash
cd /home/ubuntu/Devs/mangwale-ai
./test-nlu-integration.sh
```

---

## 📊 Current System Status

**Working:**
✅ IndicBERT integration (50-60ms response)
✅ LLM fallback (OpenRouter free tier)
✅ Tone analysis (7 emotions + urgency)
✅ Entity extraction
✅ Training data capture

**Not Trained Yet:**
❌ IndicBERT intent model (returns default)
❌ IndicBERT tone model (using rule-based)
❌ IndicBERT slots/entity model

**Performance:**
- Latency: 1.7-4.5s (LLM fallback)
- Accuracy: 85-95% (thanks to LLM)
- Provider: 100% LLM currently

---

## 🎯 Decision Tree: Which Architecture?

### Answer These Questions:

1. **How many service verticals?**
   - 1-2: Use unified agent
   - 3-4: Use hybrid (router + specialized)
   - 5+: Use full multi-agent

2. **Daily message volume?**
   - <1,000: Unified agent
   - 1K-10K: Hybrid
   - 10K+: Multi-agent

3. **Do you have training data?**
   - <500 samples: Start with LLM, collect data
   - 500-2K: Train unified IndicBERT
   - 2K-10K: Train router + 2-3 specialized agents
   - 10K+: Full multi-agent

4. **Response time requirement?**
   - <1s: Need trained IndicBERT
   - <3s: LLM fallback OK
   - <5s: LLM only is fine

5. **Budget for cloud LLM?**
   - $0: Need trained IndicBERT ASAP
   - $50-200/month: LLM fallback OK short-term
   - $500+/month: Can rely on LLM longer

---

## 📈 Recommended Path (Based on Typical Hyperlocal)

### Phase 1: Week 1-2 (Current - Data Collection)
```bash
# 1. Run 50-100 human-in-loop tests
npx ts-node scripts/human-in-loop-tester.ts

# 2. Generate 200-500 samples manually
npx ts-node scripts/generate-training-samples.ts

# 3. Monitor real usage (if deployed)
# Data auto-captured to Label Studio
```

**Goal:** Collect 500+ diverse samples

---

### Phase 2: Week 3-4 (First Training)
```bash
# 1. Analyze data distribution by vertical
cat training/samples.json | jq '[.[] | .vertical] | group_by(.) | map({vertical: .[0], count: length})'

# 2. Train unified model first
./scripts/model-version-manager.sh train unified v1.0.0

# 3. Deploy and test
./scripts/model-version-manager.sh deploy unified v1.0.0

# 4. Run accuracy tests
npx ts-node scripts/human-in-loop-tester.ts
```

**Goal:** 75-85% accuracy with IndicBERT

---

### Phase 3: Month 2 (Specialization Decision)
```bash
# Analyze which vertical dominates
cat training/samples.json | jq '
  [.[] | .vertical] | 
  group_by(.) | 
  map({
    vertical: .[0], 
    count: length, 
    percentage: (length / 500 * 100)
  }) | 
  sort_by(.count) | 
  reverse
'
```

**If one vertical >60% of traffic:**
→ Train specialized agent for that vertical
→ Keep unified for others

**If 2-3 verticals with >20% each:**
→ Train intent router
→ Train specialized agents
→ A/B test vs unified

---

## 🔧 Model Version Management

### List versions
```bash
./scripts/model-version-manager.sh list food
```

### Train new version
```bash
./scripts/model-version-manager.sh train food v1.1.0
```

### Deploy (with automatic backup)
```bash
./scripts/model-version-manager.sh deploy food v1.1.0
```

### Rollback if issues
```bash
./scripts/model-version-manager.sh rollback food
```

### Canary deployment (gradual)
```bash
# Deploy to 10% of traffic
./scripts/model-version-manager.sh canary food v1.2.0 10

# Increase to 50%
./scripts/model-version-manager.sh canary food v1.2.0 50

# Full deploy when confident
./scripts/model-version-manager.sh deploy food v1.2.0
```

### Compare versions
```bash
./scripts/model-version-manager.sh compare food v1.0.0 v1.1.0
```

---

## 🎬 Action Items for You

### Immediate (Next 1 hour):
- [ ] Run `human-in-loop-tester.ts` with 10 test messages
- [ ] Answer the 5 decision tree questions above
- [ ] Tell me: Which verticals do you operate in?

### This Week:
- [ ] Generate 100 samples using `generate-training-samples.ts`
- [ ] Decide: Unified vs Multi-Agent
- [ ] Set up Label Studio project (already running on :8080)

### Next 2 Weeks:
- [ ] Collect 500+ samples (50/day)
- [ ] Train first IndicBERT model
- [ ] Deploy and measure accuracy
- [ ] Iterate based on results

---

## 📞 Tell Me Now

**To give you the exact architecture, answer:**

1. **Primary business vertical?** (food/parcel/ecommerce/grocery/pharmacy)
2. **Secondary verticals?** (if any)
3. **Current daily users?** (rough estimate)
4. **Planned daily users in 6 months?**
5. **Do you have any training data already?** (how many samples)
6. **Dev team size?** (how many can work on this)
7. **Acceptable response time?** (1s/3s/5s)
8. **Monthly budget for cloud LLM?** ($0/$50/$200/$500+)

**Based on your answers, I'll recommend:**
- Exact architecture (unified/hybrid/multi-agent)
- Training data requirements
- Timeline to production
- Cost estimates
- Implementation roadmap
