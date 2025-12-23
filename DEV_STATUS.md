# Development Environment - Current Status

## ✅ What's Working

### Production Containers
Both backend and frontend are running in production mode with all fixes applied:
- Backend: `mangwale_ai_service` on port 3200
- Frontend: `mangwale-dashboard` on port 3005
- All authentication fixes are live
- All frontend fixes are live

### Quick Development Script
Created `start-dev.sh` which starts:
- Backend: Using existing production image (prebuilt)
- Frontend: Live development mode with hot-reload

## ⚠️ Current Limitations

### Backend Development
The backend production image contains prebuilt TypeScript→JavaScript code. To enable true hot-reload development for the backend, you have two options:

**Option 1: Rebuild When Needed (Current Approach)**
- Make changes to `backend/src/`
- Run: `cd backend && docker build -t mangwale-ai-mangwale-ai:latest .`  
- Wait 2-3 minutes for rebuild
- Restart: `docker restart mangwale_ai_service`

**Option 2: Native Development (Faster)**
- Install Node.js 20 locally
- Run directly without Docker:
  ```bash
  cd backend
  npm install
  npm run start:dev
  ```
- Changes reload in 2-3 seconds
- Use Docker only for dependencies (Postgres, Redis)

### Frontend Development
✅ **WORKING** - Frontend has proper hot-reload:
```bash
./start-dev.sh
```
- Frontend runs in development mode
- Changes to `frontend/src/` reload instantly
- Uses Next.js Fast Refresh

## 📝 Recommended Development Workflow

### For Quick Frontend Changes
1. Start: `./start-dev.sh`
2. Edit `frontend/src/*`
3. See changes instantly at http://localhost:3005

### For Backend Changes

**Quick Iteration (Recommended):**
```bash
# Run backend natively
cd backend
npm install
npm run start:dev  # Watches for changes

# Keep Docker running for dependencies only
docker start mangwale_postgres mangwale_redis
```

**Docker Rebuild (When needed):**
```bash
# After making changes
cd backend  
docker build -t mangwale-ai-mangwale-ai:latest .
docker restart mangwale_ai_service
```

### For Testing End-to-End
```bash
# Start all services
docker start mangwale_ai_service mangwale-dashboard mangwale_postgres mangwale_redis

# Access:
# - Backend: http://localhost:3200
# - Frontend: http://localhost:3005
```

## 🛠️ Available Scripts

- **`start-dev.sh`** - Start frontend in dev mode (instant hot-reload)
- **`dev-stop.sh`** - Stop development containers  
- **`dev-logs.sh`** - View logs
- **`dev-restart.sh`** - Restart services
- **`dev-status.sh`** - Check service health

## 🎯 Next Steps

1. **For Active Development:**
   - Run backend natively (fastest iteration)
   - Run frontend via `start-dev.sh` (hot-reload)
   
2. **For Testing:**
   - Use Docker production containers
   - Test full flow end-to-end

3. **Before Deployment:**
   - Rebuild both images
   - Test in Docker environment
   - Verify all features work

## 💡 Pro Tips

- **Clear cache** when testing fixes: Ctrl+Shift+R (hard refresh)
- **Check logs** for errors: `docker logs -f mangwale_ai_service`
- **Quick restart**: `docker restart mangwale_ai_service mangwale-dashboard`
- **Native development** is 10x faster for iteration

## ❓ Why Native Development?

The production Docker images are optimized for deployment, not development:
- Backend: TypeScript compiled to JavaScript (no source maps)
- Build time: 2-3 minutes per change
- File watching: Complex with Docker volumes
- Permission issues: Root vs non-root users

Native development gives you:
- Instant feedback (2-3 seconds)
- Full TypeScript support
- Better IDE integration
- No Docker overhead

## 🚀 Getting Started

**Today's Quickest Path:**
```bash
# Terminal 1: Backend (native)
cd backend
npm run start:dev

# Terminal 2: Frontend (Docker)
./start-dev.sh

# Open browser
http://localhost:3005
```

This gives you the best of both worlds: fast iteration and production-like environment.
