# 🚀 Quick Start: Location Request Feature

## ✅ Implementation Status
```
✅ Location Request API - Implemented
✅ Conversation Flow - Updated  
✅ Webhook Handler - Working
✅ Service - Running (Healthy)
✅ Redis - Running (Healthy)
```

## 🔴 BEFORE TESTING - Critical Setup

### You MUST Get Permanent Access Token First!

**Why?** Your temporary token:
- ❌ Expires in 24 hours
- ❌ **Cannot receive webhook messages from real WhatsApp**
- ❌ Only works for sending messages, not receiving

**How?** (Takes 15 minutes)

1. **Open Meta Business Suite:**
   ```
   https://business.facebook.com/settings/system-users
   ```

2. **Create System User:**
   - Click "Add"
   - Name: `WhatsApp API System User`
   - Role: `Admin`
   - Click "Create System User"

3. **Assign App:**
   - Click your system user
   - Click "Add Assets" → "Apps"
   - Select your WhatsApp app
   - Toggle "Full Control" → Save

4. **Generate Token:**
   - Click "Generate New Token"
   - Select your WhatsApp app
   - Check permissions:
     - ✅ `whatsapp_business_management`
     - ✅ `whatsapp_business_messaging`
     - ✅ `business_management`
   - Expiration: **"Never"**
   - Click "Generate Token"
   - **COPY THE TOKEN** (you won't see it again!)

5. **Update Your Files:**

   **File 1:** `/home/ubuntu/Devs/whatsapp-parcel-service/.env`
   ```bash
   WHATSAPP_ACCESS_TOKEN=YOUR_PERMANENT_TOKEN_HERE
   TEST_MODE=false
   ```

   **File 2:** `/home/ubuntu/Devs/whatsapp-parcel-service/docker-compose.yml`
   ```yaml
   environment:
     - WHATSAPP_ACCESS_TOKEN=YOUR_PERMANENT_TOKEN_HERE
     - TEST_MODE=false
   ```

6. **Restart Service:**
   ```bash
   cd /home/ubuntu/Devs/whatsapp-parcel-service
   docker-compose down
   docker-compose up -d
   ```

## 📱 Testing (After Permanent Token)

### Test Flow:

1. **Open WhatsApp** on your phone (919923383838)

2. **Message your business number**

3. **Type:** `hi`

4. **Enter OTP** (you'll receive it)

5. **Type:** `1` (for Local Delivery)

6. **Type:** `bike`

7. **🎉 LOCATION REQUEST BUTTON APPEARS!**
   - Tap "📍 Send Location"
   - Select your location
   - Location sent automatically

8. **🎉 ANOTHER LOCATION REQUEST for delivery**
   - Tap "📍 Send Location" again
   - Select delivery location

9. **Continue with order details:**
   - Parcel description: e.g., "Documents"
   - Recipient name: e.g., "John Doe"
   - Recipient phone: e.g., "1234567890"
   - Weight: e.g., "1kg" or "skip"

10. **Type:** `confirm` to place order

## 📊 Monitor Activity

### Real-time Logs:
```bash
cd /home/ubuntu/Devs/whatsapp-parcel-service
docker-compose logs -f whatsapp-service
```

### Filter for Locations:
```bash
docker-compose logs -f whatsapp-service | grep -E "(Location|📍|latitude)"
```

### Check Session Data:
```bash
curl http://localhost:3000/webhook/whatsapp/session/919923383838 | jq .
```

Expected output:
```json
{
  "phoneNumber": "919923383838",
  "currentStep": "mandatory_fields",
  "pickup_location": "Location: 12.9716,77.5946",
  "pickup_coordinates": {
    "lat": 12.9716,
    "lng": 77.5946
  },
  "delivery_location": "Location: 13.0827,80.2707",
  "delivery_coordinates": {
    "lat": 13.0827,
    "lng": 80.2707
  }
}
```

## 🐛 Troubleshooting

### Problem: No location request button appears

**Solution:**
1. ✅ Confirm you're using **permanent token** (not temp)
2. ✅ Check Meta Dashboard → WhatsApp → Configuration
3. ✅ Verify "messages" webhook field is **subscribed**
4. ✅ Restart service after token update

### Problem: Webhook not receiving messages

**Solution:**
1. ✅ **Get permanent token** (this is the main issue!)
2. ✅ Check webhook URL: `https://headless.mangwale.com/webhook/whatsapp`
3. ✅ Verify webhook fields in Meta Dashboard:
   - ✅ `messages` (must be checked)
   - ✅ `message_status` (optional)
4. ✅ Test webhook: `curl https://headless.mangwale.com/webhook/whatsapp`

### Problem: Service not healthy

**Solution:**
```bash
# Check status
docker-compose ps

# View logs
docker-compose logs whatsapp-service

# Restart
docker-compose restart whatsapp-service
```

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `LOCATION_REQUEST_COMPLETE.md` | Complete summary |
| `LOCATION_REQUEST_SETUP.md` | Technical implementation guide |
| `GET_PERMANENT_TOKEN.md` | Step-by-step token generation |
| `test_location_request.sh` | Automated test script |

## 🎯 What You'll See

### In WhatsApp:
```
🚲 Bike Delivery Selected

📍 Step 1: Pickup Location

Please share your pickup location for accurate delivery.

Tap the button below to send your live location 👇

[📍 Send Location]  ← This button!
```

### After Location Shared:
```
✅ Pickup location saved!

📍 Step 2: Delivery Location

Now share where the parcel should be delivered.

Tap the button below to send the delivery location 👇

[📍 Send Location]  ← Another button!
```

## ✅ Checklist

Before testing, ensure:

- [ ] Got permanent access token from Meta Business Suite
- [ ] Updated `.env` file with permanent token
- [ ] Updated `docker-compose.yml` with permanent token
- [ ] Set `TEST_MODE=false` in both files
- [ ] Restarted service: `docker-compose down && docker-compose up -d`
- [ ] Service shows "healthy": `docker-compose ps`
- [ ] Webhook verified in Meta Dashboard
- [ ] `messages` field subscribed in webhook configuration

## 🚀 Ready to Test!

Once you have the permanent token configured:

```bash
# Start monitoring
docker-compose logs -f whatsapp-service

# In another terminal, or just open WhatsApp on your phone
# Send "hi" to your business number
# Follow the flow!
```

## 💡 Tips

1. **Use actual WhatsApp** - Don't rely on curl tests for location features
2. **One step at a time** - Follow the conversation flow naturally
3. **Check logs** - If something seems wrong, logs show everything
4. **Session data** - Use the session API to debug stored data
5. **Test button** - The "Send Location" button is the key feature!

---

## 📞 Need Help?

**Service Health:**
```bash
docker-compose ps
docker-compose logs --tail=50 whatsapp-service
```

**Test Webhook:**
```bash
curl https://headless.mangwale.com/webhook/whatsapp
```

**View All Sessions:**
```bash
curl http://localhost:3000/webhook/whatsapp/sessions | jq .
```

**Restart Everything:**
```bash
docker-compose down
docker-compose up -d
docker-compose logs -f
```

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Location request button appears in WhatsApp
- ✅ Tapping button opens location picker
- ✅ Location sent and "Pickup location saved!" message appears
- ✅ Second location request button for delivery
- ✅ Session data shows coordinates
- ✅ Flow continues to mandatory fields
- ✅ Order can be completed successfully

**Good luck! The feature is ready, you just need the permanent token!** 🚀
