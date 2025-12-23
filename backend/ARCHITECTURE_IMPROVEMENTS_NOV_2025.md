# MangwaleAI Architecture Update - November 2025

## Summary of Improvements

This document outlines the major architectural improvements made to the MangwaleAI backend system.

---

## 1. Unified Authentication Flow

**File**: `src/flow-engine/flows/auth.flow.ts`

A consolidated authentication flow that handles:
- Phone number validation (Kenyan format)
- OTP sending and verification
- Session management
- Multi-language support (English/Swahili)

```typescript
// Usage
await flowEngineService.startFlow('auth', sessionId);
```

---

## 2. Enhanced Error Handling in Flow Executor

**File**: `src/flow-engine/services/flow-executor.service.ts`

Added robust error handling:
- Per-executor try/catch with logging
- Error state transitions
- Graceful degradation
- Retry mechanisms

---

## 3. YAML Flow Definitions

**Directory**: `src/flow-engine/flows/yaml/`

New YAML-based flow definitions for easier maintenance:

```yaml
# greeting.flow.yaml
name: greeting
version: "1.0"
initial_state: welcome

states:
  welcome:
    type: message
    on_entry:
      - action: speak
        params:
          text: "Welcome to MangwaleAI!"
```

**Available YAML Flows**:
- `greeting.flow.yaml` - Welcome flow
- `auth.flow.yaml` - Authentication with OTP
- `order.flow.yaml` - Food ordering
- `search.flow.yaml` - Restaurant search
- `complaints.flow.yaml` - Customer complaints

**Service**: `YamlFlowLoaderService`
- Parses YAML to TypeScript flow definitions
- Supports shorthand notation (`on_entry` → `onEntry`)
- Validates flow structure
- Hot-reload capability

---

## 4. Legacy Auth Bridge

**File**: `src/conversation/services/auth-flow-bridge.service.ts`

Bridges legacy `ConversationService` auth handling to the new flow engine:

```typescript
@Injectable()
export class AuthFlowBridgeService {
  // Deprecated: Use flow engine directly
  @deprecated('Use FlowEngineService.startFlow("auth") instead')
  async handleAuthStep(sessionId: string, input: string);
  
  // Check if should use new flow engine
  shouldUseFlowEngine(session: Session): boolean;
}
```

---

## 5. Flow Version Manager (A/B Testing)

**File**: `src/flow-engine/services/flow-version-manager.service.ts`

Enables A/B testing of conversation flows:

```typescript
// Register flow versions with weights
await versionManager.registerFlowVersion(flowV1, { weight: 70, isDefault: true });
await versionManager.registerFlowVersion(flowV2, { weight: 30 });

// Select version for session (consistent per session)
const flow = await versionManager.selectFlowVersion('auth', sessionId);

// Record conversion
await versionManager.recordTestResult('auth', sessionId, {
  converted: true,
  metric: 'order_complete'
});

// Get results
const results = await versionManager.getTestResults('auth');
// { v1: { sessions: 700, conversions: 350 }, v2: { sessions: 300, conversions: 180 } }
```

---

## 6. Agent Handoff Service

**File**: `src/agents/services/agent-handoff.service.ts`

Enables seamless agent-to-agent delegation:

```typescript
// Request handoff
await handoffService.requestHandoff(sessionId, 'search', 'booking', {
  reason: 'User selected a restaurant',
  context: { restaurantId: '123' },
  preserveContext: true
});

// Escalate to human
await handoffService.createHumanEscalation(sessionId, {
  reason: 'Complex complaint',
  priority: 'high'
});

// Process OpenAI function call
await handoffService.processHandoffFunction(sessionId, {
  name: 'transfer_to_agent',
  arguments: JSON.stringify({ target_agent: 'booking' })
});
```

---

## 7. Real Training Pipeline

**File**: `src/training/services/training-pipeline.service.ts`

Connects to a Python/HuggingFace training server:

```typescript
// Prepare training data from conversation logs
const data = await trainingPipeline.prepareTrainingData({
  minConfidence: 0.8,
  intents: ['order_food', 'search_restaurant'],
  limit: 10000
});

// Start training job
const job = await trainingPipeline.startTrainingJob({
  modelType: 'intent_classifier',
  hyperparameters: {
    epochs: 10,
    batchSize: 32,
    learningRate: 0.00002
  }
});

// Monitor progress
const status = await trainingPipeline.getJobStatus(job.jobId);

// Deploy trained model
await trainingPipeline.deployModel(job.jobId, {
  name: 'intent_v2',
  replaceExisting: true
});
```

**Python Training Server**: `training-server/`
- FastAPI-based REST API
- HuggingFace transformers for BERT models
- Background training jobs
- Model evaluation and deployment

---

## 8. Database-Driven Intent Management

**File**: `src/nlu/services/intent-manager.service.ts`

Loads intents from database instead of static config:

```typescript
// Load all intents (cached for 5 minutes)
const intents = await intentManager.loadIntents();

// Classify with database intents
const result = await intentManager.classifyWithDatabaseIntents(userMessage);
// { intent: 'order_food', confidence: 0.95, agentType: 'order' }

// CRUD operations
await intentManager.createIntent({
  name: 'new_intent',
  examples: ['example 1', 'example 2'],
  agentType: 'general'
});

// Bulk import/export
await intentManager.bulkImportIntents(intentsArray);
const exported = await intentManager.exportIntents({ agentType: 'search' });

// Get statistics
const stats = await intentManager.getStats();
// { totalIntents: 45, totalExamples: 1200, byAgentType: { search: 15, order: 20, ... } }
```

---

## Directory Structure

```
backend/
├── src/
│   ├── flow-engine/
│   │   ├── flows/
│   │   │   ├── yaml/                    # NEW: YAML flow definitions
│   │   │   │   ├── greeting.flow.yaml
│   │   │   │   ├── auth.flow.yaml
│   │   │   │   ├── order.flow.yaml
│   │   │   │   ├── search.flow.yaml
│   │   │   │   └── complaints.flow.yaml
│   │   │   └── auth.flow.ts             # NEW: Unified auth flow
│   │   └── services/
│   │       ├── yaml-flow-loader.service.ts      # NEW
│   │       └── flow-version-manager.service.ts  # NEW
│   │
│   ├── conversation/
│   │   └── services/
│   │       └── auth-flow-bridge.service.ts      # NEW
│   │
│   ├── agents/
│   │   └── services/
│   │       └── agent-handoff.service.ts         # NEW
│   │
│   ├── training/
│   │   └── services/
│   │       └── training-pipeline.service.ts     # NEW
│   │
│   └── nlu/
│       └── services/
│           └── intent-manager.service.ts        # NEW
│
└── training-server/                              # NEW: Python training server
    ├── main.py
    ├── training/
    │   ├── trainer.py
    │   ├── predictor.py
    │   └── evaluator.py
    ├── requirements.txt
    ├── Dockerfile
    └── README.md
```

---

## Unit Tests

New test files:
- `yaml-flow-loader.service.spec.ts`
- `flow-version-manager.service.spec.ts`
- `agent-handoff.service.spec.ts`
- `training-pipeline.service.spec.ts`
- `intent-manager.service.spec.ts`

Run tests:
```bash
npm test
```

---

## Migration Guide

### From Legacy Auth Handling

**Before**:
```typescript
// In ConversationService
if (session.authStep) {
  return this.handleAuthStep(session, input);
}
```

**After**:
```typescript
// Use AuthFlowBridgeService (transitional)
if (this.authBridge.shouldUseFlowEngine(session)) {
  return this.authBridge.handleViaFlowEngine(session, input);
}

// Or directly use FlowEngineService
await this.flowEngine.startFlow('auth', sessionId);
```

### From Static Intents

**Before**:
```typescript
const intents = require('./intents.json');
```

**After**:
```typescript
const intents = await intentManager.loadIntents();
```

---

## Environment Variables

New environment variables:

```env
# Training Server
TRAINING_SERVER_URL=http://localhost:8082
TRAINING_DATA_DIR=/data/training
MODEL_STORAGE_DIR=/data/models

# Flow Engine
YAML_FLOWS_DIR=src/flow-engine/flows/yaml
ENABLE_FLOW_AB_TESTING=true

# Intent Manager
INTENT_CACHE_TTL=300000  # 5 minutes in ms
```

---

## Next Steps

1. **Migrate remaining flows to YAML** - Convert all TypeScript flows to YAML format
2. **Set up training server in production** - Deploy the Python training server
3. **Enable A/B testing** - Configure flow version experiments
4. **Monitor handoff metrics** - Track agent handoff success rates
5. **Populate intent database** - Import intents from static files to database

---

## Questions?

Contact the development team for assistance with these architectural changes.
