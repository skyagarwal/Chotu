# 🚀 QUICK START: Flows & Rules System

## 📖 What You Need to Know (5 min read)

### The Big Picture

Your Mangwale AI has **3 core capabilities**:

```
1. RULES ENGINE     → 90% of conversations (fast & simple)
2. FLOWS ENGINE     → 10% of conversations (complex & multi-step)
3. IMAGE AI         → Vision analysis (all modules)
```

### When to Use What?

| Need | Use | Example |
|------|-----|---------|
| Search products | **RULE** | "Show me milk" → Search → Results |
| Check order status | **RULE** | "Where's my order?" → Lookup → Status |
| Handle complaint | **RULE** | "Food is bad [image]" → Image AI → Refund |
| Book parcel (7 steps) | **FLOW** | Ask pickup → delivery → size → pay |
| Complete KYC | **FLOW** | Upload ID → Verify → Selfie → Approve |
| Quality check | **IMAGE AI** | Photo → AI analysis → Pass/Fail |

---

## 🎯 Rules Engine (Quick Reference)

### What is it?

A **Rules Engine** = "If THIS happens, then DO THAT"

No code needed, just JSON configuration.

### Example Rule

```json
{
  "name": "Product Search",
  "module": "ecom",
  "conditions": [
    { "field": "intent", "operator": "equals", "value": "search_product" }
  ],
  "actions": [
    {
      "type": "search",
      "params": { "query": "{{entities.product_type}}" }
    },
    {
      "type": "llm_response",
      "template": "Found {{results.count}} products for {{entities.product_type}}"
    }
  ]
}
```

### How Fast?

- **Execution time**: 50-200ms
- **99% uptime**
- **Scales to millions**

---

## 🌊 Flows Engine (Quick Reference)

### What is it?

A **Flows Engine** = Multi-step conversation with branching

Visual editor for complex workflows.

### Example Flow

```
START
  ↓
[Ask: Where to pickup?]
  ↓
[Validate location]
  ↓
[Ask: Where to deliver?]
  ↓
[If user uploads image]
  ├─ Yes → Call Image AI → Auto-fill dimensions
  └─ No  → Ask dimensions manually
  ↓
[Calculate cost]
  ↓
[Show quote]
  ↓
[Confirm?]
  ├─ Yes → Create order → Payment → Success
  └─ No  → Modify details → Loop back
```

### How Fast?

- **Execution time**: 200-500ms
- **State tracked in Redis**
- **Resumable across sessions**

---

## 🎨 Image AI (Quick Reference)

### What is it?

**Image AI** = AI that can "see" and analyze images

Uses computer vision models (YOLO, ResNet, FaceNet, etc.)

### Capabilities

| Module | Use Cases |
|--------|-----------|
| �� **Food** | Quality check, dish recognition, portion size |
| 🛍️ **Ecom** | Product recognition, visual search, quality inspection |
| 📦 **Parcel** | Dimension estimation, label verification, item count |
| 🚗 **Ride** | Driver verification, vehicle check, uniform compliance |
| 🏥 **Health** | Prescription OCR, medical reports, medicine verification |
| 🏨 **Rooms** | Room quality, cleanliness assessment |
| 💼 **Services** | Before/after comparison, work completion proof |

### Example Usage

```json
{
  "type": "call_image_ai",
  "params": {
    "endpoint": "food/quality-check",
    "image_url": "{{message.image_url}}"
  }
}

// Response:
{
  "quality": {
    "score": 2,  // Out of 10
    "issues": ["burnt", "cold"],
    "confidence": 0.95
  }
}
```

---

## 🏗️ System Architecture (Simple View)

```
┌──────────────────────────────────────────────────────┐
│                UNIFIED DASHBOARD                      │
│                  (Port 3000)                         │
│                                                       │
│  Admin Pages:                                        │
│  - /admin/rules     → Manage rules                   │
│  - /admin/flows     → Manage flows                   │
│  - /admin/vision    → Manage Image AI                │
│                                                       │
└───────────────────┬──────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│              ADMIN BACKEND (Port 8080)               │
│                                                       │
│  Storage:                                            │
│  - Rules (JSON)                                      │
│  - Flows (JSON)                                      │
│  - Analytics (PostgreSQL)                            │
│                                                       │
│  APIs:                                               │
│  - POST /rules      → Create rule                    │
│  - GET  /rules      → List rules                     │
│  - POST /flows      → Create flow                    │
│  - POST /flows/:id/run → Execute flow                │
│                                                       │
└───────────────────┬──────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│              MANGWALE AI (Port 3200)                 │
│                                                       │
│  On Startup:                                         │
│  - Fetch all rules from Admin Backend                │
│  - Cache in Redis                                    │
│                                                       │
│  On Message:                                         │
│  1. NLU Classification (intent + entities)           │
│  2. Match rules OR resume flow                       │
│  3. Execute actions (search, image AI, LLM)          │
│  4. Send response                                    │
│                                                       │
│  Channels:                                           │
│  - WhatsApp, Telegram, Web, Voice                    │
│                                                       │
└───────────────────┬──────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│                IMAGE AI (Port 5500)                  │
│                                                       │
│  Models:                                             │
│  - YOLOv8 (object detection)                         │
│  - ResNet (classification)                           │
│  - FaceNet (face recognition)                        │
│  - CLIP (multimodal search)                          │
│  - OCR (text extraction)                             │
│                                                       │
│  Response time: <200ms                               │
│  GPU: CUDA-enabled                                   │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Implementation Timeline

### Phase 1: Rules Engine (Week 1-2)
- **Admin Backend**: Rules API + validation
- **Mangwale AI**: Rules executor
- **Dashboard**: Rules management UI
- **Testing**: Integration tests

### Phase 2: Image AI (Week 3)
- **Service Setup**: FastAPI + models
- **Integration**: Connect to Mangwale AI
- **Dashboard**: Vision management UI
- **Testing**: Module-specific endpoints

### Phase 3: Flows Engine (Week 4-5)
- **Admin Backend**: Flows API + executor
- **Mangwale AI**: Flow state management
- **Dashboard**: Visual flow editor
- **Testing**: Complex flow scenarios

### Phase 4: Production (Week 6)
- **Optimization**: Performance tuning
- **Monitoring**: Metrics + alerts
- **Documentation**: Admin guides
- **Deployment**: Production rollout

**Total**: ~6 weeks, ~240 hours

---

## 💰 Cost & Resources

### Infrastructure

```
Development:
- CPU: 8 cores
- RAM: 32GB
- GPU: GTX 1660 Ti (6GB) - for Image AI
- Storage: 500GB SSD
- Cost: ~$500/month

Production:
- CPU: 32 cores
- RAM: 128GB
- GPU: A100 (40GB) or 4× RTX 4090
- Storage: 2TB NVMe
- Cost: ~$2,000-3,000/month
```

### Team

```
Phase 1-2 (Rules + Image AI):
- 1 Backend Developer (Full-time)
- 1 Frontend Developer (Part-time)
- 1 DevOps Engineer (Part-time)

Phase 3-4 (Flows + Production):
- 1 Backend Developer (Full-time)
- 1 Frontend Developer (Full-time)
- 1 DevOps Engineer (Full-time)
- 1 QA Engineer (Part-time)
```

---

## 🎯 Success Metrics

### Performance Targets

```
Rules Engine:
✅ Response time: <100ms (P95)
✅ Success rate: >95%
✅ Throughput: >1000 req/sec

Flows Engine:
✅ Response time: <500ms (P95)
✅ Completion rate: >85%
✅ State consistency: >99%

Image AI:
✅ Latency: <200ms
✅ Accuracy: >92%
✅ Throughput: >50 images/sec

Overall:
✅ Availability: >99.9%
✅ User satisfaction: >4.5/5
✅ Cost per conversation: <₹0.50
```

---

## 🚀 Getting Started

### Step 1: Review Documents

1. Read this quick start ✅ (you are here!)
2. Review full architecture:
   ```bash
   cat /home/ubuntu/Devs/mangwale-unified-dashboard/FLOWS_AND_RULES_ARCHITECTURE.md
   ```

### Step 2: Approve Architecture

Decide on:
- ✅ Dual system (Rules + Flows)?
- ✅ Image AI integration?
- ✅ Timeline (6 weeks)?
- ✅ Resource allocation?

### Step 3: Start Building

Once approved, we'll start with:

```bash
# Phase 1: Rules Engine
1. Create rules API in Admin Backend
2. Build rules executor in Mangwale AI
3. Create rules management UI in Dashboard
4. Test with real scenarios

# Estimated: 2 weeks
```

---

## ❓ FAQ

### Q: Why not just use Flows for everything?

**A:** Flows are powerful but:
- Slower (200-500ms vs 50-200ms for Rules)
- More complex to configure
- Overkill for simple cases
- 90% of conversations don't need flows

### Q: Can I mix Rules and Flows?

**A:** Yes! Common pattern:
1. Rule handles initial intent
2. Rule triggers flow for complex conversation
3. Flow uses rules for sub-tasks

### Q: What if a rule fails?

**A:** Rules have fallback actions:
- Retry with different parameters
- Execute fallback action
- Log error and continue
- Route to human agent

### Q: How do I debug flows?

**A:** Dashboard has flow debugger:
- Step-by-step execution trace
- Variable inspection at each step
- Breakpoints for pausing
- Execution replay

### Q: Can vendors customize rules?

**A:** Yes! Multi-tenancy support:
- Global rules (apply to all)
- Tenant rules (apply to tenant)
- Vendor rules (apply to specific vendor)
- Priority system handles conflicts

---

## 📞 Support

Have questions? Need clarification?

1. **Chat with me** - I'm here to help! 💬
2. **Review architecture docs** - All details documented
3. **Ask specific questions** - No question too small

**Let's build something amazing! 🚀**

