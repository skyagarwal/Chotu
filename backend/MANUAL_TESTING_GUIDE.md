# 🧪 Manual Testing Guide for New Flows

## Quick Test via Browser (chat.mangwale.ai)

### Prerequisites
- Open http://chat.mangwale.ai/chat in browser
- Open browser DevTools (F12) → Console tab

### Test Sequence

#### 1. Test Greeting Flow (Existing - Baseline)
```
Type: "hi"
Expected: Welcome message mentioning Mangwale services & rewards
```

#### 2. Test Farewell Flow (NEW)
```
Type: "goodbye"
Expected: Warm farewell message, encouragement to return, mention of rewards

Variations to test:
- "bye"
- "see you later"
- "ttyl"
```

#### 3. Test Chitchat Flow (NEW)
```
Type: "how are you?"
Expected: Friendly response + gentle suggestion of services

Variations to test:
- "thank you"
- "thanks"
- "what's up"
- "nice"
```

#### 4. Test Feedback Flow (NEW)
```
Type: "I want to give feedback"
Expected: 
  Step 1: Ask for rating (1-4)
  Step 2: After you type "1", asks for comments
  Step 3: After comment, thanks you

Full sequence:
User: "feedback"
Bot: "How would you rate... 1-4?"
User: "1"
Bot: "Any specific comments?"
User: "Great service!"
Bot: "Thank you for your feedback!"
```

#### 5. Test Help Flow (Existing)
```
Type: "help"
Expected: List of capabilities
```

#### 6. Test Game Introduction (Existing)
```
Type: "I want to play a game"
Expected: Introduction to games/rewards system
```

---

## Verify in Database

### 1. Check flows are loaded
```bash
docker exec 685225a33ea5_mangwale_postgres psql -U mangwale_config -d headless_mangwale -c \
  "SELECT id, name, enabled FROM flows WHERE id IN ('farewell_v1', 'chitchat_v1', 'feedback_v1');"
```

**Expected**: 3 rows, all `enabled = t`

### 2. Check conversation logging
```bash
docker exec 685225a33ea5_mangwale_postgres psql -U mangwale_config -d headless_mangwale -c \
  "SELECT id, role, content, created_at FROM conversation_memory ORDER BY created_at DESC LIMIT 10;"
```

**Expected**: See your test messages appearing as new rows

### 3. Check flow runs
```bash
docker exec 685225a33ea5_mangwale_postgres psql -U mangwale_config -d headless_mangwale -c \
  "SELECT flow_id, status, COUNT(*) FROM flow_runs GROUP BY flow_id, status ORDER BY flow_id;"
```

**Expected**: See counts for farewell_v1, chitchat_v1, feedback_v1

---

## Check Logs for Issues

### View AI service logs
```bash
docker logs mangwale_ai_service --tail 50 --follow
```

**Watch for**:
- "💾 Flow saved: [Flow Name]" - Flow loaded successfully
- Error messages
- Flow execution traces

### View NLU service logs
```bash
docker logs mangwale-ai-nlu --tail 20
```

**Expected**: NLU classification requests when NLU_AI_ENABLED=true

---

## WebSocket Testing (Advanced)

### Using browser console
```javascript
// Connect to AI backend
const socket = io('http://localhost:3201/ai-agent', {
  transports: ['websocket']
});

// Listen for messages
socket.on('message', (msg) => {
  console.log('Bot:', msg);
});

// Join session
socket.emit('session:join', {
  sessionId: 'test-123',
  phone: '+255700000001'
});

// Send test message
socket.emit('message:send', {
  message: 'goodbye',
  sessionId: 'test-123'
});
```

---

## Expected Behavior Summary

| User Input | Expected Flow | Expected Response |
|------------|---------------|-------------------|
| "hi" | greeting_v1 | Welcome + services mention + rewards |
| "goodbye" | farewell_v1 | Warm goodbye + come back message |
| "bye" | farewell_v1 | Similar farewell response |
| "how are you" | chitchat_v1 | Friendly + suggest services |
| "thank you" | chitchat_v1 | You're welcome + help offer |
| "feedback" | feedback_v1 | Ask for rating (1-4) |
| (after rating) | feedback_v1 | Ask for comments |
| (after comment) | feedback_v1 | Thank you message |
| "help" | help_v1 | List capabilities |
| "play game" | game_intro_v1 | Introduce games |

---

## Troubleshooting

### Issue: Flow not triggering
**Check**: 
1. Is flow enabled? `SELECT enabled FROM flows WHERE id = 'farewell_v1';`
2. Is trigger correct? `SELECT trigger FROM flows WHERE id = 'farewell_v1';`
3. Check logs: `docker logs mangwale_ai_service --tail 50`

### Issue: No response
**Check**:
1. WebSocket connected? (Check browser console)
2. Service running? `docker ps | grep mangwale_ai`
3. Database connected? `docker logs mangwale_ai_service | grep "Connected to PostgreSQL"`

### Issue: Wrong response
**Check**:
1. LLM service running? `docker ps | grep vllm`
2. System prompt correct? Check flow definition
3. NLU interfering? Check `NLU_AI_ENABLED` setting

---

## Success Criteria

✅ All 9 flows listed in database  
✅ All flows have `enabled = true`  
✅ Test messages receive appropriate responses  
✅ Conversations logged in conversation_memory  
✅ Flow runs recorded in flow_runs  
✅ No errors in service logs  

---

## Next: Automated Testing

Once manual testing passes, create automated tests:

```typescript
// test/flows/farewell.spec.ts
describe('Farewell Flow', () => {
  it('should trigger on "goodbye"', async () => {
    const response = await sendMessage('goodbye');
    expect(response).toContain('Mangwale');
    expect(response).toContain('come back');
  });
  
  it('should trigger on "bye"', async () => {
    const response = await sendMessage('bye');
    expect(response).toBeTruthy();
  });
});
```

---

**Test Duration**: ~10 minutes for full manual test  
**Required**: Browser access to chat.mangwale.ai  
**Optional**: Database access for verification
