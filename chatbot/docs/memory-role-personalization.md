# Memory & Personalization by Role

**Purpose:** Scalable role-based personalization for L1 (live BSP), L2 (thread), and L3 (distilled memory).

---

## 1. Role mapping (confirmed)

| Story / platform role | Chatbot `user_type` | Notes                                                                             |
| --------------------- | ------------------- | --------------------------------------------------------------------------------- |
| Employee              | `employee`          | Standard end user                                                                 |
| Coach                 | `coach`             | Coachee context via `client_id` + server fetch                                    |
| **Manager**           | **`company_admin`** | No team-lead role in platform; **Company Admin = manager** for team-scoped memory |
| Corporation admin     | `corporation_admin` | Multi-company rollup (future L1 APIs)                                             |
| Super admin           | `superadmin`        | Org-wide read policies; manual org memories only                                  |

**Removed:** `default` persona — no production use. See [`jwt-role-resolution-spec.md`](./jwt-role-resolution-spec.md).

**Not in scope:** team-lead / line-manager as a distinct persona.

---

## 2. Three layers (all roles, all modes)

Every conversation — **quick or deep_dive** — is personalized:

| Layer  | Source                               | Quick mode                              | Deep dive mode              |
| ------ | ------------------------------------ | --------------------------------------- | --------------------------- |
| **L1** | Nest BSP / coachee / team / org APIs | Injected when router = DEEP             | Injected when router = DEEP |
| **L2** | Thread window + rolling summary      | Yes (3-turn window)                     | Yes (6-turn window)         |
| **L3** | Confirmed distilled memories         | Yes (role policy, slightly lower top_k) | Yes (full role top_k)       |

**Mode difference (product):** answer length and reasoning effort — **not** whether personalization runs.

There is **no stateless chat path** for entitled users with threads.

---

## 3. L3 policy matrix

Implemented in `memory_policy.py` + `memory_registry.py`.

| Persona             | Retrieve top_k (deep) | Retrieve top_k (quick) | Allowed kinds             | Extract (consent + DEEP path)            |
| ------------------- | --------------------- | ---------------------- | ------------------------- | ---------------------------------------- |
| `employee`          | 5                     | 3                      | All except `org_insight`  | personal kinds                           |
| `coach`             | 8                     | 4                      | All except `org_insight`  | + `observation`, `coaching_history`      |
| `company_admin`     | 5                     | 3                      | personal + `team_insight` | personal + limited `team_insight`        |
| `corporation_admin` | 5                     | 3                      | personal + `team_insight` | personal + `team_insight`                |
| `superadmin`        | 5                     | 3                      | All kinds                 | personal only; **no auto `org_insight`** |

FAST router path: still retrieves up to **2** confirmed memories (never zero for entitled users).

Extraction: both quick and deep_dive when `query_path=DEEP`, consent granted, and turn is substantive.

---

## 4. Scoped memory rules

| `scope_type`   | Owner     | Manager (`company_admin`)         | Coach                                        |
| -------------- | --------- | --------------------------------- | -------------------------------------------- |
| `personal`     | Full CRUD | Own only                          | Own only                                     |
| `coachee`      | —         | —                                 | `scope_ref = client_id`, Nest must authorize |
| `team`         | —         | Nest company access + `scope_ref` | —                                            |
| `organization` | —         | —                                 | Superadmin manual only                       |

Retrieval SQL must filter on `scope_type`, `scope_ref`, and actor role **before** decrypt.

---

## 5. Adding a new role (checklist)

1. Add Cognito group → `persona` mapping in `auth.py` and Nest `session-context` (see [`jwt-role-resolution-spec.md`](./jwt-role-resolution-spec.md)).
2. Add `KINDS_EXTRACTABLE_BY_ROLE` + `_RETRIEVE_BY_ROLE` entries in registry/policy.
3. Define L1 API sources (Nest) in `BspContextInjector` or new injector.
4. Add competency questions to `memory-competency-questions.md`.
5. Add golden tests under `tests/fixtures/memory_golden/`.

No migration required for new roles if kinds/scopes already exist in registry.

---

## 6. Coach coachee snapshot (production)

See [`next-sprint-platform-integration-spec.md`](./next-sprint-platform-integration-spec.md) Part B.
