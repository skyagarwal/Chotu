# 🏗️ Mangwale AI Integration Architecture Map

**Date:** October 27, 2025  
**Status:** Production Architecture Documentation

---

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  admin.mangwale.ai (Port 3001)          headless.mangwale.com       │
│  ┌──────────────────────────┐           ┌──────────────────────┐   │
│  │ Admin Dashboard          │           │ Super Assistant      │   │
│  │ (mangwale-admin-frontend)│           │ (Next.js PWA)        │   │
│  │                          │           │                      │   │
│  │ - Model Registry         │           │ - Chat Interface     │   │
│  │ - Agent Management       │           │ - Module Tabs        │   │
│  │ - Flow Editor            │           │ - WebSocket Chat     │   │
│  │ - Training Dashboard     │           │ - Mobile-first UI    │   │
│  │ - Evaluation Tools       │           │                      │   │
│  │ - Audit Logs             │           │ Status: RUNNING ✅   │   │
│  │                          │           │ Port: 3001/chat      │   │
│  │ Status: RUNNING ✅       │           └──────────────────────┘   │
│  └──────────────────────────┘                                       │
│         ↓                                      ↓                     │
└─────────┼──────────────────────────────────────┼─────────────────────┘
          │                                      │
          ↓                                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Admin Backend (Port 8080)          Mangwale AI (Port 3200)         │
│  ┌──────────────────────────┐      ┌──────────────────────────┐    │
│  │ mangwale-admin-backend   │      │ mangwale-ai              │    │
│  │ (NestJS AI Platform)     │      │ (Conversation Platform)  │    │
│  │                          │◄─────┤                          │    │
│  │ 🧠 NLU Engine            │      │ 🤖 Channel Router        │    │
│  │ 📚 Training Pipeline     │      │ 💬 ConversationService   │    │
│  │ 🎯 Agent Orchestration   │      │ 📱 WhatsApp/Telegram     │    │
│  │ 📊 Dataset Management    │      │ 🌐 HTTP Chat (/chat)     │    │
│  │ 🔍 Model Registry        │      │                          │    │
│  │ 🎨 ASR/TTS Services      │      │ Integration:             │    │
│  │                          │      │ ├─ NluClientService      │    │
│  │ Endpoints:               │      │ ├─ ConversationLogger    │    │
│  │ └─ /nlu/classify         │      │ └─ AgentExecutor         │    │
│  │ └─ /training/bulk        │      │                          │    │
│  │ └─ /agents/execute       │      │ Sessions: Redis DB 1     │    │
│  │                          │      │                          │    │
│  │ Container: admin-backend │      │ Container: mangwale_ai   │    │
│  │ Network: shared_ai       │      │ Network: shared_ai       │    │
│  │ Status: RUNNING ✅       │      │ Status: RUNNING ✅       │    │
│  └──────────────────────────┘      └──────────────────────────┘    │
│         ↓                                     ↓                     │
└─────────┼─────────────────────────────────────┼─────────────────────┘
          │                                     │
          ↓                                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    LEGACY PHP BACKEND                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  testing.mangwale.com                                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PHP Laravel Backend (Existing Production System)             │  │
│  │                                                                │  │
│  │ REST APIs:                                                     │  │
│  │ ├─ /api/v1/auth/send-otp                                      │  │
│  │ ├─ /api/v1/auth/verify-phone                                  │  │
│  │ ├─ /api/v1/auth/update-info                                   │  │
│  │ ├─ /api/v1/config/get-zone-id                                 │  │
│  │ ├─ /api/v1/customer/order/place                               │  │
│  │ ├─ /api/v1/parcel-category                                    │  │
│  │ └─ ... (70+ existing endpoints)                               │  │
│  │                                                                │  │
│  │ Database: MySQL (users, orders, addresses, zones)             │  │
│  │ Container: mangwale_php                                        │  │
│  │ Status: PRODUCTION ✅                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Current Architecture Decisions

### ✅ What We Have (As-Is)

| Component | URL/Port | Technology | Status | Purpose |
|-----------|----------|------------|--------|---------|
| **Super Assistant UI** | `localhost:3001/chat` | Next.js + React | ✅ Running | Customer-facing chat interface |
| **Admin Dashboard** | `admin.mangwale.ai` | React + Vite | ✅ Running | AI training & management |
| **Mangwale AI Service** | `localhost:3200` | NestJS | ✅ Running | Conversation orchestration |
| **Admin Backend** | `localhost:8080` | NestJS | ✅ Running | NLU, training, agents |
| **PHP Backend** | `testing.mangwale.com` | Laravel | ✅ Production | Orders, auth, business logic |

### 🔄 Integration Flow: Admin Backend → Mangwale AI

```typescript
// 1. Mangwale AI uses Admin Backend for AI capabilities
// File: src/services/nlu-client.service.ts

async classify(text: string) {
  const response = await this.httpClient.post(
    `${ADMIN_BACKEND_URL}/nlu/classify`,  // http://admin-backend:8080
    { text, context: {...} }
  );
  
  // Returns: { intent, confidence, entities }
}

// 2. All conversations logged for training
// File: src/services/conversation-logger.service.ts

async logConversation(phoneNumber, userMessage, botResponse, intent) {
  this.buffer.push({ phoneNumber, userMessage, botResponse, intent, timestamp });
  
  if (this.buffer.length >= 10 || timeSince > 30s) {
    await this.httpClient.post(
      `${ADMIN_BACKEND_URL}/training/conversations/bulk`,
      { conversations: this.buffer }
    );
  }
}

// 3. Parcel flow uses Admin Backend agents
// File: src/parcel/services/parcel.service.ts

async getAgentResponse(userMessage, context) {
  const response = await this.httpClient.post(
    `${ADMIN_BACKEND_URL}/agents/execute`,
    { 
      agentId: 'parcel_delivery',
      message: userMessage,
      context: { ...sessionData }
    }
  );
  
  // Returns: { response: "Great! Let's book a parcel..." }
}
```

### 📦 Parcel Flow Integration

```
User Message ("I want to send a parcel")
     ↓
┌──────────────────────────────────────┐
│ Mangwale AI (Port 3200)              │
│ ConversationService.processMessage() │
└──────────────────────────────────────┘
     ↓
┌──────────────────────────────────────┐
│ NluClientService.classify()          │
│ → POST /nlu/classify                 │
└──────────────────────────────────────┘
     ↓
┌──────────────────────────────────────┐
│ Admin Backend (Port 8080)            │
│ NLU Engine                           │
│ Returns: {                           │
│   intent: "book_parcel",             │
│   confidence: 0.92                   │
│ }                                    │
└──────────────────────────────────────┘
     ↓
┌──────────────────────────────────────┐
│ Mangwale AI                          │
│ ParcelService.handleBooking()       │
│ → POST /agents/execute               │
└──────────────────────────────────────┘
     ↓
┌──────────────────────────────────────┐
│ Admin Backend                        │
│ Agent: parcel_delivery               │
│ Returns: "Great! Where should we     │
│          pick up from?"              │
└──────────────────────────────────────┘
     ↓
┌──────────────────────────────────────┐
│ Mangwale AI                          │
│ MessagingService.sendTextMessage()   │
└──────────────────────────────────────┘
     ↓
User receives response
```

---

## 🌐 Frontend Strategy & Recommendations

### Current Situation Analysis

| Frontend | Current Domain | Port | Technology | Purpose | Status |
|----------|---------------|------|------------|---------|--------|
| **Admin Frontend** | `admin.mangwale.ai` | 3001 | React + Vite | AI management for internal team | ✅ Running |
| **Super Assistant** | `headless.mangwale.com` | 3001/chat | Next.js PWA | Customer chat interface | ✅ Running on same port |

### ⚠️ Problem: Port Conflict

Both frontends are trying to use port 3001, which means:
- They cannot run simultaneously
- Currently, the Next.js "Super Assistant" is running on `localhost:3001/chat`
- The Admin Dashboard is not accessible on its intended domain

---

## 🎯 Recommended Architecture (3 Options)

### **Option A: Unified Dashboard (RECOMMENDED) ✨**

**Merge everything into one Next.js frontend at `dashboard.mangwale.com`**

```
dashboard.mangwale.com
├── /admin                    → AI management (current admin features)
│   ├── /models               → Model registry
│   ├── /agents               → Agent management
│   ├── /flows                → Flow editor
│   ├── /training             → Training dashboard
│   └── /evaluation           → Evaluation tools
│
├── /chat                     → Super Assistant (customer interface)
│   ├── Food module
│   ├── Parcels module
│   ├── Payments module
│   └── ... other modules
│
└── /api                      → Next.js API routes (optional)
```

**✅ Benefits:**
- Single codebase, easier maintenance
- Shared components (UI library, auth, API client)
- Role-based routing (customers see /chat, admins see /admin)
- Modern Next.js 15 with App Router
- Better SEO for public pages

**📋 Implementation:**
1. Create new Next.js 15 project: `mangwale-unified-frontend`
2. Migrate Admin Dashboard pages to `/admin/*` routes
3. Migrate Super Assistant to `/chat` route
4. Implement role-based access control
5. Deploy to `dashboard.mangwale.com`

**🛠️ Tech Stack:**
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- shadcn/ui
- WebSocket client (for /chat)
- React Query (API state)

---

### **Option B: Separate Domains (Current Setup Enhanced)**

**Keep both frontends separate but on different ports/domains**

```
admin.mangwale.ai (Port 3001)
└── Admin Dashboard (React + Vite)
    ├── Model Registry
    ├── Agent Management
    ├── Flow Editor
    └── Training Tools

headless.mangwale.com (Port 3002)
└── Super Assistant (Next.js)
    ├── /chat → Customer interface
    └── WebSocket chat

OR alternative:

chat.mangwale.com (Port 3002)
└── Super Assistant only
```

**✅ Benefits:**
- Clear separation of concerns
- Different tech stacks possible
- Independent deployments
- Easier to scale separately

**⚠️ Drawbacks:**
- Code duplication (auth, API client, UI components)
- Two codebases to maintain
- Different user experiences

**📋 Implementation:**
1. Move Admin Frontend to dedicated port (keep 3001)
2. Move Super Assistant to port 3002 or 3003
3. Update nginx/reverse proxy configs
4. Deploy admin to `admin.mangwale.ai`
5. Deploy chat to `headless.mangwale.com` or `chat.mangwale.com`

---

### **Option C: Admin as Subdomain Route**

**Use Next.js for everything, admin as protected route**

```
mangwale.com
├── /                         → Landing page
├── /chat                     → Super Assistant (public)
├── /admin/*                  → Protected admin routes
│   ├── Auth middleware
│   └── All admin features
└── /api/*                    → Backend proxy
```

**✅ Benefits:**
- Single domain, simpler DNS
- Unified authentication
- Shared codebase
- Professional structure

**⚠️ Considerations:**
- Mixing public/private features
- Requires good auth separation

---

## 🎖️ **FINAL RECOMMENDATION: Option A (Unified Dashboard)**

### Why?

1. **Modern Architecture**: Next.js 15 is perfect for this use case
2. **Cost Effective**: Single deployment, single codebase
3. **Better UX**: Consistent design system across all features
4. **Scalability**: Easy to add new modules (Ride, Health, etc.)
5. **Maintainability**: One codebase, shared components
6. **SEO**: Public routes can be indexed
7. **Performance**: Next.js optimizations out-of-the-box

### Migration Path

```bash
# 1. Create new project
npx create-next-app@latest mangwale-unified-dashboard
cd mangwale-unified-dashboard

# 2. Install dependencies
npm install @tanstack/react-query zustand socket.io-client
npm install @shadcn/ui framer-motion lucide-react

# 3. Project structure
src/
├── app/
│   ├── (public)/
│   │   └── chat/          # Super Assistant
│   │       └── page.tsx
│   │
│   ├── (admin)/
│   │   ├── layout.tsx     # Admin layout with auth
│   │   ├── models/        # Model registry
│   │   ├── agents/        # Agent management
│   │   ├── flows/         # Flow editor
│   │   └── training/      # Training dashboard
│   │
│   └── api/               # Next.js API routes (optional)
│
├── components/
│   ├── admin/             # Admin-specific components
│   ├── chat/              # Chat components
│   └── shared/            # Shared UI components
│
├── lib/
│   ├── api/
│   │   ├── admin-backend.ts    # Admin Backend client
│   │   └── mangwale-ai.ts      # Mangwale AI client
│   ├── auth.ts
│   └── websocket.ts
│
└── types/                 # Shared TypeScript types

# 4. Environment variables
NEXT_PUBLIC_ADMIN_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_MANGWALE_AI_URL=http://localhost:3200
NEXT_PUBLIC_WS_URL=ws://localhost:3200
```

### Features from Both Frontends

**From Admin Dashboard (admin.mangwale.ai):**
- ✅ Model Registry
- ✅ Agent Management
- ✅ Flow Editor (visual)
- ✅ Training Dashboard
- ✅ Evaluation Tools
- ✅ Audit Logs
- ✅ API Keys Management
- ✅ Auth/RBAC

**From Super Assistant (headless.mangwale.com):**
- ✅ Chat Interface
- ✅ Module Tabs (Food, Parcels, etc.)
- ✅ WebSocket Integration
- ✅ Option Chips
- ✅ PWA Support
- ✅ Mobile-first Design

**Combined Benefits:**
- Single Sign-On (SSO)
- Shared component library
- Consistent branding
- Unified API client
- Better performance (code splitting)
- Easier testing

---

## 🔌 Backend Integration Patterns

### Admin Backend Integration

```typescript
// lib/api/admin-backend.ts
export class AdminBackendClient {
  private baseUrl = process.env.NEXT_PUBLIC_ADMIN_BACKEND_URL;
  
  async classifyIntent(text: string, context?: any) {
    return this.post('/nlu/classify', { text, context });
  }
  
  async executeAgent(agentId: string, message: string, context: any) {
    return this.post('/agents/execute', { agentId, message, context });
  }
  
  async trainModel(datasetId: string) {
    return this.post('/training/start', { datasetId });
  }
  
  // ... other methods
}
```

### Mangwale AI Integration

```typescript
// lib/api/mangwale-ai.ts
export class MangwaleAIClient {
  private baseUrl = process.env.NEXT_PUBLIC_MANGWALE_AI_URL;
  
  async sendMessage(recipientId: string, text: string) {
    return this.post('/chat/send', { recipientId, text });
  }
  
  async getMessages(recipientId: string) {
    return this.get(`/chat/messages/${recipientId}`);
  }
  
  async startParcelFlow(recipientId: string) {
    return this.post(`/chat/start/parcel/${recipientId}`);
  }
}
```

### WebSocket Integration

```typescript
// lib/websocket.ts
export class ChatWebSocket {
  private ws: WebSocket;
  
  connect(sessionId: string) {
    this.ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/ws/chat?session=${sessionId}`
    );
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }
  
  sendMessage(text: string) {
    this.ws.send(JSON.stringify({ type: 'user_message', text }));
  }
}
```

---

## 📊 Data Flow Summary

```
┌────────────────────────────────────────────────────────────────────┐
│                     UNIFIED DASHBOARD                               │
│                  (dashboard.mangwale.com)                          │
│                                                                     │
│  ┌────────────────┐              ┌────────────────┐               │
│  │ /admin/*       │              │ /chat          │               │
│  │ (Admin Panel)  │              │ (Super Assist) │               │
│  └────────────────┘              └────────────────┘               │
│         │                                │                         │
└─────────┼────────────────────────────────┼─────────────────────────┘
          │                                │
          ↓                                ↓
┌─────────────────────────┐    ┌────────────────────────┐
│   Admin Backend         │    │   Mangwale AI          │
│   Port 8080             │◄───┤   Port 3200            │
│   - NLU Engine          │    │   - Conversation       │
│   - Training            │    │   - Channels           │
│   - Agents              │    │   - Sessions           │
└─────────────────────────┘    └────────────────────────┘
          │                                │
          └────────────┬───────────────────┘
                       ↓
              ┌──────────────────┐
              │  PHP Backend     │
              │  Laravel         │
              │  - Orders        │
              │  - Auth          │
              │  - Business      │
              └──────────────────┘
```

---

## 🚀 Implementation Roadmap

### Phase 1: Setup Unified Frontend (Week 1-2)
- [ ] Create Next.js 15 project structure
- [ ] Setup routing (App Router)
- [ ] Implement shared UI component library
- [ ] Setup authentication (NextAuth.js)
- [ ] Configure API clients

### Phase 2: Migrate Admin Features (Week 3-4)
- [ ] Port Model Registry
- [ ] Port Agent Management
- [ ] Port Flow Editor
- [ ] Port Training Dashboard
- [ ] Add role-based access control

### Phase 3: Migrate Chat Interface (Week 5-6)
- [ ] Port Super Assistant UI
- [ ] Implement WebSocket integration
- [ ] Add module tabs
- [ ] Integrate option chips
- [ ] PWA configuration

### Phase 4: Integration & Testing (Week 7-8)
- [ ] Connect to Admin Backend APIs
- [ ] Connect to Mangwale AI endpoints
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit

### Phase 5: Deployment (Week 9-10)
- [ ] Setup CI/CD pipeline
- [ ] Deploy to staging
- [ ] Production deployment
- [ ] DNS configuration
- [ ] Monitoring setup

---

## 🎯 Success Metrics

### Technical
- ✅ Single codebase for all frontends
- ✅ Sub-2s initial load time
- ✅ 90+ Lighthouse score
- ✅ 100% TypeScript coverage
- ✅ Zero runtime errors

### Business
- ✅ Faster feature development (shared components)
- ✅ Reduced hosting costs (1 deployment vs 2)
- ✅ Better user experience (consistent design)
- ✅ Easier onboarding (1 system to learn)

---

## 📝 Decision Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| Oct 27, 2025 | Use Option A (Unified Dashboard) | Modern, scalable, cost-effective |
| Oct 27, 2025 | Next.js 15 for frontend | Best-in-class React framework |
| Oct 27, 2025 | Keep Admin Backend separate | Specialized AI services |
| Oct 27, 2025 | Keep Mangwale AI separate | Channel orchestration layer |

---

## 🔗 Related Documentation

- [AI Integration Architecture](./AI_INTEGRATION_ARCHITECTURE.md)
- [Flows Documentation](./FLOWS.md)
- [Super Assistant Spec](../Mangwale AI Front end/super-assistant-frontend-spec.md)
- [Admin Frontend README](../../mangwale-admin-frontend/README.md)

---

**Prepared by:** AI Architecture Team  
**Last Updated:** October 27, 2025  
**Status:** RECOMMENDED - Awaiting Approval
