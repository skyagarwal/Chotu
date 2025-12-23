#!/bin/bash

# Mangwale AI Development Environment Startup Script
# This script starts both backend and frontend in development mode with hot-reload

set -e

echo "🚀 Starting Mangwale AI Development Environment"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a container is running
is_container_running() {
    docker ps --format '{{.Names}}' | grep -q "^$1$"
}

# Function to stop old production containers
stop_production_containers() {
    echo -e "${YELLOW}📦 Stopping production containers...${NC}"
    
    if is_container_running "mangwale_ai_service"; then
        docker stop mangwale_ai_service || true
        echo "  ✓ Stopped mangwale_ai_service"
    fi
    
    if is_container_running "mangwale-dashboard"; then
        docker stop mangwale-dashboard || true
        echo "  ✓ Stopped mangwale-dashboard"
    fi
    
    echo ""
}

# Function to start backend
start_backend() {
    echo -e "${GREEN}🔧 Starting Backend (Development Mode)${NC}"
    cd /home/ubuntu/Devs/MangwaleAI/backend
    
    # Stop if already running
    if is_container_running "mangwale_ai_dev"; then
        echo "  ⚠️  Backend already running, restarting..."
        docker-compose -f docker-compose.dev.yml restart mangwale-ai
    else
        docker-compose -f docker-compose.dev.yml up -d mangwale-ai
    fi
    
    echo "  ✓ Backend started with hot-reload"
    echo "  📡 API: http://localhost:3200"
    echo "  🔍 Debug: localhost:9229"
    echo ""
}

# Function to start frontend
start_frontend() {
    echo -e "${GREEN}🎨 Starting Frontend (Development Mode)${NC}"
    cd /home/ubuntu/Devs/MangwaleAI/frontend
    
    # Stop if already running
    if is_container_running "mangwale_dashboard_dev"; then
        echo "  ⚠️  Frontend already running, restarting..."
        docker-compose -f docker-compose.dev.yml restart mangwale-dashboard
    else
        docker-compose -f docker-compose.dev.yml up -d mangwale-dashboard
    fi
    
    echo "  ✓ Frontend started with Fast Refresh"
    echo "  🌐 URL: http://localhost:3005"
    echo ""
}

# Function to show logs
show_status() {
    echo -e "${GREEN}📊 Development Environment Status${NC}"
    echo "======================================"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "mangwale.*dev|NAMES"
    echo ""
}

# Function to wait for services
wait_for_services() {
    echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
    
    # Wait for backend
    echo -n "  Backend: "
    for i in {1..30}; do
        if curl -sf http://localhost:3200/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Ready${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Wait for frontend
    echo -n "  Frontend: "
    for i in {1..30}; do
        if curl -sf http://localhost:3005 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Ready${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    echo ""
}

# Main execution
main() {
    stop_production_containers
    start_backend
    start_frontend
    wait_for_services
    show_status
    
    echo -e "${GREEN}✅ Development Environment Ready!${NC}"
    echo ""
    echo "📝 Quick Commands:"
    echo "  - View backend logs:  docker logs -f mangwale_ai_dev"
    echo "  - View frontend logs: docker logs -f mangwale_dashboard_dev"
    echo "  - Stop all:           ./dev-stop.sh"
    echo "  - Restart backend:    docker restart mangwale_ai_dev"
    echo "  - Restart frontend:   docker restart mangwale_dashboard_dev"
    echo ""
    echo "🔥 Hot Reload Active - Edit files and see changes instantly!"
}

main
