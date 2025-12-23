#!/bin/bash

echo "🧪 Testing Mangwale Dashboard API Integration"
echo "=============================================="
echo ""

API_URL="http://100.121.40.69:3200"

echo "1️⃣  Testing Backend Health..."
curl -s "$API_URL/health" | jq -r '.status, .service'
echo ""

echo "2️⃣  Testing Gamification Settings API..."
response=$(curl -s "$API_URL/api/gamification/settings")
success=$(echo "$response" | jq -r '.success')
total=$(echo "$response" | jq -r '.meta.total')
echo "Success: $success"
echo "Total Settings: $total"
echo ""

echo "3️⃣  Testing CORS Headers..."
curl -s -I -H "Origin: http://100.121.40.69:3000" "$API_URL/api/gamification/settings" | grep -i "access-control"
echo ""

echo "4️⃣  Testing from Dashboard Container..."
docker exec mangwale-dashboard wget -q -O- "$API_URL/api/gamification/stats" 2>&1 | jq -r '.success, .data.gamesPlayed'
echo ""

echo "✅ All API tests complete!"
