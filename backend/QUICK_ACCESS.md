# 🚀 Headless Mangwale - Quick Access Guide

## ✅ System Status: OPERATIONAL

All services are running with the new **Headless Mangwale** branding!

---

## 🌐 Access URLs

### **Local Development (Active Now)**

| Service | URL | Status |
|---------|-----|--------|
| **Frontend Dashboard** | http://localhost:3001 | ✅ Running |
| **API Gateway** | http://localhost:4001 | ✅ Running |
| **API Documentation** | http://localhost:4001/api/docs | ✅ Available |
| **Health Check** | http://localhost:4001/api/health | ✅ Healthy |
| **PostgreSQL** | localhost:5432 | ✅ Healthy |
| **Redis** | localhost:6381 | ✅ Healthy |

### **Production Domains (When DNS Configured)**

| Service | Domain | Purpose |
|---------|--------|---------|
| **Frontend** | https://headless.mangwale.com | Customer & Admin Dashboard |
| **API Gateway** | https://api.mangwale.com | REST API & WebSocket |
| **WhatsApp Webhook** | https://headless.mangwale.com/webhook | Meta Cloud API Integration |

---

## 🎯 Quick Test Commands

### Check System Health
```bash
# API Gateway Health (with new branding!)
curl http://localhost:4001/api/health | jq .

# Expected output:
# {
#   "status": "ok",
#   "service": "Headless Mangwale API Gateway",  ← NEW BRANDING
#   "timestamp": "2025-10-24T...",
#   "uptime": 123,
#   "environment": "production",
#   "phpBackend": "http://mangwale_php:8090"
# }

# Frontend Accessibility
curl -I http://localhost:3001

# Should return: 200 OK with "Headless Mangwale Admin" in title
```

### View Container Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### View Logs
```bash
# API Gateway logs (shows "HEADLESS MANGWALE API GATEWAY")
docker logs -f mangwale_api_gateway

# Frontend logs
docker logs -f mangwale_frontend

# All services
docker-compose logs -f
```

---

## 🔄 Service Management

### Start All Services
```bash
cd /home/ubuntu/Devs/whatsapp-parcel-service
docker-compose up -d
```

### Stop All Services
```bash
docker-compose down
```

### Restart Specific Service
```bash
docker-compose restart api-gateway
docker-compose restart frontend
```

### Rebuild After Changes
```bash
# Rebuild specific service
docker-compose build api-gateway
docker-compose up -d api-gateway

# Rebuild all
docker-compose build
docker-compose up -d
```

---

## 📊 What Changed in Rebranding

### ✅ Updated Files

1. **Configuration**
   - `.env` → APP_NAME="Headless Mangwale"
   - `.env.production` → Updated
   - `.env.backup` → Updated
   - `src/config/configuration.ts` → Default name updated
   - `package.json` → Package name: "headless-mangwale"

2. **Documentation**
   - `README.md` → Complete rewrite with new architecture
   - New: `REBRANDING_COMPLETE.md` (detailed guide)
   - New: `QUICK_ACCESS.md` (this file)

3. **Docker**
   - `docker-compose.yml` → Already configured for:
     - `headless.mangwale.com` (frontend)
     - `api.mangwale.com` (API Gateway)

### ✅ Verified Working

- ✅ API Gateway displays: "🚀 HEADLESS MANGWALE API GATEWAY"
- ✅ Health endpoint returns: `"service": "Headless Mangwale API Gateway"`
- ✅ Frontend title: "Headless Mangwale Admin"
- ✅ All containers healthy
- ✅ Services accessible on all ports

---

## 🎨 Branding Overview

### Old Name
❌ "WhatsApp Parcel Service"
- Single-channel focus
- Limited scope

### New Name
✅ "Headless Mangwale"
- Multi-channel platform
- Professional, scalable
- Aligned with headless architecture
- Clear domain structure

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  HEADLESS MANGWALE                       │
│           Multi-Channel Ordering Platform                │
└─────────────────────────────────────────────────────────┘

CLIENT CHANNELS
┌──────────┬───────────┬─────────┬──────────────┐
│ WhatsApp │    Web    │   RCS   │   Telegram   │
│  (Live)  │  (Live)   │ (Future)│   (Future)   │
└──────────┴───────────┴─────────┴──────────────┘
                    ↓
        ┌───────────────────────┐
        │   API GATEWAY (4001)  │ ← NestJS
        │  api.mangwale.com     │   TypeScript
        │  17 PHP Services      │   PostgreSQL
        └───────────────────────┘   Redis
                    ↓
        ┌───────────────────────┐
        │  PHP BACKEND (8090)   │ ← Laravel
        │  testing.mangwale.com │   MySQL
        │  Business Logic       │
        └───────────────────────┘
```

---

## 📚 Key Features

### Current (100% Complete)
- ✅ WhatsApp conversational ordering
- ✅ Web dashboard (Next.js 16.0.0)
- ✅ API Gateway with 17 PHP services
- ✅ ~90% PHP API coverage (140+ methods)
- ✅ Real-time WebSocket updates
- ✅ PostgreSQL + MySQL + Redis
- ✅ Docker containerization
- ✅ Traefik reverse proxy
- ✅ Health monitoring

### Future Enhancements
- 🔮 RCS messaging
- 🔮 Telegram bot
- 🔮 Instagram Direct
- 🔮 Voice ordering (Alexa/Google)

---

## 🚀 Next Steps

### For Development
1. ✅ Services running → Ready to develop
2. ✅ Frontend at localhost:3001 → Build features
3. ✅ API Gateway at localhost:4001 → Add endpoints
4. ✅ Swagger docs at localhost:4001/api/docs → Test APIs

### For Production
1. ⏳ Configure DNS:
   - `headless.mangwale.com` → Your server IP
   - `api.mangwale.com` → Your server IP

2. ⏳ Traefik will automatically:
   - Generate SSL certificates (Let's Encrypt)
   - Enable HTTPS redirect
   - Route traffic correctly

3. ⏳ Update WhatsApp webhook:
   - New URL: `https://headless.mangwale.com/webhook/whatsapp`

4. ⏳ Test end-to-end in production

---

## 💡 Tips

### Useful Commands
```bash
# Quick health check
curl http://localhost:4001/api/health | jq .service

# View all PHP services available
curl http://localhost:4001/api/docs

# Test WebSocket (if supported by client)
wscat -c ws://localhost:4001

# Check database connectivity
docker exec -it mangwale_postgres psql -U mangwale_config -d headless_mangwale

# Check Redis sessions
docker exec -it whatsapp_redis redis-cli
```

### Troubleshooting
```bash
# If service won't start
docker-compose logs <service-name>

# If port conflict
docker-compose down
# Change ports in docker-compose.yml
docker-compose up -d

# If database connection issues
docker exec -it mangwale_postgres pg_isready

# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 📞 Support

- **Documentation**: See `/whatsapp-parcel-service/` folder
- **API Docs**: http://localhost:4001/api/docs
- **Health Status**: http://localhost:4001/api/health
- **Logs**: `docker-compose logs -f`

---

## 🎉 Summary

✅ **Rebranding Complete!**
✅ **All Services Operational**
✅ **New Name: Headless Mangwale**
✅ **Frontend: headless.mangwale.com**
✅ **API: api.mangwale.com**

Your system is now professionally branded and ready for multi-channel deployment!

---

*Last Updated: October 24, 2025*
*System Version: 1.0.0 (Headless Mangwale)*
