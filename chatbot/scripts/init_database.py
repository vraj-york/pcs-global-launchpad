#!/usr/bin/env python3
"""
Database Initialization Script for RAG System

This script:
1. Connects to PostgreSQL RDS
2. Installs pgvector extension
3. Creates necessary tables for document storage and vector search
4. Sets up indexes for optimal query performance

Run after RDS deployment:
    python scripts/init_database.py --env dev
"""

import psycopg2
import boto3
import json
import argparse
import sys
from typing import Dict

from env_config import EnvConfigError, exit_on_config_error, get_rds_connection_info

# Table schema
CREATE_TABLES_SQL = """
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

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
    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, ready, error
    error_message TEXT,
    metadata JSONB,  -- Additional metadata (tags, categories, etc.)
    INDEX idx_filename ON documents(filename),
    INDEX idx_status ON documents(status),
    INDEX idx_upload_timestamp ON documents(upload_timestamp)
);

-- Document chunks table (chunked text with embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,  -- Order of chunk in document
    chunk_text TEXT NOT NULL,  -- The actual text content
    chunk_embedding vector(1024),  -- Titan Text Embeddings V2 = 1024 dimensions
    token_count INTEGER,  -- Approximate token count
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, chunk_index)
);

-- Create index for vector similarity search (HNSW for fast approximate nearest neighbor)
-- This index dramatically speeds up vector similarity queries
CREATE INDEX IF NOT EXISTS idx_chunk_embedding_hnsw 
ON document_chunks 
USING hnsw (chunk_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create index for document_id lookups
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
    user_id VARCHAR(255),  -- Optional user tracking
    session_id VARCHAR(255),  -- Optional session tracking
    INDEX idx_timestamp ON query_history(timestamp),
    INDEX idx_user_id ON query_history(user_id)
);

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_updated
DROP TRIGGER IF EXISTS update_documents_last_updated ON documents;
CREATE TRIGGER update_documents_last_updated
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated();

-- Grant permissions (if using different roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;
"""

# Verification queries
VERIFY_QUERIES = [
    "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';",
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
    "SELECT indexname FROM pg_indexes WHERE schemaname = 'public';",
]


def get_db_credentials(secret_arn: str, region: str) -> Dict[str, str]:
    """Retrieve database credentials from Secrets Manager"""
    print(f"Retrieving credentials from Secrets Manager...")
    
    client = boto3.client('secretsmanager', region_name=region)
    # Note: SecretId parameter accepts both secret name and ARN
    response = client.get_secret_value(SecretId=secret_arn)
    secret = json.loads(response['SecretString'])
    
    return secret


def get_db_endpoint(env_name: str, region: str) -> Dict[str, str]:
    """Get database connection details from environment YAML."""
    del region  # credentials fetched separately via secret_arn
    try:
        return get_rds_connection_info(env_name)
    except EnvConfigError as exc:
        exit_on_config_error(exc)


def init_database(env_name: str, region: str):
    """Initialize the database with pgvector and create tables"""
    print(f"\n{'='*60}")
    print(f"DATABASE INITIALIZATION FOR RAG SYSTEM")
    print(f"{'='*60}\n")
    
    # Get database connection details
    db_info = get_db_endpoint(env_name, region)
    credentials = get_db_credentials(db_info['secret_arn'], region)
    
    # Connection parameters
    conn_params = {
        'host': db_info['host'],
        'port': int(db_info['port']),
        'dbname': db_info['dbname'],
        'user': credentials['username'],
        'password': credentials['password'],
        'connect_timeout': 10
    }
    
    print(f"Connecting to database...")
    print(f"  Host: {conn_params['host']}")
    print(f"  Port: {conn_params['port']}")
    print(f"  Database: {conn_params['dbname']}")
    print(f"  User: {conn_params['user']}\n")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**conn_params)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("✓ Successfully connected to database!\n")
        
        # Execute initialization SQL
        print("Creating tables and indexes...")
        cursor.execute(CREATE_TABLES_SQL)
        print("✓ Tables and indexes created successfully!\n")
        
        # Verify installation
        print("Verifying installation...\n")
        
        # Check pgvector extension
        cursor.execute(VERIFY_QUERIES[0])
        result = cursor.fetchone()
        if result:
            print(f"✓ pgvector extension: v{result[1]}")
        else:
            print("✗ pgvector extension not found!")
            sys.exit(1)
        
        # Check tables
        cursor.execute(VERIFY_QUERIES[1])
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\n✓ Created tables ({len(tables)}):")
        for table in sorted(tables):
            print(f"  - {table}")
        
        # Check indexes
        cursor.execute(VERIFY_QUERIES[2])
        indexes = [row[0] for row in cursor.fetchall()]
        print(f"\n✓ Created indexes ({len(indexes)}):")
        for index in sorted(indexes):
            print(f"  - {index}")
        
        # Get table counts
        print(f"\n✓ Table statistics:")
        for table in ['documents', 'document_chunks', 'query_history']:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            print(f"  - {table}: {count} rows")
        
        cursor.close()
        conn.close()
        
        print(f"\n{'='*60}")
        print(f"DATABASE INITIALIZATION COMPLETED SUCCESSFULLY!")
        print(f"{'='*60}\n")
        print("Next steps:")
        print("1. Test document upload: Upload a document to S3")
        print("2. Test ingestion: Process document and create embeddings")
        print("3. Test query: Search for relevant chunks")
        print()
        
    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Initialize PostgreSQL database for RAG system"
    )
    parser.add_argument(
        "--env",
        type=str,
        default="stage",
        choices=["dev", "stage", "uat", "prod"],
        help="Environment name (dev, stage, uat, or prod)"
    )
    parser.add_argument(
        "--region",
        type=str,
        default="us-east-1",
        help="AWS region"
    )
    
    args = parser.parse_args()
    
    # Check boto3 is configured
    try:
        boto3.client('sts').get_caller_identity()
    except Exception as e:
        print("Error: AWS credentials not configured!")
        print("Please run: aws configure")
        sys.exit(1)
    
    init_database(args.env, args.region)


if __name__ == "__main__":
    main()
