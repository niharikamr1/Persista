# env-check.ps1 — Validate that all required environment variables are set
# and that no placeholder values are in use before starting services.
#
# Usage:
#   .\scripts\env-check.ps1              # checks root .env
#   .\scripts\env-check.ps1 -EnvFile infra/docker/.env

param(
    [string]$EnvFile = ".env"
)

$ErrorCount = 0

function Fail([string]$msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    $script:ErrorCount++
}

function Pass([string]$msg) {
    Write-Host "  [OK]   $msg" -ForegroundColor Green
}

function Warn([string]$msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
}

# ── Load the env file ─────────────────────────────────────────────────────────
if (-not (Test-Path $EnvFile)) {
    Write-Host "[env-check] ERROR: '$EnvFile' not found." -ForegroundColor Red
    Write-Host "  Copy the matching .env.example and fill in values." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[env-check] Loading: $EnvFile" -ForegroundColor Cyan

$vars = @{}
foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    if ($line -match '^([^=]+)=(.*)$') {
        $vars[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

# ── Required variables ────────────────────────────────────────────────────────
$required = @(
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_PORT",
    "MINIO_ACCESS_KEY",
    "MINIO_SECRET_KEY",
    "MINIO_BUCKET"
)

Write-Host ""
Write-Host "[env-check] Checking required variables..." -ForegroundColor Cyan
foreach ($key in $required) {
    if (-not $vars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($vars[$key])) {
        Fail "$key is missing or empty"
    } else {
        Pass "$key is set"
    }
}

# ── Placeholder detection ─────────────────────────────────────────────────────
$placeholders = @("changeme", "your-secret-here", "REPLACE_ME", "todo", "xxx")

Write-Host ""
Write-Host "[env-check] Checking for placeholder values..." -ForegroundColor Cyan
foreach ($entry in $vars.GetEnumerator()) {
    foreach ($p in $placeholders) {
        if ($entry.Value -like "*$p*") {
            Warn "$($entry.Key) still contains placeholder '$p' — update before deploying"
        }
    }
}

# ── Secret strength checks ────────────────────────────────────────────────────
Write-Host ""
Write-Host "[env-check] Checking secret strength..." -ForegroundColor Cyan

if ($vars.ContainsKey("POSTGRES_PASSWORD")) {
    if ($vars["POSTGRES_PASSWORD"].Length -lt 12) {
        Warn "POSTGRES_PASSWORD is shorter than 12 characters — use a stronger password in non-local envs"
    } else {
        Pass "POSTGRES_PASSWORD length OK"
    }
}

# ── Root .env extras (JWT_SECRET, OPENAI_API_KEY) ─────────────────────────────
if ($EnvFile -eq ".env") {
    Write-Host ""
    Write-Host "[env-check] Checking root .env extras..." -ForegroundColor Cyan

    foreach ($key in @("JWT_SECRET", "OPENAI_API_KEY")) {
        if (-not $vars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($vars[$key])) {
            Warn "$key not set — required for backend (apps/backend)"
        } else {
            Pass "$key is set"
        }
    }

    if ($vars.ContainsKey("JWT_SECRET") -and $vars["JWT_SECRET"].Length -lt 32) {
        Fail "JWT_SECRET must be at least 32 characters for HMAC-SHA256"
    }
}

# ── Result ────────────────────────────────────────────────────────────────────
Write-Host ""
if ($ErrorCount -gt 0) {
    Write-Host "[env-check] FAILED — $ErrorCount error(s) found. Fix them before running services." -ForegroundColor Red
    exit 1
} else {
    Write-Host "[env-check] All checks passed." -ForegroundColor Green
    exit 0
}
