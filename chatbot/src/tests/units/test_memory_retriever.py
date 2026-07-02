from app.services.memory.retriever import MemoryRetriever


def test_merge_with_baseline_backfills_recent_when_semantic_empty():
    baseline = [
        {"id": "recent-1", "kind": "preference"},
        {"id": "recent-2", "kind": "goal"},
    ]
    merged = MemoryRetriever._merge_with_baseline([], baseline, top_k=2)
    assert [row["id"] for row in merged] == ["recent-1", "recent-2"]


def test_merge_with_baseline_prefers_semantic_ranking():
    semantic = [{"id": "best-match", "kind": "preference"}]
    baseline = [
        {"id": "best-match", "kind": "preference"},
        {"id": "recent-2", "kind": "goal"},
    ]
    merged = MemoryRetriever._merge_with_baseline(semantic, baseline, top_k=2)
    assert [row["id"] for row in merged] == ["best-match", "recent-2"]
