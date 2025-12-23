# Dashboard Integration Plan

## ✅ Current Status

### Backend (mangwale-ai) - Port 3200
**Status**: ✅ FULLY OPERATIONAL

- **Main Service**: `mangwale_ai_service` (NestJS) - HEALTHY
- **vLLM**: `mangwale-ai-vllm` - Qwen2.5-7B-Instruct-AWQ on GPU ✅
- **NLU**: `mangwale-ai-nlu` - IndicBERTv2 classification ✅
- **PostgreSQL**: Flow definitions, sessions, tenants ✅
- **Redis**: Session state, conversation context ✅
- **OSRM**: Routing service ✅
- **Label Studio**: ML annotation platform ✅

**Active Flows in Database**:
1. `greeting_v1` - Welcome messages
2. `game_intro_v1` - Gamification intro
3. `parcel_pickup_v1` - Pickup location collection
4. `parcel_delivery_v1` - Delivery address collection
5. `parcel_size_selection_v1` - Size selection with buttons
6. `parcel_booking_confirmation_v1` - Final confirmation

### Frontend (mangwale-unified-dashboard)
**Tech Stack**: Next.js 16, React 19, Tailwind 4, shadcn/ui
**Status**: ⚠️ MOCK DATA - Not connected to real backend

**Pages Available**:
- ✅ `/admin/dashboard` - Main overview (stats mock)
- ✅ `/admin/flows` - Flow management UI (mock flows)
- ✅ `/admin/agents` - Agent configuration
- ✅ `/admin/llm-chat` - LLM testing interface
- ✅ `/admin/llm-models` - Model management
- ✅ `/admin/llm-providers` - Provider config
- ✅ `/admin/nlu` - NLU testing
- ✅ `/admin/training` - Training data management
- ✅ `/admin/monitoring` - System monitoring
- ✅ `/admin/search-config` - Search configuration

## 🎯 Integration Goals

### 1. Connect Flows Page to mangwale-ai Backend
**Current**: Loads 3 mock flows from hardcoded array
**Target**: Load 6 real flows from PostgreSQL via `GET /flows` endpoint

**Backend API** (needs to be created):
```typescript
// src/flows/flows.controller.ts
@Get()
async getFlows() {
  return this.flowsService.findAll(); // Query PostgreSQL
}

@Get(':id')
async getFlow(@Param('id') id: string) {
  return this.flowsService.findOne(id);
}

@Post()
async createFlow(@Body() data: CreateFlowDto) {
  return this.flowsService.create(data);
}

@Put(':id')
async updateFlow(@Param('id') id: string, @Body() data: UpdateFlowDto) {
  return this.flowsService.update(id, data);
}

@Delete(':id')
async deleteFlow(@Param('id') id: string) {
  return this.flowsService.delete(id);
}

@Patch(':id/toggle')
async toggleFlow(@Param('id') id: string) {
  return this.flowsService.toggleEnabled(id);
}
```

**Frontend Changes**:
```typescript
// src/lib/api/mangwale-ai.ts - ADD
async getFlows(): Promise<Flow[]> {
  return this.request<Flow[]>('/flows');
}

// src/app/admin/flows/page.tsx - REPLACE
const loadFlows = async () => {
  setLoading(true);
  try {
    const response = await mangwaleAiClient.getFlows();
    setFlows(response.map(normalizeFlow));
  } catch (error) {
    console.error('Failed to load flows:', error);
    toast.error('Failed to load flows from backend');
  } finally {
    setLoading(false);
  }
};
```

### 2. Flow Editor Integration
**Current**: Visual flow builder exists but doesn't save
**Target**: Save flows to PostgreSQL with state machine transitions

**Backend Requirements**:
- Flow validation before save
- State machine conversion (UI graph → executable states)
- Flow versioning support
- Flow testing endpoint

**Frontend Requirements**:
- Connect ReactFlow graph to backend API
- Add flow testing panel (send test messages)
- Show flow execution logs
- Export/Import flow JSON

### 3. Multi-Channel Configuration UI
**Current**: No UI for channel management
**Target**: Dashboard page to configure WhatsApp, Telegram, Web, etc.

**New Page**: `/admin/channels`

**Features**:
- List all channels with status (connected/disconnected)
- Add/Edit channel credentials
- Test channel connectivity
- View channel-specific metrics
- Configure channel-specific flows

**Backend API**:
```typescript
@Get('channels')
async getChannels() {
  return [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      enabled: true,
      status: 'connected',
      phone: process.env.WHATSAPP_PHONE_NUMBER_ID,
      lastMessageAt: new Date(),
    },
    {
      id: 'telegram',
      name: 'Telegram',
      enabled: false,
      status: 'not-configured',
    },
    {
      id: 'web',
      name: 'Web Chat',
      enabled: true,
      status: 'connected',
    },
  ];
}

@Post('channels/:id/test')
async testChannel(@Param('id') id: string) {
  // Send test message
}
```

### 4. LLM Chat Integration
**Current**: Hardcoded to localhost:3200/llm/chat
**Target**: Use real mangwale-ai conversation service

**Frontend File**: `src/app/admin/llm-chat/page.tsx`

**Backend Endpoint**: Already exists at `/chat/send`

**Required Change**:
```typescript
// BEFORE
const response = await fetch('http://localhost:3200/llm/chat', { ... });

// AFTER
const response = await mangwaleAiClient.sendMessage(recipientId, text, {
  module: selectedModule,
  useLocalLLM: useLocalModel,
});
```

### 5. Real-Time Dashboard Stats
**Current**: Hardcoded mock stats
**Target**: Live stats from Redis + PostgreSQL

**Stats to Display**:
- Total conversations (today, this week)
- Active flows count
- Messages processed (today)
- Average response time
- Success rate (completed flows / total)
- LLM provider distribution (vLLM vs cloud)
- Top modules by usage

**Backend API**:
```typescript
@Get('stats/dashboard')
async getDashboardStats() {
  return {
    conversationsToday: await this.getConversationCount('today'),
    messagesProcessed: await this.getMessageCount('today'),
    activeFlows: await this.flowsService.countActive(),
    avgResponseTime: await this.metricsService.getAvgResponseTime(),
    successRate: await this.metricsService.getSuccessRate(),
    topModules: await this.metricsService.getTopModules(),
  };
}
```

### 6. Training Data Collection UI
**Current**: Separate Label Studio interface
**Target**: Embedded in dashboard with auto-sync

**Features**:
- View recent conversations for annotation
- Quick-annotate intents directly in UI
- Push to Label Studio button
- Pull annotations from Label Studio
- Auto-training trigger when dataset reaches threshold

### 7. System Monitoring Integration
**Current**: Mock health checks
**Target**: Real container health + service metrics

**Page**: `/admin/monitoring`

**Backend API**:
```typescript
@Get('health/system')
async getSystemHealth() {
  return {
    services: [
      { name: 'vLLM', status: await this.checkVllm(), uptime: '2h 15m' },
      { name: 'NLU', status: await this.checkNlu(), uptime: '28m' },
      { name: 'PostgreSQL', status: await this.checkPg(), uptime: '33m' },
      { name: 'Redis', status: await this.checkRedis(), uptime: '33m' },
      { name: 'OSRM', status: await this.checkOsrm(), uptime: '2h' },
    ],
    gpu: await this.getGpuStats(),
  };
}
```

## 📋 Implementation Checklist

### Phase 1: Core API Endpoints (High Priority)
- [ ] Create `FlowsController` in mangwale-ai
- [ ] Add `GET /flows` - List all flows
- [ ] Add `GET /flows/:id` - Get single flow
- [ ] Add `POST /flows` - Create flow
- [ ] Add `PUT /flows/:id` - Update flow
- [ ] Add `DELETE /flows/:id` - Delete flow
- [ ] Add `PATCH /flows/:id/toggle` - Enable/disable flow
- [ ] Add `GET /stats/dashboard` - Dashboard stats
- [ ] Add `GET /health/system` - System health

### Phase 2: Frontend Integration
- [ ] Update `mangwale-ai.ts` client with new endpoints
- [ ] Connect Flows page to real API
- [ ] Connect Dashboard stats to real API
- [ ] Connect Monitoring page to health API
- [ ] Add error handling + toast notifications
- [ ] Add loading states for all API calls

### Phase 3: Multi-Channel UI
- [ ] Create `/admin/channels` page
- [ ] Add channel configuration forms
- [ ] Add channel testing functionality
- [ ] Integrate with backend channel management
- [ ] Add channel-specific flow routing UI

### Phase 4: Enhanced Features
- [ ] Flow Editor save/load from backend
- [ ] Flow testing panel in editor
- [ ] Training data annotation UI
- [ ] Label Studio integration buttons
- [ ] Real-time WebSocket for live updates
- [ ] Flow execution logs viewer

### Phase 5: Polish & Optimization
- [ ] Add comprehensive error messages
- [ ] Implement request caching
- [ ] Add optimistic UI updates
- [ ] Performance monitoring
- [ ] Mobile responsive fixes
- [ ] Accessibility improvements

## 🔧 Environment Variables Update

**Dashboard** (`.env.local`):
```bash
# Already correct
NEXT_PUBLIC_MANGWALE_AI_URL=http://localhost:3200

# Remove (doesn't exist)
# NEXT_PUBLIC_ADMIN_BACKEND_URL=http://localhost:3002

# Keep for future
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:3100
NEXT_PUBLIC_PHP_BACKEND_URL=https://testing.mangwale.com
```

**Backend** (`.env`):
```bash
# Already correct
PORT=3200
LLM_MODE=hybrid
VLLM_URL=http://localhost:8002
VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct-AWQ
DEFAULT_LLM_PROVIDER=vllm

# Add CORS for dashboard
CORS_ORIGINS=http://localhost:3000,https://chat.mangwale.ai
```

## 🎨 Technology Upgrades

### Current Stack (Already Modern!)
- ✅ Next.js 16 (latest)
- ✅ React 19 (latest)
- ✅ Tailwind CSS 4 (latest)
- ✅ TypeScript 5 (latest)
- ✅ @xyflow/react (latest ReactFlow)
- ✅ Radix UI primitives
- ✅ Framer Motion animations
- ✅ Zustand state management
- ✅ TanStack Query (React Query v5)

### Recommended Additions
- [ ] **shadcn/ui** - Pre-built accessible components
- [ ] **Recharts** - Dashboard charts/graphs
- [ ] **react-hot-toast** - Better toast notifications
- [ ] **sonner** - Elegant toast alternative
- [ ] **cmdk** - Command palette (⌘K search)
- [ ] **vaul** - Drawer component
- [ ] **date-fns** - Date formatting

Install:
```bash
cd /home/ubuntu/Devs/mangwale-unified-dashboard
npx shadcn@latest init
npx shadcn@latest add chart
npm install recharts react-hot-toast cmdk vaul date-fns
```

## 📊 API Response Formats

### Flow List Response
```json
{
  "flows": [
    {
      "id": "greeting_v1",
      "name": "Greeting Flow",
      "description": "Welcome new users",
      "module": "general",
      "enabled": true,
      "createdAt": "2024-11-01T10:00:00Z",
      "updatedAt": "2024-11-18T12:00:00Z",
      "stepsCount": 3,
      "executionCount": 1247,
      "successRate": 98.5
    }
  ],
  "total": 6
}
```

### Dashboard Stats Response
```json
{
  "conversations": {
    "today": 1247,
    "thisWeek": 8934,
    "trend": "+12%"
  },
  "messages": {
    "today": 5892,
    "avgResponseTime": 145,
    "successRate": 98.5
  },
  "flows": {
    "active": 6,
    "total": 10,
    "topFlow": "parcel_booking"
  },
  "llm": {
    "provider": "vllm",
    "model": "Qwen/Qwen2.5-7B-Instruct-AWQ",
    "tokensProcessed": 45892,
    "avgLatency": 120
  },
  "modules": [
    { "name": "parcel", "usage": 45, "trend": "+15%" },
    { "name": "food", "usage": 30, "trend": "+5%" },
    { "name": "ecom", "usage": 25, "trend": "-2%" }
  ]
}
```

## 🚀 Quick Start Integration

### Step 1: Add Flows API to Backend
```bash
cd /home/ubuntu/Devs/mangwale-ai
nest g controller flows
nest g service flows
```

### Step 2: Update Frontend Client
```bash
cd /home/ubuntu/Devs/mangwale-unified-dashboard
# Edit src/lib/api/mangwale-ai.ts
```

### Step 3: Test Integration
```bash
# Backend
curl http://localhost:3200/flows

# Frontend
# Open http://localhost:3000/admin/flows
# Should show real flows from database
```

## 🎯 Success Criteria

**Phase 1 Complete When**:
- [ ] Dashboard shows real stats from backend
- [ ] Flows page loads 6 flows from PostgreSQL
- [ ] Can create/edit/delete flows via UI
- [ ] System monitoring shows real service health
- [ ] LLM chat uses actual conversation service

**Phase 2 Complete When**:
- [ ] Multi-channel configuration working
- [ ] Flow editor saves to database
- [ ] Training data UI integrated
- [ ] Real-time updates via WebSocket

**Phase 3 Complete When**:
- [ ] All buttons functional
- [ ] No hardcoded data
- [ ] Production-ready error handling
- [ ] Mobile responsive
- [ ] Accessibility compliant

---

**Next Actions**:
1. ✅ vLLM running with 7B-AWQ model
2. 🔄 Create FlowsController in mangwale-ai
3. ⏳ Connect dashboard to real backend
4. ⏳ Add multi-channel UI
5. ⏳ Integrate all features
