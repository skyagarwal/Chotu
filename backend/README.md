# 🚀 Mangwale.ai

**Multi-Channel Conversational AI Platform for Delivery & Ordering**

---

## 🎯 What is Mangwale.ai?

Mangwale.ai is a comprehensive conversational AI platform that powers intelligent, multi-channel customer interactions for delivery and ordering services.

### **Key Features:**
- 🤖 **AI-Powered Agents** - 5 specialized LLM agents with function calling (Search, Order, Complaints, Booking, FAQ)
- 📱 **Multi-Channel** - WhatsApp, Telegram, Web, Mobile, Voice (channel-agnostic core)
- 📦 **8 Modules** - Food, E-commerce, Parcel, Ride, Health, Rooms, Movies, Services
- 🔄 **Intelligent Routing** - Intent-based agent selection with module configurations
- 📈 **Continuous Learning** - Auto-training from real conversations
- 🏢 **Enterprise-Grade** - Scalable, monitored, production-ready

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     MANGWALE.AI                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: Channel Implementations                        │
│  ├─ WhatsApp ✅                                         │
│  ├─ Telegram (Ready)                                     │
│  ├─ Web Chat (Ready)                                     │
│  └─ Voice (Ready)                                        │
│                                                          │
│  Layer 2: Transport & Protocol                           │
│  └─ Channel-agnostic messaging                           │
│                                                          │
│  Layer 3: Conversation Platform ⭐ (Core)               │
│  ├─ AI Agent System (5 specialized agents) ✅           │
│  ├─ Agent Orchestrator (intent routing)                 │
│  ├─ NLU classification                                   │
│  ├─ Function calling (14 executors)                     │
│  └─ Session management                                   │
│                                                          │
│  Layer 4: Business Logic Modules (8 Total)              │
│  ├─ Food Delivery ✅                                    │
│  ├─ E-Commerce ✅                                       │
│  ├─ Parcel Delivery ✅                                  │
│  ├─ Ride Booking ✅                                     │
│  ├─ Healthcare ✅                                       │
│  ├─ Room Booking ✅                                     │
│  ├─ Movie Tickets ✅                                    │
│  └─ Local Services ✅                                   │
│                                                          │
│  Layer 5: External Systems                               │
│  ├─ Admin Backend (AI Services)                          │
│  ├─ PHP Backend (Legacy)                                 │
│  └─ External APIs                                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### **Prerequisites:**
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Admin Backend (AI services)

### **Installation:**

```bash
# Clone the repository
git clone [repository-url]
cd mangwale-ai

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

### **Test the Chatbot:**

```bash
# Interactive CLI testing (no channel required!)
node test-chat-simple.js
```

### Channel-free AI test (no WhatsApp/Telegram)

Option A — API-only

```bash
# Ensure app.testMode=true in .env, then start the server

# Send a message
curl -X POST http://localhost:3000/chat/send \
   -H 'Content-Type: application/json' \
   -d '{"recipientId":"test-user-1","text":"hi"}'

# Jump directly into Parcel AI flow
curl -X POST http://localhost:3000/chat/start/parcel/test-user-1

# Fetch bot replies (poll)
curl http://localhost:3000/chat/messages/test-user-1
```

Option B — Minimal Web UI

- Open `/home/ubuntu/Devs/Mangwale AI Front end/index.html`
- Enter Recipient ID (e.g., test-user-1) and API (e.g., http://localhost:3000)
- Click Connect and start chatting

---

## 🎮 Testing

```

---

## 🤖 Agent System

### **5 Specialized Agents**

The platform uses **LLM-powered agents** with function calling for intelligent, context-aware responses:

1. **SearchAgent** - Product/service discovery across all modules
2. **OrderAgent** - Order tracking, cancellation, modifications
3. **ComplaintsAgent** - Issue resolution, refunds, quality checks
4. **BookingAgent** - Service bookings (rides, rooms, appointments)
5. **FAQAgent** - Greetings, help, platform information

### **14 Function Executors**

Agents can call real-time functions:
- `search_products`, `check_order_status`, `cancel_order`
- `process_refund`, `generate_voucher`, `analyze_food_image`
- `calculate_parcel_cost`, `escalate_to_human`, and more

### **Multi-Channel Ready**

All agents work across **all channels** automatically:
- ✅ WhatsApp
- ✅ Telegram
- ✅ Web Chat
- ✅ Mobile Apps
- 🔄 Voice (coming soon)

**📖 Full Documentation**: See [AGENT_SYSTEM_COMPLETE.md](./AGENT_SYSTEM_COMPLETE.md)

---

## 🎮 Testing

### **1. Interactive Chatbot Testing**

Test the complete AI + Guidelines flow without any channel setup:

```bash
node test-chat-simple.js
```

**Features:**
- Real-time AI conversation
- Automatic fallback on low confidence
- Live monitoring of mode, confidence, and data collection
- No WhatsApp/Telegram setup needed!

### **2. Integration Testing**

```bash
# Test with Admin Backend APIs
node test-parcel-delivery.js
```

### **3. Unit Tests**

```bash
npm run test
```

### **4. E2E Tests**

```bash
npm run test:e2e
```

---

## 📦 Modules

### **Parcel Delivery** ✅
AI-powered parcel booking with:
- Natural conversation flow
- Automatic information extraction
- Intelligent fallback
- Real-time pricing
- Booking confirmation

### **Order Tracking**
Track orders via natural language queries

### **Wallet Management**
Handle wallet operations conversationally

### **Loyalty Program**
Engage customers with loyalty features

### **Customer Support**
AI-powered support with human escalation

---

## 🤖 AI + Guidelines Architecture

### **The Innovation:**

Instead of choosing between **rigid scripted flows** OR **unpredictable AI**, we use **both**:

```
1. AI FIRST → Natural conversation (80% of conversations)
   ↓
2. CONFIDENCE CHECK → Monitor AI performance
   ↓
3. FALLBACK → Structured flow when needed (20% of conversations)
   ↓
4. DYNAMIC SWITCHING → Back to AI when user engages
```

**Benefits:**
- ✅ Natural UX when AI works (most of the time)
- ✅ Reliable completion via fallback (always)
- ✅ Continuous learning from all conversations
- ✅ Never breaks - graceful degradation

---

## 🔧 Configuration

### **Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mangwale

# Redis
REDIS_URL=redis://localhost:6379

# Admin Backend (AI Services)
ADMIN_BACKEND_URL=http://localhost:3002
ADMIN_API_KEY=your_api_key_here

# WhatsApp
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# PHP Backend (Legacy)
PHP_BACKEND_URL=http://localhost:8000
```

---

## 📚 Documentation

- **Architecture Guide:** `/docs/ARCHITECTURE.md`
- **AI Integration:** `/docs/AI_INTEGRATION.md`
- **Flows as Guidelines:** `/docs/FLOWS_AS_GUIDELINES.md`
- **Testing Guide:** `/docs/TESTING.md`
- **API Reference:** `/docs/API.md`

---

## 🛠️ Development

### **Project Structure:**

```
src/
├── parcel/              # Parcel delivery module (AI + Guidelines)
│   ├── services/
│   │   ├── parcel.service.ts           # Main coordinator
│   │   ├── parcel-agent.service.ts     # AI agent integration
│   │   └── parcel-fallback.service.ts  # Fallback flow
│   ├── types/           # TypeScript types
│   └── parcel.module.ts
│
├── conversation/        # Core conversation logic (Layer 3)
│   └── services/
│       └── conversation.service.ts     # Main conversation router
│
├── messaging/           # Channel-agnostic messaging (Layer 2)
│   └── services/
│       └── messaging.service.ts        # Message routing
│
├── whatsapp/            # WhatsApp channel implementation (Layer 1)
│   └── services/
│       └── whatsapp.service.ts         # WhatsApp adapter
│
├── order-flow/          # Business logic modules (Layer 4)
│   └── services/        # Order, Wallet, Loyalty, etc.
│
└── php-integration/     # External systems integration (Layer 5)
    └── services/        # PHP backend, databases
```

### **Adding a New Module:**

1. Create module directory: `src/your-module/`
2. Define types and guidelines
3. Create agent service (AI)
4. Create fallback service (structured)
5. Create main coordinator
6. Register in `app.module.ts`
7. Add route in `conversation.service.ts`

---

## 🚢 Deployment

### **Docker:**

```bash
# Build image
docker build -t mangwale-ai .

# Run container
docker run -p 3000:3000 --env-file .env mangwale-ai
```

### **Docker Compose:**

```bash
docker-compose up -d
```

### **Production:**

```bash
# Build
npm run build

# Start
npm run start:prod
```

---

## 📊 Monitoring

- **Health Check:** `GET /health`
- **Metrics:** `GET /metrics`
- **Logs:** Winston logger with file rotation
- **Session Management:** Redis-backed sessions
- **Error Tracking:** Comprehensive error handling

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🎉 Credits

Built with:
- NestJS - Progressive Node.js framework
- TypeScript - Type-safe development
- PostgreSQL - Reliable data storage
- Redis - Fast session management
- OpenAI / Local LLMs - AI capabilities

---

## 📞 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@mangwale.ai

---

## 🌟 Highlights

- ✅ **Production-Ready** - Battle-tested architecture
- ✅ **AI-Powered** - NLU, LLM, Agent orchestration
- ✅ **Multi-Channel** - One codebase, all channels
- ✅ **Extensible** - Easy to add modules
- ✅ **Reliable** - Intelligent fallback system
- ✅ **Learning** - Improves with every conversation

---

**Mangwale.ai - The Future of Conversational Commerce** 🚀
