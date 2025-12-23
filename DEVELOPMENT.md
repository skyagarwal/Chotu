# MangwaleAI Development Environment

## Quick Start

### Option 1: Use Development Script (Recommended)
```bash
cd /home/ubuntu/Devs/MangwaleAI
chmod +x mdev.sh
./mdev.sh start-minimal   # Start without AI (faster)
# or
./mdev.sh start           # Start everything including AI
```

### Option 2: Native Development (Fastest Hot-Reload)
```bash
# Terminal 1: Start infrastructure
./mdev.sh infra

# Terminal 2: Run backend natively
./mdev.sh native-backend

# Terminal 3: Run frontend natively  
./mdev.sh native-frontend
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Stack                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Frontend   │      │   Backend    │                     │
│  │  (Next.js)   │ ──── │  (NestJS)    │                     │
│  │  :3005       │      │  :3200       │                     │
│  └──────────────┘      └──────┬───────┘                     │
│                               │                              │
│         ┌─────────────────────┼─────────────────────┐       │
│         │                     │                     │       │
│  ┌──────▼──────┐    ┌────────▼────────┐    ┌───────▼─────┐ │
│  │  PostgreSQL │    │     Redis       │    │  PHP API    │ │
│  │  :5432      │    │     :6381       │    │  (external) │ │
│  └─────────────┘    └─────────────────┘    └─────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    AI Services                          ││
│  │  ┌──────────────┐         ┌──────────────┐             ││
│  │  │    vLLM      │         │     NLU      │             ││
│  │  │ (Qwen 7B)    │         │ (IndicBERT)  │             ││
│  │  │   :8002      │         │   :7010      │             ││
│  │  └──────────────┘         └──────────────┘             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3005 | Next.js dev server |
| Backend | http://localhost:3200 | NestJS API |
| Health | http://localhost:3200/health | Health check |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6381 | Cache/Session |
| vLLM | http://localhost:8002 | LLM API |
| NLU | http://localhost:7010 | Intent classification |

## Commands Reference

### Development Management
```bash
./mdev.sh start           # Start all services
./mdev.sh start-minimal   # Start without AI (faster)
./mdev.sh stop            # Stop all dev services
./mdev.sh status          # Show service status
./mdev.sh urls            # Show all URLs
```

### Individual Services
```bash
./mdev.sh infra           # Start DB + Redis only
./mdev.sh ai              # Start vLLM + NLU
./mdev.sh backend         # Start backend in Docker
./mdev.sh frontend        # Start frontend in Docker
```

### Native Development (Fastest)
```bash
./mdev.sh native-backend  # Run backend with npm
./mdev.sh native-frontend # Run frontend with npm
```

### Logs & Debugging
```bash
./mdev.sh logs backend    # Follow backend logs
./mdev.sh logs frontend   # Follow frontend logs
./mdev.sh logs vllm       # Follow vLLM logs
./mdev.sh logs all        # Follow all logs
./mdev.sh restart backend # Restart backend
```

### Git Workflow
```bash
./mdev.sh git-status      # Show git status
./mdev.sh git-save "msg"  # Commit changes
./mdev.sh git-branch name # Create new work branch
```

## File Structure

```
MangwaleAI/
├── mdev.sh                    # Development manager script
├── docker-compose.dev.yml     # Development compose file
├── backend/
│   ├── .env.development       # Backend dev environment
│   ├── src/
│   │   ├── flow-engine/       # Flow engine (core logic)
│   │   │   ├── flows/         # All conversation flows
│   │   │   └── executors/     # Flow action executors
│   │   ├── session/           # Session management
│   │   ├── nlu/               # NLU integration
│   │   └── llm/               # LLM integration
│   └── prisma/                # Database schema
├── frontend/
│   ├── .env.development       # Frontend dev environment
│   └── src/
│       ├── app/               # Next.js pages
│       │   ├── (public)/      # Public pages (chat, etc.)
│       │   ├── admin/         # Admin dashboard
│       │   └── api/           # API routes
│       └── components/        # React components
└── docs/                      # Documentation
```

## Switching Between Dev and Production

### Stop Production, Start Dev
```bash
./mdev.sh prod-stop       # Stop production containers
./mdev.sh start-minimal   # Start dev environment
```

### Stop Dev, Resume Production
```bash
./mdev.sh stop            # Stop dev containers
cd backend && docker compose up -d  # Start production
```

## Troubleshooting

### Port Conflicts
If you see "port already in use":
```bash
# Check what's using the port
lsof -i :3200
# Kill the process or stop production first
./mdev.sh prod-stop
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# Check connection
psql -h localhost -U mangwale_config -d headless_mangwale
```

### AI Services Not Starting
```bash
# Check GPU availability
nvidia-smi
# Check vLLM logs
./mdev.sh logs vllm
```

## Tips

1. **Fastest Development**: Use native mode for the service you're actively working on
2. **Flow Development**: Use `start-minimal` - you don't need AI for flow logic testing
3. **Save Often**: Use `./mdev.sh git-save "description"` to checkpoint your work
4. **Check Logs**: Always check logs if something isn't working
