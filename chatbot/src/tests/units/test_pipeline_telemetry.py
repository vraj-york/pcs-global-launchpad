from app.observability.pipeline_telemetry import (
    PipelineTimer,
    bind_request_context,
    emit_pipeline_telemetry,
)


def test_pipeline_timer_records_steps_and_ttft():
    request_id, trace_id = bind_request_context()
    timer = PipelineTimer(request_id=request_id, trace_id=trace_id)

    timer.start("auth")
    timer.end("auth")
    timer.start("prepare_context")
    timer.end("prepare_context")
    timer.record_ttft_first_token()

    summary = timer.to_interaction_meta()
    assert summary["pipeline_request_id"] == request_id
    assert summary["ttft_first_token_ms"] is not None
    assert len(summary["pipeline_steps"]) == 2
    assert summary["pipeline_steps"][0]["event"] == "auth"
    assert summary["pipeline_steps"][0]["status"] == "ok"


def test_emit_pipeline_summary_merges_interaction_meta():
    request_id, trace_id = bind_request_context()
    timer = PipelineTimer(request_id=request_id, trace_id=trace_id)
    interaction_meta: dict = {}

    emit_pipeline_telemetry(
        timer,
        interaction_meta=interaction_meta,
        persona="employee",
        chat_mode="quick",
        context_strategy="user_message_prefix",
        warm_cache_hit=True,
        query_path="fast",
    )

    assert interaction_meta["pipeline_request_id"] == request_id
    assert interaction_meta["pipeline_total_ms"] >= 0
    assert "pipeline_steps" in interaction_meta
