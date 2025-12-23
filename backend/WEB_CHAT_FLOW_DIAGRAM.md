# Mangwale AI - Web Chat Flow Architecture

## 🎯 Overview
This document visualizes how messages flow through the **multi-channel orchestrator architecture** focusing on the **web chat interface** at `chat.mangwale.ai/chat`.

---

## 📊 Complete System Flow

```mermaid
graph TB
    subgraph "🌐 User Channels"
        WEB[Web Chat<br/>chat.mangwale.ai/chat]
        WA[WhatsApp<br/>Business API]
        TG[Telegram Bot]
    end

    subgraph "🎯 Entry Points - Controllers Layer"
        CHAT_WEB[ChatWebController<br/>/agents/chat]
        WA_WEBHOOK[WhatsAppController<br/>/webhook/whatsapp]
        TG_WEBHOOK[TelegramController<br/>/webhook/telegram]
    end

    subgraph "🧠 Conversation Engine"
        CONV_SVC[ConversationService<br/>Channel-agnostic orchestration]
        SESSION[SessionService<br/>Redis Session State]
    end

    subgraph "🤖 Agent Orchestrator"
        ORCHESTRATOR[AgentOrchestratorService<br/>Intelligent Agent Selection]
        NLU[NLU Classifier<br/>IndicBERT v3<br/>48% accuracy → 75% target]
        INTENT_ROUTER[IntentRouterService<br/>Map Intent → Agent]
    end

    subgraph "🎭 Specialized Agents"
        FAQ[FAQAgent<br/>Greetings & Help]
        SEARCH[SearchAgent<br/>Product Discovery]
        ORDER[OrderAgent<br/>Order Tracking]
        COMPLAINT[ComplaintsAgent<br/>Refunds & Issues]
        BOOKING[BookingAgent<br/>Rides & Rooms]
    end

    subgraph "⚙️ Function Executors"
        FUNC_EXEC[FunctionExecutorService<br/>Execute Agent Actions]
        SEARCH_FUNC[SearchFunction<br/>OpenSearch + PHP]
        ORDER_FUNC[OrderStatusFunction<br/>PHP Backend]
        COST_FUNC[CalculateParcelCost<br/>PHP Integration]
    end

    subgraph "🔌 Backend Integration"
        PHP_ADAPTER[PhpIntegrationModule<br/>Business Logic<br/>Port 8090]
        SEARCH_API[SearchOrchestrator<br/>OpenSearch<br/>Port 3100]
        DB[PostgreSQL<br/>Sessions & Flows<br/>Port 5433]
        REDIS[(Redis<br/>Session Cache<br/>Port 6381)]
    end

    subgraph "💾 Data Collection"
        CONV_LOGGER[ConversationLoggerService<br/>Log for Training]
        CONV_DB[(PostgreSQL<br/>conversation_logs)]
    end

    subgraph "🎓 Training Pipeline"
        LABEL_STUDIO[Label Studio<br/>Annotation Interface]
        TRAINING[NLU Training<br/>GPU RTX 3060]
        MODEL_UPDATE[Model Update<br/>Deploy New Version]
    end

    %% User to Entry Points
    WEB -->|POST /agents/chat| CHAT_WEB
    WA -->|Webhook| WA_WEBHOOK
    TG -->|Webhook| TG_WEBHOOK

    %% Entry Points to Conversation
    CHAT_WEB -->|"1. Extract message"| CONV_SVC
    WA_WEBHOOK -->|"1. Extract message"| CONV_SVC
    TG_WEBHOOK -->|"1. Extract message"| CONV_SVC

    %% Conversation Flow
    CONV_SVC -->|"2. Get/Create Session"| SESSION
    SESSION <-->|"Read/Write State"| REDIS
    CONV_SVC -->|"3. Route to Orchestrator"| ORCHESTRATOR

    %% Orchestration
    ORCHESTRATOR -->|"4. Classify Intent"| NLU
    NLU -->|"Intent (e.g., 'track_order')"| INTENT_ROUTER
    INTENT_ROUTER -->|"5. Select Agent"| FAQ
    INTENT_ROUTER -->|"5. Select Agent"| SEARCH
    INTENT_ROUTER -->|"5. Select Agent"| ORDER
    INTENT_ROUTER -->|"5. Select Agent"| COMPLAINT
    INTENT_ROUTER -->|"5. Select Agent"| BOOKING

    %% Agent Processing
    FAQ -->|"6. LLM + Function Call"| FUNC_EXEC
    SEARCH -->|"6. LLM + Function Call"| FUNC_EXEC
    ORDER -->|"6. LLM + Function Call"| FUNC_EXEC
    COMPLAINT -->|"6. LLM + Function Call"| FUNC_EXEC
    BOOKING -->|"6. LLM + Function Call"| FUNC_EXEC

    %% Function Execution
    FUNC_EXEC -->|"7a. Execute"| SEARCH_FUNC
    FUNC_EXEC -->|"7b. Execute"| ORDER_FUNC
    FUNC_EXEC -->|"7c. Execute"| COST_FUNC

    %% Backend Calls
    SEARCH_FUNC -->|"API Call"| SEARCH_API
    ORDER_FUNC -->|"API Call + Auth"| PHP_ADAPTER
    COST_FUNC -->|"API Call + Auth"| PHP_ADAPTER
    PHP_ADAPTER -->|"Business Logic"| PHP_ADAPTER

    %% Session Persistence
    ORCHESTRATOR -->|"8. Update State"| SESSION
    SESSION -->|"Persist"| DB

    %% Response Path
    FUNC_EXEC -->|"9. Return Result"| ORCHESTRATOR
    ORCHESTRATOR -->|"10. Format Response"| CONV_SVC
    CONV_SVC -->|"11. Send Reply"| CHAT_WEB
    CONV_SVC -->|"11. Send Reply"| WA_WEBHOOK
    CONV_SVC -->|"11. Send Reply"| TG_WEBHOOK
    CHAT_WEB -->|"JSON Response"| WEB
    WA_WEBHOOK -->|"WhatsApp API"| WA
    TG_WEBHOOK -->|"Telegram API"| TG

    %% Conversation Logging
    CONV_SVC -->|"Log Every Message"| CONV_LOGGER
    CONV_LOGGER -->|"Insert"| CONV_DB

    %% Training Pipeline
    CONV_DB -->|"Export Samples"| LABEL_STUDIO
    LABEL_STUDIO -->|"Annotated Data"| TRAINING
    TRAINING -->|"New Model"| MODEL_UPDATE
    MODEL_UPDATE -->|"Deploy"| NLU

    style WEB fill:#4CAF50,color:#fff
    style ORCHESTRATOR fill:#2196F3,color:#fff
    style NLU fill:#FF9800,color:#fff
    style CONV_LOGGER fill:#9C27B0,color:#fff
    style PHP_ADAPTER fill:#F44336,color:#fff
```

---

## 🔍 Web Chat Specific Flow (Detailed)

```mermaid
sequenceDiagram
    participant User as 👤 User<br/>chat.mangwale.ai/chat
    participant Web as 🌐 Web Client<br/>(React/Next.js)
    participant API as 🎯 ChatWebController<br/>/agents/chat
    participant Conv as 🧠 ConversationService
    participant Sess as 💾 SessionService<br/>(Redis)
    participant Orch as 🤖 AgentOrchestrator
    participant NLU as 📊 NLU Classifier
    participant Agent as 🎭 SearchAgent
    participant Func as ⚙️ FunctionExecutor
    participant Search as 🔍 SearchAPI<br/>(OpenSearch)
    participant Logger as 📝 ConversationLogger
    participant DB as 🗄️ PostgreSQL

    User->>Web: Types "Find chicken pizza near me"
    Web->>API: POST /agents/chat<br/>{message, userId, channel: 'web'}
    
    API->>Conv: handleMessage(userId, message)
    Conv->>Sess: getOrCreate(userId)
    Sess->>Redis: GET session:userId
    Redis-->>Sess: {step: null, data: {}}
    Sess-->>Conv: Session object
    
    Conv->>Orch: processMessage(message, context)
    Orch->>NLU: classify(message)
    NLU-->>Orch: {intent: 'search_food', confidence: 0.82}
    
    Orch->>Agent: process(message, context)
    Note over Agent: Agent calls LLM with functions:<br/>- search_products<br/>- get_location
    
    Agent->>Func: execute('search_products', {query: 'chicken pizza'})
    Func->>Search: POST /search<br/>{query, type: 'food', location}
    Search-->>Func: [{name: 'Chicken BBQ Pizza',...}]
    Func-->>Agent: Search results
    
    Agent-->>Orch: "Found 5 pizza options!"
    Orch->>Sess: update({step: 'viewing_results'})
    Sess->>Redis: SET session:userId
    
    Orch-->>Conv: Response with product cards
    Conv->>Logger: log(userId, message, response)
    Logger->>DB: INSERT INTO conversation_logs
    
    Conv-->>API: {reply, products: [...]}
    API-->>Web: JSON response
    Web-->>User: Shows pizza cards with prices
    
    Note over Logger,DB: 🎓 Logged for future training<br/>Target: 500-1000 samples<br/>Current: ~122 samples
```

---

## 🎯 Current State vs Target

### **Current NLU Performance**
- **Model**: IndicBERTv3_final (ai4bharat/IndicBERTv2-MLM-Back-TLM)
- **Accuracy**: 48% (122 training samples, 13 intents)
- **Status**: 🔴 Below production threshold

### **Target Performance**
- **Accuracy**: 75-80% (gold standard)
- **Required**: 500-1000 real conversation samples
- **Timeline**: 2-4 weeks with beta users
- **Method**: Web chat data collection → Label Studio → Retrain

### **Data Collection Strategy**
1. **Source**: Real users on `chat.mangwale.ai/chat`
2. **Logging**: Every conversation → PostgreSQL `conversation_logs`
3. **Annotation**: Export to Label Studio weekly
4. **Training**: GPU batch training every 100 new samples
5. **Deployment**: Continuous model updates via model registry

---

## 🚀 Key Components

### **1. ChatWebController** (`src/agents/controllers/chat-web.controller.ts`)
- **Purpose**: REST API for web chat
- **Endpoint**: `POST /agents/chat`
- **Features**:
  - CORS enabled for web client
  - Session-aware (userId tracking)
  - Message history support
  - Real-time response streaming (optional)

### **2. ConversationService** (`src/conversation/conversation.service.ts`)
- **Purpose**: Channel-agnostic conversation orchestration
- **Responsibilities**:
  - Session management (get/create/update)
  - Route messages to appropriate handlers
  - Multi-channel message formatting
  - Conversation logging trigger

### **3. AgentOrchestratorService** (`src/agents/services/agent-orchestrator.service.ts`)
- **Purpose**: Intelligent agent selection and coordination
- **Flow**:
  1. Receive message + context
  2. Call NLU classifier (IndicBERT)
  3. Map intent → agent (IntentRouter)
  4. Execute agent with function calling
  5. Return formatted response

### **4. NLU Classifier** (`src/nlu/services/nlu-classification.service.ts`)
- **Model**: IndicBERT v3 (278M parameters)
- **Input**: User message (any language)
- **Output**: `{intent: string, confidence: number}`
- **Intents**: 13 categories (search_food, track_order, etc.)

### **5. Specialized Agents** (`src/agents/agents/*.agent.ts`)
- **FAQAgent**: Greetings, help, general questions
- **SearchAgent**: Product/service discovery (food, ecom, services)
- **OrderAgent**: Order tracking, cancellation, status
- - **ComplaintsAgent**: Refunds, issues, disputes
- **BookingAgent**: Rides, rooms, appointments

### **6. FunctionExecutorService** (`src/agents/services/function-executor.service.ts`)
- **Purpose**: Execute agent function calls
- **Functions** (14 total):
  - `search_products` → OpenSearch API
  - `check_order_status` → PHP Backend
  - `calculate_parcel_cost` → PHP Integration
  - `get_user_location` → Session/PHP
  - `book_ride` → PHP Backend
  - ... and 9 more

### **7. ConversationLoggerService** (`src/database/conversation-logger.service.ts`)
- **Purpose**: Log every conversation for training
- **Schema**:
  ```sql
  conversation_logs (
    id, userId, channelId, message, 
    response, intent, confidence, 
    createdAt, metadata
  )
  ```
- **Usage**: Export to Label Studio → Annotate → Retrain NLU

---

## 🔄 Training Pipeline (Next Steps)

```mermaid
graph LR
    A[Web Chat Users<br/>500-1000 messages] --> B[conversation_logs<br/>PostgreSQL]
    B --> C[Export Script<br/>CSV/JSON]
    C --> D[Label Studio<br/>Annotation]
    D --> E[nlu_training_data<br/>PostgreSQL]
    E --> F[Training Script<br/>GPU RTX 3060]
    F --> G[New Model<br/>IndicBERTv4]
    G --> H[Model Registry<br/>Deploy]
    H --> I[NLU Service<br/>Updated]
    I --> A
    
    style A fill:#4CAF50,color:#fff
    style E fill:#FF9800,color:#fff
    style G fill:#2196F3,color:#fff
```

### **Steps to Enable**
1. ✅ **Application Running** (port 3200)
2. ✅ **Redis Connected** (port 6381)
3. ✅ **ConversationLogger Active** (PostgreSQL)
4. 🔄 **Test Web Chat** (send test message)
5. 🔄 **Verify Logging** (check conversation_logs table)
6. 🔄 **Invite Beta Users** (50-100 users)
7. 📅 **Collect Data** (2-4 weeks → 500 samples)
8. 📊 **Label in Studio** (weekly batches)
9. 🎓 **Retrain Model** (every 100 samples)
10. 🚀 **Deploy & Monitor** (track accuracy improvement)

---

## 🧪 Testing Web Chat Flow

### **1. Send Test Message**
```bash
curl -X POST http://localhost:3200/agents/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test_user_001",
    "message": "Hi, can you help me find pizza restaurants?",
    "channel": "web"
  }'
```

### **2. Verify Conversation Logging**
```sql
SELECT 
  id, 
  "userId", 
  message, 
  response, 
  intent, 
  confidence,
  "createdAt"
FROM conversation_logs 
WHERE "userId" = 'test_user_001'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### **3. Check Session State**
```bash
redis-cli -p 6381 GET session:test_user_001
```

### **4. Monitor Agent Selection**
```bash
pm2 logs mangwale-ai --lines 50 | grep "Agent selected"
```

---

## 📈 Success Metrics

### **Phase 1: Data Collection (Weeks 1-2)**
- ✅ 100 unique users on web chat
- ✅ 300 conversations logged
- ✅ 80% logging success rate
- ✅ Average 3 messages per conversation

### **Phase 2: Annotation (Weeks 2-3)**
- ✅ 250 conversations labeled in Label Studio
- ✅ Inter-annotator agreement > 85%
- ✅ All 13 intents represented
- ✅ Balanced intent distribution (±20%)

### **Phase 3: Retraining (Week 3)**
- ✅ Model accuracy: 48% → 65-70%
- ✅ GPU training time: < 5 minutes
- ✅ Zero downtime deployment
- ✅ Confidence scores > 0.7 for 80% of predictions

### **Phase 4: Production (Week 4+)**
- ✅ Model accuracy: 70% → 75-80%
- ✅ Continuous data collection (500/month)
- ✅ Monthly model updates
- ✅ A/B testing for new intents

---

## 🎓 Key Insights

1. **Multi-Channel Architecture**: Same conversation logic works across WhatsApp, Telegram, and Web
2. **Agent Orchestrator**: Intelligent routing based on NLU classification
3. **Function Calling**: Agents dynamically call 14+ functions for real-world actions
4. **Data-Driven Training**: Real conversations > gamification for NLU training
5. **Session Management**: Redis for fast state, PostgreSQL for persistence
6. **Headless Orchestration**: NestJS handles conversations, PHP handles business logic

---

## 🔗 Related Documentation
- [AGENT_SYSTEM_COMPLETE.md](./AGENT_SYSTEM_COMPLETE.md) - Full agent architecture
- [COMPLETE_FLOW_SYSTEM_ALL_TASKS_DONE.md](./COMPLETE_FLOW_SYSTEM_ALL_TASKS_DONE.md) - Flow engine
- [GAMIFICATION_STATUS_AND_NEXT_STEPS.md](./GAMIFICATION_STATUS_AND_NEXT_STEPS.md) - Training strategy
- [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) - Session decisions log

---

**Last Updated**: 2025-11-18  
**Status**: ✅ Application Deployed (port 3200)  
**Next Action**: Test web chat + Start data collection
