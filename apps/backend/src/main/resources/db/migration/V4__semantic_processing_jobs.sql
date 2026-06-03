-- V4: Semantic processing job queue — tracks async extraction status per capture event

CREATE TABLE semantic_processing_jobs (
    id             TEXT        NOT NULL PRIMARY KEY,
    event_id       TEXT        NOT NULL REFERENCES capture_events(id) ON DELETE CASCADE,
    status         TEXT        NOT NULL DEFAULT 'PENDING',
    attempts       INT         NOT NULL DEFAULT 0,
    last_error     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at   TIMESTAMPTZ,
    UNIQUE (event_id)
);

-- Status + attempts index for the retry scheduler
CREATE INDEX idx_processing_jobs_status_attempts
    ON semantic_processing_jobs(status, attempts);
