"""Subscription enforcement for assessment write routes."""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from api.dependencies.auth import get_assessment_access_context
from api.main import app
from database.connection import get_db
from database.models import Assessment, AssessmentStatus
from utils.assessment_access_context import AssessmentAccessContext
from utils.exceptions import AuthorizationException
from utils.subscription_constants import (
    INDIVIDUAL_PAYMENT_REQUIRED_MSG,
    ONE_TIME_ASSESSMENT_ALREADY_USED_MSG,
    ONE_TIME_COMPANY_ASSESSMENT_CREDITS_EXHAUSTED_MSG,
    SUBSCRIPTION_ACCESS_DENIED_MSG,
    SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
    SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG,
)
from utils.subscription_enforcement import (
    count_active_employees,
    require_can_start_new_assessment,
    require_writable_subscription,
)


@pytest.fixture(autouse=True)
def default_active_employee_count(monkeypatch, request):
    """SQLite test DB lacks HR tables; keep counts under typical plan caps."""
    skip_names = {
        "test_require_writable_subscription_blocks_employee_limit",
        "test_update_blocked_when_employee_limit_exceeded",
        "test_update_blocked_after_create_when_employee_limit_exceeded",
    }
    if request.node.name in skip_names:
        return
    monkeypatch.setattr(
        "utils.subscription_enforcement.count_active_employees",
        lambda _db, _cid: 10,
    )


def _company_ctx(**overrides) -> AssessmentAccessContext:
    defaults = {
        "cognito_sub": "test-cognito-sub",
        "visible_user_ids": frozenset({"test-cognito-sub"}),
        "company_id": "co-1",
        "subscription_status": "active",
        "plan_type_id": "monthly",
        "employee_range_max": 25,
        "cognito_groups": frozenset(),
    }
    defaults.update(overrides)
    return AssessmentAccessContext(**defaults)


def test_require_writable_subscription_allows_no_company():
    ctx = AssessmentAccessContext(
        cognito_sub="sub",
        visible_user_ids=frozenset({"sub"}),
    )
    require_writable_subscription(ctx, MagicMock())


def test_require_writable_subscription_blocks_past_due():
    ctx = _company_ctx(subscription_status="past_due")
    with pytest.raises(AuthorizationException) as exc:
        require_writable_subscription(ctx, MagicMock())
    assert str(exc.value) == SUBSCRIPTION_ACCESS_DENIED_MSG


def test_require_writable_subscription_blocks_canceled():
    ctx = _company_ctx(subscription_status="canceled")
    with pytest.raises(AuthorizationException) as exc:
        require_writable_subscription(ctx, MagicMock())
    assert str(exc.value) == SUBSCRIPTION_ACCESS_DENIED_MSG


def test_require_writable_subscription_blocks_employee_limit(monkeypatch):
    ctx = _company_ctx(employee_range_max=25)
    monkeypatch.setattr(
        "utils.subscription_enforcement.count_active_employees",
        lambda _db, _cid: 26,
    )
    with pytest.raises(AuthorizationException) as exc:
        require_writable_subscription(ctx, MagicMock())
    assert str(exc.value) == SUBSCRIPTION_EMPLOYEE_LIMIT_MSG


def test_require_writable_subscription_skips_admin_roles():
    ctx = _company_ctx(
        subscription_status="past_due",
        cognito_groups=frozenset({"CompanyAdmin"}),
    )
    require_writable_subscription(ctx, MagicMock())


def test_require_can_start_new_assessment_blocks_unknown_plan():
    ctx = _company_ctx(plan_type_id=None)
    with pytest.raises(AuthorizationException) as exc:
        require_can_start_new_assessment(ctx, MagicMock())
    assert str(exc.value) == SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG


def test_require_can_start_new_assessment_blocks_when_company_credits_exhausted(
    monkeypatch,
):
    ctx = _company_ctx(
        plan_type_id="one_time",
        employee_range_max=25,
        assessment_quantity=1,
    )
    monkeypatch.setattr(
        "utils.subscription_enforcement.count_active_employees",
        lambda _db, _cid: 1,
    )
    db = MagicMock()
    db.execute.return_value.fetchone.return_value = None
    db.execute.return_value.scalar.return_value = 1
    with pytest.raises(AuthorizationException) as exc:
        require_can_start_new_assessment(ctx, db)
    assert str(exc.value) == ONE_TIME_COMPANY_ASSESSMENT_CREDITS_EXHAUSTED_MSG


def test_require_can_start_new_assessment_blocks_second_assessment_only():
    ctx = AssessmentAccessContext(
        cognito_sub="sub-ao",
        visible_user_ids=frozenset({"sub-ao"}),
        invite_type="Assessment Only",
    )
    db = MagicMock()
    db.execute.return_value.scalar.return_value = 1
    with pytest.raises(AuthorizationException) as exc:
        require_can_start_new_assessment(ctx, db)
    assert str(exc.value) == ONE_TIME_ASSESSMENT_ALREADY_USED_MSG


def test_require_can_start_new_assessment_allows_first_assessment_only():
    ctx = AssessmentAccessContext(
        cognito_sub="sub-ao",
        visible_user_ids=frozenset({"sub-ao"}),
        invite_type="Assessment Only",
    )
    db = MagicMock()
    db.execute.return_value.scalar.return_value = 0
    require_can_start_new_assessment(ctx, db)


def test_require_can_start_new_assessment_blocks_unpaid_individual_b2c():
    ctx = AssessmentAccessContext(
        cognito_sub="sub-ind",
        visible_user_ids=frozenset({"sub-ind"}),
        invite_type="Assessment Only",
        user_type="individual",
        payment_status="pending",
    )
    with pytest.raises(AuthorizationException) as exc:
        require_can_start_new_assessment(ctx, MagicMock())
    assert str(exc.value) == INDIVIDUAL_PAYMENT_REQUIRED_MSG


def test_require_can_start_new_assessment_allows_paid_individual_b2c():
    ctx = AssessmentAccessContext(
        cognito_sub="sub-ind-paid",
        visible_user_ids=frozenset({"sub-ind-paid"}),
        invite_type="Assessment Only",
        user_type="individual",
        payment_status="paid",
    )
    db = MagicMock()
    db.execute.return_value.scalar.return_value = 0
    require_can_start_new_assessment(ctx, db)


def test_create_blocked_when_past_due(client):
    app.dependency_overrides[get_assessment_access_context] = lambda: _company_ctx(
        subscription_status="past_due",
    )
    try:
        r = client.post("/assessments", json={})
        assert r.status_code == 403
        assert r.json()["message"] == SUBSCRIPTION_ACCESS_DENIED_MSG
    finally:
        app.dependency_overrides.clear()


def test_create_blocked_when_plan_missing(client):
    app.dependency_overrides[get_assessment_access_context] = lambda: _company_ctx(
        plan_type_id=None,
    )
    try:
        r = client.post("/assessments", json={})
        assert r.status_code == 403
        assert r.json()["message"] == SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG
    finally:
        app.dependency_overrides.clear()


def test_create_blocked_for_unpaid_individual_b2c(client):
    app.dependency_overrides[get_assessment_access_context] = (
        lambda: AssessmentAccessContext(
            cognito_sub="sub-ind",
            visible_user_ids=frozenset({"sub-ind"}),
            invite_type="Assessment Only",
            user_type="individual",
            payment_status="pending",
        )
    )
    try:
        r = client.post("/assessments", json={})
        assert r.status_code == 403
        assert r.json()["message"] == INDIVIDUAL_PAYMENT_REQUIRED_MSG
    finally:
        app.dependency_overrides.clear()


def test_create_allowed_for_admin_despite_past_due(client):
    app.dependency_overrides[get_assessment_access_context] = lambda: _company_ctx(
        subscription_status="past_due",
        cognito_groups=frozenset({"SuperAdmin"}),
    )
    try:
        r = client.post("/assessments", json={})
        assert r.status_code == 201, r.text
    finally:
        app.dependency_overrides.clear()


def test_get_allowed_when_subscription_inactive(test_db):
    def override_get_db():
        db = test_db()
        try:
            yield db
        finally:
            db.close()

    row = Assessment(
        user_id="test-cognito-sub",
        status=AssessmentStatus.completed,
    )
    db = test_db()
    db.add(row)
    db.commit()
    db.refresh(row)
    aid = str(row.id)
    db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_assessment_access_context] = lambda: _company_ctx(
        subscription_status="past_due",
    )

    try:
        with TestClient(app) as c:
            r = c.get(f"/assessments/{aid}")
            assert r.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_update_blocked_when_employee_limit_exceeded(client, monkeypatch):
    app.dependency_overrides[get_assessment_access_context] = lambda: _company_ctx()
    monkeypatch.setattr(
        "utils.subscription_enforcement.count_active_employees",
        lambda _db, _cid: 26,
    )
    try:
        created = client.post("/assessments", json={})
        assert created.status_code == 403
        assert created.json()["message"] == SUBSCRIPTION_EMPLOYEE_LIMIT_MSG
    finally:
        app.dependency_overrides.clear()


def test_update_blocked_after_create_when_employee_limit_exceeded(
    client,
    monkeypatch,
):
    counts = {"n": 0}

    def fake_count(_db, _cid):
        counts["n"] += 1
        return 10 if counts["n"] == 1 else 26

    monkeypatch.setattr(
        "utils.subscription_enforcement.count_active_employees",
        fake_count,
    )
    app.dependency_overrides[get_assessment_access_context] = lambda: _company_ctx()

    try:
        created = client.post("/assessments", json={})
        assert created.status_code == 201, created.text
        aid = created.json()["id"]

        updated = client.put(f"/assessments/{aid}", json={"status": "completed"})
        assert updated.status_code == 403
        assert updated.json()["message"] == SUBSCRIPTION_EMPLOYEE_LIMIT_MSG
    finally:
        app.dependency_overrides.clear()


def test_one_time_second_create_blocked_when_company_credits_exhausted(
    client, monkeypatch
):
    company_assessment_count = [0]

    def fake_company_count(_db, _cid):
        return company_assessment_count[0]

    monkeypatch.setattr(
        "utils.subscription_enforcement._assessment_count_for_company",
        fake_company_count,
    )
    app.dependency_overrides[get_assessment_access_context] = lambda: _company_ctx(
        plan_type_id="one_time",
        employee_range_max=25,
        assessment_quantity=1,
    )
    try:
        first = client.post("/assessments", json={})
        assert first.status_code == 201, first.text
        company_assessment_count[0] = 1

        second = client.post("/assessments", json={})
        assert second.status_code == 403
        assert (
            second.json()["message"]
            == ONE_TIME_COMPANY_ASSESSMENT_CREDITS_EXHAUSTED_MSG
        )
    finally:
        app.dependency_overrides.clear()


def test_count_active_employees_returns_zero_when_no_rows(monkeypatch):
    db = MagicMock()
    db.execute.return_value.scalar.return_value = None
    assert count_active_employees(db, "co-1") == 0
