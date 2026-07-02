# Memory System — Competency Questions

**Purpose:** Define what the Bispy Bot memory system must answer, what it must never store, and how it relates to live BSP data. Inspired by structured knowledge practices ([Ontology Pipeline](https://moderndata101.substack.com/p/the-ontology-pipeline-refresh)); authoritative for extraction prompts, guardrails, and QA.

**Related docs:**

- [`memory-kind-registry.md`](./memory-kind-registry.md) — controlled vocabulary
- [`user-memory-implementation-plan.md`](./user-memory-implementation-plan.md) — implementation

---

## 1. Primary competency questions (must answer)

These are the questions the memory system exists to support. Retrieval and extraction prompts should be evaluated against this list.

### All roles

| ID | Question | Primary layer |
|----|----------|---------------|
| CQ-01 | What has this user told the bot about **how they prefer to interact** (tone, format, timing)? | L3 `preference`, `interaction_preferences` |
| CQ-02 | What **stable personal context** helps continuity across threads (role, team size, named colleagues)? | L3 `fact`, `relationship` |
| CQ-03 | What **goals or priorities** has the user stated they are working on? | L3 `goal` |
| CQ-04 | What did we discuss recently in **this thread** that the user expects us to continue? | L2 thread window + summary |
| CQ-05 | What does the user's **current BSP assessment** say about their behavioral style? | L1 Nest personalization (not L3) |

### Employee

| ID | Question | Primary layer |
|----|----------|---------------|
| CQ-E01 | What behavioral patterns or insights has the user **self-described** in chat (not inferred from scores)? | L3 `behavioural_insight` |
| CQ-E02 | What coaching or development context has the user shared voluntarily? | L3 `goal`, `behavioural_insight` |

### Coach

| ID | Question | Primary layer |
|----|----------|---------------|
| CQ-C01 | What observations about a **specific coachee** were stated in a coach session? | L3 `observation`, `coaching_history` (scope `coachee`) |
| CQ-C02 | What patterns has the coach asked us to track across sessions for a coachee? | L3 + L1 coachee snapshot when API live |
| CQ-C03 | Who are the coach's active coachees and what is their assigned context? | L1 Nest / coach tools (not extracted org roster) |

### Manager (company admin — no team-lead role in platform)

| ID | Question | Primary layer |
|----|----------|---------------|
| CQ-M01 | What **team-level trends** are authorized for this company admin? | L1 Nest team-insights API (when live) |
| CQ-M02 | What team facts did the company admin **explicitly state** in chat? | L3 `team_insight` (scope `team`) |

### Admin (superadmin)

| ID | Question | Primary layer |
|----|----------|---------------|
| CQ-A01 | What **organization-level metrics or themes** is this admin allowed to see? | L1 Nest org-insights API (when live) |
| CQ-A02 | What org facts did the admin explicitly state in chat? | L3 `org_insight` (scope `organization`) — rare; prefer L1 |

---

## 2. Questions we explicitly defer (not memory)

| ID | Question | Correct system |
|----|----------|----------------|
| DQ-01 | What is the official BSP score for dimension X? | L1 Nest assessment API — **never extract as L3** |
| DQ-02 | What does the employee policy document say about PTO? | RAG `document_chunks` — org knowledge base |
| DQ-03 | Has this user's performance improved over 6 months? | Approach 4 / analytics — not v1 memory |
| DQ-04 | What is the definitive org chart? | Nest backend — not chat extraction |
| DQ-05 | What should we decide about this user's promotion? | Out of scope — no automated workplace decisions |

---

## 3. Prohibited storage (never extract, never retrieve into prompt)

Extraction worker and guardrails must **reject** candidates matching these categories:

| Category | Examples | Action |
|----------|----------|--------|
| Clinical / medical | Diagnosis, medication, therapy details | Block + audit `extract_blocked` |
| Protected class inference | Race, religion, disability inferred from chat | Block |
| Performance ratings | "User is a low performer" | Block — not a memory fact |
| Credentials / secrets | Passwords, API keys, SSN | Block (align with `content_guardrail`) |
| Third-party PII without scope | Another person's private details unless coachee-scoped and authorized | Block or `restricted` + RBAC |
| Duplicated BSP scores | Numeric assessment results | Use L1; do not store in L3 |
| Legal/compliance accusations | Unverified claims about harassment, fraud | Block |

When in doubt, **do not extract**. Prefer L1 live BSP or ask the user in chat.

---

## 4. Layer precedence (L1 vs L2 vs L3)

When sources conflict, apply this order in `memory_policy.py`:

```
1. L1 Live BSP (Nest)     — authoritative for assessment-derived behavioral summaries
2. L2 Thread context    — authoritative for "what we just said" in this conversation
3. L3 Distilled memory  — authoritative for user-stated preferences and cross-thread facts
4. RAG documents        — authoritative for org policy / methodology docs
```

**Conflict examples:**

| Situation | Resolution |
|-----------|------------|
| L3 says "user is an introvert"; L1 BSP says high outward energy | Prefer **L1** for style coaching; drop or supersede conflicting L3 `behavioural_insight` on next extraction |
| L3 says "prefers bullet points"; user says today "give me detail" in L2 | **L2 wins** for this turn; extraction may add new preference or supersede old |
| L3 team_insight contradicts Nest team API | Prefer **L1** when API live; mark L3 `team_insight` superseded |

Implement: retriever attaches `source_layer` hint in XML; system prompt instructs model to prefer L1 BSP block over `<extracted_memories>` on assessment topics.

---

## 5. Role-based visibility competency

| Actor | Can read | Can write (extract/create) | Can confirm candidates |
|-------|----------|----------------------------|------------------------|
| Owner (employee) | Own `personal` memories | Own personal | Yes |
| Coach | Own + `coachee`-scoped where `client_id` matches | Coachee-scoped observations | Yes for own rows |
| Company admin (manager) | Own + `team`-scoped where Nest grants company access | Limited `team_insight` | Yes |
| Superadmin | Own + org-scoped per policy | Manual only for org; no auto-extract org facts | Yes |

Retrieval must enforce this **before** decrypt (filter in SQL).

---

## 6. Quality bar for a "good" memory

A memory row is worth storing when:

1. **New** — not already in L1 BSP or existing confirmed L3 (dedup check).
2. **Stable** — likely true beyond this single turn (not "I'm tired today").
3. **Actionable** — changes how the bot should respond later.
4. **Defensible** — user would recognize it if shown in the Memory Panel.
5. **Typed** — maps to exactly one `kind` from the registry.
6. **Governed** — passes guardrails; starts as `candidate` until confirmed (see implementation plan).

Discard when `importance < 0.3` or extraction confidence is low.

---

## 7. Evaluation harness (Phase 3+ QA)

Build 20–30 golden cases covering:

| Case type | Pass criteria |
|-----------|---------------|
| Preference recall | Thread B references preference from thread A |
| No false medical | Extraction rejects clinical content |
| BSP not duplicated | Assessment scores appear from L1 only |
| Coachee scope | Coach cannot retrieve other coach's coachee memories |
| Candidate flow | Extracted row not in prompt until user confirms |
| Degrade | Retrieval timeout → chat still works |
| Supersede | Job change updates relationship memory |

Store fixtures under `chatbot/src/tests/fixtures/memory_golden/`.

---

## 8. Sign-off

| Decision | Default (v1) | Owner |
|----------|--------------|-------|
| Consent default | **Off** until opt-in (extraction); see [`memory-privacy-and-consent.md`](./memory-privacy-and-consent.md) | Product + Legal |
| Candidate vs auto-confirm | **Candidate** until user confirms | Product + Eng |
| Manager persona mapping | **`company_admin`** (Company Admin = manager) | Product ✓ |
| Quick mode personalization | **Yes** — L3 retrieve in quick + deep; lower top_k in quick | Eng ✓ |
| Per-user DEK | **Required** — `user_deks` + `UserDekCrypto` for memories v1 | Eng ✓ |
| Quarterly memory audit | Sample 100 rows / LLM-judge | Eng + Compliance |

Update this doc when competency scope changes. Enum changes require [`memory-kind-registry.md`](./memory-kind-registry.md) update first.
