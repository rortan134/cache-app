#!/bin/sh
set -e

echo "Building Cache Docker image..."
docker build -f docker/Dockerfile -t cache:latest .
echo "Done. Start with: docker compose --env-file .env -f docker/production/docker-compose.yml up"
