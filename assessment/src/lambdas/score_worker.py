import json
import os
import time
import uuid
from typing import Any

import boto3
from aws_lambda_powertools import Logger  # type: ignore[import-not-found]
from sqlalchemy.orm import Session

from monitoring.sentry_init import init_sentry, set_worker_context
from bsp_score_engine.score_engine import generate_bsp_score
from database.connection import get_db_context
from database.models import (
    Assessment,
    AssessmentScore,
    AssessmentScoreStyle,
    AssessmentScoreStyleContext,
    AssessmentScoreStyleType,
    AssessmentStatus,
    BspStyle,
    Option,
    QuestionResponse,
)

init_sentry(
    "score_worker",
    function_name=os.environ.get("AWS_LAMBDA_FUNCTION_NAME"),
)

_sqs = boto3.client("sqs")
logger = Logger(service="assessment-score-worker")

EXPECTED_RESPONSE_COUNT = 240


def _parse_assessment_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except Exception as e:
        raise ValueError(f"assessment_id must be a UUID, got: {value}") from e


def _load_question_responses_from_db(db: Session, assessment_id: str) -> dict[str, int]:
    """
    Load all question responses for an assessment, joined with Option.option_key.
    Returns a dict like {"prt-1-red": 1, ...} suitable for generate_bsp_score.
    """
    aid = _parse_assessment_id(assessment_id)
    rows = (
        db.query(Option.option_key, QuestionResponse.value)
        .join(QuestionResponse, QuestionResponse.option_id == Option.id)
        .filter(QuestionResponse.assessment_id == aid)
        .all()
    )
    return {str(option_key): int(value) for (option_key, value) in rows}


def _upsert_score_and_mark_scored(
    db: Session, assessment_id: str, score_breakdown: dict[str, Any]
) -> AssessmentScore:
    """
    Upsert assessment_scores + set assessment status to scored.

    Returns the AssessmentScore ORM instance. Callers must not re-query for the
    same row in the same session without db.flush(): SessionLocal uses
    autoflush=False, so a follow-up SELECT would not see a pending INSERT.

    New rows get an explicit primary key before flush: Column(default=uuid.uuid4)
    is applied at flush time, so without this, score_row.id would still be None
    when inserting child assessment_score_styles rows in the same transaction.
    """
    aid = _parse_assessment_id(assessment_id)
    assessment = db.query(Assessment).filter(Assessment.id == aid).first()
    if not assessment:
        raise ValueError(f"Assessment not found: {assessment_id}")

    row = db.query(AssessmentScore).filter(AssessmentScore.assessment_id == aid).first()
    if row:
        row.score_breakdown = score_breakdown
    else:
        row = AssessmentScore(
            id=uuid.uuid4(),
            assessment_id=aid,
            score_breakdown=score_breakdown,
        )
        db.add(row)

    assessment.status = AssessmentStatus.scored
    db.add(assessment)
    return row


def _get_style_id_by_number(db: Session, style_number: int) -> str:
    row = db.query(BspStyle).filter(BspStyle.style_number == int(style_number)).first()
    if not row:
        raise ValueError(f"BspStyle not found for style_number={style_number}")
    return str(row.id)


def _style_type(value: Any) -> AssessmentScoreStyleType:
    v = str(value).strip().lower()
    try:
        return AssessmentScoreStyleType(v)
    except Exception as e:
        raise ValueError(
            f"Invalid style type: {value}. Expected one of basic/plural/split."
        ) from e


def _upsert_score_styles(
    db: Session, assessment_score_id: uuid.UUID, score: dict[str, Any]
) -> None:
    # Score engine keys are lower-case (existing spike output):
    # overall: cclientType, octnumber
    overall_type = score.get("cclientType") or score.get("clientType")
    overall_oct = score.get("octnumber") or score.get("octNumber")

    contexts: list[tuple[AssessmentScoreStyleContext, Any, Any]] = [
        (AssessmentScoreStyleContext.overall, overall_type, overall_oct),
        (
            AssessmentScoreStyleContext.professional_typical,
            score.get("professional_typical_type"),
            score.get("professional_typical_oct"),
        ),
        (
            AssessmentScoreStyleContext.professional_stressful,
            score.get("professional_stressful_type"),
            score.get("professional_stressful_oct"),
        ),
        (
            AssessmentScoreStyleContext.personal_typical,
            score.get("personal_typical_type"),
            score.get("personal_typical_oct"),
        ),
        (
            AssessmentScoreStyleContext.personal_stressful,
            score.get("personal_stressful_type"),
            score.get("personal_stressful_oct"),
        ),
    ]

    for ctx, t_val, oct_val in contexts:
        if t_val is None or oct_val is None:
            raise ValueError(
                f"Missing mapping inputs for context={ctx}: type={t_val}, oct={oct_val}"
            )

        style_type = _style_type(t_val)
        bsp_style_id = _get_style_id_by_number(db, int(oct_val))

        row = (
            db.query(AssessmentScoreStyle)
            .filter(
                AssessmentScoreStyle.assessment_score_id == assessment_score_id,
                AssessmentScoreStyle.context == ctx,
            )
            .first()
        )
        if row:
            row.type = style_type
            row.bsp_style_id = bsp_style_id
        else:
            db.add(
                AssessmentScoreStyle(
                    assessment_score_id=assessment_score_id,
                    context=ctx,
                    type=style_type,
                    bsp_style_id=bsp_style_id,
                )
            )


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """
    SQS worker (v1, spike-compatible).

    Computes BSP score from SQS payload and enqueues report generation.
    """
    start = time.perf_counter()
    records = event.get("Records") or []
    logger.info("sqs_batch_received", extra={"records": len(records)})

    for record in records:
        msg_start = time.perf_counter()
        body = record.get("body") or "{}"
        try:
            msg = json.loads(body) if isinstance(body, str) else (body or {})
        except Exception:
            logger.exception("invalid_message_body_json")
            raise

        assessment_id = msg.get("assessment_id")
        if not assessment_id:
            logger.error("missing_assessment_id")
            raise ValueError("assessment_id is required")

        set_worker_context(
            assessment_id=str(assessment_id),
            sqs_message_id=record.get("messageId"),
        )

        # Preferred path: read from DB. Allow inline question_responses only for debugging.
        # Accept both keys for a short migration window.
        inline_question_responses = msg.get("question_responses") or msg.get(
            "assessment_data"
        )
        if inline_question_responses:
            question_responses = inline_question_responses
            data_source = "inline"
        else:
            with get_db_context() as db:
                question_responses = _load_question_responses_from_db(db, assessment_id)
            data_source = "db"

        logger.info(
            "scoring_started",
            extra={
                "assessment_id": assessment_id,
                "data_source": data_source,
                "response_count": len(question_responses),
            },
        )

        if data_source == "db" and len(question_responses) != EXPECTED_RESPONSE_COUNT:
            # Fail fast so SQS retries / DLQ can catch bad or incomplete assessments.
            raise ValueError(
                f"Expected {EXPECTED_RESPONSE_COUNT} question_responses, got {len(question_responses)} for assessment_id={assessment_id}"
            )

        score = generate_bsp_score(question_responses)

        # Persist score + status transition (only meaningful for DB-sourced scoring)
        if data_source == "db":
            with get_db_context() as db:
                score_row = _upsert_score_and_mark_scored(
                    db, assessment_id, score_breakdown=score
                )
                _upsert_score_styles(
                    db, assessment_score_id=score_row.id, score=score
                )

        logger.info(
            "scoring_completed",
            extra={
                "assessment_id": assessment_id,
                "overall_style": score.get("cclientStyle"),
                "octnumber": score.get("octnumber"),
                "duration_ms": int((time.perf_counter() - msg_start) * 1000),
            },
        )

        # Client HTML pipeline: frontend uploads print snapshot after status=scored,
        # then POST /enqueue-report. Optional auto-enqueue when enabled in env.
        auto_enqueue = os.environ.get("AUTO_ENQUEUE_REPORT_AFTER_SCORING", "false").lower() in (
            "1",
            "true",
            "yes",
        )
        print_html_s3_key = (msg.get("print_html_s3_key") or "").strip()
        report_queue_url = os.environ.get("REPORT_QUEUE_URL", "").strip()
        if auto_enqueue and report_queue_url:
            report_body: dict[str, Any] = {
                "assessment_id": assessment_id,
                "question_responses": question_responses,
                "assessment_data": question_responses,
                "score": score,
                "account": msg.get("account"),
            }
            if print_html_s3_key:
                report_body["print_html_s3_key"] = print_html_s3_key
            resp = _sqs.send_message(
                QueueUrl=report_queue_url,
                MessageBody=json.dumps(report_body),
            )
            logger.info(
                "report_job_enqueued",
                extra={
                    "assessment_id": assessment_id,
                    "message_id": resp.get("MessageId"),
                    "auto_enqueue": True,
                },
            )
        elif not auto_enqueue:
            logger.info(
                "report_enqueue_deferred",
                extra={
                    "assessment_id": assessment_id,
                    "reason": "client_html_pipeline",
                },
            )
        else:
            logger.warning(
                "report_queue_url_missing_skip_enqueue",
                extra={"assessment_id": assessment_id},
            )

    # For SQS event sources, returning successfully means "delete message".
    logger.info(
        "sqs_batch_processed",
        extra={
            "processed": len(records),
            "duration_ms": int((time.perf_counter() - start) * 1000),
        },
    )
    return {"ok": True, "processed": len(records)}
