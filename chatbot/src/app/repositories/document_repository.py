"""
Document Repository

Handles document metadata CRUD operations.
"""

from typing import Optional, Dict, Any
from app.infrastructure import DatabaseClient


class DocumentRepository:
    """Repository for document metadata operations"""

    def __init__(self, db_client: Optional[DatabaseClient] = None):
        """
        Initialize document repository

        Args:
            db_client: Optional database client
        """
        self.db = db_client or DatabaseClient()

    def create_document(
        self,
        filename: str,
        s3_key: str,
        s3_bucket: str,
        file_type: str,
        file_size_bytes: int,
        metadata: Dict[str, Any] = None,
    ) -> int:
        """
        Create document metadata record

        Args:
            filename: Name of the file
            s3_key: S3 object key
            s3_bucket: S3 bucket name
            file_type: File extension (pdf, docx, pptx, etc.)
            file_size_bytes: File size in bytes
            metadata: Optional metadata dictionary

        Returns:
            Document ID
        """
        query = """
            INSERT INTO documents (
                filename, s3_key, s3_bucket, file_type,
                file_size_bytes, status, metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """

        import json

        with self.db.get_cursor() as cursor:
            cursor.execute(
                query,
                (
                    filename,
                    s3_key,
                    s3_bucket,
                    file_type,
                    file_size_bytes,
                    "processing",
                    json.dumps(metadata or {}),
                ),
            )

            return cursor.fetchone()["id"]

    def update_document_status(
        self, document_id: int, status: str, error_message: Optional[str] = None
    ) -> None:
        """
        Update document processing status

        Args:
            document_id: Document ID
            status: New status ('processing', 'ready', 'error')
            error_message: Optional error message if status is 'error'
        """
        query = """
            UPDATE documents
            SET status = %s, error_message = %s
            WHERE id = %s;
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, (status, error_message, document_id))

    def get_document(self, document_id: int) -> Optional[Dict]:
        """
        Get document by ID

        Args:
            document_id: Document ID

        Returns:
            Document dictionary or None if not found
        """
        query = "SELECT * FROM documents WHERE id = %s;"

        with self.db.get_cursor() as cursor:
            cursor.execute(query, (document_id,))
            return cursor.fetchone()

    def list_documents(self, status: Optional[str] = None, limit: int = 100) -> list:
        """
        List documents with optional status filter

        Args:
            status: Optional status filter
            limit: Maximum number of documents to return

        Returns:
            List of document dictionaries
        """
        if status:
            query = """
                SELECT * FROM documents
                WHERE status = %s
                ORDER BY upload_timestamp DESC
                LIMIT %s;
            """
            params = (status, limit)
        else:
            query = """
                SELECT * FROM documents
                ORDER BY upload_timestamp DESC
                LIMIT %s;
            """
            params = (limit,)

        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()
