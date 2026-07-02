from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.repositories.user_dek_repository import UserDekRepository


def test_insert_maps_real_dict_cursor_row():
    repo = UserDekRepository(db_client=MagicMock())
    now = datetime.now(timezone.utc)
    row = {
        "user_id_hash": "abc123",
        "encrypted_dek": b"cipher",
        "dek_version": 1,
        "created_at": now,
        "shredded_at": None,
    }

    cursor = MagicMock()
    cursor.fetchone.return_value = row
    repo.db.get_cursor.return_value.__enter__.return_value = cursor

    result = repo.insert("abc123", b"cipher")

    assert result["user_id_hash"] == "abc123"
    assert result["encrypted_dek"] == b"cipher"


def test_get_active_coerces_memoryview_encrypted_dek():
    repo = UserDekRepository(db_client=MagicMock())
    now = datetime.now(timezone.utc)
    row = {
        "user_id_hash": "abc123",
        "encrypted_dek": memoryview(b"cipher"),
        "dek_version": 1,
        "created_at": now,
        "shredded_at": None,
    }

    cursor = MagicMock()
    cursor.fetchone.return_value = row
    repo.db.get_cursor.return_value.__enter__.return_value = cursor

    result = repo.get_active("abc123")

    assert result is not None
    assert result["encrypted_dek"] == b"cipher"
    assert isinstance(result["encrypted_dek"], bytes)
    assert result["dek_version"] == 1
