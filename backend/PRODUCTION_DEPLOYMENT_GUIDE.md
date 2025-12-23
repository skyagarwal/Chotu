# Production Deployment Guide for chat.mangwale.ai

## ✅ System Status (As of Test)

All systems are **FULLY OPERATIONAL** and tested:

- ✅ **Backend API**: http://localhost:3200 (Healthy)
- ✅ **Frontend Dashboard**: http://localhost:3001 (Accessible)
- ✅ **Chat Endpoint**: POST /chat/send (Working)
- ✅ **Game System**: Integrated in chat flow (Working)
- ✅ **Game API**: POST /api/gamification/games/* (Working)
- ✅ **Questions API**: GET /api/gamification/questions (72 questions loaded)
- ✅ **Session Management**: Working
- ✅ **Admin Dashboard**: http://localhost:3001/admin/gamification/questions (Working)

## 🌐 Production URL Configuration

**Target Domain**: `chat.mangwale.ai`

### Current Configuration

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_API_URL=https://chat.mangwale.ai/api-gateway/api
NEXT_PUBLIC_MANGWALE_AI_URL=http://localhost:3200
NEXTAUTH_URL=https://chat.mangwale.ai
```

**Backend (.env)**:
```env
PORT=3200
NODE_ENV=production
```

## 📋 Deployment Steps

### Option 1: Nginx Reverse Proxy (Recommended)

1. **Install Nginx** (if not already):
```bash
sudo apt update
sudo apt install nginx -y
```

2. **Create Nginx Configuration**:
```bash
sudo nano /etc/nginx/sites-available/chat.mangwale.ai
```

**Configuration Content**:
```nginx
# Frontend (Next.js)
server {
    listen 80;
    server_name chat.mangwale.ai;

    # Redirect to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API (NestJS)
server {
    listen 80;
    server_name api.mangwale.ai;

    location / {
        proxy_pass http://localhost:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# WebSocket Support (if needed)
server {
    listen 80;
    server_name ws.mangwale.ai;

    location / {
        proxy_pass http://localhost:3201;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

3. **Enable Site**:
```bash
sudo ln -s /etc/nginx/sites-available/chat.mangwale.ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Install SSL Certificate** (Let's Encrypt):
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d chat.mangwale.ai -d api.mangwale.ai
```

### Option 2: PM2 with Startup Script

**Already configured!** Services running with PM2:

```bash
# Check status
pm2 status

# Restart services
pm2 restart mangwale-gateway

# Save PM2 config
pm2 save

# Setup auto-start on boot
pm2 startup
```

## 🔧 Environment Variables for Production

### Backend (.env)
```env
# Set to production
NODE_ENV=production
PORT=3200

# Database (already configured)
DATABASE_URL="postgresql://mangwale_config:config_secure_pass_2024@localhost:5432/headless_mangwale?schema=public"

# Redis (already configured)
REDIS_HOST=localhost
REDIS_PORT=6381

# PHP Backend (already configured)
PHP_API_BASE_URL=http://localhost:8090

# AI Services (already configured)
ADMIN_BACKEND_URL=http://localhost:3002
NLU_AI_ENABLED=true
```

### Frontend (.env.local)
Update for production:
```env
# Production API URLs
NEXT_PUBLIC_API_URL=https://api.mangwale.ai
NEXT_PUBLIC_MANGWALE_AI_URL=https://api.mangwale.ai
NEXT_PUBLIC_WS_URL=wss://ws.mangwale.ai

# Production domain
NEXTAUTH_URL=https://chat.mangwale.ai

# Keep other settings same
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAy5piEV4luSuRIv61wM3-a2OB1rSMkswM
```

## 🧪 Testing Production Setup

### 1. Local Testing (Already Working ✅)
```bash
# Run test script
cd /home/ubuntu/Devs/mangwale-ai
./test-complete-chat-system.sh
```

### 2. Production Domain Testing
After DNS/Nginx setup:
```bash
# Test frontend
curl -I https://chat.mangwale.ai

# Test backend API
curl https://api.mangwale.ai/health

# Test chat endpoint
curl -X POST https://api.mangwale.ai/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"test-user","text":"hi"}'
```

### 3. Browser Testing
1. Open `https://chat.mangwale.ai`
2. Type "hi" in chat
3. Type "start game"
4. Choose a game and play
5. Check admin dashboard: `https://chat.mangwale.ai/admin/gamification/questions`

## 📊 Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      chat.mangwale.ai                       │
│                    (Frontend - Port 3001)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     api.mangwale.ai                         │
│                  (Backend API - Port 3200)                  │
│                                                             │
│  • Chat API: /chat/send                                     │
│  • Game System: /api/gamification/games/*                   │
│  • Questions: /api/gamification/questions                   │
│  • Session: /chat/session/:id                               │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
         ┌──────────────────┐  ┌──────────────────┐
         │   PostgreSQL     │  │      Redis       │
         │   (Port 5432)    │  │   (Port 6381)    │
         │                  │  │                  │
         │ • Questions (72) │  │ • Sessions       │
         │ • Game Sessions  │  │ • User State     │
         │ • Training Data  │  │ • Game Progress  │
         └──────────────────┘  └──────────────────┘
```

## 🎮 Game System Flow

```
User in Chat → "start game"
       ↓
Chat API (/chat/send)
       ↓
ConversationService
       ↓
AgentOrchestratorService (detects game intent)
       ↓
GameOrchestratorService
       ↓
Selects Game:
  • Intent Quest (₹15 reward)
  • Language Master (₹15 reward)
  • Tone Detective (₹15 reward)
  • Profile Builder (₹1 per question)
       ↓
Fetches Questions from PostgreSQL
       ↓
Creates Game Session in Redis
       ↓
Returns Question + Options to User
       ↓
User Answers → Validates → Logs Training Data → Next Question
       ↓
After 5 questions → Calculate Score → Award Reward
```

## 🔐 Security Checklist

- [ ] **SSL/TLS Certificate**: Install Let's Encrypt cert for HTTPS
- [ ] **Firewall**: Allow only 80, 443, and SSH ports
- [ ] **Rate Limiting**: Configure Nginx rate limits
- [ ] **CORS**: Verify CORS settings in backend
- [ ] **Environment Variables**: Never commit .env files
- [ ] **Database Backups**: Setup automated backups
- [ ] **Monitoring**: Setup PM2 monitoring or external service

## 🚀 Quick Deploy Commands

```bash
# 1. Ensure services are running
pm2 status

# 2. Restart if needed
pm2 restart mangwale-gateway

# 3. Check logs
pm2 logs mangwale-gateway --lines 50

# 4. Test locally first
./test-complete-chat-system.sh

# 5. Update frontend env for production
cd /home/ubuntu/Devs/mangwale-unified-dashboard
nano .env.local  # Update URLs to production

# 6. Restart frontend
pm2 restart mangwale-dashboard || npm run build && npm start

# 7. Configure Nginx (if not done)
# Follow Option 1 steps above

# 8. Test production
curl https://chat.mangwale.ai
```

## 📞 Support & Troubleshooting

### Common Issues

**1. Frontend not loading**
```bash
# Check if running
pm2 status

# Check logs
pm2 logs --lines 100

# Restart
pm2 restart all
```

**2. API not responding**
```bash
# Test locally first
curl http://localhost:3200/health

# Check if port is open
netstat -tuln | grep 3200

# Check PM2 status
pm2 status mangwale-gateway
```

**3. Games not working**
```bash
# Test direct endpoint
curl -X POST http://localhost:3200/api/gamification/games/start \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"test-123"}'

# Check database connection
psql postgresql://mangwale_config:config_secure_pass_2024@localhost:5432/headless_mangwale -c "SELECT COUNT(*) FROM game_questions;"
```

**4. Sessions not persisting**
```bash
# Check Redis
redis-cli -p 6381 ping

# Check sessions
redis-cli -p 6381 keys "session:*" | wc -l
```

## 📚 Additional Resources

- **Architecture Doc**: `/home/ubuntu/Devs/mangwale-ai/.github/copilot-instructions.md`
- **Game System**: `/home/ubuntu/Devs/mangwale-ai/PHASE_6_COMPLETE_GAME_SYSTEM.md`
- **Admin UI**: `/home/ubuntu/Devs/mangwale-ai/PHASE_7_ADMIN_QUESTIONS_UI.md`
- **Test Script**: `/home/ubuntu/Devs/mangwale-ai/test-complete-chat-system.sh`

## ✅ Production Checklist

- [x] Backend running on port 3200
- [x] Frontend running on port 3001
- [x] Chat API tested and working
- [x] Game system integrated
- [x] 72 questions loaded in database
- [x] Session management working
- [x] Admin dashboard functional
- [ ] DNS configured to point chat.mangwale.ai to server
- [ ] Nginx reverse proxy configured
- [ ] SSL certificates installed
- [ ] Rate limiting configured
- [ ] Monitoring setup
- [ ] Backup strategy in place

---

**Last Updated**: $(date)
**Status**: ✅ All systems operational locally, ready for production deployment
