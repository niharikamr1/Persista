# infra.ps1 — shorthand helpers for the local Docker infra
# Usage: .\scripts\infra.ps1 <command>
#
#   up          Start all services
#   up-core     Start only postgres + minio (no observability)
#   down        Stop all services (preserve volumes)
#   destroy     Stop and delete all volumes (⚠ data loss)
#   logs        Tail all container logs
#   ps          Show container status
#   psql        Open psql shell on the running postgres container
#   minio-ui    Open MinIO console in browser
#   grafana     Open Grafana in browser

param([string]$Command = "help")

$Root    = Join-Path $PSScriptRoot ".."
$EnvFile = Join-Path $Root ".env"
$Compose = "docker compose -f `"$Root\infra\docker\docker-compose.yml`" --env-file `"$EnvFile`""

switch ($Command) {
    "up"       {
        Invoke-Expression "$Compose up -d"
    }
    "up-core"  {
        Invoke-Expression "$Compose up -d postgres minio minio-init"
    }
    "down"     { Invoke-Expression "$Compose down" }
    "destroy"  {
        Write-Warning "This will DELETE all Docker volumes (postgres data, minio data, etc.)"
        $confirm = Read-Host "Type 'yes' to confirm"
        if ($confirm -eq "yes") { Invoke-Expression "$Compose down -v" }
        else { Write-Host "Aborted." }
    }
    "logs"     { Invoke-Expression "$Compose logs -f" }
    "ps"       { Invoke-Expression "$Compose ps" }
    "psql"     {
        Invoke-Expression "docker exec -it aicc-postgres psql -U aicc_user -d aicc"
    }
    "minio-ui" { Start-Process "http://localhost:9001" }
    "grafana"  { Start-Process "http://localhost:3001" }
    default {
        Write-Host @"
Usage: .\scripts\infra.ps1 <command>

  up          Start all services
  up-core     Start only postgres + minio
  down        Stop all services
  destroy     Stop and delete all volumes (data loss!)
  logs        Tail all container logs
  ps          Show container status
  psql        Open psql shell
  minio-ui    Open MinIO console
  grafana     Open Grafana dashboard
"@
    }
}
