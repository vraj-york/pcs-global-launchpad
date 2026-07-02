# Audit Log Access Contract

## Purpose

This document defines how the backend team can pull chatbot audit logs
for analytics, compliance, and cost reporting.

---

## Endpoint

```
GET /audit/logs/backend-export
```

## Base URL

```
https://<chatbot-api-gateway-url>/prod
```

---

## Authentication

**Header:** `X-Api-Key: <key provided by chatbot team>`

- Do **not** use a JWT Bearer token — this endpoint uses service-to-service API key auth.
- The key is static and rotatable. Contact the chatbot team to obtain or rotate it.

---

## Required Parameters

| Parameter  | Type         | Format               | Example                    |
|------------|--------------|----------------------|----------------------------|
| start_time | ISO-8601 UTC | YYYY-MM-DDTHH:MM:SSZ | `2026-01-01T00:00:00Z`     |
| end_time   | ISO-8601 UTC | YYYY-MM-DDTHH:MM:SSZ | `2026-01-31T23:59:59Z`     |

Both are required. Requests without a time range are rejected with HTTP 400.

---

## Optional Parameters

| Parameter | Values      | Default |
|-----------|-------------|---------|
| fmt       | json \| csv | json    |

---

## Constraints

- Date range **cannot exceed 31 days** per request.
- For ranges larger than 31 days, make sequential calls with non-overlapping windows.
- Maximum 10 000 records per export. Exceeding this returns the first 10 000 sorted by `timestamp DESC`.
- Please do not poll more frequently than once every 15 minutes.
- For compliance or analytics pulls, a nightly scheduled call is recommended.

---

## Response

```json
{
  "export_id"         : "a7f3c1b2-...",
  "download_url"      : "https://s3.amazonaws.com/...",
  "expires_in_seconds": 3600,
  "record_count"      : 142,
  "format"            : "json"
}
```

The `download_url` is a presigned S3 URL. It expires after `expires_in_seconds` (default 1 hour).
Download the file promptly after receiving the response.

---

## Record Schema

Each record contains the following fields:

| Field                  | Type        | Description                                                        |
|------------------------|-------------|--------------------------------------------------------------------|
| `log_id`               | UUID        | Unique identifier for this audit record                            |
| `timestamp`            | ISO-8601 UTC| When the interaction occurred                                      |
| `user_id`              | string      | SHA-256 hash of the Cognito sub — opaque, no raw PII               |
| `role`                 | string      | `super_admin` \| `manager` \| `end_user`                           |
| `session_id`           | UUID        | Groups multiple turns of the same conversation                     |
| `chat_mode`            | string      | `quick_mode` \| `deep_mode`                                        |
| `model_id`             | string      | Bedrock model identifier used for the interaction                  |
| `outcome`              | string      | `answered` \| `denied` \| `error` \| `fallback`                    |
| `denial_reason`        | string/null | `rbac_policy` \| `content_filter` — populated when outcome=denied  |
| `error_code`           | string/null | `TIMEOUT` \| `UPSTREAM_FAILURE` \| `UNKNOWN` — when outcome=error  |
| `retrieved_source_ids` | string[]    | Filenames of knowledge base documents used; empty if none          |
| `retrieved_chunk_count`| integer     | Number of document chunks retrieved; 0 if knowledge base unused    |
| `tool_calls_count`     | integer     | Total tool invocations in the interaction (includes all tools)     |
| `input_tokens`         | integer/null| Total input tokens across all LLM calls; null if interaction failed before any call |
| `output_tokens`        | integer/null| Total output tokens; null if interaction failed before any call    |
| `latency_ms`           | integer/null| End-to-end Lambda latency in milliseconds                          |
| `correlation_id`       | string/null | Bedrock RequestId — links to Bedrock Model Invocation Logs         |

---

## What Is NOT in the Logs

- User query text
- LLM response text
- Document content or chunk text
- Raw PII (names, emails, phone numbers)
- Internal IP addresses

---

## Example Request

```bash
curl -X GET \
  "https://<api-url>/prod/audit/logs/backend-export?start_time=2026-02-01T00:00:00Z&end_time=2026-02-28T23:59:59Z&fmt=json" \
  -H "X-Api-Key: <your-api-key>"
```

---

## Error Responses

| HTTP Status | Meaning                                              |
|-------------|------------------------------------------------------|
| 400         | Missing or invalid parameters (e.g. range > 31 days) |
| 401         | Missing or invalid API key                           |
| 503         | Export storage not configured (contact chatbot team) |
| 500         | Export generation failed (contact chatbot team)      |

---

## Contact

Chatbot team — raise a ticket or reach out on Slack for key rotation or schema questions.
