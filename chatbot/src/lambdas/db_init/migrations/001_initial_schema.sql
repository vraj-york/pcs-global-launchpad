-- Migration 001: Initial schema
-- Sets up pgvector extension, core tables, indexes, and triggers

-- Enable pgvector extension.
-- Uses a DO block so it works whether or not the current user has rds_superuser:
--   * rds_superuser → installs it.
--   * regular user + already installed by admin → silently continues.
--   * regular user + not installed → raises a clear actionable error.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN insufficient_privilege THEN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION E'pgvector is not installed and the DB user lacks rds_superuser.\nAsk the RDS admin to run once on bispybot:\n    CREATE EXTENSION vector;';
    END IF;
    RAISE NOTICE 'pgvector already installed by admin — skipping.';
END;
$$;

-- Documents table (metadata and tracking)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL UNIQUE,
    s3_bucket VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB,
    allowed_roles JSONB DEFAULT '["superadmin"]'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allowed_roles ON documents USING GIN (allowed_roles);
CREATE INDEX IF NOT EXISTS idx_filename ON documents(filename);
CREATE INDEX IF NOT EXISTS idx_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_upload_timestamp ON documents(upload_timestamp);

-- Document chunks table (chunked text with embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_embedding vector(1024),
    token_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunk_embedding_hnsw
ON document_chunks
USING hnsw (chunk_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_chunk_document_id ON document_chunks(document_id);

-- Query history table (for analytics and debugging)
CREATE TABLE IF NOT EXISTS query_history (
    id SERIAL PRIMARY KEY,
    query_text TEXT NOT NULL,
    query_embedding vector(1024),
    top_k INTEGER,
    results_count INTEGER,
    execution_time_ms FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    session_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_qh_timestamp ON query_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_qh_user_id ON query_history(user_id);

-- Function to auto-update last_updated on documents
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documents_last_updated ON documents;
CREATE TRIGGER update_documents_last_updated
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated();

-- Grant permissions to the current executing user so future migrations
-- and Lambda connections can access all tables and sequences.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
