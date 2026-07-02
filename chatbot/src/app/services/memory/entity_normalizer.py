"""Entity string normalization for memory dedup and retrieval."""

from __future__ import annotations

import re

_HONORIFICS = re.compile(r"^(mr|mrs|ms|dr|prof)\.?\s+", re.IGNORECASE)


def normalize_entity(value: str) -> str:
    """Return a normalized key for matching (lowercase, trimmed, no honorific)."""
    text = value.strip()
    if text.startswith("@"):
        text = text[1:].strip()
    text = _HONORIFICS.sub("", text)
    if text.endswith("'s"):
        text = text[:-2]
    return text.lower().strip()


def normalize_entities(values: list[str]) -> tuple[list[str], list[str]]:
    """
    Return (display_entities, normalized_entities).

    Display list dedupes case-insensitively while preserving first-seen casing.
    """
    display: list[str] = []
    normalized: list[str] = []
    seen: set[str] = set()

    for raw in values:
        if not isinstance(raw, str):
            continue
        trimmed = raw.strip()
        if not trimmed:
            continue
        key = normalize_entity(trimmed)
        if not key or key in seen:
            continue
        seen.add(key)
        display.append(trimmed[:120])
        normalized.append(key)

    return display, normalized


def extract_query_entities(message: str, mentions: list[str] | None = None) -> list[str]:
    """Extract normalized entity keys from user message + structured mentions."""
    keys: list[str] = []
    seen: set[str] = set()

    for mention in mentions or []:
        key = normalize_entity(mention)
        if key and key not in seen:
            seen.add(key)
            keys.append(key)

    for token in re.findall(r"@(\w[\w.-]*)", message):
        key = normalize_entity(token)
        if key and key not in seen:
            seen.add(key)
            keys.append(key)

    for token in re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b", message):
        key = normalize_entity(token)
        if key and key not in seen:
            seen.add(key)
            keys.append(key)

    return keys
