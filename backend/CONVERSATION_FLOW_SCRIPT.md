# 🎭 Conversational Game Flow - Complete Script

## Flow Tree Structure

```
START (User visits chat.mangwale.ai/chat)
│
├─ GREETING (Message 1)
│   ├─ User: Hi/Hello/Hey → SMALL_TALK
│   ├─ User: [Clicks Service] → SERVICE_INTRO
│   └─ User: [Anything else] → UNDERSTAND_NEED
│
├─ SMALL_TALK (Messages 2-3)
│   └─ BUILD_RAPPORT → INTRODUCE_CHAT_ORDERING
│
├─ INTRODUCE_CHAT_ORDERING (Message 4)
│   ├─ User: Yes, show me → INTRODUCE_REWARDS
│   ├─ User: Maybe later → SAVE_FOR_LATER
│   └─ User: What services? → SHOW_SERVICES
│
├─ INTRODUCE_REWARDS (Message 5)
│   ├─ User: Play & Earn → FIRST_GAME (Profile Question - Easy)
│   ├─ User: Tell me more → EXPLAIN_REWARDS_DETAIL
│   └─ User: Maybe later → ENGAGEMENT_HOOK
│
├─ FIRST_GAME (Quick 30sec game)
│   └─ Complete → CONGRATULATE → OFFER_MORE_GAMES
│
├─ OFFER_MORE_GAMES
│   ├─ User: More games → GAME_MENU
│   ├─ User: Show stats → PROFILE_STATS
│   └─ User: Take break → SAVE_PROGRESS
│
├─ GAME_MENU (List of 4-5 games)
│   ├─ Intent Quest → INTENT_GAME
│   ├─ Language Master → LANGUAGE_GAME
│   ├─ Validate Stores → VALIDATION_GAME
│   └─ Profile Builder → PROFILE_GAME
│
├─ AFTER_3_GAMES
│   └─ COMING_SOON_MESSAGE → APP_DOWNLOAD_CTA
│
└─ ENGAGEMENT_LOOPS
    ├─ Every 5 messages → "Quick game?" prompt
    ├─ User idle 1 min → "Still there? Earn ₹5 in 30sec!"
    ├─ User asks "earn" → Show game menu
    └─ User asks "order" → "Coming soon! Play games meanwhile"
```

---

## 📝 Complete Conversation Scripts

### 🟢 **Act 1: Welcome & Greeting**

#### Message 1 - Initial Welcome
```javascript
{
  role: 'assistant',
  content: "Hi! 👋 Welcome to Mangwale. I'm here to help you with deliveries, food, shopping, and more. Feel free to ask me anything about Nashik or just chat!\n\nYou can browse without logging in, but you'll need to login when placing orders. How can I help you today?",
  buttons: [
    { id: 'food', title: '🍔 Food' },
    { id: 'shopping', title: '🛒 Shopping' },
    { id: 'ride', title: '🚗 Ride' },
    { id: 'parcel', title: '📦 Parcel' },
  ],
  allowVoice: true
}
```

**Trigger:** User opens chat
**Data Collected:** None yet
**Next:** Wait for user response

---

#### Message 2 - Small Talk (Build Rapport)
```javascript
// If user says: "Hi" / "Hello" / "Hey"
{
  role: 'assistant',
  content: "Great to meet you! 😊 I'm your AI assistant for all things Mangwale. Whether you want to order food, book a ride, or just explore Nashik - I'm here!\n\nWhat brings you here today?",
  buttons: [
    { id: 'just_browsing', title: 'Just browsing' },
    { id: 'looking_food', title: 'Looking for food' },
    { id: 'need_ride', title: 'Need a ride' },
    { id: 'want_earn', title: 'Want to earn money' },
  ],
  allowVoice: true
}
```

**Trigger:** User responds to greeting
**Data Collected:** User intent (browsing/ordering/earning)
**Next:** Branch based on selection

---

### 🟡 **Act 2: Introduce Value Proposition**

#### Message 3 - Introduce Chat Ordering
```javascript
// If user selected "Just browsing" or "Looking for food"
{
  role: 'assistant',
  content: "Perfect timing! 🎉 Did you know we just launched something NEW?\n\n💬 Order right here in chat - no app download needed!\n🤖 Just tell me what you want naturally\n🚀 Fast, easy, and conversational\n\nWant to see how it works?",
  buttons: [
    { id: 'yes_show_me', title: 'Yes, show me!' },
    { id: 'tell_more', title: 'Tell me more' },
    { id: 'maybe_later', title: 'Maybe later' },
  ],
  voiceHint: "Try saying: 'Yes, I want to try it'"
}
```

**Trigger:** User shows interest or is browsing
**Data Collected:** Interest level (yes/no/maybe)
**Next:** Based on response → INTRODUCE_REWARDS or ENGAGEMENT_HOOK

---

#### Message 4 - Introduce Rewards (THE HOOK! 🎣)
```javascript
// If user clicked "Yes, show me!" or "Tell me more"
{
  role: 'assistant',
  content: "Awesome! 🎊 Here's the BEST part...\n\n💰 You can EARN while you explore!\n\nHow it works:\n✅ Play quick games (2-5 mins)\n✅ Answer simple questions\n✅ Help us improve our AI\n✅ Get REAL MONEY + Points!\n\n🎁 Rewards:\n• ₹5-₹15 per game\n• Loyalty points for discounts\n• Unlock bonus rewards\n• Withdraw or use on orders\n\nWant to try a quick game RIGHT NOW? Takes just 30 seconds! 🚀",
  buttons: [
    { id: 'play_now', title: '💰 Play & Earn ₹5', primary: true },
    { id: 'how_rewards_work', title: 'How do rewards work?' },
    { id: 'maybe_later_game', title: 'Maybe later' },
  ],
  voiceHint: "Say: 'Let's play' or 'I want to earn'"
}
```

**Trigger:** User shows interest in trying the system
**Data Collected:** Engagement willingness
**Next:** FIRST_GAME or EXPLAIN_REWARDS

---

### 🎮 **Act 3: First Game (Quick Win!)**

#### Game 1 - Location Question (Easy Win, High Value Data)
```javascript
// If user clicked "Play & Earn ₹5"
{
  role: 'assistant',
  content: "🎮 Quick Game - Round 1 of 3\n\n📍 Which area of Nashik do you stay in?\n\nJust pick or type your area!\n\n💰 Reward: ₹2 + 20 points",
  buttons: [
    { id: 'area_nashik_road', title: 'Nashik Road' },
    { id: 'area_college_road', title: 'College Road' },
    { id: 'area_satpur', title: 'Satpur' },
    { id: 'area_cidco', title: 'CIDCO' },
    { id: 'area_other', title: 'Other area' },
  ],
  allowVoice: true,
  voiceHint: "🎤 Or just say your area name",
  gameMetadata: {
    gameType: 'profile_builder',
    question: 'location_area',
    reward: { wallet: 2, points: 20 }
  }
}
```

**Trigger:** User clicks "Play & Earn"
**Data Collected:** `user_area` (critical for delivery)
**Save To:** `user_preferences.area`, `training_samples` (if voice)
**Next:** Game Round 2

---

#### Game 1 - Round 2: Usage Frequency
```javascript
{
  role: 'assistant',
  content: "✅ Great! +₹2 added 💸\n\n🎮 Round 2 of 3\n\n🍔 How often do you order food delivery?\n\n💰 Reward: ₹3 + 30 points",
  buttons: [
    { id: 'freq_daily', title: 'Daily 🔥' },
    { id: 'freq_few_week', title: 'Few times a week' },
    { id: 'freq_few_month', title: 'Few times a month' },
    { id: 'freq_rarely', title: 'Rarely' },
  ],
  allowVoice: true,
  voiceHint: "Say: 'I order daily' or 'few times a week'",
  gameMetadata: {
    gameType: 'profile_builder',
    question: 'order_frequency',
    reward: { wallet: 3, points: 30 }
  }
}
```

**Data Collected:** `order_frequency` (usage pattern)
**Save To:** `user_preferences.order_frequency`
**Next:** Game Round 3 (Intent Collection!)

---

#### Game 1 - Round 3: Natural Language Intent (GOLD! 🏆)
```javascript
{
  role: 'assistant',
  content: "🔥 Nice! +₹3 more!\n\n🎮 Final Round - Big Reward! 💎\n\n🎯 Say this sentence NATURALLY (in ANY language):\n\n\"I want to order pizza from Dominos in Nashik Road\"\n\nJust speak like you'd talk to a friend! Use Hinglish, Hindi, Marathi - whatever feels natural!\n\n💰 BIG Reward: ₹10 + 100 points\n\n🎤 Ready? Click the mic and speak!",
  allowVoice: true,
  showVoiceFirst: true,
  voiceHint: "🎤 Speak naturally - don't read word-for-word!",
  alternativeInput: "Or type if you prefer",
  gameMetadata: {
    gameType: 'intent_quest',
    question: 'natural_order_expression',
    reward: { wallet: 10, points: 100 },
    expectedIntent: 'order_food',
    collectLanguage: true,
    collectTone: true
  }
}
```

**Data Collected:** 
- Natural language intent expression ⭐⭐⭐
- Language (en/hi/mr/hinglish)
- Tone (casual/formal)
- Entity extraction (location, restaurant, item)

**Save To:** `training_samples` table (CRITICAL!)
**Scoring Logic:**
```javascript
// Backend scoring
const score = calculateScore(userResponse, {
  intentMatch: detectIntent(userResponse) === 'order_food',
  entityExtraction: extractEntities(userResponse),
  languageDetection: detectLanguage(userResponse),
  naturalness: calculateNaturalness(userResponse),
});

// Score: 0-100
// 90-100: "🔥 PERFECT! You're a natural!"
// 70-89: "✅ Great! Well done!"
// 50-69: "👍 Good attempt!"
// <50: "Let's try again - speak more naturally!"
```

**Next:** CONGRATULATE_FIRST_GAME

---

#### Message: First Game Complete! (Dopamine Hit! 🎊)
```javascript
{
  role: 'assistant',
  content: "🎉 AMAZING! You nailed it!\n\n📊 Your Score: 95% 🏆\n\n💰 Rewards:\n• ₹15.00 added to wallet\n• 150 points earned\n• 🔥 Streak started: 1\n\n🏦 Current Balance:\n💵 Wallet: ₹15.00\n⭐ Points: 150\n\n🎮 That was fun, right? Want to play another game and earn even MORE?",
  buttons: [
    { id: 'play_more', title: '🎮 Yes! More games', primary: true },
    { id: 'view_stats', title: '📊 View my stats' },
    { id: 'take_break', title: '☕ Take a break' },
  ],
  celebrationAnimation: true // Frontend shows confetti!
}
```

**Trigger:** First game completed
**Psychology:** 
- Immediate reward = dopamine
- Show progress = achievement
- Streak = FOMO (don't break it!)
- Social proof (score) = validation

**Next:** GAME_MENU or PROFILE_STATS

---

### 🎯 **Act 4: Game Menu (Keep Them Playing!)**

#### Message: Game Selection Menu
```javascript
// If user clicked "Yes! More games"
{
  role: 'assistant',
  type: 'list',
  header: '🎮 Choose Your Next Game',
  content: "Pick a game to play and earn more rewards! Each game collects different data to help our AI get smarter.",
  sections: [
    {
      title: 'Quick Games (2-5 min)',
      rows: [
        {
          id: 'game_intent_quest',
          title: '🎯 Intent Quest',
          description: 'Earn ₹15 + 150pts | Say things naturally',
          icon: '🎯'
        },
        {
          id: 'game_language_master',
          title: '🌍 Language Master',
          description: 'Earn ₹15 + 150pts | Speak in your language',
          icon: '🌍'
        },
        {
          id: 'game_validate_stores',
          title: '🔍 Validate Stores',
          description: 'Earn ₹10 + 100pts | Tell us what you use',
          icon: '🔍'
        },
      ]
    },
    {
      title: 'Bonus Games (5-10 min)',
      rows: [
        {
          id: 'game_profile_builder',
          title: '👤 Profile Builder',
          description: 'Earn ₹20 + 200pts | Personalize experience',
          icon: '👤'
        },
        {
          id: 'game_preference_quiz',
          title: '💡 Preference Quiz',
          description: 'Earn ₹25 + 250pts | Get better recommendations',
          icon: '💡'
        },
      ]
    }
  ],
  footer: "💡 Tip: Voice answers earn 10% bonus!",
  buttonText: 'View Games'
}
```

**Trigger:** User wants more games
**Next:** Based on game selection → Specific game flow

---

### 🎯 **Game Type 1: Intent Quest (Natural Language Collection)**

#### Intent Quest - Instructions
```javascript
{
  role: 'assistant',
  content: "🎯 Intent Quest - Level 1\n\n🎮 How to play:\nI'll give you scenarios. You say what you'd say NATURALLY to place that order.\n\n✅ Speak like you talk to friends\n✅ Any language (Hindi, English, Hinglish, Marathi)\n✅ Be natural - don't overthink!\n\n💰 Earn ₹3 per scenario (5 scenarios = ₹15)\n\n🎤 Voice answers get 10% bonus!\n\nReady? Let's go! 🚀",
  buttons: [
    { id: 'start_intent_quest', title: '▶️ Start Game', primary: true },
    { id: 'how_scoring', title: 'How is scoring done?' },
    { id: 'back_menu', title: '← Back to menu' },
  ]
}
```

#### Intent Quest - Scenario 1
```javascript
{
  role: 'assistant',
  content: "🎯 Scenario 1 of 5\n\n📍 Situation:\nYou're hungry and want to order a burger from McDonald's near College Road, Nashik.\n\nWhat would you say?\n\n💰 Earn: ₹3 + 30 points",
  allowVoice: true,
  showVoiceFirst: true,
  voiceHint: "🎤 Speak naturally!",
  exampleHints: [
    "Example: 'Mujhe McDonald's se burger chahiye College Road ke paas'",
    "Or: 'I want burger from McDonald's in College Road'",
    "Or: 'McDonald's College Road burger order karna hai'"
  ],
  gameMetadata: {
    scenario: 'order_food_mcdonalds_burger_college_road',
    expectedIntent: 'order_food',
    expectedEntities: ['McDonald\'s', 'burger', 'College Road'],
  }
}
```

**Data Collected:**
- Intent expression variations
- Entity mention patterns
- Language mixing (code-switching)
- Casual vs formal tone

**Scoring:**
```javascript
const score = {
  intentRecognized: 40, // Did we detect order_food intent?
  entitiesFound: 30,    // Found: restaurant, item, location?
  naturalness: 20,      // Sounds like human, not robot?
  completeness: 10,     // Has all required info?
}
```

**Continue for 5 scenarios, varying:**
- Different restaurants
- Different items
- Different locations
- Different times (now, later, tomorrow)
- Different constraints (budget, dietary)

---

### 🌍 **Game Type 2: Language Master (Multilingual Data)**

```javascript
{
  role: 'assistant',
  content: "🌍 Language Master - Show Your Language Skills!\n\n🎮 How to play:\nI'll give you English sentences. You translate them into YOUR language - Hindi, Marathi, Hinglish, whatever you speak!\n\n💰 Earn ₹3 per translation (5 translations = ₹15)\n🎤 Voice preferred (get natural pronunciation!)\n\n🏆 Bonus: +₹5 if you mix 2+ languages naturally!\n\nReady?",
  buttons: [
    { id: 'start_lang_master', title: '▶️ Start Game' },
    { id: 'back_menu', title: '← Back' },
  ]
}

// Scenario 1
{
  role: 'assistant',
  content: "🌍 Translate This:\n\n📝 English:\n\"I want to order pizza for dinner tonight\"\n\n🎤 Say it in YOUR language:\n\n💰 Earn: ₹3 + 30 points",
  allowVoice: true,
  showVoiceFirst: true,
  gameMetadata: {
    sourceText: "I want to order pizza for dinner tonight",
    collectLanguage: true,
    collectDialect: true,
  }
}
```

**Data Collected:**
- Multilingual translations
- Code-switching patterns
- Regional dialects
- Pronunciation (if voice)

---

### 🔍 **Game Type 3: Validate Stores (Business Intelligence!)**

```javascript
{
  role: 'assistant',
  content: "🔍 Store Validator - Help Us Map Nashik!\n\n🎮 How it works:\nWe'll show you stores near you. Just tell us:\n✅ YES - I use/know this store\n❌ NO - Never heard of it\n🤷 MAYBE - Seen it, never used\n\n💰 Earn ₹2 per validation (5 stores = ₹10)\n📍 Uses your location for nearby stores\n\nReady to help?",
  buttons: [
    { id: 'start_store_validate', title: '▶️ Start Validating' },
    { id: 'why_needed', title: 'Why is this needed?' },
    { id: 'back_menu', title: '← Back' },
  ]
}

// Store 1
{
  role: 'assistant',
  content: "🔍 Store Validation 1 of 5\n\n🍕 Domino's Pizza\n📍 Location: College Road, Nashik\n⭐ Rating: 4.2\n\nDo you know/use this store?",
  buttons: [
    { id: 'yes_use', title: '✅ Yes, I use it' },
    { id: 'yes_know', title: '👍 I know it, don't use' },
    { id: 'no', title: '❌ Never heard of it' },
  ],
  additionalQuestion: "How often do you order from here?",
  gameMetadata: {
    storeId: 'dominos_college_road_123',
    storeType: 'restaurant',
    validationType: 'usage_frequency',
  }
}
```

**Data Collected:**
- Store usage patterns
- Local knowledge
- Preference mapping
- Frequency data

---

### 👤 **Game Type 4: Profile Builder (Deep Preferences!)**

```javascript
{
  role: 'assistant',
  content: "👤 Profile Builder - Get Personalized!\n\n🎮 What you'll do:\nAnswer 5 questions about your preferences. This helps us:\n✅ Show you better recommendations\n✅ Suggest perfect restaurants\n✅ Save your favorites\n✅ Give you relevant deals\n\n💰 Earn ₹4 per question (5 questions = ₹20)\n🎁 BONUS: Complete profile = Extra ₹10!\n\n🎤 Voice or text - your choice!\n\nReady to personalize?",
  buttons: [
    { id: 'start_profile', title: '▶️ Build My Profile' },
    { id: 'skip_profile', title: 'Skip for now' },
  ]
}

// Question 1
{
  role: 'assistant',
  content: "👤 Profile Question 1 of 5\n\n🍽️ What's your go-to restaurant in Nashik?\n\nJust name the place you order from most!\n\n💰 Earn: ₹4 + 40 points",
  allowVoice: true,
  voiceHint: "Say: 'I usually order from...'",
  gameMetadata: {
    questionType: 'favorite_restaurant',
    saveToProfile: 'preferences.favorite_restaurants',
  }
}

// Question 2
{
  role: 'assistant',
  content: "✅ Nice! +₹4\n\n👤 Question 2 of 5\n\n💰 What's your usual budget for food delivery?",
  buttons: [
    { id: 'budget_under_200', title: 'Under ₹200' },
    { id: 'budget_200_400', title: '₹200 - ₹400' },
    { id: 'budget_400_600', title: '₹400 - ₹600' },
    { id: 'budget_above_600', title: 'Above ₹600' },
  ],
  gameMetadata: {
    questionType: 'budget_range',
    saveToProfile: 'preferences.budget_range',
  }
}

// Question 3
{
  role: 'assistant',
  content: "✅ Got it! +₹4\n\n👤 Question 3 of 5\n\n🍜 What type of cuisine do you prefer?",
  buttons: [
    { id: 'cuisine_indian', title: '🍛 Indian' },
    { id: 'cuisine_chinese', title: '🥡 Chinese' },
    { id: 'cuisine_italian', title: '🍕 Italian' },
    { id: 'cuisine_fast_food', title: '🍔 Fast Food' },
    { id: 'cuisine_all', title: '😋 I like everything!' },
  ],
  multiSelect: true,
  gameMetadata: {
    questionType: 'cuisine_preference',
    saveToProfile: 'preferences.cuisines',
  }
}

// Question 4
{
  role: 'assistant',
  content: "✅ Perfect! +₹4\n\n👤 Question 4 of 5\n\n🥗 Dietary preferences?",
  buttons: [
    { id: 'diet_veg', title: '🥗 Vegetarian' },
    { id: 'diet_nonveg', title: '🍗 Non-Veg' },
    { id: 'diet_both', title: '🍽️ Both' },
    { id: 'diet_vegan', title: '🌱 Vegan' },
  ],
  gameMetadata: {
    questionType: 'dietary_preference',
    saveToProfile: 'preferences.dietary',
  }
}

// Question 5
{
  role: 'assistant',
  content: "✅ Awesome! +₹4\n\n👤 Final Question!\n\n⏰ When do you usually order food?",
  buttons: [
    { id: 'time_lunch', title: '🌞 Lunch (12-3 PM)' },
    { id: 'time_evening', title: '🌆 Evening (6-8 PM)' },
    { id: 'time_dinner', title: '🌙 Dinner (8-11 PM)' },
    { id: 'time_late', title: '🌃 Late night (11PM+)' },
  ],
  multiSelect: true,
  gameMetadata: {
    questionType: 'order_time_preference',
    saveToProfile: 'preferences.order_times',
  }
}

// Profile Complete!
{
  role: 'assistant',
  content: "🎊 PROFILE COMPLETE!\n\n📊 Your Rewards:\n• ₹20 (5 questions)\n• ₹10 BONUS (completed profile)\n• 300 points\n\n💰 Total Earned: ₹30\n⭐ Total Points: 300\n\n🏦 Overall Balance:\n💵 Wallet: ₹45\n⭐ Points: 450\n🔥 Streak: 3 games\n\n🎁 You're on fire! Keep going to unlock:\n• ₹50 milestone (5 more games)\n• Leaderboard ranking\n• Referral bonuses\n\nWant to play more?",
  buttons: [
    { id: 'play_more_games', title: '🎮 More games!' },
    { id: 'share_earn', title: '📤 Share & Earn ₹50' },
    { id: 'view_leaderboard', title: '🏆 Leaderboard' },
  ],
  celebrationAnimation: true
}
```

---

### 🚀 **Act 5: Coming Soon + App Download**

#### Message: User Asks to Order
```javascript
// Trigger: User asks "Can I order now?" or clicks order button
{
  role: 'assistant',
  content: "Almost there! 🚀\n\nThe chat ordering feature is COMING SOON!\n\n📱 But you can use your rewards RIGHT NOW:\n\n1️⃣ Download Mangwale App\n2️⃣ Login with your number\n3️⃣ Your ₹45 + 450 points are waiting!\n4️⃣ Start ordering from 1000+ restaurants\n\n🎁 Special offer: Download now, get extra ₹25!\n\n📲 Choose your platform:",
  buttons: [
    { id: 'download_android', title: '📱 Download Android', url: 'https://play.google.com/...' },
    { id: 'download_ios', title: '🍎 Download iOS', url: 'https://apps.apple.com/...' },
    { id: 'continue_games', title: '🎮 Play more games first' },
  ],
  metadata: {
    conversionPoint: 'app_download_cta',
    userBalance: { wallet: 45, points: 450 }
  }
}
```

**Trigger:** User wants to place order
**Goal:** Convert to app download
**Incentive:** Rewards already earned + bonus ₹25

---

### 🔄 **Engagement Loops (Keep Them Coming Back!)**

#### Loop 1: Every 5 Messages
```javascript
// Trigger: messageCount % 5 === 0 && no active game
{
  role: 'assistant',
  content: "🎮 Quick break! Want to earn ₹5 in just 30 seconds?\n\nPlay a mini-game while we chat!",
  buttons: [
    { id: 'quick_game', title: '💰 Sure, earn ₹5!' },
    { id: 'continue_chat', title: 'No, continue chat' },
  ],
  gameMetadata: {
    triggerType: 'periodic_engagement',
    gameType: 'mini_validation',
    reward: { wallet: 5, points: 50 }
  }
}
```

---

#### Loop 2: User Idle (1 minute)
```javascript
// Trigger: timeSinceLastMessage > 60000ms
{
  role: 'assistant',
  content: "Still there? 👋\n\n🎮 While you think, want to earn ₹5 quick?\n\nJust answer: Would you use Burger King in Nashik?\n\n💰 ₹5 + 50 points",
  buttons: [
    { id: 'yes_use_bk', title: '✅ Yes' },
    { id: 'no_use_bk', title: '❌ No' },
    { id: 'maybe_bk', title: '🤷 Maybe' },
  ],
  gameMetadata: {
    triggerType: 'idle_reengagement',
    gameType: 'quick_validation',
    storeId: 'burger_king_nashik',
  }
}
```

---

#### Loop 3: User Types "earn" / "money" / "reward"
```javascript
// Trigger: message.toLowerCase().includes('earn|money|reward|cash|points')
{
  role: 'assistant',
  content: "💰 Want to earn? You're in the right place!\n\n🎮 Current games available:\n• Intent Quest: ₹15 + 150pts (5 min)\n• Language Master: ₹15 + 150pts (5 min)\n• Store Validator: ₹10 + 100pts (3 min)\n• Profile Builder: ₹20 + 200pts (5 min)\n\n🏦 Your Balance:\n💵 Wallet: ₹45\n⭐ Points: 450\n\n🎁 Play 2 more games to unlock ₹50 milestone!\n\nWhich game?",
  buttons: [
    { id: 'view_game_menu', title: '🎮 Show all games' },
    { id: 'quick_earn', title: '⚡ Quick ₹5 game' },
    { id: 'check_balance', title: '💰 Check balance' },
  ]
}
```

---

### 📊 **Stats & Progress (Gamification Elements)**

#### View Profile Stats
```javascript
{
  role: 'assistant',
  content: "📊 YOUR STATS\n\n💰 Earnings:\n• Wallet: ₹45.00\n• Points: 450\n• Games Played: 3\n• Success Rate: 95%\n\n🏆 Achievements:\n✅ First Game (₹15)\n✅ Profile Complete (₹30)\n🔒 Store Expert (2 more validations)\n🔒 Language Pro (1 more translation)\n\n🔥 Current Streak: 3 games\n⚡ Next Milestone: ₹50 (2 more games)\n\n🥇 Leaderboard Rank: #47 (Play more to climb!)\n\n📈 Progress:\n[██████████░░░░░░░░░░] 50% to next level\n\nKeep playing to unlock exclusive rewards!",
  buttons: [
    { id: 'play_more_stats', title: '🎮 Play more games' },
    { id: 'view_leaderboard', title: '🏆 See leaderboard' },
    { id: 'refer_friend', title: '📤 Refer & earn ₹50' },
  ]
}
```

---

### 🏆 **Leaderboard (Social Proof!)**

```javascript
{
  role: 'assistant',
  content: "🏆 TOP EARNERS THIS WEEK\n\n🥇 Rahul K. - ₹450 (28 games)\n🥈 Priya M. - ₹380 (22 games)\n🥉 Amit S. - ₹315 (19 games)\n\n---\n\n#47 YOU - ₹45 (3 games) ⬆️\n\nYou're ₹270 away from Top 3!\n\n💡 Play 15 more games to reach leaderboard!\n\n🎁 Weekly prizes:\n🥇 1st: ₹500 bonus\n🥈 2nd: ₹300 bonus\n🥉 3rd: ₹200 bonus\n\nKeep playing!",
  buttons: [
    { id: 'play_catch_up', title: '🎮 Play to catch up!' },
    { id: 'share_progress', title: '📤 Share my progress' },
    { id: 'back_games', title: '← Back to games' },
  ]
}
```

---

## 🎯 Data Collection Summary

### What We Collect Per Game Type:

**Profile Builder:**
- Location area
- Order frequency
- Favorite restaurants
- Budget range
- Cuisine preferences
- Dietary restrictions
- Order time preferences

**Intent Quest:**
- Natural language order expressions
- Intent variations
- Entity mention patterns
- Language mixing
- Tone (casual/formal)

**Language Master:**
- Multilingual translations
- Code-switching
- Dialect variations
- Pronunciation (voice)

**Store Validator:**
- Store usage patterns
- Local knowledge
- Preference mapping
- Frequency data

**All Games:**
- Voice vs text preference
- Response speed
- Engagement level
- Completion rate

---

## 🎮 Implementation Priority

1. **Phase 1 (NOW):** ✅ Basic flow working
   - Greeting → Intro → First Game → Congrats
   
2. **Phase 2 (Week 1):** ✅ Game variety
   - Add Intent Quest
   - Add Language Master
   - Add Store Validator
   
3. **Phase 3 (Week 2):** ✅ Engagement loops
   - Periodic prompts
   - Idle re-engagement
   - Keyword triggers
   
4. **Phase 4 (Week 3):** ✅ Gamification
   - Leaderboard
   - Achievements
   - Referrals
   - Milestones

---

**Ready to implement this conversation flow?** 🚀

Let me know if you want to:
1. Adjust any messaging
2. Change reward amounts
3. Add/remove game types
4. Modify triggers
5. Start coding the integration!
