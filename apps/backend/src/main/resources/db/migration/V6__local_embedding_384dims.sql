-- V6: Switch embedding dimension from 1536 (OpenAI) to 384 (local AllMiniLmL6V2)
-- Existing embeddings are incompatible with the new dimension so the column is replaced.

DROP INDEX IF EXISTS idx_semantic_memories_embedding_hnsw;

ALTER TABLE semantic_memories DROP COLUMN IF EXISTS embedding;
ALTER TABLE semantic_memories ADD COLUMN embedding vector(384);

CREATE INDEX idx_semantic_memories_embedding_hnsw
    ON semantic_memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
