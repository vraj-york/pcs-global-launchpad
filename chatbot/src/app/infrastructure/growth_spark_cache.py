"""
Ephemeral cache for daily Growth Spark LLM output.

Redis when REDIS_URL is configured; otherwise in-process memory (dev / degraded).
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.config import settings

logger = logging.getLogger(__name__)

_CACHE_KEY_PREFIX = "growth-spark"


def _cache_key(user_id_hash: str, spark_date: str) -> str:
    return f"{_CACHE_KEY_PREFIX}:{user_id_hash}:{spark_date}"


def seconds_until_end_of_spark_day(
    spark_date: str,
    timezone: Optional[str],
) -> int:
    """TTL in seconds until midnight after spark_date in the user's timezone."""
    tz_name = (timezone or "UTC").strip() or "UTC"
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")

    try:
        year, month, day = (int(part) for part in spark_date.split("-"))
        day_start = datetime(year, month, day, tzinfo=tz)
    except (TypeError, ValueError):
        return 86_400

    next_midnight = day_start + timedelta(days=1)
    now = datetime.now(tz)
    remaining = int((next_midnight - now).total_seconds())
    return max(60, remaining)


class GrowthSparkCache:
    """Get/set cached Growth Spark title+body for one user per calendar day."""

    def __init__(self) -> None:
        self._memory: dict[str, tuple[str, float]] = {}
        self._redis = None
        if settings.REDIS_URL:
            try:
                import redis

                self._redis = redis.Redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2,
                )
                self._redis.ping()
                logger.info("growth_spark_cache_redis_connected")
            except Exception as exc:
                logger.warning(
                    "growth_spark_cache_redis_unavailable",
                    extra={"error": str(exc)},
                )
                self._redis = None

    def get(self, user_id_hash: str, spark_date: str) -> Optional[str]:
        key = _cache_key(user_id_hash, spark_date)

        if self._redis is not None:
            try:
                value = self._redis.get(key)
                if value:
                    return str(value)
            except Exception as exc:
                logger.warning(
                    "growth_spark_cache_redis_get_failed",
                    extra={"error": str(exc)},
                )

        cached = self._memory.get(key)
        if not cached:
            return None
        body, expiry = cached
        if time.monotonic() >= expiry:
            self._memory.pop(key, None)
            return None
        return body

    def set(
        self,
        user_id_hash: str,
        spark_date: str,
        body: str,
        *,
        timezone: Optional[str] = None,
    ) -> None:
        key = _cache_key(user_id_hash, spark_date)
        ttl = seconds_until_end_of_spark_day(spark_date, timezone)

        if self._redis is not None:
            try:
                self._redis.setex(key, ttl, body)
                return
            except Exception as exc:
                logger.warning(
                    "growth_spark_cache_redis_set_failed",
                    extra={"error": str(exc)},
                )

        self._memory[key] = (body, time.monotonic() + ttl)
