# LLM vs Flows: Architecture Decision Guide

**Date:** December 23, 2025  
**Decision:** HYBRID APPROACH (Recommended)

---

## Executive Summary

For scalable conversational AI like Mangwale (Chotu), use **Flows for transactional tasks** and **LLM with tools for discovery/assistance**.

---

## The Question

> "For everything else we would need flows or can we make boundaries for LLM or give LLM tools?"

---

## How Big Companies Do It

### Amazon Alexa / Google Assistant

| Task Type | Approach |
|-----------|----------|
| **Transactional** (ordering, payments) | Strict flows/state machines |
| **Informational** (queries, discovery) | LLM with guardrails |
| **Skill Routing** | Intent classification → Skill |

### Uber / DoorDash

| Task Type | Approach |
|-----------|----------|
| **Order Placement** | Step-by-step flows (guaranteed data collection) |
| **Customer Support** | LLM with human escalation |
| **Discovery** ("what should I eat?") | LLM with recommendations |

### OpenAI / Anthropic API Design

| Task Type | Approach |
|-----------|----------|
| **Structured Output** | JSON mode / function calling |
| **Free-form Chat** | LLM with system prompt boundaries |
| **Tool Use** | LLM decides when to call tools |

---

## Recommended Hybrid Architecture for Mangwale

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER MESSAGE                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTENT CLASSIFICATION                          │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │Transactional│  │ Discovery   │  │ Off-Topic/Harmful       │  │
│  │ (order, pay)│  │ (recommend) │  │ (politics, abuse)       │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│   FLOW ENGINE   │ │   LLM + TOOLS   │ │   CONTENT FILTER        │
│                 │ │                 │ │                         │
│ Strict states:  │ │ Free-form but   │ │ Block and redirect:     │
│ - Location      │ │ bounded:        │ │ - Profanity             │
│ - Phone verify  │ │ - Search items  │ │ - Adult content         │
│ - Address       │ │ - Recommendations│ │ - Violence              │
│ - Payment       │ │ - Store info    │ │ - Off-topic             │
│ - Confirmation  │ │ - Price compare │ │                         │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
```

---

## When to Use Flows vs LLM

### ✅ USE FLOWS (State Machine) When:

| Scenario | Why Flows? |
|----------|-----------|
| **Money involved** | No room for LLM hallucination |
| **Legal requirements** | OTP, terms acceptance |
| **Multi-step data collection** | Location → Address → Recipient |
| **API calls with strict order** | Place order → Payment → Confirmation |
| **Retry logic needed** | OTP retry with counter |

**Examples:**
- Food ordering checkout
- Parcel booking
- OTP verification
- Address management
- Payment processing

### ✅ USE LLM with Tools When:

| Scenario | Why LLM? |
|----------|---------|
| **Discovery/Exploration** | "What's good to eat?" |
| **Natural conversation** | "Kaise ho Chotu?" |
| **Fuzzy input** | "Send to my friend Nilesh" |
| **Recommendations** | "Budget mein kya milega?" |
| **Context-aware responses** | Personalization based on history |

**Examples:**
- Food recommendations
- Store discovery
- Price comparisons
- FAQ/Help
- Chitchat with personality

---

## LLM Tool Design

### Current Tools (Enhanced)

```typescript
const TOOLS = [
  // Discovery Tools
  {
    name: 'search_food',
    description: 'Search for food items matching user query',
    requiresAuth: false,
  },
  {
    name: 'get_recommendations',
    description: 'Get personalized food recommendations',
    requiresAuth: false, // But personalization needs user context
  },
  {
    name: 'compare_prices',
    description: 'Compare our prices with Zomato/Swiggy',
    requiresAuth: false,
  },
  
  // Transactional Tools (trigger flows)
  {
    name: 'start_order_flow',
    description: 'Start the food ordering process',
    requiresAuth: true,
    triggersFlow: 'food-order',
  },
  {
    name: 'start_parcel_flow',
    description: 'Start the parcel booking process',
    requiresAuth: true,
    triggersFlow: 'parcel-delivery',
  },
];
```

### Tool Boundaries

```typescript
// System prompt for LLM with tools
const SYSTEM_PROMPT = `
You are Mangwale AI with access to tools.

RULES FOR TOOL USE:
1. For DISCOVERY (searching, recommendations): Use tools freely
2. For TRANSACTIONS (ordering, payments): ALWAYS trigger the appropriate flow
3. Never bypass flows for money-related operations
4. Never hallucinate prices - always call tools

TOOL SELECTION:
- "What biryani is good?" → search_food + get_recommendations
- "Order biryani" → start_order_flow (triggers flow)
- "Track my order" → start_tracking_flow
`;
```

---

## Scalability Considerations

### 1. User Context Pipeline

```
User Speaks → NLU → Context Builder → LLM/Flow Decision
                           ↓
              ┌────────────────────────┐
              │ User Context Includes: │
              │ - Order history        │
              │ - Dietary preferences  │
              │ - Price sensitivity    │
              │ - Favorite stores      │
              │ - Current cart         │
              │ - Location             │
              └────────────────────────┘
```

### 2. Fast User Recognition

```typescript
// Quick context loading (< 100ms target)
async getQuickContext(phone: string) {
  // Redis cache check first
  const cached = await redis.get(`user:${phone}`);
  if (cached) return JSON.parse(cached);
  
  // PostgreSQL enriched profile
  return await db.userProfiles.findUnique({ where: { phone } });
}
```

### 3. Dynamic Tool Registration

```typescript
// Tools can be added without code changes
const tools = await toolRegistry.getToolsForContext({
  module: 'food',
  isAuthenticated: true,
  userType: 'premium',
});
```

---

## Implementation Roadmap

### Phase 1: Current (Completed ✅)
- 21 flows (13 TypeScript + 8 YAML)
- Basic LLM fallback for chitchat
- Content filtering for safety

### Phase 2: Enhanced LLM Tools (Next)
- [ ] Add `search_food` tool with LLM invocation
- [ ] Add `get_recommendations` tool
- [ ] Add `compare_prices` tool
- [ ] LLM decides tool vs flow

### Phase 3: Adaptive Flows (Future)
- [ ] Flows that adapt based on user context
- [ ] Skip steps for repeat customers
- [ ] Smart defaults from history

---

## Decision Matrix

| Message Type | Intent Confidence | Action |
|--------------|-------------------|--------|
| "Order biryani" | High (>0.8) | Start Food Order Flow |
| "Send parcel" | High (>0.8) | Start Parcel Flow |
| "What's good?" | Low (<0.6) | LLM with search tools |
| "Hi Chotu" | Greeting | LLM chitchat (bounded) |
| "Modi is great" | Off-topic | Content filter block |
| "Track order" | High | Start Tracking Flow |

---

## Summary

**Flows** = Guaranteed execution, no hallucination, legal compliance  
**LLM + Tools** = Natural discovery, personalization, flexibility  
**Content Filter** = Safety guardrails for public deployment  

The hybrid approach gives you the **reliability of flows** for critical paths and the **intelligence of LLMs** for user experience.

---

*Architecture decision documented December 23, 2025*
