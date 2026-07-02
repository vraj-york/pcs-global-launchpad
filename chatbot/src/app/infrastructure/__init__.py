"""
Infrastructure Layer

AWS service clients and external integrations.
All AWS-specific code lives here for easy mocking and testing.
"""

from .bedrock_client import BedrockClient
from .database import DatabaseClient
from .secrets import SecretsManager
from .backend_client import BackendAPIClient
from .crypto import CryptoClient

__all__ = [
    "BedrockClient",
    "DatabaseClient",
    "SecretsManager",
    "BackendAPIClient",
    "CryptoClient",
]
