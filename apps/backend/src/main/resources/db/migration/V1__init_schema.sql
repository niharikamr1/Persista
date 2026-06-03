-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id            TEXT        NOT NULL PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    display_name  TEXT,
    role          TEXT        NOT NULL DEFAULT 'USER',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Refresh Tokens ────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          TEXT        NOT NULL PRIMARY KEY,
    user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ── Capture Events (append-only) ─────────────────────────────────────────────
CREATE TABLE capture_events (
    id               TEXT        NOT NULL PRIMARY KEY,
    session_id       TEXT        NOT NULL,
    user_id          TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform         TEXT        NOT NULL,
    event_type       TEXT        NOT NULL,
    conversation_id  TEXT,
    payload          JSONB       NOT NULL DEFAULT '{}',
    client_timestamp TIMESTAMPTZ NOT NULL,
    received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sequence_number  BIGINT      NOT NULL
);
CREATE INDEX idx_capture_events_user_id    ON capture_events(user_id);
CREATE INDEX idx_capture_events_session_id ON capture_events(session_id);
CREATE INDEX idx_capture_events_platform   ON capture_events(platform);

-- ── Sync Checkpoints ─────────────────────────────────────────────────────────
CREATE TABLE sync_checkpoints (
    id                   TEXT        NOT NULL PRIMARY KEY,
    user_id              TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform             TEXT        NOT NULL,
    last_synced_event_id TEXT,
    last_synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, platform)
);

-- ── File Records ──────────────────────────────────────────────────────────────
CREATE TABLE file_records (
    id              TEXT        NOT NULL PRIMARY KEY,
    user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id TEXT,
    original_name   TEXT        NOT NULL,
    mime_type       TEXT        NOT NULL,
    size_bytes      BIGINT      NOT NULL,
    object_key      TEXT        NOT NULL UNIQUE,
    checksum        TEXT        NOT NULL,
    upload_status   TEXT        NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_file_records_user_id ON file_records(user_id);

-- ── Semantic Memories (with pgvector) ─────────────────────────────────────────
CREATE TABLE semantic_memories (
    id              TEXT        NOT NULL PRIMARY KEY,
    user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_event_id TEXT        REFERENCES capture_events(id) ON DELETE SET NULL,
    memory_type     TEXT        NOT NULL,
    content         TEXT        NOT NULL,
    summary         TEXT,
    embedding       vector(1536),
    metadata        JSONB       DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_semantic_memories_user_id     ON semantic_memories(user_id);
CREATE INDEX idx_semantic_memories_memory_type ON semantic_memories(memory_type);
-- IVFFlat index for fast ANN search (requires data — created after first load)
-- CREATE INDEX idx_semantic_memories_embedding ON semantic_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
