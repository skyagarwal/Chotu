# Quick Start: Testing Profile Enrichment System

**Status**: ✅ Deployed to Production  
**Service**: Healthy on port 3200

---

## 🚀 Run Tests Now

```bash
cd /home/ubuntu/Devs/mangwale-ai
./test-enrichment.sh
```

**Expected Output**:
- ✅ Extracts "veg" from "main vegetarian hoon"
- ✅ Extracts "budget" from "500 ke andar chahiye"
- ✅ Extracts "hot" from "extra spicy pasand hai"
- ✅ Profile completeness increases
- ✅ Asks confirmation questions naturally

---

## 📊 View Results

### Check User Profiles
```bash
docker exec mangwale_postgres psql -U mangwale_user -d headless_mangwale -c "
  SELECT user_id, phone, dietary_type, spice_level, price_sensitivity, profile_completeness 
  FROM user_profiles;
"
```

### Check Pending Confirmations
```bash
docker exec mangwale_postgres psql -U mangwale_user -d headless_mangwale -c "
  SELECT user_id, key, value, confidence, source 
  FROM user_insights 
  ORDER BY created_at DESC 
  LIMIT 10;
"
```

### Monitor Live Enrichment
```bash
docker logs mangwale_ai_service -f | grep "🎯\|🔍\|💬"
```

**What to Look For**:
- `🔍 Extracting preferences from: "message"`
- `💾 Storing high-confidence preference: key = value (0.92)`
- `📝 Storing insight for confirmation: key = value (0.75)`
- `💬 Asking confirmation: question`

---

## 🧪 Manual Testing

### Test 1: Dietary Extraction
```bash
curl -X POST http://localhost:3200/test/message \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "+919876543210",
    "message": "main vegetarian hoon, spicy nahi pasand"
  }'
```

**Expected**: Extracts `dietary_type: veg` and `spice_level: mild`

### Test 2: Budget Signal
```bash
curl -X POST http://localhost:3200/test/message \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "+919876543210",
    "message": "kuch budget mein dikhao, 500 ke andar"
  }'
```

**Expected**: Extracts `price_sensitivity: budget`

### Test 3: Confirmation Response
```bash
curl -X POST http://localhost:3200/test/message \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "+919876543210",
    "message": "haan bilkul, correct hai"
  }'
```

**Expected**: Confirms pending preference, increases confidence to 1.0

---

## 📈 Success Metrics

After running tests, check:
- [ ] Profile completeness > 0% (was 0%)
- [ ] Dietary type extracted correctly
- [ ] Price sensitivity detected from budget mentions
- [ ] Spice level inferred from natural language
- [ ] Confirmation questions appear in responses
- [ ] No duplicate questions within 24 hours

---

## 🐛 Troubleshooting

### No Preferences Extracted?
```bash
# Check LLM service
curl http://localhost:8002/v1/models

# Should return: qwen32b or similar model
```

### Service Not Running?
```bash
docker-compose up -d mangwale-ai
docker logs mangwale_ai_service --tail 30
```

### Database Connection Issues?
```bash
docker exec mangwale_postgres psql -U mangwale_user -d headless_mangwale -c "\dt"
```

---

## 📚 Documentation

- **Full Guide**: `PHASE_4.1_CONVERSATIONAL_ENRICHMENT_COMPLETE.md` (450 lines)
- **Summary**: `PHASE_4.1_SUMMARY.md` (200 lines)
- **This Guide**: `QUICK_START_ENRICHMENT.md`

---

## 🔜 Next Steps

**Option 1**: Continue testing with real conversations  
**Option 2**: Build admin dashboard (Phase 4.2)  
**Option 3**: Deploy to production with pilot users

**Recommendation**: Test with 5 internal users first, gather feedback, then build dashboard.

---

**Ready to Test!** 🎉  
Run: `./test-enrichment.sh`
