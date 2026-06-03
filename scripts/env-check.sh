#!/usr/bin/env bash
# env-check.sh — Validate required environment variables before starting services.
#
# Usage:
#   ./scripts/env-check.sh              # checks root .env
#   ./scripts/env-check.sh infra/docker/.env

set -euo pipefail

ENV_FILE="${1:-.env}"
ERROR_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

fail() { echo -e "  ${RED}[FAIL]${NC} $1"; ((ERROR_COUNT++)); }
pass() { echo -e "  ${GREEN}[OK]  ${NC} $1"; }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; }

# ── Load the env file ─────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}[env-check] ERROR: '$ENV_FILE' not found.${NC}"
  echo "  Copy the matching .env.example and fill in values."
  exit 1
fi

echo ""
echo -e "${CYAN}[env-check] Loading: $ENV_FILE${NC}"

declare -A vars
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]// /}"
    val="${BASH_REMATCH[2]}"
    vars["$key"]="$val"
  fi
done < "$ENV_FILE"

# ── Required variables ────────────────────────────────────────────────────────
required=(
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  POSTGRES_PORT
  MINIO_ACCESS_KEY
  MINIO_SECRET_KEY
  MINIO_BUCKET
)

echo ""
echo -e "${CYAN}[env-check] Checking required variables...${NC}"
for key in "${required[@]}"; do
  if [[ -z "${vars[$key]+x}" ]] || [[ -z "${vars[$key]}" ]]; then
    fail "$key is missing or empty"
  else
    pass "$key is set"
  fi
done

# ── Placeholder detection ─────────────────────────────────────────────────────
placeholders=("changeme" "your-secret-here" "REPLACE_ME" "todo" "xxx")

echo ""
echo -e "${CYAN}[env-check] Checking for placeholder values...${NC}"
for key in "${!vars[@]}"; do
  for p in "${placeholders[@]}"; do
    if [[ "${vars[$key]}" == *"$p"* ]]; then
      warn "$key still contains placeholder '$p' — update before deploying"
    fi
  done
done

# ── Secret strength checks ────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[env-check] Checking secret strength...${NC}"

if [[ -n "${vars[POSTGRES_PASSWORD]+x}" ]]; then
  if [[ ${#vars[POSTGRES_PASSWORD]} -lt 12 ]]; then
    warn "POSTGRES_PASSWORD is shorter than 12 characters — use a stronger password in non-local envs"
  else
    pass "POSTGRES_PASSWORD length OK"
  fi
fi

# ── Root .env extras (JWT_SECRET, OPENAI_API_KEY) ─────────────────────────────
if [[ "$ENV_FILE" == ".env" ]]; then
  echo ""
  echo -e "${CYAN}[env-check] Checking root .env extras...${NC}"

  for key in JWT_SECRET OPENAI_API_KEY; do
    if [[ -z "${vars[$key]+x}" ]] || [[ -z "${vars[$key]}" ]]; then
      warn "$key not set — required for backend (apps/backend)"
    else
      pass "$key is set"
    fi
  done

  if [[ -n "${vars[JWT_SECRET]+x}" ]] && [[ ${#vars[JWT_SECRET]} -lt 32 ]]; then
    fail "JWT_SECRET must be at least 32 characters for HMAC-SHA256"
  fi
fi

# ── Result ────────────────────────────────────────────────────────────────────
echo ""
if [[ "$ERROR_COUNT" -gt 0 ]]; then
  echo -e "${RED}[env-check] FAILED — ${ERROR_COUNT} error(s) found. Fix them before running services.${NC}"
  exit 1
else
  echo -e "${GREEN}[env-check] All checks passed.${NC}"
  exit 0
fi
