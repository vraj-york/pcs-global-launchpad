"""
Shared Package

Reusable code shared between main application and specialized lambdas.
Contains common utilities for document processing, embeddings, and database operations.
"""

from .chunking import chunk_text, chunk_sections
from .embeddings import generate_embedding, generate_embeddings_batch
from .database_utils import get_db_connection, get_db_credentials

__all__ = [
    "chunk_text",
    "chunk_sections",
    "generate_embedding",
    "generate_embeddings_batch",
    "get_db_connection",
    "get_db_credentials",
]
