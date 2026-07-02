"""
CRUD tests for /assessments (access context overridden in conftest).
"""
from fastapi.testclient import TestClient

from api.main import app
from api.dependencies.auth import get_assessment_access_context
from database.connection import get_db
from database.models import Assessment, AssessmentStatus
from utils.assessment_access_context import AssessmentAccessContext


def test_create_list_get_update_delete(client):
    r = client.post("/assessments", json={})
    assert r.status_code == 201, r.text
    row = r.json()
    assert row["user_id"] == "test-cognito-sub"
    assert row["status"] == "in_progress"
    aid = row["id"]

    r2 = client.post("/assessments", json={})
    assert r2.status_code == 409

    r3 = client.get("/assessments")
    assert r3.status_code == 200
    assert len(r3.json()) == 1
    assert r3.json()[0]["id"] == aid

    r4 = client.get(f"/assessments/{aid}")
    assert r4.status_code == 200
    assert r4.json().get("report_key") in (None, "")

    r5 = client.put(f"/assessments/{aid}", json={"status": "completed"})
    assert r5.status_code == 200
    assert r5.json()["status"] == "completed"
    assert r5.json()["completed_at"] is not None

    r_scored = client.put(f"/assessments/{aid}", json={"status": "scored"})
    assert r_scored.status_code == 200
    assert r_scored.json()["status"] == "scored"

    r_rep = client.put(f"/assessments/{aid}", json={"status": "report_generated"})
    assert r_rep.status_code == 200
    assert r_rep.json()["status"] == "report_generated"

    r6 = client.post("/assessments", json={})
    assert r6.status_code == 201

    r7 = client.delete(f"/assessments/{r6.json()['id']}")
    assert r7.status_code == 204


def test_get_other_users_assessment_404(test_db):
    """Row owned by another cognito sub must not be visible with current JWT user."""

    def override_get_db():
        db = test_db()
        try:
            yield db
        finally:
            db.close()

    def ctx():
        return AssessmentAccessContext(
            cognito_sub="test-cognito-sub",
            visible_user_ids=frozenset({"test-cognito-sub"}),
        )

    other = Assessment(
        user_id="other-user-sub",
        status=AssessmentStatus.in_progress,
    )
    db = test_db()
    db.add(other)
    db.commit()
    db.refresh(other)
    aid = str(other.id)
    db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_assessment_access_context] = ctx

    with TestClient(app) as c:
        r = c.get(f"/assessments/{aid}")
        assert r.status_code == 404

    app.dependency_overrides.clear()


def test_list_filter_invalid_status(client):
    r = client.get("/assessments", params={"status": "not_a_status"})
    assert r.status_code == 400


def test_create_rejects_extra_fields(client):
    r = client.post("/assessments", json={"user_id": "evil"})
    assert r.status_code == 422


def test_create_rejects_status_in_body(client):
    r = client.post("/assessments", json={"status": "completed"})
    assert r.status_code == 422


def test_invalid_status_transition(client):
    r = client.post("/assessments", json={})
    assert r.status_code == 201
    aid = r.json()["id"]
    bad = client.put(f"/assessments/{aid}", json={"status": "scored"})
    assert bad.status_code == 400


def test_admin_can_read_but_not_mutate_other_users_assessment(test_db):
    """Wider visible_user_ids (e.g. company admin) still cannot PUT/DELETE another owner's row."""

    def override_get_db():
        db = test_db()
        try:
            yield db
        finally:
            db.close()

    def ctx():
        return AssessmentAccessContext(
            cognito_sub="admin-sub",
            visible_user_ids=frozenset({"admin-sub", "employee-sub"}),
        )

    other = Assessment(
        user_id="employee-sub",
        status=AssessmentStatus.in_progress,
    )
    db = test_db()
    db.add(other)
    db.commit()
    db.refresh(other)
    aid = str(other.id)
    db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_assessment_access_context] = ctx

    with TestClient(app) as c:
        g = c.get(f"/assessments/{aid}")
        assert g.status_code == 200
        assert g.json()["user_id"] == "employee-sub"
        u = c.put(f"/assessments/{aid}", json={"status": "completed"})
        assert u.status_code == 403
        d = c.delete(f"/assessments/{aid}")
        assert d.status_code == 403

    app.dependency_overrides.clear()


def test_reopen_completed_to_in_progress(client):
    r = client.post("/assessments", json={})
    assert r.status_code == 201
    aid = r.json()["id"]
    c = client.put(f"/assessments/{aid}", json={"status": "completed"})
    assert c.status_code == 200
    assert c.json()["completed_at"] is not None
    u = client.put(f"/assessments/{aid}", json={"status": "in_progress"})
    assert u.status_code == 200, u.text
    assert u.json()["status"] == "in_progress"
    assert u.json()["completed_at"] is None


def test_no_further_transition_after_report_generated(client):
    r = client.post("/assessments", json={})
    aid = r.json()["id"]
    for st in ("completed", "scored", "report_generated"):
        u = client.put(f"/assessments/{aid}", json={"status": st})
        assert u.status_code == 200, u.text
    again = client.put(f"/assessments/{aid}", json={"status": "completed"})
    assert again.status_code == 400
