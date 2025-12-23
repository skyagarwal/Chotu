# Complete Logging & Monitoring Guide

## 🎯 Overview

The gamification system has **comprehensive logging** at every layer:
- ✅ Request/Response logging with timestamps
- ✅ Performance metrics (response times)
- ✅ Error tracking with stack traces
- ✅ Database query logging
- ✅ CORS configuration logging
- ✅ Visual emoji indicators for easy scanning

---

## 📊 Logging Levels

### Backend API Logs

**Location:** Terminal running `npm run start:dev` or check Docker logs

**Log Format:**
```
[Nest] 1911067  - 11/20/2025, 4:15:30 PM     LOG [GamificationSettingsController] 
📊 [GET /api/gamification/settings] Fetching all settings
[Nest] 1911067  - 11/20/2025, 4:15:30 PM     LOG [GamificationSettingsController] 
✅ Retrieved 11 settings
```

### Emoji Indicators

| Emoji | Meaning | Example |
|-------|---------|---------|
| 📊 | Data Query | Fetching settings |
| 📈 | Statistics | Dashboard stats request |
| 💾 | Data Update | Saving settings |
| ✅ | Success | Operation completed |
| ❌ | Error | Operation failed |
| 🎮 | Game Action | Game started/completed |
| 🎁 | Reward | Reward credited |
| 📝 | Training Data | Training sample created |
| 🔍 | Search/Filter | Query with filters |
| 🚀 | System Start | Server started |

---

## 🔍 What Gets Logged

### 1. Gamification Settings Controller

**GET /api/gamification/settings**
```
[LOG] 📊 [GET /api/gamification/settings] Fetching all settings
[LOG] ✅ Retrieved 11 settings
```

**GET /api/gamification/settings/:key**
```
[LOG] 📊 [GET /api/gamification/settings/reward_intent_quest] Fetching single setting
```

**PUT /api/gamification/settings**
```
[LOG] 💾 [PUT /api/gamification/settings] Updating 2 settings
[DEBUG] Settings to update: ["reward_intent_quest","daily_games_limit"]
[LOG] ✅ Settings updated successfully
```

**Error Example:**
```
[ERROR] ❌ Failed to update settings: Database connection error
Error: Connection timeout...
    at GamificationSettingsService.updateSetting (/src/...)
    ...stack trace...
```

---

### 2. Gamification Stats Controller

**GET /api/gamification/stats**
```
[LOG] 📈 [GET /api/gamification/stats] Fetching dashboard statistics
[LOG] ✅ Stats retrieved successfully in 8ms
```

Response includes performance metric:
```json
{
  "meta": {
    "responseTimeMs": 8
  }
}
```

---

### 3. Training Samples Controller

**GET /api/gamification/training-samples**
```
[LOG] 📝 [GET /api/gamification/training-samples] Fetching samples (status: pending, limit: 50)
[LOG] ✅ Retrieved 5 pending samples
```

**POST /api/gamification/training-samples/:id/approve**
```
[LOG] ✅ [POST /api/gamification/training-samples/1/approve] Approving sample
[LOG] 📊 Sample #1 approved by: admin_user
```

**GET /api/gamification/training-samples/export**
```
[LOG] 📥 [GET /api/gamification/training-samples/export] Exporting format: jsonl
[LOG] ✅ Exported 25 approved samples
```

---

### 4. Game Flow Logging

**When User Plays Game:**
```
[LOG] 🎮 [POST /chat/send] User user123 requested game: intent_quest
[LOG] 🎮 Game started: Intent Quest (user: user123)
[LOG] 📝 Training sample created from user answer
[LOG] 🎮 Game round completed: 1/5 (score: 20)
[LOG] 🎮 Game round completed: 2/5 (score: 40)
...
[LOG] 🎮 Game completed: user123 scored 80/100
[LOG] 🎁 Reward credited: 15 credits to user123
```

---

### 5. Database Logging

**Prisma automatically logs queries:**
```
[Prisma] SELECT * FROM gamification_settings WHERE key = $1
[Prisma] UPDATE gamification_settings SET value = $1 WHERE key = $2
[Prisma] INSERT INTO training_samples (user_id, text, intent, ...) VALUES (...)
```

---

### 6. CORS Logging

**Server Startup:**
```
[Bootstrap] ✅ CORS enabled for frontend origins
[Bootstrap] 🚀 Mangwale AI running on port 3200
[Bootstrap] 🌍 Environment: development
[Bootstrap] 🔗 Health check: http://localhost:3200/health
```

---

## 📁 Where to Find Logs

### Development Mode

**Option 1: Terminal Output**
```bash
cd /home/ubuntu/Devs/mangwale-ai
npm run start:dev
# Watch logs in real-time in terminal
```

**Option 2: Log Files**
```bash
# Backend logs
tail -f /tmp/mangwale-backend*.log

# Or if using PM2
pm2 logs mangwale-ai
```

**Option 3: Docker Logs**
```bash
docker logs mangwale-ai-backend -f
```

### Production Mode

**PM2 Logs:**
```bash
pm2 logs mangwale-ai --lines 100
pm2 logs mangwale-ai --err  # Errors only
pm2 logs mangwale-ai --out  # Standard output only
```

**Log Files Location:**
```
~/.pm2/logs/mangwale-ai-out.log
~/.pm2/logs/mangwale-ai-error.log
```

---

## 🧪 Test Logging

### Automated Test Script

```bash
cd /home/ubuntu/Devs/mangwale-ai
chmod +x test-logging-demo.sh
./test-logging-demo.sh
```

This will trigger all endpoints and show you the logs in action.

### Manual Testing

**Terminal 1 - Watch Logs:**
```bash
cd /home/ubuntu/Devs/mangwale-ai
npm run start:dev | grep -E "Gamification|Stats|Settings|Training"
```

**Terminal 2 - Trigger Requests:**
```bash
# Test stats endpoint
curl http://localhost:3200/api/gamification/stats

# Test settings endpoint
curl http://localhost:3200/api/gamification/settings

# Test update
curl -X PUT http://localhost:3200/api/gamification/settings \
  -H "Content-Type: application/json" \
  -d '{"settings":[{"key":"reward_intent_quest","value":"20"}]}'
```

---

## 📊 Dashboard Error Display

### Browser Console

Open browser DevTools (F12) and check:

**Console Tab:**
- Frontend errors and warnings
- API call logs
- React component logs

**Network Tab:**
- All API requests
- Response status codes
- Response times
- Request/response headers

**Example - Good Request:**
```
GET http://localhost:3200/api/gamification/settings
Status: 200 OK
Time: 8ms
Response: {"success":true,"data":...}
```

**Example - CORS Error (Fixed):**
```
✅ Before Fix:
Access to fetch at 'http://localhost:3200/api/gamification/settings' 
has been blocked by CORS policy

✅ After Fix:
Status: 200 OK
Access-Control-Allow-Origin: http://localhost:3000
```

---

## 🐛 Debugging Guide

### Problem: Settings Page Not Loading

**Check 1: Backend Running**
```bash
lsof -i :3200
# Should show node process
```

**Check 2: CORS Configured**
```bash
curl -v -H "Origin: http://localhost:3000" \
     http://localhost:3200/api/gamification/settings 2>&1 | grep "Access-Control"
# Should show: Access-Control-Allow-Origin: http://localhost:3000
```

**Check 3: API Response**
```bash
curl -s http://localhost:3200/api/gamification/settings | jq '.success'
# Should show: true
```

**Check 4: Backend Logs**
```bash
# Look for errors
grep -i "error\|failed" /tmp/mangwale-backend*.log
```

---

### Problem: Training Samples Not Showing

**Check Database:**
```bash
curl http://localhost:3200/api/gamification/training-samples/stats | jq '.data.total'
# Shows count
```

**Check Logs:**
```bash
# Look for training sample creation
grep "Training sample" /tmp/mangwale-backend*.log
```

---

### Problem: Game Not Starting

**Check Logs:**
```bash
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"debug_user","text":"play game"}'

# Then check backend logs:
grep "debug_user\|play game" /tmp/mangwale-backend*.log
```

---

## 📈 Performance Monitoring

### Response Time Tracking

All API responses include `responseTimeMs`:

```json
{
  "success": true,
  "data": {...},
  "meta": {
    "responseTimeMs": 8,
    "timestamp": "2025-11-20T16:15:30.123Z"
  }
}
```

**Benchmark Goals:**
- Settings API: < 20ms ✅
- Stats API: < 50ms ✅
- Training Samples: < 100ms ✅
- Game Processing: < 500ms ✅

### Query Performance

**Slow Query Logging:**
```
[WARN] Query took 250ms: SELECT * FROM training_samples WHERE ...
```

If you see queries > 100ms, consider:
1. Adding database indexes
2. Implementing caching
3. Optimizing query logic

---

## 🔔 Error Alerts

### Critical Errors Logged

**Database Connection Lost:**
```
[ERROR] ❌ Database connection failed: Connection timeout
[ERROR] Retrying connection in 5s...
```

**API Endpoint Failed:**
```
[ERROR] ❌ Failed to fetch settings: TypeError: Cannot read property...
  at GamificationSettingsController.getAllSettings (/src/...)
```

**CORS Blocked:**
```
[ERROR] ❌ CORS blocked request from origin: https://unknown-site.com
```

---

## 📝 Log Retention

**Development:**
- Console logs: Real-time only
- File logs: Rotate daily (keep 7 days)

**Production:**
- PM2 logs: Rotate at 10MB (keep 10 files)
- Error logs: Never auto-delete
- Access logs: Keep 30 days

---

## 🎯 Best Practices

1. **Always check logs first** when debugging
2. **Use emoji indicators** to quickly scan logs
3. **Monitor response times** in production
4. **Set up alerts** for error rates > 5%
5. **Keep logs for 30+ days** for audit trails

---

## 🚀 Quick Commands Reference

```bash
# View real-time logs
npm run start:dev

# Grep for specific endpoint
npm run start:dev | grep "gamification"

# Check errors only
npm run start:dev 2>&1 | grep "ERROR"

# Performance monitoring
npm run start:dev | grep "ms"

# CORS debugging
npm run start:dev | grep "CORS\|origin"
```

---

## ✅ Logging Verification Checklist

- [x] All API endpoints log requests
- [x] All responses log success/failure
- [x] Response times tracked
- [x] Errors include stack traces
- [x] CORS logs enabled
- [x] Database queries logged (via Prisma)
- [x] Game flow fully logged
- [x] Training sample creation logged
- [x] Reward crediting logged
- [x] Emoji indicators for easy scanning

---

**🎉 Complete logging system implemented!**

To see it in action:
```bash
cd /home/ubuntu/Devs/mangwale-ai
./test-logging-demo.sh
```
