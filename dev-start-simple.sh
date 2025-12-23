#!/bin/bash

# Simple development startup using docker run

set -e

echo "🚀 Starting Mangwale AI Development (Simple Mode)"
echo "=================================================="
echo ""

# Stop old containers
echo "Stopping old containers..."
docker stop mangwale_ai_service mangwale-dashboard 2>/dev/null || true
docker stop mangwale_ai_dev mangwale_dashboard_dev 2>/dev/null || true

# Ensure network exists
docker network create mangwale-dev 2>/dev/null || true

# Start Backend
echo "Starting Backend (Hot Reload)..."
docker run -d \
  --name mangwale_ai_dev \
  --network mangwale-dev \
  -p 3200:3200 \
  -p 9229:9229 \
  -v /home/ubuntu/Devs/MangwaleAI/backend/src:/app/src:ro \
  -v /home/ubuntu/Devs/MangwaleAI/backend/package.json:/app/package.json:ro \
  -v /home/ubuntu/Devs/MangwaleAI/backend/tsconfig.json:/app/tsconfig.json:ro \
  -e NODE_ENV=development \
  -e PORT=3200 \
  -e REDIS_HOST=mangwale_redis \
  -e POSTGRES_HOST=mangwale_postgres \
  --restart unless-stopped \
  -w /app \
  node:20-alpine \
  sh -c "npm install && npm run start:dev || npm start"

echo "✅ Backend started: http://localhost:3200"

# Start Frontend
echo "Starting Frontend (Fast Refresh)..."
docker run -d \
  --name mangwale_dashboard_dev \
  --network mangwale-dev \
  -p 3005:3005 \
  -v /home/ubuntu/Devs/MangwaleAI/frontend/src:/app/src:ro \
  -v /home/ubuntu/Devs/MangwaleAI/frontend/public:/app/public:ro \
  -v /home/ubuntu/Devs/MangwaleAI/frontend/package.json:/app/package.json:ro \
  -e NODE_ENV=development \
  -e WATCHPACK_POLLING=true \
  --restart unless-stopped \
  -w /app \
  node:20-alpine \
  sh -c "npm install && npm run dev"

echo "✅ Frontend started: http://localhost:3005"
echo ""
echo "📝 Quick Commands:"
echo "  docker logs -f mangwale_ai_dev       # Backend logs"
echo "  docker logs -f mangwale_dashboard_dev  # Frontend logs"
echo "  docker restart mangwale_ai_dev       # Restart backend"
echo "  docker restart mangwale_dashboard_dev  # Restart frontend"
echo ""
echo "🔥 Hot reload enabled - edit files and see changes!"
