from app.infrastructure.bedrock_client import normalize_bedrock_usage


def test_normalize_bedrock_usage_includes_cache_fields():
    usage = normalize_bedrock_usage(
        {
            "input_tokens": 1200,
            "output_tokens": 80,
            "cache_read_input_tokens": 900,
            "cache_creation_input_tokens": 100,
        }
    )
    assert usage["input_tokens"] == 1200
    assert usage["cache_read_input_tokens"] == 900
    assert usage["cache_creation_input_tokens"] == 100
