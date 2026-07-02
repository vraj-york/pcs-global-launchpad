"""
API Dependencies

FastAPI dependency injection setup for services and clients.
"""

from functools import lru_cache
from fastapi import Depends
from app.infrastructure import BedrockClient, DatabaseClient, CryptoClient
from app.infrastructure.backend_client import BackendAPIClient
from app.infrastructure.growth_spark_cache import GrowthSparkCache
from app.repositories import (
    VectorRepository, DocumentRepository,
    ConversationRepository, MessageRepository, SummaryRepository,
    MemoryRepository, MemoryConsentRepository, UserDekRepository,
)
from app.repositories.export_log_repository import ExportLogRepository
from app.services import (
    ChatService, UnifiedChatService, ThreadService,
    ConversationWindowService, SummaryMaintainerService, BspContextInjector,
    BSPPromptInjector, PeerMentionContextInjector, ContextProfileService,
    ProactiveEmployeeService,
    AssessmentTriggerService,
    GrowthSparkService,
)
from app.services.tool_calling import ToolCallingService
from app.services.authorization_service import AuthorizationResolver
from app.services.memory.embedding_service import MemoryEmbeddingService
from app.services.memory.retriever import MemoryRetriever
from app.services.memory.extraction_service import MemoryExtractionService
from app.services.memory.memory_service import MemoryService
from app.services.memory.user_dek_crypto import UserDekCrypto


#  Infrastructure 

@lru_cache(maxsize=1)
def get_bedrock_client() -> BedrockClient:
    """Singleton Bedrock client shared across all services."""
    return BedrockClient()


@lru_cache(maxsize=1)
def get_database_client() -> DatabaseClient:
    """Singleton database client."""
    return DatabaseClient()


@lru_cache(maxsize=1)
def get_crypto_client() -> CryptoClient:
    """Singleton KMS crypto client for message encryption/decryption."""
    return CryptoClient()


#  Repositories 

def get_vector_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> VectorRepository:
    return VectorRepository(db_client=db_client)


def get_document_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> DocumentRepository:
    return DocumentRepository(db_client=db_client)


def get_conversation_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> ConversationRepository:
    return ConversationRepository(db_client=db_client)


def get_message_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> MessageRepository:
    return MessageRepository(db_client=db_client)


def get_summary_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> SummaryRepository:
    return SummaryRepository(db_client=db_client)


def get_memory_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> MemoryRepository:
    return MemoryRepository(db_client=db_client)


def get_memory_consent_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> MemoryConsentRepository:
    return MemoryConsentRepository(db_client=db_client)


def get_memory_embedding_service(
    bedrock_client: BedrockClient = Depends(get_bedrock_client),
) -> MemoryEmbeddingService:
    return MemoryEmbeddingService(bedrock_client)


def get_user_dek_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> UserDekRepository:
    return UserDekRepository(db_client)


def get_user_dek_crypto(
    crypto: CryptoClient = Depends(get_crypto_client),
    dek_repo: UserDekRepository = Depends(get_user_dek_repository),
) -> UserDekCrypto:
    return UserDekCrypto(crypto=crypto, dek_repo=dek_repo)


def get_memory_retriever(
    memory_repo: MemoryRepository = Depends(get_memory_repository),
    embedding_service: MemoryEmbeddingService = Depends(get_memory_embedding_service),
    user_dek_crypto: UserDekCrypto = Depends(get_user_dek_crypto),
) -> MemoryRetriever:
    return MemoryRetriever(
        memory_repo=memory_repo,
        embedding_service=embedding_service,
        user_dek_crypto=user_dek_crypto,
    )


def get_memory_extraction_service(
    memory_repo: MemoryRepository = Depends(get_memory_repository),
    consent_repo: MemoryConsentRepository = Depends(get_memory_consent_repository),
    embedding_service: MemoryEmbeddingService = Depends(get_memory_embedding_service),
    user_dek_crypto: UserDekCrypto = Depends(get_user_dek_crypto),
    bedrock_client: BedrockClient = Depends(get_bedrock_client),
) -> MemoryExtractionService:
    return MemoryExtractionService(
        memory_repo=memory_repo,
        consent_repo=consent_repo,
        embedding_service=embedding_service,
        user_dek_crypto=user_dek_crypto,
        bedrock_client=bedrock_client,
    )


def get_memory_service(
    memory_repo: MemoryRepository = Depends(get_memory_repository),
    consent_repo: MemoryConsentRepository = Depends(get_memory_consent_repository),
    embedding_service: MemoryEmbeddingService = Depends(get_memory_embedding_service),
    user_dek_crypto: UserDekCrypto = Depends(get_user_dek_crypto),
) -> MemoryService:
    return MemoryService(
        memory_repo=memory_repo,
        consent_repo=consent_repo,
        embedding_service=embedding_service,
        user_dek_crypto=user_dek_crypto,
    )


#  Services 

def get_tool_calling_service(
    bedrock_client: BedrockClient   = Depends(get_bedrock_client),
    vector_repo   : VectorRepository = Depends(get_vector_repository),
) -> ToolCallingService:
    """
    ToolCallingService with BedrockClient (for embeddings) and VectorRepository
    (for search_knowledge_base RBAC-filtered retrieval).
    """
    return ToolCallingService(bedrock_client=bedrock_client, vector_repo=vector_repo)


def get_thread_service(
    conv_repo: ConversationRepository = Depends(get_conversation_repository),
    msg_repo : MessageRepository      = Depends(get_message_repository),
    crypto   : CryptoClient           = Depends(get_crypto_client),
) -> ThreadService:
    """ThreadService with injected repositories and KMS crypto client."""
    return ThreadService(conv_repo=conv_repo, msg_repo=msg_repo, crypto=crypto)


def get_export_log_repository(
    db_client: DatabaseClient = Depends(get_database_client),
) -> ExportLogRepository:
    """
    ExportLogRepository — append-only audit trail for conversation exports.

    Injected into the export endpoint to record every access attempt
    (success or failure) for HIPAA audit trail and rate-limiting purposes.
    """
    return ExportLogRepository(db_client=db_client)


@lru_cache(maxsize=1)
def get_backend_client() -> BackendAPIClient:
    """Singleton BackendAPIClient for tool-calling and BSP profile fetches."""
    return BackendAPIClient()


@lru_cache(maxsize=1)
def get_authorization_resolver() -> AuthorizationResolver:
    """Singleton read-only RBAC resolver sharing the backend client."""
    return AuthorizationResolver(backend_client=get_backend_client())


@lru_cache(maxsize=1)
def get_bsp_injector() -> BspContextInjector:
    """
    Singleton BspContextInjector.

    Coach coachee snapshots and authenticated-user personalization context.
    """
    return BspContextInjector(backend_client=get_backend_client())


@lru_cache(maxsize=1)
def get_peer_mention_injector() -> PeerMentionContextInjector:
    """Singleton peer mention context injector for employee @mentions."""
    return PeerMentionContextInjector(backend_client=get_backend_client())


def get_conv_window(
    msg_repo    : MessageRepository = Depends(get_message_repository),
    summary_repo: SummaryRepository = Depends(get_summary_repository),
    crypto      : CryptoClient      = Depends(get_crypto_client),
) -> ConversationWindowService:
    """
    ConversationWindowService — builds the enriched LLM context window.

    Replaces thread_service.load_history_for_thread() in Sprint 3.
    Prepends a compressed thread summary when older messages exist
    outside the verbatim window.
    """
    return ConversationWindowService(
        msg_repo=msg_repo, summary_repo=summary_repo, crypto=crypto
    )


def get_summary_maintainer(
    msg_repo    : MessageRepository = Depends(get_message_repository),
    summary_repo: SummaryRepository = Depends(get_summary_repository),
    crypto      : CryptoClient      = Depends(get_crypto_client),
    bedrock     : BedrockClient     = Depends(get_bedrock_client),
) -> SummaryMaintainerService:
    """
    SummaryMaintainerService — called after DoneEvent to regenerate the
    thread summary when the message count exceeds REFRESH_THRESHOLD.
    Uses Claude Haiku (configurable via BEDROCK_SUMMARY_MODEL env var).
    """
    return SummaryMaintainerService(
        msg_repo=msg_repo, summary_repo=summary_repo,
        crypto=crypto, bedrock=bedrock,
    )


@lru_cache(maxsize=1)
def get_context_profile_service() -> ContextProfileService:
    """Unified warm-tier context resolver for personalization and peers."""
    return ContextProfileService(
        bsp_injector=get_bsp_injector(),
        peer_mention_injector=get_peer_mention_injector(),
    )


def get_chat_service_with_bsp(
    bedrock_client       : BedrockClient              = Depends(get_bedrock_client),
    tool_calling_service : ToolCallingService          = Depends(get_tool_calling_service),
    bsp_injector         : BspContextInjector          = Depends(get_bsp_injector),
    peer_mention_injector: PeerMentionContextInjector  = Depends(get_peer_mention_injector),
) -> ChatService:
    """
    ChatService wired with BspContextInjector and PeerMentionContextInjector.

    Coach: coachee BSP profile via client_id (Path C).
    Employee/default: user personalization + optional peer @mentions.
    """
    return ChatService(
        bedrock_client        = bedrock_client,
        tool_calling_service  = tool_calling_service,
        bsp_injector          = bsp_injector,
        peer_mention_injector = peer_mention_injector,
    )


def get_unified_chat_service(
    bedrock_client     : BedrockClient            = Depends(get_bedrock_client),
    chat_service       : ChatService              = Depends(get_chat_service_with_bsp),
    context_profile    : ContextProfileService    = Depends(get_context_profile_service),
    thread_service     : ThreadService            = Depends(get_thread_service),
    conv_window        : ConversationWindowService = Depends(get_conv_window),
    summary_maintainer : SummaryMaintainerService  = Depends(get_summary_maintainer),
    memory_retriever   : MemoryRetriever          = Depends(get_memory_retriever),
    memory_extractor   : MemoryExtractionService  = Depends(get_memory_extraction_service),
    authorization_resolver : AuthorizationResolver = Depends(get_authorization_resolver),
) -> UnifiedChatService:
    """
    UnifiedChatService — full Sprint 3 pipeline.

    Wires:
      • ThreadService       — auto-thread creation, CRUD, message persistence
      • ConversationWindowService — enriched context window with summary prepend
      • SummaryMaintainerService  — background Haiku summarisation after DoneEvent
      • ChatService — BSP + peer mention + user personalization injection
    """
    return UnifiedChatService(
        bedrock_client     = bedrock_client,
        chat_service       = chat_service,
        context_profile    = context_profile,
        thread_service     = thread_service,
        conv_window        = conv_window,
        summary_maintainer = summary_maintainer,
        memory_retriever   = memory_retriever,
        memory_extractor   = memory_extractor,
        authorization_resolver = authorization_resolver,
    )


@lru_cache(maxsize=1)
def get_proactive_employee_service() -> ProactiveEmployeeService:
    """Singleton proactive payload service for employee empty-state nudges."""
    return ProactiveEmployeeService()


def get_assessment_trigger_service(
    thread_service: ThreadService = Depends(get_thread_service),
    bedrock: BedrockClient = Depends(get_bedrock_client),
) -> AssessmentTriggerService:
    """Assessment-trigger coaching session bootstrap."""
    return AssessmentTriggerService(
        thread_service=thread_service,
        bedrock=bedrock,
    )


@lru_cache(maxsize=1)
def get_growth_spark_cache() -> GrowthSparkCache:
    """Singleton Growth Spark daily cache."""
    return GrowthSparkCache()


def get_growth_spark_service(
    bedrock: BedrockClient = Depends(get_bedrock_client),
    cache: GrowthSparkCache = Depends(get_growth_spark_cache),
) -> GrowthSparkService:
    """Daily Growth Spark generation for dashboard."""
    return GrowthSparkService(bedrock=bedrock, cache=cache)
