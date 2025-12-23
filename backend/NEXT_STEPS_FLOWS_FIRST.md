# 🚀 Next Steps: Flow Management Implementation

**Date:** November 14, 2025  
**Strategy:** Flow-First Approach  
**Timeline:** 3-4 weeks to production-ready flows

---

## 🎯 Why Flows First?

### Current State
- ✅ All infrastructure working
- ✅ Database consolidated
- ✅ Services operational
- ✅ Data architecture verified
- ⚠️ No flow execution engine in mangwale-ai
- ⚠️ 2 production flows stuck in admin-backend

### Strategic Rationale

1. **Unblocks Everything**
   - Frontend can't function without backend flows
   - WhatsApp needs flows for conversations
   - NLU training needs flow execution context
   - Testing requires complete user journeys

2. **Business Value**
   - Get order placement working immediately
   - Enable parcel delivery flow
   - Foundation for all modules (food, ecom, parcel)

3. **Technical Foundation**
   - Flows orchestrate: NLU → LLM → Tools → Response
   - Visual flow builder already exists (admin-backend)
   - Database schema ready (Flow, FlowRun, FlowRunStep tables)

---

## 📊 Current Flow System Analysis

### Admin-Backend Flow System (Source)
**Location:** `/home/ubuntu/Devs/mangwale-admin-backend-v1/src/routes/flows.ts`

**Features:**
- ✅ Visual flow executor (4 node types)
- ✅ 2 active production flows
- ✅ Templates system
- ✅ Checkpointing & pause/resume
- ✅ Variable interpolation
- ✅ Decision branching
- ✅ Tool integration (18 tools)

**Integration Points:**
- NLU Service (7010) - Intent classification
- vLLM (8002) - LLM responses
- OSRM - Distance calculation
- Razorpay - Payments
- PHP Backend - Order placement
- WhatsApp - Messaging

**Storage:** Hybrid (db.json + PostgreSQL) ⚠️ Needs migration

---

### mangwale-ai Flow System (Target)
**Location:** `/home/ubuntu/Devs/mangwale-ai/src/flows/`

**Current State:**
- ⚠️ Only basic utilities (flow-context.ts, 170 lines)
- ⚠️ No execution engine
- ⚠️ No visual flow support
- ✅ Prisma models exist (Flow, FlowRun, FlowRunStep)

**What's Needed:**
- Flow execution engine
- Node executors (NLU, LLM, Tool, Decision)
- Template system
- Tool registry
- Edge condition evaluator
- API endpoints

---

## 🏗️ Implementation Plan

### Week 1-2: Core Flow Engine

#### Day 1-2: Module Structure Setup
```bash
mangwale-ai/src/flow-management/
├── flow-management.module.ts         # Main module
├── controllers/
│   └── flow.controller.ts            # REST API
├── services/
│   ├── flow.service.ts               # CRUD operations
│   ├── flow-execution.service.ts     # Execution engine
│   └── flow-template.service.ts      # Template management
├── executors/
│   ├── nlu-node.executor.ts          # NLU integration
│   ├── llm-node.executor.ts          # LLM integration
│   ├── tool-node.executor.ts         # Tool execution
│   ├── decision-node.executor.ts     # Branching logic
│   └── response-node.executor.ts     # Response formatting
├── tools/
│   ├── flow-tool.registry.ts         # Tool registration
│   ├── address.tool.ts               # Address management
│   ├── zone.tool.ts                  # Zone detection
│   ├── distance.tool.ts              # OSRM integration
│   ├── payment.tool.ts               # Razorpay integration
│   └── notification.tool.ts          # WhatsApp/SMS
├── evaluators/
│   ├── edge-condition.evaluator.ts   # Edge evaluation
│   └── template-variable.evaluator.ts # Variable interpolation
└── dto/
    ├── create-flow.dto.ts
    ├── execute-flow.dto.ts
    └── flow-response.dto.ts
```

**Tasks:**
- [ ] Create module structure (21 files)
- [ ] Set up Prisma models (already exist, verify)
- [ ] Create base services and controllers
- [ ] Set up dependency injection

**Deliverable:** Module scaffolding complete

---

#### Day 3-5: Node Executors

**1. NLU Node Executor**
```typescript
// flow-management/executors/nlu-node.executor.ts
export class NluNodeExecutor {
  async execute(node: FlowNode, context: FlowContext): Promise<NodeResult> {
    // Call NLU service (7010)
    const nluOutput = await this.nluService.classify(context.userMessage);
    
    // Store in context
    context.set('nlu_intent', nluOutput.intent);
    context.set('nlu_entities', nluOutput.entities);
    context.set('nlu_confidence', nluOutput.confidence);
    
    return {
      success: true,
      data: nluOutput,
      nextEdge: this.selectEdge(node, nluOutput)
    };
  }
}
```

**2. LLM Node Executor**
```typescript
// flow-management/executors/llm-node.executor.ts
export class LlmNodeExecutor {
  async execute(node: FlowNode, context: FlowContext): Promise<NodeResult> {
    // Build prompt from template + context
    const prompt = this.templateService.interpolate(
      node.config.prompt_template,
      context.getAll()
    );
    
    // Call LLM (vLLM or cloud)
    const response = await this.llmService.chat(prompt, {
      model: node.config.model || 'qwen2.5-7b',
      temperature: node.config.temperature || 0.7
    });
    
    // Track usage
    await this.llmTrackingService.logUsage({...});
    
    return {
      success: true,
      data: { response: response.content },
      nextEdge: 'default'
    };
  }
}
```

**3. Tool Node Executor**
```typescript
// flow-management/executors/tool-node.executor.ts
export class ToolNodeExecutor {
  async execute(node: FlowNode, context: FlowContext): Promise<NodeResult> {
    // Get tool from registry
    const tool = this.toolRegistry.get(node.config.tool_name);
    
    // Prepare parameters from context
    const params = this.templateService.interpolateObject(
      node.config.parameters,
      context.getAll()
    );
    
    // Execute tool
    const result = await tool.execute(params);
    
    // Store result in context
    context.set(node.config.output_variable || 'tool_result', result);
    
    return {
      success: result.success,
      data: result,
      nextEdge: result.success ? 'success' : 'error'
    };
  }
}
```

**4. Decision Node Executor**
```typescript
// flow-management/executors/decision-node.executor.ts
export class DecisionNodeExecutor {
  async execute(node: FlowNode, context: FlowContext): Promise<NodeResult> {
    // Evaluate conditions for each edge
    for (const edge of node.outgoing_edges) {
      if (this.conditionEvaluator.evaluate(edge.condition, context)) {
        return {
          success: true,
          data: { matched_condition: edge.condition },
          nextEdge: edge.id
        };
      }
    }
    
    // Default fallback
    return {
      success: true,
      data: { matched_condition: 'default' },
      nextEdge: 'default'
    };
  }
}
```

**Tasks:**
- [ ] Implement 5 node executors
- [ ] Write unit tests for each
- [ ] Integration tests with actual services

**Deliverable:** All node types executable

---

#### Day 6-8: Flow Execution Engine

```typescript
// flow-management/services/flow-execution.service.ts
export class FlowExecutionService {
  async executeFlow(
    flowId: string,
    userId: string,
    input: any
  ): Promise<FlowRun> {
    // 1. Load flow definition
    const flow = await this.flowService.findOne(flowId);
    
    // 2. Create flow run
    const flowRun = await this.prisma.flowRun.create({
      data: {
        flow_id: flowId,
        user_id: userId,
        status: 'running',
        context: { input }
      }
    });
    
    // 3. Initialize context
    const context = new FlowContext(flowRun.context);
    
    // 4. Start from entry node
    let currentNode = flow.nodes.find(n => n.type === 'start');
    
    // 5. Execute nodes until completion
    while (currentNode && currentNode.type !== 'end') {
      // Create step
      const step = await this.createStep(flowRun.id, currentNode);
      
      try {
        // Execute node
        const executor = this.getExecutor(currentNode.type);
        const result = await executor.execute(currentNode, context);
        
        // Update step
        await this.updateStep(step.id, 'completed', result);
        
        // Find next node
        const nextEdge = this.findEdge(currentNode, result.nextEdge);
        currentNode = this.findNode(flow, nextEdge.target_id);
        
        // Save checkpoint
        await this.saveCheckpoint(flowRun.id, context);
        
      } catch (error) {
        // Handle error
        await this.updateStep(step.id, 'failed', { error: error.message });
        await this.failFlowRun(flowRun.id, error);
        throw error;
      }
    }
    
    // 6. Complete flow run
    await this.completeFlowRun(flowRun.id, context);
    
    return flowRun;
  }
}
```

**Features:**
- Checkpoint/resume support
- Error handling and retries
- Step-by-step execution tracking
- Context management
- Edge evaluation

**Tasks:**
- [ ] Implement execution engine
- [ ] Add checkpoint/resume logic
- [ ] Error handling and rollback
- [ ] Performance optimization

**Deliverable:** Complete execution engine

---

#### Day 9-10: Tool Registry & Tools

**Tool Registry:**
```typescript
// flow-management/tools/flow-tool.registry.ts
export class FlowToolRegistry {
  private tools = new Map<string, FlowTool>();
  
  register(name: string, tool: FlowTool) {
    this.tools.set(name, tool);
  }
  
  get(name: string): FlowTool {
    if (!this.tools.has(name)) {
      throw new Error(`Tool not found: ${name}`);
    }
    return this.tools.get(name);
  }
}
```

**Essential Tools (18 total):**
1. `address.tool` - Manage delivery addresses
2. `zone.tool` - Detect zone from lat/lon
3. `distance.tool` - Calculate distance (OSRM)
4. `payment.tool` - Razorpay integration
5. `notification.tool` - WhatsApp/SMS
6. `order.tool` - PHP backend integration
7. `search.tool` - OpenSearch integration
8. `cart.tool` - Cart management
9. `user.tool` - User profile operations
10. `validation.tool` - Input validation
11. `pricing.tool` - Calculate costs
12. `availability.tool` - Check store/item availability
13. `schedule.tool` - Store opening hours
14. `tracking.tool` - Order tracking
15. `refund.tool` - Process refunds
16. `voucher.tool` - Apply discounts
17. `feedback.tool` - Collect ratings
18. `escalation.tool` - Human handoff

**Tasks:**
- [ ] Implement tool registry
- [ ] Create 18 essential tools
- [ ] Write tool tests
- [ ] Document tool APIs

**Deliverable:** Complete tool system

---

### Week 3: Flow Migration & Templates

#### Day 11-13: Migrate Production Flows

**Flow 1: Parcel Order Flow**
- 25 nodes (NLU → Address → Distance → Pricing → Payment → Confirmation)
- Integrates: NLU, OSRM, Razorpay, PHP Backend, WhatsApp
- Variables: 15+ (pickup_address, drop_address, distance_km, price, etc.)

**Flow 2: E-commerce Order Flow**
- 30 nodes (Search → Cart → Address → Payment → Confirmation)
- Integrates: OpenSearch, Zone detection, Payment, Order placement

**Migration Steps:**
1. Export flows from admin-backend db.json
2. Convert to PostgreSQL format
3. Validate all node connections
4. Test execution
5. Deploy to mangwale-ai

**Tasks:**
- [ ] Export flows from admin-backend
- [ ] Import to mangwale-ai database
- [ ] Validate all integrations
- [ ] End-to-end testing

**Deliverable:** 2 production flows working

---

#### Day 14-15: Flow Templates

**Templates:**
1. **Food Order Template** - Quick food ordering
2. **Parcel Delivery Template** - Package booking
3. **Product Search Template** - E-commerce browsing
4. **Order Tracking Template** - Status inquiries
5. **Customer Support Template** - Issue resolution

**Template Features:**
- Pre-configured nodes and connections
- Default variable mappings
- Customizable parameters
- One-click instantiation

**Tasks:**
- [ ] Create 5 flow templates
- [ ] Template validation system
- [ ] Template marketplace (future)

**Deliverable:** Reusable flow templates

---

### Week 4: API & Frontend Integration

#### Day 16-18: REST API

**Endpoints:**
```typescript
// Flow Management API
POST   /flows                    // Create flow
GET    /flows                    // List flows
GET    /flows/:id                // Get flow details
PUT    /flows/:id                // Update flow
DELETE /flows/:id                // Delete flow
POST   /flows/:id/execute        // Execute flow
GET    /flows/:id/runs           // Get flow runs
GET    /flows/runs/:runId        // Get run details
POST   /flows/runs/:runId/resume // Resume paused run
POST   /flows/runs/:runId/cancel // Cancel running flow

// Flow Templates API
GET    /flow-templates           // List templates
POST   /flow-templates/:id/instantiate  // Create from template

// Flow Builder API (for frontend)
POST   /flows/:id/nodes          // Add node
PUT    /flows/:id/nodes/:nodeId  // Update node
DELETE /flows/:id/nodes/:nodeId  // Delete node
POST   /flows/:id/edges          // Add edge
DELETE /flows/:id/edges/:edgeId  // Delete edge
POST   /flows/:id/validate       // Validate flow
```

**Tasks:**
- [ ] Implement all endpoints
- [ ] Add authentication/authorization
- [ ] API documentation (Swagger)
- [ ] Rate limiting

**Deliverable:** Complete REST API

---

#### Day 19-21: Frontend Integration

**Unified Dashboard Flow Builder:**
```
/home/ubuntu/Devs/mangwale-unified-dashboard/src/app/(dashboard)/flows/
├── page.tsx                    // Flow list
├── new/page.tsx               // Create flow
├── [id]/page.tsx              // Flow builder UI
├── [id]/edit/page.tsx         // Edit mode
├── [id]/runs/page.tsx         // Execution history
└── templates/page.tsx         // Template gallery
```

**UI Components:**
- React Flow for visual builder
- Node palette (drag & drop)
- Property panel for node config
- Edge condition editor
- Variable mapper
- Execution visualizer
- Template selector

**Tasks:**
- [ ] Create flow builder UI pages
- [ ] Integrate React Flow library
- [ ] Node configuration panels
- [ ] Execution monitoring dashboard
- [ ] Template gallery

**Deliverable:** Visual flow builder in dashboard

---

## 🎯 Success Metrics

### Technical Milestones
- [ ] Flow execution engine working
- [ ] 2 production flows migrated
- [ ] 5 templates created
- [ ] 18 tools implemented
- [ ] REST API complete
- [ ] Frontend builder functional

### Business Outcomes
- [ ] Food orders can be placed via WhatsApp
- [ ] Parcel deliveries can be booked
- [ ] E-commerce checkout working
- [ ] Multi-channel support (WhatsApp, Web)
- [ ] Flow execution <2 seconds average

### Quality Gates
- [ ] 80%+ test coverage
- [ ] All production flows tested
- [ ] Zero critical bugs
- [ ] API documentation complete
- [ ] Performance benchmarks met

---

## 🚧 Parallel Track: NLU Training

**While building flows, start NLU data collection:**

### Week 1-2: Data Collection
- Deploy gamification system
- Collect 100 samples (intent.food.order, intent.parcel.track, etc.)
- Label Studio annotation setup

### Week 3: Training
- Train IndicBERT model
- Test accuracy (target: 85%+)
- Deploy to mangwale_nlu:7010

### Week 4: Integration
- Replace default intent with trained model
- Flow execution uses real NLU classifications
- A/B testing with LLM fallback

**Goal:** By end of Week 4, flows use trained NLU model

---

## 📊 After Flows: Next Priorities

### 1. Frontend Polish (Week 5-6)
- Complete unified dashboard
- WhatsApp integration testing
- Mobile responsive design
- User acceptance testing

### 2. AI Enhancements (Week 6-7)
- Improve LLM prompts for flows
- Add conversation memory to flows
- Personalization integration
- Sentiment analysis

### 3. Production Hardening (Week 7-8)
- Load testing (1000 concurrent flows)
- Error handling improvements
- Monitoring and alerting
- Backup and recovery

### 4. Feature Expansion (Week 9+)
- Voice integration (ASR/TTS)
- Multi-language flows
- Advanced analytics
- Custom agent training

---

## 💡 Alternative Approach: Frontend First?

**Pros:**
- Visual progress visible immediately
- Stakeholder demos easier
- UX feedback early

**Cons:**
- Frontend can't function without backend flows ⚠️
- Mock data doesn't test real integrations ⚠️
- Wasted effort if backend architecture changes ⚠️
- No business value until backend works ⚠️

**Verdict:** ❌ Not recommended. Backend flows must come first.

---

## 🎯 Recommended Approach: Flows First

**Why it's optimal:**

1. **Unblocks Everything**
   - Frontend gets real APIs to integrate
   - WhatsApp flows work immediately
   - NLU training has execution context
   - Testing becomes possible

2. **Business Value**
   - Orders can be placed (revenue!)
   - Parcel deliveries work (core business)
   - E-commerce checkout functional

3. **Technical Foundation**
   - Orchestration layer for all AI services
   - Multi-channel support built-in
   - Scalable architecture

4. **Reduced Risk**
   - Backend proven before frontend investment
   - Real data flow tested
   - Integration issues found early

---

## 📅 Timeline Summary

| Week | Focus | Deliverable |
|------|-------|-------------|
| **1-2** | Core Flow Engine | Node executors, execution engine, tools |
| **3** | Migration & Templates | 2 production flows working, 5 templates |
| **4** | API & Frontend | REST API, visual flow builder |
| **5-6** | Frontend Polish | Complete unified dashboard |
| **7-8** | Production Hardening | Load testing, monitoring |

**Total Time:** 6-8 weeks to production-ready system

---

## ✅ Action Items (This Week)

### Day 1 (Today)
- [ ] Review this plan with team
- [ ] Set up flow-management module structure
- [ ] Create Prisma models (verify existing)
- [ ] Set up development environment

### Day 2-3
- [ ] Implement NLU node executor
- [ ] Implement LLM node executor
- [ ] Write unit tests

### Day 4-5
- [ ] Implement Tool node executor
- [ ] Implement Decision node executor
- [ ] Integration testing

**By end of Week 1:** Have basic flow execution working (simple 3-node flow)

---

## 📚 References

- **Flow System Analysis:** [FLOW_MANAGEMENT_CURRENT_STATE_ANALYSIS.md](../../Devs/FLOW_MANAGEMENT_CURRENT_STATE_ANALYSIS.md)
- **Migration Plan:** [FLOW_MANAGEMENT_MIGRATION_PLAN.md](../../Devs/FLOW_MANAGEMENT_MIGRATION_PLAN.md)
- **Architecture:** [COMPLETE_ARCHITECTURE_GUIDE.md](./COMPLETE_ARCHITECTURE_GUIDE.md)
- **System Verification:** [SYSTEM_VERIFICATION_REPORT.md](./SYSTEM_VERIFICATION_REPORT.md)

---

**Decision:** ✅ **Proceed with Flow-First Approach**

**Start Date:** November 15, 2025  
**Target Completion:** January 10, 2026 (8 weeks)  
**First Milestone:** Basic flow execution (Week 1)

🚀 **Let's build the flows!**
