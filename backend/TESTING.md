# Testing Guide - Mangwale AI Integration

## Overview
This guide shows how to test the mangwale-ai parcel delivery flow end-to-end using the new HTTP chat endpoints and minimal web UI, without requiring WhatsApp or Telegram channels.

## Prerequisites
1. **mangwale-ai** (this repo) - Built and configured
2. **mangwale-admin-backend-v1** - Running with NLU/agent capabilities
3. **Redis** - Running on localhost:6379 (or configured host)
4. **PHP Backend** - Running at https://testing.mangwale.com

## Quick Start

### 1. Start mangwale-admin-backend-v1 (if not running)
```bash
cd /home/ubuntu/mangwale-admin-backend-v1

# Start the admin backend with bootstrap API key
ADMIN_BOOTSTRAP_ENABLED=true \
ADMIN_BACKEND_API_KEY=bootstrap_key_12345 \
NODE_ENV=development \
PORT=3002 \
npm run start
```

Verify it's running:
```bash
curl http://localhost:3002/health
```

### 2. Start mangwale-ai with Test Configuration
```bash
cd /home/ubuntu/Devs/mangwale-ai

# Set environment variables for test mode
export REDIS_HOST=127.0.0.1
export REDIS_PORT=6379
export PORT=3200
export TEST_MODE=true
export PHP_API_BASE_URL=https://testing.mangwale.com
export DEFAULT_PARCEL_MODULE_ID=3
export ADMIN_BACKEND_URL=http://localhost:3002
export ADMIN_BACKEND_API_KEY=bootstrap_key_12345

# Start in development mode
npm run start:dev
```

Verify the server is running:
```bash
curl http://localhost:3200/health
```

### 3. Test with HTTP Endpoints

#### Initialize a parcel session:
```bash
curl -X POST http://localhost:3200/chat/start/parcel/test-user-123
```

#### Send a message:
```bash
curl -X POST http://localhost:3200/chat/send \
  -H 'Content-Type: application/json' \
  -d '{"recipientId":"test-user-123","text":"I want to send a parcel"}'
```

#### Retrieve bot responses:
```bash
curl http://localhost:3200/chat/messages/test-user-123 | jq .
```

### 4. Use the Minimal Web UI

Open the test chat interface:
```bash
cd '/home/ubuntu/Devs/Mangwale AI Front end'
python3 -m http.server 8080
```

Then open in your browser:
```
http://localhost:8080
```

1. Enter a recipient ID (e.g., `test-user-456`)
2. Set API URL to `http://localhost:3200`
3. Click "Connect" to start polling for messages
4. Type messages and click "Send"

## Architecture

### Flow Components

```
┌─────────────────┐
│   Test Chat UI  │  (Browser-based)
│  /Mangwale AI   │
│   Front end/    │
└────────┬────────┘
         │
         │ HTTP POST /chat/send
         │ HTTP GET /chat/messages/:id
         ▼
┌─────────────────────┐
│   mangwale-ai       │
│   TestChatController│  (:3200)
│   ConversationSvc   │
└────────┬────────────┘
         │
         ├─► ParcelAgentService ──┐
         │                        │
         │    Admin Backend       │
         │    HTTP POST           │
         │    /agents/agent.      │
         │    parcel_delivery/    │
         │    execute             │
         │                        │
         │                   ┌────▼────────────┐
         │                   │ Admin Backend   │
         │                   │ (NLU/Agents)    │
         │                   │ :3002           │
         │                   └─────────────────┘
         │
         └─► PHP Integration
             POST /api/v1/customer/order/place
             to https://testing.mangwale.com

Test Mode: Responses stored in Redis
```

### Key Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `TEST_MODE` | Enable response storage in Redis | `true` |
| `REDIS_HOST` | Redis server hostname | `127.0.0.1` |
| `PORT` | mangwale-ai HTTP server port | `3200` |
| `ADMIN_BACKEND_URL` | Admin backend base URL | `http://localhost:3002` |
| `ADMIN_BACKEND_API_KEY` | API key for admin backend | `bootstrap_key_12345` |
| `PHP_API_BASE_URL` | PHP backend base URL | `https://testing.mangwale.com` |
| `DEFAULT_PARCEL_MODULE_ID` | Default module for parcel orders | `3` |

### Configuration Files
- `.env` - Environment configuration (copy from `.env.example`)
- `src/config/configuration.ts` - Centralized config schema

### Session Data
Test mode stores messages in Redis:
- Key format: `test:messages:{recipientId}`
- Messages expire after 1 hour
- Includes timestamp for each bot message

## Endpoints

### Test Chat Endpoints

**POST /chat/start/parcel/:recipientId**  
Initialize a parcel delivery session
```json
{
  "ok": true,
  "recipientId": "test-user-123",
  "step": "parcel_delivery_ai"
}
```

**POST /chat/send**  
Send a user message
```json
{
  "recipientId": "test-user-123",
  "text": "I want to send a parcel"
}
```

**GET /chat/messages/:recipientId**  
Retrieve bot messages (clears after retrieval)
```json
{
  "ok": true,
  "messages": [
    {
      "message": "Great! Let's book your parcel delivery.",
      "timestamp": 1761555765123
    }
  ]
}
```

### Health & Readiness

**GET /health**  
Basic health check
```json
{
  "status": "ok",
  "service": "Headless Mangwale",
  "timestamp": "2025-10-27T09:00:00.000Z",
  "uptime": 123
}
```

**GET /ready**  
Readiness probe (tests PHP backend connectivity)
```json
{
  "status": "ready",
  "php": {
    "url": "https://testing.mangwale.com",
    "ok": true,
    "statusCode": 200
  }
}
```

## Troubleshooting

### mangwale-ai won't start
- **Port in use**: Change `PORT` env or kill existing process
- **Redis connection failed**: Ensure Redis is running and `REDIS_HOST` is correct
- **Module errors**: Run `npm install` and `npm run build`

### Admin backend 404/500 errors
- Verify admin backend is running: `curl http://localhost:3002/health`
- Check API key matches: `ADMIN_BACKEND_API_KEY=bootstrap_key_12345`
- Review admin backend logs: `tail -f ~/mangwale-admin-backend-v1/logs/server.log`

### No bot responses
- Check TEST_MODE is enabled: `TEST_MODE=true`
- Review server logs: `tail -f /tmp/mangwale-ai.log`
- Verify session data: Test with curl first before using UI

### Agent returns fallback messages
- Admin backend LLM may not be configured or is failing
- Check admin backend models are set up: `curl http://localhost:3002/models`
- Fallback is expected behavior when LLM unavailable - this protects user experience

## Development Notes

### Parcel Agent Integration
- `ParcelAgentService` calls admin backend `/agents/agent.parcel_delivery/execute`
- Fallback responses ensure graceful degradation
- Admin backend provides NLU classification and agent guidelines

### Module & Zone Selection
- Order creation uses `php.defaultModuleId` from config (DEFAULT_PARCEL_MODULE_ID env)
- Zone validation happens during address collection steps
- Module selection determines service type (parcel, food, grocery, etc.)

### Testing Without Channels
- HTTP endpoints bypass WhatsApp/Telegram completely
- Session platform set to `WHATSAPP` for message formatting compatibility
- All replies stored in Redis when TEST_MODE=true

## Next Steps

1. **Full Parcel Flow**: Continue conversation through pickup/delivery address collection
2. **Order Creation**: Complete flow to trigger PHP backend order creation
3. **Error Handling**: Test edge cases (invalid addresses, API failures, etc.)
4. **Channel Integration**: Once stable, test with real WhatsApp/Telegram webhooks
5. **Admin Backend LLM**: Configure proper LLM models for advanced agent responses

## References
- Main README: `/home/ubuntu/Devs/mangwale-ai/README.md`
- Admin Backend: `/home/ubuntu/mangwale-admin-backend-v1`
- Test UI: `/home/ubuntu/Devs/Mangwale AI Front end`
- PHP API: `https://testing.mangwale.com/api/v1`
