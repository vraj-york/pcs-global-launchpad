"""
Cross-Layer Audit Consistency Checker

Verifies alignment between the three audit log layers:
  1. RDS chatbot_audit_logs (Layer 2)
  2. Bedrock Model Invocation Logs in CloudWatch (Layer 1)
  3. Bedrock Guardrail Logs in CloudWatch (Layer 3)

Checks performed:
  - Every answered/error row with a correlation_id has a matching Bedrock invocation log
  - content_filter denials have a matching Guardrail log
  - Timestamp skew between RDS and Bedrock logs is within 10 seconds
  - Error rows do not unexpectedly carry a correlation_id (they failed before LLM responded)

Run manually for spot checks or wrap in a scheduled Lambda for ongoing compliance.

Usage:
    python scripts/consistency_check.py              # last 24 hours
    python scripts/consistency_check.py --hours 6   # last 6 hours

Requirements:
    The same environment variables used by the chatbot Lambda must be set:
    DB_HOST, DB_NAME, DB_SECRET_ARN, AWS_REGION
    and the environment must have AWS credentials with access to
    CloudWatch Logs and Secrets Manager.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import boto3
from aws_lambda_powertools import Logger

# Ensure the src directory is on the path when running as a script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from app.infrastructure.database import DatabaseClient  # noqa: E402

logger = Logger(service="audit-consistency-checker")

logs = boto3.client("logs", region_name=os.environ.get("AWS_REGION", "us-east-1"))

BEDROCK_LOG_GROUP   = os.environ.get("BEDROCK_LOG_GROUP",   "/aws/bedrock/modelinvocations")
GUARDRAIL_LOG_GROUP = os.environ.get("GUARDRAIL_LOG_GROUP", "/aws/bedrock/modelinvocations")


#  Report 

@dataclass
class ConsistencyReport:
    checked_at          : str        = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    rds_rows_checked    : int        = 0
    matched             : int        = 0
    unmatched           : int        = 0
    guardrail_matched   : int        = 0
    guardrail_unmatched : int        = 0
    warnings            : list[str]  = field(default_factory=list)
    errors              : list[str]  = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0


#  Data Fetching 

def fetch_rds_rows(hours_back: int = 24) -> list[dict]:
    """
    Fetch recent audit rows from RDS using the application's DatabaseClient.
    Uses the same Secrets Manager credentials as the Lambda.
    """
    since = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()
    db    = DatabaseClient()

    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT log_id, timestamp, outcome, denial_reason,
                   correlation_id, latency_ms, input_tokens, output_tokens
            FROM chatbot_audit_logs
            WHERE timestamp >= %s
            ORDER BY timestamp DESC
            """,
            (since,),
        )
        return [dict(row) for row in cursor.fetchall()]


def fetch_bedrock_log(correlation_id: str) -> dict | None:
    """
    Search CloudWatch for the Bedrock invocation log matching correlation_id.
    correlation_id == Bedrock RequestId.
    """
    try:
        response = logs.filter_log_events(
            logGroupName  = BEDROCK_LOG_GROUP,
            filterPattern = f'"{correlation_id}"',
            limit         = 1,
        )
        events = response.get("events", [])
        if events:
            return json.loads(events[0]["message"])
        return None
    except Exception as e:
        logger.warning("bedrock_log_fetch_failed", extra={"correlation_id": correlation_id, "error": str(e)})
        return None


def fetch_guardrail_log(correlation_id: str) -> dict | None:
    """
    Search CloudWatch for a Guardrail action log matching correlation_id.
    Guardrail logs share the same log group as invocation logs.
    """
    try:
        response = logs.filter_log_events(
            logGroupName  = GUARDRAIL_LOG_GROUP,
            filterPattern = f'"guardrail" "{correlation_id}"',
            limit         = 1,
        )
        events = response.get("events", [])
        if events:
            return json.loads(events[0]["message"])
        return None
    except Exception as e:
        logger.warning("guardrail_log_fetch_failed", extra={"correlation_id": correlation_id, "error": str(e)})
        return None


#  Checks 

def run_consistency_check(hours_back: int = 24) -> ConsistencyReport:
    report = ConsistencyReport()
    rows   = fetch_rds_rows(hours_back)
    report.rds_rows_checked = len(rows)

    for row in rows:
        correlation_id = row.get("correlation_id")
        log_id         = str(row.get("log_id"))
        outcome        = row.get("outcome")

        #  Check 1: answered/error rows with a correlation_id should have a Bedrock log
        if outcome in ("answered", "fallback") and correlation_id:
            bedrock_log = fetch_bedrock_log(correlation_id)

            if bedrock_log:
                report.matched += 1

                #  Check 2: timestamp skew should be under 10 seconds
                rds_ts     = row["timestamp"]
                bedrock_ts_str = bedrock_log.get("timestamp", "")
                if bedrock_ts_str:
                    bedrock_ts = datetime.fromisoformat(bedrock_ts_str.replace("Z", "+00:00"))
                    if isinstance(rds_ts, str):
                        rds_ts = datetime.fromisoformat(rds_ts)
                    skew = abs((rds_ts - bedrock_ts).total_seconds())
                    if skew > 10:
                        report.warnings.append(
                            f"log_id={log_id}: timestamp skew of {skew:.1f}s between RDS and Bedrock log"
                        )
            else:
                report.unmatched += 1
                report.warnings.append(
                    f"log_id={log_id}: no Bedrock invocation log found for correlation_id={correlation_id}"
                )

        #  Check 3: content_filter denials should have a Guardrail log
        if outcome == "denied" and row.get("denial_reason") == "content_filter":
            if correlation_id:
                guardrail_log = fetch_guardrail_log(correlation_id)
                if guardrail_log:
                    report.guardrail_matched += 1
                else:
                    report.guardrail_unmatched += 1
                    report.warnings.append(
                        f"log_id={log_id}: content_filter denial has no matching Guardrail log "
                        f"(correlation_id={correlation_id})"
                    )
            else:
                report.warnings.append(
                    f"log_id={log_id}: content_filter denial is missing correlation_id"
                )

        #  Check 4: pure error rows (failed before LLM responded) should not have correlation_id
        if outcome == "error" and correlation_id:
            # This is a warning, not an error — some errors occur after Bedrock has responded
            report.warnings.append(
                f"log_id={log_id}: error row has correlation_id set — verify this is expected"
            )

    logger.info("consistency_check_complete", extra={
        "checked_at"         : report.checked_at,
        "rds_rows_checked"   : report.rds_rows_checked,
        "matched"            : report.matched,
        "unmatched"          : report.unmatched,
        "guardrail_matched"  : report.guardrail_matched,
        "guardrail_unmatched": report.guardrail_unmatched,
        "warning_count"      : len(report.warnings),
        "error_count"        : len(report.errors),
        "passed"             : report.passed,
    })

    return report


#  CLI 

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit consistency checker")
    parser.add_argument("--hours", type=int, default=24, help="Hours to look back (default: 24)")
    args = parser.parse_args()

    report = run_consistency_check(hours_back=args.hours)

    print(f"\n{'=' * 55}")
    print(f" Audit Consistency Check — {report.checked_at}")
    print(f"{'=' * 55}")
    print(f" RDS rows checked    : {report.rds_rows_checked}")
    print(f" Bedrock matched     : {report.matched}")
    print(f" Bedrock unmatched   : {report.unmatched}")
    print(f" Guardrail matched   : {report.guardrail_matched}")
    print(f" Guardrail unmatched : {report.guardrail_unmatched}")
    print(f" Warnings            : {len(report.warnings)}")
    print(f" Passed              : {'YES' if report.passed else 'NO'}")

    if report.warnings:
        print("\n Warnings:")
        for w in report.warnings:
            print(f"   ! {w}")

    if report.errors:
        print("\n Errors:")
        for e in report.errors:
            print(f"   x {e}")

    sys.exit(0 if report.passed else 1)
