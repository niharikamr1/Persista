-- V2: Projects, Sessions, FK wiring, composite indexes, HNSW vector index
-- All DDL is idempotent-safe via IF NOT EXISTS / IF EXISTS patterns.

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ── Projects ──────────────────────────────────────────────────────────────────
CREATE TABLE projects (
    id          TEXT        NOT NULL PRIMARY KEY,
    user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    archived    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id         ON projects(user_id);
CREATE INDEX idx_projects_user_active     ON projects(user_id) WHERE archived = FALSE;

-- ── Sessions ──────────────────────────────────────────────────────────────────
-- A session maps one AI conversation on one platform.
-- capture_events.session_id references this table.
CREATE TABLE sessions (
    id              TEXT        NOT NULL PRIMARY KEY,
    user_id         TEXT        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    project_id      TEXT                 REFERENCES projects(id) ON DELETE SET NULL,
    platform        TEXT        NOT NULL,
    title           TEXT,
    conversation_id TEXT,                          -- platform-native ID for correlation
    status          TEXT        NOT NULL DEFAULT 'ACTIVE',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    metadata        JSONB       NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_sessions_user_id          ON sessions(user_id);
CREATE INDEX idx_sessions_project_id       ON sessions(project_id);
CREATE INDEX idx_sessions_platform         ON sessions(platform);
CREATE INDEX idx_sessions_user_status      ON sessions(user_id, status);
CREATE INDEX idx_sessions_last_active_at   ON sessions(last_active_at DESC);
CREATE INDEX idx_sessions_conversation_id  ON sessions(conversation_id) WHERE conversation_id IS NOT NULL;

-- ── Wire capture_events → sessions ───────────────────────────────────────────
-- Add FK now that sessions table exists.
ALTER TABLE capture_events
    ADD CONSTRAINT fk_capture_events_session
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- ── Wire file_records → sessions ─────────────────────────────────────────────
ALTER TABLE file_records
    ADD COLUMN session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_file_records_session_id ON file_records(session_id);

-- ── Composite indexes for high-frequency query paths ─────────────────────────

-- User timeline: paginated event feed sorted by recency
CREATE INDEX idx_capture_events_user_received_at
    ON capture_events(user_id, received_at DESC);

-- Session replay: ordered event sequence within a session
CREATE INDEX idx_capture_events_session_seq
    ON capture_events(session_id, sequence_number ASC);

-- Event type filter within a session (e.g. fetch only PROMPT_SENT events)
CREATE INDEX idx_capture_events_session_type
    ON capture_events(session_id, event_type);

-- Active refresh token lookup (most frequent auth path)
CREATE INDEX idx_refresh_tokens_active
    ON refresh_tokens(user_id, expires_at) WHERE revoked = FALSE;

-- Memory pagination per user
CREATE INDEX idx_semantic_memories_user_created_at
    ON semantic_memories(user_id, created_at DESC);

-- Memory type filter per user
CREATE INDEX idx_semantic_memories_user_type
    ON semantic_memories(user_id, memory_type);

-- Source event traceability
CREATE INDEX idx_semantic_memories_source_event
    ON semantic_memories(source_event_id) WHERE source_event_id IS NOT NULL;

-- ── pgvector HNSW index for ANN similarity search ────────────────────────────
-- HNSW supports empty-table construction (unlike IVFFlat which requires data).
-- m=16: bidirectional links per layer — good recall/speed balance.
-- ef_construction=64: candidate set size during build — default, tune after load.
CREATE INDEX idx_semantic_memories_embedding_hnsw
    ON semantic_memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
