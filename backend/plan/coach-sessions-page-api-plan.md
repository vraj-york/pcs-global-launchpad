# Coach — Sessions Page — Backend Implementation Plan

Backend support for the coach's standalone **Sessions** page (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, nodes `4:21082` "Sessions - Upcoming" and `4:20999` "Sessions - Past"). The frontend (`frontend/src/components/dashboard/coach-dashboard/CoachSessions.tsx`, route `/coach-sessions` → `CoachSessionsPage`) renders **All Requests / All Sessions** tabs, a master list of **Upcoming / Past** sessions (client avatar + name), and a right-hand master-detail panel whose variant depends on the selected session's scope. It is currently backed by static placeholder data in `frontend/src/const/dashboard/coach-dashboard.const.ts` (`COACH_SCHEDULED_SESSIONS`, `sessionsPage`).

- **Upcoming** session selected (node `4:21082`) → **Session Details** panel (Title / Date / Time / Duration / Client / Description + footer Reschedule / Quick Prep / Cancel Session / Join).
- **Past** session selected via **View Notes** (node `4:20999`) → **Session Notes** editor (textarea seeded with the session's saved notes + footer **Close** / **Save Notes**). The past card's icon is `notepad-text` and the save button uses the `save` icon, matching the Figma component set.

This page is the coach-wide (all-clients) counterpart of the per-client **Session Info.** tab (`coach-client-sessions-notes-api-plan.md`). It **reuses** the `CoachingSession` / `SessionNote` models and most endpoints from `coach-dashboard-api-plan.md` and `coach-client-sessions-notes-api-plan.md`; the only new surface is **session requests** (the "All Requests" tab) and a full **session detail** projection. Align with the existing NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres) stack.

---

## 1. Persona / AuthZ

- Same coach persona as the other coach plans: Cognito group `pcs-coach`, gated with `CognitoAuthGuard` + `AuthorizationGuard` + `@RequireSubmodule(COACH_DASHBOARD_VIEW)` (or a dedicated `COACH_SESSIONS_VIEW`).
- Resolve the coach via `@CurrentUser()`; every query is filtered by `coachId = currentUser.id`.
- Sidebar: add a `Sessions` item (route `/coach-sessions`) to the coach sidebar group once the persona is provisioned. The route added in this change is reachable directly (preview) like the existing `/coach-dashboard` entry, until the coach `SIDEBAR_MENU` group is wired.

---

## 2. Data Model (Prisma — `prisma/schema.prisma`)

Reuse `CoachingSession` (see `coach-dashboard-api-plan.md`) and `SessionNote` (see `coach-client-sessions-notes-api-plan.md`). Add one new table for the **All Requests** tab:

```prisma
model SessionRequest {
  id            String        @id @default(uuid())
  coachId       String
  clientId      String
  topic         String
  message       String?       @db.Text
  preferredAt   DateTime?
  status        RequestStatus @default(PENDING) // PENDING | ACCEPTED | DECLINED
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([coachId, status, createdAt])
}
```

Add enum `RequestStatus`. Accepting a request creates a `CoachingSession`. Generate a migration (`prisma migrate dev`) and commit under `prisma/migrations/`.

### 2a. "All Requests" tab (Figma node `4:20887`) — extended model

The fully-designed **All Requests** tab (`frontend/src/components/dashboard/coach-dashboard/CoachSessions.tsx` → `SessionRequests`, data `COACH_SESSION_REQUESTS`) needs a richer status set + proposed slots + cancellation reason. Extend `SessionRequest`:

```prisma
model SessionRequest {
  id            String        @id @default(uuid())
  coachId       String
  clientId      String
  topic         String        // e.g. "Strategic Thinking"
  message       String?       @db.Text
  preferredAt   DateTime?
  proposedSlots Json?         // [{ startsAt, endsAt }] — coach/client proposed times (tooltip)
  status        RequestStatus @default(PENDING) // PENDING | PROPOSED | ACCEPTED | DECLINED | CANCELLED
  cancelReason  String?       @db.Text          // shown by "View Reason"
  cancelledBy   String?       // AppUser id (coach or client)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([coachId, status, createdAt])
}
```

Status → UI badge: `PENDING` → "New Request" (blue), `PROPOSED` → "Proposed" (yellow), `CANCELLED` → "Cancelled" (destructive).

### 2b. "All Requests" endpoints & filters

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/coach/session-requests?status=&employeeId=` | List requests; `status` + `employeeId` map to the **All Status** / **All Employees** filters (omit or `all` = no filter). | Requests list + filters |
| `POST` | `/coach/session-requests/:id/propose-slots` | Coach proposes alternative slots (`proposedSlots`), sets `PROPOSED`. | "Propose Slots" |
| `PATCH` | `/coach/session-requests/:id/slots` | Edit already-proposed slots. | "Edit Slots" |
| `POST` | `/coach/session-requests/:id/remind` | Send a reminder (SES email) to the client about pending proposed slots. | "Remind" |
| `POST` | `/coach/session-requests/:id/cancel` | Cancel the request with a reason. | "Cancel Request" |
| `GET` | `/coach/session-requests/:id/reason` | Return `cancelReason` for a cancelled request. | "View Reason" |
| `POST` | `/coach/session-requests/:id/accept` | Accept → creates a `CoachingSession` (existing). | "Accept" |

- `GET` returns the projected shape the frontend `CoachSessionRequest` expects: `title`, `status`, `statusLabel`, `client {name, avatarUrl, initials}`, `metaText` pieces (or raw fields for the client to compose), `proposedSlots` (→ tooltip lines), and the allowed `actions[]` for the current status.
- The **employee filter** options come from the distinct clients that have requests for this coach (`GET /coach/session-requests/employees` or derived client-side, as the frontend currently does).
- "Remind" uses the existing **SES** integration (see `coach-early-access-waitlist-api-plan.md` for the SES pattern).

---

## 3. Endpoints (extend module `src/coach-dashboard` / `src/coach-sessions`)

All authenticated, coach-scoped. Timestamps UTC ISO-8601; the client formats "May 2, 2026" / "9:30 AM - 9:45 AM" / "15 min".

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/coach/sessions?scope=upcoming` | Coach's upcoming sessions across all clients (asc). | "Upcoming Sessions (N)" |
| `GET` | `/coach/sessions?scope=past` | Coach's past sessions (desc). | "Past Sessions (N)" |
| `GET` | `/coach/sessions/:id` | Full session detail (title, date, time, duration, client {name,email,avatarUrl}, description). | "Session Details" panel |
| `GET` | `/coach/session-requests?status=PENDING` | Pending session requests. | "All Requests" tab |
| `POST` | `/coach/session-requests/:id/accept` | Accept a request → creates a `CoachingSession`. | request row action |
| `POST` | `/coach/session-requests/:id/decline` | Decline a request. | request row action |

Session row / detail actions reuse existing endpoints (no duplication):

- **Reschedule** → `PATCH /coach-dashboard/sessions/:id/reschedule`
- **Join** → `POST /coach-dashboard/sessions/:id/join`
- **Quick Prep** → `GET /coach-dashboard/sessions/:id/quick-prep`
- **Cancel Session** → `DELETE /coach-dashboard/sessions/:id`
- **View Notes** (open past-session notes editor, node `4:20999`) → `GET /coach/sessions/:id/notes` (see client-sessions-notes plan)
- **Save Notes** (past-session editor footer) → `PUT /coach/sessions/:id/notes` (upsert `SessionNote`, see `coach-client-sessions-notes-api-plan.md`) — no new endpoint; the Sessions page reuses the same notes upsert as the per-client Session Info. tab.
- **Schedule Session** (page header) → `POST /coach-dashboard/sessions`

### Representative response shapes (match frontend `CoachScheduledSession`)

```jsonc
// GET /coach/sessions?scope=upcoming
[{ "id": "…", "title": "Leadership Coaching",
   "client": { "name": "Alex Rivera", "email": "matt_henry@email.com", "avatarUrl": "…", "initials": "AR" },
   "startsAt": "2026-05-02T09:30:00Z", "endsAt": "2026-05-02T09:45:00Z",
   "durationMins": 15, "status": "SCHEDULED",
   "description": "Weekly one-on-one coaching session for leadership skill enhancement." }]
```

DTOs via `class-validator`; wrap responses in the app's standard response envelope/interceptor.

---

## 4. Service layer

- `CoachSessionsService` (Prisma, filtered by `coachId`). Join `CoachingSession → AppUser` (client) for name/email/avatar.
- `scope`: `upcoming` = `startsAt >= now` ordered asc; `past` = `startsAt < now` ordered desc.
- `durationMins` derived from `startsAt`/`endsAt` (or stored on the session).
- Request accept/decline: transactional — flip `SessionRequest.status`, and on accept insert a `CoachingSession` + emit a `CoachClientActivity` row and audit event (reuse `AuditModule`).
- Client avatars: signed S3 URLs via `S3Module`, else return `initials` (frontend supports both).
- Register the module in `src/app.module.ts`.

---

## 5. Frontend wiring (follow-up)

- Add `getCoachSessions(scope)`, `getCoachSession(id)`, `getSessionRequests()`, `acceptSessionRequest(id)`, `declineSessionRequest(id)` to `src/api/coach-dashboard.api.ts` (Axios, same pattern as other `src/api/*`).
- Replace the static `COACH_SCHEDULED_SESSIONS` with fetched data (React Query), keeping the `CoachScheduledSession` shape so `CoachSessions.tsx` needs minimal change; select the first upcoming session by default (as now).
- Wire the "All Requests" tab to `getSessionRequests()` and accept/decline handlers; wire detail-panel + card actions to the endpoints above.

---

## 6. Deployment notes (AWS)

- No new infra tiers — endpoints run inside the existing NestJS service on **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`); the `SessionRequest` table lives in the existing **RDS Postgres** (`09-single-rds-postgres.yaml`) via the new Prisma migration.
- Run the Prisma migration in the deploy pipeline (`bitbucket-pipelines.yml`) before the app release, matching the existing migration step.
- Cognito: add the `pcs-coach` group (`04-cognito*.yaml`) if not already provisioned by the dashboard work.
- Video "Join" secrets handled by the dashboard plan (Secrets Manager); throttling/WAF already global (`ThrottlerModule`, `07-waf.yaml`).
