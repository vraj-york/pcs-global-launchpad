# Chatbot Audit Log Architecture

## Overview

Every chatbot interaction is captured across three complementary log layers.
No single layer is the complete picture — together they provide full auditability.

---

## Layer 1 — Bedrock Invocation Logs

**Location:** CloudWatch → `/aws/bedrock/modelinvocations`
**Managed by:** AWS (automatic, enabled via Model Invocation Logging)
**Retention:** 90 days

**What it captures:**
- Model ID (full ARN — Claude Sonnet, Titan Embed Text)
- Input and output token counts per invocation
- Request ID — used as `correlation_id` in Layer 2
- Inference region
- Lambda IAM role ARN that made the call
- Operation type (InvokeModel)

**What it does NOT capture:**
- Prompt text or response text (textDataDeliveryEnabled: false)
- User identity or RBAC role
- Business outcome (answered / denied / error)
- Session context

**When to use:**
- Per-call cost breakdown (token counts per day / model version)
- Verifying which Lambda invoked which model
- Debugging Bedrock API errors using the RequestId

---

## Layer 2 — RDS Audit Table (chatbot_audit_logs)

**Location:** RDS PostgreSQL → `chatbot_audit_logs`
**Managed by:** Chatbot team
**Retention:** Indefinite (immutable — no DELETE/UPDATE permitted)

**Schema:**

| Field                  | Type         | Description                                                          |
|------------------------|--------------|----------------------------------------------------------------------|
| `log_id`               | UUID         | Unique record identifier                                             |
| `timestamp`            | TIMESTAMPTZ  | When the interaction occurred (UTC)                                  |
| `user_id`              | TEXT         | SHA-256 hash of Cognito sub — opaque, never raw PII                  |
| `role`                 | TEXT         | `super_admin` \| `manager` \| `end_user`                             |
| `session_id`           | UUID         | Groups multiple turns of the same conversation                       |
| `chat_mode`            | ENUM         | `quick_mode` \| `deep_mode`                                          |
| `model_id`             | TEXT         | Bedrock model identifier used for the interaction                    |
| `outcome`              | TEXT         | `answered` \| `denied` \| `error` \| `fallback`                      |
| `denial_reason`        | TEXT / null  | `rbac_policy` \| `content_filter` — set when outcome = denied        |
| `error_code`           | TEXT / null  | `TIMEOUT` \| `UPSTREAM_FAILURE` \| `SENSITIVE_CONTENT_BLOCKED` \| `UNKNOWN` |
| `retrieved_source_ids` | TEXT[]       | Filenames of knowledge base documents used; empty if no retrieval    |
| `retrieved_chunk_count`| INT          | Number of document chunks retrieved; 0 if knowledge base unused      |
| `tool_calls_count`     | SMALLINT     | Total tool invocations across all agentic loop iterations            |
| `input_tokens`         | INT / null   | Total input tokens across all LLM calls in the interaction           |
| `output_tokens`        | INT / null   | Total output tokens; null if interaction failed before LLM responded |
| `latency_ms`           | INT / null   | End-to-end Lambda latency in milliseconds                            |
| `correlation_id`       | TEXT / null  | Bedrock RequestId — links to Layer 1                                 |

**What it does NOT capture:**
- Query text or response text
- Retrieved document content
- Any free text
- Raw PII (enforced by content guardrail before every write)

**When to use:**
- RBAC compliance auditing (who was denied, why, when)
- Per-user interaction history
- Session-level conversation grouping
- Outcome trend analysis (denial rates, error rates)
- Super admin review via `GET /audit/logs`
- Backend team compliance pulls via `GET /audit/logs/backend-export`

---

## Layer 3 — Bedrock Guardrail Logs

**Location:** CloudWatch → `/aws/bedrock/modelinvocations`
**Managed by:** AWS (automatic when Guardrails are enabled)
**Retention:** 90 days

**What it captures:**
- Guardrail action (`INTERVENED` / `NONE`)
- Which policy triggered the block (harmful content, medical advice, etc.)
- Whether input or output was blocked
- Request ID (matches `correlation_id` in Layer 2)

**When to use:**
- Investigating `content_filter` denials in Layer 2
- Guardrail policy tuning and effectiveness analysis
- Compliance evidence for content moderation

---

## Linking the Three Layers

Given a Layer 2 row with `correlation_id = "40be21c0-9617-4f74-89c0-80dd59d909e9"`:

**1. Cross-reference to Layer 1 (Bedrock Invocation Logs)**
```
CloudWatch Logs Insights → /aws/bedrock/modelinvocations
filter @message like "40be21c0-9617-4f74-89c0-80dd59d909e9"
```
→ Retrieves per-call token counts, model ARN, inference region

**2. Cross-reference to Layer 3 (Guardrail Logs)** — only when `denial_reason = content_filter`
```
CloudWatch Logs Insights → /aws/bedrock/modelinvocations
filter @message like "guardrail" and @message like "40be21c0-9617-4f74-89c0-80dd59d909e9"
```
→ Retrieves which policy triggered the block

Run `scripts/consistency_check.py` to automate these cross-references across a time window.

---

## Access Control Summary

| Consumer     | Layer 1         | Layer 2                              | Layer 3         |
|--------------|-----------------|--------------------------------------|-----------------|
| super_admin  | AWS Console     | `GET /audit/logs`                    | AWS Console     |
| backend team | —               | `GET /audit/logs/backend-export`     | —               |
| manager      | —               | — (future scope)                     | —               |
| end_user     | —               | —                                    | —               |

---

## Content Guardrail (PII Protection)

Before every write to Layer 2 or Layer 1 (CloudWatch), the audit row passes through
`content_guardrail.py`. If PII patterns (email, phone, SSN, credit card, IP, AWS key)
or free text in ID-only fields are detected:

1. The full row is **blocked** — never written to CloudWatch or RDS
2. A **sanitized fallback row** is written with `outcome=error`, `error_code=SENSITIVE_CONTENT_BLOCKED`,
   and all string fields redacted
3. The violation is logged to CloudWatch separately for investigation

---

## What Is Never Logged (Across All Three Layers)

- User query text
- LLM response text
- Retrieved document content or chunk text
- Raw email addresses, phone numbers, SSNs, or any PII
- AWS credentials or secrets
- IP addresses (blocked by content guardrail)
