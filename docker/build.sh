#!/bin/sh
set -e

echo "Building Cache Docker image..."
docker build -f docker/Dockerfile -t cache:latest .
echo "Done. Start with: docker compose --project-directory ../.. -f docker/production/docker-compose.yml up"
