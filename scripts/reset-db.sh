#!/usr/bin/env bash
set -euo pipefail

echo "WARNING: This will destroy all local database volumes."
read -r -p "Continue? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

docker compose -f infra/docker/docker-compose.yml down -v
docker compose -f infra/docker/docker-compose.yml up -d postgres minio
echo "==> Database reset complete."
