"""
Primary SPA origin for CORS from deploy / ENVIRONMENT name.

Used by Settings defaults; CDK sets ``FRONTEND_ORIGIN`` and ``CORS_ORIGINS`` on Lambda
from ``environments/*.yaml`` (see ``infrastructure/cors_config.py``).
"""

import os

__all__ = ["frontend_origin_for_environment"]


def frontend_origin_for_environment(env: str) -> str:
    """
    Map ``ENVIRONMENT`` (e.g. dev, stage, uat, prod) to the main frontend host.

    ``FRONTEND_ORIGIN`` env (set by CDK from yaml) wins when present (e.g. UAT CloudFront).
    """
    explicit = (os.getenv("FRONTEND_ORIGIN") or "").strip().rstrip("/")
    if explicit:
        return explicit

    key = (env or "development").strip().lower()
    if key in ("prod", "production", "prd"):
        return ""
    if key in ("stage", "staging"):
        return "https://staging.bspblueprint.com"
    return "https://dev.bspblueprint.com"
