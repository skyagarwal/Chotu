#!/bin/bash

set -e

echo "🚀 Starting Quick Dev Mode"

# Stop old dev containers
docker stop mangwale_ai_dev mangwale_dashboard_dev 2>/dev/null || true
docker rm mangwale_ai_dev mangwale_dashboard_dev 2>/dev/null || true

# Ensure network exists
docker network create mangwale-dev 2>/dev/null || true

# Get production image names
BACKEND_IMAGE="mangwale-ai-mangwale-ai:latest"
FRONTEND_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -i dashboard | head -1)

if [ -z "$FRONTEND_IMAGE" ]; then
    echo "❌ Frontend image not found."
    echo "Building frontend image..."
    docker build -t mangwale-dashboard:latest -f frontend/Dockerfile frontend/
    FRONTEND_IMAGE="mangwale-dashboard:latest"
fi

echo "📦 Using backend image: $BACKEND_IMAGE"
echo "📦 Using frontend image: $FRONTEND_IMAGE"

# Start Backend
echo "🚀 Starting backend with hot reload..."
docker run -d \
  --name mangwale_ai_dev \
  --network mangwale-dev \
  -p 3200:3200 \
  -p 9229:9229 \
  -v "$(pwd)/backend/src:/app/src:ro" \
  -e NODE_ENV=development \
  "$BACKEND_IMAGE" \
  npm run start:dev

# Start Frontend  
echo "🚀 Starting frontend with fast refresh..."
docker run -d \
  --name mangwale_dashboard_dev \
  --network mangwale-dev \
  -p 3005:3005 \
  -v "$(pwd)/frontend/src:/app/src:ro" \
  -v "$(pwd)/frontend/public:/app/public:ro" \
  -e NODE_ENV=development \
  "$FRONTEND_IMAGE" \
  npm run dev

echo ""
echo "✅ Development mode active!"
echo "   Backend:  http://localhost:3200"
echo "   Frontend: http://localhost:3005"
echo "   Debug:    localhost:9229"
