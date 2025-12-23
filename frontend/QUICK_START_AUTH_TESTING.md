# 🚀 Quick Start - Testing Authentication

## Before You Test

### 1. Start Required Services

**API Gateway (mangwale-ai):**
```bash
cd /home/ubuntu/Devs/mangwale-ai/api-gateway
npm run start:dev
# Should see: "Nest application successfully started on port 4001"
```

**Verify gateway is running:**
```bash
curl http://localhost:4001/health
# Should return: {"status":"ok"}
```

### 2. Start Unified Dashboard

```bash
cd /home/ubuntu/Devs/mangwale-unified-dashboard
npm run dev
# Open: http://localhost:3000
```

## 🧪 Test Scenarios

### Scenario 1: Demo Mode (No SMS Required)

1. Go to: `http://localhost:3000/chat`
2. Should redirect to: `http://localhost:3000/login`
3. Check "Demo Mode" checkbox
4. Enter phone: `9999999999`
5. Click "Send OTP"
6. OTP auto-fills: `123456`
7. Click "Verify OTP"
8. ✅ Should redirect to `/chat` with user authenticated

**Expected Console Logs:**
```
🔌 Initializing WebSocket connection...
✅ WebSocket connected
🔒 Not authenticated, redirecting to login
```

After login:
```
✅ User authenticated
🔄 Reusing existing session
```

### Scenario 2: Real Phone Number (Production)

⚠️ **Requires:**
- Valid Indian mobile number
- SMS service enabled in PHP backend
- Credits in SMS gateway account

1. Go to: `http://localhost:3000/login`
2. Enter your phone: `98XXXXXXXX`
3. Click "Send OTP"
4. Wait for SMS (30s-2min)
5. Enter OTP received
6. Click "Verify OTP"
7. ✅ Authenticated!

### Scenario 3: Token Persistence

1. Login successfully (use demo mode)
2. Close browser completely
3. Reopen browser
4. Go directly to: `http://localhost:3000/chat`
5. ✅ Should NOT redirect to login
6. Check console: `🔄 Reusing existing session`

**Verify localStorage:**
```javascript
// In browser console
localStorage.getItem('auth-storage')
// Should show: {"state":{"user":{...},"token":"...","isAuthenticated":true}}
```

### Scenario 4: Logout

```javascript
// In browser console on /chat page
import { useAuthStore } from '@/store/authStore'
const { clearAuth } = useAuthStore.getState()
clearAuth()
// Should redirect to /login
```

Or manually:
```javascript
localStorage.removeItem('auth-storage')
window.location.reload()
```

### Scenario 5: Profile Sync from Location

1. Login successfully
2. Click "Share Location" button
3. Fill in:
   - Name: "John Doe"
   - Phone: "9876543210"
   - Pick location on map
4. Click "Confirm Location"
5. Open browser console:
   ```javascript
   useAuthStore.getState().user
   // Should show: { f_name: "John", l_name: "Doe", phone: "9876543210" }
   ```

## 🔍 Debugging

### Check Auth State

**In browser console:**
```javascript
// Check if authenticated
useAuthStore.getState().isAuthenticated

// Check user
useAuthStore.getState().user

// Check token
useAuthStore.getState().token
```

### Check API Gateway Health

```bash
# From terminal
curl http://localhost:4001/health

# Check auth endpoint
curl -X POST http://localhost:4001/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9999999999"}'
```

### Network Tab Inspection

**Send OTP Request:**
```http
POST http://localhost:4001/api/v1/auth/send-otp
Content-Type: application/json

{"phone":"9876543210"}

Response:
{
  "success": true,
  "message": "OTP sent to your phone",
  "phone": "9876543210",
  "otpSent": true
}
```

**Verify OTP Request:**
```http
POST http://localhost:4001/api/v1/auth/verify-otp
Content-Type: application/json

{"phone":"9876543210","otp":"123456"}

Response:
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1Qi...",
  "user": {
    "id": 123,
    "f_name": "John",
    "l_name": "Doe",
    "phone": "9876543210"
  }
}
```

## ❌ Common Issues

### "Failed to send OTP"

**Cause:** API Gateway not running

**Fix:**
```bash
cd /home/ubuntu/Devs/mangwale-ai/api-gateway
npm run start:dev
```

### "Invalid OTP"

**Cause:** OTP expired or wrong code

**Fix:**
- Click "Resend OTP"
- Wait for new SMS
- Try demo mode: `9999999999` + `123456`

### Redirect loop /login → /chat → /login

**Cause:** Corrupted auth state

**Fix:**
```javascript
localStorage.clear()
window.location.reload()
```

### Profile not showing in header

**Cause:** Auth store not hydrated yet

**Fix:**
- Check console for hydration logs
- Verify `_hasHydrated: true` in store
- Try hard refresh (Ctrl+Shift+R)

## 📊 Success Criteria

✅ `/chat` redirects to `/login` when not authenticated  
✅ Demo mode works: `9999999999` → `123456` → logged in  
✅ Token persists across browser restarts  
✅ Profile shows in header after login  
✅ Location form updates user profile  
✅ 401 errors auto-redirect to login  

## 🎯 Next: Integration Testing

Once basic auth works:

1. Test order creation (requires auth token)
2. Test address management
3. Test payment flow
4. Test WebSocket with authenticated user

## 📞 Support

If issues persist:

1. Check API Gateway logs:
   ```bash
   cd /home/ubuntu/Devs/mangwale-ai/api-gateway
   npm run start:dev
   # Watch console for errors
   ```

2. Check PHP backend logs:
   ```bash
   tail -f /path/to/laravel/storage/logs/laravel.log
   ```

3. Check browser console (F12)
   - Look for red errors
   - Check Network tab for failed requests

---

**Ready to test!** Start with **Scenario 1 (Demo Mode)** for fastest verification. 🚀
