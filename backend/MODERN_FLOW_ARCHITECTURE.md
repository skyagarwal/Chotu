# 🔄 Modern Flow Architecture for Mangwale AI

**Date:** November 14, 2025  
**Approach:** Build from scratch, no dependencies on admin-backend-v1  
**Design Pattern:** State Machine + Event-Driven Architecture

---

## 🎯 What You Have Built

### ✅ Existing Infrastructure
1. **Chat Interface** (`chat.mangwale.ai`)
   - WebSocket-based real-time chat
   - Login/authentication integrated
   - Multiple agents (food, parcel, ecommerce)
   - Mobile-ready responsive design

2. **Backend Services**
   - **Agent Orchestrator**: Processes messages, routes to agents
   - **NLU Service**: Intent classification (IndicBERT + LLM fallback)
   - **LLM Service**: vLLM (local) → OpenRouter → Groq → OpenAI (fallback chain)
   - **Session Management**: Redis-based with 30min TTL
   - **Conversation Logger**: PostgreSQL for history/training

3. **Integrations**
   - **PHP Backend**: Order placement, address management
   - **OpenSearch**: 13,521 products indexed
   - **Redis**: Session state
   - **PostgreSQL**: AI metadata, conversations

4. **Current Flow System (in Agent Orchestrator)**
   - Fetches flows from admin-backend-v1
   - Step-by-step execution
   - Address collection (with saved addresses!)
   - Distance calculation (OSRM)
   - Payment processing (Razorpay)
   - Order placement

---

## 🚀 What We'll Build (From Scratch)

### Modern Flow Engine Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FLOW MANAGEMENT LAYER                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Flow Builder │  │ Flow Storage │  │ Flow Runtime │      │
│  │   (Visual)   │→→│  (PostgreSQL)│→→│   (Engine)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    STATE MACHINE CORE                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  States:           Transitions:          Context:            │
│  • IDLE            • user_input →        • collected_data    │
│  • COLLECTING      • data_valid →        • current_state     │
│  • PROCESSING      • api_success →       • history           │
│  • WAITING         • error →             • metadata          │
│  • COMPLETED       • timeout →                               │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                     ACTION EXECUTORS                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   NLU    │  │   LLM    │  │  Search  │  │  Payment │   │
│  │ Executor │  │ Executor │  │ Executor │  │ Executor │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Address  │  │ Distance │  │  Order   │  │   Zone   │   │
│  │ Executor │  │ Executor │  │ Executor │  │ Executor │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Database Schema (Already Exists in Prisma!)

You already have these models in PostgreSQL:

```prisma
// Flow Definition
model Flow {
  id          String   @id @default(uuid())
  name        String
  description String?
  module      String   // 'food', 'parcel', 'ecommerce'
  trigger     String?  // Intent that triggers flow
  config      Json     // Flow configuration
  status      String   @default("active")
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  
  runs        FlowRun[]
}

// Flow Execution Instance
model FlowRun {
  id              String   @id @default(uuid())
  flow_id         String
  user_id         String?
  session_id      String
  status          String   // 'running', 'completed', 'failed', 'paused'
  current_state   String?  // Current state in state machine
  context         Json     // Collected data + state
  error           String?
  started_at      DateTime @default(now())
  completed_at    DateTime?
  
  flow            Flow     @relation(fields: [flow_id], references: [id])
  steps           FlowRunStep[]
}

// Individual Step Execution
model FlowRunStep {
  id              String   @id @default(uuid())
  flow_run_id     String
  step_name       String
  step_type       String   // 'action', 'condition', 'wait'
  status          String   // 'pending', 'running', 'completed', 'failed'
  input           Json?
  output          Json?
  error           String?
  started_at      DateTime @default(now())
  completed_at    DateTime?
  
  flow_run        FlowRun  @relation(fields: [flow_run_id], references: [id])
}
```

---

## 🎨 Flow Configuration Format (JSON-based)

### Modern State Machine Format

```typescript
interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  module: 'food' | 'parcel' | 'ecommerce';
  trigger: string; // Intent name
  
  // State machine configuration
  states: {
    [stateName: string]: {
      type: 'action' | 'decision' | 'parallel' | 'wait';
      actions?: Action[];
      conditions?: Condition[];
      timeout?: number;
      onEntry?: Action[];
      onExit?: Action[];
      transitions: {
        [event: string]: string; // event → next state
      };
    };
  };
  
  initialState: string;
  finalStates: string[];
  
  // Context schema
  context: {
    [key: string]: {
      type: string;
      required: boolean;
      validation?: any;
    };
  };
}

interface Action {
  executor: string; // 'nlu', 'llm', 'search', 'address', etc.
  config: Record<string, any>;
  output?: string; // Where to store result in context
}

interface Condition {
  expression: string; // JavaScript expression
  event: string; // Event to emit if true
}
```

### Example: Food Order Flow

```json
{
  "id": "food_order_v2",
  "name": "Food Order Flow (Modern)",
  "description": "Order food from restaurants",
  "module": "food",
  "trigger": "intent.food.order",
  
  "states": {
    "init": {
      "type": "action",
      "actions": [
        {
          "executor": "llm",
          "config": {
            "prompt": "Greet user and ask what they'd like to order",
            "temperature": 0.7
          }
        }
      ],
      "transitions": {
        "user_message": "search_food"
      }
    },
    
    "search_food": {
      "type": "action",
      "actions": [
        {
          "executor": "nlu",
          "config": {
            "extract": ["food_item", "cuisine", "quantity"]
          },
          "output": "nlu_result"
        },
        {
          "executor": "search",
          "config": {
            "index": "food_items_v3",
            "query": "{{nlu_result.food_item}}",
            "filters": {
              "cuisine": "{{nlu_result.cuisine}}"
            }
          },
          "output": "search_results"
        }
      ],
      "transitions": {
        "items_found": "show_results",
        "no_items": "no_results"
      }
    },
    
    "show_results": {
      "type": "action",
      "actions": [
        {
          "executor": "llm",
          "config": {
            "prompt": "Show top {{search_results.length}} items with prices",
            "context": "{{search_results}}"
          }
        }
      ],
      "transitions": {
        "user_selects": "collect_address",
        "user_refines": "search_food"
      }
    },
    
    "collect_address": {
      "type": "action",
      "actions": [
        {
          "executor": "address",
          "config": {
            "field": "delivery_address",
            "allow_saved": true,
            "require_coordinates": true
          },
          "output": "delivery_address"
        }
      ],
      "transitions": {
        "address_valid": "validate_zone",
        "address_invalid": "collect_address"
      }
    },
    
    "validate_zone": {
      "type": "action",
      "actions": [
        {
          "executor": "zone",
          "config": {
            "latitude": "{{delivery_address.latitude}}",
            "longitude": "{{delivery_address.longitude}}"
          },
          "output": "zone_info"
        }
      ],
      "transitions": {
        "zone_valid": "calculate_delivery",
        "zone_invalid": "zone_error"
      }
    },
    
    "calculate_delivery": {
      "type": "action",
      "actions": [
        {
          "executor": "distance",
          "config": {
            "from": "{{selected_store.coordinates}}",
            "to": "{{delivery_address.coordinates}}"
          },
          "output": "distance"
        },
        {
          "executor": "pricing",
          "config": {
            "items": "{{selected_items}}",
            "delivery_fee": "{{distance * 10}}"
          },
          "output": "total_amount"
        }
      ],
      "transitions": {
        "calculated": "confirm_order"
      }
    },
    
    "confirm_order": {
      "type": "action",
      "actions": [
        {
          "executor": "llm",
          "config": {
            "prompt": "Show order summary with total ₹{{total_amount}} and ask for confirmation"
          }
        }
      ],
      "transitions": {
        "user_confirms": "process_payment",
        "user_cancels": "cancelled"
      }
    },
    
    "process_payment": {
      "type": "decision",
      "conditions": [
        {
          "expression": "payment_method === 'cod'",
          "event": "cod_selected"
        },
        {
          "expression": "payment_method === 'online'",
          "event": "online_selected"
        }
      ],
      "transitions": {
        "cod_selected": "place_order",
        "online_selected": "payment_gateway"
      }
    },
    
    "place_order": {
      "type": "action",
      "actions": [
        {
          "executor": "order",
          "config": {
            "items": "{{selected_items}}",
            "address": "{{delivery_address}}",
            "payment": "{{payment_method}}",
            "total": "{{total_amount}}"
          },
          "output": "order_result"
        }
      ],
      "transitions": {
        "success": "completed",
        "error": "order_failed"
      }
    },
    
    "completed": {
      "type": "action",
      "actions": [
        {
          "executor": "llm",
          "config": {
            "prompt": "Thank user and show order ID: {{order_result.order_id}}"
          }
        }
      ],
      "transitions": {}
    }
  },
  
  "initialState": "init",
  "finalStates": ["completed", "cancelled", "order_failed"],
  
  "context": {
    "nlu_result": { "type": "object", "required": false },
    "search_results": { "type": "array", "required": true },
    "selected_items": { "type": "array", "required": true },
    "delivery_address": { "type": "object", "required": true },
    "zone_info": { "type": "object", "required": true },
    "distance": { "type": "number", "required": true },
    "total_amount": { "type": "number", "required": true },
    "payment_method": { "type": "string", "required": true },
    "order_result": { "type": "object", "required": false }
  }
}
```

---

## 🔧 Implementation Plan

### Phase 1: Core Flow Engine (Week 1)

#### 1.1 State Machine Engine
```typescript
// src/flow-engine/state-machine.service.ts

export class StateMachineEngine {
  async executeState(
    flowRun: FlowRun,
    flow: FlowDefinition,
    event?: string
  ): Promise<StateExecutionResult> {
    const currentState = flow.states[flowRun.current_state];
    
    // 1. Execute onEntry actions
    if (currentState.onEntry) {
      await this.executeActions(currentState.onEntry, flowRun.context);
    }
    
    // 2. Execute main actions
    const results = await this.executeActions(
      currentState.actions || [],
      flowRun.context
    );
    
    // 3. Evaluate conditions
    const triggeredEvent = await this.evaluateConditions(
      currentState.conditions || [],
      flowRun.context
    );
    
    // 4. Determine next state
    const nextState = currentState.transitions[triggeredEvent || event];
    
    // 5. Execute onExit actions
    if (currentState.onExit) {
      await this.executeActions(currentState.onExit, flowRun.context);
    }
    
    return {
      nextState,
      context: flowRun.context,
      completed: flow.finalStates.includes(nextState)
    };
  }
}
```

#### 1.2 Action Executors Registry
```typescript
// src/flow-engine/executors/executor.registry.ts

export class ExecutorRegistry {
  private executors = new Map<string, ActionExecutor>();
  
  register(name: string, executor: ActionExecutor) {
    this.executors.set(name, executor);
  }
  
  async execute(
    action: Action,
    context: FlowContext
  ): Promise<any> {
    const executor = this.executors.get(action.executor);
    if (!executor) {
      throw new Error(`Executor not found: ${action.executor}`);
    }
    
    return executor.execute(action.config, context);
  }
}

// Register all executors
registry.register('nlu', new NluExecutor());
registry.register('llm', new LlmExecutor());
registry.register('search', new SearchExecutor());
registry.register('address', new AddressExecutor());
registry.register('distance', new DistanceExecutor());
registry.register('zone', new ZoneExecutor());
registry.register('pricing', new PricingExecutor());
registry.register('order', new OrderExecutor());
registry.register('payment', new PaymentExecutor());
```

#### 1.3 Flow Context Manager
```typescript
// src/flow-engine/flow-context.ts

export class FlowContext {
  private data: Record<string, any> = {};
  
  set(key: string, value: any): void {
    this.data[key] = value;
  }
  
  get<T>(key: string): T | undefined {
    return this.data[key];
  }
  
  interpolate(template: string): string {
    return template.replace(/\{\{(.+?)\}\}/g, (match, path) => {
      return this.getByPath(path) || match;
    });
  }
  
  private getByPath(path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], this.data);
  }
}
```

---

### Phase 2: Production Flows (Week 2)

#### 2.1 Food Order Flow
- 12 states (init → search → select → address → payment → complete)
- OpenSearch integration
- Zone validation
- Delivery fee calculation

#### 2.2 Parcel Delivery Flow
- 15 states (init → pickup → delivery → category → distance → pricing → payment)
- OSRM distance calculation
- Category-based pricing
- Real-time tracking

#### 2.3 E-commerce Flow
- 14 states (search → browse → cart → checkout → address → payment)
- Product recommendations
- Cart management
- Multi-item orders

---

### Phase 3: Integration (Week 3)

#### 3.1 Agent Orchestrator Integration
```typescript
// Update src/agents/services/agent-orchestrator.service.ts

async processMessage(
  phoneNumber: string,
  message: string,
  module: ModuleType
): Promise<AgentResult> {
  // 1. Check if there's an active flow
  const activeFlow = await this.flowEngine.getActiveFlow(phoneNumber);
  
  if (activeFlow) {
    // Resume flow execution
    return this.flowEngine.processMessage(activeFlow, message);
  }
  
  // 2. Route intent
  const routing = await this.intentRouter.route(context);
  
  // 3. Check if intent triggers a new flow
  const flow = await this.flowEngine.findFlowByIntent(routing.intent);
  
  if (flow) {
    // Start new flow
    return this.flowEngine.startFlow(flow, phoneNumber, message);
  }
  
  // 4. Fallback to traditional agent
  return this.executeAgent(routing.agentId, context);
}
```

#### 3.2 WebSocket Integration
```typescript
// Update src/chat/chat.gateway.ts

@SubscribeMessage('message:send')
async handleMessage(payload: MessagePayload) {
  // Process through flow engine
  const result = await this.flowEngine.processMessage(
    payload.sessionId,
    payload.message,
    payload.module
  );
  
  // Emit flow state updates
  this.server.to(sessionId).emit('flow:state', {
    state: result.currentState,
    progress: result.progress,
    collectingData: result.collectingData
  });
  
  // Emit response
  this.server.to(sessionId).emit('message', result.response);
}
```

---

### Phase 4: Visual Flow Builder (Week 4)

#### 4.1 Flow Builder API
```typescript
// POST /flows/builder
// GET /flows/:id/builder
// PUT /flows/:id/states/:stateId
// POST /flows/:id/states
// DELETE /flows/:id/states/:stateId
```

#### 4.2 Frontend Integration
```typescript
// React Flow or Mermaid.js for visualization
// Drag-and-drop state creation
// Visual transition editing
// Real-time execution preview
```

---

## 🎯 Key Advantages Over Admin-Backend Flows

### 1. **State Machine > Step-Based**
- Clear state transitions
- Easy to visualize
- Better error handling
- Parallel states support

### 2. **Event-Driven**
- User inputs = events
- System events (timeout, error)
- Webhook events
- External triggers

### 3. **Type-Safe**
- TypeScript throughout
- Schema validation
- Context typing

### 4. **Scalable**
- Horizontal scaling (Redis state store)
- Event sourcing ready
- Distributed execution

### 5. **Developer-Friendly**
- JSON configuration
- Visual builder
- Hot reload
- Time-travel debugging

---

## 📊 Success Metrics

### Technical
- Flow execution <500ms
- 99.9% uptime
- Zero data loss
- Real-time state updates

### Business
- 3 production flows
- 1000+ orders/day capacity
- Multi-channel (web, WhatsApp, mobile)
- A/B testing support

---

## 🚀 Next Steps

1. ✅ Review this architecture
2. 🔨 Build state machine engine
3. 🔧 Implement 9 core executors
4. 📋 Create 3 production flows
5. 🔄 Integrate with orchestrator
6. 🎨 Build visual flow builder

**Ready to start?** We'll build a production-grade flow system from scratch! 🎯
