# Coach — Client Sessions & Notes ("Session Info." tab) — Backend Implementation Plan

Backend support for the **Session Info.** tab of a coach's client-detail view (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, nodes `4:20808` and `4:21189`). The frontend (`frontend/src/components/dashboard/coach-dashboard/SessionsAndNotes.tsx`) renders **Upcoming Sessions** / **Past Sessions** lists plus a **Session Notes** editor, currently backed by static placeholder data in `frontend/src/const/dashboard/coach-dashboard.const.ts` (`COACH_UPCOMING_SESSIONS`, `COACH_PAST_SESSIONS`, `sessionInfo`).

> **The tab has two designed right-panel variants (same left master list):**
> - **`4:20808` — Session Notes** panel (textarea editor) → `SessionsAndNotes.tsx` (notes upsert, below).
> - **`4:21189` — Session Details** panel (read-only Title / Date / Time / Duration / Client / Description + footer actions Reschedule / Quick Prep / Cancel Session / Join). This is already implemented pixel-perfect by `SessionDetailsPanel` in `frontend/src/components/dashboard/coach-dashboard/CoachSessions.tsx` and is backed by `GET /coach/sessions/:id` (full session projection) documented in `coach-sessions-page-api-plan.md` §3. When the coach persona is provisioned, the client-detail **Session Info.** tab reuses the per-client list endpoints below plus that detail endpoint — **no new backend surface** for the details variant.

This view is a per-client slice of the coach's sessions. It **reuses the `CoachingSession` model and endpoints** proposed in `coach-dashboard-api-plan.md`; the only genuinely new persistence is **session notes**. Align with the existing NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres) stack.

---

## 1. Persona / AuthZ

- Same coach persona as `coach-dashboard-api-plan.md`: Cognito group `pcs-coach`, submodule gate (reuse `COACH_DASHBOARD_VIEW` or add `COACH_CLIENT_VIEW`).
- Guard with `CognitoAuthGuard` + `AuthorizationGuard` + `@RequireSubmodule(...)`; resolve the coach via `@CurrentUser()`.
- **Ownership check (critical):** every read/write must assert the session/notes belong to a client assigned to the current coach (`session.coachId === currentUser.id`). Reject cross-coach access with `ForbiddenException`. Notes contain sensitive client information.
- The breadcrumb ("Client Directory › View User Details") implies this tab lives on a client-detail route; reuse the existing user-directory detail routing and add a `Session Info.` tab gated to the coach persona.

---

## 2. Data Model (Prisma — `prisma/schema.prisma`)

Reuse `CoachingSession` (from `coach-dashboard-api-plan.md`). Add one new table for notes (1:1 with a session, kept separate so note edits don't churn the session row and to allow independent audit):

```prisma
model SessionNote {
  id         String   @id @default(uuid())
  sessionId  String   @unique          // FK -> CoachingSession
  coachId    String                    // denormalized for fast ownership filter
  clientId   String
  body       String   @db.Text
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  updatedBy  String?                   // AppUser id (coach) for audit

  @@index([coachId])
  @@index([clientId])
}
```

Generate a migration (`prisma migrate dev`) and commit under `prisma/migrations/`. No new enums required.

---

## 3. Endpoints (extend module `src/coach-dashboard`, or a `src/coach-clients` module)

All authenticated, coach-scoped, ownership-checked. Timestamps in UTC ISO-8601; the client formats the "2 May, 2026 • 9:30 AM - 9:45 AM" string.

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/coach/clients/:clientId/sessions?scope=upcoming` | Upcoming sessions for a client (ordered `startsAt` asc). | "Upcoming Sessions (N)" list |
| `GET` | `/coach/clients/:clientId/sessions?scope=past` | Past sessions (ordered `startsAt` desc). | "Past Sessions (N)" list |
| `GET` | `/coach/sessions/:sessionId/notes` | Fetch the note for a past session. | "View Notes" → Session Notes panel |
| `PUT` | `/coach/sessions/:sessionId/notes` | Upsert the note body for a session. | "Save Notes" |

Session row actions reuse existing endpoints from `coach-dashboard-api-plan.md` (no duplication):

- **Reschedule** → `PATCH /coach-dashboard/sessions/:id/reschedule`
- **Join** → `POST /coach-dashboard/sessions/:id/join`
- **Quick Prep** (more-actions) → `GET /coach-dashboard/sessions/:id/quick-prep`
- **Cancel Session** (more-actions) → `DELETE /coach-dashboard/sessions/:id`
- **Schedule Session** (page header) → `POST /coach-dashboard/sessions`

### Representative response shapes (match frontend `CoachClientSession`)

```jsonc
// GET /coach/clients/USER-005/sessions?scope=upcoming
[{ "id": "…", "title": "Leadership Coaching",
   "startsAt": "2026-05-02T09:30:00Z", "endsAt": "2026-05-02T09:45:00Z",
   "status": "SCHEDULED", "meetingUrl": null }]

// GET /coach/sessions/{id}/notes
{ "sessionId": "…", "body": "Great progress on delegation skills…",
  "updatedAt": "2026-04-18T15:00:00Z", "updatedBy": "coach-…" }
```

DTOs (`class-validator`): `UpsertSessionNoteDto { body: string (@MaxLength(...)) }`. Wrap responses in the app's standard response envelope/interceptor.

---

## 4. Service layer

- `CoachClientSessionsService` (Prisma, all queries filtered by `coachId` + `clientId`).
- `upsertNote`: `prisma.sessionNote.upsert({ where: { sessionId }, ... })`, set `updatedBy = currentUser.id`; emit a `NOTES_ADDED` `CoachClientActivity` row (feeds the dashboard "Client Activity" feed) and an audit event via the existing `AuditModule`.
- Enforce ownership in every method before returning/mutating data.
- Optionally sanitize/trim note `body`; store as plain text (frontend renders in a textarea).
- Register the module in `src/app.module.ts`.

---

## 5. Frontend wiring (follow-up)

- Add `getClientSessions(clientId, scope)`, `getSessionNote(sessionId)`, `saveSessionNote(sessionId, body)` to `src/api/coach-dashboard.api.ts` (Axios, same pattern as other `src/api/*`).
- Replace `COACH_UPCOMING_SESSIONS` / `COACH_PAST_SESSIONS` and the seeded notes with fetched data (React Query as used elsewhere), keeping the current `CoachClientSession` shape so `SessionsAndNotes.tsx` needs minimal change.
- Wire handlers: `handleSave` → `PUT` notes (already has loading state), `handleViewNotes` → fetch note for selected past session; row Reschedule/Join/Quick Prep/Cancel → the existing dashboard endpoints.

---

## 6. Deployment notes (AWS)

- No new infra tiers — endpoints run inside the existing NestJS service on **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`); the `SessionNote` table lives in the existing **RDS Postgres** (`09-single-rds-postgres.yaml`) via the new Prisma migration.
- Run the Prisma migration in the deploy pipeline (`bitbucket-pipelines.yml`) before the app release, matching the existing migration step.
- Session notes are sensitive PII — rely on existing RDS encryption-at-rest and TLS in transit; ensure the ownership guard is covered by tests. No secrets or new external integrations are introduced by the notes feature (video "Join" secrets handled by the dashboard plan).
- Throttling/WAF already applied globally (`ThrottlerModule`, `07-waf.yaml`).
