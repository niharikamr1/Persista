-- Run once when the database is first created.
-- Flyway migrations handle the schema; this file handles DB-level setup.

-- Enable pgvector so the extension is available for all future schemas.
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_stat_statements for query performance monitoring (Prometheus/Grafana).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Ensure UTC timezone is set for this database.
ALTER DATABASE aicc SET timezone TO 'UTC';
