#!/bin/bash

set -e

echo "🔨 Building and Starting Development Environment..."
echo ""

# Stop old containers
docker stop mangwale_ai_dev mangwale_dashboard_dev 2>/dev/null || true
docker rm mangwale_ai_dev mangwale_dashboard_dev 2>/dev/null || true

# Build backend using existing Dockerfile
echo "📦 Building backend (this will take 2-3 min)..."
docker build -t mangwale-ai:dev -f backend/Dockerfile backend/

# Build frontend using existing Dockerfile  
echo "📦 Building frontend (this will take 2-3 min)..."
docker build -t mangwale-dashboard:dev -f frontend/Dockerfile frontend/

# Ensure network exists
docker network create mangwale-dev 2>/dev/null || true

# Start Backend in dev mode
echo "🚀 Starting backend with hot reload..."
docker run -d \
  --name mangwale_ai_dev \
  --network mangwale-dev \
  -p 3200:3200 \
  -p 9229:9229 \
  -v "$(pwd)/backend/src:/app/src:ro" \
  -e NODE_ENV=development \
  mangwale-ai:dev \
  sh -c "npm run start:dev || npm start"

# Start Frontend in dev mode
echo "🚀 Starting frontend with fast refresh..."
docker run -d \
  --name mangwale_dashboard_dev \
  --network mangwale-dev \
  -p 3005:3005 \
  -v "$(pwd)/frontend/src:/app/src:ro" \
  -v "$(pwd)/frontend/public:/app/public:ro" \
  -e NODE_ENV=development \
  mangwale-dashboard:dev \
  npm run dev

echo ""
echo "✅ Development environment running!"
echo ""
echo "🌐 URLs:"
echo "   Backend:  http://localhost:3200"
echo "   Frontend: http://localhost:3005"
echo "   Debug:    localhost:9229"
echo ""
echo "📝 Commands:"
echo "   ./dev-logs.sh       # View logs"
echo "   ./dev-restart.sh    # Restart services"
echo "   ./dev-stop.sh       # Stop services"
