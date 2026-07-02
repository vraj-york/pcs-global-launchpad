/** Client-facing message when JWT is missing, invalid, expired, or app user is blocked/deleted. */
export const COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG =
  'Invalid or expired token';
/** Client-facing message when the `Authorization` header has no Bearer token. */
export const COGNITO_AUTH_TOKEN_MISSING_MSG = 'Authorization token is missing';

/** Logged when JWT is valid but `app_users.status` is Blocked. */
export const COGNITO_AUTH_BLOCKED_APP_USER_LOG_MSG =
  'Auth rejected: app user status is Blocked';
/** Logged when JWT is valid but `app_users.deleted_at` is set. */
export const COGNITO_AUTH_SOFT_DELETED_APP_USER_LOG_MSG =
  'Auth rejected: app user is soft-deleted';
/** Logged when loading app user for auth gate fails unexpectedly. */
export const COGNITO_AUTH_APP_USER_LOOKUP_ERROR_LOG_MSG =
  'Error loading app user for auth gate';
/** Logged when Cognito AdminGetUser is used to resolve email and the call fails (non-fatal). */
export const COGNITO_AUTH_COGNITO_EMAIL_LOOKUP_WARN_LOG_MSG =
  'Could not load email from Cognito for authenticated user';
