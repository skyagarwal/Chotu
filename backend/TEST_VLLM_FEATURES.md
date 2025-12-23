# vLLM Advanced Features Testing Guide

## Overview
This document provides test examples for all the advanced features now integrated into our vLLM service with Qwen2.5-7B-Instruct-AWQ.

## Features Implemented ✅

### 1. Basic Chat Completion ✅
### 2. Streaming Responses ✅
### 3. Function Calling ✅ (DTO support - ready to test)
### 4. Guided JSON Decoding ✅
### 5. Advanced Sampling Parameters ✅
### 6. Stop Sequences ✅
### 7. Logprobs ✅

---

## 1. Basic Chat Completion

### Test Command
```bash
curl -X POST http://localhost:3000/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is TypeScript?"}
    ],
    "provider": "vllm",
    "temperature": 0.7,
    "maxTokens": 500
  }'
```

### Expected Response
```json
{
  "id": "cmpl-xxx",
  "model": "Qwen/Qwen2.5-7B-Instruct-AWQ",
  "provider": "vllm",
  "content": "TypeScript is a strongly typed programming language...",
  "finishReason": "stop",
  "usage": {
    "promptTokens": 15,
    "completionTokens": 100,
    "totalTokens": 115
  },
  "processingTimeMs": 1250,
  "estimatedCost": 0
}
```

---

## 2. Streaming Responses

### Test Command
```bash
curl -N -X POST http://localhost:3000/llm/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Count to 10"}
    ],
    "provider": "vllm",
    "stream": true,
    "maxTokens": 100
  }'
```

### Expected Output (Server-Sent Events)
```
data: {"id":"cmpl-xxx","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"cmpl-xxx","choices":[{"index":0,"delta":{"content":"1"},"finish_reason":null}]}

data: {"id":"cmpl-xxx","choices":[{"index":0,"delta":{"content":","},"finish_reason":null}]}

data: {"id":"cmpl-xxx","choices":[{"index":0,"delta":{"content":" 2"},"finish_reason":null}]}

...

data: [DONE]
```

---

## 3. Guided JSON Decoding

### Test Command (JSON Mode)
```bash
curl -X POST http://localhost:3000/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Extract information about this person: John Doe, 30 years old, software engineer living in San Francisco. Return JSON with name, age, profession, location."
      }
    ],
    "provider": "vllm",
    "responseFormat": {"type": "json_object"},
    "guidedJson": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "age": {"type": "number"},
        "profession": {"type": "string"},
        "location": {"type": "string"}
      },
      "required": ["name", "age", "profession", "location"]
    },
    "maxTokens": 200
  }'
```

### Expected Response
```json
{
  "id": "cmpl-xxx",
  "model": "Qwen/Qwen2.5-7B-Instruct-AWQ",
  "provider": "vllm",
  "content": "{\"name\": \"John Doe\", \"age\": 30, \"profession\": \"software engineer\", \"location\": \"San Francisco\"}",
  "finishReason": "stop",
  "usage": {...},
  "processingTimeMs": 800
}
```

---

## 4. Advanced Sampling Parameters

### Test Command (Creative Writing)
```bash
curl -X POST http://localhost:3000/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a creative short story about a robot learning to paint."}
    ],
    "provider": "vllm",
    "temperature": 0.9,
    "topP": 0.95,
    "topK": 50,
    "repetitionPenalty": 1.1,
    "presencePenalty": 0.5,
    "frequencyPenalty": 0.5,
    "maxTokens": 500
  }'
```

### Parameters Explained
- **temperature**: 0.9 (more creative/random)
- **topP**: 0.95 (nucleus sampling)
- **topK**: 50 (consider top 50 tokens)
- **repetitionPenalty**: 1.1 (discourage repetition)
- **presencePenalty**: 0.5 (encourage topic diversity)
- **frequencyPenalty**: 0.5 (discourage frequent words)

---

## 5. Stop Sequences

### Test Command
```bash
curl -X POST http://localhost:3000/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "List 3 programming languages:\n1."}
    ],
    "provider": "vllm",
    "stop": ["\n4.", "END"],
    "maxTokens": 200
  }'
```

### Expected Behavior
Model will stop generating when it encounters "\n4." or "END", ensuring it only lists 3 items.

---

## 6. Function Calling (Ready to Test)

### Test Command
```bash
curl -X POST http://localhost:3000/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the weather like in Mumbai today?"}
    ],
    "provider": "vllm",
    "functions": [
      {
        "name": "get_weather",
        "description": "Get the current weather for a location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city name, e.g., Mumbai, Delhi"
            },
            "unit": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"],
              "description": "Temperature unit"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "maxTokens": 200
  }'
```

### Expected Response with Function Call
```json
{
  "id": "cmpl-xxx",
  "model": "Qwen/Qwen2.5-7B-Instruct-AWQ",
  "provider": "vllm",
  "content": "",
  "finishReason": "function_call",
  "functionCall": {
    "name": "get_weather",
    "arguments": "{\"location\": \"Mumbai\", \"unit\": \"celsius\"}"
  },
  "usage": {...}
}
```

---

## 7. Logprobs (Token Probability Analysis)

### Test Command
```bash
curl -X POST http://localhost:3000/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "The capital of India is"}
    ],
    "provider": "vllm",
    "logprobs": true,
    "topLogprobs": 5,
    "maxTokens": 10
  }'
```

### Expected Response (with logprobs)
```json
{
  "id": "cmpl-xxx",
  "model": "Qwen/Qwen2.5-7B-Instruct-AWQ",
  "provider": "vllm",
  "content": "New Delhi",
  "finishReason": "stop",
  "logprobs": {
    "content": [
      {
        "token": "New",
        "logprob": -0.001,
        "top_logprobs": [
          {"token": "New", "logprob": -0.001},
          {"token": "the", "logprob": -6.5},
          ...
        ]
      },
      {
        "token": " Delhi",
        "logprob": -0.0001,
        "top_logprobs": [...]
      }
    ]
  },
  "usage": {...}
}
```

---

## 8. Long Context Testing (128K tokens)

### Test Command (4K context)
```bash
# Create a file with long text
cat > long_context.txt << 'EOF'
[Long article or document - 4000+ words]
EOF

# Test with long context
curl -X POST http://localhost:3000/llm/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"Summarize this document in 3 paragraphs: $(cat long_context.txt)\"}
    ],
    \"provider\": \"vllm\",
    \"maxTokens\": 500
  }"
```

### Note on Context Length
- Current vLLM config: `--max-model-len 4096` (4K tokens)
- Model capability: 131,072 tokens (128K) with YaRN
- To test long context, update docker-compose.ai.yml:
  ```yaml
  command: >
    --model Qwen/Qwen2.5-7B-Instruct-AWQ
    --quantization awq
    --gpu-memory-utilization 0.9
    --max-model-len 32768  # 32K context
  ```

---

## Performance Benchmarks

### Expected Latency (RTX 3060 12GB)
- **Basic Chat (100 tokens)**: ~500-1000ms
- **Streaming First Token**: ~200-400ms
- **Long Context (4K tokens)**: ~2-4s
- **Function Calling**: ~600-1200ms
- **JSON Mode**: ~800-1500ms

### Throughput
- **Tokens/second**: ~80-120 tokens/s
- **Concurrent Requests**: 2-4 (with batching)

---

## Troubleshooting

### 1. vLLM Not Responding
```bash
# Check if vLLM is running
docker ps | grep vllm

# Check vLLM logs
docker logs mangwale-ai-vllm-1 --tail 100

# Test vLLM directly
curl http://localhost:8002/v1/models
```

### 2. Out of Memory Errors
```yaml
# Reduce GPU memory utilization in docker-compose.ai.yml
--gpu-memory-utilization 0.7  # From 0.9 to 0.7

# Reduce max model length
--max-model-len 2048  # From 4096
```

### 3. Slow Streaming
```bash
# Check network buffering (nginx/proxy)
# Ensure X-Accel-Buffering: no header is set

# Test streaming directly to vLLM
curl -N http://localhost:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen2.5-7B-Instruct-AWQ","messages":[{"role":"user","content":"Count to 10"}],"stream":true}'
```

---

## Next Steps

1. ✅ **Implement Enhanced vLLM Service** - COMPLETED
2. ✅ **Add Streaming Support** - COMPLETED
3. ✅ **Update DTOs** - COMPLETED
4. ✅ **Add Controller Endpoint** - COMPLETED
5. 📋 **Test All Features** - READY TO TEST
6. 📋 **Performance Benchmarking**
7. 📋 **Integration with mangwale-ai Modules**
8. 📋 **Production Deployment**

---

## Additional Resources

- **Model Documentation**: `/home/ubuntu/Devs/mangwale-ai/QWEN2.5-7B-INTEGRATION.md`
- **HuggingFace Model Card**: https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-AWQ
- **vLLM API Docs**: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
- **Source Code**: `/home/ubuntu/Devs/mangwale-ai/src/llm/`
