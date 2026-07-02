"""
S3 staging for browser-captured assessment print HTML (gzip).

Report worker reads these objects and renders PDF without SPA auth.
"""
from __future__ import annotations

import gzip
import os
import re
from typing import Final

import boto3

_s3 = boto3.client("s3")

# Max uncompressed HTML (~12 MB); gzip upload should be well under API limits.
MAX_PRINT_HTML_BYTES: Final[int] = 12 * 1024 * 1024

_ASSESSMENT_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def print_html_prefix() -> str:
    return (os.environ.get("PRINT_HTML_PREFIX") or "assessment_print_html/").strip()


def print_html_object_key(assessment_id: str) -> str:
    aid = str(assessment_id).strip().lower()
    if not _ASSESSMENT_ID_RE.match(aid):
        raise ValueError(f"Invalid assessment_id: {assessment_id!r}")
    prefix = print_html_prefix().rstrip("/")
    return f"{prefix}/{aid}/snapshot.html.gz"


def validate_print_html_s3_key_for_assessment(s3_key: str, assessment_id: str) -> None:
    expected = print_html_object_key(assessment_id)
    key = (s3_key or "").strip()
    if key != expected:
        raise ValueError(
            f"print_html_s3_key must be {expected!r} for assessment_id={assessment_id}"
        )


def upload_print_html(assessment_id: str, html: str) -> str:
    bucket = (os.environ.get("REPORTS_BUCKET") or "").strip()
    if not bucket:
        raise ValueError("REPORTS_BUCKET env var is required for print HTML upload")

    raw = (html or "").encode("utf-8")
    if not raw:
        raise ValueError("Print HTML is empty")
    if len(raw) > MAX_PRINT_HTML_BYTES:
        raise ValueError(
            f"Print HTML exceeds maximum size ({MAX_PRINT_HTML_BYTES} bytes uncompressed)"
        )

    key = print_html_object_key(assessment_id)
    body = gzip.compress(raw, compresslevel=6)
    _s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType="application/gzip",
        ContentEncoding="gzip",
    )
    return key


def download_print_html(s3_key: str) -> str:
    bucket = (os.environ.get("REPORTS_BUCKET") or "").strip()
    if not bucket:
        raise ValueError("REPORTS_BUCKET env var is required")

    resp = _s3.get_object(Bucket=bucket, Key=s3_key)
    body = resp["Body"].read()
    try:
        raw = gzip.decompress(body)
    except OSError:
        raw = body
    return raw.decode("utf-8")
