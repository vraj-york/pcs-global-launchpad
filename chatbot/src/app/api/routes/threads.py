"""
Thread Routes — /threads

REST CRUD for conversation threads and paginated message history.

Endpoints:
    GET    /threads                       List user's active threads (paginated)
    POST   /threads                       Create a new thread
    GET    /threads/{thread_id}           Get a single thread
    PATCH  /threads/{thread_id}           Rename or toggle pin
    DELETE /threads/{thread_id}           Soft-delete a thread
    GET    /threads/{thread_id}/messages  Paginated message history

Auth:
    All endpoints require a valid Authorization: Bearer <token> header.
    user_id_hash is extracted via extract_auth_context() — same mechanism as
    the chat endpoints.  HTTP 401 is returned when no token is present or
    user_id resolves to "unknown".

Error handling:
    ThreadOwnershipError → HTTP 404 ("not found or access denied") to avoid
    leaking the existence of other users' threads.
"""

import logging
from typing import Optional
import base64

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

from app.api.dependencies import (
    get_bedrock_client,
    get_export_log_repository,
    get_thread_service,
)
from app.repositories.export_log_repository import ExportLogRepository
from app.domain.exceptions import ThreadOwnershipError
from app.infrastructure import BedrockClient
from app.models.schema import (
    GenerateTitleRequest,
    GenerateTitleResponse,
    ThreadCreateRequest,
    ThreadListResponse,
    ThreadMessagesResponse,
    ThreadPatchRequest,
    ThreadResponse,
)
from app.services.export_service import export_filename, generate_chat_pdf
from app.services.thread_service import ThreadService
from app.utils.auth_context import extract_auth_context
from app.utils.jwt_verify import decode_jwt_claims
from app.utils.subscription_access import require_chatbot_subscription

router = APIRouter(prefix="/threads", tags=["Threads"])
logger = logging.getLogger(__name__)


#  Helpers

_TITLE_SYSTEM_PROMPT = (
    "You are a conversation title generator. "
    "Output ONLY a concise title of 4-6 words — nothing else. "
    "No quotes, no trailing punctuation, no explanation."
)


def _generate_title_with_haiku(
    bedrock: BedrockClient,
    user_message: str,
    assistant_reply: str,
) -> Optional[str]:
    """
    Call Claude Haiku to produce a 4-6 word title for a conversation's first exchange.

    Uses both the user message and the assistant reply as context so that even
    greeting messages ("Hi, who are you?") yield a meaningful title
    ("Introduction to Bispy Bot") based on what the assistant actually said.

    Returns the generated title string, or None on any error.
    """
    from app.config import settings

    content = (
        f"User: {user_message[:400]}\n\n"
        f"Assistant: {assistant_reply[:300]}\n\n"
        "Generate a concise title (4-6 words) for this conversation. "
        "Capture the main topic. If it's a greeting or introduction, "
        "describe what was introduced. Never output quotes or punctuation."
    )

    try:
        result = bedrock.generate_chat_response(
            messages=[{"role": "user", "content": content}],
            system_prompt=_TITLE_SYSTEM_PROMPT,
            max_tokens=30,
            temperature=0.5,
            tools=None,
            model_id=settings.BEDROCK_SUMMARY_MODEL,
        )
        for block in result.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text":
                title = block.get("text", "").strip().strip("\"'").rstrip(".")
                if title:
                    return title
    except Exception as exc:
        logger.warning("title_gen_haiku_failed", extra={"error": str(exc)})

    return None


def _extract_token(request: Request) -> Optional[str]:
    """Pull the Bearer token from the Authorization header, or return None."""
    auth_header = request.headers.get("Authorization", "")
    return auth_header[7:].strip() if auth_header.startswith("Bearer ") else None


def _require_user(request: Request) -> str:
    """
    Extract and return the authenticated user_id_hash.

    Raises HTTP 401 when no valid token is present.

    SECURITY NOTE / FIXME — Placeholder auth (tracked for upgrade):
      Currently ``extract_auth_context`` hashes the raw JWT sub without
      verifying the token signature.  The guard below (user_id == "unknown")
      only catches the *absence* of a token, not a forged one.

      Upgrade path: enable Cognito JWT signature verification inside
      ``extract_auth_context`` (see ``auth_context.py``). Once that is
      active this function's signature and all callers remain unchanged —
      ``auth.user_id`` will be the cryptographically-verified sub hash.
    """
    access_token = _extract_token(request)
    require_chatbot_subscription(access_token)
    auth = extract_auth_context(access_token=access_token, fallback_role="default")
    if auth.user_id == "unknown":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return auth.user_id


#  Thread list


@router.get("", response_model=ThreadListResponse)
def list_threads(
    fastapi_request: Request,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    thread_service: ThreadService = Depends(get_thread_service),
):
    """
    Return a paginated list of the authenticated user's active threads.

    Threads are ordered: pinned first, then by most recent activity.
    Use ``offset`` for page-through navigation.
    """
    user_id_hash = _require_user(fastapi_request)

    rows, total = thread_service.list_threads(user_id_hash, limit=limit, offset=offset)

    return {"threads": rows, "total": total}


#  Create thread


@router.post("", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
def create_thread(
    body: ThreadCreateRequest,
    fastapi_request: Request,
    thread_service: ThreadService = Depends(get_thread_service),
):
    """
    Create a new conversation thread.

    The thread starts with no messages and a default title of "New conversation".
    The client should send the returned ``id`` as ``thread_id`` in subsequent
    ChatRequest payloads to enable message persistence.

    Returns the newly created thread row.
    """
    user_id_hash = _require_user(fastapi_request)

    row = thread_service.get_or_create_thread(
        user_id_hash=user_id_hash,
        thread_id=None,
        persona=body.persona,
        chat_mode=body.chat_mode,
        coach_client_id=body.coach_client_id,
    )

    if body.title:
        thread_service.rename_thread(str(row["id"]), user_id_hash, body.title)
        row["title"] = body.title

    logger.info("thread_created: id=%s user=%s", row["id"], user_id_hash[:8])
    return row


#  Get thread


@router.get("/{thread_id}", response_model=ThreadResponse)
def get_thread(
    thread_id: str,
    fastapi_request: Request,
    thread_service: ThreadService = Depends(get_thread_service),
):
    """Return a single thread.  HTTP 404 if not found or not owned."""
    user_id_hash = _require_user(fastapi_request)

    row = thread_service.get_thread(thread_id, user_id_hash)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    return row


#  Update thread


@router.patch("/{thread_id}", response_model=ThreadResponse)
def update_thread(
    thread_id: str,
    body: ThreadPatchRequest,
    fastapi_request: Request,
    thread_service: ThreadService = Depends(get_thread_service),
):
    """
    Rename a thread and/or toggle its pinned status.

    At least one of ``title`` or ``pinned`` must be present in the body.
    Returns the updated thread on success.
    """
    user_id_hash = _require_user(fastapi_request)

    if body.title is None and body.pinned is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one of 'title' or 'pinned' must be provided.",
        )

    try:
        if body.title is not None:
            ok = thread_service.rename_thread(thread_id, user_id_hash, body.title)
            if not ok:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found."
                )

        if body.pinned is not None:
            ok = thread_service.set_pinned(thread_id, user_id_hash, body.pinned)
            if not ok:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found."
                )

    except ThreadOwnershipError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    row = thread_service.get_thread(thread_id, user_id_hash)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    return row


#  Delete thread


@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_thread(
    thread_id: str,
    fastapi_request: Request,
    thread_service: ThreadService = Depends(get_thread_service),
):
    """
    Soft-delete a thread.

    The thread is hidden from all subsequent list/get queries but is retained
    on disk for the GDPR audit window.  Returns HTTP 204 on success, HTTP 404
    if not found or not owned.
    """
    user_id_hash = _require_user(fastapi_request)

    try:
        deleted = thread_service.delete_thread(thread_id, user_id_hash)
    except ThreadOwnershipError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    logger.info("thread_deleted: id=%s user=%s", thread_id, user_id_hash[:8])


#  Title generation


@router.post("/{thread_id}/generate-title", response_model=GenerateTitleResponse)
def generate_title(
    thread_id: str,
    body: GenerateTitleRequest,
    fastapi_request: Request,
    thread_service: ThreadService = Depends(get_thread_service),
    bedrock: BedrockClient = Depends(get_bedrock_client),
):
    """
    Generate a short AI title for a thread based on its first exchange.

    Accepts the user message and assistant reply, runs them through Claude Haiku,
    persists the returned title on the thread, and returns it.

    Called by the frontend after the first streaming response completes in a new
    thread — fire-and-forget from the client's perspective.
    """
    user_id_hash = _require_user(fastapi_request)

    thread = thread_service.get_thread(thread_id, user_id_hash)
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    title = _generate_title_with_haiku(bedrock, body.user_message, body.assistant_reply)

    if title:
        thread_service.rename_thread(thread_id, user_id_hash, title)
        logger.info("thread_title_generated: id=%s title=%r", thread_id, title)
    else:
        title = thread.get("title", "New conversation")

    return {"thread_id": thread_id, "title": title}


#  Message history


@router.get("/{thread_id}/messages", response_model=ThreadMessagesResponse)
def get_messages(
    thread_id: str,
    fastapi_request: Request,
    limit: int = Query(20, ge=1, le=50),
    before_id: Optional[str] = Query(
        None, description="Load messages before this message ID (cursor)"
    ),
    thread_service: ThreadService = Depends(get_thread_service),
):
    """
    Return a paginated page of decrypted messages for the given thread.

    Messages are returned in chronological order (oldest first within the page).
    Use ``before_id`` for infinite scroll: pass the ``id`` of the oldest
    message on the current page to load the previous page.

    ``has_more=true`` means an older page exists.

    Encryption is transparent — the API returns plaintext ``content`` strings.
    """
    user_id_hash = _require_user(fastapi_request)

    try:
        messages, has_more = thread_service.list_messages(
            thread_id=thread_id,
            user_id_hash=user_id_hash,
            limit=limit,
            before_id=before_id,
        )
    except ThreadOwnershipError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    return {"messages": messages, "has_more": has_more}


### Chat export

_EXPORT_RATE_LIMIT_PER_HOUR = 10


def _client_ip(request: Request) -> Optional[str]:
    """
    Extract the originating client IP.

    API Gateway sets X-Forwarded-For to "client-ip, proxy1, proxy2, ...".
    We take the leftmost value (the original client, not a proxy).
    Falls back to the socket peer address for local / direct-Lambda invocations.
    """
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("/{thread_id}/export")
def export_thread(
    thread_id: str,
    fastapi_request: Request,
    display_name: Optional[str] = Query(
        None, description="Display name for the 'Exported by' PDF field"
    ),
    thread_service: ThreadService = Depends(get_thread_service),
    export_log_repo: ExportLogRepository = Depends(get_export_log_repository),
):
    """
    Generate a PDF export of the conversation and return it as a base64-encoded
    JSON payload for the browser to decode client-side and save as a file.

    Security controls applied:
      • JWT authentication required (HTTP 401 if absent).
      • Thread ownership enforced — users can only export their own threads.
      • Per-user rate limit: _EXPORT_RATE_LIMIT_PER_HOUR successful exports/hour.
      • Every attempt (success and failure) is written to conversation_export_logs
        for HIPAA audit trail, forensic investigation, and anomaly detection.
      • No export artefact is stored server-side; the JSON response is ephemeral
        and bound to the authenticated request — there is no replay-able URL.

    Query params:
        display_name: User's friendly name shown in the PDF "Exported by" header.
                      Falls back to JWT claims (name → given+family → email →
                      username), then to "User".
    """
    user_id_hash = _require_user(fastapi_request)
    ip_address = _client_ip(fastapi_request)
    user_agent = fastapi_request.headers.get("user-agent", "")

    #  Resolve display name
    resolved_name = (display_name or "").strip()
    if not resolved_name:
        token = _extract_token(fastapi_request)
        if token:
            decoded = decode_jwt_claims(token)
            if decoded:
                resolved_name = (
                    decoded.get("name")
                    or (
                        f"{decoded.get('given_name', '')} "
                        f"{decoded.get('family_name', '')}".strip()
                    )
                    or decoded.get("email")
                    or decoded.get("username")
                    or ""
                ).strip()
    if not resolved_name:
        resolved_name = "User"

    #  Rate limit
    recent_exports = export_log_repo.count_recent_successful(user_id_hash, hours=1)
    if recent_exports >= _EXPORT_RATE_LIMIT_PER_HOUR:
        export_log_repo.log_export(
            user_id_hash=user_id_hash,
            thread_id=thread_id,
            thread_title="",
            message_count=0,
            persona="unknown",
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_code="rate_limited",
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Export limit reached. You may export up to "
                f"{_EXPORT_RATE_LIMIT_PER_HOUR} conversations per hour."
            ),
        )

    #  Fetch thread & messages
    thread: Optional[dict] = None
    try:
        thread = thread_service.get_thread(thread_id, user_id_hash)
        if not thread:
            export_log_repo.log_export(
                user_id_hash=user_id_hash,
                thread_id=thread_id,
                thread_title="",
                message_count=0,
                persona="unknown",
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                error_code="not_found",
            )
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

        messages = thread_service.list_all_messages_for_export(
            thread_id=thread_id,
            user_id_hash=user_id_hash,
        )
    except ThreadOwnershipError:
        export_log_repo.log_export(
            user_id_hash=user_id_hash,
            thread_id=thread_id,
            thread_title="",
            message_count=0,
            persona="unknown",
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_code="not_found",
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")

    thread_title = thread.get("title", "Conversation")
    persona = thread.get("persona", "default")

    if not messages:
        export_log_repo.log_export(
            user_id_hash=user_id_hash,
            thread_id=thread_id,
            thread_title=thread_title,
            message_count=0,
            persona=persona,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_code="empty_conversation",
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This conversation has no messages to export.",
        )

    #  Generate PDF
    try:
        pdf_bytes = generate_chat_pdf(
            thread_title=thread_title,
            exported_by=resolved_name,
            persona=persona,
            messages=messages,
        )
    except Exception as exc:
        logger.error(
            "export_pdf_generation_failed: thread=%s error=%s", thread_id, exc, exc_info=True
        )
        export_log_repo.log_export(
            user_id_hash=user_id_hash,
            thread_id=thread_id,
            thread_title=thread_title,
            message_count=len(messages),
            persona=persona,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_code="generation_failed",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate the PDF export. Please try again.",
        )

    #  Audit log (success)
    export_log_repo.log_export(
        user_id_hash=user_id_hash,
        thread_id=thread_id,
        thread_title=thread_title,
        message_count=len(messages),
        persona=persona,
        ip_address=ip_address,
        user_agent=user_agent,
        success=True,
    )
    logger.info(
        "thread_exported: id=%s user=%s persona=%s messages=%d ip=%s",
        thread_id,
        user_id_hash[:8],
        persona,
        len(messages),
        ip_address,
    )

    # Return the PDF as a base64-encoded JSON payload.
    # API Gateway REST only decodes Mangum's isBase64Encoded body when the
    # Content-Type is in binary_media_types AND the first Accept header matches —
    # both conditions are unreliable for browser/Axios requests.
    # The JSON approach is environment-agnostic (local dev, staging, production).
    #
    # Cache-Control: no-store prevents the browser from writing this response
    # (which contains full decrypted conversation content) to its disk cache.
    # Without it, a subsequent user on a shared computer could retrieve the
    # cached payload without a JWT token.
    return JSONResponse(
        content={
            "filename": export_filename(thread_title),
            "data": base64.b64encode(pdf_bytes).decode("ascii"),
        },
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
        },
    )
