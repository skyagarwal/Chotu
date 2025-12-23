#!/bin/bash

# View logs from both backend and frontend in split view

echo "📋 Viewing Development Logs (Ctrl+C to exit)"
echo "=============================================="
echo ""

# Use tmux if available for split view, otherwise show sequentially
if command -v tmux &> /dev/null; then
    tmux new-session -d -s mangwale-logs
    tmux split-window -h
    tmux select-pane -t 0
    tmux send-keys "docker logs -f mangwale_ai_dev 2>&1 | grep --line-buffered -E '(LOG|ERROR|WARN|Started|Ready)'" C-m
    tmux select-pane -t 1
    tmux send-keys "docker logs -f mangwale_dashboard_dev 2>&1 | grep --line-buffered -E '(Ready|Compiled|Error|Warning)'" C-m
    tmux attach-session -t mangwale-logs
else
    echo "Backend Logs:"
    echo "-------------"
    docker logs --tail 50 mangwale_ai_dev
    echo ""
    echo "Frontend Logs:"
    echo "-------------"
    docker logs --tail 50 mangwale_dashboard_dev
    echo ""
    echo "For live logs run:"
    echo "  Backend:  docker logs -f mangwale_ai_dev"
    echo "  Frontend: docker logs -f mangwale_dashboard_dev"
fi
