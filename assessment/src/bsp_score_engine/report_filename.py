"""PDF filename helpers for assessment reports."""
from __future__ import annotations

import re
from datetime import datetime, timezone


def default_report_filename(account: dict) -> str:
    """
    Filename only: ``FirstName_LastName_YYYY-MM-DD_HHMMSS_microseconds.pdf`` (UTC).
    """
    first = (account.get("firstname") or account.get("first") or "Report").strip()
    last = (account.get("lastname") or account.get("last") or "").strip()
    first = re.sub(r"[^\w\s-]", "", first).strip().replace(" ", "_") or "Report"
    last = re.sub(r"[^\w\s-]", "", last).strip().replace(" ", "_")
    name_part = f"{first}_{last}" if last else first
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S_%f")
    return f"{name_part}_{ts}.pdf"
