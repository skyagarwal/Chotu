# 🚀 Quick Start Guide

## 📋 Prerequisites Check

✅ Docker installed  
✅ Docker Compose installed  
✅ Meta WhatsApp Business Account  
✅ WhatsApp Cloud API app created  
✅ Permanent access token generated  

## ⚡ 5-Minute Setup

### Step 1: Configure WhatsApp Credentials (2 min)

```bash
cd /home/ubuntu/Devs/whatsapp-parcel-service
nano .env
```

Update these values:
```env
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAABsbCS...your_token
```

Save and exit (Ctrl+X, Y, Enter)

### Step 2: Install & Build (2 min)

```bash
# Run automated setup
./setup.sh
```

**OR manually:**
```bash
npm install
npm run build
docker-compose up -d
```

### Step 3: Verify (1 min)

```bash
# Check health
curl http://localhost:3000/health

# Check webhook
curl "http://localhost:3000/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=mangwale_secure_token_2024&hub.challenge=test"

# View logs
docker-compose logs -f whatsapp-service
```

## 🌐 Meta Webhook Configuration

1. Go to: https://developers.facebook.com/apps
2. Select your WhatsApp app
3. WhatsApp → Configuration → Webhook
4. Set:
   - Callback URL: `https://your-domain.com/webhook/whatsapp`
   - Verify Token: `mangwale_secure_token_2024`
   - Subscribe: `messages`, `message_status`
5. Click "Verify and Save"

## 🧪 Test It!

```
1. Send "hi" to your WhatsApp Business number
2. Bot responds: "Welcome! What would you like to do?"
3. Select: "📦 Send a Parcel"
4. Follow the conversation
5. Order created! 🎉
```

## 📊 Monitor

```bash
# View all logs
docker-compose logs -f

# Check Redis sessions
docker exec -it whatsapp_redis redis-cli
> KEYS wa:session:*

# Check containers
docker-compose ps
```

## 🎯 Success Criteria

✅ Health endpoint returns 200  
✅ Webhook verification works  
✅ Bot responds to "hi"  
✅ Conversation flow works  
✅ Orders created in PHP backend  

## 🆘 Troubleshooting

### Bot doesn't respond
```bash
# Check logs
docker-compose logs whatsapp-service | grep ERROR

# Verify webhook in Meta
# Check WhatsApp credentials in .env
```

### Order creation fails
```bash
# Check PHP backend is accessible
curl https://testing.mangwale.com/api/v1/parcel-category

# Check logs for API errors
docker-compose logs whatsapp-service | grep "PHP API"
```

---

**Ready to go live! 🚀**
