#!/bin/bash

# Quick rebuild script for backend
# Usage: ./rebuild.sh [restart]

set -e

echo "🔨 Rebuilding backend..."

cd /home/ubuntu/Devs/MangwaleAI/backend

# Build using docker
docker build -t mangwale-ai-mangwale-ai:latest -f Dockerfile . 

if [ "$1" == "restart" ]; then
    echo "🔄 Restarting container..."
    docker restart mangwale_ai_service
    echo "⏳ Waiting for service..."
    sleep 5
    curl -s http://localhost:3200/health && echo "" && echo "✅ Backend is healthy!"
fi

echo "✅ Build complete!"
