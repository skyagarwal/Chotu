# 🌐 MANGWALE MULTI-CHANNEL ARCHITECTURE

**Date**: November 5, 2025  
**Status**: ✅ FULLY IMPLEMENTED - Channel Agnostic System  
**Current Focus**: Testing CHAT MODEL (not limited to WhatsApp)

---

## 🎯 CRITICAL UNDERSTANDING

> **YOU ARE NOT JUST BUILDING FOR WHATSAPP**  
> **YOU ARE BUILDING A MULTI-CHANNEL CONVERSATION PLATFORM**

The system is designed to work across **ANY channel** with a **unified conversation engine**.

---

## 📊 SUPPORTED CHANNELS (Current Implementation)

### ✅ **Fully Implemented Channels**

| Channel | Endpoint | Platform Enum | Status | Use Case |
|---------|----------|---------------|--------|----------|
| **WhatsApp** | `POST /webhook/whatsapp` | `Platform.WHATSAPP` | ✅ Active | Primary messaging channel |
| **Telegram** | `POST /webhook/telegram` | `Platform.TELEGRAM` | ✅ Active | Secondary messaging |
| **RCS** | N/A (Provider level) | `Platform.RCS` | ✅ Configured | Rich messaging |
| **Web Chat** | WebSocket `/` | `web` (session) | ✅ Active | Browser-based chat |
| **REST API** | `POST /test/message` | N/A | ✅ Active | Testing & Integration |

### 🔮 **Future Channels** (Architecture Ready)

- **Mobile App** (Native iOS/Android) - Same ConversationService
- **Voice** (Phone calls) - TTS/ASR integration ready
- **SMS** - Can be added as new provider
- **Email** - Can be added as new provider
- **Slack/Discord** - Can be added as new provider

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHANNEL ENTRY POINTS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  WhatsApp          Telegram         Web Chat         Test API    │
│  webhook.          telegram-        chat.            test.        │
│  controller.ts     webhook.ts       gateway.ts       controller  │
│       │                │                 │                │       │
│       └────────────────┴─────────────────┴────────────────┘       │
│                              │                                    │
│                              ▼                                    │
│                ┌─────────────────────────┐                       │
│                │  ConversationService    │                       │
│                │  (Channel Agnostic)     │                       │
│                └─────────────────────────┘                       │
│                              │                                    │
│              ┌───────────────┴───────────────┐                   │
│              ▼                               ▼                   │
│    ┌──────────────────┐          ┌──────────────────┐          │
│    │  Business Logic  │          │  MessagingService│          │
│    │  - ParcelService │          │  (Channel Router)│          │
│    │  - OrderService  │          └──────────────────┘          │
│    │  - FoodService   │                    │                    │
│    │  - AgentOrch.    │        ┌───────────┴──────────┐        │
│    └──────────────────┘        ▼          ▼          ▼         │
│                         WhatsAppProv TelegramProv RCSProv       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 HOW IT WORKS

### 1. **Channel Entry Points** (Controllers/Gateways)

Each channel has its own entry point that:
- Receives platform-specific payload
- Extracts user identifier (phone, chatId, sessionId)
- **Sets platform in session** via `sessionService.setData(recipientId, 'platform', Platform.XXX)`
- Normalizes message format
- Calls `ConversationService.processMessage()`

#### Example: WhatsApp Entry
```typescript
// src/whatsapp/controllers/webhook.controller.ts
@Post()
async receive(@Body() payload: any) {
  const phoneNumber = payload.entry[0].changes[0].value.messages[0].from;
  const message = { text: { body: "I want to send a parcel" } };
  
  // Platform is implicit (WhatsApp webhook)
  await this.conversationService.processMessage(phoneNumber, message);
}
```

#### Example: Telegram Entry
```typescript
// src/telegram/controllers/telegram-webhook.controller.ts
@Post()
async receive(@Body() update: any) {
  const chatId = String(update.message.chat.id);
  
  // SET PLATFORM IN SESSION ⭐
  await this.sessionService.setData(chatId, 'platform', Platform.TELEGRAM);
  
  const message = { text: { body: update.message.text } };
  await this.conversationService.processMessage(chatId, message);
}
```

#### Example: Web Chat Entry
```typescript
// src/chat/chat.gateway.ts (WebSocket)
@SubscribeMessage('message:send')
async handleMessage(@MessageBody() payload: MessagePayload) {
  const { message, sessionId } = payload;
  
  // SET PLATFORM IN SESSION ⭐
  await this.sessionService.setData(sessionId, { platform: 'web' });
  
  await this.conversationService.processMessage(sessionId, {
    text: { body: message }
  });
}
```

### 2. **Unified Conversation Engine** (ConversationService)

**Location**: `src/conversation/services/conversation.service.ts`

**Key Features**:
- ✅ **100% Channel Agnostic** - No WhatsApp/Telegram specific code
- ✅ Handles conversation state via `SessionService`
- ✅ Routes to appropriate business logic (Parcel, Food, Orders, etc.)
- ✅ Integrates with Agent System (LLM-powered responses)
- ✅ Uses `MessagingService` for all outbound messages

**Example Flow**:
```typescript
async processMessage(recipientId: string, message: any): Promise<void> {
  // Get session (works for ANY channel)
  let session = await this.sessionService.getSession(recipientId);
  
  const messageText = message.text?.body?.trim().toLowerCase();
  
  // Handle based on conversation step
  switch (session.currentStep) {
    case 'main_menu':
      await this.handleMainMenu(recipientId, messageText);
      break;
      
    case 'parcel_delivery_ai':
      // AI-powered parcel (works on ALL channels!)
      session = await this.parcelService.handleParcelDelivery(
        recipientId, messageText, session
      );
      break;
      
    // ... more cases
  }
}
```

### 3. **Channel-Agnostic Messaging** (MessagingService)

**Location**: `src/messaging/services/messaging.service.ts`

**How It Routes Messages**:

```typescript
async sendTextMessage(platform: Platform, recipientId: string, text: string) {
  // Resolve platform from session (if configured)
  const resolved = await this.resolvePlatform(recipientId, platform);
  
  // Route to appropriate provider
  const provider = this.getProvider(resolved); // WhatsApp, Telegram, RCS
  return provider.sendTextMessage(recipientId, text);
}
```

**Special Case: Web Chat**
```typescript
// For web sessions (sessionId starts with 'web-')
const isWebPlatform = recipientId.startsWith('web-');

if (isWebPlatform) {
  // Store in Redis (WebSocket retrieves it)
  await this.sessionService.storeBotMessage(recipientId, text);
  return true; // No external API call
}
```

### 4. **Platform Providers** (Actual Message Sending)

```
src/messaging/providers/
├── whatsapp.provider.ts     → Calls WhatsApp Business API
├── telegram.provider.ts     → Calls Telegram Bot API
└── rcs.provider.ts          → Calls RCS API
```

Each implements `MessagingProvider` interface:
```typescript
interface MessagingProvider {
  sendTextMessage(recipientId: string, text: string): Promise<boolean>;
  sendImageMessage(recipientId: string, imageUrl: string, caption?: string): Promise<boolean>;
  sendButtonMessage(recipientId: string, text: string, buttons: MessageButton[]): Promise<boolean>;
  sendListMessage(recipientId: string, text: string, buttonText: string, items: MessageListItem[]): Promise<boolean>;
  sendLocationRequest(recipientId: string, text: string): Promise<boolean>;
  markAsRead?(recipientId: string, messageId: string): Promise<boolean>;
}
```

---

## 🔑 KEY DESIGN PRINCIPLES

### ✅ **1. Single Source of Truth for Business Logic**

❌ **DON'T**:
```typescript
// whatsapp-specific-service.ts
class WhatsAppParcelService {
  async handleParcelOrder(phoneNumber, message) {
    // Logic here
  }
}

// telegram-specific-service.ts
class TelegramParcelService {
  async handleParcelOrder(chatId, message) {
    // DUPLICATE logic here
  }
}
```

✅ **DO**:
```typescript
// parcel.service.ts (Channel agnostic)
class ParcelService {
  async handleParcelDelivery(recipientId, message, session) {
    // ONE implementation works for ALL channels
  }
}
```

### ✅ **2. Platform Stored in Session**

Every conversation stores its platform:
```typescript
// When message arrives
await this.sessionService.setData(recipientId, 'platform', Platform.TELEGRAM);

// When sending reply
const platform = await this.sessionService.getData(recipientId, 'platform');
await this.messagingService.sendTextMessage(platform, recipientId, text);
```

### ✅ **3. Normalized Message Format**

All channels convert to:
```typescript
{
  text: { body: "User message here" }
}
```

### ✅ **4. Provider Pattern for Extensibility**

Adding a new channel:
1. Create new provider: `src/messaging/providers/slack.provider.ts`
2. Implement `MessagingProvider` interface
3. Register in `MessagingService`
4. Create webhook controller: `src/slack/controllers/slack-webhook.controller.ts`
5. Done! All business logic works automatically

---

## 🧪 TESTING ACROSS CHANNELS

### Test via WhatsApp
```bash
curl -X POST http://localhost:3201/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "id": "msg_001",
            "from": "919876543210",
            "type": "text",
            "text": {"body": "I want to send a parcel"}
          }]
        }
      }]
    }]
  }'
```

### Test via Telegram
```bash
curl -X POST http://localhost:3201/webhook/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "chat": {"id": 123456789},
      "text": "I want to send a parcel"
    }
  }'
```

### Test via REST API (Channel Agnostic)
```bash
curl -X POST http://localhost:3201/test/message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "test_user_001",
    "message": "I want to send a parcel"
  }'
```

### Test via Web Chat (WebSocket)
```javascript
const socket = io('http://localhost:3201');
socket.emit('session:join', { sessionId: 'web-test-001' });
socket.emit('message:send', { 
  sessionId: 'web-test-001', 
  message: 'I want to send a parcel' 
});
socket.on('message', (msg) => console.log(msg));
```

---

## 📝 CURRENT FOCUS: CHAT MODEL

### What "Chat Model" Means

You're building a **conversational AI system** that:

1. **Accepts messages** from ANY source (WhatsApp, Telegram, Web, etc.)
2. **Maintains conversation context** via sessions (Redis-backed)
3. **Processes with AI** (vLLM, NLU, Agent System)
4. **Sends responses** back to the same channel automatically

### Chat Model Flow

```
User (Any Channel)
      │
      ▼
[Channel Webhook/Gateway]
      │
      ▼ normalize + set platform
[ConversationService]
      │
      ├─→ [Session Management] (Redis)
      ├─→ [Business Logic] (Parcel, Food, etc.)
      ├─→ [AI Agent System] (vLLM + tools)
      └─→ [NLU Service] (Intent classification)
      │
      ▼
[MessagingService]
      │
      ▼ route by platform
[Platform Provider] (WhatsApp/Telegram/RCS)
      │
      ▼
User (Same Channel)
```

---

## 🎯 IMPLEMENTATION STATUS

### ✅ **Working Channels**

| Channel | Entry Point | Status | Notes |
|---------|-------------|--------|-------|
| WhatsApp | `/webhook/whatsapp` | ✅ Working | Primary channel, 4+ days uptime |
| Telegram | `/webhook/telegram` | ✅ Working | Fully implemented |
| Web Chat | WebSocket `/` | ✅ Working | Redis-based message storage |
| Test API | `/test/message` | ✅ Working | For testing without external APIs |

### ✅ **Core Services**

| Service | Status | Notes |
|---------|--------|-------|
| ConversationService | ✅ Working | 3114 lines, fully channel-agnostic |
| MessagingService | ✅ Working | Routes to all 3 platform providers |
| SessionService | ✅ Working | Redis-backed, stores platform |
| ParcelService | ✅ Working | AI + Guidelines architecture |
| Agent Orchestrator | ✅ Working | LLM-powered (vLLM) |

### ✅ **Platform Providers**

| Provider | Implementation | Status |
|----------|----------------|--------|
| WhatsAppProvider | `messaging/providers/whatsapp.provider.ts` | ✅ Working |
| TelegramProvider | `messaging/providers/telegram.provider.ts` | ✅ Working |
| RCSProvider | `messaging/providers/rcs.provider.ts` | ✅ Configured |

---

## 🚀 WHAT THIS MEANS FOR DEVELOPMENT

### ❌ **STOP Thinking**:
- "This is a WhatsApp bot"
- "I need to add Telegram support separately"
- "Each channel needs its own logic"

### ✅ **START Thinking**:
- "This is a conversation platform"
- "Add new channel = new entry point + register provider"
- "Business logic works everywhere automatically"

### 💡 **When Adding New Features**:

**Example: Adding Refund Feature**

❌ **Wrong Approach**:
```typescript
// whatsapp-refund.service.ts
class WhatsAppRefundService { ... }

// telegram-refund.service.ts
class TelegramRefundService { ... }
```

✅ **Right Approach**:
```typescript
// refund.service.ts (ONE implementation)
@Injectable()
export class RefundService {
  async handleRefundRequest(recipientId: string, orderId: string, session: any) {
    // Get platform from session
    const platform = session.platform || Platform.WHATSAPP;
    
    // Process refund (channel agnostic)
    const result = await this.phpOrderService.requestRefund(orderId);
    
    // Send response (automatically routes to correct channel)
    await this.messagingService.sendTextMessage(
      platform, 
      recipientId, 
      `Refund initiated for order ${orderId}`
    );
  }
}
```

**Then use in ConversationService**:
```typescript
case 'refund_request':
  await this.refundService.handleRefundRequest(recipientId, orderId, session);
  break;
```

**It automatically works on**:
- ✅ WhatsApp
- ✅ Telegram
- ✅ Web Chat
- ✅ Any future channel

---

## 📚 CODE REFERENCE

### Key Files to Understand

1. **Channel Agnostic Core**:
   - `src/conversation/services/conversation.service.ts` (3114 lines)
   - `src/messaging/services/messaging.service.ts` (routing logic)
   - `src/session/session.service.ts` (state management)

2. **Channel Entry Points**:
   - `src/whatsapp/controllers/webhook.controller.ts`
   - `src/telegram/controllers/telegram-webhook.controller.ts`
   - `src/chat/chat.gateway.ts` (WebSocket)
   - `src/conversation/controllers/test.controller.ts`

3. **Platform Providers**:
   - `src/messaging/providers/whatsapp.provider.ts`
   - `src/messaging/providers/telegram.provider.ts`
   - `src/messaging/providers/rcs.provider.ts`

4. **Business Logic** (All channel agnostic):
   - `src/parcel/services/parcel.service.ts`
   - `src/agents/services/agent-orchestrator.service.ts`
   - `src/order-flow/services/*.service.ts`

5. **Platform Enum**:
   - `src/common/enums/platform.enum.ts`
   ```typescript
   export enum Platform {
     WHATSAPP = 'whatsapp',
     RCS = 'rcs',
     TELEGRAM = 'telegram',
   }
   ```

---

## 🎯 TESTING STRATEGY

### Phase 1: Single Channel ✅ (Current)
Test parcel flow on WhatsApp webhook

### Phase 2: Multi-Channel Testing
Same parcel conversation:
1. WhatsApp user: `+919876543210`
2. Telegram user: `chatId: 123456789`
3. Web user: `sessionId: web-test-001`
4. All should work identically!

### Phase 3: Cross-Channel Session (Future)
User starts on WhatsApp, continues on Web Chat (same session)

---

## 🔮 FUTURE ENHANCEMENTS

### Easy to Add:

1. **Voice Channel** (Phone Calls)
   - Entry: Twilio webhook
   - ASR: Convert speech → text → ConversationService
   - TTS: Convert response → speech (XTTS already running!)
   - Provider: VoiceProvider (Twilio/Custom)

2. **Mobile App** (Native)
   - Entry: REST API or WebSocket
   - Same ConversationService
   - Push notifications via provider

3. **Email Channel**
   - Entry: Email webhook (SendGrid, etc.)
   - Provider: EmailProvider (SMTP)

4. **Slack/Discord**
   - Entry: Bot webhook
   - Provider: SlackProvider/DiscordProvider

### All use the SAME:
- ✅ ConversationService
- ✅ ParcelService
- ✅ Agent System (vLLM)
- ✅ Business Logic
- ✅ Database (PHP Backend)

---

## 🏆 SUMMARY

### What You Have:

✅ **Multi-Channel Conversation Platform** (not just WhatsApp bot)  
✅ **3 Active Channels**: WhatsApp, Telegram, Web Chat  
✅ **Channel-Agnostic Business Logic**: Write once, works everywhere  
✅ **AI-Powered**: vLLM, NLU, Agent System works across ALL channels  
✅ **Extensible**: Add new channel = new entry point + provider  
✅ **Production Ready**: 4+ days uptime, all services healthy  

### Current Work Mode:

🎯 **Testing CHAT MODEL** = Testing the conversational AI flow  
📱 **Not limited to WhatsApp** = Works on any channel  
🤖 **AI + Guidelines** = Smart responses with fallback  
🌐 **Multi-Channel Ready** = Same code, different entry points  

---

## 📌 QUICK REFERENCE

### Add New Channel Checklist

- [ ] Create webhook controller (`src/{channel}/controllers/webhook.controller.ts`)
- [ ] Normalize incoming payload format
- [ ] Set platform in session: `sessionService.setData(id, 'platform', Platform.XXX)`
- [ ] Call `conversationService.processMessage(recipientId, normalizedMessage)`
- [ ] Create platform provider (`src/messaging/providers/{channel}.provider.ts`)
- [ ] Implement `MessagingProvider` interface
- [ ] Register in `MessagingService` constructor
- [ ] Test with existing business logic (Parcel, Food, etc.)
- [ ] Done! ✅

### Test Any Channel

```bash
# Template
curl -X POST http://localhost:3201/{channel_webhook} \
  -H "Content-Type: application/json" \
  -d '{ /* channel-specific format */ }'
```

### Debug Channel Routing

```typescript
// Check what platform is stored
const platform = await sessionService.getData(recipientId, 'platform');
console.log(`User ${recipientId} is on platform: ${platform}`);
```

---

**Remember**: You're building a **CONVERSATION PLATFORM**, not a channel-specific bot! 🚀
