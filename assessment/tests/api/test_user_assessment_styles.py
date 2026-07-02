"""GET /assessments/{assessment_id}/user-styles"""

import uuid

from database.models import (
    Assessment,
    AssessmentScore,
    AssessmentScoreStyle,
    AssessmentScoreStyleContext,
    AssessmentScoreStyleType,
    AssessmentStatus,
    BspStyle,
)


def _seed_bsp_style(db, style_number: int, title_suffix: str) -> BspStyle:
    style_id = str(uuid.uuid4())
    row = BspStyle(
        id=style_id,
        style_number=style_number,
        title=f"Style {title_suffix}",
        has_video=False,
        youtube_video_id=None,
        description=f"Description for style {title_suffix}",
        display_order=style_number,
        environmental_preferences=["env"],
        interaction_preferences=["interaction"],
        character_strengths=["strength"],
        psychological_needs=["need"],
        likes=["like"],
        dislikes=["dislike"],
        work_preferences=["work"],
        warning_signs=["warning"],
        when_feeling_stressed="Stressed copy",
    )
    db.add(row)
    return row


def _seed_scored_assessment_with_styles(db, create_bsp_style):
    assessment = Assessment(
        user_id="test-cognito-sub",
        status=AssessmentStatus.scored,
    )
    db.add(assessment)
    db.flush()

    score = AssessmentScore(
        assessment_id=assessment.id,
        score_breakdown={
            "overall_oct": 1,
            "prtred": 42,
            "prtgreen": 78,
            "prtgrey": 55,
            "prtblue": 103,
            "prsred": 30,
            "prsgreen": 60,
            "prsgrey": 45,
            "prsblue": 88,
            "petred": 50,
            "petgreen": 70,
            "petgrey": 40,
            "petblue": 95,
            "pesred": 35,
            "pesgreen": 65,
            "pesgrey": 50,
            "pesblue": 90,
            "cred": 157,
            "cgreen": 273,
            "cgrey": 190,
            "cblue": 376,
            "prblue": 88,
            "peblue": 90,
            "professional_typical_oct": 2,
            "personal_typical_oct": 4,
            "stressful_combo_oct": 8,
        },
    )
    db.add(score)
    db.flush()

    contexts = [
        (AssessmentScoreStyleContext.overall, 1, AssessmentScoreStyleType.basic),
        (
            AssessmentScoreStyleContext.professional_typical,
            2,
            AssessmentScoreStyleType.plural,
        ),
        (
            AssessmentScoreStyleContext.professional_stressful,
            3,
            AssessmentScoreStyleType.split,
        ),
        (
            AssessmentScoreStyleContext.personal_typical,
            4,
            AssessmentScoreStyleType.basic,
        ),
        (
            AssessmentScoreStyleContext.personal_stressful,
            5,
            AssessmentScoreStyleType.basic,
        ),
    ]

    for ctx, style_number, style_type in contexts:
        via_api = create_bsp_style(style_number=style_number, display_order=style_number)
        db.add(
            AssessmentScoreStyle(
                assessment_score_id=score.id,
                bsp_style_id=via_api["id"],
                context=ctx,
                type=style_type,
            )
        )

    db.commit()
    return str(assessment.id), str(score.id)


def test_get_user_styles_ok(client, test_db, create_bsp_style):
    db = test_db()
    try:
        assessment_id, score_id = _seed_scored_assessment_with_styles(db, create_bsp_style)
    finally:
        db.close()

    r = client.get(f"/assessments/{assessment_id}/user-styles")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["assessment_id"] == assessment_id
    assert body["assessment_score_id"] == score_id
    assert body["overall_style"]["context"] == "overall"
    assert body["overall_style"]["type"] == "basic"
    assert body["overall_style"]["style"]["style_number"] == 1
    assert body["professional_typical"]["context"] == "professional_typical"
    assert body["professional_typical"]["type"] == "plural"
    assert body["professional_typical_scores"]["prtred"] == 42
    assert body["professional_typical_scores"]["prtgreen"] == 78
    assert body["professional_typical_scores"]["prtgrey"] == 55
    assert body["professional_typical_scores"]["prtblue"] == 103
    assert body["professional_stressful_scores"]["prsred"] == 30
    assert body["professional_stressful_scores"]["prsblue"] == 88
    assert body["personal_typical_scores"]["petgreen"] == 70
    assert body["personal_stressful_scores"]["pesgrey"] == 50
    assert body["overall_stressful_scores"]["cred"] == 157
    assert body["overall_stressful_scores"]["cgreen"] == 273
    assert body["overall_stressful_scores"]["cgrey"] == 190
    assert body["overall_stressful_scores"]["cblue"] == 376
    assert body["professional_stressful"]["style"]["style_number"] == 3
    assert body["personal_typical"]["style"]["style_number"] == 4
    assert body["personal_typical"]["style"]["title"] == "The Organizer 4"
    assert body["decrease_stress_metrics"]["prblue"] == 88
    assert body["decrease_stress_metrics"]["peblue"] == 90
    assert body["decrease_stress_metrics"]["professional_typical_oct"] == 2
    assert body["decrease_stress_metrics"]["personal_typical_oct"] == 4
    assert body["decrease_stress_metrics"]["stressful_combo_oct"] == 8
    assert "scored_at" in body


def test_get_user_styles_assessment_not_found(client):
    r = client.get(f"/assessments/{uuid.uuid4()}/user-styles")
    assert r.status_code == 404


def test_get_user_styles_no_score(client, test_db):
    db = test_db()
    try:
        assessment = Assessment(
            user_id="test-cognito-sub",
            status=AssessmentStatus.completed,
        )
        db.add(assessment)
        db.commit()
        assessment_id = str(assessment.id)
    finally:
        db.close()

    r = client.get(f"/assessments/{assessment_id}/user-styles")
    assert r.status_code == 404
    assert "No score found" in r.json()["detail"]


def test_get_user_styles_incomplete_breakdown(client, test_db):
    db = test_db()
    try:
        assessment = Assessment(
            user_id="test-cognito-sub",
            status=AssessmentStatus.scored,
        )
        db.add(assessment)
        db.flush()
        score = AssessmentScore(
            assessment_id=assessment.id,
            score_breakdown={},
        )
        db.add(score)
        db.flush()
        style = _seed_bsp_style(db, 10, "only-overall")
        db.add(
            AssessmentScoreStyle(
                assessment_score_id=score.id,
                bsp_style_id=style.id,
                context=AssessmentScoreStyleContext.overall,
                type=AssessmentScoreStyleType.basic,
            )
        )
        db.commit()
        assessment_id = str(assessment.id)
    finally:
        db.close()

    r = client.get(f"/assessments/{assessment_id}/user-styles")
    assert r.status_code == 400
    assert "Incomplete style breakdown" in r.json()["detail"]


def test_get_user_styles_other_user_404(test_db):
    from fastapi.testclient import TestClient

    from api.dependencies.auth import get_assessment_access_context
    from api.main import app
    from database.connection import get_db
    from utils.assessment_access_context import AssessmentAccessContext

    db = test_db()
    try:
        assessment = Assessment(
            user_id="other-user-sub",
            status=AssessmentStatus.scored,
        )
        db.add(assessment)
        db.flush()
        score = AssessmentScore(assessment_id=assessment.id, score_breakdown={})
        db.add(score)
        db.flush()
        style = _seed_bsp_style(db, 11, "other")
        for ctx in AssessmentScoreStyleContext:
            db.add(
                AssessmentScoreStyle(
                    assessment_score_id=score.id,
                    bsp_style_id=style.id,
                    context=ctx,
                    type=AssessmentScoreStyleType.basic,
                )
            )
        db.commit()
        assessment_id = str(assessment.id)
    finally:
        db.close()

    def override_get_db():
        session = test_db()
        try:
            yield session
        finally:
            session.close()

    def ctx():
        return AssessmentAccessContext(
            cognito_sub="test-cognito-sub",
            visible_user_ids=frozenset({"test-cognito-sub"}),
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_assessment_access_context] = ctx
    try:
        with TestClient(app) as c:
            r = c.get(f"/assessments/{assessment_id}/user-styles")
            assert r.status_code == 404
    finally:
        app.dependency_overrides.clear()
