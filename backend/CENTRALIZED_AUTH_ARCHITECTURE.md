# Centralized Authentication Architecture

## Overview

Mangwale AI uses a **centralized authentication system** that syncs login state across all channels:
- Web (chat.mangwale.ai)
- WhatsApp
- Future: Telegram, SMS, Mobile App

**Universal Identifier**: Phone number is used as the unique identifier across all platforms.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CENTRALIZED AUTH SYSTEM                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│    │  Web Chat   │    │  WhatsApp   │    │  Telegram   │             │
│    │  Frontend   │    │   Handler   │    │  (Future)   │             │
│    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │
│           │                  │                  │                     │
│           ▼                  ▼                  ▼                     │
│    ┌──────────────────────────────────────────────────┐               │
│    │              WebSocket Gateway                    │               │
│    │         (ChatGateway - /ai-agent)                │               │
│    │                                                   │               │
│    │  Events:                                         │               │
│    │  - auth:login    (login from any channel)        │               │
│    │  - auth:logout   (logout from any channel)       │               │
│    │  - auth:check    (check auth status)             │               │
│    │  - auth:synced   (broadcast to all clients)      │               │
│    └──────────────────────┬───────────────────────────┘               │
│                           │                                           │
│                           ▼                                           │
│    ┌──────────────────────────────────────────────────┐               │
│    │         CentralizedAuthService                   │               │
│    │                                                   │               │
│    │  Methods:                                        │               │
│    │  - authenticateUser(phone, token, userData)      │               │
│    │  - isAuthenticated(phone)                        │               │
│    │  - getAuthenticatedUser(phone)                   │               │
│    │  - logoutUser(phone, channel?)                   │               │
│    │  - broadcastAuthEvent(phone, event, data)        │               │
│    │  - syncAuthAcrossSessions(phone, userId, token)  │               │
│    │  - linkSessionToPhone(sessionId, phone)          │               │
│    │  - getSessionsForPhone(phone)                    │               │
│    └──────────────────────┬───────────────────────────┘               │
│                           │                                           │
│                           ▼                                           │
│    ┌──────────────────────────────────────────────────┐               │
│    │                Redis Store                        │               │
│    │                                                   │               │
│    │  Keys:                                           │               │
│    │  - auth:{phone}         → AuthenticatedUser JSON │               │
│    │  - session_phone:{id}   → phone number           │               │
│    │  - phone_sessions:{ph}  → Set of session IDs     │               │
│    │                                                   │               │
│    │  Pub/Sub:                                        │               │
│    │  - auth:events          → Auth event broadcasts  │               │
│    └──────────────────────────────────────────────────┘               │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Structures

### AuthenticatedUser (Stored in Redis)
```typescript
interface AuthenticatedUser {
  userId: number;           // PHP backend user ID
  phone: string;            // Normalized phone (+91...)
  email?: string;
  firstName: string;
  lastName?: string;
  token: string;            // PHP backend auth token
  authenticatedAt: number;  // First login timestamp
  lastActiveAt: number;     // Last activity timestamp
  channels: string[];       // Active channels: ['web', 'whatsapp', ...]
}
```

### AuthEvent (Published to Redis)
```typescript
interface AuthEvent {
  type: 'LOGIN' | 'LOGOUT' | 'TOKEN_REFRESH' | 'PROFILE_UPDATE';
  phone: string;
  userId?: number;
  channel: string;          // Channel that triggered event
  timestamp: number;
  data?: any;               // Additional event data
}
```

## Flow: Login via WhatsApp, Sync to Web

1. **User sends OTP via WhatsApp**
   - WhatsApp handler receives message
   - Triggers OTP flow via PHP backend

2. **OTP Verified**
   - PHP backend returns user profile + token
   - WhatsApp handler calls `centralizedAuth.authenticateUser()`

3. **Auth Stored Globally**
   - User data stored in Redis: `auth:{phone}`
   - Session linked: `phone_sessions:{phone}` → [whatsapp-session]

4. **Web Client Synced**
   - CentralizedAuthService publishes to `auth:events` Redis channel
   - Web session receives `auth:synced` WebSocket event
   - Frontend `authStore.syncFromRemote()` updates state
   - User sees notification: "✅ You're now logged in! (Synced from WhatsApp)"

## WebSocket Events

### From Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `auth:login` | `{ phone, token, userId, userName, platform, sessionId }` | Authenticate user |
| `auth:logout` | `{ phone, sessionId }` | Logout user |
| `auth:check` | `{ phone, sessionId }` | Check auth status |

### From Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `auth:synced` | `{ userId, userName, token, platform, timestamp }` | Auth synced from another channel |
| `auth:logged_out` | `{ timestamp }` | Logged out from another channel |
| `auth:status` | `{ authenticated, userId?, userName? }` | Response to auth:check |
| `auth:success` | `{ userId, userName, message }` | Login successful |
| `auth:failed` | `{ message, reason? }` | Login failed |

## Frontend Integration

### Auth Store (Zustand)
```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  lastSyncedFrom?: string;  // 'web', 'whatsapp', etc.
  
  setAuth: (user, token, syncSource?) => void;
  clearAuth: (syncSource?) => void;
  syncFromRemote: (data) => void;  // Called when auth synced from another channel
}
```

### WebSocket Client
```typescript
// lib/websocket/chat-client.ts
class ChatWebSocketClient {
  // ... existing methods ...
  
  // Centralized Auth Methods
  syncAuthLogin(data: { phone, token, userId, userName?, platform?, sessionId });
  syncAuthLogout(phone: string, sessionId: string);
  checkAuthStatus(phone: string, sessionId: string);
}
```

### Chat Page Integration
```tsx
// Event handlers in chat page
wsClient.on({
  onAuthSynced: (data) => {
    // Update auth store
    useAuthStore.getState().syncFromRemote(data);
    // Show notification
    setMessages(prev => [...prev, {
      content: `✅ You're now logged in! (Synced from ${data.platform})`,
      role: 'assistant',
      ...
    }]);
  },
  onAuthLoggedOut: () => {
    useAuthStore.getState().clearAuth('remote');
    // Show notification
    setMessages(prev => [...prev, {
      content: '👋 You have been logged out from another device.',
      ...
    }]);
  },
});
```

## Security Considerations

1. **Token Validation**: All tokens are validated against PHP backend via `PhpAuthService`
2. **Phone Normalization**: All phone numbers are normalized before storage
3. **TTL**: Auth data expires after 7 days (`authTtl = 7 * 24 * 60 * 60`)
4. **Channel Tracking**: Each login tracks which channel initiated it

## Files Modified/Created

### Backend
- `src/auth/centralized-auth.service.ts` - NEW: Core centralized auth logic
- `src/auth/auth.module.ts` - Updated: Exports CentralizedAuthService
- `src/chat/chat.gateway.ts` - Updated: Auth event handlers
- `src/chat/chat.module.ts` - Updated: Imports AuthModule
- `src/session/session.service.ts` - Updated: Added clearAuth method

### Frontend
- `src/store/authStore.ts` - Updated: Added syncFromRemote, lastSyncedFrom
- `src/lib/websocket/chat-client.ts` - Updated: Added auth sync methods
- `src/app/(public)/chat/page.tsx` - Updated: Auth sync event handlers

## Testing

### Test Cross-Channel Login
1. Open `chat.mangwale.ai` in browser (stay on this tab)
2. Send WhatsApp message to Mangwale bot: "login"
3. Complete OTP verification via WhatsApp
4. Check browser tab - should show "✅ You're now logged in! (Synced from WhatsApp)"

### Test Cross-Channel Logout
1. Login on web
2. Send "logout" via WhatsApp
3. Web should show "👋 You have been logged out from another device."

## Future Enhancements

1. **Session Management UI**: Show all active sessions, allow remote logout
2. **Device Fingerprinting**: Track devices for security
3. **Multi-Factor Auth**: Add 2FA support
4. **Biometric Auth**: Support fingerprint/face ID on mobile
