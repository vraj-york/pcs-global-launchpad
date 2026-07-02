"""Auth gate constants aligned with backend CognitoAuthGuard."""

APP_USER_STATUS_BLOCKED = "Blocked"

AUTH_TOKEN_MISSING_MSG = "Authorization token is missing"
INVALID_OR_EXPIRED_TOKEN_MSG = "Invalid or expired token"

AUTH_BLOCKED_APP_USER_LOG_MSG = "Auth rejected: app user status is Blocked"
AUTH_SOFT_DELETED_APP_USER_LOG_MSG = "Auth rejected: app user is soft-deleted"
AUTH_APP_USER_LOOKUP_ERROR_LOG_MSG = "Error loading app user for auth gate"
