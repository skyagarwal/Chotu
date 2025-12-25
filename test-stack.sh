#!/bin/bash
# Mangwale AI Stack Testing Script
# Run this to verify all components are working

echo "=============================================="
echo "🧪 MANGWALE AI STACK TEST"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC}: $1"; }

echo "1️⃣ BACKEND HEALTH"
echo "---"
BACKEND_HEALTH=$(curl -s http://localhost:3200/health 2>&1)
if echo "$BACKEND_HEALTH" | grep -q '"status":"ok"'; then
  pass "Backend is healthy"
  echo "   Response: $(echo $BACKEND_HEALTH | head -c 100)..."
else
  fail "Backend health check failed"
  echo "   Response: $BACKEND_HEALTH"
fi
echo ""

echo "2️⃣ vLLM SERVICE"
echo "---"
VLLM_MODELS=$(curl -s http://localhost:8002/v1/models 2>&1)
if echo "$VLLM_MODELS" | grep -q 'Qwen'; then
  pass "vLLM is running with Qwen model"
  echo "   Model: $(echo $VLLM_MODELS | grep -o '"id":"[^"]*"' | head -1)"
else
  fail "vLLM not responding or model not loaded"
fi

VLLM_TEST=$(curl -s -X POST http://localhost:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen2.5-7B-Instruct-AWQ","messages":[{"role":"user","content":"hi"}],"max_tokens":20}' 2>&1)
if echo "$VLLM_TEST" | grep -q '"choices"'; then
  pass "vLLM chat completion working"
else
  fail "vLLM chat completion failed"
  echo "   Response: $(echo $VLLM_TEST | head -c 200)"
fi
echo ""

echo "3️⃣ NLU SERVICE (IndicBERT)"
echo "---"
NLU_TEST=$(curl -s -X POST http://localhost:7010/classify \
  -H "Content-Type: application/json" \
  -d '{"text":"order food"}' 2>&1)
if echo "$NLU_TEST" | grep -q '"intent"'; then
  INTENT=$(echo "$NLU_TEST" | grep -o '"intent":"[^"]*"' | cut -d'"' -f4)
  CONF=$(echo "$NLU_TEST" | grep -o '"intent_conf":[0-9.]*' | cut -d':' -f2)
  pass "NLU classification working"
  echo "   Text: 'order food' → Intent: $INTENT (conf: $CONF)"
else
  fail "NLU service not responding"
fi
echo ""

echo "4️⃣ ASR SERVICE (Mercury Whisper)"
echo "---"
ASR_HEALTH=$(curl -s http://localhost:3200/api/asr/health 2>&1)
if echo "$ASR_HEALTH" | grep -q '"status":"ok"'; then
  PROVIDERS=$(echo "$ASR_HEALTH" | grep -o '"providers":\[[^]]*\]')
  pass "ASR service healthy"
  echo "   Providers: $PROVIDERS"
else
  warn "ASR health check failed - may still work via Mercury"
fi

MERCURY_HEALTH=$(timeout 3 curl -s http://192.168.0.151:7001/health 2>&1)
if echo "$MERCURY_HEALTH" | grep -q '"status":"healthy"'; then
  pass "Mercury ASR server healthy"
else
  fail "Mercury ASR server not reachable"
fi
echo ""

echo "5️⃣ TTS SERVICE"
echo "---"
TTS_TEST=$(curl -s -X POST http://localhost:3200/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"hello","language":"en"}' 2>&1 | head -c 200)
if echo "$TTS_TEST" | grep -q 'audioData'; then
  pass "TTS synthesis working"
else
  fail "TTS service not responding"
  echo "   Response: $TTS_TEST"
fi
echo ""

echo "6️⃣ CHAT API"
echo "---"
CHAT_TEST=$(curl -s -X POST http://localhost:3200/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-script-'$(date +%s)'", "message": "hello"}' 2>&1)
if echo "$CHAT_TEST" | grep -q '"success":true'; then
  RESPONSE=$(echo "$CHAT_TEST" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
  pass "Chat API responding"
  echo "   Response: ${RESPONSE:0:80}..."
else
  fail "Chat API not responding"
  echo "   Response: $CHAT_TEST"
fi
echo ""

echo "7️⃣ FRONTEND"
echo "---"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/chat 2>&1)
if [ "$FRONTEND_STATUS" = "200" ]; then
  pass "Frontend serving chat page"
else
  fail "Frontend not responding (HTTP $FRONTEND_STATUS)"
fi
echo ""

echo "=============================================="
echo "📊 TEST SUMMARY"
echo "=============================================="
echo ""
echo "If all tests pass, the Mangwale AI stack is operational."
echo ""
echo "🔊 Voice Testing:"
echo "   1. Open http://192.168.0.156:3005/chat in browser"
echo "   2. Click the microphone button"
echo "   3. Speak in Hindi or English"
echo "   4. Click again to stop and send"
echo ""
echo "📞 Voice Call Mode:"
echo "   1. Click the phone button to enable"
echo "   2. Bot responses will auto-play via TTS"
echo ""
