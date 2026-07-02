"""
Repositories Layer

Data access layer that abstracts database operations.
All database queries are encapsulated here.
"""

from .vector_repository import VectorRepository
from .document_repository import DocumentRepository
from .audit_repository import AuditRepository
from .conversation_repository import ConversationRepository
from .message_repository import MessageRepository
from .summary_repository import SummaryRepository
from .memory_repository import MemoryRepository
from .memory_consent_repository import MemoryConsentRepository
from .user_dek_repository import UserDekRepository

__all__ = [
    "VectorRepository",
    "DocumentRepository",
    "AuditRepository",
    "ConversationRepository",
    "MessageRepository",
    "SummaryRepository",
    "MemoryRepository",
    "MemoryConsentRepository",
    "UserDekRepository",
]
