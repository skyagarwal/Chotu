# Mangwale AI - Development Guide

## 🚀 Quick Start Development Mode

### Start Development Environment
```bash
chmod +x dev-*.sh
./dev-start.sh
```

This will:
- Stop production containers (if running)
- Start backend with **hot-reload** on port 3200
- Start frontend with **Fast Refresh** on port 3005
- Wait for services to be healthy
- Show status dashboard

### Stop Development Environment
```bash
./dev-stop.sh
```

### View Live Logs
```bash
./dev-logs.sh
```

### Restart Services
```bash
./dev-restart.sh backend   # Restart only backend
./dev-restart.sh frontend  # Restart only frontend
./dev-restart.sh both      # Restart both
```

## 📝 Development Workflow

### Backend Development
1. Edit files in `backend/src/`
2. Changes auto-reload (via NestJS watch mode)
3. No manual restart needed!

**If backend crashes:**
```bash
# Check logs
docker logs mangwale_ai_dev --tail 50

# Restart if needed
docker restart mangwale_ai_dev
```

### Frontend Development
1. Edit files in `frontend/src/`
2. Next.js Fast Refresh applies changes instantly
3. Browser auto-refreshes on save

**If frontend crashes:**
```bash
# Check logs
docker logs mangwale_dashboard_dev --tail 50

# Restart if needed
docker restart mangwale_dashboard_dev
```

## 🔍 Debugging

### Backend Debug Mode
The backend runs with debug port **9229** exposed. Connect your IDE:

**VS Code launch.json:**
```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Backend",
  "port": 9229,
  "restart": true,
  "sourceMaps": true
}
```

### Check Health
```bash
# Backend
curl http://localhost:3200/health

# Frontend
curl http://localhost:3005
```

### Check Container Status
```bash
docker ps --filter "name=mangwale.*dev"
```

## 🛠️ Common Issues & Fixes

### Issue: Container keeps crashing
**Solution:**
```bash
# View error logs
docker logs mangwale_ai_dev --tail 100

# Check if ports are in use
sudo lsof -i :3200
sudo lsof -i :3005

# Force clean restart
./dev-stop.sh
docker system prune -f
./dev-start.sh
```

### Issue: Changes not reflecting
**Backend:**
```bash
# Ensure watch mode is working
docker logs mangwale_ai_dev | grep "watching"

# Force restart
docker restart mangwale_ai_dev
```

**Frontend:**
```bash
# Clear Next.js cache
docker exec mangwale_dashboard_dev rm -rf /app/.next
docker restart mangwale_dashboard_dev
```

### Issue: Out of memory
```bash
# Check container stats
docker stats mangwale_ai_dev mangwale_dashboard_dev

# Increase memory limit in docker-compose.dev.yml:
# Add under service:
#   mem_limit: 2g
#   memswap_limit: 2g
```

## 📊 Development URLs

- **Frontend:** http://localhost:3005
- **Backend API:** http://localhost:3200
- **Backend Health:** http://localhost:3200/health
- **Backend Debug:** localhost:9229
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6381

## 🔥 Hot Reload Features

### Backend (NestJS)
- ✅ TypeScript auto-compilation
- ✅ Instant reload on file save
- ✅ Preserves breakpoints
- ✅ No manual restart needed

### Frontend (Next.js)
- ✅ Fast Refresh (React)
- ✅ CSS/Tailwind hot reload
- ✅ Component state preserved
- ✅ Error overlay in browser

## 📦 Volume Mounts (Development)

**Backend:**
- `./src` → Auto-reload on changes
- `./libs` → Shared libraries
- `node_modules` → Isolated in container

**Frontend:**
- `./src` → Fast Refresh enabled
- `./public` → Static files
- `.next` → Build cache (isolated)

## 🎯 Best Practices

1. **Always use dev mode for development**
   - Faster builds
   - Better error messages
   - Hot reload enabled

2. **Check logs when things go wrong**
   ```bash
   ./dev-logs.sh
   ```

3. **Clean restart if stuck**
   ```bash
   ./dev-stop.sh && ./dev-start.sh
   ```

4. **Use production mode only for testing**
   ```bash
   docker-compose up -d  # Production
   ```

## 🚨 Emergency Commands

```bash
# Kill all Mangwale containers
docker stop $(docker ps -q --filter "name=mangwale")

# Clean everything and restart fresh
docker-compose -f backend/docker-compose.dev.yml down -v
docker-compose -f frontend/docker-compose.dev.yml down -v
./dev-start.sh

# Check what's using ports
sudo lsof -i :3200 -i :3005

# Restart Docker daemon (last resort)
sudo systemctl restart docker
```
