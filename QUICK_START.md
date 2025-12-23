# 🚀 MANGWALE AI - FAST DEVELOPMENT SETUP

## ✅ Development Environment Ready!

Your development environment is now configured for **fast, robust iteration** with:
- ✅ Hot-reload on both backend and frontend
- ✅ No container crashes from file changes
- ✅ Instant feedback on code changes
- ✅ Simple restart commands
- ✅ Clear logging and debugging

---

## 🎯 QUICK START

### Start Development
```bash
cd /home/ubuntu/Devs/MangwaleAI
./dev-start-simple.sh
```

### Check Status
```bash
./dev-status.sh
```

### View Logs
```bash
# Backend
docker logs -f mangwale_ai_dev

# Frontend  
docker logs -f mangwale_dashboard_dev
```

### Stop Everything
```bash
docker stop mangwale_ai_dev mangwale_dashboard_dev
```

---

## 🔥 HOT RELOAD - HOW IT WORKS

### Backend Changes
1. Edit any file in `backend/src/`
2. NestJS automatically detects changes
3. Server restarts in ~2-3 seconds
4. API immediately available with new code

**Example:**
```bash
# Edit a file
vim backend/src/flow-engine/flows/auth.flow.ts

# Changes detected automatically!
# No manual restart needed
```

### Frontend Changes
1. Edit any file in `frontend/src/`
2. Next.js Fast Refresh kicks in
3. Browser updates in <1 second
4. Component state preserved

**Example:**
```bash
# Edit a component
vim frontend/src/app/(public)/chat/page.tsx

# Browser auto-refreshes!
# See changes instantly
```

---

## 🛠️ DEVELOPMENT WORKFLOW

### 1. Working on Backend
```bash
# Start if not running
./dev-start-simple.sh

# Edit code
vim backend/src/...

# Watch logs for errors
docker logs -f mangwale_ai_dev

# If something breaks, just restart
docker restart mangwale_ai_dev
```

### 2. Working on Frontend
```bash
# Edit code
vim frontend/src/...

# Changes appear immediately in browser
# Open: http://localhost:3005

# If stuck, restart
docker restart mangwale_dashboard_dev
```

### 3. Testing End-to-End
```bash
# Both services running:
- Backend: http://localhost:3200
- Frontend: http://localhost:3005

# Make changes in either
# Test immediately
# No deployment needed!
```

---

## 🚨 IF SOMETHING BREAKS

### Backend Not Responding
```bash
# Check logs
docker logs mangwale_ai_dev --tail 100

# Restart
docker restart mangwale_ai_dev

# Still broken? Force recreate
docker rm -f mangwale_ai_dev
./dev-start-simple.sh
```

### Frontend Not Responding
```bash
# Check logs
docker logs mangwale_dashboard_dev --tail 100

# Restart
docker restart mangwale_dashboard_dev

# Clear Next.js cache if needed
docker exec mangwale_dashboard_dev rm -rf /app/.next
docker restart mangwale_dashboard_dev
```

### Port Already in Use
```bash
# Find what's using the port
sudo lsof -i :3200  # Backend
sudo lsof -i :3005  # Frontend

# Kill it
kill -9 <PID>

# Or stop all containers
docker stop $(docker ps -q)
```

---

## 📊 MONITORING & DEBUGGING

### Health Checks
```bash
# Backend
curl http://localhost:3200/health

# Frontend
curl http://localhost:3005
```

### Container Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Resource Usage
```bash
docker stats mangwale_ai_dev mangwale_dashboard_dev
```

### Backend Debug Port
The backend exposes port **9229** for debugging.

**VS Code launch.json:**
```json
{
  "type": "node",
  "request": "attach",
  "name": "Debug Backend",
  "port": 9229,
  "restart": true
}
```

---

## 💡 PRO TIPS

### 1. Keep Logs Open
```bash
# Terminal 1: Backend logs
docker logs -f mangwale_ai_dev

# Terminal 2: Frontend logs
docker logs -f mangwale_dashboard_dev

# Terminal 3: Your editor
```

### 2. Quick Restart After Big Changes
```bash
# Restart both services
docker restart mangwale_ai_dev mangwale_dashboard_dev
```

### 3. Clean Start If Stuck
```bash
# Nuclear option - clean everything
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
./dev-start-simple.sh
```

### 4. Test Production Build
```bash
# Stop dev containers
docker stop mangwale_ai_dev mangwale_dashboard_dev

# Start production
docker start mangwale_ai_service mangwale-dashboard

# Switch back to dev
docker stop mangwale_ai_service mangwale-dashboard
./dev-start-simple.sh
```

---

## 🎨 WHAT'S DIFFERENT FROM BEFORE?

### ❌ OLD WAY (Problematic)
- Container crashes on file changes
- Had to rebuild Docker images
- 5-10 minute deployment cycles
- Lost work when containers died
- Unclear error messages

### ✅ NEW WAY (Fast & Robust)
- Hot reload - changes apply instantly
- No rebuilds needed
- 2-3 second feedback loop
- Containers auto-restart on crashes
- Clear logs and debugging
- Read-only volume mounts (safer)

---

## 📁 PROJECT STRUCTURE

```
MangwaleAI/
├── backend/
│   ├── src/              ← Edit here, auto-reloads!
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/              ← Edit here, auto-refreshes!
│   ├── public/
│   └── package.json
│
├── dev-start-simple.sh   ← Start dev environment
├── dev-status.sh         ← Check status
└── DEV_GUIDE.md          ← This file!
```

---

## 🔐 ENVIRONMENT VARIABLES

Development uses these defaults:
- `NODE_ENV=development`
- `PORT=3200` (backend)
- `REDIS_HOST=mangwale_redis`
- `POSTGRES_HOST=mangwale_postgres`

To override, edit the start script or use `.env` files.

---

## 📦 DEPENDENCIES

Running services:
- **Backend Dev**: mangwale_ai_dev (port 3200)
- **Frontend Dev**: mangwale_dashboard_dev (port 3005)
- **PostgreSQL**: mangwale_postgres (port 5432)
- **Redis**: mangwale_redis (port 6381)

These start automatically with the dev environment.

---

## ✨ SUMMARY

You now have a **professional development setup** that lets you:

1. ✅ **Edit and test instantly** - No waiting for rebuilds
2. ✅ **See errors immediately** - Live logs in terminal
3. ✅ **Debug easily** - Debug port exposed
4. ✅ **Recover from crashes** - Simple restart commands
5. ✅ **Focus on building** - Not on deployment issues

**Your new workflow:**
```bash
./dev-start-simple.sh     # Once per session
vim backend/src/...       # Edit code
# Changes apply automatically!
docker logs -f mangwale_ai_dev  # Watch it work
```

**That's it!** No more container crashes, no more rebuild cycles, no more waiting.

---

## 🆘 NEED HELP?

```bash
# Quick status check
./dev-status.sh

# View this guide
cat DEV_GUIDE.md

# Emergency restart
docker restart mangwale_ai_dev mangwale_dashboard_dev
```

---

**Happy coding! 🚀**
