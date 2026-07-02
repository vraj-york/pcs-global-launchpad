"""One-time Sentry setup for Assessment Lambda workers."""

from __future__ import annotations

import logging
import os
from typing import Any

import boto3
import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration

logger = logging.getLogger(__name__)

_ENABLED = False
_DSN_CACHE: str | None = None

SENTRY_DSN_ENV = "SENTRY_DSN"
SENTRY_DSN_PARAMETER_NAME_ENV = "SENTRY_DSN_PARAMETER_NAME"


def _resolve_dsn() -> str:
    """
    Resolve Sentry DSN from env or SSM (SecureString parameters cannot be
    injected into Lambda env vars via CloudFormation).
    """
    global _DSN_CACHE
    if _DSN_CACHE is not None:
        return _DSN_CACHE

    dsn = (os.environ.get(SENTRY_DSN_ENV) or "").strip()
    if dsn:
        _DSN_CACHE = dsn
        return dsn

    param_name = (os.environ.get(SENTRY_DSN_PARAMETER_NAME_ENV) or "").strip()
    if not param_name:
        _DSN_CACHE = ""
        return ""

    try:
        client = boto3.client("ssm")
        resp = client.get_parameter(Name=param_name, WithDecryption=True)
        _DSN_CACHE = (resp["Parameter"]["Value"] or "").strip()
    except Exception:
        logger.warning(
            "Failed to load Sentry DSN from SSM parameter %s",
            param_name,
            exc_info=True,
        )
        _DSN_CACHE = ""

    return _DSN_CACHE


def init_sentry(worker_name: str, *, function_name: str | None = None) -> None:
    """
    Initialize Sentry once per Lambda execution environment (cold start).

    worker_name: stable logical id for filtering (e.g. score_worker).
    function_name: optional AWS function name for tagging.
    """
    global _ENABLED

    dsn = _resolve_dsn()
    if not dsn:
        return

    if _ENABLED:
        return

    environment = (
        (os.environ.get("SENTRY_ENVIRONMENT") or os.environ.get("ENVIRONMENT") or "unknown")
        .strip()
    )
    release = (os.environ.get("SENTRY_RELEASE") or "").strip() or None

    traces_rate_raw = (os.environ.get("SENTRY_TRACES_SAMPLE_RATE") or "0.1").strip()
    try:
        traces_sample_rate = float(traces_rate_raw)
    except ValueError:
        traces_sample_rate = 0.1

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        integrations=[
            AwsLambdaIntegration(timeout_warning=True),
        ],
        traces_sample_rate=traces_sample_rate,
        send_default_pii=False,
        attach_stacktrace=True,
    )

    sentry_sdk.set_tag("worker", worker_name)
    sentry_sdk.set_tag("component", "assessment-workers")
    if function_name:
        sentry_sdk.set_tag("lambda_function", function_name)

    _ENABLED = True


def set_worker_context(**fields: Any) -> None:
    """Attach non-PII context to the current Sentry scope (e.g. assessment_id)."""
    if not _ENABLED:
        return
    sentry_sdk.set_context("worker", {k: v for k, v in fields.items() if v is not None})
