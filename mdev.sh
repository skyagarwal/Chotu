#!/bin/bash
# ===========================================
# MangwaleAI Development Environment Manager
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="/home/ubuntu/Devs/MangwaleAI"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║           MangwaleAI Development Environment             ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if production services are running
check_production() {
    if docker ps --format '{{.Names}}' | grep -q "^mangwale_ai_service$"; then
        print_warning "Production services detected!"
        echo -e "  Run ${YELLOW}./mdev.sh prod-stop${NC} first to avoid conflicts"
        return 1
    fi
    return 0
}

# Start infrastructure only (DB + Redis)
start_infra() {
    print_status "Starting infrastructure services (PostgreSQL + Redis)..."
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" up -d postgres redis
    print_success "Infrastructure ready!"
    echo -e "  PostgreSQL: ${GREEN}localhost:5432${NC}"
    echo -e "  Redis: ${GREEN}localhost:6381${NC}"
}

# Start AI services (vLLM + NLU)
start_ai() {
    print_status "Starting AI services (vLLM + NLU)..."
    print_warning "This requires GPU and ~10GB VRAM"
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" --profile ai up -d
    print_success "AI services starting..."
    echo -e "  vLLM: ${GREEN}localhost:8002${NC}"
    echo -e "  NLU: ${GREEN}localhost:7010${NC}"
}

# Start backend in development mode
start_backend() {
    print_status "Starting Backend (NestJS) in development mode..."
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" --profile backend up -d
    print_success "Backend starting with hot-reload..."
    echo -e "  Backend API: ${GREEN}http://localhost:3200${NC}"
    echo -e "  Health: ${GREEN}http://localhost:3200/health${NC}"
}

# Start frontend in development mode
start_frontend() {
    print_status "Starting Frontend (Next.js) in development mode..."
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" --profile frontend up -d
    print_success "Frontend starting with hot-reload..."
    echo -e "  Frontend: ${GREEN}http://localhost:3005${NC}"
}

# Start everything
start_all() {
    print_header
    check_production || return 1
    start_infra
    sleep 5
    start_ai
    start_backend
    start_frontend
    echo ""
    print_success "All development services started!"
    show_urls
}

# Start minimal (no AI - for flow development)
start_minimal() {
    print_header
    print_status "Starting minimal stack (no AI services)..."
    start_infra
    sleep 3
    
    # Start backend without AI
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" --profile backend up -d
    docker compose -f "$COMPOSE_FILE" --profile frontend up -d
    
    print_success "Minimal stack ready!"
    show_urls
}

# Stop all dev services
stop_all() {
    print_status "Stopping all development services..."
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" --profile ai --profile backend --profile frontend down
    print_success "All development services stopped!"
}

# Stop production services
stop_production() {
    print_status "Stopping production services..."
    docker stop mangwale_ai_service mangwale-dashboard 2>/dev/null || true
    print_success "Production services stopped"
}

# Show status
show_status() {
    print_header
    echo -e "${YELLOW}Development Services:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "mangwale_dev|NAME" || echo "  No dev services running"
    
    echo ""
    echo -e "${YELLOW}Production Services:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "^mangwale_|mangwale-dashboard|NAME" | grep -v "mangwale_dev" || echo "  No production services running"
}

# Show URLs
show_urls() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}  Development URLs${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "  Frontend:    ${GREEN}http://localhost:3005${NC}"
    echo -e "  Backend:     ${GREEN}http://localhost:3200${NC}"
    echo -e "  Health:      ${GREEN}http://localhost:3200/health${NC}"
    echo -e "  PostgreSQL:  ${GREEN}localhost:5432${NC}"
    echo -e "  Redis:       ${GREEN}localhost:6381${NC}"
    echo -e "  vLLM:        ${GREEN}http://localhost:8002${NC}"
    echo -e "  NLU:         ${GREEN}http://localhost:7010${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
}

# Show logs
show_logs() {
    local service=${1:-backend}
    case $service in
        backend)
            docker logs -f mangwale_dev_backend 2>/dev/null || docker logs -f mangwale_ai_service
            ;;
        frontend)
            docker logs -f mangwale_dev_frontend 2>/dev/null || docker logs -f mangwale-dashboard
            ;;
        vllm)
            docker logs -f mangwale_dev_vllm 2>/dev/null || docker logs -f mangwale_vllm
            ;;
        nlu)
            docker logs -f mangwale_dev_nlu 2>/dev/null || docker logs -f mangwale_nlu
            ;;
        all)
            docker compose -f "$COMPOSE_FILE" logs -f
            ;;
        *)
            echo "Usage: $0 logs {backend|frontend|vllm|nlu|all}"
            ;;
    esac
}

# Restart a service
restart_service() {
    local service=$1
    print_status "Restarting $service..."
    docker restart "mangwale_dev_$service" 2>/dev/null || docker restart "mangwale_$service"
    print_success "$service restarted!"
}

# Run backend natively (fastest hot-reload)
run_native_backend() {
    print_header
    print_status "Running backend natively (fastest hot-reload)..."
    
    # Ensure infra is running
    start_infra
    
    cd "$PROJECT_DIR/backend"
    
    # Export environment variables
    export NODE_ENV=development
    export PORT=3200
    export DATABASE_URL="postgresql://mangwale_config:config_secure_pass_2024@localhost:5432/headless_mangwale?schema=public"
    export REDIS_HOST=localhost
    export REDIS_PORT=6381
    export REDIS_DB=1
    export NLU_ENDPOINT=http://localhost:7010
    export VLLM_URL=http://localhost:8002
    export VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct-AWQ
    export LOG_LEVEL=debug
    
    print_status "Installing dependencies..."
    npm install
    
    print_status "Generating Prisma client..."
    npx prisma generate
    
    print_success "Starting backend with hot-reload..."
    npm run start:dev
}

# Run frontend natively
run_native_frontend() {
    print_header
    print_status "Running frontend natively (fastest hot-reload)..."
    
    cd "$PROJECT_DIR/frontend"
    
    export NEXT_PUBLIC_WS_URL=ws://localhost:3200
    export NEXT_PUBLIC_MANGWALE_AI_URL=http://localhost:3200
    export NEXT_PUBLIC_ADMIN_BACKEND_URL=http://localhost:3200
    
    print_status "Installing dependencies..."
    npm install
    
    print_success "Starting frontend with hot-reload..."
    npm run dev -- -p 3005
}

# Git helpers
git_status() {
    cd "$PROJECT_DIR"
    echo -e "${YELLOW}Current Branch:${NC} $(git branch --show-current)"
    echo ""
    git status --short
}

git_save() {
    local msg=${1:-"WIP: Development checkpoint"}
    cd "$PROJECT_DIR"
    git add -A backend/src/ frontend/src/
    git commit -m "$msg"
    print_success "Changes committed: $msg"
}

git_new_branch() {
    local name=$1
    if [ -z "$name" ]; then
        name="work/$(date +%Y-%m-%d)"
    fi
    cd "$PROJECT_DIR"
    git checkout MangwaleAI-Restart 2>/dev/null || git checkout -b MangwaleAI-Restart
    git checkout -b "$name"
    print_success "Created branch: $name"
}

# Print help
print_help() {
    print_header
    echo -e "${YELLOW}Usage:${NC} ./mdev.sh <command>"
    echo ""
    echo -e "${CYAN}Quick Start:${NC}"
    echo "  start           Start all development services (infra + AI + backend + frontend)"
    echo "  start-minimal   Start without AI services (for flow development)"
    echo "  stop            Stop all development services"
    echo ""
    echo -e "${CYAN}Individual Services:${NC}"
    echo "  infra           Start infrastructure only (PostgreSQL + Redis)"
    echo "  ai              Start AI services (vLLM + NLU)"
    echo "  backend         Start backend in Docker"
    echo "  frontend        Start frontend in Docker"
    echo ""
    echo -e "${CYAN}Native Development (Fastest):${NC}"
    echo "  native-backend  Run backend natively with hot-reload"
    echo "  native-frontend Run frontend natively with hot-reload"
    echo ""
    echo -e "${CYAN}Utilities:${NC}"
    echo "  status          Show status of all services"
    echo "  urls            Show development URLs"
    echo "  logs <service>  Show logs (backend|frontend|vllm|nlu|all)"
    echo "  restart <svc>   Restart a service"
    echo ""
    echo -e "${CYAN}Production:${NC}"
    echo "  prod-stop       Stop production services"
    echo ""
    echo -e "${CYAN}Git Helpers:${NC}"
    echo "  git-status      Show git status"
    echo "  git-save \"msg\"  Commit current changes"
    echo "  git-branch name Create new work branch"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  ./mdev.sh start           # Start everything"
    echo "  ./mdev.sh start-minimal   # Start without AI (faster)"
    echo "  ./mdev.sh native-backend  # Run backend natively"
    echo "  ./mdev.sh logs backend    # Follow backend logs"
}

# Main
case "${1:-help}" in
    start)
        start_all
        ;;
    start-minimal)
        start_minimal
        ;;
    stop)
        stop_all
        ;;
    infra)
        start_infra
        ;;
    ai)
        start_ai
        ;;
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    native-backend)
        run_native_backend
        ;;
    native-frontend)
        run_native_frontend
        ;;
    status)
        show_status
        ;;
    urls)
        show_urls
        ;;
    logs)
        show_logs "$2"
        ;;
    restart)
        restart_service "$2"
        ;;
    prod-stop)
        stop_production
        ;;
    git-status)
        git_status
        ;;
    git-save)
        git_save "$2"
        ;;
    git-branch)
        git_new_branch "$2"
        ;;
    help|--help|-h|*)
        print_help
        ;;
esac
