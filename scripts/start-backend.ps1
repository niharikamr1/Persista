# start-backend.ps1 — Load .env, build the JAR, then run it directly.
# Using "java -jar" instead of "gradlew bootRun" avoids running three concurrent JVMs
# (wrapper + Gradle daemon + Spring Boot) which exhausts the Windows paging file.
# Run from the repo root: .\scripts\start-backend.ps1

$EnvFile = Join-Path $PSScriptRoot "..\.env"

if (-not (Test-Path $EnvFile)) {
    Write-Host "[start-backend] ERROR: .env not found at $EnvFile" -ForegroundColor Red
    exit 1
}

Write-Host "[start-backend] Loading environment from $EnvFile" -ForegroundColor Cyan

foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    if ($line -match '^([^=]+)=(.*)$') {
        $key   = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        Set-Item -Path "Env:\$key" -Value $value
        Write-Host "  SET $key" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "[start-backend] Profile: $env:SPRING_PROFILES_ACTIVE" -ForegroundColor Cyan
Write-Host "[start-backend] Postgres -> $env:POSTGRES_HOST`:$env:POSTGRES_PORT db=$env:POSTGRES_DB user=$env:POSTGRES_USER" -ForegroundColor DarkGray
Write-Host ""

$BackendDir = Join-Path $PSScriptRoot "..\apps\backend"
Set-Location $BackendDir

# ── Step 1: build the JAR (Gradle wrapper + daemon run, then both exit) ─────
Write-Host "[start-backend] Building JAR..." -ForegroundColor Cyan
& .\gradlew.bat bootJar --no-daemon
if ($LASTEXITCODE -ne 0) {
    Write-Host "[start-backend] ERROR: bootJar failed" -ForegroundColor Red
    exit 1
}
Write-Host "[start-backend] JAR built." -ForegroundColor DarkGray
Write-Host ""

# ── Step 2: run the JAR with a single lean JVM ───────────────────────────────
$Jar = Join-Path $BackendDir "build\libs\aicc-backend.jar"

Write-Host "[start-backend] Starting Spring Boot from JAR..." -ForegroundColor Cyan
& "C:\Program Files\Java\jdk-21\bin\java.exe" `
    -Xms64m -Xmx384m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC `
    "-Dspring.profiles.active=$env:SPRING_PROFILES_ACTIVE" `
    "-Dspring.datasource.url=jdbc:postgresql://$($env:POSTGRES_HOST):$($env:POSTGRES_PORT)/$($env:POSTGRES_DB)" `
    "-Dspring.datasource.username=$env:POSTGRES_USER" `
    "-Dspring.datasource.password=$env:POSTGRES_PASSWORD" `
    "-Daicc.ai.open-ai-api-key=$env:OPENAI_API_KEY" `
    -jar $Jar
