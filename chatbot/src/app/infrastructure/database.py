"""
Database Client

Manages PostgreSQL connections and provides connection pooling.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, Union

from app.config import settings
from app.infrastructure.secrets import SecretsManager

ByteaValue = Union[bytes, memoryview, bytearray]


def coerce_bytea(value: ByteaValue | None) -> bytes | None:
    """Normalize psycopg2 BYTEA values (often memoryview) to bytes."""
    if value is None:
        return None
    if isinstance(value, memoryview):
        return bytes(value)
    if isinstance(value, bytearray):
        return bytes(value)
    return value


class DatabaseClient:
    """Client for PostgreSQL database operations"""

    def __init__(self):
        """Initialize database client"""
        self.secrets_manager = SecretsManager()
        self._connection = None

    def _get_connection_params(self) -> dict:
        """
        Get database connection parameters

        Returns:
            Dict with connection parameters
        """
        if not settings.has_database_config:
            raise ValueError(
                "Database configuration missing. Required: " "DB_HOST, DB_NAME, DB_SECRET_ARN"
            )

        credentials = self.secrets_manager.get_db_credentials()

        return {
            "host": settings.DB_HOST,
            "port": int(settings.DB_PORT),
            "dbname": settings.DB_NAME,
            "user": credentials["username"],
            "password": credentials["password"],
            "connect_timeout": 10,
        }

    @contextmanager
    def get_connection(self, dict_cursor: bool = True) -> Generator:
        """
        Get database connection context manager

        Args:
            dict_cursor: Whether to use RealDictCursor (returns rows as dicts)

        Yields:
            Database connection

        Example:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM documents")
                results = cursor.fetchall()
        """
        conn = None
        try:
            params = self._get_connection_params()
            cursor_factory = RealDictCursor if dict_cursor else None
            conn = psycopg2.connect(cursor_factory=cursor_factory, **params)
            yield conn
        finally:
            if conn:
                conn.close()

    @contextmanager
    def get_cursor(self, dict_cursor: bool = True) -> Generator:
        """
        Get database cursor context manager

        Args:
            dict_cursor: Whether to use RealDictCursor

        Yields:
            Database cursor

        Example:
            with db.get_cursor() as cursor:
                cursor.execute("SELECT * FROM documents")
                results = cursor.fetchall()
        """
        with self.get_connection(dict_cursor=dict_cursor) as conn:
            cursor = conn.cursor()
            try:
                yield cursor
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                cursor.close()
