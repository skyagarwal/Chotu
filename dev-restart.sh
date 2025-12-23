#!/bin/bash

# Quick restart script for when you need to restart just one service

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "Usage: ./dev-restart.sh [backend|frontend|both]"
    exit 1
fi

case $SERVICE in
    backend)
        echo "🔄 Restarting Backend..."
        docker restart mangwale_ai_dev
        echo "✓ Backend restarted"
        ;;
    frontend)
        echo "🔄 Restarting Frontend..."
        docker restart mangwale_dashboard_dev
        echo "✓ Frontend restarted"
        ;;
    both)
        echo "🔄 Restarting Both Services..."
        docker restart mangwale_ai_dev mangwale_dashboard_dev
        echo "✓ Both services restarted"
        ;;
    *)
        echo "❌ Unknown service: $SERVICE"
        echo "Use: backend, frontend, or both"
        exit 1
        ;;
esac
