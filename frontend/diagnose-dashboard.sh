#!/bin/bash

echo "🔍 Mangwale Dashboard Comprehensive Diagnosis"
echo "============================================="
echo ""

echo "📦 1. Docker Container Status"
docker ps --filter "name=mangwale-dashboard" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "🌐 2. Environment Variables in Container"
docker exec mangwale-dashboard env | grep "NEXT_PUBLIC" | sort
echo ""

echo "🔌 3. Backend API Accessibility"
echo "From host:"
curl -s --max-time 3 http://100.121.40.69:3200/health | jq -r '"\(.status) - \(.service)"' || echo "❌ Failed"
echo ""
echo "From container:"
docker exec mangwale-dashboard wget -q -O- --timeout=3 http://100.121.40.69:3200/health 2>&1 | jq -r '"\(.status) - \(.service)"' || echo "❌ Failed"
echo ""

echo "📊 4. Gamification API Test"
echo "Settings API:"
curl -s --max-time 3 http://100.121.40.69:3200/api/gamification/settings | jq -r '.success, .meta.total' || echo "❌ Failed"
echo ""

echo "🔒 5. CORS Headers Check"
curl -s -I -H "Origin: http://100.121.40.69:3000" \
  -H "Access-Control-Request-Method: GET" \
  http://100.121.40.69:3200/api/gamification/settings 2>&1 | grep -i "access-control"
echo ""

echo "📄 6. Dashboard Page Structure"
echo "Checking if gamification settings page exists..."
docker exec mangwale-dashboard ls -lh /app/src/app/admin/gamification/settings/page.tsx 2>&1
echo ""

echo "🚀 7. Next.js Compilation Status"
docker logs mangwale-dashboard --tail 5 2>&1 | grep -E "Ready|Compiling|GET"
echo ""

echo "✅ Diagnosis Complete!"
echo ""
echo "📝 Recommended Actions:"
echo "1. Open browser to: https://admin.mangwale.ai/admin/gamification/settings"
echo "2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "3. Open DevTools Console (F12) to see any errors"
echo "4. Check Network tab for failed API calls"
