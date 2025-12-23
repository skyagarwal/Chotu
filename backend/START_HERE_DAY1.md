# 🚀 START HERE: Mangwale NLU Training (Week 1, Day 1)

## ✅ System Ready

All services running and integrated:
- ✅ NLU Service (IndicBERT): http://localhost:7010
- ✅ Mangwale-AI (NestJS): http://localhost:3200
- ✅ Label Studio (Annotation): http://localhost:8080
- ✅ MinIO (Storage): http://localhost:9004
- ✅ PostgreSQL (Training data)

## 🎯 Your Task Today (2-3 hours)

### Step 1: Generate 100 Quick Samples (30 minutes)

```bash
cd /home/ubuntu/Devs/mangwale-ai
npx ts-node scripts/mangwale-sample-generator.ts
```

**Choose:**
1. Quick mode
2. Enter: `100`

**Result:** 100 samples across all 3 verticals, all 4 languages

**Breakdown you'll get:**
- Food: ~33 samples (en/hinglish/hi/mr mixed)
- Parcel: ~33 samples (en/hinglish/hi/mr mixed)
- Dukan: ~34 samples (en/hinglish/hi/mr mixed)

### Step 2: Review Samples (15 minutes)

```bash
# Check total count
cat training/samples.json | jq '. | length'

# View breakdown by vertical and language
cat training/samples.json | jq '
  group_by(.vertical) | 
  map({
    vertical: .[0].vertical, 
    count: length,
    languages: (group_by(.language) | map({lang: .[0].language, count: length}))
  })
'

# See first 5 samples
cat training/samples.json | jq '.[:5] | .[] | {text, intent, vertical, language}'
```

### Step 3: Test Current System (30 minutes)

```bash
# Run human-in-loop tester
npx ts-node scripts/human-in-loop-tester.ts
```

**Test these 10 messages:**

1. "I want to order biryani" (food, en)
2. "Mujhe pizza order karna hai" (food, hinglish)
3. "Pune se Mumbai parcel bhejni hai" (parcel, hinglish)
4. "Send package to Delhi" (parcel, en)
5. "Rice kaha milega?" (dukan, hinglish)
6. "Where to buy atta?" (dukan, en)
7. "Food delivery kab aayega?" (food, hinglish)
8. "Track parcel ABC123" (parcel, en)
9. "Doodh available hai kya?" (dukan, hinglish)
10. "Cancel my order" (general, en)

**Record accuracy:** ____%

### Step 4: Generate 50 More Custom Samples (45 minutes)

Focus on complex scenarios:

**Parcel (multi-lingual, complex):**
```
Hinglish: "Bhai 3 pickup points hai aur 5 delivery locations, truck se jayega kya?"
English: "I need to send 50kg from Pune to Mumbai, Bangalore, and Delhi - multi-drop"
Hindi: "गाड़ी बुक करनी है, 10 किलो के लिए"
Marathi: "पुण्यातून मुंबईला पार्सल पाठवायचं आहे, किती वाजता pickup?"
```

**Food (edge cases):**
```
Hinglish: "Biryani late ho gaya, refund chahiye"
English: "Restaurant closed but app showing open - complaint"
Hindi: "खाना ठंडा आ गया, complaint karna hai"
```

**Dukan (local context):**
```
Hinglish: "Nearby kirana store mein oil milta hai?"
Marathi: "लोकल दुकानात साखर उपलब्ध आहे का?"
English: "Local vendor registration - how to do?"
```

### Step 5: Import to Label Studio (30 minutes)

1. Open http://localhost:8080
2. Create new project: "Mangwale NLU Training"
3. Import `training/samples.json`
4. Review first 20 samples
5. Fix any labeling mistakes

---

## 📊 Daily Goals (Week 1)

| Day | Samples Target | Cumulative | Activity |
|-----|---------------|------------|----------|
| Day 1 (Today) | 100 | 100 | Quick generation + HITL testing |
| Day 2 | 75 | 175 | Custom samples (focus parcel) |
| Day 3 | 75 | 250 | Custom samples (focus food) |
| Day 4 | 75 | 325 | Custom samples (focus dukan) |
| Day 5 | 50 | 375 | Edge cases + quality review |
| Day 6 | 50 | 425 | Label Studio annotation |
| Day 7 | 75 | 500 | Final cleanup + prepare for training |

**Week 1 Goal:** 500 high-quality samples ✅

---

## 🎯 Success Metrics

After Week 1, you should have:
- ✅ 500+ samples
- ✅ All 3 verticals covered (150+ each)
- ✅ All 4 languages represented (~50% en, 40% hinglish, 10% hi/mr)
- ✅ Baseline accuracy measured with HITL
- ✅ Ready to train router model

---

## 📁 Files You'll Create

```
training/
├── samples.json (500+ samples)
├── food_samples.json (exported subset)
├── parcel_samples.json (exported subset)
└── dukan_samples.json (exported subset)

testing/
├── hitl-results.json (accuracy data)
└── baseline_metrics.json

models/
└── router/
    └── v1.0.0/ (Week 2)
```

---

## 🚨 Common Issues & Solutions

### Issue: "Module not found"
```bash
cd /home/ubuntu/Devs/mangwale-ai
npm install
```

### Issue: "Label Studio not accessible"
```bash
docker ps | grep labelstudio
# If not running:
cd /home/ubuntu/Devs/mangwale-ai
docker-compose up -d labelstudio
```

### Issue: "Training file empty"
Check if script completed:
```bash
cat training/samples.json | jq '. | length'
```

---

## 📞 Quick Reference

**Generate samples (quick):**
```bash
npx ts-node scripts/mangwale-sample-generator.ts
# Choose: 1 (quick), then enter count
```

**Test NLU:**
```bash
npx ts-node scripts/human-in-loop-tester.ts
```

**Check progress:**
```bash
cat training/samples.json | jq '
  group_by(.vertical) | 
  map({vertical: .[0].vertical, count: length})
'
```

**View samples:**
```bash
cat training/samples.json | jq '.[] | select(.vertical == "food") | {text, intent, language}' | head -20
```

---

## ✅ End of Day 1 Checklist

- [ ] Generated 100+ samples (quick mode)
- [ ] Generated 50+ custom samples (manual)
- [ ] Ran HITL test with 10 queries
- [ ] Recorded baseline accuracy: ____%
- [ ] Imported to Label Studio
- [ ] Reviewed sample quality
- [ ] Read MANGWALE_NLU_ROADMAP.md
- [ ] Planned Day 2 sample generation

**Time invested:** 2-3 hours
**Output:** 150 high-quality multi-lingual samples + baseline metrics

---

## 🚀 Tomorrow (Day 2)

Focus: **Parcel complexity**
- Generate 75 parcel-specific samples
- Include multi-drop scenarios
- Test vehicle type queries
- Add pricing edge cases

**See you tomorrow! 🎯**
