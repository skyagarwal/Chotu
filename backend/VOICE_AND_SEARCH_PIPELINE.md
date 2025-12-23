# Voice Pipeline (ASR/TTS) & Search API Integration Analysis

## Document Overview

This document provides a comprehensive analysis of the Voice Pipeline (ASR/TTS) and Search API integration in MangwaleAI, including what's working, what's partially implemented, and what's missing.

---

## Part 1: Voice Pipeline Analysis

### 1.1 ASR (Automatic Speech Recognition) - Whisper Service (Port 7000)

#### Service Architecture

| Component | Location | Port | Docker Image |
|-----------|----------|------|--------------|
| **Whisper ASR Proxy** | `mangwale_asr` | 7000 → 8000 (internal) | `admin-asr-proxy:latest` |
| **ASR Service** | `src/asr/` | - | NestJS Module |
| **Whisper Implementation** | `src/asr/services/whisper-asr.service.ts` | - | Local implementation |

#### ASR Implementation Details

**File Structure:**
```
src/asr/
├── asr.module.ts
├── controllers/
│   └── asr.controller.ts
├── services/
│   ├── asr.service.ts           # Main orchestrator with provider selection
│   ├── whisper-asr.service.ts   # Local Whisper implementation
│   └── cloud-asr.service.ts     # Google/Azure fallback
└── dto/
    ├── transcribe-audio.dto.ts
    └── transcription-result.dto.ts
```

**Provider Priority:**
1. **Primary:** Local Whisper (vLLM) at `http://asr:8000`
2. **Fallback:** Google Cloud Speech-to-Text
3. **Fallback:** Azure Speech Services

**Audio Processing Flow:**
```
Audio Input (URL or Buffer)
       ↓
Download/Save to /tmp/mangwale-asr/
       ↓
Create FormData with file + language
       ↓
POST to ${ASR_SERVICE_URL}/transcribe
       ↓
Parse response (text, language, confidence, words)
       ↓
Clean up temp file
       ↓
Return TranscriptionResultDto
```

**Supported Audio Formats:**
- `.ogg` (default for WhatsApp)
- Any format supported by Whisper (mp3, wav, webm, etc.)

**Configuration (.env):**
```env
ASR_SERVICE_URL=http://localhost:7000
ASR_DEFAULT_PROVIDER=whisper
ASR_FALLBACK_PROVIDER=google
```

---

### 1.2 TTS (Text-to-Speech) - XTTS Service (Port 8010)

#### Service Architecture

| Component | Location | Port | Docker Image |
|-----------|----------|------|--------------|
| **XTTS Service** | `mangwale_tts` | 8010 → 5501 (internal) | `admin-xtts:latest` |
| **TTS Service** | `src/tts/` | - | NestJS Module |
| **XTTS Implementation** | `src/tts/services/xtts.service.ts` | - | Neural TTS |

#### TTS Implementation Details

**File Structure:**
```
src/tts/
├── tts.module.ts
├── controllers/
│   └── tts.controller.ts
├── services/
│   ├── tts.service.ts           # Main orchestrator with provider selection
│   ├── xtts.service.ts          # Local XTTS neural TTS
│   └── cloud-tts.service.ts     # Google/Azure fallback
└── dto/
    ├── synthesize-speech.dto.ts
    └── synthesis-result.dto.ts
```

**Provider Priority:**
1. **Primary:** Local XTTS (neural) at `http://localhost:8010`
2. **Fallback:** Google Cloud TTS
3. **Fallback:** Azure Speech Services

**TTS Processing Flow:**
```
Text Input + Language
       ↓
Map language to reference audio file:
  - en/en-US/en-IN → /app/models/ref_en.wav
  - hi/hi-IN → /app/models/ref_hi.wav
       ↓
POST to ${TTS_SERVICE_URL}/api/tts
  Body: { text, lang, speaker_wav }
       ↓
Receive raw audio (arraybuffer)
       ↓
Return SynthesisResultDto with Buffer
```

**Supported Languages/Voices:**
- English (en, en-US, en-IN)
- Hindi (hi, hi-IN)
- Extensible via reference audio files

**Configuration (.env):**
```env
TTS_SERVICE_URL=http://localhost:8010
TTS_DEFAULT_PROVIDER=xtts
TTS_FALLBACK_PROVIDER=google
```

---

### 1.3 Voice Message Handling (WhatsApp Integration)

#### Current WhatsApp Message Types

**Supported in `whatsapp.interface.ts`:**
```typescript
type: 'text' | 'interactive' | 'location' | 'button' | 'image' | 'document'
```

⚠️ **CRITICAL FINDING:** Audio/voice type is NOT in the interface!

#### Webhook Controller Analysis

**File:** `src/whatsapp/controllers/webhook.controller.ts`

**Current Message Routing:**
```typescript
private async routeMessage(from, type, message, currentStep) {
  // Only extracts text from:
  const messageText = 
    message.text?.body ||                        // Text messages
    message.interactive?.button_reply?.title ||  // Button clicks
    message.interactive?.list_reply?.title ||    // List selections
    '';  // <-- Falls through to empty string for voice messages!
  
  // Routes directly to AgentOrchestrator
  await this.agentOrchestratorService.processMessage(from, messageText, 'general');
}
```

#### Voice Controller (Chat Frontend Proxy)

**File:** `src/agents/controllers/voice.controller.ts`

**Purpose:** Proxies voice requests from the chat frontend to Admin Backend

**Endpoints:**
- `POST /voice/transcribe` - ASR transcription
- `POST /voice/synthesize` - TTS synthesis
- `POST /voice/health` - Health check

**Current Status:** ✅ Works for web chat, ❌ NOT connected to WhatsApp webhook

---

### 1.4 Voice Pipeline Status Summary

| Feature | Status | Details |
|---------|--------|---------|
| **ASR Service (Whisper)** | ✅ Implemented | Local Whisper with cloud fallback |
| **TTS Service (XTTS)** | ✅ Implemented | Neural TTS with multiple language support |
| **Web Chat Voice** | ✅ Working | Via `/voice/transcribe` and `/voice/synthesize` |
| **WhatsApp Voice Messages** | ❌ NOT Working | Webhook doesn't handle audio type |
| **Voice-to-Voice Conversation** | ❌ Incomplete | Missing WhatsApp voice handling |
| **Audio Format Conversion** | ✅ Partial | Whisper handles most formats |

---

### 1.5 Missing Implementation: WhatsApp Voice Support

**What needs to be added to `webhook.controller.ts`:**

```typescript
// 1. Update WhatsAppMessage interface to include audio
type: 'text' | 'interactive' | 'location' | 'button' | 'image' | 'document' | 'audio' | 'voice'

audio?: {
  id: string;           // WhatsApp media ID
  mime_type: string;    // e.g., 'audio/ogg; codecs=opus'
};

// 2. Add voice message handling in routeMessage:
if (type === 'audio' || type === 'voice') {
  // Download audio from WhatsApp Media API
  const audioUrl = await this.downloadWhatsAppMedia(message.audio.id);
  
  // Transcribe using ASR
  const transcription = await this.asrService.transcribe({
    audioUrl,
    language: 'auto'
  });
  
  messageText = transcription.text;
  // Continue with normal flow processing...
}

// 3. Optionally send voice response:
if (userPreference.preferVoice) {
  const audioBuffer = await this.ttsService.synthesize({
    text: response,
    language: transcription.language
  });
  await this.messageService.sendAudioMessage(from, audioBuffer);
}
```

---

## Part 2: Search Integration Analysis

### 2.1 Search API Architecture (Port 3100)

#### Service Configuration

| Service | Port | Purpose |
|---------|------|---------|
| **Search API** | 3100 | External search microservice (NestJS) |
| **Main Backend** | 3200 | Mangwale AI service |
| **Embedding Service (MiniLM)** | 3101 | English embeddings (384-dim) |
| **NLU/IndicBERT** | 7010 | Intent + Indic embeddings (768-dim) |
| **OpenSearch** | 9200 | Vector/keyword search engine |

#### Main Backend → Search API Connection

**File:** `src/search/services/search.service.ts`

**Proxy Configuration:**
```typescript
constructor() {
  this.searchApiUrl = this.config.get('SEARCH_API_URL', 'http://localhost:3100');
}
```

**Proxied Endpoints:**
| Backend Route | Proxies To | Purpose |
|---------------|------------|---------|
| `/search` | `${searchApiUrl}/search` | Unified search |
| `/search/${module}` | `${searchApiUrl}/search/${module}` | Module-specific search |
| `/search/${module}/stores` | `${searchApiUrl}/search/${module}/stores` | Store search |
| `/search/${module}/suggest` | `${searchApiUrl}/search/${module}/suggest` | Autocomplete |

#### Direct vs Proxied Usage

| Scenario | Method Used |
|----------|-------------|
| Unified/module search | Proxied to Search API (3100) |
| Keyword search | Direct OpenSearch via `OpenSearchService` |
| Semantic search | Direct via `UnifiedEmbeddingService` + `OpenSearchService` |
| Hybrid search | Direct (keyword + semantic combined) |

---

### 2.2 Embedding Services

#### Dual Embedding Architecture

**File:** `src/search/services/unified-embedding.service.ts`

```
                    ┌─────────────────────────────────────┐
                    │     UnifiedEmbeddingService         │
                    │     (Language-Aware Router)         │
                    └────────────────┬────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ↓                                 ↓
       ┌─────────────────────┐          ┌─────────────────────┐
       │   EmbeddingService  │          │   IndicBERTService  │
       │   (MiniLM-L6-v2)    │          │   (IndicBERTv2)     │
       │   Port: 3101        │          │   Port: 7010        │
       │   Dimensions: 384   │          │   Dimensions: 768   │
       │   Languages: English │          │   Languages: Hindi, │
       └─────────────────────┘          │   Marathi, Bengali, │
                                        │   Tamil, Telugu...   │
                                        └─────────────────────┘
```

#### Language Detection & Routing

**Script Detection Ranges:**
```typescript
const scriptRanges = {
  devanagari: /[\u0900-\u097F]/,  // Hindi, Marathi
  bengali: /[\u0980-\u09FF]/,
  tamil: /[\u0B80-\u0BFF]/,
  telugu: /[\u0C00-\u0C7F]/,
  gujarati: /[\u0A80-\u0AFF]/,
  kannada: /[\u0C80-\u0CFF]/,
  malayalam: /[\u0D00-\u0D7F]/,
  gurmukhi: /[\u0A00-\u0A7F]/,
  oriya: /[\u0B00-\u0B7F]/,
  latin: /[a-zA-Z]/,
};
```

**Routing Logic:**
```typescript
const indicLanguages = ['hi', 'mr', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'pa', 'or'];

if (indicLanguages.includes(detectedLanguage)) {
  return this.embedWithIndicBERT(text);  // 768-dim
} else {
  return this.embedWithMiniLM(text);     // 384-dim
}
```

---

### 2.3 Hybrid Search Implementation

**File:** `src/search/services/search.service.ts`

**Hybrid Search Flow:**
```
User Query
    ↓
┌───────────────────────────────────────┐
│            Parallel Execution          │
│  ┌─────────────────┬─────────────────┐ │
│  │  Keyword Search │ Semantic Search │ │
│  │  (OpenSearch)   │ (Embedding+kNN) │ │
│  └─────────────────┴─────────────────┘ │
└───────────────────────────────────────┘
    ↓
Combine Results:
  - Keyword score × 0.6 (60% weight)
  - Semantic score × 0.4 (40% weight)
    ↓
Deduplicate by ID, sum scores
    ↓
Sort by combined score
    ↓
Return unified results
```

**Weight Configuration:**
```typescript
// Keyword results: 60% weight
existing.score = hit.score * 0.6;

// Semantic results: 40% weight
existing.score += hit.score * 0.4;
```

---

### 2.4 OpenSearch Configuration

#### Index Structure

**Dual Vector Index Schema:**
```json
{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "description": { "type": "text" },
      "price": { "type": "float" },
      "category": { "type": "keyword" },
      "store_id": { "type": "integer" },
      
      "embedding_384": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "engine": "nmslib"
        }
      },
      
      "embedding_768": {
        "type": "knn_vector",
        "dimension": 768,
        "method": {
          "name": "hnsw",
          "engine": "nmslib"
        }
      },
      
      "embedding_model": { "type": "keyword" },
      "detected_language": { "type": "keyword" },
      "location": { "type": "geo_point" }
    }
  }
}
```

#### Known Indexes

| Index | Purpose | Dimensions |
|-------|---------|------------|
| `food_items_v3` | Food module items | 384/768 |
| `food_items_v4` | Latest food items with dual vectors | 384/768 |
| `ecom_items_v3` | E-commerce products | 384/768 |

#### Vector Field Selection

**From `opensearch.service.ts`:**
```typescript
private getEmbeddingField(dimension: number): string {
  switch (dimension) {
    case 384: return 'embedding_384';  // MiniLM (English)
    case 768: return 'embedding_768';  // IndicBERT (Indic)
    default: return 'embedding';       // Legacy
  }
}
```

---

### 2.5 Data Sync to OpenSearch

#### Sync Script

**File:** `scripts/sync-items-to-opensearch.ts`

**Process:**
```
1. Fetch items from PHP Backend (/api/v1/items/latest)
    ↓
2. For each batch (50 items):
   a. Generate text content (name + description)
   b. Call MiniLM (3101) for 384-dim embedding
   c. Call IndicBERT (7010) for 768-dim embedding
    ↓
3. Prepare IndexedItem with:
   - Original fields
   - embedding_384
   - embedding_768
   - embedding_model
   - detected_language
   - location (geo_point)
    ↓
4. Bulk index to OpenSearch
    ↓
5. Refresh index
```

**Usage:**
```bash
npx ts-node scripts/sync-items-to-opensearch.ts
npx ts-node scripts/sync-items-to-opensearch.ts --index food_items_v4
npx ts-node scripts/sync-items-to-opensearch.ts --dry-run
```

#### CDC (Change Data Capture)

**Status:** Mentioned in architecture docs but implementation unclear

**Expected Flow:**
```
MySQL (PHP Backend)
       ↓ Debezium
Redpanda (Kafka-compatible)
       ↓ Consumer
OpenSearch Indexer
       ↓
OpenSearch Indices
```

---

### 2.6 Search Integration Status Summary

| Feature | Status | Details |
|---------|--------|---------|
| **Search API Proxy** | ✅ Working | Main backend proxies to port 3100 |
| **Keyword Search** | ✅ Working | Direct OpenSearch multi_match |
| **Semantic Search (English)** | ✅ Working | MiniLM 384-dim embeddings |
| **Semantic Search (Hindi)** | ✅ Working | IndicBERT 768-dim embeddings |
| **Hybrid Search** | ✅ Working | 60/40 keyword/semantic weighting |
| **Language Detection** | ✅ Working | Script-based detection |
| **Dual Vector Index** | ✅ Working | Both 384 and 768 dim fields |
| **Manual Data Sync** | ✅ Working | Script-based sync from PHP |
| **CDC Real-time Sync** | ⚠️ Partial | Debezium mentioned, not verified |
| **Geo-distance Search** | ✅ Implemented | Via filter operator |
| **Aggregations** | ✅ Working | Popular categories, etc. |

---

## Part 3: Executive Summary

### What's Working ✅

1. **ASR Service (Whisper)**
   - Local Whisper transcription at port 7000
   - Cloud fallback (Google, Azure)
   - Multi-language support with auto-detection
   - Word-level timestamps

2. **TTS Service (XTTS)**
   - Neural TTS at port 8010
   - English and Hindi voice support
   - Reference audio-based synthesis
   - Cloud fallback available

3. **Web Chat Voice**
   - Voice input via `/voice/transcribe`
   - Voice output via `/voice/synthesize`
   - Works with React frontend

4. **Search Pipeline**
   - Hybrid search (keyword + semantic)
   - Language-aware embeddings (MiniLM + IndicBERT)
   - Dual vector OpenSearch indices
   - Search API proxy integration

### What's Partially Implemented ⚠️

1. **WhatsApp Voice Messages**
   - ASR/TTS services exist but not connected
   - Webhook doesn't handle audio message type
   - Need media download from WhatsApp API

2. **Real-time Data Sync (CDC)**
   - Debezium configured in architecture
   - Manual sync script works
   - Real-time streaming status unclear

3. **Voice Preference Tracking**
   - TTS exists but no user preference storage
   - Need session-level voice preference flag

### What's Missing ❌

1. **WhatsApp Voice Message Flow**
   ```
   User sends voice → Download audio → ASR → Text → Flow Engine → Response → TTS → Send audio
   ```
   - WhatsApp media download not implemented
   - Audio message type not in interface
   - Voice response sending not implemented

2. **Voice-to-Voice Loop**
   - No automatic TTS for voice message responses
   - No user preference for voice replies

3. **Search API Direct Access**
   - Search API (3100) is separate microservice
   - Main backend proxies, but direct access not documented

---

## Part 4: Recommended Fixes

### Priority 1: Enable WhatsApp Voice Messages

**Files to modify:**

1. `src/whatsapp/interfaces/whatsapp.interface.ts`:
   - Add `audio` and `voice` types
   - Add audio media structure

2. `src/whatsapp/controllers/webhook.controller.ts`:
   - Add audio type detection
   - Implement media download from WhatsApp API
   - Call ASR service for transcription
   - Optionally generate TTS response

3. `src/whatsapp/services/message.service.ts`:
   - Add `sendAudioMessage()` method

### Priority 2: Verify CDC Pipeline

- Confirm Debezium connector is running
- Verify Redpanda topics
- Check OpenSearch consumer

### Priority 3: Document Search API

- Document Search API (3100) endpoints directly
- Add OpenSearch index mappings
- Document embedding service health checks

---

## Appendix: Configuration Reference

### Environment Variables

```env
# Voice Services
ASR_SERVICE_URL=http://localhost:7000
ASR_DEFAULT_PROVIDER=whisper
ASR_FALLBACK_PROVIDER=google
TTS_SERVICE_URL=http://localhost:8010
TTS_DEFAULT_PROVIDER=xtts
TTS_FALLBACK_PROVIDER=google

# Search Services
SEARCH_API_URL=http://localhost:3100
OPENSEARCH_URL=http://localhost:9200
EMBEDDING_SERVICE_URL=http://localhost:3101
NLU_ENDPOINT=http://localhost:7010

# Google Cloud (Fallback)
GOOGLE_CLOUD_API_KEY=
GOOGLE_CLOUD_PROJECT_ID=

# Azure Speech (Fallback)
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=centralindia
```

### Docker Services

| Service | Container | Port | Status |
|---------|-----------|------|--------|
| Whisper ASR | `mangwale_asr` | 7000 | GPU-enabled |
| XTTS | `mangwale_tts` | 8010 | GPU-enabled |
| OpenSearch | `mangwale_opensearch` | 9200 | Running |
| Embedding (MiniLM) | `search-embedding-service` | 3101 | Running |
| NLU (IndicBERT) | `mangwale_nlu` | 7010 | Running |

---

*Document generated: November 30, 2025*
*Last analyzed: MangwaleAI Backend v3.x*
