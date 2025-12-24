# Scalable AI Architecture for Mangwale AI (Chotu)

## Executive Summary

This document outlines a scalable, user-aware AI architecture inspired by how big companies (OpenAI, Anthropic, Amazon Alexa, Google Assistant, Uber) build their conversational AI systems.

---

## Current State Analysis

### What We Have Now
1. **Flow Engine** - State machine with 20+ executors (good for predictable flows)
2. **Agent System** - 5 specialized agents with function calling
3. **FunctionExecutorService** - 15+ centralized tools
4. **User Profile Enrichment** - MySQL → PostgreSQL sync on login

### Current Limitations
1. Static tool definitions (hardcoded in each agent)
2. No dynamic tool discovery
3. Limited context awareness (user preferences not deeply integrated)
4. No tool composition (tools can't call other tools)
5. Sequential tool execution (no parallelism)
6. Rigid flows that don't adapt to user behavior

---

## The Big Company Approach

### How OpenAI/Anthropic Handle Tools

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER MESSAGE                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT BUILDER                               │
│  - User Profile (preferences, history, dietary, price range)    │
│  - Session Context (current cart, location, last actions)       │
│  - Environmental Context (time of day, weather, events)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LLM (with Tools)                              │
│                                                                  │
│  System: You are Chotu, Mangwale AI assistant. You have tools.  │
│  User Context: {comprehensive user profile}                      │
│  Available Tools: [dynamic list based on context]               │
│                                                                  │
│  The LLM DECIDES what to do, not a state machine!               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                 ┌───────────┴───────────┐
                 │  Tool Call Decision   │
                 └───────────┬───────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│search_food  │      │place_order  │      │get_profile  │
│(user aware) │      │(user aware) │      │(enrichment) │
└─────────────┘      └─────────────┘      └─────────────┘
```

---

## Proposed Architecture: User-Aware Tool Calling

### 1. Rich User Context System

```typescript
interface UserContext {
  // Identity
  userId: number;
  name: string;
  phone: string;
  
  // Preferences (from profile enrichment)
  dietaryType: 'veg' | 'non-veg' | 'eggetarian' | null;
  spiceLevel: 'mild' | 'medium' | 'hot' | null;
  allergies: string[];
  priceSensitivity: 'budget' | 'moderate' | 'premium';
  
  // Behavior Patterns (from order history)
  favoriteCuisines: { name: string; weight: number }[];
  favoriteStores: { id: number; name: string; orderCount: number }[];
  favoriteItems: { id: number; name: string; orderCount: number }[];
  avgOrderValue: number;
  orderFrequency: 'daily' | 'weekly' | 'occasional';
  preferredMealTimes: { breakfast: number; lunch: number; dinner: number };
  
  // Session Context
  currentLocation?: { lat: number; lng: number };
  currentCart: CartItem[];
  lastActions: Action[];
  activeFlow?: string;
  
  // Real-time Signals
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'lateNight';
  dayOfWeek: string;
  isWeekend: boolean;
  isHoliday: boolean;
}
```

### 2. Context-Aware System Prompt

```typescript
function buildSystemPrompt(userContext: UserContext): string {
  return `You are Chotu, Mangwale's friendly AI assistant in Nashik.

## About the User
- Name: ${userContext.name || 'Guest'}
- Dietary: ${userContext.dietaryType || 'Unknown'} (${userContext.allergies?.length ? `Allergies: ${userContext.allergies.join(', ')}` : 'No allergies'})
- Spice: ${userContext.spiceLevel || 'Not specified'}
- Budget: ${userContext.priceSensitivity} (Avg order: ₹${userContext.avgOrderValue})
- Favorites: ${userContext.favoriteCuisines?.slice(0, 3).map(c => c.name).join(', ') || 'None yet'}
- Top Stores: ${userContext.favoriteStores?.slice(0, 2).map(s => s.name).join(', ') || 'None yet'}

## Context
- Time: ${userContext.timeOfDay} ${userContext.isWeekend ? '(Weekend)' : '(Weekday)'}
- Cart: ${userContext.currentCart.length} items (₹${userContext.currentCart.reduce((s, i) => s + i.price, 0)})

## Your Personality
- Friendly, helpful, uses light Hinglish
- Proactively suggest based on user's history
- Respect dietary restrictions ALWAYS
- Be concise but warm

## Tool Usage
- Use tools when you need data
- You can call multiple tools in one turn
- THINK about what the user wants before acting
- If user says "usual", look at their favorites
`;
}
```

### 3. Dynamic Tool Registry

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  requiresAuth: boolean;
  category: 'search' | 'order' | 'profile' | 'support' | 'info';
  contextRequirements?: string[]; // e.g., ['location', 'authenticated']
}

class DynamicToolRegistry {
  private tools: Map<string, Tool> = new Map();
  
  // Get tools available for current context
  getAvailableTools(context: UserContext): Tool[] {
    return Array.from(this.tools.values()).filter(tool => {
      // Check if tool requirements are met
      if (tool.requiresAuth && !context.userId) return false;
      if (tool.contextRequirements?.includes('location') && !context.currentLocation) {
        return false;
      }
      return true;
    });
  }
  
  // Format for LLM API
  formatForLLM(tools: Tool[]): FunctionDefinition[] {
    return tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }
}
```

### 4. Proposed Tools for Chotu

```typescript
const CHOTU_TOOLS = [
  // Search & Discovery
  {
    name: 'search_food',
    description: 'Search for food items. Automatically filters by user dietary preferences.',
    parameters: {
      query: 'string - What to search for',
      cuisine: 'string? - Specific cuisine filter',
      priceRange: '{ min: number, max: number }? - Price filter',
      sortBy: 'relevance | price | rating | distance',
    },
    enhancedBehavior: `
      - If user is veg, filter out non-veg items
      - Boost user's favorite stores/items in results
      - Apply price sensitivity to sorting
    `,
  },
  
  {
    name: 'get_recommendations',
    description: 'Get personalized recommendations based on user history and current context.',
    parameters: {
      type: 'food | restaurant | reorder',
      limit: 'number',
    },
    enhancedBehavior: `
      - Analyze order history for patterns
      - Consider time of day (breakfast items in morning)
      - Surface items user orders frequently
    `,
  },
  
  {
    name: 'reorder_previous',
    description: 'Reorder items from a previous order.',
    parameters: {
      orderId: 'number? - Specific order to reorder, or most recent',
    },
  },
  
  // Cart Management
  {
    name: 'add_to_cart',
    description: 'Add an item to cart.',
    parameters: {
      itemId: 'number',
      quantity: 'number',
      customizations: 'object?',
    },
  },
  
  {
    name: 'modify_cart',
    description: 'Modify or remove items from cart.',
    parameters: {
      action: 'update_quantity | remove | clear',
      itemId: 'number?',
      quantity: 'number?',
    },
  },
  
  // Order Management
  {
    name: 'place_order',
    description: 'Place the current cart as an order.',
    parameters: {
      deliveryAddressId: 'number? - Use saved address, or current location',
      paymentMethod: 'online | cod',
      instructions: 'string?',
    },
  },
  
  {
    name: 'track_order',
    description: 'Get real-time status of an order.',
    parameters: {
      orderId: 'number? - Defaults to most recent',
    },
  },
  
  // Profile & Preferences
  {
    name: 'update_preferences',
    description: 'Update user preferences.',
    parameters: {
      dietary: 'veg | non-veg | eggetarian?',
      spiceLevel: 'mild | medium | hot?',
      allergies: 'string[]?',
    },
  },
  
  {
    name: 'get_addresses',
    description: 'Get user saved addresses.',
    parameters: {},
  },
  
  // Parcel Delivery
  {
    name: 'book_parcel',
    description: 'Book a parcel delivery.',
    parameters: {
      pickupLocation: 'object - lat/lng or address',
      deliveryLocation: 'object - lat/lng or address',
      recipientName: 'string',
      recipientPhone: 'string',
      vehicleType: 'bike | auto | mini',
    },
  },
  
  // Support
  {
    name: 'report_issue',
    description: 'Report an issue with an order.',
    parameters: {
      orderId: 'number',
      issueType: 'missing_item | wrong_item | quality | late_delivery | other',
      description: 'string',
      image: 'string? - Base64 image for proof',
    },
  },
];
```

### 5. The "Chotu Brain" - Main Processing Loop

```typescript
async function processMessage(
  message: string,
  sessionId: string,
): Promise<Response> {
  // 1. Build rich context
  const userContext = await buildUserContext(sessionId);
  
  // 2. Get available tools for this context
  const tools = toolRegistry.getAvailableTools(userContext);
  
  // 3. Build the prompt
  const systemPrompt = buildSystemPrompt(userContext);
  
  // 4. Call LLM with tools
  const response = await llm.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ],
    tools: toolRegistry.formatForLLM(tools),
    tool_choice: 'auto', // Let LLM decide
  });
  
  // 5. Process tool calls (if any)
  if (response.tool_calls) {
    const results = await executeToolsParallel(response.tool_calls, userContext);
    
    // 6. Continue conversation with tool results
    return continueWithToolResults(results, userContext);
  }
  
  // 7. Return direct response
  return formatResponse(response.content);
}
```

### 6. Parallel Tool Execution

```typescript
async function executeToolsParallel(
  toolCalls: ToolCall[],
  context: UserContext,
): Promise<ToolResult[]> {
  // Group independent tools for parallel execution
  const independentTools = toolCalls.filter(t => !hasDependencies(t, toolCalls));
  const dependentTools = toolCalls.filter(t => hasDependencies(t, toolCalls));
  
  // Execute independent tools in parallel
  const results = await Promise.all(
    independentTools.map(tool => executeToolWithContext(tool, context))
  );
  
  // Execute dependent tools sequentially
  for (const tool of dependentTools) {
    const result = await executeToolWithContext(tool, context);
    results.push(result);
  }
  
  return results;
}
```

---

## User Profile Data Points to Collect

### From Order History (MySQL → PostgreSQL)
1. **Order Patterns**
   - Order frequency (daily/weekly/occasional)
   - Average order value
   - Preferred order times (breakfast/lunch/dinner)
   - Order days (weekday vs weekend)

2. **Food Preferences**
   - Top cuisines (weighted by recency)
   - Favorite stores (with loyalty score)
   - Favorite items (reorder patterns)
   - Customization patterns (extra cheese, less spicy)

3. **Behavioral Signals**
   - Response to recommendations
   - Cart abandonment rate
   - Time to order (fast/deliberate)

### From Conversations (Real-time)
1. **Explicit Preferences**
   - Dietary restrictions (veg/non-veg)
   - Allergies
   - Spice tolerance

2. **Implicit Signals**
   - Language preference (English/Hindi/Hinglish)
   - Tone matching
   - Question patterns

### Environmental Signals
1. **Location-based**
   - Home vs office vs new location
   - Typical order radius

2. **Time-based**
   - Morning routine vs evening treats
   - Weekend patterns

---

## Implementation Roadmap

### Phase 1: User Context Enhancement (Week 1)
- [ ] Expand UserProfileEnrichmentService with all data points
- [ ] Create real-time context builder
- [ ] Store user preferences in PostgreSQL

### Phase 2: Tool Refactoring (Week 2)
- [ ] Convert static tools to dynamic registry
- [ ] Add context-awareness to each tool
- [ ] Implement parallel execution

### Phase 3: Chotu Brain (Week 3)
- [ ] Create new ChatBrainService with full context
- [ ] Replace rigid flows with LLM-driven decisions
- [ ] Keep flows as fallback for complex transactions

### Phase 4: Personalization (Week 4)
- [ ] Implement recommendation engine
- [ ] Add "usual order" detection
- [ ] Create proactive suggestions

---

## Key Differences from Current Architecture

| Aspect | Current | Proposed |
|--------|---------|----------|
| Decision Making | State machine (flow engine) | LLM decides with tools |
| Context | Minimal (session only) | Rich (profile + history + signals) |
| Tools | Static definitions | Dynamic, context-aware |
| Execution | Sequential | Parallel where possible |
| User Awareness | Basic | Deep personalization |
| Adaptability | Rigid flows | Flexible, learns from user |

---

## Example Conversations

### Before (Current)
```
User: "I'm hungry"
Bot: "What would you like to order? Please select from the menu or tell me what you're looking for."
```

### After (Proposed)
```
User: "I'm hungry"
Chotu: "Hey Akshay! 🍕 Craving pizza again? I noticed you loved the Cheese Burst from Star Boys last week. 
Should I add it to your cart, or feeling adventurous today? 

Quick picks for you:
1. Your usual - Cheese Burst Pizza (₹180)
2. Today's special - Paneer Tikka from your fav Ratanji (₹150)
3. Something new?"
```

---

## Conclusion

Moving from rigid state machines to LLM-driven tool calling with rich user context is how modern AI assistants become truly helpful. The key is:

1. **Know the user deeply** - Collect and use every data point
2. **Let LLM decide** - Trust the model with good tools and context
3. **Be proactive** - Anticipate needs, don't just respond
4. **Learn continuously** - Update preferences from every interaction

This is how Alexa, Siri, and ChatGPT Plus with plugins work at scale. The flow engine remains valuable for complex transactions that need strict ordering, but daily conversations should be AI-driven.
