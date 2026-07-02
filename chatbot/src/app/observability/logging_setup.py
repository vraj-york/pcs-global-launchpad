"""Application-wide logging configuration for Lambda and local uvicorn."""

from __future__ import annotations

import logging
import sys

from app.config import settings


def configure_app_logging() -> None:
    """Ensure root logger honors LOG_LEVEL so pipeline telemetry reaches CloudWatch."""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)

    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        handler.setFormatter(
            logging.Formatter("%(levelname)s %(name)s %(message)s")
        )
        root.addHandler(handler)
        return

    for handler in root.handlers:
        handler.setLevel(level)
