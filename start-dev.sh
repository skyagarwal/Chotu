#!/bin/bash

set -e

echo "🚀 Starting Mangwale AI Development Environment"
echo ""

# Stop old containers
docker stop mangwale_ai_dev mangwale_dashboard_dev 2>/dev/null || true
docker rm mangwale_ai_dev mangwale_dashboard_dev 2>/dev/null || true

# Network setup
docker network create mangwale-dev 2>/dev/null || true
docker network create unified_network 2>/dev/null || true

# Start Backend (using existing image)
echo "📦 Starting Backend (production build with src mounted for reference)..."
docker run -d \
  --name mangwale_ai_dev \
  --network mangwale-dev \
  --network unified_network \
  -p 3200:3200 \
  -p 9229:9229 \
  -v "$(pwd)/backend/src:/readonly/src:ro" \
  -e NODE_ENV=production \
  -e PORT=3200 \
  -e REDIS_HOST=mangwale_redis \
  -e POSTGRES_HOST=mangwale_postgres \
  mangwale-ai-mangwale-ai:latest

echo "✅ Backend: http://localhost:3200 (debug: 9229)"

# Start Frontend (using node image like production)
echo "📦 Starting Frontend (fast refresh)..."
docker run -d \
  --name mangwale_dashboard_dev \
  --network unified_network \
  -p 3005:3005 \
  -v "$(pwd)/frontend:/app" \
  -v /app/node_modules \
  -w /app \
  -e NODE_ENV=development \
  -e PORT=3005 \
  -e NEXT_TELEMETRY_DISABLED=1 \
  node:20-alpine \
  sh -c "npm install && npm run dev -- -p 3005"

echo "✅ Frontend: http://localhost:3005"
echo ""
echo "📝 View logs:"
echo "   docker logs -f mangwale_ai_dev"
echo "   docker logs -f mangwale_dashboard_dev"
echo ""
echo "💡 Edit code in backend/src/ or frontend/src/ - changes reload automatically!"
