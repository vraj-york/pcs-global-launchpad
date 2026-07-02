"""GET /report-content/{section_key}"""

import uuid

from database.models import ReportContent


def test_get_report_content_ok(client, test_db):
    db = test_db()
    try:
        db.add(
            ReportContent(
                id=str(uuid.uuid4()),
                section_key="welcome_and_overall",
                content={
                    "welcome_copy": "Hello\n\nWorld",
                    "welcome_image": "static/images/x.jpg",
                },
                is_active=True,
            )
        )
        db.commit()
    finally:
        db.close()

    r = client.get("/report-content/welcome_and_overall")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["section_key"] == "welcome_and_overall"
    assert body["content"]["welcome_copy"] == "Hello\n\nWorld"


def test_get_report_content_invalid_key(client):
    r = client.get("/report-content/Invalid-Key")
    assert r.status_code == 400


def test_get_report_content_not_found(client):
    r = client.get("/report-content/unknown_section_xyz")
    assert r.status_code == 404
