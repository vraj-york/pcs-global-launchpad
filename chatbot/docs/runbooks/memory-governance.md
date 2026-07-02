# Memory Governance Runbook

**Status:** Scaffold — operationalize in Phase 7 of [`user-memory-implementation-plan.md`](../user-memory-implementation-plan.md).

**Related:** [`memory-kind-registry.md`](../memory-kind-registry.md) | [`memory-competency-questions.md`](../memory-competency-questions.md)

---

## 1. Ownership

| Area | Owner | Escalation |
|------|-------|------------|
| Kind registry changes | Product + Chatbot eng | Behavioral Science liaison |
| Extraction prompt tuning | Chatbot eng | Product |
| Consent / privacy | Legal / Privacy | Compliance |
| Production incidents | On-call chatbot eng | Platform lead |

---

## 2. Routine operations

### Nightly drift job (`memory_drift_job`)

**Purpose:** Invalidate or mark stale memories when user role or company access changes.

**Checks:**

- `team` scoped memories where user lost company access → set `status=rejected` or flag in metadata.
- `coachee` scoped memories where coach no longer has client access → hide from retrieval.

**On failure:** Alert `memory_drift_job.errors` CloudWatch metric; stale rows remain until manual fix.

### Quarterly quality audit

1. Sample 100 random **confirmed** memories (stratified by `kind`).
2. Run LLM-judge: "Is this fact defensible, correctly typed, and non-sensitive?"
3. Target: ≥90% pass; failures → tune extraction prompt or registry definitions.
4. Record results in internal ticket; link to `memory_audit_log` sample IDs.

---

## 3. Incident playbooks

### Extraction error rate spike

1. Check CloudWatch `memory_extract.errors` and Lambda logs.
2. Verify Bedrock Haiku availability and rate limits.
3. If JSON parse failures: review recent prompt/registry changes.
4. Mitigation: set `ENABLE_MEMORY_EXTRACTION=false` via env (candidates stop; chat unaffected).

### Retrieval degrade rate spike

1. Check `memory_retrieve.degraded` in pipeline logs.
2. Verify RDS/pgvector health and `MEMORY_RETRIEVE_TIMEOUT_MS`.
3. Chat continues with empty memory block — communicate to support if user reports "forgot preferences."

### User reports false memory

1. User deletes or rejects in Memory Panel (preferred).
2. Support can soft-delete via audit trail lookup (`memory_audit_log` by `user_id_hash`).
3. If systemic: add case to golden harness; tune extraction guardrails.

### Suspected PII in memory

1. Soft-delete row immediately.
2. Log `memory_audit_log` action `compliance_delete`.
3. Escalate to Privacy per breach process if required.
4. Review extraction guardrail patterns.

---

## 4. Registry change checklist

Before adding or renaming a `kind`:

- [ ] PR updates [`memory-kind-registry.md`](../memory-kind-registry.md)
- [ ] PR updates `app/domain/memory_registry.py`
- [ ] Migration extends `CHECK (kind IN (...))`
- [ ] Frontend labels in `chatbot-memory.const.ts`
- [ ] Golden test cases added
- [ ] Product + Compliance sign-off if sensitive

---

## 5. Metrics to watch

| Metric | Alert threshold (starting point) |
|--------|--------------------------------|
| `memory_extract.errors` | >5% of extractions over 15 min |
| `memory_retrieve.degraded` | >10% of chats over 15 min |
| `memory_candidates_created` | Anomaly detection (informational) |
| Pending candidates per user | >20 (UX review) |

---

*Expand this runbook when Phase 7 governance ships.*
