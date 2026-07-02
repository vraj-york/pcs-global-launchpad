"""
Thread Repository Unit Tests

Tests for ConversationRepository, MessageRepository, and SummaryRepository.

Strategy:
  • All database calls are mocked via MagicMock — no real DB or KMS required.
  • The DatabaseClient.get_cursor() context manager is patched on each repo.
  • Encrypted content bytes are represented as dummy bytes (b"enc:...") — these
    repos do not handle encryption, so the actual content format is irrelevant.
"""

import psycopg2
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, call
from uuid import uuid4

from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository, _coerce_row
from app.repositories.summary_repository import SummaryRepository


#  Fixtures 

def _make_cursor_cm(rows=None, rowcount=1):
    """Return a (mock_db, mock_cursor) pair with get_cursor() pre-configured."""
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = rows[0] if rows else None
    mock_cursor.fetchall.return_value = rows or []
    mock_cursor.rowcount = rowcount

    mock_cm = MagicMock()
    mock_cm.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cm.__exit__ = MagicMock(return_value=False)

    mock_db = MagicMock()
    mock_db.get_cursor.return_value = mock_cm

    return mock_db, mock_cursor


CONV_ROW = {
    "id": str(uuid4()),
    "user_id_hash": "abc123",
    "title": "Test thread",
    "pinned": False,
    "persona": "employee",
    "chat_mode": "quick",
    "coach_client_id": None,
    "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    "updated_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    "last_message_at": None,
    "soft_deleted_at": None,
}

MSG_ROW = {
    "id": str(uuid4()),
    "conversation_id": str(uuid4()),
    "role": "user",
    "content": memoryview(b"enc:hello"),
    "tokens_in": None,
    "tokens_out": None,
    "tool_calls": None,
    "follow_up_chips": None,
    "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
}

SUMMARY_ROW = {
    "conversation_id": str(uuid4()),
    "summary": memoryview(b"enc:summary"),
    "up_to_message": str(uuid4()),
    "tokens": 150,
    "generated_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
}


#  ConversationRepository 

class TestConversationGet:
    def test_returns_dict_when_found(self):
        mock_db, _ = _make_cursor_cm([CONV_ROW])
        repo = ConversationRepository(db_client=mock_db)
        result = repo.get(CONV_ROW["id"], "abc123")
        assert result is not None
        assert result["id"] == CONV_ROW["id"]
        assert result["title"] == "Test thread"

    def test_returns_none_when_not_found(self):
        mock_db, mock_cursor = _make_cursor_cm([])
        mock_cursor.fetchone.return_value = None
        repo = ConversationRepository(db_client=mock_db)
        result = repo.get(str(uuid4()), "abc123")
        assert result is None


class TestConversationListByUser:
    def test_returns_rows_and_total(self):
        mock_cursor = MagicMock()
        # First call: COUNT(*), second call: data rows
        mock_cursor.fetchone.return_value = {"total": 1}
        mock_cursor.fetchall.return_value = [CONV_ROW]
        mock_cursor.rowcount = 1

        mock_cm = MagicMock()
        mock_cm.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cm.__exit__ = MagicMock(return_value=False)

        mock_db = MagicMock()
        mock_db.get_cursor.return_value = mock_cm

        repo = ConversationRepository(db_client=mock_db)
        rows, total = repo.list_by_user("abc123")

        assert total == 1
        assert len(rows) == 1
        assert rows[0]["title"] == "Test thread"

    def test_empty_list_returns_zero_total(self):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {"total": 0}
        mock_cursor.fetchall.return_value = []
        mock_cm = MagicMock()
        mock_cm.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cm.__exit__ = MagicMock(return_value=False)
        mock_db = MagicMock()
        mock_db.get_cursor.return_value = mock_cm

        repo = ConversationRepository(db_client=mock_db)
        rows, total = repo.list_by_user("abc123")

        assert total == 0
        assert rows == []


class TestConversationCreate:
    def test_returns_new_row(self):
        mock_db, _ = _make_cursor_cm([CONV_ROW])
        repo = ConversationRepository(db_client=mock_db)
        result = repo.create("abc123", "employee", "quick")
        assert result["persona"] == "employee"
        assert result["chat_mode"] == "quick"

    def test_coach_persona_passes_client_id(self):
        coach_row = {**CONV_ROW, "persona": "coach", "coach_client_id": "client-42"}
        mock_db, mock_cursor = _make_cursor_cm([coach_row])
        repo = ConversationRepository(db_client=mock_db)
        result = repo.create("abc123", "coach", "deep_dive", coach_client_id="client-42")
        assert result["coach_client_id"] == "client-42"


class TestConversationMutations:
    def test_rename_returns_true_on_success(self):
        mock_db, mock_cursor = _make_cursor_cm()
        mock_cursor.rowcount = 1
        repo = ConversationRepository(db_client=mock_db)
        assert repo.rename(str(uuid4()), "abc123", "New title") is True

    def test_rename_returns_false_when_not_found(self):
        mock_db, mock_cursor = _make_cursor_cm()
        mock_cursor.rowcount = 0
        repo = ConversationRepository(db_client=mock_db)
        assert repo.rename(str(uuid4()), "abc123", "New title") is False

    def test_set_pinned_true(self):
        mock_db, mock_cursor = _make_cursor_cm()
        mock_cursor.rowcount = 1
        repo = ConversationRepository(db_client=mock_db)
        assert repo.set_pinned(str(uuid4()), "abc123", True) is True

    def test_soft_delete_returns_true(self):
        mock_db, mock_cursor = _make_cursor_cm()
        mock_cursor.rowcount = 1
        repo = ConversationRepository(db_client=mock_db)
        assert repo.soft_delete(str(uuid4()), "abc123") is True

    def test_soft_delete_already_deleted_returns_false(self):
        mock_db, mock_cursor = _make_cursor_cm()
        mock_cursor.rowcount = 0
        repo = ConversationRepository(db_client=mock_db)
        assert repo.soft_delete(str(uuid4()), "abc123") is False


#  MessageRepository 

class TestMessageAppend:
    def test_returns_new_row(self):
        append_row = {
            "id": str(uuid4()),
            "conversation_id": str(uuid4()),
            "role": "user",
            "tokens_in": None,
            "tokens_out": None,
            "tool_calls": None,
            "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        }
        mock_db, _ = _make_cursor_cm([append_row])
        repo = MessageRepository(db_client=mock_db)
        result = repo.append(
            conversation_id=str(uuid4()),
            role="user",
            content_encrypted=b"enc:some_ciphertext",
        )
        assert "id" in result
        assert result["role"] == "user"

    def test_passes_psycopg2_binary_for_content(self):
        append_row = {
            "id": str(uuid4()),
            "conversation_id": str(uuid4()),
            "role": "assistant",
            "tokens_in": 10,
            "tokens_out": 50,
            "tool_calls": None,
            "follow_up_chips": None,
            "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        }
        mock_db, mock_cursor = _make_cursor_cm([append_row])
        mock_cursor.fetchone.return_value = append_row
        repo = MessageRepository(db_client=mock_db)
        content = b"enc:assistant_message"
        repo.append(str(uuid4()), "assistant", content, tokens_in=10, tokens_out=50)
        # Verify execute was called with psycopg2.Binary wrapping the content
        execute_call = mock_cursor.execute.call_args
        call_params = execute_call[0][1]
        # Third param (index 2) should be a psycopg2.Binary adapter
        assert isinstance(call_params[2], psycopg2.Binary)


class TestMessageGetWindow:
    def test_returns_chronological_rows(self):
        rows = [MSG_ROW, {**MSG_ROW, "id": str(uuid4()), "role": "assistant"}]
        mock_db, _ = _make_cursor_cm(rows)
        repo = MessageRepository(db_client=mock_db)
        result = repo.get_window(str(uuid4()), limit=12)
        assert len(result) == 2
        assert result[0]["role"] == "user"

    def test_coerces_memoryview_to_bytes(self):
        rows = [MSG_ROW]  # MSG_ROW.content is a memoryview
        mock_db, _ = _make_cursor_cm(rows)
        repo = MessageRepository(db_client=mock_db)
        result = repo.get_window(str(uuid4()))
        assert isinstance(result[0]["content"], bytes)
        assert result[0]["content"] == b"enc:hello"

    def test_empty_conversation_returns_empty_list(self):
        mock_db, _ = _make_cursor_cm([])
        repo = MessageRepository(db_client=mock_db)
        result = repo.get_window(str(uuid4()))
        assert result == []


class TestMessageListPaginated:
    def test_without_cursor(self):
        mock_db, _ = _make_cursor_cm([MSG_ROW])
        repo = MessageRepository(db_client=mock_db)
        result = repo.list_paginated(str(uuid4()), limit=20)
        assert len(result) == 1

    def test_with_before_id_cursor(self):
        mock_db, mock_cursor = _make_cursor_cm([MSG_ROW])
        repo = MessageRepository(db_client=mock_db)
        result = repo.list_paginated(str(uuid4()), limit=20, before_id=str(uuid4()))
        assert len(result) == 1
        # Verify the SQL includes the cursor sub-query (before_id is passed)
        sql_called = mock_cursor.execute.call_args[0][0]
        assert "created_at <" in sql_called


class TestMessageUpdateFollowUpChips:
    def test_update_executes_jsonb_write(self):
        mock_db, mock_cursor = _make_cursor_cm([])
        repo = MessageRepository(db_client=mock_db)
        mid = str(uuid4())
        chips = [{"display": "A", "submit": "B"}]
        repo.update_follow_up_chips(mid, chips)
        mock_cursor.execute.assert_called_once()
        sql, params = mock_cursor.execute.call_args[0]
        assert "UPDATE messages" in sql
        assert "follow_up_chips" in sql
        assert params[0] == '[{"display": "A", "submit": "B"}]'
        assert params[1] == mid


class TestCoerceRow:
    def test_memoryview_converted_to_bytes(self):
        row = {"id": "x", "content": memoryview(b"hello")}
        result = _coerce_row(row)
        assert isinstance(result["content"], bytes)
        assert result["content"] == b"hello"

    def test_bytes_passthrough(self):
        row = {"id": "x", "content": b"already bytes"}
        result = _coerce_row(row)
        assert result["content"] == b"already bytes"

    def test_non_content_keys_unchanged(self):
        row = {"id": "x", "role": "user"}
        result = _coerce_row(row)
        assert result == {"id": "x", "role": "user"}


#  SummaryRepository 

class TestSummaryGet:
    def test_returns_dict_with_bytes_content(self):
        mock_db, _ = _make_cursor_cm([SUMMARY_ROW])
        repo = SummaryRepository(db_client=mock_db)
        result = repo.get(str(uuid4()))
        assert result is not None
        assert isinstance(result["summary"], bytes)
        assert result["summary"] == b"enc:summary"
        assert result["tokens"] == 150

    def test_returns_none_when_no_summary(self):
        mock_db, mock_cursor = _make_cursor_cm([])
        mock_cursor.fetchone.return_value = None
        repo = SummaryRepository(db_client=mock_db)
        result = repo.get(str(uuid4()))
        assert result is None


class TestSummaryUpsert:
    def test_upsert_calls_execute(self):
        mock_db, mock_cursor = _make_cursor_cm([])
        repo = SummaryRepository(db_client=mock_db)
        conv_id = str(uuid4())
        msg_id = str(uuid4())
        repo.upsert(
            conversation_id=conv_id,
            summary_encrypted=b"enc:summary_text",
            up_to_message_id=msg_id,
            tokens=200,
        )
        mock_cursor.execute.assert_called_once()
        sql, params = mock_cursor.execute.call_args[0]
        assert "ON CONFLICT" in sql
        assert params[0] == conv_id
        assert isinstance(params[1], psycopg2.Binary)
        assert params[2] == msg_id
        assert params[3] == 200
