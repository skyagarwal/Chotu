# Session Identifier Architecture Fix

## Problem Statement

The Mangwale AI system had a fundamental architecture issue where the `phoneNumber` parameter was being used as a session identifier, leading to confusion between actual phone numbers and session IDs:

- **WhatsApp/SMS**: Uses actual phone number (e.g., `+919876543210`) as identifier
- **Web Chat**: Uses session ID (e.g., `web-abc123`) as identifier
- **Legacy Code**: Passed `sessionId` as `phoneNumber`, causing:
  - Orders placed with session ID instead of real phone
  - Authentication data not properly linked
  - User lookup failures in PHP backend

## Solution

Created a new `SessionIdentifierService` that provides a unified way to:
1. Detect the channel type from an identifier
2. Resolve the actual phone number from session data
3. Link verified phone numbers to sessions after OTP verification

## Changes Made

### New Files

1. **`/backend/src/session/session-identifier.service.ts`**
   - Main service that resolves phone numbers from session IDs
   - Methods:
     - `resolve(identifier)`: Returns `IdentifierResolution` with sessionId, phoneNumber, isVerified, channel
     - `detectChannel(identifier)`: Returns channel type (web, whatsapp, telegram, etc.)
     - `isSessionId(identifier)`: Checks if identifier is a session ID (not a real phone)
     - `isPhoneNumber(identifier)`: Checks if identifier is a real phone number
     - `linkPhoneToSession(sessionId, phone)`: Links verified phone to session after OTP

2. **`/backend/src/session/index.ts`**
   - Export file for clean imports

### Updated Files

1. **`/backend/src/session/session.module.ts`**
   - Added `SessionIdentifierService` to providers and exports

2. **`/backend/src/flow-engine/flow-engine.service.ts`**
   - Imports `SessionIdentifierService`
   - Resolves phone number in `startFlow()` before creating flow run

3. **`/backend/src/flow-engine/executors/auth.executor.ts`**
   - Imports `SessionIdentifierService`
   - Links phone to session in `verifyOtp()` after successful OTP verification

4. **`/backend/src/agents/services/agent-orchestrator.service.ts`**
   - Imports `SessionIdentifierService`
   - Links phone to session in `handleOtpInput()` after successful OTP verification

5. **`/backend/src/conversation/services/conversation.service.ts`**
   - Imports `SessionIdentifierService`
   - Uses `sessionIdentifierService.resolve()` in `handlePaymentMethodSelection()` instead of manual lookup
   - Links phone to session in `handleOtpCodeInput()` after successful OTP verification

6. **`/backend/src/chat/chat.gateway.ts`**
   - Imports `SessionIdentifierService`
   - Uses `sessionIdentifierService.resolve()` in message handling for proper phone resolution

## How It Works

### Before OTP Verification (Anonymous User)
```
sessionId: "web-abc123"
phoneNumber: null
isPhoneVerified: false
```

### After OTP Verification
```
sessionId: "web-abc123"
phoneNumber: "+919876543210"
isPhoneVerified: true
```

### Key Data Stored After Verification
- `session_phone:{sessionId}` → Real phone number (Redis)
- `session.data.user_phone` → Real phone number
- `session.data.phone_number` → Real phone number (compatibility)
- `session.data.authenticated` → true

## Usage Pattern

```typescript
// Instead of:
const phone = session?.data?.phone || phoneNumber; // BAD: phoneNumber might be sessionId

// Use:
const resolution = await sessionIdentifierService.resolve(phoneNumber);
const actualPhone = resolution.phoneNumber; // Always the real phone (or null if not verified)
const sessionId = resolution.sessionId; // Always the session key for storage
```

## Priority Order for Phone Resolution

When resolving a phone number, the service checks these sources in order:
1. `session_phone:{sessionId}` (Redis - centralized auth)
2. `session.data.user_phone` (set by flow engine after OTP)
3. `session.data.phone_number` (compatibility)
4. `session.data.phone` (set by chat gateway)
5. `session.data.auth_phone` (set during legacy auth)
6. `session.data.otp_phone` (phone used for OTP - may not be verified yet)

## Breaking Changes

None. All changes are backward compatible. The old session data fields are still written for compatibility.

## Testing

To test the fix:
1. Open web chat (creates session ID like `web-abc123`)
2. Trigger authentication (e.g., try to place an order)
3. Enter phone number and verify OTP
4. Check that:
   - Session is linked to phone: `GET session_phone:web-abc123` returns `+919876543210`
   - Session data has `user_phone`: Check session data in Redis
   - Order placement uses real phone number (not session ID)
