#!/bin/bash

# Quick apply script - applies code changes without full rebuild
# Usage: ./quick-apply.sh [file]
# If no file specified, applies all changed TypeScript files

set -e

CONTAINER="mangwale_ai_service"

echo "📦 Quick Apply - Applying changes to running container"

# Compile TypeScript locally
echo "🔨 Compiling TypeScript..."
cd /home/ubuntu/Devs/MangwaleAI/backend

# Use docker to compile since local env has issues
docker run --rm -v "$(pwd):/app" -w /app node:20-alpine sh -c "
  npm install --include=dev --silent 2>/dev/null
  npx tsc --outDir /tmp/dist --declaration false --sourceMap false 2>&1 | head -20 || true
"

# Or use sed to patch specific files
if [ -n "$1" ]; then
    FILE=$1
    echo "📝 Patching file: $FILE"
    
    # Get the js file path
    JS_FILE=$(echo "$FILE" | sed 's/\.ts$/.js/' | sed 's|src/|dist/|')
    
    # Apply patch using docker exec
    echo "  Copying to container..."
    docker cp "$FILE" "$CONTAINER:/app/src/"
    
    echo "  Rebuilding in container..."
    docker exec $CONTAINER sh -c "cd /app && npm run build 2>&1" | tail -10
    
    echo "✅ Applied: $FILE"
else
    echo "💡 Usage: ./quick-apply.sh src/path/to/file.ts"
    echo "   Or restart container after making changes in container"
fi

echo ""
echo "🔄 Restarting container..."
docker restart $CONTAINER

echo "⏳ Waiting for service..."
sleep 5

# Health check
if curl -s http://localhost:3200/health > /dev/null; then
    echo "✅ Service is healthy!"
else
    echo "⚠️  Service may not be ready yet. Check logs:"
    echo "   docker logs $CONTAINER --tail 20"
fi
