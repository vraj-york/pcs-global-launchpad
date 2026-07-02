"""
Vector Repository

Handles vector similarity search operations for RAG.
"""

from typing import List, Dict, Optional
from app.infrastructure import DatabaseClient
from app.config import settings


class VectorRepository:
    """Repository for vector search operations"""

    def __init__(self, db_client: Optional[DatabaseClient] = None):
        """
        Initialize vector repository

        Args:
            db_client: Optional database client (creates new one if not provided)
        """
        self.db = db_client or DatabaseClient()

    def search_similar_chunks(
        self,
        query_embedding: List[float],
        top_k: int = None,
        min_similarity: float = None,
        user_role: str = "default",
    ) -> List[Dict]:
        """
        Search for similar document chunks using cosine similarity
        with role-based access control

        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return (defaults to settings)
            min_similarity: Minimum similarity threshold (defaults to settings)
            user_role: User's role for RBAC filtering (default: "default")

        Returns:
            List of matching chunks with metadata (filtered by user role)
        """
        if top_k is None:
            top_k = settings.RAG_TOP_K
        if min_similarity is None:
            min_similarity = settings.RAG_MIN_SIMILARITY

        query = """
            SELECT
                dc.id,
                dc.chunk_text,
                dc.chunk_index,
                dc.token_count,
                d.filename,
                d.s3_key,
                d.metadata,
                d.allowed_roles,
                (1 - (dc.chunk_embedding <=> %s::vector)) AS similarity
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.status = 'ready'
            AND (1 - (dc.chunk_embedding <=> %s::vector)) >= %s
            AND (
                d.allowed_roles IS NULL
                OR d.allowed_roles @> %s::jsonb
            )
            ORDER BY dc.chunk_embedding <=> %s::vector
            LIMIT %s;
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(
                query,
                (
                    query_embedding,
                    query_embedding,
                    min_similarity,
                    f'["{user_role}"]',  # Convert role to JSONB array format
                    query_embedding,
                    top_k,
                ),
            )

            results = []
            for row in cursor.fetchall():
                results.append(
                    {
                        "chunk_id": row["id"],
                        "chunk_text": row["chunk_text"],
                        "chunk_index": row["chunk_index"],
                        "token_count": row["token_count"],
                        "filename": row["filename"],
                        "s3_key": row["s3_key"],
                        "metadata": row["metadata"],
                        "allowed_roles": row["allowed_roles"],
                        "similarity": float(row["similarity"]),
                    }
                )

            return results

    def insert_chunks(self, document_id: int, chunks: List[Dict]) -> int:
        """
        Insert document chunks with embeddings

        Args:
            document_id: ID of the parent document
            chunks: List of chunk dictionaries with 'chunk_text', 'embedding', etc.

        Returns:
            Number of chunks inserted
        """
        query = """
            INSERT INTO document_chunks (
                document_id, chunk_index, chunk_text,
                chunk_embedding, token_count
            )
            VALUES (%s, %s, %s, %s::vector, %s);
        """

        with self.db.get_cursor() as cursor:
            for chunk in chunks:
                cursor.execute(
                    query,
                    (
                        document_id,
                        chunk["chunk_index"],
                        chunk["chunk_text"],
                        chunk["embedding"],
                        chunk["token_count"],
                    ),
                )

            return len(chunks)

    def get_database_stats(self) -> Dict:
        """
        Get statistics about the RAG database

        Returns:
            Dict with document and chunk counts
        """
        stats = {}

        with self.db.get_cursor() as cursor:
            # Count documents
            cursor.execute("SELECT COUNT(*) as count FROM documents WHERE status = 'ready';")
            stats["total_documents"] = cursor.fetchone()["count"]

            # Count chunks
            cursor.execute("SELECT COUNT(*) as count FROM document_chunks;")
            stats["total_chunks"] = cursor.fetchone()["count"]

            # Get document list
            cursor.execute("""
                SELECT filename, metadata
                FROM documents
                WHERE status = 'ready'
                ORDER BY upload_timestamp DESC;
            """)
            stats["documents"] = [
                {"filename": row["filename"], "metadata": row["metadata"]}
                for row in cursor.fetchall()
            ]

        return stats
