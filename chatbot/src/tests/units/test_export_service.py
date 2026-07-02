"""Unit tests for export_service date/time formatting."""

from datetime import datetime, timezone

from app.services.export_service import _fmt_datetime


def test_fmt_datetime_orders_time_before_date():
    dt = datetime(2026, 6, 4, 9, 36, tzinfo=timezone.utc)
    assert _fmt_datetime(dt) == "9:36 AM, June 4, 2026"


def test_fmt_datetime_afternoon_time():
    dt = datetime(2026, 12, 15, 14, 5, tzinfo=timezone.utc)
    assert _fmt_datetime(dt) == "2:05 PM, December 15, 2026"


def test_fmt_datetime_empty_for_non_datetime():
    assert _fmt_datetime(None) == ""
    assert _fmt_datetime("") == ""
