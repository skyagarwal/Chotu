#!/bin/bash

# Quick status check for development environment

echo "🔍 Mangwale AI Development Status"
echo "==================================="
echo ""

# Check if containers are running
echo "📦 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "mangwale.*dev|NAMES" || echo "  ⚠️  No development containers running"
echo ""

# Check production containers
echo "🏭 Production Containers (should be stopped):"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "mangwale_(ai_service|dashboard)|NAMES" || echo "  ✓ No production containers running"
echo ""

# Check services health
echo "🏥 Service Health:"
if curl -sf http://localhost:3200/health > /dev/null 2>&1; then
    echo "  ✅ Backend: HEALTHY"
else
    echo "  ❌ Backend: DOWN"
fi

if curl -sf http://localhost:3005 > /dev/null 2>&1; then
    echo "  ✅ Frontend: HEALTHY"
else
    echo "  ❌ Frontend: DOWN"
fi
echo ""

# Check dependencies
echo "🗄️  Dependencies:"
if docker ps | grep -q "mangwale_postgres"; then
    echo "  ✅ PostgreSQL: Running"
else
    echo "  ❌ PostgreSQL: Not running"
fi

if docker ps | grep -q "mangwale_redis"; then
    echo "  ✅ Redis: Running"
else
    echo "  ❌ Redis: Not running"
fi
echo ""

echo "📝 Quick Actions:"
echo "  Start dev:     ./dev-start.sh"
echo "  Stop dev:      ./dev-stop.sh"
echo "  View logs:     ./dev-logs.sh"
echo "  Restart:       ./dev-restart.sh [backend|frontend|both]"
