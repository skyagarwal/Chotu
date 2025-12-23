# 🏗️ MANGWALE-AI CLEAN ARCHITECTURE

**Date**: November 13, 2025  
**Status**: All services properly named and connected ✅

---

## 📦 ALL MANGWALE AI SERVICES

### Core AI Services (11):
| # | Service | Container | Image | Port | Status |
|---|---------|-----------|-------|------|--------|
| 1 | **Computer Vision** | mangwale_cv | admin-cv:latest | 8001 | ✅ Running |
| 2 | **NLU** (IndicBERT) | mangwale_nlu | admin-nlu:latest | 7010 | ✅ Running |
| 3 | **ASR** (Whisper) | mangwale_asr | admin-asr-proxy:latest | 7000 | ✅ Running |
| 4 | **TTS** (XTTS) | mangwale_tts | admin-xtts:latest | 8010 | ✅ Running |
| 5 | **vLLM** (Qwen 7B) | mangwale_vllm | vllm/vllm-openai:v0.4.2 | 8002 | ✅ Working |
| 6 | **PostgreSQL** | mangwale_postgres | postgres:16-alpine | 5432 | ✅ Healthy |
| 7 | **Redis** | mangwale_redis | redis:7.2-alpine | 6379 | ✅ Healthy |
| 8 | **MinIO** | mangwale_minio | minio/minio:latest | 9000/9001 | ✅ Healthy |
| 9 | **OpenSearch** | mangwale_opensearch | opensearch:2.13.0 | 9200 | ✅ Healthy |
| 10 | **OpenSearch Dashboards** | mangwale_opensearch_dashboards | opensearch-dashboards | 5601 | ✅ Running |
| 11 | **Label Studio** | mangwale_labelstudio | label-studio:1.21.0 | 8080 | ✅ Running |

### External Services (PHP Backend - Separate):
| Service | Container | Port | Network |
|---------|-----------|------|---------|
| PHP Backend | mangwale_php | 8080 | phpmangwalebackend_mangwale_network |
| MySQL | mangwale_mysql | 3306 | phpmangwalebackend_mangwale_network |
| Nginx | mangwale_nginx | 80/443 | traefik_default |
| phpMyAdmin | mangwale_phpmyadmin | 8081 | phpmangwalebackend_mangwale_network |

---

## 🌐 NETWORK ARCHITECTURE

### AI Services Network:
**Network**: `mangwale_unified_network`

**Connected Services** (11):
```
┌─────────────────────────────────────────────┐
│       mangwale_unified_network              │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   CV     │  │   NLU    │  │  vLLM    │  │
│  │ (Vision) │  │(IndicBERT)│ │  (Qwen)  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────┐  ┌──────────┐                │
│  │   ASR    │  │   TTS    │                │
│  │(Whisper) │  │ (XTTS)   │                │
│  └──────────┘  └──────────┘                │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  PostgreSQL + Redis + MinIO          │  │
│  │  OpenSearch + Label Studio           │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Search Network (Separate Project):
**Network**: `search_search-network`

```
┌─────────────────────────────────────┐
│   search_search-network             │
│                                     │
│  ┌──────────┐   ┌──────────┐       │
│  │ Search   │   │Embedding │       │
│  │ API      │   │ Service  │       │
│  └──────────┘   └──────────┘       │
└─────────────────────────────────────┘
```

### PHP Backend Network (External):
**Network**: `phpmangwalebackend_mangwale_network`

```
┌─────────────────────────────────────┐
│ phpmangwalebackend_mangwale_network │
│                                     │
│  ┌──────────┐   ┌──────────┐       │
│  │   PHP    │   │  MySQL   │       │
│  │ Backend  │   │          │       │
│  └──────────┘   └──────────┘       │
└─────────────────────────────────────┘
```

---

## 🎯 SERVICE ROLES

### AI Processing:
1. **mangwale_cv** - Computer Vision (PPE detection, face recognition, object detection)
2. **mangwale_nlu** - Natural Language Understanding (intent, entities, sentiment)
3. **mangwale_vllm** - Local Large Language Model (Qwen 7B - Priority #1)
4. **mangwale_asr** - Automatic Speech Recognition (Whisper)
5. **mangwale_tts** - Text-to-Speech (XTTS)

### Infrastructure:
6. **mangwale_postgres** - Main database
7. **mangwale_redis** - Cache and sessions
8. **mangwale_minio** - Object storage (images, files)
9. **mangwale_opensearch** - Search engine and logs
10. **mangwale_opensearch_dashboards** - Search UI
11. **mangwale_labelstudio** - Training data annotation

---

## ✅ NAMING CONVENTIONS

All AI services follow consistent naming:
- **Container prefix**: `mangwale_`
- **Network**: `mangwale_unified_network`
- **Volumes**: `mangwale_<service>_data`

**Examples**:
- Container: `mangwale_cv` (not `cv`)
- Container: `mangwale_nlu` (not `admin-nlu`)
- Network: `mangwale_unified_network`
- Volume: `mangwale_postgres_data`

---

## �� QUICK REFERENCE

### Check All AI Services:
```bash
docker ps --filter "name=mangwale_" --format "table {{.Names}}\t{{.Status}}"
```

### Test Services:
```bash
# vLLM (Local LLM)
curl http://localhost:8002/v1/models

# NLU
curl http://localhost:7010/docs

# CV (Computer Vision)
curl http://localhost:8001/health

# PostgreSQL
docker exec mangwale_postgres pg_isready -U mangwale_config
```

### Service URLs (Internal - from within network):
```yaml
CV_SERVICE_URL: http://mangwale_cv:8001
NLU_ENDPOINT: http://mangwale_nlu:7010
VLLM_URL: http://mangwale_vllm:8002
ASR_SERVICE_URL: http://mangwale_asr:7000
TTS_SERVICE_URL: http://mangwale_tts:8010
DATABASE_URL: postgresql://...@mangwale_postgres:5432/...
REDIS_URL: redis://mangwale_redis:6379
MINIO_ENDPOINT: mangwale_minio:9000
```

---

## �� NEXT STEPS

1. **Update docker-compose.ai.yml** to include CV service
2. **Migrate Vision module** from Image AI repo
3. **Deploy unified stack** with all 11 services
4. **Test end-to-end** AI pipeline

---

**🎯 Status**: All services properly named and connected ✅  
**📦 Total AI Services**: 11 containers on unified network  
**🏗️ Architecture**: Clean and organized  
**🚀 Ready**: For Vision module migration

---

Clean architecture complete! 🎉
