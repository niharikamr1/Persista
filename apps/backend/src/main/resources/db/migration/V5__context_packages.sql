CREATE TABLE context_packages (
    id            TEXT        NOT NULL PRIMARY KEY,
    user_id       TEXT        NOT NULL,
    cache_key     TEXT        NOT NULL,
    payload       JSONB       NOT NULL DEFAULT '{}',
    token_count   INT         NOT NULL DEFAULT 0,
    segment_count INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX idx_context_packages_cache_key ON context_packages(cache_key);
CREATE INDEX idx_context_packages_user_id         ON context_packages(user_id);
CREATE INDEX idx_context_packages_expires_at       ON context_packages(expires_at);
