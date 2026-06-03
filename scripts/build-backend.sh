#!/usr/bin/env bash
set -euo pipefail

echo "==> Building backend (Spring Boot)..."
cd "$(dirname "$0")/../apps/backend"
./gradlew bootJar --no-daemon
echo "==> Backend build complete: build/libs/"
