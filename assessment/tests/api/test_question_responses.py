"""Bulk question_responses APIs (in_progress only)."""

import uuid


def test_bulk_create_update_and_block_when_not_in_progress(client, create_question):
    q = create_question()
    opt_id = q["options"][0]["id"]

    r = client.post("/assessments", json={})
    assert r.status_code == 201
    aid = r.json()["id"]

    payload = {"items": [{"option_id": opt_id, "value": 7}]}
    bc = client.post(f"/assessments/{aid}/question-responses/bulk", json=payload)
    assert bc.status_code == 201, bc.text
    lg = client.get(f"/assessments/{aid}/question-responses")
    assert lg.status_code == 200
    assert len(lg.json()) == 1
    assert lg.json()[0]["value"] == 7

    row = bc.json()[0]
    assert row["assessment_id"] == aid
    assert row["option_id"] == opt_id
    assert row["value"] == 7

    dup = client.post(f"/assessments/{aid}/question-responses/bulk", json=payload)
    assert dup.status_code == 409

    bu = client.put(
        f"/assessments/{aid}/question-responses/bulk",
        json={"items": [{"option_id": opt_id, "value": 9}]},
    )
    assert bu.status_code == 200, bu.text
    assert bu.json()[0]["value"] == 9
    lg2 = client.get(f"/assessments/{aid}/question-responses")
    assert lg2.status_code == 200
    assert lg2.json()[0]["value"] == 9

    tr = client.put(f"/assessments/{aid}", json={"status": "completed"})
    assert tr.status_code == 200

    blocked = client.put(
        f"/assessments/{aid}/question-responses/bulk",
        json={"items": [{"option_id": opt_id, "value": 5}]},
    )
    assert blocked.status_code == 400
    assert "in progress" in blocked.json()["detail"].lower()


def test_bulk_create_invalid_option_and_duplicate_in_payload(client, create_question):
    q = create_question()
    opt_id = q["options"][0]["id"]
    r = client.post("/assessments", json={})
    aid = r.json()["id"]

    bad = client.post(
        f"/assessments/{aid}/question-responses/bulk",
        json={"items": [{"option_id": str(uuid.uuid4()), "value": 5}]},
    )
    assert bad.status_code == 400

    dup_body = {
        "items": [
            {"option_id": opt_id, "value": 1},
            {"option_id": opt_id, "value": 2},
        ]
    }
    d = client.post(f"/assessments/{aid}/question-responses/bulk", json=dup_body)
    assert d.status_code == 400


def test_bulk_update_missing_row(client, create_question):
    q = create_question()
    opt_a = q["options"][0]["id"]
    opt_b = q["options"][1]["id"]
    r = client.post("/assessments", json={})
    aid = r.json()["id"]

    client.post(
        f"/assessments/{aid}/question-responses/bulk",
        json={"items": [{"option_id": opt_a, "value": 3}]},
    )
    up = client.put(
        f"/assessments/{aid}/question-responses/bulk",
        json={
            "items": [
                {"option_id": opt_a, "value": 4},
                {"option_id": opt_b, "value": 5},
            ]
        },
    )
    assert up.status_code == 400
