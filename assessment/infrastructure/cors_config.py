"""Shared frontend origin resolution for Assessment CDK stacks."""

from __future__ import annotations


def frontend_origin_from_config(config: dict) -> str | None:
    """Optional per-environment SPA origin (e.g. UAT CloudFront)."""
    origin = (config.get("frontend_origin") or "").strip().rstrip("/")
    return origin or None


def api_gateway_cors_origins(config: dict) -> list[str]:
    """Base deployed origins plus optional ``frontend_origin`` from environment yaml."""
    origins = [
        "https://dev.bspblueprint.com",
        "https://staging.bspblueprint.com",
    ]
    extra = frontend_origin_from_config(config)
    if extra and extra not in origins:
        origins.append(extra)
    return origins


def lambda_cors_frontend_origin(env_name: str, config: dict) -> str:
    """
    Must match ``assessment/src/api/cors_env.frontend_origin_for_environment`` when
    ``frontend_origin`` is not set in yaml.
    """
    explicit = frontend_origin_from_config(config)
    if explicit:
        return explicit

    key = (env_name or "development").strip().lower()
    if key in ("prod", "production", "prd"):
        return ""
    if key in ("stage", "staging"):
        return "https://staging.bspblueprint.com"
    return "https://dev.bspblueprint.com"
