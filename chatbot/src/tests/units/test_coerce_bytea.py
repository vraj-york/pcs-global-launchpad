from app.infrastructure.database import coerce_bytea


def test_coerce_bytea_from_memoryview():
    raw = b"kms-wrapped-dek"
    assert coerce_bytea(memoryview(raw)) == raw


def test_coerce_bytea_passthrough_bytes():
    raw = b"already-bytes"
    assert coerce_bytea(raw) is raw


def test_coerce_bytea_none():
    assert coerce_bytea(None) is None
