# 🧠 NLU Optimal Training Pipeline

## Complete Architecture for Maximum Data Extraction

### Overview

This document describes the **optimal** NLU training pipeline for Mangwale AI that captures and learns from **EVERY** conversation across **ALL** channels.

```
┌──────────────────────────────────────────────────────────────────────┐
│                     MULTI-CHANNEL DATA COLLECTION                     │
├───────────┬───────────┬───────────┬───────────┬──────────┬──────────┤
│ WhatsApp  │ Telegram  │   Voice   │  Web Chat │ Instagram│   SMS    │
│  Handler  │  Handler  │  Handler  │  Gateway  │  Handler │ Handler  │
├───────────┴───────────┴───────────┴───────────┴──────────┴──────────┤
│                    ConversationLoggerService                          │
│         └── logUserMessage(text, sessionId, platform, intent)         │
├──────────────────────────────────────────────────────────────────────┤
│                          PostgreSQL                                   │
│   ┌─────────────────────┐     ┌─────────────────────────────────┐   │
│   │ conversation_messages│     │     nlu_training_data          │   │
│   │ - All raw messages   │────▶│ - Curated samples               │   │
│   │ - Intent + Confidence│     │ - Entities + Tone               │   │
│   │ - Session tracking   │     │ - Review status                 │   │
│   └─────────────────────┘     └─────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     NLU TRAINING PIPELINE                             │
├──────────────────────────────────────────────────────────────────────┤
│  1. Auto-Import (Cron)        │  Import from conversation_messages   │
│  2. Entity Extraction         │  12+ entity types via patterns       │
│  3. Tone Analysis             │  7 emotion categories                │
│  4. Auto-Approve              │  >95% confidence → approved          │
│  5. Export Training Data      │  JSONL for retraining                │
│  6. Trigger Training          │  IndicBERT fine-tuning               │
│  7. Deploy if Improved        │  Hot-swap model                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 1. Data Collection Layer

### All Channels Covered ✅

| Channel | Controller | Logs To | Status |
|---------|-----------|---------|--------|
| WhatsApp | `whatsapp.controller.ts` | `ConversationLoggerService` | ✅ Active |
| Telegram | `telegram.controller.ts` | `ConversationLoggerService` | ✅ Active |
| Voice | `voice.controller.ts` | `ConversationLoggerService` | ✅ Active |
| Web Chat | `chat-gateway.gateway.ts` | `ConversationLoggerService` | ✅ Active |
| Instagram | `instagram.controller.ts` | `ConversationLoggerService` | ✅ Active |
| SMS | `sms.controller.ts` | `ConversationLoggerService` | ✅ Active |

### What Gets Captured

Every message captures:
```typescript
{
  message: string,        // Raw user text
  session_id: string,     // Conversation thread
  sender: 'user' | 'bot', // Who sent it
  platform: string,       // Channel source
  intent: string,         // NLU classification
  confidence: number,     // Classification confidence
  entities: object,       // Extracted entities
  timestamp: Date
}
```

---

## 2. Entity Extraction (SLOTS_MODEL Training Data)

### Enhanced EntityExtractorService

Located at: `/backend/src/nlu/services/entity-extractor.service.ts`

#### Entity Types Captured:

| Entity Type | Examples | Extraction Method |
|-------------|----------|-------------------|
| `product_name` | biryani, pizza, samosa | 50+ food item patterns |
| `restaurant_name` | Dominos, Swiggy's Kitchen | Context + capitalization |
| `quantity` | 2, five, dozen | Numbers + word patterns |
| `phone` | +91 9876543210 | Regex patterns |
| `email` | user@domain.com | Standard email regex |
| `location` | Koramangala, HSR Layout | Named locations + context |
| `order_id` | ORD123, MNG-456 | Order ID patterns |
| `date` | tomorrow, 25th Jan | Date patterns + keywords |
| `time` | 7pm, evening, noon | Time patterns |
| `price` | ₹500, 200 rupees | Currency patterns |
| `person_name` | Rahul, Sarah | Common names list |

#### Food Items Database (50+ items):
```
biryani, chicken biryani, veg biryani, mutton biryani,
pizza, burger, pasta, noodles, fried rice, momos,
dosa, idli, samosa, paratha, naan, roti,
paneer, dal, curry, tandoori, tikka, kebab,
ice cream, gulab jamun, rasgulla, kheer, jalebi,
chai, coffee, lassi, juice, smoothie, milkshake,
thali, combo, meal, snacks, appetizer, dessert
```

---

## 3. Tone Analysis (TONE_MODEL Training Data)

### 7-Class Emotion Categories:

| Tone | Keywords/Patterns | Example |
|------|-------------------|---------|
| `happy` | thank you, great, awesome | "Thanks so much!" |
| `angry` | terrible, worst, never | "This is the worst!" |
| `urgent` | asap, urgent, emergency | "Need it ASAP!" |
| `frustrated` | again, still, why | "Why is this happening again?" |
| `polite` | please, kindly, would you | "Could you please help?" |
| `confused` | what, how, don't understand | "I don't understand this" |
| `neutral` | default | "I want to order food" |

---

## 4. Training Data Export Formats

### Intent Training (JSONL):
```json
{"text": "I want to order chicken biryani", "intent": "food_order", "language": "en"}
{"text": "mujhe biryani chahiye", "intent": "food_order", "language": "hi"}
{"text": "check my order status", "intent": "order_status", "language": "en"}
```

### Entity Training (BIO Format):
```json
{"tokens": ["I", "want", "chicken", "biryani"], "tags": ["O", "O", "B-product_name", "I-product_name"]}
{"tokens": ["deliver", "to", "Koramangala"], "tags": ["O", "O", "B-location"]}
```

### Tone Training (JSONL):
```json
{"text": "Thanks so much for the help!", "tone": "happy", "language": "en"}
{"text": "This is taking forever!", "tone": "frustrated", "language": "en"}
```

---

## 5. Auto-Learning Pipeline

### Daily Cron Job

```bash
# /etc/cron.d/nlu-retrain
0 2 * * * cd /app && npx ts-node scripts/nlu-auto-retrain.ts >> /var/log/nlu-retrain.log 2>&1
```

### Pipeline Steps:

1. **Import** - Pull new conversations from `conversation_messages`
2. **Analyze** - Check training data distribution
3. **Auto-Approve** - Approve samples with >95% confidence
4. **Export** - Generate JSONL training files
5. **Train** - Fine-tune IndicBERT if enough new samples
6. **Deploy** - Hot-swap model if accuracy improves

### Thresholds:

| Setting | Value | Description |
|---------|-------|-------------|
| `MIN_NEW_SAMPLES` | 50 | Samples required before retraining |
| `MIN_SAMPLES_PER_INTENT` | 100 | Target per intent |
| `MIN_CONFIDENCE_AUTO_APPROVE` | 0.95 | Auto-approve threshold |
| `MIN_ACCURACY_IMPROVEMENT` | 0.02 | 2% improvement required |

---

## 6. Database Schema

### nlu_training_data

```sql
CREATE TABLE nlu_training_data (
  id SERIAL PRIMARY KEY,
  text VARCHAR(1000) NOT NULL,
  intent VARCHAR(100) NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  entities JSONB DEFAULT '{}',
  tone VARCHAR(50),
  language VARCHAR(10) DEFAULT 'auto',
  source VARCHAR(50),
  review_status VARCHAR(20) DEFAULT 'pending',
  session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(text, intent)
);

-- Indexes
CREATE INDEX idx_nlu_training_intent ON nlu_training_data(intent);
CREATE INDEX idx_nlu_training_status ON nlu_training_data(review_status);
CREATE INDEX idx_nlu_training_created ON nlu_training_data(created_at);
```

### conversation_messages

```sql
CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  message TEXT,
  sender VARCHAR(20),
  platform VARCHAR(50),
  intent VARCHAR(100),
  confidence FLOAT,
  entities JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for training import
CREATE INDEX idx_conv_msg_sender ON conversation_messages(sender);
CREATE INDEX idx_conv_msg_intent ON conversation_messages(intent);
```

---

## 7. Model Architecture

### Current Setup

| Model | Purpose | Base | Samples | Accuracy |
|-------|---------|------|---------|----------|
| `indicbert_v5_enhanced` | Intent Classification | IndicBERTv2 | 1009 | 55% |
| `SLOTS_MODEL` | Entity Extraction | (To Train) | - | - |
| `TONE_MODEL` | Sentiment/Tone | (To Train) | - | - |

### Training Parameters

```python
# Intent Model
model = "ai4bharat/IndicBERTv2-MLM-Back-TLM"
epochs = 10
batch_size = 16
learning_rate = 2e-5
max_length = 128

# Entity Model (Token Classification)
model = "ai4bharat/IndicBERTv2-MLM-Back-TLM"
epochs = 15
batch_size = 8
learning_rate = 3e-5
max_length = 64
```

---

## 8. Monitoring & Metrics

### Key Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Total Training Samples | 5000+ | ~1000 |
| Samples per Intent | 100+ | varies |
| Intent Classification Accuracy | 80%+ | 55% |
| Entity Extraction F1 | 85%+ | - |
| Tone Classification Accuracy | 75%+ | - |
| Daily New Samples | 50+ | - |

### Health Check Endpoint

```bash
curl http://localhost:7010/healthz
```

Response:
```json
{
  "status": "healthy",
  "model": "indicbert_v5_enhanced",
  "intent_count": 25,
  "intent_loaded": true,
  "model_accuracy": 0.55
}
```

---

## 9. Next Steps (Priority Order)

### Immediate (This Week)
1. ✅ Deploy enhanced EntityExtractorService
2. ⏳ Set up auto-retrain cron job
3. ⏳ Add platform field to conversation logging

### Short-term (2 Weeks)
4. Train SLOTS_MODEL for entity extraction
5. Train TONE_MODEL for sentiment
6. Integrate Label Studio for human review

### Medium-term (1 Month)
7. Reach 5000+ training samples
8. Achieve 80%+ intent accuracy
9. Add language detection model

---

## 10. Commands Reference

```bash
# Export training data
cd /app && npx ts-node -e "
  const { NluTrainingPipelineService } = require('./dist/nlu/services/nlu-training-pipeline.service');
  // ... export
"

# Run auto-retrain
npx ts-node scripts/nlu-auto-retrain.ts

# Check training stats
psql -d headless_mangwale -c "
  SELECT intent, COUNT(*) as count, AVG(confidence) as avg_conf
  FROM nlu_training_data
  GROUP BY intent
  ORDER BY count DESC;
"

# Test NLU classification
curl -X POST http://localhost:7010/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "I want to order biryani"}'
```

---

## Summary

This pipeline ensures:
- ✅ **Every message** from every channel is captured
- ✅ **All entity types** are extracted (12+ types, 50+ food items)
- ✅ **Tone/sentiment** is analyzed for emotional context
- ✅ **Auto-learning** improves model over time
- ✅ **Quality control** via confidence thresholds and review
- ✅ **Scalable** with PostgreSQL and cron automation

**Data Flow**: User Message → Channel Handler → ConversationLogger → PostgreSQL → Auto-Import → Training Pipeline → IndicBERT → Improved Model
