"""
Assessment Engine — DB Seeder Lambda

Connects to the shared RDS PostgreSQL database (schema managed by Prisma in
the backend repo) and upserts the 60 predefined assessment questions and their
color-coded options.

Safe to invoke multiple times — all writes are upserts:
  - Questions: ON CONFLICT (question_order) DO UPDATE
  - Options:   ON CONFLICT (question_id, color) DO UPDATE

Prerequisites (run once, managed by backend Prisma):
  prisma migrate deploy   ← creates the questions / options tables

Invoke after every deploy that changes questions.json, bsp_styles.json,
report_content.json, or growth_spark_templates.json:
    aws lambda invoke \\
        --function-name assessment-db-seeder-{env} \\
        response.json
"""

import json
import logging
import os
import boto3
import psycopg2
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DATA_FILE = Path(__file__).parent / "data" / "questions.json"
STYLES_FILE = Path(__file__).parent / "data" / "bsp_styles.json"
REPORT_CONTENT_FILE = Path(__file__).parent / "data" / "report_content.json"
GROWTH_SPARK_TEMPLATES_FILE = (
    Path(__file__).parent / "data" / "growth_spark_templates.json"
)


#  Helpers


def get_credentials(secret_arn: str) -> Dict[str, str]:
    client = boto3.client("secretsmanager")
    return json.loads(client.get_secret_value(SecretId=secret_arn)["SecretString"])


def make_option_key(
    situation: str, life_context: str, question_order: int, color: str
) -> str:
    """
    Build the auto-generated slug for an option row (DB column option_key).

    Format:  {life_context[:2]}{situation[:1]}-{question_order}-{color}
    Examples:
        typical   / professional / 1  / red   → prt-1-red
        stressful / personal     / 12 / blue  → pes-12-blue
    """
    # Score engine expects per-quadrant indexing 1..15 (prt/prs/pet/pes).
    # Our DB question_order is globally 1..60, so normalize it into 1..15.
    idx = ((int(question_order) - 1) % 15) + 1
    return f"{life_context[:2]}{situation[:1]}-{idx}-{color}"


# Backward-compatible alias
make_question_name = make_option_key


def seed_questions(conn) -> dict:
    """
    Upsert all questions from data/questions.json into the questions and
    options tables (created and owned by Prisma in the backend repo).

    Questions:  ON CONFLICT (question_order) DO UPDATE — any field change in
                questions.json is reflected in the DB on the next invoke.
    Options:    ON CONFLICT (question_id, color) DO UPDATE — same principle.

    Uses PostgreSQL's xmax trick to distinguish inserts from updates:
      xmax = 0  → row was freshly inserted
      xmax > 0  → row already existed and was updated

    option_key (slug) is computed here, never stored in the JSON.
    Returns a summary dict with per-table insert/update counts.
    """
    questions = json.loads(DATA_FILE.read_text())

    q_inserted = 0
    q_updated = 0
    o_inserted = 0
    o_updated = 0

    for q in questions:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO questions
                        (question_order, question_text, type, situation,
                         life_context, version, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (question_order) DO UPDATE SET
                        question_text = EXCLUDED.question_text,
                        type          = EXCLUDED.type,
                        situation     = EXCLUDED.situation,
                        life_context  = EXCLUDED.life_context,
                        version       = EXCLUDED.version,
                        updated_at    = CURRENT_TIMESTAMP
                    RETURNING id, (xmax = 0) AS inserted;
                    """,
                    (
                        q["question_order"],
                        q["question_text"],
                        q["type"],
                        q["situation"],
                        q["life_context"],
                        q.get("version", 1),
                    ),
                )
                question_id, was_inserted = cur.fetchone()
                if was_inserted:
                    q_inserted += 1
                else:
                    q_updated += 1

                for opt in q["options"]:
                    slug = make_option_key(
                        situation=q["situation"],
                        life_context=q["life_context"],
                        question_order=q["question_order"],
                        color=opt["color"],
                    )
                    cur.execute(
                        """
                        INSERT INTO options
                            (question_id, option_key, color, option_text,
                             display_order)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (question_id, color) DO UPDATE SET
                            option_text   = EXCLUDED.option_text,
                            display_order = EXCLUDED.display_order,
                            option_key    = EXCLUDED.option_key
                        RETURNING (xmax = 0) AS inserted;
                        """,
                        (
                            question_id,
                            slug,
                            opt["color"],
                            opt["option_text"],
                            opt["display_order"],
                        ),
                    )
                    (opt_inserted,) = cur.fetchone()
                    if opt_inserted:
                        o_inserted += 1
                    else:
                        o_updated += 1

    return {
        "questions_inserted": q_inserted,
        "questions_updated": q_updated,
        "options_inserted": o_inserted,
        "options_updated": o_updated,
    }


def seed_bsp_styles(conn) -> dict:
    """
    Upsert BSP styles (1–13) into bsp_styles.

    Uses ON CONFLICT (style_number) DO UPDATE.
    """
    if not STYLES_FILE.exists():
        return {"bsp_styles_inserted": 0, "bsp_styles_updated": 0}

    styles = json.loads(STYLES_FILE.read_text())
    inserted = 0
    updated = 0

    for s in styles:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO bsp_styles (
                        id,
                        style_number,
                        title,
                        has_video,
                        youtube_video_id,
                        description,
                        display_order,
                        environmental_preferences,
                        interaction_preferences,
                        character_strengths,
                        psychological_needs,
                        likes,
                        dislikes,
                        work_preferences,
                        warning_signs,
                        when_feeling_stressed,
                        updated_at
                    )
                    VALUES (
                        gen_random_uuid(),
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (style_number) DO UPDATE SET
                        title = EXCLUDED.title,
                        has_video = EXCLUDED.has_video,
                        youtube_video_id = EXCLUDED.youtube_video_id,
                        description = EXCLUDED.description,
                        display_order = EXCLUDED.display_order,
                        environmental_preferences = EXCLUDED.environmental_preferences,
                        interaction_preferences = EXCLUDED.interaction_preferences,
                        character_strengths = EXCLUDED.character_strengths,
                        psychological_needs = EXCLUDED.psychological_needs,
                        likes = EXCLUDED.likes,
                        dislikes = EXCLUDED.dislikes,
                        work_preferences = EXCLUDED.work_preferences,
                        warning_signs = EXCLUDED.warning_signs,
                        when_feeling_stressed = EXCLUDED.when_feeling_stressed,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted;
                    """,
                    (
                        int(s["style_number"]),
                        s["title"],
                        bool(s.get("has_video", False)),
                        s.get("youtube_video_id"),
                        s["description"],
                        int(s.get("display_order", s["style_number"])),
                        s.get("environmental_preferences", []),
                        s.get("interaction_preferences", []),
                        s.get("character_strengths", []),
                        s.get("psychological_needs", []),
                        s.get("likes", []),
                        s.get("dislikes", []),
                        s.get("work_preferences", []),
                        s.get("warning_signs", []),
                        s.get("when_feeling_stressed", ""),
                    ),
                )
                (was_inserted,) = cur.fetchone()
                if was_inserted:
                    inserted += 1
                else:
                    updated += 1

    return {"bsp_styles_inserted": inserted, "bsp_styles_updated": updated}


def seed_report_content(conn) -> dict:
    """
    Upsert report_content sections used by the PDF generator.
    Uses ON CONFLICT (section_key) DO UPDATE.
    """
    if not REPORT_CONTENT_FILE.exists():
        return {"report_content_inserted": 0, "report_content_updated": 0}

    rows = json.loads(REPORT_CONTENT_FILE.read_text())
    inserted = 0
    updated = 0

    for r in rows:
        section_key = r["section_key"]
        content = r["content"]
        is_active = bool(r.get("is_active", True))

        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO report_content (
                        id,
                        section_key,
                        content,
                        is_active,
                        updated_at
                    )
                    VALUES (
                        gen_random_uuid(),
                        %s,
                        %s::jsonb,
                        %s,
                        CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (section_key) DO UPDATE SET
                        content = EXCLUDED.content,
                        is_active = EXCLUDED.is_active,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted;
                    """,
                    (
                        section_key,
                        json.dumps(content),
                        is_active,
                    ),
                )
                (was_inserted,) = cur.fetchone()
                if was_inserted:
                    inserted += 1
                else:
                    updated += 1

    return {"report_content_inserted": inserted, "report_content_updated": updated}


def seed_growth_spark_templates(conn) -> dict:
    """
    Upsert day-one Growth Spark templates (1 per BSP style_number).

    Uses ON CONFLICT (style_number) DO UPDATE.
    Requires bsp_styles rows to exist first (seed_bsp_styles).
    """
    if not GROWTH_SPARK_TEMPLATES_FILE.exists():
        return {
            "growth_spark_templates_inserted": 0,
            "growth_spark_templates_updated": 0,
        }

    rows = json.loads(GROWTH_SPARK_TEMPLATES_FILE.read_text())
    inserted = 0
    updated = 0

    for row in rows:
        style_number = int(row["style_number"])
        title = row.get("title", "Daily Growth Spark")
        body = row["body"]
        is_active = bool(row.get("is_active", True))

        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO growth_spark_templates (
                        id,
                        style_number,
                        title,
                        body,
                        is_active,
                        updated_at
                    )
                    VALUES (
                        gen_random_uuid(),
                        %s,
                        %s,
                        %s,
                        %s,
                        CURRENT_TIMESTAMP
                    )
                    ON CONFLICT (style_number) DO UPDATE SET
                        title = EXCLUDED.title,
                        body = EXCLUDED.body,
                        is_active = EXCLUDED.is_active,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS inserted;
                    """,
                    (style_number, title, body, is_active),
                )
                (was_inserted,) = cur.fetchone()
                if was_inserted:
                    inserted += 1
                else:
                    updated += 1

    return {
        "growth_spark_templates_inserted": inserted,
        "growth_spark_templates_updated": updated,
    }


#  Lambda entry point


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    logger.info("Assessment DB Seeder — starting...")

    conn = None
    try:
        host = os.environ["DB_HOST"]
        port = int(os.environ["DB_PORT"])
        db_name = os.environ["DB_NAME"]
        secret_arn = os.environ["DB_SECRET_ARN"]

        creds = get_credentials(secret_arn)

        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=db_name,
            user=creds["username"],
            password=creds["password"],
            connect_timeout=10,
        )

        stats = seed_questions(conn)
        style_stats = seed_bsp_styles(conn)
        report_stats = seed_report_content(conn)
        growth_spark_stats = seed_growth_spark_templates(conn)

        summary = (
            f"Questions — inserted: {stats['questions_inserted']}, "
            f"updated: {stats['questions_updated']}. "
            f"Options — inserted: {stats['options_inserted']}, "
            f"updated: {stats['options_updated']}. "
            f"BspStyles — inserted: {style_stats['bsp_styles_inserted']}, "
            f"updated: {style_stats['bsp_styles_updated']}. "
            f"ReportContent — inserted: {report_stats['report_content_inserted']}, "
            f"updated: {report_stats['report_content_updated']}. "
            f"GrowthSparkTemplates — inserted: "
            f"{growth_spark_stats['growth_spark_templates_inserted']}, "
            f"updated: {growth_spark_stats['growth_spark_templates_updated']}."
        )
        logger.info(f"Done. {summary}")

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "status": "success",
                    **stats,
                    **style_stats,
                    **report_stats,
                    **growth_spark_stats,
                    "message": summary,
                }
            ),
        }

    except Exception as exc:
        logger.error(f"FAILED: {exc}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": str(exc)}),
        }

    finally:
        if conn and not conn.closed:
            conn.close()
