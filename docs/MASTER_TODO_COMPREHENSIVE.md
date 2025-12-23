# 📋 MANGWALE AI - MASTER TODO LIST

**Created:** December 18, 2025  
**Last Updated:** December 18, 2025  
**Status:** Active Development

---

## 🎯 PRIORITY LEGEND
- 🔴 **CRITICAL** - Blocking production/users
- 🟠 **HIGH** - Important for functionality
- 🟡 **MEDIUM** - Improves experience
- 🟢 **LOW** - Nice to have
- ✅ **DONE** - Completed
- 🔄 **IN PROGRESS** - Currently working
- ⏸️ **DEFERRED** - Postponed for later

---

## 📊 SUMMARY DASHBOARD

| Category | Total | Done | In Progress | Pending |
|----------|-------|------|-------------|---------|
| Critical Issues | 3 | 1 | 0 | 2 |
| Admin Dashboard | 5 | 0 | 0 | 5 |
| User Profiling | 4 | 1 | 0 | 3 |
| RAG & Knowledge | 3 | 0 | 0 | 3 |
| Voice (Mercury) | 4 | 0 | 0 | 4 |
| Infrastructure | 5 | 0 | 0 | 5 |
| Testing & QA | 4 | 0 | 0 | 4 |
| **TOTAL** | **28** | **2** | **0** | **26** |

---

## 🔴 SECTION 1: CRITICAL ISSUES

### 1.1 User Profile Not Building ✅ FIXED
- [x] **Investigated why only 1 user profile exists** ✅
  - Root cause: `updateProfileFromConversation()` was NEVER called
  - Found 455 unique sessions but only 1 profile
  - Fix: Added profile building trigger to flow engine

### 1.2 Profile Building Triggers ✅ FIXED  
- [x] **Add profile update trigger to conversation flow** ✅
  - Added `triggerProfileBuilding()` to `flow-engine.service.ts`
  - Triggers when any flow completes
  - Added `getOrCreateProfileByPhone()` for guest handling
  - Files modified:
    - `backend/src/flow-engine/flow-engine.service.ts`
    - `backend/src/personalization/user-profiling.service.ts`

### 1.3 Insight Extraction
- [ ] **Verify real-time insight extraction** 🔴
  - 313 insights exist - check if being captured correctly
  - File: `backend/src/personalization/conversation-analyzer.service.ts`

---

## 📱 SECTION 2: ADMIN DASHBOARD

### 2.1 Missing Pages (HIGH PRIORITY)
- [x] **Create /admin/user-profiles page** ✅ DONE
  - List all user profiles with search/filter
  - View individual profile details
  - Edit preferences manually
  - Show profile completeness score
  - Path: `frontend/src/app/admin/user-profiles/page.tsx`

- [x] **Create /admin/rag-documents page** ✅ DONE
  - Upload documents (PDF, TXT, MD)
  - List uploaded documents
  - Delete/manage documents
  - View document chunks
  - Path: `frontend/src/app/admin/rag-documents/page.tsx`

- [ ] **Create /admin/conversation-memory page** 🟡
  - View what bot remembers per user
  - Search by phone/user ID
  - Clear memory option
  - Path: `frontend/src/app/admin/conversation-memory/page.tsx`

### 2.2 Enhance Existing Pages
- [ ] **Add Mercury status to /admin/monitoring** 🟡
  - Show ASR/TTS/Orchestrator health
  - GPU usage from Mercury
  - Path: `frontend/src/app/admin/monitoring/page.tsx`

- [ ] **Add user context to conversation view** 🟢
  - Show user profile alongside conversations
  - Display extracted insights
  - Path: `frontend/src/app/admin/analytics/page.tsx`

---

## 👤 SECTION 3: USER PROFILING SYSTEM

### 3.1 Backend Fixes
- [x] **Fix profile creation on first interaction** ✅ DONE
  - Added `triggerProfileBuilding()` to flow engine
  - Creates profile when flow completes
  - Handles both guest and registered users
  - File: `backend/src/flow-engine/flow-engine.service.ts`

- [ ] **Add periodic profile analysis job** 🟡
  - Cron job to analyze conversations without profiles
  - Batch process historical data
  - File: `backend/src/personalization/profile-builder.job.ts` (create)

### 3.2 Profile Enhancement
- [ ] **Add order history to profile** 🟡
  - Track favorite items from orders
  - Calculate avg order value
  - File: `backend/src/personalization/user-profiling.service.ts`

- [ ] **Implement profile-based search boosting** 🟢
  - Use profile to boost relevant results
  - File: `backend/src/search/services/personalized-search.service.ts`

---

## 📚 SECTION 4: RAG & KNOWLEDGE BASE

### 4.1 Document Ingestion
- [ ] **Create document upload API endpoint** 🟠
  - POST /api/rag/documents/upload
  - Support PDF, TXT, MD, DOCX
  - File: `backend/src/rag/controllers/rag.controller.ts` (create)

- [ ] **Implement document chunking** 🟠
  - Split documents into semantic chunks
  - Store in OpenSearch with vectors
  - File: `backend/src/rag/services/document-processor.service.ts` (create)

### 4.2 RAG Enhancement
- [ ] **Add document context to LLM prompts** 🟡
  - Retrieve relevant chunks for queries
  - Format as context for LLM
  - File: `backend/src/search/services/rag-context.service.ts`

---

## 🎤 SECTION 5: VOICE SERVICES (MERCURY)

### 5.1 Integration Verification
- [ ] **Test ASR end-to-end** 🟡
  - Verify Whisper transcription quality
  - Test Hindi/English mixed input
  - Server: 192.168.0.151:7001

- [ ] **Test TTS end-to-end** 🟡
  - Verify Kokoro voice quality
  - Test response latency
  - Server: 192.168.0.151:7002

### 5.2 Voice Flow
- [ ] **Verify Exotel IVR integration** 🟡
  - Test incoming call flow
  - Verify ASR→LLM→TTS pipeline
  - Server: 192.168.0.151:3100

- [ ] **Add voice call logging** 🟢
  - Log all voice interactions
  - Store transcripts in database
  - File: `backend/src/voice/services/voice-logger.service.ts` (create)

---

## 🖥️ SECTION 6: INFRASTRUCTURE

### 6.1 GPU Optimization (DEFERRED)
- [ ] **Deploy GPU embeddings on Mercury** ⏸️
  - Move embedding service from CPU to GPU
  - Use ~2GB of free VRAM
  - Priority: After core features working

- [ ] **Deploy load-balanced vLLM on Mercury** ⏸️
  - Second Qwen 7B instance
  - Nginx load balancer
  - Priority: When traffic increases

### 6.2 Monitoring
- [ ] **Add Prometheus metrics for voice services** 🟢
  - Export metrics from Mercury containers
  - Add to Grafana dashboard

- [ ] **Create unified health dashboard** 🟢
  - Single page showing all services
  - Jupiter + Mercury status
  - Path: `frontend/src/app/admin/system-health/page.tsx` (create)

### 6.3 Backup & Recovery
- [ ] **Set up PostgreSQL backup cron** 🟡
  - Daily backups of headless_mangwale
  - Retain 7 days
  - Script: `backend/scripts/backup-db.sh` (create)

---

## 🧪 SECTION 7: TESTING & QA

### 7.1 End-to-End Tests
- [ ] **Test WhatsApp food ordering flow** 🟠
  - Order → Search → Add to cart → Checkout → Payment
  - Verify all steps work

- [ ] **Test number selection fix** 🟠
  - "0", "1", "2" should select items
  - "exit" should cancel
  - "no" should decline

### 7.2 Integration Tests
- [ ] **Test LLM fallback chain** 🟡
  - vLLM (local) → Groq (cloud) → OpenRouter (free)
  - Verify failover works

- [ ] **Test profile extraction** 🟡
  - Conversation with preferences → Profile updated
  - Verify insights captured

---

## 📝 SECTION 8: DOCUMENTATION

### 8.1 API Documentation
- [ ] **Document all API endpoints** 🟢
  - OpenAPI/Swagger spec
  - Path: `backend/docs/api-spec.yaml`

### 8.2 Architecture Documentation
- [ ] **Update system architecture diagram** 🟢
  - Include Mercury services
  - Show data flow
  - Path: `docs/ARCHITECTURE.md`

---

## 🔄 WORK LOG

### December 18, 2025
- [ ] Started comprehensive audit
- [ ] Discovered user profile issue (1 profile, 8442 messages)
- [ ] Identified missing admin pages
- [ ] Created this TODO document

---

## 📅 SPRINT PLAN

### Sprint 1 (This Week) - Core Fixes
1. Investigate user profile issue
2. Fix profile building triggers
3. Test WhatsApp flow end-to-end
4. Verify LLM fallback

### Sprint 2 (Next Week) - Admin Pages
1. Create User Profiles page
2. Create RAG Documents page
3. Add Mercury monitoring
4. Create Conversation Memory page

### Sprint 3 (Week 3) - Enhancement
1. Implement document upload
2. Add profile-based search boosting
3. Voice call logging
4. Testing & QA

---

## 🔗 QUICK LINKS

| Resource | URL |
|----------|-----|
| Admin Dashboard | http://localhost:3005/admin |
| API Service | http://localhost:3200 |
| OpenSearch | http://localhost:9200 |
| vLLM | http://localhost:8002 |
| NLU Service | http://localhost:7010 |
| Mercury Orchestrator | http://192.168.0.151:7000 |
| Mercury ASR | http://192.168.0.151:7001 |
| Mercury TTS | http://192.168.0.151:7002 |
| Exotel Service | http://192.168.0.151:3100 |

---

## 📊 METRICS TO TRACK

| Metric | Current | Target |
|--------|---------|--------|
| User Profiles | 1 | 100+ |
| Profile Completeness Avg | ? | >50% |
| Conversation→Profile Rate | ~0% | >80% |
| NLU Confidence Avg | ? | >0.85 |
| LLM Latency (p95) | ? | <2s |
| WhatsApp Response Time | ? | <3s |

