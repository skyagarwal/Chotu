#!/bin/bash

# Test the chat endpoint via WebSocket simulation
curl -X POST 'http://localhost:3200/webhook/whatsapp' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "+919999999999",
    "text": "hello",
    "type": "text"
  }' | jq .

echo ""
echo "---"
echo ""

# Test with "game" message
curl -X POST 'http://localhost:3200/webhook/whatsapp' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "+919999999999",
    "text": "how can I earn money",
    "type": "text"
  }' | jq .
