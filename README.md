<h1 align="center">Persista — AI Context Continuity</h1>

<p align="center">
  <strong>Never lose an AI conversation again.</strong><br/>
  A browser extension, REST backend, and dashboard that capture, store, and reconstruct your AI context across sessions, platforms, and crashes.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white" alt="Java 21"/>
  <img src="https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?logo=springboot&logoColor=white" alt="Spring Boot"/>
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License"/>
</p>

---

## Table of Contents

- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Repository Structure](#repository-structure)
- [Configuration](#configuration)
- [Running the Stack](#running-the-stack)
- [Browser Extension](#browser-extension)
- [Development Commands](#development-commands)
- [Service Ports](#service-ports)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)

---

## The Problem

Long-running AI workflows break in predictable ways:

- **Token limits** silently drop earlier reasoning — the model forgets what it said two hours ago
- **Browser crashes or closed tabs** wipe the entire session with no recovery path
- **Platform switches** (ChatGPT → Claude, or vice versa) force you to re-explain everything from scratch
- **Session gaps** — picking up the next day means manually re-summarising yesterday's context
- **Parallel threads** — no way to link related conversations across sessions or workspaces

These are not edge cases. They are the default experience for anyone doing serious, multi-hour work with AI assistants. Existing tools offer export at best — not structured, searchable, reconstructable continuity.

---

## How It Works

```
┌────────────────────────────────────────────────────────────────┐
│  Browser                                                       │
│                                                                │
│  ChatGPT ──┐                                                   │
│  Claude   ─┼──▶  Persista Extension  ──▶  Event Queue        │
│  Gemini   ─┘      (Plasmo + TS)             (IndexedDB)       │
└────────────────────────────┬───────────────────────────────────┘
                             │  REST  (batch sync, offline-first)
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  Spring Boot Backend  (Java 21)                                │
│                                                                │
│  Auth (JWT + Argon2)   ──▶  Event Ingest  ──▶  Session Store  │
│                                                      │         │
│                                          Semantic Processor    │
│                                          (LangChain4j)         │
│                                                      │         │
│                                        pgvector HNSW index     │
│                                                      │         │
│                                    Context Reconstruction API  │
└────────────────────────────┬───────────────────────────────────┘
                             │  REST
                             ▼
              ┌──────────────────────────┐
              │   Next.js Dashboard      │
              │                          │
              │   Sessions  ·  Events    │
              │   Semantic Search        │
              │   Context Packages       │
              └──────────────────────────┘
```

1. **Capture** — The browser extension observes the DOM on ChatGPT, Claude, and Gemini, emitting `PROMPT_SENT` and `RESPONSE_RECEIVED` events into a local IndexedDB queue.
2. **Sync** — Events are batched and POSTed to the backend. The queue retries automatically when the backend is unreachable.
3. **Index** — The backend stores events in PostgreSQL and generates vector embeddings (local 384-dim model or OpenAI) for semantic retrieval.
4. **Reconstruct** — Given a new session, the API retrieves the most relevant prior context within a token budget, ready to inject into the next conversation.

---

## Screenshots

> Add screenshots to `docs/screenshots/` and replace the placeholders below.

### Dashboard — Session Overview
<!-- ![Dashboard](docs/screenshots/01-dashboard-sessions.png) -->
> `docs/screenshots/01-dashboard-sessions.png` — _Pending_

### Session Detail — Prompts & Responses
<!-- ![Session Detail](docs/screenshots/02-session-detail.png) -->
> `docs/screenshots/02-session-detail.png` — _Pending_

### Browser Extension Popup
<!-- ![Extension Popup](docs/screenshots/03-extension-popup.png) -->
> `docs/screenshots/03-extension-popup.png` — _Pending_

### Semantic Memory Search
<!-- ![Semantic Search](docs/screenshots/04-semantic-search.png) -->
> `docs/screenshots/04-semantic-search.png` — _Pending_


---

## Features

**Capture**
- Captures prompts and responses from ChatGPT, Claude, and Gemini via a resilient DOM observer
- Falls back to generic text detection when platform CSS changes break specific selectors
- On/off toggle in the extension popup — nothing syncs until the user enables it
- Offline-first: events queue locally in IndexedDB and flush when the backend is available
- Idempotent ingest — the server deduplicates by event ID, so retries are safe

**Storage & Indexing**
- Append-only event store with monotonic sequence numbers
- Schema managed entirely by Flyway migrations — no `ddl-auto` surprises in production
- Dual embedding backend: local `AllMiniLmL6V2` (384-dim, no API key required) or OpenAI `text-embedding-3-small`
- pgvector HNSW index for sub-millisecond nearest-neighbour search at scale

**Retrieval & Reconstruction**
- Semantic memory search: retrieve relevant past exchanges by meaning, not keyword
- Context reconstruction: given a new session and a token budget, compose the most relevant prior context into a single injectable block
- Project grouping: organise sessions under named projects

**Dashboard**
- Browse sessions and raw events by platform, date range, or project
- Trigger a manual sync and view sync checkpoint status
- Full conversation replay — see exactly what was captured

> **Observability and Nginx reverse proxy** — config scaffolding exists under `infra/observability/` and `infra/nginx/` but has not been tested end-to-end yet. See [Roadmap](#roadmap).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query |
| Browser Extension | Plasmo framework, TypeScript, Dexie.js (IndexedDB abstraction) |
| Backend | Java 21, Spring Boot 3.4, Spring MVC with virtual threads, Gradle 8 |
| Database | PostgreSQL 16, pgvector extension, Flyway migrations |
| Auth | JWT (JJWT 0.12), Argon2 password hashing via Spring Security Crypto |
| AI / Embeddings | LangChain4j, AllMiniLmL6V2 (local, 384-dim), OpenAI API (optional) |
| Object Storage | MinIO (S3-compatible) |
| Cache | Caffeine (in-process) |
| Infrastructure | Docker Compose |
| Observability _(planned)_ | Prometheus, Grafana, Loki, Promtail |
| Reverse Proxy _(planned)_ | Nginx |

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Java JDK | 21 | [adoptium.net](https://adoptium.net/) — set `JAVA_HOME` to the JDK 21 root |
| Docker + Docker Compose | v2+ | `docker compose` (not `docker-compose`) must work |
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org/) |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| OpenAI API key | optional | Set `OPENAI_API_KEY=sk-placeholder` to use the bundled local model instead |

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/persista.git
cd persista

# 2. Install JavaScript dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Open .env and set JWT_SECRET, POSTGRES_PASSWORD, and MINIO keys at minimum

# 4. Start infrastructure
docker compose -f infra/docker/docker-compose.yml up -d postgres minio

# 5. Start the backend
.\scripts\start-backend.ps1          # Windows (recommended)
# cd apps/backend && ./gradlew bootRun   # Linux / macOS

# 6. Start the frontend
pnpm dev:web

# 7. Build and load the browser extension
pnpm dev:extension
# Then load apps/extension/build/chrome-mv3-dev/ in Chrome (see Browser Extension)
```

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8080 |
| Next.js dashboard | http://localhost:3000 |
| MinIO console | http://localhost:9001 |

---

## Repository Structure

```
persista/
├── apps/
│   ├── backend/          # Spring Boot 3 API — Java 21, Gradle
│   ├── web/              # Next.js 15 dashboard — TypeScript
│   └── extension/        # Browser extension — Plasmo, TypeScript
├── packages/
│   ├── shared-types/     # Shared TypeScript types  (@aicc/shared-types)
│   ├── eslint-config/    # Shared ESLint rules
│   └── tsconfig/         # Shared TypeScript compiler configs
├── infra/
│   ├── docker/           # docker-compose.yml, PostgreSQL tuning config
│   ├── nginx/            # Reverse proxy config (in progress)
│   └── observability/    # Prometheus, Grafana, Loki, Promtail configs (in progress)
├── docs/
│   └── screenshots/      # App screenshots referenced by this README
├── scripts/              # Dev-setup, env validation, DB reset helpers
├── .env.example          # Root env template — copy to .env and fill secrets
└── pnpm-workspace.yaml
```

---

## Configuration

### Environment files

Three files must exist before starting any service. Copy from the examples and fill in every value marked `[SECRET]`.

#### Root `.env` — backend and shared secrets

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_HOST` | Yes | `localhost` for local dev |
| `POSTGRES_PORT` | Yes | `5432` |
| `POSTGRES_DB` | Yes | `aicc` |
| `POSTGRES_USER` | Yes | `aicc_user` |
| `POSTGRES_PASSWORD` | **[SECRET]** | Minimum 16 characters |
| `MINIO_ENDPOINT` | Yes | `http://localhost:9000` |
| `MINIO_BUCKET` | Yes | `aicc-files` |
| `MINIO_ACCESS_KEY` | **[SECRET]** | MinIO root user |
| `MINIO_SECRET_KEY` | **[SECRET]** | MinIO root password |
| `SPRING_PROFILES_ACTIVE` | Yes | `dev` locally, `prod` in production |
| `JWT_SECRET` | **[SECRET]** | Minimum 32 chars — used for HMAC-SHA256 signing |
| `JWT_EXPIRY_MS` | Yes | `900000` (15 min access token) |
| `REFRESH_TOKEN_EXPIRY_MS` | Yes | `604800000` (7-day refresh token) |
| `OPENAI_API_KEY` | Optional | Set `sk-placeholder` to use the bundled local model |
| `EMBEDDING_MODEL` | Yes | `text-embedding-3-small` |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8080` |
| `GRAFANA_PASSWORD` | **[SECRET]** | Grafana admin password |

#### Docker Compose `.env` — infrastructure only

```bash
cp infra/docker/.env.example infra/docker/.env
```

Overrides Postgres credentials, MinIO keys, and Grafana credentials inside the Docker network. Values must match the root `.env`.

#### Web app — Next.js public env

`apps/web/.env.development` and `apps/web/.env.production` are committed to the repo — they contain only `NEXT_PUBLIC_*` values and no secrets. Override `NEXT_PUBLIC_API_URL` in your deployment platform when the backend is not on `localhost`.

### Validate your env

```bash
# Linux / macOS
./scripts/env-check.sh

# Windows
.\scripts\env-check.ps1
```

---

## Running the Stack

### 1. Infrastructure

```bash
# Core dependencies (Postgres + MinIO) — use this for local dev
docker compose -f infra/docker/docker-compose.yml up -d postgres minio

# Full stack — also starts Prometheus, Loki, Grafana (observability not yet verified)
docker compose -f infra/docker/docker-compose.yml up -d
```

### 2. Backend

**Windows (recommended)**

```powershell
# Builds the JAR then starts a single JVM process.
# gradlew bootRun alone opens three concurrent JVMs on Windows
# (wrapper + daemon + Spring Boot), which can exhaust paging file memory.
.\scripts\start-backend.ps1
```

> If your JDK is not at `C:\Program Files\Java\jdk-21`, update that path inside `start-backend.ps1`.

**Linux / macOS**

```bash
cd apps/backend
./gradlew bootRun
```

Flyway migrations run automatically on startup. The API is ready at **http://localhost:8080**.

### 3. Frontend

```bash
pnpm dev:web
```

Dashboard at **http://localhost:3000**.

### 4. Browser Extension

```bash
pnpm dev:extension
```

Plasmo compiles in watch mode to `apps/extension/build/chrome-mv3-dev/`. Load that folder in Chrome — see [Browser Extension](#browser-extension) for the full steps.

---

## Browser Extension

### Loading in Chrome (development build)

1. Run `pnpm dev:extension` and wait for the first compile (`Done in …` in the terminal).
2. Open Chrome → `chrome://extensions`.
3. Enable **Developer mode** (toggle, top-right corner).
4. Click **Load unpacked** → select `apps/extension/build/chrome-mv3-dev`.
5. **Persista** appears in the list. Pin it to the toolbar for easy access.

> Chrome 116 or later is required. The extension uses Manifest V3 APIs unavailable in earlier versions.

### Reloading after code changes

Plasmo rebuilds automatically on save. After each rebuild:

| Changed | Action required |
|---------|----------------|
| Background service worker | Click **↺ reload** on the extension card at `chrome://extensions` |
| Content scripts / popup | Reload the affected tab or reopen the popup |
| `manifest.json` | Always click **↺ reload** at `chrome://extensions` |

### Production build

```bash
# Build
pnpm build:extension
# Output: apps/extension/build/chrome-mv3-prod/

# Package for distribution
pnpm --filter @aicc/extension build:zip
# Output: apps/extension/build/chrome-mv3-prod.zip
```

> Always use the production build (`chrome-mv3-prod`) for real testing. The dev build uses an LMDB-backed watcher that crashes on paths containing spaces or inside OneDrive sync directories.

### Chrome Web Store

When the extension reaches a stable release, submit `chrome-mv3-prod.zip` to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Until then, share the `.zip` and direct testers to use Load unpacked.

---

## Development Commands

```bash
# Dependencies
pnpm install                                    # Install all JS workspace deps

# Infrastructure
pnpm docker:up                                  # Start all Docker services
pnpm docker:down                                # Stop all Docker services
docker compose -f infra/docker/docker-compose.yml logs -f   # Tail logs

# Code quality
pnpm lint                                       # ESLint across all packages
pnpm typecheck                                  # tsc --noEmit across all packages
pnpm format                                     # Prettier on TS / JSON / Markdown

# Build
pnpm build:web                                  # Production Next.js build
pnpm build:extension                            # Production extension build
cd apps/backend && ./gradlew bootJar            # Backend JAR → apps/backend/build/libs/

# Test
cd apps/backend && ./gradlew test               # Backend unit + integration tests

# Database
./scripts/reset-db.sh                           # Wipe volumes, replay all Flyway migrations (destructive)
```

---

## Service Ports

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Backend API | 8080 | http://localhost:8080 | Working |
| Next.js frontend | 3000 | http://localhost:3000 | Working |
| PostgreSQL | 5432 | — | Working |
| MinIO S3 API | 9000 | http://localhost:9000 | Working |
| MinIO console | 9001 | http://localhost:9001 | Working |
| Prometheus | 9090 | http://localhost:9090 | Not yet verified |
| Grafana | 3001 | http://localhost:3001 | Not yet verified |
| Loki | 3100 | http://localhost:3100 | Not yet verified |

---

## Roadmap

**In progress**
- [ ] Observability stack — wire up and verify Prometheus scraping, Loki log ingestion, and Grafana dashboards end-to-end
- [ ] Nginx reverse proxy — test and validate `infra/nginx/nginx.conf` for production routing

**Pending**
- [ ] Gemini capture — verify DOM observer on `gemini.google.com`
- [ ] Context reconstruction — end-to-end testing and UI flow
- [ ] Projects — link sessions, add notes, tag by topic
- [ ] Semantic search — end-to-end testing with valid OpenAI key or verified local embeddings
- [ ] Firefox extension support
- [ ] Chrome Web Store submission

---

## Troubleshooting

**Backend fails to connect to Postgres**
Confirm `POSTGRES_HOST`, `POSTGRES_PORT`, and `POSTGRES_PASSWORD` in `.env` match `infra/docker/.env`. On Windows, `start-backend.ps1` reads `.env` automatically; `gradlew bootRun` requires the variables to already be in your shell environment.

**Flyway migration errors on startup**
Run `./scripts/reset-db.sh` to wipe volumes and replay all migrations from scratch. Never delete individual migration files.

**Extension does not appear after Load unpacked**
Confirm you selected `apps/extension/build/chrome-mv3-dev` — the folder that contains `manifest.json`. If the folder is empty, the first build has not completed yet. Wait for `Done in …` in the `pnpm dev:extension` terminal.

**Extension shows an error badge immediately after loading**
Open `chrome://extensions → Persista → Details → Inspect views → service worker`. The most common cause is the backend not running on port 8080.

**Extension is loaded but not syncing**
Check the service worker console for `NET::ERR_CONNECTION_REFUSED`. If present, start the backend first. Also confirm the toggle in the extension popup is set to **ON**.

**Auth errors after a database wipe**
Wiping the database invalidates all issued tokens. Open the extension popup, log out, and log back in.

**Changes to source code are not taking effect in the extension**
Click **↺ reload** on the extension card at `chrome://extensions` after each Plasmo rebuild. For content script changes, also reload the active tab (`chat.openai.com`, `claude.ai`, or `gemini.google.com`).

**"Could not load manifest" when loading unpacked**
The build folder is incomplete. Run `pnpm --filter @aicc/extension clean && pnpm dev:extension` to rebuild from scratch.

**`pnpm install` fails on shared-types**
Build the shared package first: `pnpm --filter @aicc/shared-types build`. This runs automatically via `dev-setup.sh`.

**Windows: three JVM processes exhausting memory**
Use `.\scripts\start-backend.ps1` instead of `gradlew bootRun`. The script builds the JAR first (Gradle exits), then starts a single `java -jar` process.

---

## License

[MIT](LICENSE) © Niharika M R
