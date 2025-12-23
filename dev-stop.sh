#!/bin/bash

# Mangwale AI Development Environment Stop Script

set -e

echo "🛑 Stopping Mangwale AI Development Environment"
echo "================================================"
echo ""

cd /home/ubuntu/Devs/MangwaleAI/backend
docker-compose -f docker-compose.dev.yml down

cd /home/ubuntu/Devs/MangwaleAI/frontend
docker-compose -f docker-compose.dev.yml down

echo "✓ All development containers stopped"
echo ""
echo "To start again: ./dev-start.sh"
