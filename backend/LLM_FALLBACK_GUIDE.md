# LLM Fallback Chain - Configuration Guide

## Overview

The Mangwale AI system uses a **3-tier LLM fallback strategy** to ensure high availability:

```
vLLM (Local) → Cloud LLMs (OpenRouter/Groq/OpenAI) → Fallback Response
```

## Current Status ✅

### Tier 1: vLLM (Local) - **ACTIVE**
- **Model**: Qwen/Qwen2.5-7B-Instruct-AWQ
- **URL**: http://172.23.0.5:8002
- **Cost**: FREE (local inference)
- **Latency**: ~1-2 seconds
- **Status**: ✅ Running with retry logic for 404 errors

### Tier 2: Cloud LLMs - **CONFIGURED BUT NOT ENABLED**
Cloud providers will automatically activate when vLLM fails if API keys are configured.

#### Option A: OpenRouter (Recommended)
- **Models**: Access to 100+ models (Claude, GPT-4, Llama, etc.)
- **Cost**: Pay-per-use, cheapest rates
- **Setup**: Get API key from https://openrouter.ai
- **Environment Variable**: `OPENROUTER_API_KEY`

#### Option B: Groq (Fast & Cheap)
- **Models**: Llama 3.1, Mixtral, Gemma
- **Cost**: FREE tier available
- **Speed**: Fastest inference (< 500ms)
- **Setup**: Get API key from https://groq.com
- **Environment Variable**: `GROQ_API_KEY`

#### Option C: OpenAI (Most Reliable)
- **Models**: GPT-4, GPT-3.5-turbo
- **Cost**: $$$$ (expensive)
- **Setup**: Get API key from https://platform.openai.com
- **Environment Variable**: `OPENAI_API_KEY`

### Tier 3: Fallback Response - **ACTIVE**
When all LLM providers fail, returns:
> "I apologize, but I am temporarily unable to process your request. Please try again later."

## How to Enable Cloud Fallback

### Method 1: Using Environment Variables (Recommended)

Add to your Docker run command:

```bash
docker run -d \
  --name mangwale-ai-service \
  --network mangwale_ai_network \
  -p 3201:3200 \
  -e OPENROUTER_API_KEY="sk-or-v1-xxxxx" \
  -e GROQ_API_KEY="gsk_xxxxx" \
  -e OPENAI_API_KEY="sk-xxxxx" \
  # ... other environment variables
  mangwale-ai:latest
```

### Method 2: Using Docker Compose

```yaml
environment:
  - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
  - GROQ_API_KEY=${GROQ_API_KEY}
  - OPENAI_API_KEY=${OPENAI_API_KEY}
```

### Method 3: Using .env File

Create `/home/ubuntu/Devs/mangwale-ai/.env`:

```bash
# Cloud LLM API Keys
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Configure which providers to enable
ENABLED_LLM_PROVIDERS=groq,openrouter,openai
DEFAULT_CLOUD_PROVIDER=groq
```

## Testing the Fallback Chain

### Test 1: Normal Operation (vLLM working)
```bash
curl -X POST http://localhost:3201/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId": "+919999999999", "text": "hello"}'
```

Expected: vLLM responds successfully

### Test 2: Force Cloud Fallback (Stop vLLM)
```bash
# Stop vLLM container
docker stop mangwale_vllm

# Test request
curl -X POST http://localhost:3201/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId": "+919999999999", "text": "hello"}'

# Check logs for fallback
docker logs mangwale-ai-service 2>&1 | grep -E "vLLM failed|Attempting"
```

Expected logs:
```
[LlmService] Attempting vLLM (local)
[LlmService] vLLM failed: connect ECONNREFUSED
[LlmService] Attempting OpenRouter (cloud)  # If API key configured
[LlmService] Attempting Groq (cloud)        # If API key configured
```

### Test 3: Monitor Fallback in Production
```bash
# Watch live logs
docker logs -f mangwale-ai-service 2>&1 | grep -E "LlmService|vLLM|Cloud"
```

## Cost Comparison

| Provider | Model | Cost per 1M tokens | Latency | Availability |
|----------|-------|-------------------|---------|--------------|
| **vLLM (Local)** | Qwen 2.5-7B | $0.00 | 1-2s | High* |
| **Groq** | Llama 3.1-8B | $0.05 | 0.3s | Very High |
| **OpenRouter** | Claude 3 Haiku | $0.25 | 1s | Very High |
| **OpenRouter** | GPT-3.5-turbo | $0.50 | 1.5s | Very High |
| **OpenAI** | GPT-4 | $30.00 | 2-3s | Very High |

*vLLM availability depends on server stability; has known HTTP keep-alive bug requiring retries

## Recommended Configuration

For **production environments**:

```bash
# Primary: vLLM (local, free)
VLLM_URL=http://172.23.0.5:8002

# Backup 1: Groq (fast, cheap, free tier)
GROQ_API_KEY=gsk_xxxxx

# Backup 2: OpenRouter (many models, pay-per-use)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Enable both
ENABLED_LLM_PROVIDERS=groq,openrouter
```

For **development/testing**:
- vLLM only (no cloud keys needed)
- Free Groq tier for backup

## Monitoring & Alerts

### Check LLM Usage Statistics
```bash
# Coming soon - LLM usage tracking dashboard
curl http://localhost:3201/api/analytics/llm-usage
```

### Set Up Alerts
Monitor when cloud fallback is triggered frequently:
- vLLM failures > 10% → Investigate server issues
- Cloud LLM usage > $10/day → Check for abuse or scaling needs

## Troubleshooting

### vLLM 404 Errors
**Issue**: Intermittent 404 errors due to HTTP keep-alive bug
**Solution**: Already implemented - 3 automatic retries
**Alternative**: Restart vLLM: `docker restart mangwale_vllm`

### Cloud Provider Fails
**Issue**: "API key not configured"
**Solution**: Add environment variable with valid API key

**Issue**: "Rate limit exceeded"
**Solution**: 
- Groq: Wait or upgrade plan
- OpenRouter: Add credits
- OpenAI: Increase quota

### All Providers Fail
**Check**:
1. vLLM container running: `docker ps | grep vllm`
2. Cloud API keys valid: Check provider dashboard
3. Network connectivity: `curl https://api.groq.com/openai/v1/models`

## Files Modified

1. `src/llm/services/llm.service.ts` - Main fallback orchestration
2. `src/llm/services/vllm.service.ts` - Local vLLM with retry logic
3. `src/llm/services/cloud-llm.service.ts` - Cloud provider integrations
4. `src/llm/llm.module.ts` - Module configuration

## Next Steps

1. **Add API Keys**: Configure at least one cloud provider (Groq recommended)
2. **Test Fallback**: Stop vLLM and verify cloud providers activate
3. **Monitor Costs**: Track cloud LLM usage in production
4. **Upgrade vLLM**: Consider upgrading to v0.5.0+ to fix HTTP bugs

---

**Status**: ✅ Fully implemented and ready for cloud API keys
**Last Updated**: November 14, 2025
