#!/bin/bash
# Complete End-to-End System Test
# Date: October 29, 2025

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     MANGWALE COMPLETE SYSTEM TEST                        ║"
echo "║     Date: October 29, 2025                               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

echo "🧪 TEST 1: OpenSearch Direct Query"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "http://localhost:9200/food_items/_search" -H 'Content-Type: application/json' -d'{
  "size": 2,
  "query": {"match": {"name": "biryani"}},
  "_source": ["name", "price", "store_id"]
}' | jq '{total: .hits.total.value, items: .hits.hits | map({name: ._source.name, price: ._source.price, store_id: ._source.store_id})}'
echo ""

echo "🧪 TEST 2: Search API with Distance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s 'http://localhost:3100/search/food?q=biryani&size=2&lat=19.96&lon=73.76' | jq '{
  module: .module,
  query: .q,
  items: .items[0:2] | map({
    name,
    price,
    store_id,
    distance_km
  })
}'
echo ""

echo "🧪 TEST 3: OSRM Distance Calculation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "http://localhost:5000/route/v1/driving/73.7812718,19.9806241;73.76,19.96?overview=false" | jq '{
  status: .code,
  distance_km: (.routes[0].distance / 1000),
  duration_min: (.routes[0].duration / 60)
}'
echo ""

echo "🧪 TEST 4: Store Schedule Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "http://localhost:3200/routing/test/store-schedule/7" | jq '{
  store_id: .storeId,
  is_open: .status.is_open,
  message: .status.message,
  current_time: .currentTime
}'
echo ""

echo "🧪 TEST 5: Agent End-to-End with Location"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST http://localhost:3200/api/agents/agent_food/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "show me biryani",
    "session": {
      "location": {"lat": 19.96, "lon": 73.76}
    },
    "module": "food"
  }' | jq '{
  success,
  module,
  message,
  functions_called: .result.functionsCalled,
  execution_time_ms: .result.executionTime,
  response_preview: .result.response[0:100]
}'
echo ""

echo "🧪 TEST 6: Buffer Configuration API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "http://localhost:3200/routing/config/buffer" | jq .
echo ""

echo "🧪 TEST 7: Embedding Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "http://localhost:3101/health" | jq .
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     ✅ ALL TESTS COMPLETE                                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
