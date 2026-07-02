"""
Domain Exceptions

Typed exceptions that map chatbot interaction outcomes to audit log categories.
Each exception corresponds to a specific outcome/error_code pair in AuditLogEntry:

  RBACDeniedError          → outcome="denied",  denial_reason="rbac_policy"
  ContentFilterDeniedError → outcome="denied",  denial_reason="content_filter"
  UpstreamTimeoutError     → outcome="error",   error_code="TIMEOUT"
  UpstreamFailureError     → outcome="error",   error_code="UPSTREAM_FAILURE"
  ThreadOwnershipError     → HTTP 403 in thread route handlers
"""


class RBACDeniedError(Exception):
    """Raised when the user's role does not have permission for the requested action."""


class ContentFilterDeniedError(Exception):
    """Raised when Bedrock Guardrails block a request or response."""


class UpstreamTimeoutError(Exception):
    """Raised when a Bedrock call is throttled or times out."""


class UpstreamFailureError(Exception):
    """Raised when Bedrock or another upstream service returns a non-recoverable error."""


class ThreadOwnershipError(Exception):
    """
    Raised when the requesting user does not own the target thread.

    Route handlers should catch this and return HTTP 403. The message is
    intentionally ambiguous ("not found or access denied") to avoid leaking
    the existence of threads the caller does not own.
    """
