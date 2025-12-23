# 🚀 Quick Start: Test Conversational Auth & Nashik Personality

**Status**: Backend Ready | Frontend Pending  
**Test Mode**: Local Development  
**Goal**: Verify guest mode + auth triggers + personality

---

## 🎯 What's Been Built (Backend)

✅ **Auth Trigger System** - Smart detection when login needed  
✅ **Nashik Personality** - Hinglish conversational prompts  
✅ **Guest Mode** - Users can chat without login  
✅ **Updated ChatGateway** - No immediate auth blocking

---

## 🧪 Test Backend (No Frontend Changes Needed)

### Test 1: Guest Mode Greeting
```bash
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d '{"recipientId":"web-test-guest-1","text":"hi"}'
```

**Expected Response** (Nashik personality):
```json
{
  "response": "Namaste! 🙏 Main Mangwale hoon. Nashik mein kya chahiye?"
}
```

### Test 2: Browse Without Auth
```bash
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d '{"recipientId":"web-test-guest-1","text":"pizza chahiye college road"}'
```

**Expected**: Shows restaurants/prices without auth prompt

### Test 3: Auth Trigger on Order
```bash
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d '{"recipientId":"web-test-guest-1","text":"margherita pizza order karo"}'
```

**Expected Response** (Auth trigger):
```json
{
  "response": "Bas ek second! 🍕 Order confirm karne ke liye phone number chahiye..."
}
```

---

## 🔧 Quick Integration (If You Want to Test Now)

### Option 1: Test via Existing Chat Interface

1. **Open chat**: `https://chat.mangwale.ai`
2. **Chat without login**: Should work (guest mode)
3. **Try to order**: Should prompt for phone number (not implemented yet in UI)

### Option 2: Build Frontend Components (30 min)

```bash
cd /home/ubuntu/Devs/mangwale-unified-dashboard

# Create OTP component
cat > src/components/chat/InlineOTPInput.tsx << 'EOF'
'use client'

import { useState, useRef } from 'react'

export function InlineOTPInput({ 
  phoneNumber, 
  onVerified 
}: { 
  phoneNumber: string; 
  onVerified: (token: string) => void 
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    
    if (newOtp.every(d => d !== '')) {
      verifyOTP(newOtp.join(''))
    }
  }

  const verifyOTP = async (otpCode: string) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber, otp: otpCode }),
    })
    
    const { token } = await response.json()
    onVerified(token)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-blue-50 rounded-lg my-2">
      <p className="text-sm text-gray-700">
        OTP sent to <strong>{phoneNumber}</strong>
      </p>
      
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            className="w-12 h-14 text-2xl text-center border-2 border-gray-300 rounded-lg focus:border-green-500"
          />
        ))}
      </div>
    </div>
  )
}
EOF

# Rebuild
npm run build

# Restart
pm2 restart mangwale-dashboard
```

---

## 📊 Test Scenarios

### Scenario 1: Food Ordering (Guest → Auth → Order)
```
1. User: "hi"
   → Bot: "Namaste! Main Mangwale hoon..."
   
2. User: "pizza chahiye"
   → Bot: "College Road, Gangapur ya kaha se?"
   → [No auth required]
   
3. User: "college road"
   → Bot: [Shows 8 pizza places]
   → [Still no auth]
   
4. User: "dominos ka menu"
   → Bot: [Shows Domino's menu]
   → [Still browsing without auth]
   
5. User: "margherita order karo"
   → Bot: "Phone number chahiye order ke liye"
   → [AUTH TRIGGERED]
```

### Scenario 2: Parcel Delivery
```
1. User: "parcel bhejni hai"
   → Bot: "Kaha se kaha bhejni hai?"
   → [No auth required for inquiry]
   
2. User: "college road se gangapur"
   → Bot: "8km hai. Bike ₹50, Auto ₹80"
   → [Shows rates without auth]
   
3. User: "bike mein book karo"
   → Bot: "Phone number do, delivery book karta hoon"
   → [AUTH TRIGGERED]
```

### Scenario 3: Games (Play Without Auth)
```
1. User: "game khelna hai"
   → Bot: "Cool! Delivery Quiz khelo?"
   → [Can play without auth]
   
2. User: "haan"
   → Bot: [Asks trivia question]
   → [User can answer]
   
3. User: [Answers correctly]
   → Bot: "Correct! ₹5 earned. Claim karoge?"
   → [AUTH TRIGGERED on claim]
```

---

## 🐛 Troubleshooting

### Issue: Bot Still Prompts Auth Immediately
**Cause**: ChatGateway changes not deployed  
**Fix**:
```bash
cd /home/ubuntu/Devs/mangwale-ai
npm run build
pm2 restart mangwale-ai
```

### Issue: Personality Not Showing (Still English)
**Cause**: Agents not using new personality config  
**Fix**: Check `src/agents/agents/search.agent.ts` line 33 - should use `getPersonalityPrompt()`

### Issue: Auth Trigger Not Working
**Cause**: ConversationService not integrated with AuthTriggerService yet  
**Status**: This is expected - integration pending (see roadmap below)

---

## 🗺️ Complete Implementation Roadmap

### Phase 1: Backend (✅ DONE)
- [x] Auth trigger service
- [x] Nashik personality config
- [x] Update search agent
- [x] Remove immediate auth check
- [x] Documentation

### Phase 2: ConversationService Integration (NEXT)
**File**: `src/conversation/services/conversation.service.ts`

```typescript
// Add to constructor
private authTrigger: AuthTriggerService,

// Add to handleMessage()
async handleMessage(sessionId: string, message: string) {
  const session = await this.sessionService.get(sessionId);
  
  // Detect intent
  const intent = await this.nluService.classify(message);
  
  // Check if requires auth
  if (this.authTrigger.requiresAuth(intent.action, intent.module)) {
    if (!session.authenticated) {
      return this.authTrigger.getAuthPrompt(intent.action, intent.module);
    }
  }
  
  // Check if requires location
  if (this.authTrigger.requiresLocation(intent.module) && !session.location_saved) {
    return this.authTrigger.getLocationPrompt(intent.module);
  }
  
  // Continue processing...
}
```

### Phase 3: Frontend Components (30 min)
- [ ] InlineOTPInput component
- [ ] Update chat page to handle auth events
- [ ] Location prompt after auth

### Phase 4: Testing (1 hour)
- [ ] Test all scenarios
- [ ] Verify personality consistency
- [ ] Check auth triggers work
- [ ] Test location capture

### Phase 5: Launch (Beta)
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Collect feedback
- [ ] Iterate based on data

---

## 🎯 Quick Win: Test Personality Now

**No code changes needed** - Just test the personality in existing chat:

```bash
# Test Hinglish greeting
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d '{"recipientId":"web-personality-test","text":"hello"}'

# Should respond in Hinglish:
# "Namaste! Main Mangwale hoon..."
```

If it works, personality is deployed! ✨

---

## 📞 Need Help?

**Issue with backend?**
- Check PM2 logs: `pm2 logs mangwale-ai`
- Check build: `npm run build` in `/home/ubuntu/Devs/mangwale-ai`

**Want to test frontend?**
- Use existing chat interface at `chat.mangwale.ai`
- Or build OTP component (see Option 2 above)

**Ready to integrate?**
- Follow Phase 2 roadmap (ConversationService)
- Then Phase 3 (Frontend components)
- Then Phase 4 (Testing)

---

**Current Status**: Backend foundation is solid. You can test guest mode + personality now. Full auth flow needs ConversationService integration + frontend components (estimated 2-3 hours total).
