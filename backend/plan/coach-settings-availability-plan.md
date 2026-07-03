# Coach — Settings / Availability — Backend Implementation Plan

Backend support for the coach **Settings → Availability** tab (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node `4:21894`). Frontend: `frontend/src/components/dashboard/coach-dashboard/CoachAvailabilityTab.tsx`, rendered inside `CoachSettings` (route `/coach-settings` → `CoachSettingsPage`) when the **Availability** tab is active.

The tab lets a coach define their **weekly working hours** — a per-weekday on/off toggle plus one or more start/end time ranges — and surfaces two read-only summary cards (time-zone preference, default session length). It is currently backed by static placeholder data in `coach-dashboard.const.ts` (`COACH_AVAILABILITY_SETTINGS`). Align with the existing NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres) stack.

This is the **same `CoachAvailability` data** referenced by the coach dashboard and calendar plans (`coach-dashboard-api-plan.md`, `coach-calendar-api-plan.md`) — this screen is its **editor**.

---

## 1. Persona / AuthZ

- Coach persona: Cognito group `pcs-coach`, gated with `CognitoAuthGuard` + `AuthorizationGuard` + `@RequireSubmodule(SETTINGS_PROFILE)` (or a dedicated `SETTINGS_AVAILABILITY`).
- Resolve the coach via `@CurrentUser()`; availability is always the caller's own (`coachId = currentUser.id`).
- The two summary cards are read-only projections: **time zone** comes from the profile (`GET /users/me/profile` → `timezone`) and **default session length** from coach settings (fixed 15 min for now; see §2).

---

## 2. Data Model (Prisma — `prisma/schema.prisma`)

Reuse / formalize the `CoachAvailability` model implied by the dashboard plan. Model each editable range as a row so multiple ranges per day are supported (Tuesday has two in the design):

```prisma
model CoachAvailabilityWindow {
  id         String   @id @default(cuid())
  coachId    String
  weekday    Int      // 0=Mon … 6=Sun (or an enum Weekday)
  startTime  String   // "09:00" 24h, stored tz-agnostic; rendered as "9:00 AM"
  endTime    String   // "17:00"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  coach      User     @relation(fields: [coachId], references: [id])

  @@index([coachId, weekday])
}
```

- A weekday with **no** rows = **Unavailable** (Sat/Sun in the design).
- `defaultSessionLengthMins` (15) + `timezone` live on the coach profile / a `CoachSettings` 1:1 row; no per-window storage needed.
- One migration; no backfill.

---

## 3. Endpoints (extend module `src/coach-dashboard` / `src/coach-availability`)

All authenticated, coach-scoped.

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/coach-dashboard/availability` | Current weekly windows + summary (timezone, default length). | Prefills the whole tab |
| `PUT` | `/coach-dashboard/availability` | Replace the full weekly schedule (idempotent bulk upsert). | Save & Update |

A single `PUT` that replaces the week is simpler and race-free for this editor than per-range CRUD (the client always holds the whole schedule).

### GET response (matches frontend `COACH_AVAILABILITY_SETTINGS` shape)

```jsonc
// GET /coach-dashboard/availability
{
  "timezone": "EST (Eastern Time)",       // summary card 1 (from profile)
  "defaultSessionLengthMins": 15,          // summary card 2 → "15 min"
  "days": [
    { "weekday": "mon", "enabled": true,  "ranges": [{ "start": "9:00 AM", "end": "5:00 PM" }] },
    { "weekday": "tue", "enabled": true,  "ranges": [
        { "start": "9:00 AM", "end": "5:00 PM" },
        { "start": "1:00 PM", "end": "4:00 AM" }
      ] },
    { "weekday": "wed", "enabled": true,  "ranges": [{ "start": "9:00 AM", "end": "5:00 PM" }] },
    { "weekday": "thu", "enabled": true,  "ranges": [{ "start": "9:00 AM", "end": "5:00 PM" }] },
    { "weekday": "fri", "enabled": true,  "ranges": [{ "start": "9:00 AM", "end": "5:00 PM" }] },
    { "weekday": "sat", "enabled": false, "ranges": [] },
    { "weekday": "sun", "enabled": false, "ranges": [] }
  ]
}
```

### PUT payload

```jsonc
// PUT /coach-dashboard/availability  (UpdateCoachAvailabilityDto)
{
  "days": [
    { "weekday": "mon", "ranges": [{ "start": "09:00", "end": "17:00" }] },
    { "weekday": "tue", "ranges": [{ "start": "09:00", "end": "17:00" }, { "start": "13:00", "end": "16:00" }] },
    { "weekday": "sat", "ranges": [] }
    // …omitted/empty ranges ⇒ Unavailable
  ]
}
```

Validation via `class-validator` (`@ValidateNested()` array): each `start`/`end` matches `HH:mm` (server converts to/from the UI's 12-h display), `end` must be after `start` (flag/normalize cross-midnight cases such as Tuesday's `1:00 PM → 4:00 AM`), reject overlapping ranges within a weekday. Times are stored tz-agnostic and interpreted in the coach's `timezone`. Wrap responses in the app's standard response envelope.

---

## 4. Service layer

- `CoachAvailabilityService` (Prisma, filtered by `coachId`).
- `GET`: load windows grouped by weekday → project to the `days[]` shape (empty ⇒ `enabled:false`); attach `timezone` + `defaultSessionLengthMins` from the profile/settings row.
- `PUT`: transaction — delete existing windows for the coach and insert the new set (or diff-upsert); return the refreshed projection.
- Availability edits should invalidate/agree with the **calendar** conflict checks (reschedule/schedule validate against these windows — see `coach-calendar-api-plan.md`).
- Register the module in `src/app.module.ts`.

---

## 5. Frontend wiring (follow-up)

- The tab currently uses static `COACH_AVAILABILITY_SETTINGS` + local `useState`; Save runs a placeholder timeout.
- To productionize: add `getCoachAvailability()` / `updateCoachAvailability(payload)` to `src/api/coach-dashboard.api.ts` (Axios, same pattern as other `src/api/*`), load with React Query into the same `days` shape, and map the 12-h display strings ↔ `HH:mm` on read/write. Invalidate the availability (and calendar) queries on save.
- Time cells are plain text inputs today; a follow-up can swap them for the shared time-picker used by the calendar `TimeRangeField` while keeping the "9:00 AM" display.

---

## 6. Deployment notes (AWS)

- One **Prisma migration** for `CoachAvailabilityWindow` (+ `defaultSessionLengthMins`/`timezone` on the coach settings row) on **RDS Postgres** (`09-single-rds-postgres.yaml`); served by NestJS on **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`).
- Cognito `pcs-coach` group (`04-cognito*.yaml`) provisioned by the coach dashboard work.
- Index `CoachAvailabilityWindow(coachId, weekday)` keeps reads and the calendar's conflict checks cheap. Throttling/WAF already global (`ThrottlerModule`, `07-waf.yaml`).
