# Docker Container Consolidation Plan

## Current Issues
1. ❌ **mangwale_nlu** - UNHEALTHY (healthcheck fails on `/healthz` endpoint)
2. ❌ **vLLM** - NOT RUNNING (needed for LLM services)
3. ❌ **Confusing naming** - Mix of `mangwale_`, `mangwale-`, underscore vs dash

## Current Containers (from screenshot)
```
mangwale-ai (compose project)
├── mangwale_ai_service (mangwale-ai_mangwale-ai image) - HEALTHY ✅
├── mangwale_nlu (admin-nlu:latest) - UNHEALTHY ⚠️
├── mangwale_labelstudio (heartexlabs/label-studio:1.21.0) - HEALTHY ✅
├── mangwale_osrm (mangwale-ai_osrm-backend) - HEALTHY ✅
├── mangwale_postgres (postgres:15-alpine) - HEALTHY ✅
└── mangwale_redis (redis:7-alpine) - HEALTHY ✅

mangwale-unified-dashboard (separate project)
├── mangwale-dashboard (node:20-alpine) - RUNNING ✅
└── mangwale-backend-proxy (nginx:alpine) - RUNNING ✅

parcel_intent_backend (separate project)
└── mangwale_parcel_ml_backend - RUNNING ✅

Legacy (from main PHP stack)
├── mangwale_nginx - RUNNING ✅
├── mangwale_php - RUNNING ✅
├── mangwale_mysql - RUNNING ✅
└── mangwale_phpmyadmin - RUNNING ✅
```

## Proposed Solution: Standardized Naming

### Stack 1: AI Services (mangwale-ai/)
**Format**: `mangwale-ai-{service}`

```yaml
mangwale-ai-main          # Main NestJS app (port 3200, 3201)
mangwale-ai-nlu           # NLU classification service (port 7010)
mangwale-ai-vllm          # vLLM inference engine (port 8002)
mangwale-ai-postgres      # PostgreSQL for flows/sessions (port 5432)
mangwale-ai-redis         # Redis for sessions (port 6381)
mangwale-ai-labelstudio   # Label Studio for training (port 8080)
mangwale-ai-ml-backend    # ML backend for Label Studio (port 9090)
mangwale-ai-osrm          # OSRM routing service (port 5000)
```

### Stack 2: Dashboard (mangwale-unified-dashboard/)
**Format**: `mangwale-dashboard-{service}`

```yaml
mangwale-dashboard-frontend   # Next.js dashboard
mangwale-dashboard-proxy      # Nginx proxy
```

### Stack 3: PHP Backend (PHPMangwaleBackend/)
**Format**: `mangwale-php-{service}`

```yaml
mangwale-php-app         # PHP application
mangwale-php-nginx       # Nginx webserver
mangwale-php-mysql       # MySQL database (port 23306)
mangwale-php-phpmyadmin  # phpMyAdmin
```

## Implementation Steps

### Step 1: Fix NLU Health Check
Update healthcheck endpoint from `/healthz` to `/` or create proper `/healthz` endpoint

### Step 2: Add vLLM Service
Add vLLM container to docker-compose.yml with proper GPU support

### Step 3: Rename Containers (Optional - can cause downtime)
Update docker-compose.yml with new naming convention

### Step 4: Update Environment Variables
Ensure all inter-service URLs use new container names

## Quick Fix (No Downtime)

1. Fix NLU healthcheck
2. Add vLLM service
3. Keep existing names (rename later during planned maintenance)
