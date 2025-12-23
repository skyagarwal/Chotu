# 🖥️ Mangwale AI System Audit: Jupiter + Mercury

**Date:** December 18, 2024 (UPDATED)  
**Purpose:** Resource audit, identify gaps, optimize sharing between servers

---

## 🔷 CORRECTED Server Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            JUPITER (Brain)                              │
│                         192.168.0.xxx (This Server)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  RAM: 32GB | CPU: Ryzen 5 5500 (6c/12t) | GPU: RTX 3060 12GB           │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  AI Services    │  │  Flow Engine    │  │  Data Layer     │         │
│  │  - vLLM (11GB)  │  │  - YAML Flows   │  │  - PostgreSQL   │         │
│  │    GPU ████████ │  │  - Executors    │  │  - Redis        │         │
│  │  - NLU (2.6GB)  │  │  - Agents       │  │  - OpenSearch   │         │
│  │  - Search API   │  │                 │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  GPU: [██████████████████████████████░░] 11.2/12 GB (93% used by vLLM) │
│  RAM: [████████████████████░░░░░░░░░░░░] 19/32 GB (60% used)           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            MERCURY (Voice)                              │
│                           192.168.0.151                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  RAM: 16GB | CPU: Ryzen 5 5500 (6c/12t) | GPU: RTX 3060 12GB           │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Voice Services │  │  Exotel Stack   │  │  GPU (UNDERUSED)│         │
│  │  - ASR (454MB)  │  │  - IVR Service  │  │  - Used: 1.3GB  │         │
│  │  - TTS (870MB)  │  │  - Backend      │  │  - FREE: 10.7GB │         │
│  │  - Orchestrator │  │  - Admin UI     │  │  - 89% IDLE!    │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  GPU: [███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 1.3/12 GB (11% used)          │
│  RAM: [█████████░░░░░░░░░░░░░░░░░░░░░░░] 4.6/16 GB (30% used)          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        COMBINED RESOURCES                               │
├─────────────────────────────────────────────────────────────────────────┤
│  TOTAL GPU VRAM:  24 GB (2x RTX 3060)                                  │
│  TOTAL RAM:       48 GB (32 + 16)                                      │
│  TOTAL CPU:       24 threads (12 + 12)                                 │
│  Network:         100 Mbps LAN (0.4ms latency)                         │
│  ⚠️  NO NVLINK/INFINIBAND - Cannot combine GPUs directly               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 ACTUAL Resource Usage

### Jupiter (Brain Server)
| Resource | Used | Total | % |
|----------|------|-------|---|
| **GPU VRAM** | 11.2 GB | 12 GB | **93%** (vLLM Qwen2.5-7B) |
| **RAM** | 19 GB | 32 GB | 60% |
| **CPU** | Low | 12 threads | ~10% |

| Container | RAM | GPU | Purpose |
|-----------|-----|-----|---------|
| mangwale-ai-vllm | 4.5 GB | **11.2 GB** | Qwen2.5-7B-AWQ (GPU) |
| mangwale-ai-nlu | 2.6 GB | - | IndicBERT NLU |
| search-opensearch | 2.7 GB | - | Product Search |
| Others | ~9 GB | - | PostgreSQL, Redis, etc. |

### Mercury (Voice Server)
| Resource | Used | Total | % |
|----------|------|-------|---|
| **GPU VRAM** | 1.3 GB | 12 GB | **11%** ⚠️ UNDERUTILIZED |
| **RAM** | 4.6 GB | 16 GB | 30% |
| **CPU** | Low | 12 threads | ~5% |

| Container | RAM | GPU | Purpose |
|-----------|-----|-----|---------|
| mangwale-tts | 933 MB | 870 MB | XTTS Text-to-Speech |
| mangwale-asr | 808 MB | 454 MB | Whisper ASR |
| mangwale-orchestrator | 310 MB | - | Voice Flow |
| exotel-service | 32 MB | - | IVR Telephony |

---

## 🎯 Admin Dashboard Audit (72 Pages)

### ✅ Fully Implemented

| Category | Pages | Status |
|----------|-------|--------|
| **NLU & Training** | /nlu, /intents, /training/*, /nlu-testing | ✅ Complete |
| **Flow Management** | /flows, /flows/editor, /flow-analytics | ✅ Complete |
| **LLM Management** | /llm-providers, /llm-models, /llm-failover, /llm-chat, /llm-cost-tracking | ✅ Complete |
| **Voice** | /voice/xtts, /voice/orpheus | ✅ Complete |
| **Vision** | /vision/* (15 pages: menu-ocr, food-quality, cameras, etc.) | ✅ Complete |
| **Analytics** | /analytics, /search-analytics, /intent-analytics, /llm-analytics | ✅ Complete |
| **Settings** | /settings, /api-keys, /webhooks, /secrets | ✅ Complete |
| **Agents** | /agents, /agent-testing, /agent-settings | ✅ Complete |
| **Infrastructure** | /docker, /monitoring, /vllm-settings | ✅ Complete |

### ⚠️ Missing Pages Needed

| Feature | Current Status | Priority | Action Required |
|---------|---------------|----------|-----------------|
| **RAG/Documents** | ❌ No UI | HIGH | Create /admin/rag/documents page |
| **User Profiles** | ❌ No UI | HIGH | Create /admin/user-profiles page |
| **User Insights** | ❌ No UI | MEDIUM | Create /admin/user-insights page |
| **Conversation Memory** | ❌ No UI | MEDIUM | Create /admin/conversation-memory page |
| **Mercury Services** | ❌ No UI | LOW | Add Mercury status to /monitoring |

---

## 👤 User Profiling System Audit

### ✅ Backend Implementation (Complete)
```
Database Tables:
├── user_profiles        → Explicit preferences
├── user_insights        → AI-extracted insights
├── user_item_interactions → Item behavior tracking
├── user_search_patterns → Search history
├── conversation_insights → Real-time extraction
└── conversation_memory  → Session context
```

### Profile Fields Available
| Category | Fields | Source |
|----------|--------|--------|
| **Dietary** | dietary_type, dietary_restrictions[], allergies[], disliked_ingredients[] | Conversation |
| **Food Taste** | favorite_cuisines (jsonb), spice_preference | Conversation, Orders |
| **Shopping** | avg_order_value, order_frequency, price_sensitivity | Order History |
| **Time** | preferred_meal_times (jsonb) | Order Times |
| **Personality** | communication_tone, personality_traits (jsonb) | Conversation Analysis |
| **Completeness** | profile_completeness (0-100%) | Calculated |

### ⚠️ Issues Found
1. **No Admin UI** - Cannot view/edit user profiles in dashboard
2. **Profile building triggers** - Need to verify when `updateProfileFromConversation()` is called
3. **Insight quality** - Rule-based extraction is basic, LLM analysis available but costly

### 🔧 Recommended Actions
1. Add `/admin/user-profiles` page with search/filter/edit capabilities
2. Add profile insights to conversation view
3. Add profile completeness metrics to analytics

---

## 📚 RAG System Audit

### ✅ Backend Implementation
- **RagContextService** - Retrieves from OpenSearch, formats for LLM
- **OpenSearch indexes** - Products are indexed
- **Search endpoints** - `/search/semantic/food`, `/v2/search/items`

### ⚠️ Missing Features
| Feature | Status | Action |
|---------|--------|--------|
| Document Upload UI | ❌ Missing | Create upload page |
| Custom Knowledge Base | ❌ Missing | Add document ingestion endpoint |
| FAQ Management | ❌ Missing | Create FAQ CRUD interface |
| Vector Embeddings for Docs | ⚠️ Only products | Extend to custom documents |

### Current RAG Flow
```
User Query → OpenSearch → Product Results → Format as Context → LLM Prompt
```

### Needed RAG Flow
```
User Query → [OpenSearch Products + Document Vectors + FAQ Base] → Combined Context → LLM
```

---

## � GPU COMBINATION STRATEGIES

### ❌ What WON'T Work
| Method | Why Not |
|--------|---------|
| **NVLink** | Requires same-system GPUs + NVLink bridge |
| **SLI** | Not supported for compute, only gaming |
| **Direct GPU Pooling** | GPUs in different machines can't share VRAM |
| **CUDA MPS across network** | Not supported |

### ✅ What WILL Work: Distributed Inference

#### Option 1: Model Parallelism via vLLM Multi-Node (BEST for bigger models)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Run a SINGLE larger model across BOTH GPUs using Ray + vLLM            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Jupiter GPU (12GB)          Mercury GPU (12GB)                        │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │ Model Shard 1   │◀──Ray──▶│ Model Shard 2   │                       │
│  │ (Layers 0-15)   │  TCP/IP │ (Layers 16-31)  │                       │
│  └─────────────────┘         └─────────────────┘                       │
│                                                                         │
│  COMBINED: ~22GB usable VRAM for model                                 │
│  Can run: Qwen2.5-32B, Llama3-70B-AWQ, Mixtral-8x7B                    │
│                                                                         │
│  ⚠️ Limitation: 100Mbps network = ~10MB/s = SLOW tensor transfers      │
│  Recommendation: Upgrade to 1Gbps or 10Gbps network first              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
```bash
# On Jupiter (head node)
ray start --head --port=6379

# On Mercury (worker node)  
ray start --address='jupiter-ip:6379'

# Run vLLM with tensor parallelism
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-32B-Instruct-AWQ \
  --tensor-parallel-size 2 \
  --pipeline-parallel-size 1
```

**Pros:** Can run 32B+ models  
**Cons:** Network bottleneck, complex setup, latency increase

---

#### Option 2: Load Balancing (BEST for current network)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Run SAME model on BOTH GPUs, load balance requests                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Jupiter vLLM (Qwen 7B)      Mercury vLLM (Qwen 7B)                    │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │ Full Model      │         │ Full Model      │                       │
│  │ Port: 8002      │         │ Port: 8002      │                       │
│  └────────┬────────┘         └────────┬────────┘                       │
│           │                           │                                 │
│           └─────────┬─────────────────┘                                │
│                     ▼                                                   │
│              ┌──────────────┐                                          │
│              │ Load Balancer │ (Nginx/HAProxy)                         │
│              │ Round Robin   │                                          │
│              └──────────────┘                                          │
│                                                                         │
│  Result: 2x throughput, same latency, redundancy                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
```bash
# Deploy vLLM on Mercury (currently empty)
ssh ubuntu@192.168.0.151
docker run -d --gpus all \
  -v /models:/models \
  -p 8002:8002 \
  vllm/vllm-openai:latest \
  --model Qwen/Qwen2.5-7B-Instruct-AWQ \
  --quantization awq \
  --max-model-len 4096 \
  --port 8002

# Update Jupiter with load balancer
# In nginx.conf:
upstream vllm_cluster {
    server localhost:8002;
    server 192.168.0.151:8002;
}
```

**Pros:** Simple, doubles throughput, fault-tolerant  
**Cons:** Same model size limit (7B)

---

#### Option 3: Specialized Model Distribution (RECOMMENDED)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Different specialized models on each GPU                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  JUPITER GPU (12GB)              MERCURY GPU (12GB)                    │
│  ┌─────────────────────┐         ┌─────────────────────┐               │
│  │ MAIN LLM            │         │ SPECIALIZED         │               │
│  │ Qwen2.5-7B-AWQ      │         │ + ASR (Whisper) ✓   │               │
│  │ - General chat      │         │ + TTS (XTTS) ✓      │               │
│  │ - Intent routing    │         │ + Code model?       │               │
│  │ - Flow decisions    │         │ + Embedding model   │               │
│  │ [11GB used]         │         │ [1.3GB + 6GB free]  │               │
│  └─────────────────────┘         └─────────────────────┘               │
│                                                                         │
│  Mercury free space: ~6-8GB - can add:                                 │
│  • DeepSeek-Coder-7B for code generation                               │
│  • E5-Large embeddings (2GB) for RAG                                   │
│  • Specialized food/order model                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 RECOMMENDED OPTIMIZATION PLAN

### Phase 1: Quick Wins (No hardware changes)

1. **Add GPU Embeddings on Mercury** (+2GB VRAM)
```bash
# Move embedding service from CPU to Mercury GPU
# Current: search-embedding-service on Jupiter (CPU)
# Target: GPU-accelerated embeddings on Mercury
```

2. **Optimize Jupiter vLLM** (save ~2GB VRAM)
```bash
# Reduce max-model-len from 4096 to 2048 (sufficient for most tasks)
# Current: 11.2GB used
# Target: ~9GB used, freeing space for NLU on GPU
```

### Phase 2: Load Balancing (Medium effort)

3. **Deploy second vLLM on Mercury**
```bash
# Use 6GB of Mercury's free VRAM for second Qwen instance
# Result: 2x LLM throughput
```

4. **Add Nginx load balancer**
```bash
# Balance requests between Jupiter and Mercury vLLM
# Automatic failover if one goes down
```

### Phase 3: Network Upgrade (Future)

5. **Upgrade to 1Gbps or 10Gbps LAN**
```
Current: 100Mbps (~12MB/s max)
Target: 1Gbps (~125MB/s) or 10Gbps (1.25GB/s)

After network upgrade, can do:
- Tensor parallelism across both GPUs
- Run 32B+ models split across both machines
```

---

## 📊 RESOURCE OPTIMIZATION SUMMARY

| Current | After Phase 1 | After Phase 2 |
|---------|---------------|---------------|
| Jupiter GPU: 93% | Jupiter GPU: 80% | Both GPUs: 70% |
| Mercury GPU: 11% | Mercury GPU: 30% | Both GPUs: 70% |
| LLM Throughput: 1x | LLM Throughput: 1x | LLM Throughput: 2x |
| Embeddings: CPU | Embeddings: GPU | Embeddings: GPU |

### Quick Action Items:
- [ ] **Now:** Add embedding model to Mercury GPU
- [ ] **This week:** Deploy load-balanced vLLM on Mercury
- [ ] **This month:** Upgrade network to 1Gbps
- [ ] **Future:** Implement Ray-based model parallelism for 32B models

---

## 📋 Recommended Actions

### HIGH Priority
1. **Move vLLM to Mercury GPU** - Major performance boost, GPU is 89% unused
2. **Create User Profiles Admin Page** - Profiles are built but can't be viewed
3. **Create RAG/Documents Admin Page** - Support knowledge base uploads

### MEDIUM Priority
4. **Add profile insights to conversation view** - Show user context during support
5. **Add Mercury status to monitoring page** - Single pane of glass
6. **Upgrade to Qwen2.5-14B-AWQ** - Better reasoning with available VRAM

### LOW Priority
7. **GPU-accelerated embeddings** - Move embedding service to Mercury
8. **Move NLU to Mercury** - If Jupiter RAM becomes constrained

---

## 🔗 SSH Access Configured

```bash
# Passwordless SSH from Jupiter to Mercury
ssh ubuntu@192.168.0.151

# Quick GPU check
ssh ubuntu@192.168.0.151 "nvidia-smi"

# Quick container check
ssh ubuntu@192.168.0.151 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

---

## 📝 Notes

- Mercury GPU (RTX 3060) has **10.7GB free VRAM** - significant opportunity
- Jupiter running vLLM on CPU is wasteful when GPU is available
- User profiling backend is solid but needs admin UI
- RAG works for products but needs document upload capability
- No duplication between servers - clean separation currently
