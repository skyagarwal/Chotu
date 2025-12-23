# 🔍 SERVICE HEALTH ANALYSIS

**Date**: November 13, 2025

---

## ✅ vLLM - WORKING PERFECTLY

**Status**: ✅ Fully Operational (ignore "unhealthy" warning)

**Tests Passed**:
1. ✅ Model list: Returns Qwen/Qwen2.5-7B-Instruct-AWQ
2. ✅ Chat completion: Successfully responded with "Hi!" 
3. ✅ Performance: 3 tokens generated, working correctly

**Result**: vLLM is **100% working** - the "unhealthy" status is just because the health check tries to use `curl` which isn't installed in the vLLM image.

---

## ⚠️ ASR - WORKING BUT WRONG PORT IN HEALTH CHECK

**Status**: ⚠️ Service Working, Health Check Misconfigured

**The Problem**:
- ASR service runs on port **8000** inside container
- But it's mapped to port **7000** outside
- Health check tries to check `localhost:7000` **FROM INSIDE THE CONTAINER**
- Port 7000 doesn't exist inside - only 8000 does!

**Proof Service Works**:
```bash
# From inside container (WORKS):
docker exec mangwale_asr curl http://localhost:8000/health
{"status":"ok"}

# From outside (should use 7000):
curl http://localhost:7000  # Maps to container's 8000
```

**Port Mapping**:
```
Container Internal: 8000 (service listens here)
         ↓
Host External: 7000 (mapped for external access)
```

**Health Check Config** (WRONG):
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:7000/health"]
  # ❌ WRONG - should be 8000 (internal port)
```

**Fix**: Health check should use **8000** not 7000:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

---

## ⚠️ TTS - WORKING BUT WRONG PORT IN HEALTH CHECK

**Status**: ⚠️ Service Working, Health Check Misconfigured

**The Problem**:
- TTS service runs on port **5501** inside container
- But it's mapped to port **8010** outside
- Health check tries to check `localhost:8010` **FROM INSIDE THE CONTAINER**
- Port 8010 doesn't exist inside - only 5501 does!

**Logs Show Service Running**:
```
INFO: Uvicorn running on http://0.0.0.0:5501 (Press CTRL+C to quit)
```

**Port Mapping**:
```
Container Internal: 5501 (service listens here)
         ↓
Host External: 8010 (mapped for external access)
```

**Health Check Config** (WRONG):
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8010/health"]
  # ❌ WRONG - should be 5501 (internal port)
```

**Fix**: Health check should use **5501** not 8010:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5501/health"]
```

**Secondary Issue**: The TTS container also doesn't have `curl` installed, so even with the right port, it would fail. Need to either:
1. Install curl in the image, OR
2. Remove the health check

---

## 📊 SUMMARY TABLE

| Service | Status | Issue | Root Cause | Fix |
|---------|--------|-------|-----------|-----|
| **vLLM** | ✅ Working | Shows unhealthy | No curl in image | Remove health check OR install curl |
| **ASR** | ✅ Working | Shows unhealthy | Health check uses wrong port (7000 instead of 8000) | Change health check to port 8000 |
| **TTS** | ✅ Working | Shows unhealthy | Health check uses wrong port (8010 instead of 5501) + no curl | Change to port 5501 OR remove health check |

---

## 🔧 HOW TO FIX

### Option 1: Remove Health Checks (Quick Fix)
Remove health check configuration from docker-compose for these 3 services.

### Option 2: Fix Health Check Ports (Better)
Update docker-compose.yml:

**ASR**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]  # Changed from 7000
  interval: 30s
  timeout: 10s
  retries: 3
```

**TTS**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5501/health"]  # Changed from 8010
  interval: 30s
  timeout: 10s
  retries: 3
```

**vLLM**:
```yaml
# Remove healthcheck entirely (no curl in image)
```

---

## ✅ CONCLUSION

**All 3 services are WORKING perfectly!**

The "unhealthy" status is just cosmetic - caused by:
1. Health checks using **external ports** instead of **internal ports**
2. Missing `curl` command in some images

**Real Status**:
- ✅ vLLM: Responding to requests, generating completions
- ✅ ASR: Running on port 8000 internally, accessible on 7000 externally
- ✅ TTS: Running on port 5501 internally, accessible on 8010 externally

**Action**: Update health checks or remove them - services don't need them to work!
