# Coach Persona Dashboard — Backend Implementation Plan

Backend support for the new **Coach Persona Dashboard** (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node `4:20240`). The frontend currently renders with static placeholder data in `frontend/src/const/dashboard/coach-dashboard.const.ts`. This plan describes the API + data layer needed to make it live, aligned with the existing NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres) stack.

Model the module on the existing `backend/src/super-admin-dashboard` module (controller + service + module + DTOs), and reuse the RBAC / auth primitives in `backend/src/auth`.

---

## 1. Persona / AuthZ

The app dispatches personas by Cognito group (see `frontend/src/hooks/useUserRoles`, `COGNITO_*_GROUP`). A Coach is a new persona.

- Add a Cognito group `pcs-coach` (define in `cloudformation/04-cognito.yaml` / `04-cognito-lambda.yaml`) and a matching constant `COGNITO_COACH_GROUP`.
- Register a submodule key for gating, e.g. `COACH_DASHBOARD_VIEW`, in `src/auth/rbac/submodule.registry.ts` and seed it via `prisma/seed-submodules.ts` + `seed-roles.ts`.
- Guard endpoints with `CognitoAuthGuard` + `AuthorizationGuard` and `@RequireSubmodule(COACH_DASHBOARD_VIEW)` (pattern from existing controllers). Resolve the current coach from `@CurrentUser()`.
- Frontend: extend `DashboardPage.tsx` dispatch (`useUserRoles`) with `isCoach` → render `<CoachDashboard />`, and add the Coach sidebar section (`Dashboard`, `User Directory`, `Calendar`, `Sessions`, `Settings`) in `SIDEBAR_MENU` gated to the coach group. The standalone `/coach-dashboard` route added in this change is a preview entry point until the group is provisioned.

---

## 2. Data Model (Prisma — `prisma/schema.prisma`)

New tables (snake_case mapping consistent with existing schema). All scoped by `coachId` (FK → `AppUser`) and `companyId`/`corporationId` for tenant isolation.

```prisma
model CoachingSession {
  id            String        @id @default(uuid())
  coachId       String
  clientId      String        // FK -> AppUser (or Contact)
  companyId     String?
  type          SessionType   // COMMUNICATION_CONFLICT | GOAL_REVIEW | ONE_ON_ONE_COACHING ...
  status        SessionStatus // SCHEDULED | COMPLETED | CANCELLED | RESCHEDULED
  startsAt      DateTime
  durationMins  Int           @default(60)
  meetingUrl    String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([coachId, startsAt])
}

model CoachClientActivity {
  id         String        @id @default(uuid())
  coachId    String
  clientId   String
  sessionId  String?
  kind       ActivityKind  // SESSION_REQUESTED | SESSION_CANCELLED | NOTES_ADDED ...
  message    String
  createdAt  DateTime      @default(now())

  @@index([coachId, createdAt])
}

model CoachAvailability {
  id                String   @id @default(uuid())
  coachId           String   @unique
  workDays          Int[]    // 1..5 (Mon-Fri)
  workStart         String   // "09:00"
  workEnd           String   // "17:00"
  timezone          String   // "America/New_York"
  sessionLengthMins Int      @default(60)
  bufferMins        Int      @default(15)
  updatedAt         DateTime @updatedAt
}
```

Add enums `SessionType`, `SessionStatus`, `ActivityKind`. Generate a migration (`prisma migrate dev`) and commit under `prisma/migrations/`.

---

## 3. Endpoints (module `src/coach-dashboard`)

Base path `/coach-dashboard`. All authenticated + coach-scoped. Timestamps returned in UTC ISO-8601; the client formats relative time ("In 40min", "1h ago").

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/coach-dashboard/summary` | Aggregated payload for first paint (sessions + activity + insight + availability). Optional convenience endpoint to reduce round-trips. | Whole page |
| `GET` | `/coach-dashboard/sessions?date=YYYY-MM-DD` | Today's sessions for the coach, ordered by `startsAt`. | "Today's Sessions" |
| `POST` | `/coach-dashboard/sessions` | Schedule a new session. Validates availability window + buffer, prevents overlaps. | "Schedule Session" |
| `PATCH` | `/coach-dashboard/sessions/:id/reschedule` | Reschedule (new `startsAt`), writes activity + audit entry. | "Reschedule" |
| `POST` | `/coach-dashboard/sessions/:id/join` | Returns/creates `meetingUrl` (video provider integration). | "Join" |
| `GET` | `/coach-dashboard/sessions/:id/quick-prep` | Returns a coaching prep brief for the session (client summary, last notes, goals, suggested talking points). | more-actions menu → "Quick Prep" |
| `DELETE` | `/coach-dashboard/sessions/:id` | Cancel session (writes `SESSION_CANCELLED` activity + audit). | more-actions menu → "Cancel Session" |
| `GET` | `/coach-dashboard/activity?limit=10` | Recent client activity feed, newest first. | "Client Activity" |
| `GET` | `/coach-dashboard/insight?period=month` | KPIs: `totalSessions`, `activeClients`, `overallCoachingMinutes`. | "This Month Insight" |
| `GET` | `/coach-dashboard/availability` | Current availability settings. | "Your Availability" |
| `PUT` | `/coach-dashboard/availability` | Update availability (days, hours, timezone, session length, buffer). | "Manage Availability" |

### Representative response shapes (match frontend `const` types)

```jsonc
// GET /coach-dashboard/sessions
[{ "id": "…", "client": { "name": "Emma Thompson", "avatarUrl": "…", "initials": "ET" },
  "type": "COMMUNICATION_CONFLICT", "typeLabel": "Communication Conflict",
  "startsAt": "2026-07-03T14:00:00Z", "durationMins": 40, "status": "SCHEDULED" }]

// GET /coach-dashboard/insight?period=month
{ "totalSessions": 24, "activeClients": 5, "overallCoachingMinutes": 720 }

// GET /coach-dashboard/availability
{ "workDays": [1,2,3,4,5], "workStart": "09:00", "workEnd": "17:00",
  "timezone": "America/New_York", "sessionLengthMins": 60, "bufferMins": 15 }
```

DTOs: use `class-validator` (as in existing DTO folders). e.g. `ScheduleSessionDto`, `RescheduleSessionDto`, `UpdateAvailabilityDto`. Wrap responses in the app's standard response envelope/interceptor used by other modules.

---

## 4. Service layer

- `CoachDashboardService` (Prisma queries, all filtered by `coachId`).
- `insight`: aggregate over `CoachingSession` for the current month — count, `distinct clientId` for active clients, `sum(durationMins)` for completed sessions → minutes → the client renders "12 h".
- `sessions`: filter `startsAt` within `[startOfDay, endOfDay]` in the coach's `timezone`.
- Scheduling/reschedule: validate against `CoachAvailability` (work window, `bufferMins`, no overlap); throw `BadRequestException` on conflict.
- Emit `CoachClientActivity` rows and audit events (reuse `AuditModule` interceptors/decorators) on create/reschedule/cancel.
- Avatars: return signed URLs via existing `S3Module` if client photos are stored in S3; otherwise return `initials` for fallback (frontend already supports both).

Register `CoachDashboardModule` in `src/app.module.ts` imports.

---

## 5. Frontend wiring (follow-up)

- Add `src/api/coach-dashboard.api.ts` (Axios, same pattern as other `src/api/*`) with `getCoachSessions`, `getCoachActivity`, `getCoachInsight`, `getCoachAvailability`, `updateCoachAvailability`, `scheduleSession`, `rescheduleSession`, `joinSession`, `cancelSession`.
- Replace the static `COACH_*` constants with fetched data (React Query/Zustand as used elsewhere), keeping the current shapes so `CoachDashboard.tsx` needs minimal change.
- Wire button handlers: `Schedule Session` → open scheduling flow/modal; `Reschedule`/`Join`/more-actions per row; `Manage Availability` → availability editor.

---

## 6. Deployment notes (AWS)

- No new infra tiers required — endpoints run inside the existing NestJS service on **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`); data lives in the existing **RDS Postgres** (`09-single-rds-postgres.yaml`) via the new Prisma migration.
- Cognito changes: add the `pcs-coach` group in `04-cognito*.yaml`; update the post-confirmation / group-assignment Lambda if coaches are auto-provisioned.
- Run the Prisma migration in the deploy pipeline (`bitbucket-pipelines.yml`) prior to the app release, matching the existing migration step.
- Video "Join": integrate the chosen provider (e.g. a `MeetingProvider` service) and store secrets in Secrets Manager (consistent with `08b-db-credentials-secret.yaml`); do not hardcode meeting credentials.
- Throttling/WAF already applied globally (`ThrottlerModule`, `07-waf.yaml`) — no per-endpoint changes needed.
