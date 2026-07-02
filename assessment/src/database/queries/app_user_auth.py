"""
App user auth gate: reject valid JWTs when the user is blocked or soft-deleted.
Matches backend CognitoAuthGuard.assertAppUserMayAuthenticate.
"""

from sqlalchemy import text
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from utils.auth_constants import (
    APP_USER_STATUS_BLOCKED,
    AUTH_APP_USER_LOOKUP_ERROR_LOG_MSG,
    AUTH_BLOCKED_APP_USER_LOG_MSG,
    AUTH_SOFT_DELETED_APP_USER_LOG_MSG,
    AUTH_TOKEN_MISSING_MSG,
)
from utils.logger import logger


def assert_app_user_may_authenticate(db: Session, cognito_sub: str) -> None:
    """
    Allow authentication when no app_users row exists yet.
    Reject when deleted_at is set or status is Blocked.
    """
    try:
        row = db.execute(
            text(
                """
                SELECT deleted_at, status
                FROM app_users
                WHERE cognito_sub = :sub
                """
            ),
            {"sub": cognito_sub},
        ).fetchone()

        if not row:
            return

        deleted_at, user_status = row[0], row[1]

        if deleted_at is not None:
            logger.warning(
                "%s (cognitoSub=%s)",
                AUTH_SOFT_DELETED_APP_USER_LOG_MSG,
                cognito_sub,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=AUTH_TOKEN_MISSING_MSG,
                headers={"WWW-Authenticate": "Bearer"},
            )

        status_norm = (user_status or "").strip().lower()
        if status_norm == APP_USER_STATUS_BLOCKED.lower():
            logger.warning(
                "%s (cognitoSub=%s)",
                AUTH_BLOCKED_APP_USER_LOG_MSG,
                cognito_sub,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=AUTH_TOKEN_MISSING_MSG,
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("%s: %s", AUTH_APP_USER_LOOKUP_ERROR_LOG_MSG, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=AUTH_TOKEN_MISSING_MSG,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
