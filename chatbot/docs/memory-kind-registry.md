# Memory Kind Registry — Controlled Vocabulary

**Purpose:** Single source of truth for memory `kind`, `bsp_dimension`, extraction rules, and role permissions. Code constants in `app/domain/memory_registry.py` must mirror this document.

**Governance:** New kinds require PR updating this file + registry module + migration CHECK constraint. AI must not invent kinds at runtime.

**Related:** [`memory-competency-questions.md`](./memory-competency-questions.md) | [`user-memory-implementation-plan.md`](./user-memory-implementation-plan.md)

---

## 1. BSP dimensions (optional tag)

Valid `bsp_dimension` values — `NULL` allowed for non-BSP memories.

| Value | Definition | Example memory text |
|-------|------------|---------------------|
| `strengths_observed` | User or coach noted a strength pattern in conversation | "Sam mentioned they stay calm under deadline pressure." |
| `stress_triggers_observed` | Observed trigger or stress pattern (self-reported) | "User said back-to-back meetings drain their focus." |
| `growth_edges_observed` | Development area user is actively working on | "User is practicing delegating weekly status updates." |
| `environmental_preferences` | Workspace, schedule, or context preferences | "User prefers morning deep work before 10am." |
| `interaction_preferences` | How they want the bot to communicate | "User prefers bullet-point answers under six lines." |

**Rules:**

- Must be from this list or `NULL`. Extraction JSON with unknown dimension → coerce to `NULL` + log warning.
- **Never** use `bsp_dimension` to store numeric assessment scores — those live in L1 Nest BSP only.

---

## 2. Memory kinds

### `preference`

| Field | Value |
|-------|-------|
| **Definition** | How the user wants the bot to communicate or format responses. |
| **Story mapping** | Preferences |
| **Examples** | "Prefers concise answers"; "Wants examples from software industry" |
| **Non-examples** | "User said thanks" (chit-chat); BSP score labels (use L1) |
| **Allowed `bsp_dimension`** | `interaction_preferences`, `environmental_preferences`, or `NULL` |
| **Default scope** | `personal` |
| **Extract roles** | employee, default, coach (self), superadmin |
| **Retrieve roles** | owner |
| **Sensitivity default** | `normal` |

---

### `goal`

| Field | Value |
|-------|-------|
| **Definition** | Stated objective or priority the user is working toward. |
| **Story mapping** | Goals |
| **Examples** | "Working on improving delegation to a team of four"; "Preparing for a Q3 leadership review" |
| **Non-examples** | Generic BSP development areas copied from assessment without user stating them |
| **Allowed `bsp_dimension`** | `growth_edges_observed` or `NULL` |
| **Default scope** | `personal` |
| **Extract roles** | employee, default, coach (self) |
| **Retrieve roles** | owner |
| **Sensitivity default** | `normal` |

---

### `behavioural_insight`

| Field | Value |
|-------|-------|
| **Definition** | User-**self-described** behavioral pattern not already covered by L1 BSP summary. |
| **Story mapping** | Behavioural insights |
| **Examples** | "User says they recharge alone after workshops"; "User notices they avoid conflict in 1:1s" |
| **Non-examples** | "User has high Dominance per BSP" (L1); clinical personality labels |
| **Allowed `bsp_dimension`** | Any §1 value or `NULL` |
| **Default scope** | `personal` |
| **Extract roles** | employee, default |
| **Retrieve roles** | owner |
| **Sensitivity default** | `normal` |
| **L1 precedence** | If conflicts with Nest BSP block, **L1 wins** — supersede L3 on detect |

---

### `coaching_history`

| Field | Value |
|-------|-------|
| **Definition** | Factual record of coaching-related events or topics discussed. |
| **Story mapping** | Coaching context / history |
| **Examples** | "Discussed delegation plan with coachee in January"; "Coach reviewed session notes on feedback delivery" |
| **Non-examples** | Full session transcripts; performance judgments |
| **Allowed `bsp_dimension`** | `NULL` or observation-related dimensions |
| **Default scope** | `coachee` when `client_id` present; else `personal` |
| **Extract roles** | coach |
| **Retrieve roles** | coach owner + coachee scope RBAC |
| **Sensitivity default** | `normal` or `restricted` if sensitive topic |

---

### `fact`

| Field | Value |
|-------|-------|
| **Definition** | Stable contextual fact about the user's work situation. |
| **Story mapping** | General context |
| **Examples** | "User is a PM at Acme Corp"; "User has two direct reports" |
| **Non-examples** | Opinions; transient states ("user is tired today") |
| **Allowed `bsp_dimension`** | `NULL` |
| **Default scope** | `personal` |
| **Extract roles** | all |
| **Retrieve roles** | owner |
| **Sensitivity default** | `normal` |

---

### `relationship`

| Field | Value |
|-------|-------|
| **Definition** | Named people, teams, or reporting relationships the user mentioned. |
| **Story mapping** | Relationships / peer context |
| **Examples** | "Direct reports named Priya and Raj"; "Works closely with mentor Alex" |
| **Non-examples** | @mention BSP blocks (L1 peer inject); gossip about others |
| **Allowed `bsp_dimension`** | `NULL` |
| **Default scope** | `personal` |
| **Extract roles** | all |
| **Retrieve roles** | owner |
| **Sensitivity default** | `normal` |
| **Entity rules** | Must populate `entities` + normalized forms (see §4) |

---

### `observation`

| Field | Value |
|-------|-------|
| **Definition** | Coach-noted pattern about a coachee from a session (not official assessment). |
| **Story mapping** | Coaching observations |
| **Examples** | "Coachee hesitates when presenting to executives"; "Coachee responded well to written prep" |
| **Non-examples** | Diagnosis; HR disciplinary notes |
| **Allowed `bsp_dimension`** | §1 values |
| **Default scope** | `coachee` + `scope_ref` = coachee id/hash |
| **Extract roles** | coach only |
| **Retrieve roles** | coach with matching coachee access |
| **Sensitivity default** | `restricted` if potentially sensitive |

---

### `team_insight`

| Field | Value |
|-------|-------|
| **Definition** | Team-level trend or pattern the **manager stated** or is authorized to see. |
| **Story mapping** | Manager team insights |
| **Examples** | "Manager noted team burnout risk before release week" |
| **Non-examples** | Org-wide analytics (use `org_insight`); raw HR metrics |
| **Allowed `bsp_dimension`** | `NULL` |
| **Default scope** | `team` + `scope_ref` = company id |
| **Extract roles** | manager persona (TBD) — **prefer L1 Nest API** |
| **Retrieve roles** | manager with company access |
| **Sensitivity default** | `team` |

---

### `org_insight`

| Field | Value |
|-------|-------|
| **Definition** | Organization-level theme admin explicitly discussed. |
| **Story mapping** | Admin org analytics |
| **Examples** | "Admin tracking adoption of BSP across three business units" |
| **Non-examples** | Auto-aggregated analytics — use L1 org API |
| **Allowed `bsp_dimension`** | `NULL` |
| **Default scope** | `organization` + `scope_ref` = corporation id |
| **Extract roles** | **manual POST only** in v1 — no auto-extract |
| **Retrieve roles** | superadmin |
| **Sensitivity default** | `restricted` |

---

## 3. Memory lifecycle status

| Status | Meaning | In retrieval? | In Memory Panel |
|--------|---------|---------------|-----------------|
| `candidate` | Haiku extraction proposal; not yet validated | **No** | Yes — "Pending confirmation" section |
| `confirmed` | User confirmed, manually added, or auto-confirmed per policy | **Yes** | Yes — main list |
| `rejected` | User dismissed candidate | No | Hidden (audit only) |
| `superseded` | Replaced by newer memory (`superseded_by` set) | No | Hidden |

**v1 default:** extraction writes `candidate`. User confirms via panel → `confirmed`. Manual `POST /memories` → `confirmed` immediately.

---

## 4. Entity normalization rules

Implement in `app/services/memory/entity_normalizer.py`.

| Step | Rule |
|------|------|
| Trim | Strip whitespace |
| Case | Lowercase for matching keys |
| Titles | Remove honorifics (Mr, Ms, Dr) for key only; keep display in `entities` |
| Possessives | Strip `'s` suffix on keys |
| @mentions | Strip leading `@` |
| Duplicates | Deduplicate normalized keys within one memory row |

**Storage:**

- `entities` — JSON array of display strings (original casing).
- `entities_normalized` — JSON array of normalized keys (parallel index optional).

**Retrieval:** normalize query tokens the same way before GIN / overlap match.

**Future (v1.1):** `memory_entity_aliases` table mapping alias → canonical key.

---

## 5. Enum change process (governance)

1. Product + eng propose new kind in PR updating this doc.
2. Update `memory_registry.py` constants.
3. Migration adds value to `CHECK (kind IN (...))`.
4. Update extraction prompt fragment + frontend labels in `chatbot-memory.const.ts`.
5. Add golden test cases in `memory_golden/`.
6. Log `memory_audit_log` action `registry_change` (metadata only).

**Owners:**

| Area | Owner |
|------|-------|
| Kind definitions | Product + Behavioral Science liaison |
| Code registry sync | Chatbot eng |
| Extraction prompt | Chatbot eng |
| Compliance review | Legal/Privacy before new sensitive kinds |

---

## 6. Code mirror (required)

When implementing Phase 1, create `app/domain/memory_registry.py` exporting:

```python
MEMORY_KINDS: frozenset[str]
BSP_DIMENSIONS: frozenset[str]
MEMORY_STATUSES: frozenset[str]  # candidate, confirmed, rejected, superseded
KIND_TO_DEFAULT_SCOPE: dict[str, str]
KIND_ALLOWED_BSP_DIMENSIONS: dict[str, frozenset[str | None]]
validate_memory_kind(kind: str) -> None
validate_bsp_dimension(kind: str, dimension: str | None) -> None
```

All write paths (extraction, API POST/PATCH) call validators before insert.
