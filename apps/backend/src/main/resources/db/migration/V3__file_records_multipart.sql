-- V3: File records — multipart upload tracking, nullable checksum, updated_at

-- checksum is null until upload completes
ALTER TABLE file_records
    ALTER COLUMN checksum DROP NOT NULL;

-- multipart_upload_id: MinIO multipart upload ID for in-flight resumable uploads
-- updated_at: last mutation timestamp managed by the application layer
ALTER TABLE file_records
    ADD COLUMN multipart_upload_id TEXT,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Fast lookup by status + age for the lifecycle cleanup scheduler
CREATE INDEX idx_file_records_status_created
    ON file_records(upload_status, created_at);
