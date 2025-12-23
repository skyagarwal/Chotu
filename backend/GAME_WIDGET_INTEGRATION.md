# 🎮 Game Widget Integration Guide

## Overview
Integrate gamification seamlessly into your existing conversational flow system. Games appear as **interactive widgets** in the chat interface (WhatsApp/Web/Mobile).

## ✅ Why This Approach is Better:

1. **Consistent UX** - Games appear naturally in conversation
2. **No Separate Login** - Uses existing session/auth
3. **Error-Free** - Leverages your proven NLU pipeline
4. **Higher Engagement** - Contextual game prompts
5. **Better Training Data** - Captures conversation context too

---

## 🏗️ Architecture

```
User Chat Message
    ↓
Conversation Service (existing)
    ↓
NLU Analysis (existing)
    ↓
[NEW] Check if game should be triggered
    ↓
    ├─→ Yes: Show game widget (buttons/list)
    │   ↓
    │   User selects game
    │   ↓
    │   Game mission sent as chat message
    │   ↓
    │   User responds naturally
    │   ↓
    │   Response analyzed & scored
    │   ↓
    │   Rewards given + Training data saved
    │
    └─→ No: Continue normal conversation flow
```

---

## 📦 What We Built

### 1. GameWidgetService (`game-widget.service.ts`)
- ✅ Generates interactive widgets (buttons/lists)
- ✅ Handles game selection
- ✅ Processes game responses
- ✅ Scores responses & calculates rewards
- ✅ Saves to `training_samples` table

### 2. Integration Points

**Trigger Games When:**
```typescript
// Option 1: After order completion
if (intent === 'order_complete') {
  await showGameWidget(userId);
}

// Option 2: User asks about earnings
if (message.includes('earn') || message.includes('money')) {
  await showGameWidget(userId);
}

// Option 3: Every 5 messages (engagement)
if (messageCount % 5 === 0) {
  await showGameWidget(userId);
}

// Option 4: User types "play" or "game"
if (message.toLowerCase().includes('play') || message.includes('game')) {
  await showGameWidget(userId);
}
```

---

## 🚀 Implementation Steps

### Step 1: Add GameWidgetService to GamificationModule

```typescript
// src/gamification/gamification.module.ts
import { GameWidgetService } from './services/game-widget.service';

@Module({
  providers: [
    ...
    GameWidgetService,
  ],
  exports: [
    GameWidgetService,
  ],
})
```

### Step 2: Inject into ConversationService

```typescript
// src/conversation/services/conversation.service.ts
import { GameWidgetService } from '../../gamification/services/game-widget.service';

@Injectable()
export class ConversationService {
  constructor(
    ...
    private gameWidget: GameWidgetService,
  ) {}
}
```

### Step 3: Trigger Game at Right Moments

```typescript
// Inside processMessage() method
async processMessage(phoneNumber: string, message: any) {
  // ... existing NLU analysis ...
  
  // Check if we should show game
  const shouldShowGame = await this.gameWidget.shouldPromptGame(
    userId,
    { lastIntent, messageCount, keywords }
  );
  
  if (shouldShowGame) {
    const widget = await this.gameWidget.generateGameWidget(userId);
    
    if (widget.type === 'list') {
      await this.messageService.sendListMessage(
        phoneNumber,
        widget.header,
        widget.body,
        widget.sections
      );
    } else if (widget.type === 'buttons') {
      await this.messageService.sendButtonMessage(
        phoneNumber,
        widget.body,
        widget.buttons
      );
    }
    
    return; // Stop here, wait for game selection
  }
  
  // ... continue normal conversation flow ...
}
```

### Step 4: Handle Game Interactions

```typescript
// When user selects a game from list/buttons
if (userInput.startsWith('game_')) {
  await this.gameWidget.handleGameSelection(
    userId,
    userInput,
    this.messageService,
    phoneNumber
  );
  return;
}

// When user is in active game session
const activeGame = await this.sessionService.getData(phoneNumber, 'active_game');
if (activeGame) {
  const result = await this.gameWidget.processGameResponse(
    userId,
    userInput,
    activeGame.sessionId
  );
  
  // Send results
  await this.messageService.sendTextMessage(
    phoneNumber,
    `${result.feedback}\n\n💰 +₹${result.rewards.wallet} | ⭐ +${result.rewards.points}pts`
  );
  
  // Clear game session
  await this.sessionService.deleteData(phoneNumber, 'active_game');
  return;
}
```

---

## 🎯 Game Widgets Examples

### Example 1: Game Menu (Interactive List)
```javascript
{
  type: 'interactive',
  interactive: {
    type: 'list',
    header: { type: 'text', text: '🎮 Play & Earn' },
    body: { text: 'Choose a game to play and earn rewards!' },
    action: {
      button: 'View Games',
      sections: [
        {
          title: 'Quick Games (2-5 min)',
          rows: [
            {
              id: 'game_intent_quest',
              title: '🎯 Intent Quest',
              description: 'Earn ₹15 + 150pts'
            },
            {
              id: 'game_language_master',
              title: '🌍 Language Master',
              description: 'Earn ₹15 + 150pts'
            }
          ]
        }
      ]
    }
  }
}
```

### Example 2: Game Mission (Buttons)
```javascript
{
  type: 'interactive',
  interactive: {
    type: 'button',
    body: { 
      text: '🎯 Intent Quest\n\nSay naturally: "I want to order pizza from Dominos in Nashik"\n\n💰 Earn up to ₹15 + 150pts'
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: { id: 'game_start', title: '▶️ Start' }
        },
        {
          type: 'reply',
          reply: { id: 'game_skip', title: '⏭️ Skip' }
        }
      ]
    }
  }
}
```

### Example 3: Result (Text Message)
```
🎉 Excellent! Perfect response!

Score: 95%
💰 +₹15.00
⭐ +950 points

Current Streak: 3🔥
Total Earned Today: ₹45.50

Want to play again? Reply "play"
```

---

## 📱 Web Chat Widget Integration

For your web chat interface, games can appear as **rich cards**:

```html
<div class="game-card-widget">
  <div class="game-header">
    <span class="game-icon">🎮</span>
    <h3>Play & Earn</h3>
  </div>
  <div class="game-stats">
    <div class="stat">
      <div class="label">Earned Today</div>
      <div class="value">₹45</div>
    </div>
    <div class="stat">
      <div class="label">Missions</div>
      <div class="value">12</div>
    </div>
    <div class="stat">
      <div class="label">Streak</div>
      <div class="value">3🔥</div>
    </div>
  </div>
  <button onclick="openGame()">Play Now</button>
</div>
```

---

## 🎮 Conversation Flow Examples

### Example 1: After Order Completion
```
User: "I want to order pizza"
Bot: "🍕 Great! I found 3 pizza places near you..."
[Order flow completes]
Bot: "✅ Order confirmed! #12345"
Bot: "🎮 While you wait, want to play a quick game and earn ₹15?"
     [Play Now] [Maybe Later]
User: [Clicks "Play Now"]
Bot: "🎯 Intent Quest - Say: 'I want to order burger from McDonald's'"
User: "I want burger from McDonald's please"
Bot: "🎉 Excellent! +₹15 | +150pts"
```

### Example 2: User Asks About Earnings
```
User: "How can I earn money?"
Bot: "💰 You can earn by playing games! Each game pays ₹5-₹15"
Bot: "🎮 Play & Earn
     Choose a game:
     [View Games]"
User: [Selects "Intent Quest"]
Bot: "🎯 Say naturally: 'I want pizza from Dominos in Nashik'"
User: "Mujhe Dominos se pizza chahiye Nashik mein"
Bot: "🎉 Perfect Hinglish! +₹15 | +150pts"
```

### Example 3: Random Engagement
```
User: "What's the weather?"
Bot: "☀️ Nashik: 28°C, Sunny"
[5 messages later]
Bot: "🎮 Quick break! Want to earn ₹5 in 30 seconds?"
     [Yes] [No Thanks]
User: [Clicks "Yes"]
Bot: "🔍 Would you use Burger King in Nashik? [YES] [NO]"
User: [Clicks "YES"]
Bot: "✅ Thanks! +₹5 | +50pts"
```

---

## 💾 Database Integration

Games automatically save to your existing tables:

### training_samples Table
```sql
INSERT INTO training_samples (
  user_id,
  user_response,
  game_type,
  score,
  intent,
  language,
  tone,
  created_at
) VALUES (
  123,
  'I want pizza from Dominos in Nashik',
  'intent_quest',
  95,
  'order_food',
  'en',
  'neutral',
  NOW()
);
```

### game_sessions Table
```sql
-- Track active games
INSERT INTO game_sessions (
  session_id,
  user_id,
  game_type,
  status,
  started_at
) VALUES (
  'session_123456',
  123,
  'intent_quest',
  'ACTIVE',
  NOW()
);
```

---

## 🔧 Configuration

### Enable/Disable Game Prompts
```typescript
// In environment or database config
GAME_PROMPT_FREQUENCY: 5, // Show every 5 messages
GAME_PROMPT_AFTER_ORDER: true,
GAME_PROMPT_KEYWORDS: ['earn', 'money', 'play', 'game', 'reward'],
GAME_MIN_INTERVAL_HOURS: 24, // Don't prompt same user within 24h
```

### Customize Rewards
```typescript
// All rewards from database (no hardcoding!)
SELECT * FROM reward_config WHERE game_type = 'intent_quest';
// Returns: wallet_amount, loyalty_points, free_attempts, etc.
```

---

## 📊 Analytics & Monitoring

Track game engagement:

```sql
-- Daily game stats
SELECT 
  DATE(created_at) as date,
  COUNT(*) as games_played,
  AVG(score) as avg_score,
  SUM(wallet_reward) as total_wallet_paid,
  COUNT(DISTINCT user_id) as unique_players
FROM game_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Training data collected
SELECT 
  game_type,
  COUNT(*) as samples_collected,
  AVG(score) as avg_quality
FROM training_samples
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY game_type;
```

---

## 🚀 Deployment Checklist

- [ ] Add GameWidgetService to GamificationModule
- [ ] Inject into ConversationService
- [ ] Add game trigger logic to processMessage()
- [ ] Handle game selection responses
- [ ] Test interactive list on WhatsApp
- [ ] Test button interactions
- [ ] Verify training data saves correctly
- [ ] Test reward distribution
- [ ] Add analytics tracking
- [ ] Monitor engagement metrics

---

## 🎯 Benefits of This Approach

1. **Seamless UX** - No app switch, games in conversation
2. **Higher Completion** - Already authenticated, in flow
3. **Better Data** - Conversation context included
4. **Viral Growth** - Easy to share in chat
5. **Lower Friction** - No separate login/registration
6. **Contextual** - Games appear when relevant
7. **Platform Agnostic** - Works on WhatsApp, Web, Mobile
8. **Error-Free** - Uses existing proven infrastructure

---

**Next Steps**: 
1. Review this integration approach
2. Decide on game trigger points (order complete? every 5 msgs? keyword?)
3. I'll implement the actual integration in your ConversationService
4. Test on WhatsApp first, then web chat
5. Monitor engagement and iterate

Would you like me to proceed with the actual integration?
