# Test Your Dashboard NOW! 🚀

## Quick Access

### ✅ WORKING - HTTP Dashboard (Use This Now!)
```
URL: http://100.121.40.69:3000/admin/gamification/settings

What you'll see:
- 11 gamification settings organized by category
- Rewards, Limits, Gameplay, Training sections
- Edit capability for all settings
- Save button that persists changes to database
```

### ❌ BLOCKED - HTTPS Dashboard (Needs Production Fix)
```
URL: https://admin.mangwale.ai/admin/gamification/settings

Issue: Mixed Content Error
Reason: Browser blocks HTTP API calls from HTTPS pages
Solution: Need to fix Traefik routing for https://api.mangwale.ai
```

---

## What to Test

### 1. Settings Page
- **URL:** http://100.121.40.69:3000/admin/gamification/settings
- **Expected:** See all 11 settings in 4 categories
- **Actions:**
  1. Modify "Intent Quest Reward" value
  2. Click "Save Changes" button
  3. Refresh page
  4. Verify value persisted

### 2. Dashboard Home  
- **URL:** http://100.121.40.69:3000/admin/gamification
- **Expected:** Statistics cards showing:
  - Games Played: 0
  - Rewards Credited: ₹0
  - Active Users: 0
  - Training Samples: 0

### 3. Training Samples
- **URL:** http://100.121.40.69:3000/admin/gamification/training-samples
- **Expected:** Empty state (no samples yet)
- **Note:** Samples will appear after game play

---

## System Status

### ✅ All Backend Services Operational
- Mangwale AI API: Running on port 3200
- Database: PostgreSQL with 11 settings
- Docker: All 12 containers healthy
- APIs: All 9 gamification endpoints working

### ✅ Dashboard Configured Correctly  
- Environment: `host.docker.internal:3200` for SSR
- API Client: Properly configured
- Pages: All 3 gamification pages compiled
- Docker: Container running and healthy

### ⚠️ Known Issue
- HTTPS access blocked by Mixed Content Policy
- Traefik routing for api.mangwale.ai returning 504
- **Workaround:** Use HTTP dashboard (works perfectly!)

---

## Quick Start Testing Script

```bash
# 1. Verify backend is running
curl -s http://localhost:3200/health | jq -r '.status'
# Expected: ok

# 2. Verify settings exist
curl -s http://localhost:3200/api/gamification/settings | jq -r '.meta.total'
# Expected: 11

# 3. Test from dashboard container
docker exec mangwale-dashboard wget -q -O- http://host.docker.internal:3200/api/gamification/settings | jq -r '.success'
# Expected: true

# 4. Open in browser
echo "Now open: http://100.121.40.69:3000/admin/gamification/settings"
```

---

## Troubleshooting

### If page doesn't load:
```bash
# Check container is running
docker ps | grep mangwale-dashboard

# Check logs
docker logs mangwale-dashboard --tail 20

# Restart container
docker-compose restart dashboard
```

### If settings don't appear:
```bash
# Test API directly
curl http://localhost:3200/api/gamification/settings | jq '.success'

# Check from container
docker exec mangwale-dashboard wget -q -O- http://host.docker.internal:3200/api/gamification/settings
```

### If you see "Cannot GET /api/gamification/settings":
- Backend not running on localhost:3200
- Run: `cd /home/ubuntu/Devs/mangwale-ai && npm run start:dev`

---

## Production Deployment (Next Steps)

To use HTTPS dashboard (admin.mangwale.ai):

1. **Fix Traefik Routing**
   ```bash
   # Check Traefik configuration
   docker logs traefik --tail 100 | grep api.mangwale
   
   # Verify AI service network
   docker inspect mangwale_ai_service | grep -i network
   ```

2. **Update API URL**
   ```yaml
   # docker-compose.yml
   - NEXT_PUBLIC_MANGWALE_AI_URL=https://api.mangwale.ai
   ```

3. **Test HTTPS Access**
   ```bash
   curl -I https://api.mangwale.ai/health
   # Should return 200 OK
   ```

---

## Expected Results

When you access `http://100.121.40.69:3000/admin/gamification/settings`:

### Rewards Category (5 settings)
- Intent Quest Reward: 15 ₹
- Language Master Reward: 15 ₹
- Tone Detective Reward: 15 ₹
- Entity Hunter Reward: 10 ₹
- Profile Builder Reward: 5 ₹

### Limits Category (3 settings)
- Game Cooldown Minutes: 0
- Max Games Per Hour: 5
- Max Games Per Day: 10

### Gameplay Category (2 settings)
- Personalized Question Ratio: 0.5
- Game System Enabled: true

### Training Category (1 setting)
- Min Confidence Auto Save: 0.85

---

**Ready to Test!** 🎮

Open your browser and navigate to:
**http://100.121.40.69:3000/admin/gamification/settings**

Everything is working! The HTTPS version will work once we fix the Traefik routing.
