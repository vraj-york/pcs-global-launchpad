"""
Auth gate tests: blocked or soft-deleted app users must not authenticate.
"""
from datetime import datetime, timezone

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.main import app
from api.dependencies.auth import get_assessment_access_context
from database.connection import get_db
from database.models import AppUser
from database.queries.app_user_auth import assert_app_user_may_authenticate
from utils.auth_constants import APP_USER_STATUS_BLOCKED, INVALID_OR_EXPIRED_TOKEN_MSG


def _bearer_headers(cognito_sub: str) -> dict[str, str]:
    token = jwt.encode({"sub": cognito_sub}, "test-secret", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _auth_client(test_db):
    def override_get_db():
        db = test_db()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides.pop(get_assessment_access_context, None)
    return TestClient(app)


def test_assert_app_user_may_authenticate_allows_missing_row(test_db):
    db = test_db()
    try:
        assert_app_user_may_authenticate(db, "missing-user-sub")
    finally:
        db.close()


def test_assert_app_user_may_authenticate_allows_active_user(test_db):
    db = test_db()
    db.add(
        AppUser(
            cognito_sub="active-user-sub",
            status="Active",
            email="active@example.com",
        )
    )
    db.commit()
    try:
        assert_app_user_may_authenticate(db, "active-user-sub")
    finally:
        db.close()


def test_assert_app_user_may_authenticate_rejects_blocked_user(test_db):
    db = test_db()
    db.add(
        AppUser(
            cognito_sub="blocked-user-sub",
            status=APP_USER_STATUS_BLOCKED,
            email="blocked@example.com",
        )
    )
    db.commit()
    try:
        with pytest.raises(HTTPException) as exc_info:
            assert_app_user_may_authenticate(db, "blocked-user-sub")
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == INVALID_OR_EXPIRED_TOKEN_MSG
    finally:
        db.close()


def test_assert_app_user_may_authenticate_rejects_soft_deleted_user(test_db):
    db = test_db()
    db.add(
        AppUser(
            cognito_sub="deleted-user-sub",
            status="Active",
            email="deleted@example.com",
            deleted_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    try:
        with pytest.raises(HTTPException) as exc_info:
            assert_app_user_may_authenticate(db, "deleted-user-sub")
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == INVALID_OR_EXPIRED_TOKEN_MSG
    finally:
        db.close()


def test_auth_dependency_rejects_blocked_app_user(test_db):
    db = test_db()
    db.add(
        AppUser(
            cognito_sub="blocked-user-sub",
            status=APP_USER_STATUS_BLOCKED,
            email="blocked@example.com",
        )
    )
    db.commit()
    db.close()

    with _auth_client(test_db) as client:
        r = client.post("/assessments", json={}, headers=_bearer_headers("blocked-user-sub"))
        assert r.status_code == 401
        assert r.json()["detail"] == INVALID_OR_EXPIRED_TOKEN_MSG

    app.dependency_overrides.clear()


def test_auth_dependency_rejects_soft_deleted_app_user(test_db):
    db = test_db()
    db.add(
        AppUser(
            cognito_sub="deleted-user-sub",
            status="Active",
            email="deleted@example.com",
            deleted_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.close()

    with _auth_client(test_db) as client:
        r = client.post("/assessments", json={}, headers=_bearer_headers("deleted-user-sub"))
        assert r.status_code == 401
        assert r.json()["detail"] == INVALID_OR_EXPIRED_TOKEN_MSG

    app.dependency_overrides.clear()
