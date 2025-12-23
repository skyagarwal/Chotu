# AI Service Monitoring Guide

## Quick Health Checks

### 1. Check All Services Status
```bash
# Check Docker containers
docker ps | grep -E "(mangwale|vllm|nlu|postgres|redis)"

# Expected output:
# - mangwale-ai-service (port 3201:3000)
# - mangwale_vllm (port 8002)
# - mangwale_nlu (port 7010)
# - postgres (port 5432)
# - redis (port 6379)
```

### 2. Test vLLM Health
```bash
# Direct vLLM test
curl -X POST http://172.23.0.5:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen2.5-7B-Instruct-AWQ","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'

# Expected: JSON response with completion
```

### 3. Test NLU Health
```bash
# Direct NLU test
curl -X POST http://172.23.0.4:7010/classify \
  -H "Content-Type: application/json" \
  -d '{"text":"send a parcel"}'

# Expected: {"intent":"default","confidence":0.0} (until trained)
```

### 4. Test Complete Flow
```bash
# End-to-end test
curl -X POST http://localhost:3201/chat/send \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"+916666555544","text":"send a parcel"}'

# Expected: {"response":"Hi there! Let's get started...","intent":"create_parcel_order"}
```

---

## Real-Time Monitoring

### Watch Live Logs
```bash
# All application logs
docker logs -f mangwale-ai-service

# Only AI metrics
docker logs -f mangwale-ai-service 2>&1 | grep "AiMetrics"

# Only vLLM requests
docker logs -f mangwale-ai-service 2>&1 | grep "vLLM Request"

# Only errors
docker logs -f mangwale-ai-service 2>&1 | grep -E "(ERROR|error)"

# Intent classification
docker logs -f mangwale-ai-service 2>&1 | grep -E "(Intent|NLU|LLM extracted)"
```

### Check Log Files
```bash
# AI metrics logs
tail -f /home/ubuntu/Devs/mangwale-ai/logs/ai-metrics-*.log

# All logs in directory
ls -lh /home/ubuntu/Devs/mangwale-ai/logs/

# Search for specific patterns
grep "404" /home/ubuntu/Devs/mangwale-ai/logs/*.log
grep "vLLM Request Completed" /home/ubuntu/Devs/mangwale-ai/logs/*.log
```

---

## Performance Metrics

### vLLM Performance
```bash
# Get average latency
docker logs mangwale-ai-service 2>&1 | grep "Total Time:" | awk '{print $7}' | sed 's/ms//' | awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'

# Get throughput stats
docker logs mangwale-ai-service 2>&1 | grep "Throughput:" | awk '{print $7}' | awk '{sum+=$1; count++} END {print "Avg:", sum/count, "tokens/sec"}'

# Count successful vs failed requests
echo "Success: $(docker logs mangwale-ai-service 2>&1 | grep -c 'vLLM Request Completed')"
echo "Failed: $(docker logs mangwale-ai-service 2>&1 | grep -c 'vLLM request failed')"
```

### NLU Performance
```bash
# Average NLU latency
docker logs mangwale-ai-service 2>&1 | grep "AiMetrics:nlu" | grep -oP '\d+\.\d+ms' | sed 's/ms//' | awk '{sum+=$1; count++} END {print "Avg NLU:", sum/count, "ms"}'

# Intent classification success rate
docker logs mangwale-ai-service 2>&1 | grep -E "(IndicBERT|LLM classified)" | tail -20
```

### Flow Execution Stats
```bash
# Count auto-executions
docker logs mangwale-ai-service 2>&1 | grep -c "Auto-executing next state"

# See execution chains
docker logs mangwale-ai-service 2>&1 | grep "Auto-executing" | tail -20
```

---

## Debugging Issues

### vLLM 404 Errors
```bash
# Check for 404 errors
docker logs mangwale-ai-service 2>&1 | grep "404"

# Check retry attempts
docker logs mangwale-ai-service 2>&1 | grep "Retry attempt"

# Verify HTTP headers
docker logs mangwale-ai-service 2>&1 | grep -A 5 "vLLM Request Started"
```

### Slow Response Times
```bash
# Find slow requests (>3s)
docker logs mangwale-ai-service 2>&1 | grep "Total Time:" | awk '$7 > 3000 {print}'

# Check what's taking time
docker logs mangwale-ai-service 2>&1 | grep -E "(API Latency|Processing Time)" | tail -20
```

### Intent Classification Issues
```bash
# See all intent classifications
docker logs mangwale-ai-service 2>&1 | grep "LLM extracted:" | tail -20

# Check confidence scores
docker logs mangwale-ai-service 2>&1 | grep "confidence" | tail -20

# See fallback triggers
docker logs mangwale-ai-service 2>&1 | grep "below threshold"
```

### Database Connection Issues
```bash
# Check database logs
docker logs mangwale-ai-service 2>&1 | grep -E "(Prisma|PostgreSQL|database)"

# Test database connection
docker exec mangwale-ai-service npx prisma db push --skip-generate
```

---

## Alerts & Thresholds

### Performance Thresholds
- ✅ **vLLM latency**: < 3 seconds (normal: 1.8s)
- ✅ **NLU latency**: < 100ms (normal: 50ms)
- ✅ **Total flow latency**: < 5 seconds (normal: 2.5s)
- ✅ **vLLM throughput**: > 40 tokens/sec (normal: 44)

### Error Rate Thresholds
- ✅ **vLLM success rate**: > 95% (current: 100%)
- ✅ **NLU success rate**: > 99% (current: 100%)
- ✅ **Flow completion rate**: > 90% (current: 100%)

### What to Watch For
- ⚠️ vLLM 404 errors → Check HTTP connection settings
- ⚠️ NLU timeouts → Check IndicBERT container
- ⚠️ Flow stuck → Check state transitions in logs
- ⚠️ Database errors → Check schema and permissions

---

## Maintenance Commands

### Restart Services
```bash
# Restart main service
docker restart mangwale-ai-service

# Restart vLLM
docker restart mangwale_vllm

# Restart NLU
docker restart mangwale_nlu

# Restart all
docker restart mangwale-ai-service mangwale_vllm mangwale_nlu
```

### Clear Logs
```bash
# Clear Docker logs
docker logs mangwale-ai-service --since 1h > /tmp/logs-backup.txt
docker rm -f mangwale-ai-service && docker run -d ... # restart

# Clear log files
rm -f /home/ubuntu/Devs/mangwale-ai/logs/*.log

# Rotate logs
mv /home/ubuntu/Devs/mangwale-ai/logs/ai-metrics.log \
   /home/ubuntu/Devs/mangwale-ai/logs/ai-metrics-$(date +%Y%m%d).log
```

### Rebuild & Redeploy
```bash
cd /home/ubuntu/Devs/mangwale-ai

# Build
npm run build
docker build -t mangwale-ai:latest .

# Stop old
docker stop mangwale-ai-service
docker rm mangwale-ai-service

# Deploy new
docker run -d \
  --name mangwale-ai-service \
  --network mangwale_ai_network \
  -p 3201:3000 \
  -v /home/ubuntu/Devs/mangwale-ai/logs:/app/logs \
  -e PORT=3000 \
  -e DATABASE_URL="postgresql://mangwale_config:config_secure_pass_2024@0be38ce3e675_mangwale_postgres:5432/headless_mangwale?schema=public" \
  -e REDIS_HOST=172.17.0.1 \
  -e REDIS_PORT=6379 \
  -e REDIS_DB=1 \
  -e VLLM_URL=http://172.23.0.5:8002 \
  -e NLU_ENDPOINT=http://172.23.0.4:7010 \
  -e NLU_AI_ENABLED=true \
  -e NLU_LLM_FALLBACK_ENABLED=true \
  -e LOG_LEVEL=debug \
  mangwale-ai:latest

# Verify
sleep 5 && docker logs mangwale-ai-service 2>&1 | tail -20
```

---

## Metrics Collection Script

Save as `check-ai-metrics.sh`:
```bash
#!/bin/bash

echo "=== Mangwale AI Service Health Check ==="
echo ""

# Container status
echo "📦 Container Status:"
docker ps --filter "name=mangwale" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# vLLM metrics
echo "🤖 vLLM Metrics (last 10 requests):"
VLLM_COUNT=$(docker logs mangwale-ai-service 2>&1 | grep -c "vLLM Request Completed")
VLLM_ERRORS=$(docker logs mangwale-ai-service 2>&1 | grep -c "vLLM request failed")
VLLM_AVG=$(docker logs mangwale-ai-service 2>&1 | grep "Total Time:" | tail -10 | awk '{print $7}' | sed 's/ms//' | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
echo "  Completed: $VLLM_COUNT"
echo "  Failed: $VLLM_ERRORS"
echo "  Avg Latency: ${VLLM_AVG}ms"
echo ""

# NLU metrics
echo "🧠 NLU Metrics:"
NLU_COUNT=$(docker logs mangwale-ai-service 2>&1 | grep -c "AiMetrics:nlu")
NLU_AVG=$(docker logs mangwale-ai-service 2>&1 | grep "AiMetrics:nlu" | tail -10 | grep -oP '\d+\.\d+ms' | sed 's/ms//' | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
echo "  Requests: $NLU_COUNT"
echo "  Avg Latency: ${NLU_AVG}ms"
echo ""

# Flow execution
echo "🔄 Flow Execution:"
FLOW_COUNT=$(docker logs mangwale-ai-service 2>&1 | grep -c "Flow started:")
AUTO_EXEC=$(docker logs mangwale-ai-service 2>&1 | grep -c "Auto-executing")
echo "  Flows Started: $FLOW_COUNT"
echo "  Auto-Executions: $AUTO_EXEC"
echo ""

# Recent errors
echo "❌ Recent Errors (last 5):"
docker logs mangwale-ai-service 2>&1 | grep "ERROR" | tail -5
echo ""

echo "✅ Health check complete"
```

Make executable:
```bash
chmod +x check-ai-metrics.sh
./check-ai-metrics.sh
```

---

## Troubleshooting Flowchart

```
Issue: Slow responses
  ├─> Check vLLM latency in logs
  │   ├─> If >3s → vLLM overloaded, check GPU
  │   └─> If <2s → Issue elsewhere
  ├─> Check NLU latency
  │   ├─> If >100ms → NLU service slow
  │   └─> If <100ms → NLU OK
  └─> Check flow execution logs
      └─> Count auto-executions

Issue: vLLM 404 errors
  ├─> Check if "Connection: close" header present
  ├─> Check HTTP agent settings (keepAlive: false)
  ├─> Check retry logic working
  └─> Restart vLLM container

Issue: Flow stuck
  ├─> Check current state in logs
  ├─> Check last auto-execution
  ├─> Verify state transitions
  └─> Check executor errors

Issue: Intent misclassification
  ├─> Check IndicBERT confidence
  ├─> Check LLM fallback triggered
  ├─> Verify LLM extracted intent
  └─> Check heuristics fallback
```

---

## Production Checklist

Before going live:
- [ ] All Docker containers healthy
- [ ] vLLM 100% success rate (test 20+ requests)
- [ ] NLU responding < 100ms
- [ ] Complete flow executing end-to-end
- [ ] Logs directory writable
- [ ] Database schema migrated
- [ ] Redis sessions working
- [ ] Cloud LLM API keys configured (optional)
- [ ] Monitoring script running
- [ ] Alert thresholds configured
- [ ] Backup & recovery plan documented

---

## Support & Escalation

### Log Collection for Support
```bash
# Collect comprehensive logs
docker logs mangwale-ai-service > mangwale-ai-$(date +%Y%m%d-%H%M%S).log 2>&1
docker logs mangwale_vllm > vllm-$(date +%Y%m%d-%H%M%S).log 2>&1
docker logs mangwale_nlu > nlu-$(date +%Y%m%d-%H%M%S).log 2>&1

# Package all logs
tar -czf mangwale-logs-$(date +%Y%m%d-%H%M%S).tar.gz \
  mangwale-ai-*.log \
  vllm-*.log \
  nlu-*.log \
  /home/ubuntu/Devs/mangwale-ai/logs/*.log
```

### Emergency Rollback
```bash
# Rollback to previous working image
docker stop mangwale-ai-service
docker rm mangwale-ai-service
docker run -d --name mangwale-ai-service ... mangwale-ai:previous

# Or restart with known-good configuration
docker restart mangwale-ai-service mangwale_vllm mangwale_nlu
```
