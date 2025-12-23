# Environment Variables for mangwale-ai

## Database
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/mangwale?schema=public"
```

## Redis
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1
```

## Search & Vector Services
```env
# Search API (Module/Zone-aware search)
SEARCH_API_URL=http://localhost:3100

# OpenSearch (Vector & Keyword Search)
OPENSEARCH_URL=http://localhost:9200

# Embedding Service (sentence-transformers)
EMBEDDING_SERVICE_URL=http://localhost:3101
```

## Admin Backend (AI Services)
```env
ADMIN_BACKEND_URL=http://localhost:3002
ADMIN_BACKEND_API_KEY=

# AI Service Endpoints (via Admin Backend)
# - NLU (IndicBERT): http://localhost:7010
# - ASR (Whisper): http://localhost:7000
# - TTS (XTTS): http://localhost:8010
# - LLM (vLLM): http://localhost:8002
```

## Vision Services
```env
# Vision API (YOLOv8 Object Detection)
VISION_API_URL=http://localhost:8020

# Face Recognition API
FACE_API_URL=http://localhost:8021

# PPE Detection API
PPE_API_URL=http://localhost:8022
```

## Training Services
```env
# Label Studio (Data Annotation)
LABEL_STUDIO_URL=http://localhost:8080
LABEL_STUDIO_API_KEY=your-label-studio-api-key

# Storage Paths
DATASETS_DIR=/tmp/datasets
MODELS_DIR=/tmp/models
```

## Cloud LLM Providers (Fallback)
```env
# OpenAI
OPENAI_API_KEY=your-openai-key

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-key

# Groq
GROQ_API_KEY=your-groq-key

# HuggingFace
HUGGINGFACE_API_KEY=your-huggingface-key
```

## Cloud ASR Providers (Fallback)
```env
# Google Cloud Speech-to-Text
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Azure Speech
AZURE_SPEECH_KEY=your-azure-key
AZURE_SPEECH_REGION=your-region
```

## PHP Backend
```env
PHP_BACKEND_URL=http://localhost:8090
PHP_API_BASE_URL=http://localhost:8090
PHP_API_TIMEOUT=30000
```

## WhatsApp Configuration
```env
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_API_VERSION=v22.0
```

## Application
```env
NODE_ENV=production
PORT=3200
APP_NAME=Mangwale AI
LOG_LEVEL=info
TZ=Asia/Kolkata
```
