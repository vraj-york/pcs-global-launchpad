"""
JWT helpers: verify Cognito Bearer tokens and derive `sub` + groups.
Aligned with backend CognitoAuthGuard (JWKS RS256 verification).
"""

from typing import Annotated, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database.connection import get_db
from database.queries.app_user_auth import assert_app_user_may_authenticate
from database.queries.assessment_visibility import build_assessment_access_context
from utils.assessment_access_context import AssessmentAccessContext
from utils.auth_constants import AUTH_TOKEN_MISSING_MSG, INVALID_OR_EXPIRED_TOKEN_MSG
from utils.cognito_jwt import CognitoJwtConfigError, verify_cognito_jwt
from utils.logger import logger

bearer_scheme = HTTPBearer(auto_error=False)


def _decode_bearer_token(
    credentials: Optional[HTTPAuthorizationCredentials],
) -> tuple[str, frozenset[str]]:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=AUTH_TOKEN_MISSING_MSG,
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials.strip()
    if token.startswith("Bearer "):
        token = token[7:].strip()
    try:
        decoded = verify_cognito_jwt(token)
        sub = decoded.get("sub")
        if not sub or not isinstance(sub, str):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=INVALID_OR_EXPIRED_TOKEN_MSG,
                headers={"WWW-Authenticate": "Bearer"},
            )
        groups_raw = decoded.get("cognito:groups") or []
        if isinstance(groups_raw, str):
            groups_raw = [groups_raw]
        groups = frozenset(g for g in groups_raw if isinstance(g, str) and g.strip())
        return sub, groups
    except CognitoJwtConfigError as e:
        logger.error("Cognito JWT verification misconfigured: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service is misconfigured",
        ) from e
    except ValueError as e:
        logger.warning("JWT verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_OR_EXPIRED_TOKEN_MSG,
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
    except jwt.DecodeError as e:
        logger.warning("JWT decode failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_OR_EXPIRED_TOKEN_MSG,
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


def get_cognito_sub(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> str:
    sub, _ = _decode_bearer_token(credentials)
    assert_app_user_may_authenticate(db, sub)
    return sub


def get_assessment_access_context(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> AssessmentAccessContext:
    sub, groups = _decode_bearer_token(credentials)
    assert_app_user_may_authenticate(db, sub)
    return build_assessment_access_context(db, sub, groups)
