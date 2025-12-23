# 🚨 CRITICAL: Project Separation Issues

**Date**: November 13, 2025

---

## ⚠️ PROBLEM: Mixed Projects

You are **CORRECT** - there are **3 SEPARATE PROJECTS** that got mixed up!

---

## 🗂️ THREE SEPARATE PROJECTS

### 1️⃣ MANGWALE-AI (/home/ubuntu/Devs/mangwale-ai)
**Purpose**: AI Services Stack  
**Network**: `mangwale_unified_network`

**Correct Services** (11):
- ✅ mangwale_cv (Computer Vision)
- ✅ mangwale_nlu (NLU)
- ✅ mangwale_asr (ASR)
- ✅ mangwale_tts (TTS)
- ✅ mangwale_vllm (Local LLM)
- ✅ mangwale_postgres (Database)
- ✅ mangwale_redis (Cache)
- ✅ mangwale_minio (Object Storage)
- ✅ mangwale_opensearch (For logs/analytics - NOT search!)
- ✅ mangwale_opensearch_dashboards (For monitoring - NOT search!)
- ✅ mangwale_labelstudio (Training)

**Notes**:
- OpenSearch here is for **logs and analytics**, NOT product search!
- This is the unified AI backend

---

### 2️⃣ SEARCH PROJECT (/home/ubuntu/Devs/Search)
**Purpose**: Product Search Engine (SEPARATE PROJECT!)  
**Network**: `search_search-network`

**Services** (7) - ❌ **SHOULD NOT BE IN MANGWALE-AI**:
- ❌ search-frontend (Port 6000)
- ❌ search-api (Port 3100)
- ❌ embedding-service (Port 3101)
- ❌ mysql (Port 3306) - Search DB
- ❌ redpanda (Kafka - Port 9092)
- ❌ kafka-connect (CDC - Port 8083)
- ❌ adminer (DB UI - Port 8085)

**Current Status**: 
- ✅ Correctly on separate network: `search_search-network`
- ✅ Has its own docker-compose.yml in `/home/ubuntu/Devs/Search/`
- ⚠️ Running but should be managed separately

---

### 3️⃣ UNIFIED DASHBOARD (/home/ubuntu/Devs/mangwale-unified-dashboard)
**Purpose**: Customer-facing UI (Next.js frontend)  
**Network**: `traefik_default`

**Services** (2) - ⚠️ **NOT RUNNING**:
- ❌ mangwale-dashboard (Node 20 - Next.js on port 3000)
- ❌ mangwale-backend-proxy (Nginx)

**Current Status**: 
- ❌ **NOT RUNNING** - No containers found
- Has docker-compose.yml configured
- Supposed to run on chat.mangwale.ai

---

## 🔍 WHAT YOU FOUND

### Issue 1: OpenSearch Confusion
**You asked**: "where is unified dashboards"

**Answer**: There are **TWO different OpenSearch instances**:

1. **mangwale_opensearch_dashboards** (Port 5601)
   - Part of MANGWALE-AI
   - For logs, monitoring, analytics
   - NOT for product search
   - ✅ Currently running

2. **Search Project OpenSearch** (would be port 9200 in Search)
   - Part of SEARCH project
   - For product search indexing
   - Separate project entirely

### Issue 2: Search Services on Wrong Network?
**You said**: "search/opensearch should not be here (Mangwale-ai)"

**Good News**: Search services are **already separated**!
- Search containers are on `search_search-network` ✅
- Mangwale-AI containers are on `mangwale_unified_network` ✅
- They are NOT mixed - just both running on same server

---

## 📋 WHAT'S MISSING: Unified Dashboard

The **customer-facing dashboard** is NOT running:

**Expected**:
```
mangwale-dashboard (Next.js)
mangwale-backend-proxy (Nginx)
```

**Reality**:
- No containers running
- docker-compose.yml exists but not started
- Supposed to be on traefik_default network

---

## 🎯 SUMMARY

| Project | Location | Network | Status |
|---------|----------|---------|--------|
| **Mangwale-AI** | /home/ubuntu/Devs/mangwale-ai | mangwale_unified_network | ✅ Running (11 containers) |
| **Search** | /home/ubuntu/Devs/Search | search_search-network | ✅ Running (7 containers) |
| **Unified Dashboard** | /home/ubuntu/Devs/mangwale-unified-dashboard | traefik_default | ❌ NOT Running |

---

## ✅ ACTION ITEMS

### 1. Clarify OpenSearch Purpose
- `mangwale_opensearch` = Logs/monitoring for AI services ✅
- NOT for product search ✅
- Search project has its own OpenSearch ✅

### 2. Confirm Search Separation
- ✅ Search is already on separate network
- ✅ Search has separate docker-compose
- No action needed - already separated correctly

### 3. Start Unified Dashboard
- ⚠️ Customer dashboard (Next.js) is NOT running
- Located: `/home/ubuntu/Devs/mangwale-unified-dashboard`
- Needs: `docker-compose up -d`

---

## 🤔 QUESTIONS TO ANSWER

1. **Should mangwale_opensearch stay in mangwale-ai?**
   - If YES: It's for logs/analytics (valid use case)
   - If NO: Remove from docker-compose.ai.yml

2. **Do you want to start the Unified Dashboard?**
   - Located: `/home/ubuntu/Devs/mangwale-unified-dashboard`
   - Purpose: Customer-facing UI (chat.mangwale.ai)
   - Currently: NOT running

3. **Are all 3 projects supposed to be separate?**
   - Mangwale-AI: Backend AI services ✅
   - Search: Product search engine ✅
   - Dashboard: Customer UI ❌ (not running)

---

**Next Step**: Please clarify:
1. Keep mangwale_opensearch in AI stack? (for logs)
2. Start the Unified Dashboard?
3. Any other services that shouldn't be in mangwale-ai?
