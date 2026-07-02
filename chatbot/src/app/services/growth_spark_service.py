"""
Daily Growth Spark generation for the user dashboard.

Mirrors AssessmentTriggerService: direct Bedrock call, no chat threads/tools.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.domain.growth_spark_prompts import (
    GROWTH_SPARK_MAX_BODY_CHARS,
    GROWTH_SPARK_MAX_BODY_LINES,
    GROWTH_SPARK_MAX_TITLE_CHARS,
    GROWTH_SPARK_TITLE,
    GROWTH_SPARK_SYSTEM,
    build_growth_spark_user_prompt,
    build_template_growth_spark_fallback,
)
from app.infrastructure import BedrockClient
from app.infrastructure.growth_spark_cache import GrowthSparkCache

logger = logging.getLogger(__name__)

_MAX_NAME_LEN = 80
_MAX_STYLE_TITLE_LEN = 120
_MAX_STYLE_SUMMARY_LEN = 600
_MAX_MIND_STATE_LEN = 80
_MAX_TEAM_CONTEXT_LEN = 240
_SPARK_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TITLE_BODY_RE = re.compile(
    r"^TITLE:\s*(.+?)\s*\n+BODY:\s*\n?(.*)$",
    re.DOTALL | re.IGNORECASE,
)

_MAX_TOKENS = 220
_TEMPERATURE = 0.55


def _extract_response_text(result: Dict[str, Any]) -> str:
    parts: List[str] = []
    for block in result.get("content", []) or []:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "\n".join(parts).strip()


def _sanitize_field(value: Optional[str], max_len: int) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    return trimmed[:max_len]


def _normalize_body_lines(body: str) -> str:
    lines = [line.strip() for line in body.replace("\r\n", "\n").split("\n")]
    lines = [line for line in lines if line]
    if len(lines) > GROWTH_SPARK_MAX_BODY_LINES:
        lines = lines[:GROWTH_SPARK_MAX_BODY_LINES]
    normalized = "\n".join(lines)
    if len(normalized) > GROWTH_SPARK_MAX_BODY_CHARS:
        normalized = normalized[:GROWTH_SPARK_MAX_BODY_CHARS].rstrip()
        if "\n" in normalized:
            normalized = normalized.rsplit("\n", 1)[0].rstrip()
    return normalized


def _clamp_growth_spark(title: str, body: str) -> Tuple[str, str]:
    title_clean = title.strip()[:GROWTH_SPARK_MAX_TITLE_CHARS].strip()
    body_clean = _normalize_body_lines(body)
    if not title_clean:
        title_clean = GROWTH_SPARK_TITLE
    return title_clean, body_clean


def _parse_llm_growth_spark(text: str) -> Tuple[str, str]:
    trimmed = text.strip()
    match = _TITLE_BODY_RE.match(trimmed)
    if match:
        return _clamp_growth_spark(match.group(1), match.group(2))

    lines = [line.strip() for line in trimmed.split("\n") if line.strip()]
    if not lines:
        return GROWTH_SPARK_TITLE, ""

    if len(lines) == 1:
        return _clamp_growth_spark(lines[0], "")

    first = lines[0]
    if first.upper().startswith("TITLE:"):
        first = first[6:].strip()
    return _clamp_growth_spark(first, "\n".join(lines[1:]))


def _serialize_cached(title: str, body: str) -> str:
    return json.dumps({"title": title, "body": body}, ensure_ascii=False)


def _deserialize_cached(value: str) -> Tuple[str, str]:
    try:
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            title = str(parsed.get("title", "")).strip()
            body = str(parsed.get("body", "")).strip()
            if title or body:
                return _clamp_growth_spark(title or GROWTH_SPARK_TITLE, body)
    except (json.JSONDecodeError, TypeError):
        pass

    if "TITLE:" in value.upper():
        return _parse_llm_growth_spark(value)

    clamped_title, clamped_body = _clamp_growth_spark(GROWTH_SPARK_TITLE, value)
    lines = [line.strip() for line in clamped_body.split("\n") if line.strip()]
    if (
        len(lines) >= 2
        and len(lines[0]) <= GROWTH_SPARK_MAX_TITLE_CHARS
        and len(lines[0].split()) <= 16
    ):
        return _clamp_growth_spark(lines[0], "\n".join(lines[1:]))
    return clamped_title, clamped_body


class GrowthSparkService:
    """Generate or return cached daily Growth Spark copy."""

    def __init__(
        self,
        bedrock: BedrockClient,
        cache: Optional[GrowthSparkCache] = None,
    ) -> None:
        self.bedrock = bedrock
        self.cache = cache or GrowthSparkCache()

    def generate(
        self,
        *,
        user_id_hash: str,
        display_name: Optional[str] = None,
        style_title: Optional[str] = None,
        style_summary: Optional[str] = None,
        dominant_mind_state: Optional[str] = None,
        spark_date: str,
        timezone: Optional[str] = None,
        team_context: Optional[str] = None,
    ) -> dict:
        date_clean = spark_date.strip()
        if not _SPARK_DATE_RE.match(date_clean):
            raise ValueError("spark_date must be yyyy-MM-dd")

        name = _sanitize_field(display_name, _MAX_NAME_LEN)
        style = _sanitize_field(style_title, _MAX_STYLE_TITLE_LEN)
        summary = _sanitize_field(style_summary, _MAX_STYLE_SUMMARY_LEN)
        mind_state = _sanitize_field(dominant_mind_state, _MAX_MIND_STATE_LEN)
        team = _sanitize_field(team_context, _MAX_TEAM_CONTEXT_LEN)
        tz = _sanitize_field(timezone, 80)

        cached_value = self.cache.get(user_id_hash, date_clean)
        if cached_value:
            title, body = _deserialize_cached(cached_value)
            return {
                "title": title,
                "body": body,
                "source": "cache",
                "spark_date": date_clean,
            }

        title, body = self._generate_with_llm(
            display_name=name,
            style_title=style,
            style_summary=summary,
            dominant_mind_state=mind_state,
            spark_date=date_clean,
            team_context=team,
        )

        self.cache.set(
            user_id_hash,
            date_clean,
            _serialize_cached(title, body),
            timezone=tz,
        )

        return {
            "title": title,
            "body": body,
            "source": "llm",
            "spark_date": date_clean,
        }

    def _generate_with_llm(
        self,
        *,
        display_name: Optional[str],
        style_title: Optional[str],
        style_summary: Optional[str],
        dominant_mind_state: Optional[str],
        spark_date: str,
        team_context: Optional[str],
    ) -> Tuple[str, str]:
        user_prompt = build_growth_spark_user_prompt(
            display_name=display_name,
            style_title=style_title,
            style_summary=style_summary,
            dominant_mind_state=dominant_mind_state,
            spark_date=spark_date,
            team_context=team_context,
        )

        try:
            result = self.bedrock.generate_chat_response(
                messages=[{"role": "user", "content": user_prompt}],
                system_prompt=GROWTH_SPARK_SYSTEM,
                max_tokens=_MAX_TOKENS,
                temperature=_TEMPERATURE,
                tools=None,
                model_id=settings.BEDROCK_SUMMARY_MODEL,
            )
            text = _extract_response_text(result)
            if text:
                title, body = _parse_llm_growth_spark(text)
                if body:
                    return title, body
        except Exception as exc:
            logger.warning(
                "growth_spark_llm_failed",
                extra={"error": str(exc)},
            )

        return build_template_growth_spark_fallback(display_name, style_title)
