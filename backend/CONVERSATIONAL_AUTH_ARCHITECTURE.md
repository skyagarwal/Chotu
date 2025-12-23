# 🗨️ Conversational Authentication & UX Architecture

**Date**: January 2025  
**Goal**: ChatGPT-style conversational experience with hyperlocal Nashik personality  
**Focus**: Data collection for NLU training via gamification

---

## 🎯 Core Philosophy

> "Users don't log in to chat. They chat, then login when they need to."

This is a **data collection platform** disguised as a service bot. The primary goal is to:
1. Engage users in natural conversation
2. Build NLU training data (with gamification rewards)
3. Authenticate only when business action required
4. Maintain persistent sessions (like WhatsApp Web)

---

## 🧠 Personality: Nashik-Local AI

### Brand Voice
**Name**: Mangwale AI (मंगवले - means "ordered" in Marathi)  
**Persona**: Friendly Nashik local who knows the city inside-out  
**Tone**: Warm, helpful, slightly informal (like talking to a shopkeeper you know)

### Language Mix (Natural Code-Switching)
```typescript
// Primary: Hinglish (60%)
"Hello! Main Mangwale hoon 👋 Nashik mein kya chahiye aapko?"

// English for formal (30%)
"I can help you with food delivery, parcels, shopping and more."

// Marathi for local touch (10%)
"तुमचा पत्ता कुठे आहे? मी delivery वेळ सांगतो."
```

### Nashik-Specific Elements
✅ **Use local landmarks**: College Road, Gangapur, Saraf Bazaar, CBS, Panchavati  
✅ **Know the culture**: Temples, markets, colleges, MIDC areas  
✅ **Weather-aware**: "Aaj garmi bahut hai, thanda drink order karo?"  
✅ **Festival references**: "Navratri mein special sweet chahiye?"

### Conversation Style
```
❌ BAD (Robotic):
User: "hi"
Bot: "Welcome to Mangwale. Please select a service: Food, Parcel, Shopping."

✅ GOOD (Conversational):
User: "hi"
Bot: "Arre, namaste! 👋 Main Mangwale hoon. Nashik mein aapko kya chahiye? 
Khana mangana hai, parcel bhejna hai, ya bas timepass karna hai? 😊"
```

---

## 🚦 User Journey Flow

### Phase 1: Guest Mode (No Auth Required)
**Goal**: Build rapport, show value, collect training data

```
User opens chat.mangwale.ai
    ↓
Warm greeting (auto-detect return user)
    ↓
Small talk / Explore services
    ↓
✅ CAN DO (Guest):
    - Chat with AI
    - Browse restaurants/products (search results)
    - See prices/menus
    - Ask questions about services
    - Play trivia games (earn rewards)
    - Get delivery estimates
    
❌ CANNOT DO (Guest):
    - Place orders
    - Track orders
    - Save addresses
    - See order history
    - Earn rewards (without phone number)
```

**Example Conversation**:
```
User: "hello"
Bot: "Namaste! 🙏 Main Mangwale AI hoon. Nashik mein kuch chahiye ya bas chat karna hai?"

User: "what can you do?"
Bot: "Bahut kuch! 😊
🍕 Khana order karo (Zomato se sasta!)
📦 Parcel bhejo (bike/auto/tempo)
🛒 Shopping karo
🎮 Games khelo aur paisa jeeto

Pehli baar aaye ho? Bas baat karte raho, jab order karoge tab phone number dena. 
Abhi kya dekhna hai?"

User: "pizza chahiye"
Bot: "Nice choice! 🍕 Kaunse area mein ho? (College Road, Gangapur, Panchavati?)"
[Shows pizza restaurants nearby with prices - NO LOGIN YET]

User: "college road"
Bot: "Perfect! College Road ke paas 8 pizza places hain:
1. Domino's - ₹199 se start
2. Pizza Hut - ₹249 se start
3. Oven Story - ₹169 se start
...

Kaunsa dekhna hai? Ya direct order karna hai? 
(Order karne ke liye bas phone number chahiye hoga) 😊"

User: "oven story show karo"
Bot: [Shows Oven Story menu with prices - STILL NO LOGIN]
"Yeh le menu! Kya loge?"

User: "margherita pizza"
Bot: "Great choice! ₹169 ka hai. 
Ab order confirm karne ke liye mujhe:
📱 Aapka phone number
📍 Delivery address

10 second mein login ho jayega, chill! Phone number?"

[THIS IS WHERE AUTH STARTS - User is already invested]
```

---

## 🔐 Authentication Flow Design

### Trigger Points (Service-Specific)

| Service | Guest Access | Auth Trigger |
|---------|-------------|--------------|
| **Food** | Browse menus, prices | "Add to cart" or "Order now" |
| **Parcel** | Check rates, vehicles | "Book delivery" |
| **Shopping** | Search products, prices | "Add to cart" |
| **Tracking** | None | Immediately ask phone |
| **Games** | Play without rewards | "Claim reward" |
| **Complaints** | None | Need order ID (implies auth) |

### Inline Chat Authentication (Recommended)

**Step 1: Natural Prompt**
```
Bot: "Bas ek chhoti si formality! 📱 Aapka phone number batao, 
6-digit OTP bhejta hoon. Login = Done! ✅"

[Show input field in chat]
"Phone number (10 digits):"
```

**Step 2: OTP in Chat**
```
User: "9876543210"
Bot: "Perfect! OTP bheja hai 9876543210 pe. 
6 digits yaha type karo ↓"

[Show OTP input in chat - 6 boxes]
"OTP:"
```

**Step 3: Welcome Back**
```
User: "123456" [enters OTP]
Bot: "Verified! ✅ Welcome to Mangwale, [Name]! 
Ab location save karna hai? (Delivery ke liye chahiye)"
```

### Alternative: Hybrid Approach (Recommended for Mobile)

**Chat + Modal Combo**:
- Small auth flows → Inline in chat (OTP verification)
- Complex forms → Slide-up modal (location picker with map)
- Product selection → Interactive cards in chat
- Payment → Redirect to secure page

**Example**:
```
[In Chat]
Bot: "Phone number?"
User: "9876543210"
Bot: "OTP sent! Enter here:"
User: "123456"
Bot: "Done! ✅ Ab location dikha do?"
[User clicks "Share Location"]

[Modal Slides Up from Bottom - Full-screen on mobile]
<LocationPicker 
  onConfirm={saveAndContinueChat} 
  onCancel={chatContinues}
/>

[Back to Chat]
Bot: "Location saved! ✅ Ab order confirm kar doon?"
```

---

## 📍 Location Capture Strategy

### Timing: AFTER Login, BEFORE Order

**Flow**:
```
User authenticated (phone verified)
    ↓
Bot: "Btw, delivery ke liye aapka location save kar loon? 
Ek baar save karlo, next time automatically fill hoga 😊"
    ↓
User: "ok" / "haan" / clicks "Share Location"
    ↓
[Existing LocationPicker component opens]
    ↓
User confirms address
    ↓
Bot: "Perfect! [Area name] mein delivery hoti hai ✅ 
Ab jo bhi order karna hai, direct kar sakte ho!"
```

### Skip Option (For Users in Rush)
```
Bot: "Location save karoge? (Recommended - saves time next time)"

[Buttons]
📍 Share Location  |  ⏭️ Skip for Now

If Skip:
Bot: "No problem! Jab order karoge tab location manga lunga. 
Abhi kya dekhna hai?"
```

### Smart Detection (Check if Already Saved)
```typescript
// In conversation service
const session = await sessionService.get(userId);
if (session.authenticated && !session.location_saved) {
  // Prompt for location
  return "Btw, location save kar loon? Saves time! 😊";
}
```

---

## 🎮 Gamification Integration (Data Collection)

**Purpose**: Get users to talk naturally → Train NLU with real data

### Game Triggers (Conversational)
```
Bot: "Arre, bore ho rahe ho? 
Ek quick game kheloge? 30 seconds mein ₹5-10 jeet sakte ho! 🎮"

User: "haan"
Bot: "Cool! Yeh dekho:

🎯 Delivery Quiz
Question: Nashik Road se Gangapur tak parcel bhejni hai. 
Kis vehicle mein jayega - Bike, Auto ya Tempo?

[User answers in natural language]
User: "bike mein chhota parcel hai toh"

Bot: "Correct! ✅ ₹5 earned 🎉
[Behind the scenes: Save as training data]
{
  text: "bike mein chhota parcel hai toh",
  intent: "vehicle_selection_bike",
  entities: ["bike"],
  context: "parcel_size_small"
}

Aur ek question? +₹5 more!"
```

### Game Types (Already in Your Docs)
1. **Delivery Messenger**: "How would you ask to send a parcel?"
2. **Vehicle Expert**: "Which vehicle for this scenario?"
3. **Route Master**: "Best route from X to Y?"
4. **Problem Solver**: "Your parcel is late, what do you say?"
5. **Nashik Navigator**: "How do you describe this landmark?"

**Reward Structure**:
- ₹5 per valid response
- ₹10 for creative/detailed answers
- ₹15 for Marathi/Hindi responses (need more training data)
- Weekly leaderboard: Top 10 get ₹100 bonus

**Data Quality**:
- Auto-save to `nlu_training_data` table
- Human review in Label Studio (30 min/day)
- Auto-approve if confidence > 0.8
- Weekly batch training (Sunday nights)

---

## 🛠️ Technical Implementation

### Backend Changes

#### 1. Update ChatGateway (Remove Immediate Auth Check)
```typescript
// src/chat/chat.gateway.ts

@SubscribeMessage('session:join')
async handleJoinSession(@MessageBody() data, @ConnectedSocket() client) {
  const { sessionId, userId, phone, token } = data;
  
  // ❌ REMOVE THIS (was prompting auth immediately):
  // if (!userId) {
  //   client.emit('auth:required', { ... });
  // }
  
  // ✅ NEW: Always allow guest mode
  const sessionData: any = {
    platform: 'web',
    authenticated: !!userId,
    guest_mode: !userId,
  };
  
  if (userId) {
    sessionData.user_id = userId;
    sessionData.phone = phone;
    sessionData.auth_token = token;
  }
  
  await this.sessionService.setData(sessionId, sessionData);
  await client.join(sessionId);
  
  // Send welcome message via conversation service
  const welcomeMsg = await this.conversationService.getWelcomeMessage(sessionId);
  client.emit('message', welcomeMsg);
}
```

#### 2. Add Auth Trigger Service
```typescript
// src/auth/auth-trigger.service.ts

@Injectable()
export class AuthTriggerService {
  
  /**
   * Check if action requires authentication
   */
  requiresAuth(action: string, module: string): boolean {
    const authRequiredActions = {
      food: ['place_order', 'add_to_cart'],
      parcel: ['book_delivery', 'create_order'],
      ecom: ['add_to_cart', 'checkout'],
      tracking: ['track_order', 'order_status'],
      complaints: ['file_complaint', 'refund_request'],
      games: ['claim_reward'], // Can play without auth
    };
    
    return authRequiredActions[module]?.includes(action) || false;
  }
  
  /**
   * Get conversational auth prompt based on action
   */
  getAuthPrompt(action: string, module: string): string {
    const prompts = {
      food: "Bas ek second! 📱 Order confirm karne ke liye phone number chahiye. 10 second mein ho jayega! 😊",
      parcel: "Perfect! Delivery book karne ke liye phone number do, OTP bhejta hoon 📲",
      ecom: "Cart mein daal raha hoon! Checkout ke liye quick login kar lo - phone number?",
      tracking: "Order track karne ke liye phone number batao, usse order nikalta hoon 📦",
      games: "Reward claim karne ke liye phone number chahiye (paise bhejne ke liye!) 💰"
    };
    
    return prompts[module] || "Quick login kar lo - phone number? 📱";
  }
}
```

#### 3. Integrate in Conversation Service
```typescript
// src/conversation/services/conversation.service.ts

async handleMessage(sessionId: string, message: string) {
  const session = await this.sessionService.get(sessionId);
  
  // Detect intent
  const intent = await this.nluService.classify(message);
  
  // Check if requires auth
  if (this.authTrigger.requiresAuth(intent.action, intent.module)) {
    if (!session.authenticated) {
      // Trigger inline auth
      return this.authTrigger.getAuthPrompt(intent.action, intent.module);
    }
  }
  
  // Check if requires location
  if (this.requiresLocation(intent) && !session.location_saved) {
    return "Delivery ke liye location save kar lo? 📍 Ek baar save = next time auto-fill!";
  }
  
  // Continue with normal flow
  return this.processIntent(intent, session);
}
```

#### 4. Add Nashik Personality to Agent Prompts
```typescript
// src/agents/config/agent-configs.ts

export const SYSTEM_PROMPTS = {
  base: `You are Mangwale AI, a friendly hyperlocal assistant for Nashik, Maharashtra.

PERSONALITY:
- Speak like a helpful Nashik local (mix Hinglish naturally)
- Use landmarks: College Road, Gangapur, Saraf Bazaar, CBS, Panchavati
- Be warm but efficient (users want quick answers)
- Use emojis moderately (1-2 per message)
- Code-switch naturally: English for tech terms, Hindi for conversation

LANGUAGE GUIDELINES:
- Primary: Hinglish (60%) - "Main help kar sakta hoon"
- English: For menus, prices, formal stuff (30%)
- Marathi: For local touch (10%) - "तुमचा पत्ता कुठे आहे?"

TONE EXAMPLES:
❌ "Welcome to Mangwale. How may I assist you?"
✅ "Namaste! Main Mangwale hoon 👋 Nashik mein kya chahiye?"

RESPONSE STRUCTURE:
1. Acknowledge what they said
2. Provide info/options (keep it short)
3. Ask next question (conversational)

Example:
User: "pizza chahiye"
You: "Nice choice! 🍕 College Road, Gangapur ya kaha se order karoge? Price bhi dikh jayegi."`,

  food_agent: `...extend base prompt with food-specific knowledge...`,
  
  parcel_agent: `...extend base prompt with:
- Vehicle types: Bike (₹30-50), Auto (₹50-100), Tempo (₹150-300)
- Distance-based: Under 5km = bike, 5-15km = auto, 15km+ = tempo
- Nashik areas: Know which areas are near/far
...`,
};
```

### Frontend Changes

#### 1. Inline OTP Component
```tsx
// src/components/chat/InlineOTPInput.tsx

export function InlineOTPInput({ 
  phoneNumber, 
  onVerified 
}: { 
  phoneNumber: string; 
  onVerified: (token: string) => void 
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only single digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-verify when all 6 filled
    if (newOtp.every(d => d !== '')) {
      verifyOTP(newOtp.join(''));
    }
  };

  const verifyOTP = async (otpCode: string) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: phoneNumber, otp: otpCode }),
    });
    
    const { token, user } = await response.json();
    
    // Update auth store
    useAuthStore.getState().setAuth(user, token);
    
    // Notify parent
    onVerified(token);
  };

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
      
      <p className="text-xs text-gray-600">
        Didn't receive? <button className="text-green-600 font-bold">Resend OTP</button>
      </p>
    </div>
  );
}
```

#### 2. Update Chat Page to Handle Auth State
```tsx
// src/app/(public)/chat/page.tsx

export default function ChatPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState('');

  // Listen for auth prompts from bot
  useEffect(() => {
    const handleAuthRequest = (data: { phone?: string }) => {
      if (data.phone) {
        setPendingPhoneNumber(data.phone);
        setShowOTPInput(true);
      }
    };

    wsClientRef.current?.on('auth:request_otp', handleAuthRequest);
  }, []);

  const handleOTPVerified = (token: string) => {
    setShowOTPInput(false);
    
    // Re-join session with auth data
    wsClientRef.current?.joinSession(sessionIdState, {
      userId: user?.id,
      phone: user?.phone,
      token,
    });
    
    // Show success message
    addMessage({
      role: 'assistant',
      content: `✅ Verified! Welcome ${user?.f_name}! Ab location save karoge?`,
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* ... existing chat UI ... */}
      
      {/* OTP Input (appears inline in chat) */}
      {showOTPInput && (
        <InlineOTPInput 
          phoneNumber={pendingPhoneNumber}
          onVerified={handleOTPVerified}
        />
      )}
      
      {/* ... rest of chat ... */}
    </div>
  );
}
```

---

## 🧪 Testing Checklist

### Guest Mode Testing
- [ ] Open chat without login → Can chat with bot
- [ ] Ask "pizza chahiye" → Shows restaurants without auth
- [ ] Browse menu → Shows prices/items without auth
- [ ] Try to order → Bot asks for phone number
- [ ] Play trivia game → Can play, but can't claim reward without auth

### Authentication Flow
- [ ] Bot asks for phone number → Enter 10 digits
- [ ] Receive OTP in chat → 6-digit input appears
- [ ] Enter OTP → Verified ✅, session updated
- [ ] Bot asks for location → Location picker modal opens
- [ ] Save location → Returns to chat, can now order

### Personality Testing
- [ ] Greetings use Hinglish: "Namaste! Main Mangwale hoon"
- [ ] Uses Nashik landmarks: "College Road se delivery hogi"
- [ ] Code-switches naturally: "Pizza order karna hai?"
- [ ] Emoji usage: 1-2 per message, not excessive
- [ ] Tone is friendly but efficient

### Session Persistence
- [ ] Login once → Refresh page → Still logged in
- [ ] Close browser → Reopen → Session persists (token in localStorage)
- [ ] After 7 days → Token expires → Prompt re-login

---

## 📊 Success Metrics

### UX Metrics
- **Guest Engagement**: Avg messages before signup (target: 5-8)
- **Auth Conversion**: % guests who complete auth (target: >40%)
- **Location Capture**: % authenticated users who save location (target: >80%)
- **Order Completion**: % users who complete order after auth (target: >60%)

### NLU Training Metrics
- **Training Data**: Aim for 1000+ samples/month from games
- **Language Mix**: 60% Hinglish, 30% English, 10% Marathi
- **Intent Coverage**: All 10 critical parcel intents covered
- **Human Review**: <30 min/day for approval

### Business Metrics
- **Orders/Day**: Track growth after UX changes
- **Return Users**: % users who return within 7 days
- **Reward Redemption**: % game rewards claimed vs earned
- **Support Tickets**: Should decrease with better AI

---

## 🚀 Rollout Plan

### Week 1: Backend Foundation
- [ ] Remove immediate auth check in ChatGateway
- [ ] Add AuthTriggerService with smart triggers
- [ ] Update Conversation Service to check auth per action
- [ ] Add Nashik personality to agent prompts
- [ ] Test guest mode + auth triggers

### Week 2: Frontend UX
- [ ] Build InlineOTPInput component
- [ ] Update chat page for inline auth
- [ ] Test OTP flow end-to-end
- [ ] Add location prompt after auth
- [ ] Test complete guest → auth → order flow

### Week 3: Gamification
- [ ] Launch trivia games in chat
- [ ] Save user responses to `nlu_training_data`
- [ ] Set up Label Studio review workflow
- [ ] Test reward claiming flow
- [ ] Start weekly training runs

### Week 4: Polish & Launch
- [ ] A/B test personality variations
- [ ] Optimize response times
- [ ] Monitor UX metrics dashboard
- [ ] Soft launch to 100 beta users
- [ ] Collect feedback → iterate

---

## 🎯 Long-Term Vision

**Month 1-2**: Build conversational UX + collect 2K training samples  
**Month 3-4**: Launch gamification games → 5K+ samples  
**Month 5-6**: Auto-training pipeline → 90%+ intent accuracy  
**Month 7+**: Expand to voice (ASR → NLU → TTS full loop)

**End Goal**: AI that understands Nashik locals better than any competitor, powered by real user conversations.

---

## 🔗 Related Documentation

- [AGENT_SYSTEM_COMPLETE.md](./AGENT_SYSTEM_COMPLETE.md) - Agent architecture
- [HYPERLOCAL_PARCEL_TRAINING_SYSTEM.md](./docs-latest/HYPERLOCAL_PARCEL_TRAINING_SYSTEM.md) - Training strategy
- [MULTILINGUAL_GUIDE.md](../mangwale-unified-dashboard/MULTILINGUAL_GUIDE.md) - Language support
- [PHASE_2_AUTO_TRAINING_COMPLETE.md](./PHASE_2_AUTO_TRAINING_COMPLETE.md) - Training automation

---

**Remember**: This is not just a chatbot. It's a data collection machine that makes users *want* to talk naturally. Every conversation makes the AI smarter. 🧠
