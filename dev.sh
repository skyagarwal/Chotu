#!/bin/bash
# MangwaleAI Development Helper Script
# This script helps deploy changes without full rebuilds

set -e

BACKEND_CONTAINER="mangwale_ai_service"
BACKEND_DIR="/home/ubuntu/Devs/MangwaleAI/backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MangwaleAI Quick Deploy ===${NC}"

case "$1" in
    "patch")
        echo -e "${YELLOW}Applying patches to running container...${NC}"
        
        # Patch auth.executor.js
        docker exec $BACKEND_CONTAINER sh -c "
            sed -i 's/success: false,/success: true,/' /app/dist/flow-engine/executors/auth.executor.js
            sed -i 's/error: .No phone number provided.,/output: { error: \"No phone number provided\", valid: false },/' /app/dist/flow-engine/executors/auth.executor.js
        "
        
        # Patch auth.flow.js
        docker exec $BACKEND_CONTAINER sh -c "
            sed -i 's/context\.data\.authenticated/context.authenticated/g' /app/dist/flow-engine/flows/auth.flow.js
        "
        
        echo -e "${GREEN}Patches applied! Restarting container...${NC}"
        docker restart $BACKEND_CONTAINER
        ;;
        
    "status")
        echo -e "${YELLOW}Container Status:${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "mangwale|traefik"
        
        echo -e "\n${YELLOW}Health Check:${NC}"
        curl -s https://api.mangwale.ai/health | jq -c '.status'
        
        echo -e "\n${YELLOW}WebSocket Check:${NC}"
        curl -s "https://chat.mangwale.ai/socket.io/?EIO=4&transport=polling" | head -c 50
        echo ""
        ;;
        
    "logs")
        docker logs $BACKEND_CONTAINER --tail ${2:-50} -f
        ;;
        
    "restart")
        echo -e "${YELLOW}Restarting backend...${NC}"
        docker restart $BACKEND_CONTAINER
        sleep 3
        docker logs $BACKEND_CONTAINER --tail 10
        ;;
        
    "rebuild")
        echo -e "${YELLOW}Full rebuild (this takes time)...${NC}"
        cd $BACKEND_DIR
        docker compose build mangwale-ai
        docker compose up -d mangwale-ai
        ;;
        
    "branch")
        cd /home/ubuntu/Devs/MangwaleAI
        TODAY=$(date +%Y-%m-%d)
        BRANCH_NAME="work/${TODAY}-${2:-updates}"
        git checkout MangwaleAI-Restart
        git checkout -b "$BRANCH_NAME"
        echo -e "${GREEN}Created branch: $BRANCH_NAME${NC}"
        ;;
        
    "commit")
        cd /home/ubuntu/Devs/MangwaleAI
        git add -A backend/src/ frontend/src/
        git commit -m "${2:-Work in progress}"
        echo -e "${GREEN}Committed changes${NC}"
        ;;
        
    "verify")
        echo -e "${YELLOW}Verifying deployed code...${NC}"
        
        echo -e "\n--- auth.executor.js (should have 'success: true'):"
        docker exec $BACKEND_CONTAINER sh -c 'cat /app/dist/flow-engine/executors/auth.executor.js | grep -A 3 "No phone number"' | head -5
        
        echo -e "\n--- auth.flow.js (should have 'context.authenticated'):"
        docker exec $BACKEND_CONTAINER sh -c 'cat /app/dist/flow-engine/flows/auth.flow.js | grep -o "context\.[a-zA-Z.]*authenticated" | head -3'
        ;;
        
    *)
        echo "Usage: $0 {patch|status|logs|restart|rebuild|branch|commit|verify}"
        echo ""
        echo "Commands:"
        echo "  patch     - Apply hotfixes to running container"
        echo "  status    - Show container status and health"
        echo "  logs [n]  - Follow container logs (default: 50 lines)"
        echo "  restart   - Restart the backend container"
        echo "  rebuild   - Full Docker rebuild (slow)"
        echo "  branch    - Create new work branch from MangwaleAI-Restart"
        echo "  commit    - Stage and commit source changes"
        echo "  verify    - Check if deployed code has fixes"
        ;;
esac
