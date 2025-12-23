#!/bin/bash
echo "=== Testing NLU Integration with Real IndicBERT ==="
echo ""

echo "1. Testing basic classification (English)"
curl -s -X POST http://localhost:3200/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "I want to order pizza"}' | jq '.'

echo ""
echo "2. Testing Hinglish (should trigger LLM fallback if confidence low)"
curl -s -X POST http://localhost:3200/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "mera order kaha hai yaar"}' | jq '.'

echo ""
echo "3. Testing angry tone (should detect urgency)"
curl -s -X POST http://localhost:3200/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "This is TERRIBLE service!! Where is my order??"}' | jq '.'

echo ""
echo "4. Testing ambiguous query (should use LLM)"
curl -s -X POST http://localhost:3200/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "wheres my stuff"}' | jq '.'

echo ""
echo "=== NLU Integration Test Complete ==="
