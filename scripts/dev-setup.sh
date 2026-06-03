#!/usr/bin/env bash
set -euo pipefail

echo "==> AI Context Continuity — dev environment setup"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "ERROR: node is required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "ERROR: pnpm is required (npm i -g pnpm)"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is required"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "ERROR: java 21+ is required"; exit 1; }

echo "==> Installing JS dependencies..."
pnpm install

echo "==> Starting infrastructure (PostgreSQL, MinIO)..."
docker compose -f infra/docker/docker-compose.yml up -d postgres minio

echo "==> Building shared packages..."
pnpm --filter @aicc/shared-types build

echo ""
echo "==> Setup complete. Run:"
echo "    pnpm dev:web        — start Next.js frontend"
echo "    pnpm dev:extension  — start Plasmo extension"
echo "    cd apps/backend && ./gradlew bootRun  — start Spring Boot backend"
